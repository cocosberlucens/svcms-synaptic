/**
 * SVCMS Commit Message Parser
 * 
 * Parses commit messages following the SVCMS specification.
 * Ported from Rust implementation with TypeScript enhancements.
 */

import { logger } from '../utils/logger.js';
import type { ParsedSvcmsCommit } from '../types.js';

export class SvcmsParser {
  // SVCMS commit types (from specification)
  private readonly SVCMS_TYPES = new Set([
    // Standard types
    'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore',
    // Knowledge types  
    'learned', 'insight', 'context', 'decision', 'memory',
    // Collaboration types
    'discussed', 'explored', 'attempted',
    // Meta types
    'workflow', 'preference', 'pattern',
    // Legacy variants
    'decided' // alias for decision
  ]);

  // Two-tier format regex: category.type(scope): summary
  private readonly TWO_TIER_REGEX = /^([a-z]+)\.([a-z]+)(?:\(([^)]+)\))?\s*:\s*(.+)$/;
  
  // Legacy format regex: type(scope): summary  
  private readonly LEGACY_REGEX = /^([a-z]+)(?:\(([^)]+)\))?\s*:\s*(.+)$/;

  /**
   * Parse SVCMS commit message
   */
  parse(message: string): ParsedSvcmsCommit | undefined {
    try {
      const lines = message.split('\n');
      const firstLine = lines[0]?.trim();
      
      if (!firstLine) {
        logger.debug('Empty commit message');
        return undefined;
      }

      // Try two-tier format first
      let match = firstLine.match(this.TWO_TIER_REGEX);
      if (match) {
        const [, category, type, scope, summary] = match;
        
        if (!this.SVCMS_TYPES.has(type)) {
          logger.debug(`Unknown SVCMS type: ${type}`);
          return undefined;
        }

        return this.parseCommitBody(lines.slice(1), {
          category,
          type,
          scope,
          summary: summary.trim()
        });
      }

      // Try legacy format
      match = firstLine.match(this.LEGACY_REGEX);
      if (match) {
        const [, type, scope, summary] = match;
        
        if (!this.SVCMS_TYPES.has(type)) {
          logger.debug(`Unknown SVCMS type: ${type}`);
          return undefined;
        }

        return this.parseCommitBody(lines.slice(1), {
          type,
          scope,
          summary: summary.trim()
        });
      }

      logger.debug('Commit message does not match SVCMS format');
      return undefined;

    } catch (error) {
      logger.warn('Failed to parse commit message:', error);
      return undefined;
    }
  }

  /**
   * Parse commit body for SVCMS metadata
   */
  private parseCommitBody(
    bodyLines: string[], 
    header: Partial<ParsedSvcmsCommit>
  ): ParsedSvcmsCommit {
    const result: ParsedSvcmsCommit = {
      ...header
    } as ParsedSvcmsCommit;

    let bodyContent = '';
    
    for (const line of bodyLines) {
      const trimmed = line.trim();
      
      // Skip empty lines at the start
      if (!trimmed && !bodyContent) {
        continue;
      }

      // Check for metadata fields
      if (trimmed.startsWith('Context:')) {
        result.context = trimmed.substring(8).trim();
        continue;
      }

      if (trimmed.startsWith('Refs:')) {
        result.refs = this.parseRefs(trimmed.substring(5).trim());
        continue;
      }

      if (trimmed.startsWith('Memory:')) {
        result.memory = trimmed.substring(7).trim();
        continue;
      }

      if (trimmed.startsWith('Location:')) {
        result.location = trimmed.substring(9).trim();
        continue;
      }

      if (trimmed.startsWith('Tags:')) {
        result.tags = this.parseTags(trimmed.substring(5).trim());
        continue;
      }

      // Skip Claude Code attribution lines
      if (trimmed.includes('Generated with [Claude Code]') || 
          trimmed.includes('Co-Authored-By: Claude') ||
          trimmed.startsWith('🤖') ||
          trimmed.startsWith('🚀')) {
        continue;
      }

      // Accumulate body content
      if (bodyContent || trimmed) {
        bodyContent += (bodyContent ? '\n' : '') + line;
      }
    }

    if (bodyContent.trim()) {
      result.body = bodyContent.trim();
    }

    logger.debug('Parsed SVCMS commit:', result);
    return result;
  }

  /**
   * Parse references field (issues, docs, commits)
   */
  private parseRefs(refsString: string): string[] {
    if (!refsString) return [];
    
    return refsString
      .split(',')
      .map(ref => ref.trim())
      .filter(ref => ref.length > 0);
  }

  /**
   * Parse tags field
   */
  private parseTags(tagsString: string): string[] {
    if (!tagsString) return [];
    
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  /**
   * Validate SVCMS commit structure
   */
  validateCommit(parsed: ParsedSvcmsCommit): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!parsed.type) {
      errors.push('Missing commit type');
    }

    if (!parsed.summary) {
      errors.push('Missing commit summary');
    }

    // Summary length check
    if (parsed.summary && parsed.summary.length > 72) {
      warnings.push('Summary exceeds 72 characters');
    }

    // Memory field for knowledge commits
    if (['learned', 'insight', 'decision', 'memory'].includes(parsed.type) && !parsed.memory) {
      warnings.push('Knowledge commits should include Memory field');
    }

    // Location field validation
    if (parsed.location && !this.isValidLocation(parsed.location)) {
      warnings.push('Location field should be a valid file path');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if location is a valid file path
   */
  private isValidLocation(location: string): boolean {
    // Basic validation for CLAUDE.md paths
    return location.includes('CLAUDE.md') || 
           location.startsWith('./') || 
           location.startsWith('~/') ||
           location.startsWith('src/');
  }

  /**
   * Generate commit suggestion based on diff analysis
   */
  generateCommitSuggestion(diff: string, context?: {
    scope?: string;
    recentCommits?: ParsedSvcmsCommit[];
  }): {
    category: string;
    type: string;
    scope?: string;
    summary: string;
    confidence: number;
  } {
    // Simple heuristics for commit suggestion
    const diffLower = diff.toLowerCase();
    
    // Detect type based on diff content
    let type = 'chore';
    let category = 'standard';
    let confidence = 0.5;

    if (diffLower.includes('test') || diffLower.includes('spec')) {
      type = 'test';
      confidence = 0.8;
    } else if (diffLower.includes('fix') || diffLower.includes('bug')) {
      type = 'fix';
      confidence = 0.9;
    } else if (diffLower.includes('feat') || diffLower.includes('add')) {
      type = 'feat';
      confidence = 0.8;
    } else if (diffLower.includes('refactor')) {
      type = 'refactor';
      confidence = 0.9;
    } else if (diffLower.includes('perf')) {
      type = 'perf';
      confidence = 0.8;
    } else if (diffLower.includes('doc')) {
      type = 'docs';
      confidence = 0.8;
    }

    // Detect knowledge commits
    if (diffLower.includes('todo') || 
        diffLower.includes('fixme') ||
        diffLower.includes('memory:')) {
      category = 'knowledge';
      type = 'learned';
      confidence = 0.7;
    }

    // Generate summary based on changes
    const summary = this.generateSummaryFromDiff(diff);

    return {
      category,
      type,
      scope: context?.scope,
      summary,
      confidence
    };
  }

  /**
   * Generate summary from diff content
   */
  private generateSummaryFromDiff(diff: string): string {
    const lines = diff.split('\n');
    const additions = lines.filter(line => line.startsWith('+')).length;
    const deletions = lines.filter(line => line.startsWith('-')).length;
    
    if (additions > deletions * 2) {
      return 'add new functionality';
    } else if (deletions > additions * 2) {
      return 'remove unused code';
    } else {
      return 'update implementation';
    }
  }
}