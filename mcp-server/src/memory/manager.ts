/**
 * Memory Manager
 * 
 * Coordinates memory extraction, processing, and syncing to CLAUDE.md files.
 * Main entry point for all memory-related operations.
 */

import { logger } from '../utils/logger.js';
import { GitClient } from '../git/client.js';
import { MemoryExtractor, type ExtractedMemory } from './extractor.js';
import { MemorySync, type SyncResult, type SyncOptions } from './sync.js';
import type { SvcmsConfig } from '../types.js';

export interface MemorySyncOperation {
  config: SvcmsConfig;
  options: {
    depth?: number;
    since?: string;
    dry_run?: boolean;
    backup?: boolean;
    max_memories_per_file?: number;
  };
}

export interface MemorySyncReport extends SyncResult {
  commits_processed: number;
  memories_extracted: number;
  memory_stats: {
    total_memories: number;
    by_location: Record<string, number>;
    by_category: Record<string, number>;
    by_type: Record<string, number>;
    date_range: {
      earliest: string;
      latest: string;
    };
    authors: string[];
  };
  preview?: {
    files_to_create: string[];
    files_to_update: string[];
    sample_memories: Array<{
      file: string;
      content: string;
      commit: string;
    }>;
  };
}

export class MemoryManager {
  private gitClient: GitClient;
  private extractor: MemoryExtractor;
  private sync: MemorySync;
  private config: SvcmsConfig;

  constructor(config: SvcmsConfig, repoRoot: string = process.cwd()) {
    this.config = config;
    this.gitClient = new GitClient(repoRoot);
    this.extractor = new MemoryExtractor();
    this.sync = new MemorySync(repoRoot);

    logger.debug('Memory manager initialized', { repoRoot });
  }

  /**
   * Perform complete memory sync operation
   */
  async syncMemories(operation: MemorySyncOperation): Promise<MemorySyncReport> {
    logger.info('Starting complete memory sync operation...');
    
    const startTime = Date.now();
    
    try {
      // 1. Get commits with context
      const commits = await this.gitClient.getCommitsWithContext({
        limit: operation.options.depth || 100,
        since: operation.options.since
      });

      logger.info(`Retrieved ${commits.length} commits for processing`);

      // 2. Extract memories
      const memories = await this.extractor.extractMemories(commits);
      
      if (memories.length === 0) {
        logger.info('No memories found to sync');
        return this.createEmptyReport(commits.length);
      }

      // 3. Group memories by location
      const memoriesByLocation = this.extractor.groupMemoriesByLocation(memories);
      
      // 4. Create memory statistics
      const memoryStats = this.extractor.createMemoryStats(memories);

      // 5. Generate preview if dry run
      let preview;
      if (operation.options.dry_run) {
        const previewData = await this.sync.previewSync(memoriesByLocation);
        preview = {
          files_to_create: previewData.files_to_create,
          files_to_update: previewData.files_to_update,
          sample_memories: this.createSampleMemories(memories, 5)
        };
      }

      // 6. Sync memories to files
      const syncOptions: SyncOptions = {
        dry_run: operation.options.dry_run || false,
        backup: operation.options.backup || false,
        force_overwrite: false,
        max_memories_per_file: operation.options.max_memories_per_file
      };

      const syncResult = await this.sync.syncMemories(memoriesByLocation, syncOptions);

      // 7. Create comprehensive report
      const report: MemorySyncReport = {
        ...syncResult,
        commits_processed: commits.length,
        memories_extracted: memories.length,
        memory_stats: memoryStats,
        preview
      };

      const duration = Date.now() - startTime;
      logger.info(`Memory sync completed in ${duration}ms`, {
        commits_processed: report.commits_processed,
        memories_extracted: report.memories_extracted,
        memories_synced: report.memories_synced,
        files_updated: report.files_updated + report.files_created
      });

      return report;

    } catch (error) {
      logger.error('Memory sync operation failed:', error);
      throw new Error(`Memory sync failed: ${error}`);
    }
  }

  /**
   * Quick sync of recent commits only
   */
  async quickSync(options: { 
    limit?: number; 
    dry_run?: boolean 
  } = {}): Promise<MemorySyncReport> {
    return this.syncMemories({
      config: this.config,
      options: {
        depth: options.limit || 20,
        dry_run: options.dry_run || false,
        backup: false
      }
    });
  }

  /**
   * Get memory statistics without syncing
   */
  async getMemoryStats(options: {
    depth?: number;
    since?: string;
  } = {}): Promise<{
    commits_analyzed: number;
    memories_found: number;
    stats: ReturnType<typeof MemoryExtractor.prototype.createMemoryStats>;
    validation_issues: Array<{
      commit: string;
      memory: string;
      warnings: string[];
    }>;
  }> {
    logger.info('Analyzing memory statistics...');

    const commits = await this.gitClient.getCommitsWithContext({
      limit: options.depth || 200,
      since: options.since
    });

    const memories = await this.extractor.extractMemories(commits);
    const stats = this.extractor.createMemoryStats(memories);

    // Validate memories and collect issues
    const validationIssues = memories
      .map(memory => {
        const validation = this.extractor.validateMemory(memory);
        return validation.warnings.length > 0 ? {
          commit: memory.commit_sha.substring(0, 8),
          memory: memory.content.substring(0, 50) + '...',
          warnings: validation.warnings
        } : null;
      })
      .filter(issue => issue !== null) as Array<{
        commit: string;
        memory: string;
        warnings: string[];
      }>;

    return {
      commits_analyzed: commits.length,
      memories_found: memories.length,
      stats,
      validation_issues: validationIssues
    };
  }

  /**
   * Find memories matching a pattern
   */
  async searchMemories(pattern: string, options: {
    scope?: string;
    category?: string;
    since?: string;
    limit?: number;
  } = {}): Promise<ExtractedMemory[]> {
    logger.info(`Searching memories for pattern: ${pattern}`);

    const commits = await this.gitClient.getCommitsWithContext({
      limit: options.limit || 100,
      since: options.since
    });

    const memories = await this.extractor.extractMemories(commits);

    // Filter memories based on pattern and options
    const filtered = memories.filter(memory => {
      // Text pattern matching
      const contentMatch = memory.content.toLowerCase().includes(pattern.toLowerCase());
      const summaryMatch = memory.summary.toLowerCase().includes(pattern.toLowerCase());
      
      if (!contentMatch && !summaryMatch) {
        return false;
      }

      // Scope filter
      if (options.scope && memory.scope !== options.scope) {
        return false;
      }

      // Category filter
      if (options.category && memory.category !== options.category) {
        return false;
      }

      return true;
    });

    logger.info(`Found ${filtered.length} memories matching pattern`);
    return filtered;
  }

  /**
   * Validate memory quality across commits
   */
  async validateMemoryQuality(options: {
    depth?: number;
    fix_suggestions?: boolean;
  } = {}): Promise<{
    total_memories: number;
    quality_score: number;
    issues: Array<{
      severity: 'warning' | 'error';
      message: string;
      commit: string;
      suggestions?: string[];
    }>;
    recommendations: string[];
  }> {
    const commits = await this.gitClient.getCommitsWithContext({
      limit: options.depth || 100
    });

    const memories = await this.extractor.extractMemories(commits);
    const issues: Array<{
      severity: 'warning' | 'error';
      message: string;
      commit: string;
      suggestions?: string[];
    }> = [];

    let qualityPoints = 0;
    const maxPoints = memories.length * 10; // 10 points per memory

    for (const memory of memories) {
      const validation = this.extractor.validateMemory(memory);
      
      // Calculate quality points
      if (validation.valid) {
        qualityPoints += 10;
      } else {
        qualityPoints += Math.max(2, 10 - validation.warnings.length * 2);
      }

      // Add issues
      validation.warnings.forEach(warning => {
        issues.push({
          severity: 'warning',
          message: warning,
          commit: memory.commit_sha.substring(0, 8),
          suggestions: options.fix_suggestions ? this.generateFixSuggestions(warning) : undefined
        });
      });
    }

    const qualityScore = maxPoints > 0 ? (qualityPoints / maxPoints) * 100 : 0;

    // Generate recommendations
    const recommendations = this.generateQualityRecommendations(memories, issues);

    return {
      total_memories: memories.length,
      quality_score: Math.round(qualityScore),
      issues,
      recommendations
    };
  }

  /**
   * Create empty report for cases with no memories
   */
  private createEmptyReport(commitsProcessed: number): MemorySyncReport {
    return {
      commits_processed: commitsProcessed,
      memories_extracted: 0,
      files_processed: 0,
      memories_synced: 0,
      memories_skipped: 0,
      files_created: 0,
      files_updated: 0,
      errors: [],
      warnings: [],
      memory_stats: {
        total_memories: 0,
        by_location: {},
        by_category: {},
        by_type: {},
        date_range: { earliest: '', latest: '' },
        authors: []
      }
    };
  }

  /**
   * Create sample memories for preview
   */
  private createSampleMemories(memories: ExtractedMemory[], count: number): Array<{
    file: string;
    content: string;
    commit: string;
  }> {
    return memories
      .slice(0, count)
      .map(memory => ({
        file: memory.location,
        content: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
        commit: memory.commit_sha.substring(0, 8)
      }));
  }

  /**
   * Generate fix suggestions for memory quality issues
   */
  private generateFixSuggestions(warning: string): string[] {
    if (warning.includes('very short')) {
      return [
        'Add more specific details about what was learned',
        'Include the technical context or constraints discovered',
        'Explain why this insight is important for future development'
      ];
    }

    if (warning.includes('very long')) {
      return [
        'Break the insight into multiple, focused memories',
        'Create separate memories for different aspects',
        'Use bullet points for complex insights'
      ];
    }

    if (warning.includes('too vague')) {
      return [
        'Be more specific about the technical implementation',
        'Include concrete examples or code patterns',
        'Explain the impact or consequences of the change'
      ];
    }

    return ['Consider adding more specific technical details'];
  }

  /**
   * Generate quality improvement recommendations
   */
  private generateQualityRecommendations(memories: ExtractedMemory[], issues: any[]): string[] {
    const recommendations: string[] = [];

    // Analyze patterns in issues
    const vaguenessIssues = issues.filter(i => i.message.includes('vague')).length;
    const lengthIssues = issues.filter(i => i.message.includes('short') || i.message.includes('long')).length;

    if (vaguenessIssues > memories.length * 0.3) {
      recommendations.push('Focus on more specific, technical insights in memory fields');
      recommendations.push('Include concrete examples and implementation details');
    }

    if (lengthIssues > memories.length * 0.2) {
      recommendations.push('Aim for memory entries of moderate length (50-200 characters)');
      recommendations.push('Break complex insights into multiple focused memories');
    }

    // Check memory distribution
    const memoryStats = this.extractor.createMemoryStats(memories);
    if (Object.keys(memoryStats.by_category).length === 1) {
      recommendations.push('Consider using different SVCMS categories (knowledge, collaboration, meta)');
    }

    if (Object.keys(memoryStats.by_location).length === 1) {
      recommendations.push('Use specific scopes to organize memories by module/component');
    }

    return recommendations;
  }
}