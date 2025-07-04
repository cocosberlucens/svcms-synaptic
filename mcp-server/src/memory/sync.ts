/**
 * Memory Sync Engine
 * 
 * Handles reading, writing, and syncing memories to CLAUDE.md files with
 * deduplication, proper formatting, and idempotent operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import type { ExtractedMemory } from './extractor.js';

export interface SyncResult {
  files_processed: number;
  memories_synced: number;
  memories_skipped: number;
  files_created: number;
  files_updated: number;
  errors: string[];
  warnings: string[];
}

export interface SyncOptions {
  dry_run: boolean;
  backup: boolean;
  force_overwrite: boolean;
  max_memories_per_file?: number;
}

interface ParsedClaudeFile {
  path: string;
  exists: boolean;
  content: string;
  existing_memories: Set<string>; // commit SHAs
  memory_section_start?: number;
  memory_section_end?: number;
}

export class MemorySync {
  private repoRoot: string;

  constructor(repoRoot: string = process.cwd()) {
    this.repoRoot = repoRoot;
  }

  /**
   * Sync memories to CLAUDE.md files
   */
  async syncMemories(
    memoriesByLocation: Map<string, ExtractedMemory[]>,
    options: SyncOptions
  ): Promise<SyncResult> {
    logger.info(`Starting memory sync to ${memoriesByLocation.size} files...`, {
      dry_run: options.dry_run,
      backup: options.backup
    });

    const result: SyncResult = {
      files_processed: 0,
      memories_synced: 0,
      memories_skipped: 0,
      files_created: 0,
      files_updated: 0,
      errors: [],
      warnings: []
    };

    for (const [location, memories] of memoriesByLocation) {
      try {
        const fileResult = await this.syncToFile(location, memories, options);
        
        result.files_processed++;
        result.memories_synced += fileResult.memories_synced;
        result.memories_skipped += fileResult.memories_skipped;
        
        if (fileResult.file_created) {
          result.files_created++;
        } else if (fileResult.file_updated) {
          result.files_updated++;
        }

        result.warnings.push(...fileResult.warnings);

      } catch (error) {
        const errorMsg = `Failed to sync to ${location}: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    logger.info('Memory sync completed', {
      files_processed: result.files_processed,
      memories_synced: result.memories_synced,
      files_created: result.files_created,
      files_updated: result.files_updated,
      errors: result.errors.length
    });

    return result;
  }

  /**
   * Sync memories to a single CLAUDE.md file
   */
  private async syncToFile(
    location: string,
    memories: ExtractedMemory[],
    options: SyncOptions
  ): Promise<{
    memories_synced: number;
    memories_skipped: number;
    file_created: boolean;
    file_updated: boolean;
    warnings: string[];
  }> {
    const result = {
      memories_synced: 0,
      memories_skipped: 0,
      file_created: false,
      file_updated: false,
      warnings: [] as string[]
    };

    // Parse existing file
    const claudeFile = await this.parseClaudeFile(location);
    
    // Filter out memories that already exist
    const newMemories = memories.filter(memory => {
      if (claudeFile.existing_memories.has(memory.commit_sha)) {
        result.memories_skipped++;
        logger.debug(`Skipping duplicate memory from commit ${memory.commit_sha.substring(0, 8)}`);
        return false;
      }
      return true;
    });

    // Check if we have any new memories to add
    if (newMemories.length === 0) {
      logger.debug(`No new memories to add to ${location}`);
      return result;
    }

    // Check memory limit
    if (options.max_memories_per_file && 
        claudeFile.existing_memories.size + newMemories.length > options.max_memories_per_file) {
      result.warnings.push(`File ${location} would exceed max memories limit (${options.max_memories_per_file})`);
    }

    // Generate updated content
    const updatedContent = this.generateUpdatedContent(claudeFile, newMemories);

    // Write file if not dry run
    if (!options.dry_run) {
      // Create backup if requested
      if (options.backup && claudeFile.exists) {
        await this.createBackup(location, claudeFile.content);
      }

      // Ensure directory exists
      await this.ensureDirectoryExists(location);

      // Write updated content
      await fs.writeFile(path.join(this.repoRoot, location), updatedContent, 'utf-8');
      
      logger.info(`Synced ${newMemories.length} memories to ${location}`);
    } else {
      logger.info(`[DRY RUN] Would sync ${newMemories.length} memories to ${location}`);
    }

    result.memories_synced = newMemories.length;
    result.file_created = !claudeFile.exists;
    result.file_updated = claudeFile.exists;

    return result;
  }

  /**
   * Parse existing CLAUDE.md file to extract existing memories
   */
  private async parseClaudeFile(location: string): Promise<ParsedClaudeFile> {
    const filePath = path.join(this.repoRoot, location);
    const parsed: ParsedClaudeFile = {
      path: filePath,
      exists: false,
      content: '',
      existing_memories: new Set()
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      parsed.exists = true;
      parsed.content = content;

      // Find SVCMS memories section
      const lines = content.split('\n');
      let inMemorySection = false;
      let memoryStartIndex = -1;
      let memoryEndIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for SVCMS Memories section
        if (line.includes('SVCMS Memories') || line.includes('## SVCMS Memories')) {
          inMemorySection = true;
          memoryStartIndex = i;
          continue;
        }

        // Look for next major section (end of memories)
        if (inMemorySection && line.startsWith('##') && !line.includes('SVCMS Memories')) {
          memoryEndIndex = i;
          break;
        }

        // Extract commit SHAs from memory entries
        if (inMemorySection && line.startsWith('-')) {
          const commitMatch = line.match(/commit `([a-f0-9]{8,})`/);
          if (commitMatch) {
            parsed.existing_memories.add(commitMatch[1]);
          }
        }
      }

      parsed.memory_section_start = memoryStartIndex;
      parsed.memory_section_end = memoryEndIndex;

      logger.debug(`Parsed ${location}: ${parsed.existing_memories.size} existing memories`);

    } catch (error) {
      // File doesn't exist or can't be read
      logger.debug(`File ${location} does not exist or cannot be read`);
    }

    return parsed;
  }

  /**
   * Generate updated file content with new memories
   */
  private generateUpdatedContent(claudeFile: ParsedClaudeFile, newMemories: ExtractedMemory[]): string {
    const lines = claudeFile.content ? claudeFile.content.split('\n') : [];
    const newMemoryEntries = this.formatMemoryEntries(newMemories);

    if (!claudeFile.exists || lines.length === 0) {
      // Create new file with header and memories
      return this.createNewClaudeFile(newMemoryEntries);
    }

    if (claudeFile.memory_section_start === undefined) {
      // File exists but no memory section - add it at the end
      const content = claudeFile.content.trimEnd();
      return content + '\n\n' + this.createMemorySection(newMemoryEntries);
    }

    // File has existing memory section - insert new memories
    const beforeSection = lines.slice(0, claudeFile.memory_section_start);
    const afterSection = claudeFile.memory_section_end !== undefined 
      ? lines.slice(claudeFile.memory_section_end)
      : [];

    // Extract existing memory entries
    const existingEntries: string[] = [];
    if (claudeFile.memory_section_end !== undefined) {
      for (let i = claudeFile.memory_section_start + 1; i < claudeFile.memory_section_end; i++) {
        const line = lines[i];
        if (line.trim() && !line.includes('*Automatically synced by Synaptic*')) {
          existingEntries.push(line);
        }
      }
    } else {
      // Memory section extends to end of file
      for (let i = claudeFile.memory_section_start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() && !line.includes('*Automatically synced by Synaptic*')) {
          existingEntries.push(line);
        }
      }
    }

    // Combine existing and new entries
    const allEntries = [...existingEntries, ...newMemoryEntries];
    
    // Reconstruct file
    const updatedLines = [
      ...beforeSection,
      '## SVCMS Memories',
      '',
      '*Automatically synced by Synaptic*',
      '',
      ...allEntries,
      '',
      ...afterSection
    ];

    return updatedLines.join('\n');
  }

  /**
   * Format memory entries for CLAUDE.md
   */
  private formatMemoryEntries(memories: ExtractedMemory[]): string[] {
    return memories.map(memory => {
      const shortSha = memory.commit_sha.substring(0, 8);
      const date = memory.commit_date.toISOString().split('T')[0];
      const tags = memory.tags.length > 0 ? ` [${memory.tags.join(', ')}]` : '';
      
      return `- ${memory.content}: commit \`${shortSha}\` (${date})${tags}`;
    });
  }

  /**
   * Create new CLAUDE.md file content
   */
  private createNewClaudeFile(memoryEntries: string[]): string {
    return [
      '# CLAUDE.md',
      '',
      'This file provides guidance to Claude Code when working with code in this repository.',
      '',
      this.createMemorySection(memoryEntries)
    ].join('\n');
  }

  /**
   * Create memory section content
   */
  private createMemorySection(memoryEntries: string[]): string {
    return [
      '## SVCMS Memories',
      '',
      '*Automatically synced by Synaptic*',
      '',
      ...memoryEntries,
      ''
    ].join('\n');
  }

  /**
   * Ensure directory exists for file path
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(path.join(this.repoRoot, filePath));
    
    try {
      await fs.access(dir);
    } catch {
      logger.debug(`Creating directory: ${dir}`);
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(location: string, content: string): Promise<void> {
    const backupPath = path.join(
      this.repoRoot, 
      location + `.backup.${Date.now()}`
    );
    
    await fs.writeFile(backupPath, content, 'utf-8');
    logger.debug(`Created backup: ${backupPath}`);
  }

  /**
   * Preview sync operation (detailed dry run)
   */
  async previewSync(memoriesByLocation: Map<string, ExtractedMemory[]>): Promise<{
    files_to_create: string[];
    files_to_update: string[];
    total_memories: number;
    memory_breakdown: Array<{
      file: string;
      new_memories: number;
      existing_memories: number;
      sample_memories: string[];
    }>;
  }> {
    const preview = {
      files_to_create: [] as string[],
      files_to_update: [] as string[],
      total_memories: 0,
      memory_breakdown: [] as Array<{
        file: string;
        new_memories: number;
        existing_memories: number;
        sample_memories: string[];
      }>
    };

    for (const [location, memories] of memoriesByLocation) {
      const claudeFile = await this.parseClaudeFile(location);
      
      const newMemories = memories.filter(memory => 
        !claudeFile.existing_memories.has(memory.commit_sha)
      );

      if (newMemories.length > 0) {
        if (claudeFile.exists) {
          preview.files_to_update.push(location);
        } else {
          preview.files_to_create.push(location);
        }

        preview.total_memories += newMemories.length;

        // Sample memories (first 3)
        const sampleMemories = newMemories
          .slice(0, 3)
          .map(m => `${m.content.substring(0, 50)}...`);

        preview.memory_breakdown.push({
          file: location,
          new_memories: newMemories.length,
          existing_memories: claudeFile.existing_memories.size,
          sample_memories: sampleMemories
        });
      }
    }

    return preview;
  }
}