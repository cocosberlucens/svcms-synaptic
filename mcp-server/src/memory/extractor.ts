/**
 * Memory Extraction Engine
 * 
 * Extracts memories from SVCMS commits and prepares them for sync to CLAUDE.md files.
 * Handles parsing, filtering, and metadata extraction with full commit context.
 */

import { logger } from '../utils/logger.js';
import type { SvcmsCommit, Memory } from '../types.js';

export interface ExtractedMemory extends Memory {
  commit_sha: string;
  commit_date: Date;
  author: string;
  scope?: string;
  category?: string;
  type: string;
  summary: string;
  refs?: string[];
}

export class MemoryExtractor {
  
  /**
   * Extract memories from a list of SVCMS commits
   */
  async extractMemories(commits: SvcmsCommit[]): Promise<ExtractedMemory[]> {
    logger.info(`Extracting memories from ${commits.length} commits...`);
    
    const memories: ExtractedMemory[] = [];
    let processedCount = 0;
    let memoryCount = 0;

    for (const commit of commits) {
      processedCount++;
      
      try {
        const memory = this.extractMemoryFromCommit(commit);
        if (memory) {
          memories.push(memory);
          memoryCount++;
          
          logger.debug(`Extracted memory from commit ${commit.sha.substring(0, 8)}`, {
            memory: memory.content.substring(0, 50) + '...',
            location: memory.location
          });
        }
      } catch (error) {
        logger.warn(`Failed to extract memory from commit ${commit.sha.substring(0, 8)}:`, error);
      }
    }

    logger.info(`Memory extraction completed: ${memoryCount} memories from ${processedCount} commits`);
    
    // Sort by commit date (chronological order)
    memories.sort((a, b) => a.commit_date.getTime() - b.commit_date.getTime());
    
    return memories;
  }

  /**
   * Extract memory from a single SVCMS commit
   */
  private extractMemoryFromCommit(commit: SvcmsCommit): ExtractedMemory | null {
    // Only process commits with parsed SVCMS data
    if (!commit.parsed) {
      logger.debug(`Skipping commit ${commit.sha.substring(0, 8)}: not SVCMS format`);
      return null;
    }

    // Only extract if memory field exists
    if (!commit.parsed.memory || commit.parsed.memory.trim() === '') {
      logger.debug(`Skipping commit ${commit.sha.substring(0, 8)}: no memory field`);
      return null;
    }

    // Determine location for memory placement
    const location = this.determineMemoryLocation(commit);
    
    // Extract tags (from commit parsed tags + inferred tags)
    const tags = this.extractTags(commit);

    const memory: ExtractedMemory = {
      content: commit.parsed.memory.trim(),
      source_commit: commit.sha,
      commit_sha: commit.sha,
      commit_date: commit.author.date,
      author: commit.author.name,
      scope: commit.parsed.scope,
      category: commit.parsed.category,
      type: commit.parsed.type,
      summary: commit.parsed.summary,
      refs: commit.parsed.refs,
      tags,
      location,
      created_at: new Date() // When this memory was extracted
    };

    return memory;
  }

  /**
   * Determine where this memory should be placed
   */
  private determineMemoryLocation(commit: SvcmsCommit): string {
    const parsed = commit.parsed!;
    
    // 1. Explicit location field takes precedence
    if (parsed.location && parsed.location.trim() !== '') {
      let location = parsed.location.trim();
      
      // Expand relative paths
      if (location.startsWith('./')) {
        location = location.substring(2);
      } else if (location.startsWith('~/')) {
        // Keep as-is for global paths
      }
      
      // Ensure it ends with CLAUDE.md
      if (!location.endsWith('CLAUDE.md')) {
        if (location.endsWith('/')) {
          location += 'CLAUDE.md';
        } else {
          location += '/CLAUDE.md';
        }
      }
      
      return location;
    }

    // 2. Scope-based inference
    if (parsed.scope && parsed.scope.trim() !== '') {
      const scope = parsed.scope.trim();
      
      // Special handling for common scopes
      switch (scope) {
        case 'project':
        case 'global':
        case 'architecture':
        case 'config':
          return 'CLAUDE.md';
        
        default:
          return `src/${scope}/CLAUDE.md`;
      }
    }

    // 3. Category-based inference
    if (parsed.category) {
      switch (parsed.category) {
        case 'knowledge':
        case 'collaboration':
          // These often contain cross-cutting insights
          return 'CLAUDE.md';
        
        case 'standard':
        case 'meta':
        default:
          // Try to infer from summary or default to project-wide
          return this.inferLocationFromSummary(parsed.summary);
      }
    }

    // 4. Default to project-wide
    return 'CLAUDE.md';
  }

  /**
   * Infer location from commit summary content
   */
  private inferLocationFromSummary(summary: string): string {
    const summaryLower = summary.toLowerCase();
    
    // Common module patterns
    const modulePatterns = {
      'api': /\b(api|endpoint|route|server|http)\b/,
      'auth': /\b(auth|login|token|jwt|passport|oauth)\b/,
      'ui': /\b(ui|component|react|vue|angular|frontend)\b/,
      'database': /\b(db|database|sql|mongo|postgres|mysql)\b/,
      'test': /\b(test|spec|testing|jest|mocha|cypress)\b/,
      'config': /\b(config|env|setting|environment)\b/,
      'utils': /\b(util|helper|tool|function)\b/
    };

    for (const [module, pattern] of Object.entries(modulePatterns)) {
      if (pattern.test(summaryLower)) {
        return `src/${module}/CLAUDE.md`;
      }
    }

    // Default to project-wide
    return 'CLAUDE.md';
  }

  /**
   * Extract and enhance tags from commit
   */
  private extractTags(commit: SvcmsCommit): string[] {
    const tags = new Set<string>();
    const parsed = commit.parsed!;

    // Add explicit tags from commit
    if (parsed.tags) {
      parsed.tags.forEach(tag => tags.add(tag.trim()));
    }

    // Add inferred tags based on commit metadata
    if (parsed.scope) {
      tags.add(parsed.scope);
    }

    if (parsed.category) {
      tags.add(parsed.category);
    }

    if (parsed.type) {
      tags.add(parsed.type);
    }

    // Add content-based tags
    const contentLower = parsed.memory?.toLowerCase() || '';
    const summaryLower = parsed.summary.toLowerCase();
    const combined = `${contentLower} ${summaryLower}`;

    // Technical tags
    if (/\b(error|exception|bug|fix)\b/.test(combined)) {
      tags.add('error-handling');
    }
    
    if (/\b(performance|speed|optimization|slow)\b/.test(combined)) {
      tags.add('performance');
    }
    
    if (/\b(security|auth|token|permission)\b/.test(combined)) {
      tags.add('security');
    }
    
    if (/\b(pattern|architecture|design)\b/.test(combined)) {
      tags.add('architecture');
    }

    if (/\b(workflow|process|methodology)\b/.test(combined)) {
      tags.add('workflow');
    }

    return Array.from(tags).sort();
  }

  /**
   * Validate extracted memory for completeness
   */
  validateMemory(memory: ExtractedMemory): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check memory content quality
    if (memory.content.length < 10) {
      warnings.push('Memory content is very short - may not be useful');
    }

    if (memory.content.length > 500) {
      warnings.push('Memory content is very long - consider breaking into smaller insights');
    }

    // Check for vague content
    const vague_patterns = [
      /^(update|fix|change|improve)/i,
      /^(add|remove|delete)/i,
      /^(refactor|cleanup)/i
    ];

    if (vague_patterns.some(pattern => pattern.test(memory.content))) {
      warnings.push('Memory content may be too vague - consider more specific insights');
    }

    // Check location validity
    if (!memory.location.includes('CLAUDE.md')) {
      warnings.push('Memory location should target a CLAUDE.md file');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Group memories by target location for efficient file operations
   */
  groupMemoriesByLocation(memories: ExtractedMemory[]): Map<string, ExtractedMemory[]> {
    const grouped = new Map<string, ExtractedMemory[]>();

    for (const memory of memories) {
      const location = memory.location;
      
      if (!grouped.has(location)) {
        grouped.set(location, []);
      }
      
      grouped.get(location)!.push(memory);
    }

    // Sort memories within each group by commit date
    for (const [location, locationMemories] of grouped) {
      locationMemories.sort((a, b) => a.commit_date.getTime() - b.commit_date.getTime());
    }

    logger.debug(`Grouped ${memories.length} memories into ${grouped.size} target files`);
    
    return grouped;
  }

  /**
   * Create memory statistics for reporting
   */
  createMemoryStats(memories: ExtractedMemory[]): {
    total_memories: number;
    by_location: Record<string, number>;
    by_category: Record<string, number>;
    by_type: Record<string, number>;
    date_range: {
      earliest: string;
      latest: string;
    };
    authors: string[];
  } {
    const stats = {
      total_memories: memories.length,
      by_location: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
      date_range: {
        earliest: '',
        latest: ''
      },
      authors: [] as string[]
    };

    if (memories.length === 0) {
      return stats;
    }

    // Count by location
    memories.forEach(memory => {
      stats.by_location[memory.location] = (stats.by_location[memory.location] || 0) + 1;
    });

    // Count by category and type
    memories.forEach(memory => {
      if (memory.category) {
        stats.by_category[memory.category] = (stats.by_category[memory.category] || 0) + 1;
      }
      stats.by_type[memory.type] = (stats.by_type[memory.type] || 0) + 1;
    });

    // Date range
    const dates = memories.map(m => m.commit_date).sort((a, b) => a.getTime() - b.getTime());
    stats.date_range.earliest = dates[0].toISOString().split('T')[0];
    stats.date_range.latest = dates[dates.length - 1].toISOString().split('T')[0];

    // Unique authors
    stats.authors = [...new Set(memories.map(m => m.author))].sort();

    return stats;
  }
}