/**
 * Git Client with Diff Awareness
 * 
 * Provides git operations with automatic diff context extraction.
 * This is the core of SVCMS's git-embedded memory system.
 */

import simpleGit, { SimpleGit, LogResult, DiffResult } from 'simple-git';
import { logger } from '../utils/logger.js';
import type { SvcmsCommit, ParsedSvcmsCommit } from '../types.js';
import { SvcmsParser } from '../svcms/parser.js';

export class GitClient {
  private git: SimpleGit;
  private parser: SvcmsParser;

  constructor(repositoryPath: string = process.cwd()) {
    this.git = simpleGit(repositoryPath);
    this.parser = new SvcmsParser();
    logger.debug(`Initialized git client for repository: ${repositoryPath}`);
  }

  /**
   * Get current working directory diff
   */
  async getCurrentDiff(): Promise<string> {
    try {
      const diff = await this.git.diff();
      logger.debug(`Current diff: ${diff.length} characters`);
      return diff;
    } catch (error) {
      logger.error('Failed to get current diff:', error);
      throw new Error(`Failed to get current diff: ${error}`);
    }
  }

  /**
   * Get diff for a specific commit
   */
  async getCommitDiff(commitSha: string): Promise<string> {
    try {
      const diff = await this.git.show([commitSha, '--format=', '--no-merges']);
      logger.debug(`Commit ${commitSha} diff: ${diff.length} characters`);
      return diff;
    } catch (error) {
      logger.error(`Failed to get diff for commit ${commitSha}:`, error);
      throw new Error(`Failed to get commit diff: ${error}`);
    }
  }

  /**
   * Get commits with full SVCMS context (message + diff + parsing)
   */
  async getCommitsWithContext(options: {
    limit?: number;
    since?: string;
    grep?: string;
    author?: string;
  } = {}): Promise<SvcmsCommit[]> {
    try {
      logger.debug('Fetching commits with context...', options);
      
      const logOptions: any = {
        maxCount: options.limit || 100,
        format: {
          hash: '%H',
          author_name: '%an',
          author_email: '%ae', 
          date: '%ai',
          message: '%B'
        }
      };

      if (options.since) {
        logOptions.since = options.since;
      }

      if (options.grep) {
        logOptions.grep = options.grep;
      }

      if (options.author) {
        logOptions.author = options.author;
      }

      const log = await this.git.log(logOptions);
      
      const commits: SvcmsCommit[] = [];
      
      for (const commit of log.all) {
        try {
          // Get diff for this commit
          const diff = await this.getCommitDiff(commit.hash);
          
          // Parse SVCMS commit if it follows the format
          const parsed = this.parser.parse(commit.message);
          
          const svcmsCommit: SvcmsCommit = {
            sha: commit.hash,
            message: commit.message,
            author: {
              name: commit.author_name,
              email: commit.author_email,
              date: new Date(commit.date)
            },
            diff,
            parsed
          };
          
          commits.push(svcmsCommit);
          
        } catch (error) {
          logger.warn(`Failed to process commit ${commit.hash}:`, error);
          // Continue with other commits
        }
      }
      
      logger.info(`Loaded ${commits.length} commits with context`);
      return commits;
      
    } catch (error) {
      logger.error('Failed to get commits with context:', error);
      throw new Error(`Failed to get commits: ${error}`);
    }
  }

  /**
   * Search commits by pattern with structural context
   */
  async searchCommitsWithContext(pattern: string, options: {
    includeCode?: boolean;
    maxResults?: number;
  } = {}): Promise<SvcmsCommit[]> {
    try {
      logger.debug(`Searching commits with pattern: ${pattern}`);
      
      const commits = await this.getCommitsWithContext({
        grep: pattern,
        limit: options.maxResults || 50
      });
      
      // Filter for SVCMS commits that actually match
      const matchingCommits = commits.filter(commit => {
        const messageMatch = commit.message.toLowerCase().includes(pattern.toLowerCase());
        const codeMatch = options.includeCode && 
          commit.diff.toLowerCase().includes(pattern.toLowerCase());
        
        return messageMatch || codeMatch;
      });
      
      logger.info(`Found ${matchingCommits.length} matching commits`);
      return matchingCommits;
      
    } catch (error) {
      logger.error(`Failed to search commits with pattern ${pattern}:`, error);
      throw new Error(`Commit search failed: ${error}`);
    }
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<{
    current: string;
    tracking: string | null;
    ahead: number;
    behind: number;
    staged: string[];
    modified: string[];
    untracked: string[];
  }> {
    try {
      const status = await this.git.status();
      
      return {
        current: status.current || 'unknown',
        tracking: status.tracking || null,
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        staged: status.staged,
        modified: status.modified,
        untracked: status.not_added
      };
      
    } catch (error) {
      logger.error('Failed to get git status:', error);
      throw new Error(`Failed to get status: ${error}`);
    }
  }

  /**
   * Create SVCMS commit with proper formatting
   */
  async createSvcmsCommit(
    category: string,
    type: string,
    scope: string | undefined,
    summary: string,
    body: string,
    memory: string,
    location?: string,
    tags?: string[]
  ): Promise<string> {
    try {
      // Format SVCMS commit message
      const commitMessage = this.formatSvcmsCommit({
        category,
        type,
        scope,
        summary,
        body,
        memory,
        location,
        tags
      });
      
      // Create commit
      const result = await this.git.commit(commitMessage);
      
      logger.info(`Created SVCMS commit: ${result.commit}`);
      return result.commit;
      
    } catch (error) {
      logger.error('Failed to create SVCMS commit:', error);
      throw new Error(`Commit creation failed: ${error}`);
    }
  }

  /**
   * Format SVCMS commit message according to specification
   */
  private formatSvcmsCommit(commit: {
    category: string;
    type: string;
    scope?: string;
    summary: string;
    body: string;
    memory: string;
    location?: string;
    tags?: string[];
  }): string {
    const scopePart = commit.scope ? `(${commit.scope})` : '';
    const header = `${commit.category}.${commit.type}${scopePart}: ${commit.summary}`;
    
    const parts = [
      header,
      '',
      commit.body,
      '',
      `Memory: ${commit.memory}`
    ];
    
    if (commit.location) {
      parts.push(`Location: ${commit.location}`);
    }
    
    if (commit.tags && commit.tags.length > 0) {
      parts.push(`Tags: ${commit.tags.join(', ')}`);
    }
    
    // Add Claude Code attribution
    parts.push('');
    parts.push('🤖 Generated with [Claude Code](https://claude.ai/code)');
    parts.push('');
    parts.push('Co-Authored-By: Claude <noreply@anthropic.com>');
    
    return parts.join('\n');
  }

  /**
   * Check if current directory is a git repository
   */
  async isRepository(): Promise<boolean> {
    try {
      await this.git.checkIsRepo();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository root path
   */
  async getRepositoryRoot(): Promise<string> {
    try {
      const root = await this.git.revparse(['--show-toplevel']);
      return root.trim();
    } catch (error) {
      logger.error('Failed to get repository root:', error);
      throw new Error(`Failed to get repository root: ${error}`);
    }
  }
}