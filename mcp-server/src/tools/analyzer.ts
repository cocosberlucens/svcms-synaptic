/**
 * Code Analysis Engine with ast-grep Integration
 * 
 * Analyzes diffs and code changes using ast-grep patterns to suggest
 * semantic commit types and extract meaningful patterns.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import type { 
  ToolCapabilities, 
  CommitSuggestion, 
  SvcmsConfig,
  AstGrepResult,
  AstGrepMatch 
} from '../types.js';

const execFileAsync = promisify(execFile);

export class CodeAnalyzer {
  private capabilities: ToolCapabilities;
  private config: SvcmsConfig;
  private repoRoot: string;

  constructor(capabilities: ToolCapabilities, config: SvcmsConfig, repoRoot: string = process.cwd()) {
    this.capabilities = capabilities;
    this.config = config;
    this.repoRoot = repoRoot;
  }

  /**
   * Analyze diff and suggest semantic commit message
   */
  async analyzeDiffForCommit(diff: string, options: {
    scope?: string;
    hint?: string;
  } = {}): Promise<CommitSuggestion> {
    logger.debug('Analyzing diff for commit suggestion...', { 
      diffLength: diff.length,
      scope: options.scope,
      hint: options.hint 
    });

    const patterns = await this.extractPatternsFromDiff(diff);
    const fileTypes = this.analyzeFileTypes(diff);
    const changeNature = this.analyzeChangeNature(diff, patterns);

    // Determine commit type based on patterns and analysis
    const suggestion = this.generateCommitSuggestion({
      patterns,
      fileTypes,
      changeNature,
      ...options
    });

    logger.info('Generated commit suggestion', {
      type: `${suggestion.category}.${suggestion.type}`,
      confidence: Math.round(suggestion.confidence * 100),
      patterns: suggestion.detected_patterns.length
    });

    return suggestion;
  }

  /**
   * Extract semantic patterns from diff using ast-grep
   */
  private async extractPatternsFromDiff(diff: string): Promise<string[]> {
    if (!this.capabilities.ast_grep.available) {
      logger.debug('ast-grep not available, using basic pattern detection');
      return this.basicPatternDetection(diff);
    }

    try {
      const patterns: string[] = [];
      
      // Get project-specific patterns from config
      const projectPatterns = this.config.project?.tools?.ast_grep?.project_patterns || [];
      const commitAnalysis = this.config.project?.tools?.ast_grep?.commit_analysis || {};

      // Check each pattern category
      for (const [category, categoryPatterns] of Object.entries(commitAnalysis)) {
        if (Array.isArray(categoryPatterns)) {
          for (const pattern of categoryPatterns as string[]) {
            if (await this.checkPatternInDiff(pattern, diff)) {
              patterns.push(`${category}:${pattern}`);
            }
          }
        }
      }

      // Check project-specific patterns
      for (const projectPattern of projectPatterns) {
        if (await this.checkPatternInDiff(projectPattern.pattern, diff)) {
          patterns.push(`project:${projectPattern.commit_hint || 'general'}:${projectPattern.pattern}`);
        }
      }

      return patterns;

    } catch (error) {
      logger.warn('Failed to extract patterns with ast-grep:', error);
      return this.basicPatternDetection(diff);
    }
  }

  /**
   * Check if pattern exists in diff using ast-grep
   */
  private async checkPatternInDiff(pattern: string, diff: string): Promise<boolean> {
    try {
      // Create temporary file with diff content for ast-grep analysis
      // For now, we'll use a simplified approach checking if pattern elements exist
      const { stdout } = await execFileAsync('ast-grep', [
        '-p', pattern,
        '--json',
        '--stats-only'
      ], {
        cwd: this.repoRoot,
        timeout: 5000
      });

      const stats = JSON.parse(stdout);
      return stats.total_matches > 0;

    } catch {
      // If ast-grep fails, fall back to basic text matching
      return diff.includes(pattern.replace(/\$\w+/g, ''));
    }
  }

  /**
   * Basic pattern detection fallback
   */
  private basicPatternDetection(diff: string): string[] {
    const patterns: string[] = [];
    const diffLower = diff.toLowerCase();

    // Error handling patterns
    if (diffLower.includes('throw') || diffLower.includes('error') || diffLower.includes('catch')) {
      patterns.push('error:throw new Error');
    }

    // Authentication patterns
    if (diffLower.includes('auth') || diffLower.includes('login') || diffLower.includes('token')) {
      patterns.push('auth:authentication');
    }

    // API patterns
    if (diffLower.includes('fetch') || diffLower.includes('axios') || diffLower.includes('api')) {
      patterns.push('api:http_request');
    }

    // UI patterns
    if (diffLower.includes('usestate') || diffLower.includes('component') || diffLower.includes('render')) {
      patterns.push('ui:react_component');
    }

    // Test patterns
    if (diffLower.includes('test') || diffLower.includes('spec') || diffLower.includes('expect')) {
      patterns.push('test:testing');
    }

    return patterns;
  }

  /**
   * Analyze file types in diff
   */
  private analyzeFileTypes(diff: string): string[] {
    const fileTypes: string[] = [];
    const lines = diff.split('\n');

    for (const line of lines) {
      if (line.startsWith('diff --git') || line.startsWith('+++') || line.startsWith('---')) {
        const fileMatch = line.match(/[ab]\/(.+)$/);
        if (fileMatch) {
          const filePath = fileMatch[1];
          const extension = path.extname(filePath).slice(1);
          if (extension && !fileTypes.includes(extension)) {
            fileTypes.push(extension);
          }
        }
      }
    }

    return fileTypes;
  }

  /**
   * Analyze the nature of changes
   */
  private analyzeChangeNature(diff: string, patterns: string[]): {
    additions: number;
    deletions: number;
    modifications: number;
    isNewFile: boolean;
    isDeletedFile: boolean;
    majorChange: boolean;
  } {
    const lines = diff.split('\n');
    let additions = 0;
    let deletions = 0;
    let modifications = 0;
    let isNewFile = false;
    let isDeletedFile = false;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      } else if (line.startsWith('new file mode')) {
        isNewFile = true;
      } else if (line.startsWith('deleted file mode')) {
        isDeletedFile = true;
      }
    }

    modifications = Math.min(additions, deletions);
    const totalChanges = additions + deletions;
    const majorChange = totalChanges > 50 || patterns.some(p => p.includes('error:') || p.includes('auth:'));

    return {
      additions,
      deletions,
      modifications,
      isNewFile,
      isDeletedFile,
      majorChange
    };
  }

  /**
   * Generate commit suggestion based on analysis
   */
  private generateCommitSuggestion(analysis: {
    patterns: string[];
    fileTypes: string[];
    changeNature: ReturnType<typeof CodeAnalyzer.prototype.analyzeChangeNature>;
    scope?: string;
    hint?: string;
  }): CommitSuggestion {
    let category = 'standard';
    let type = 'chore';
    let confidence = 0.5;
    const reasoning: string[] = [];
    
    // Determine category based on patterns
    if (analysis.patterns.some(p => p.includes('error:') || p.includes('auth:'))) {
      category = 'knowledge';
      confidence += 0.2;
      reasoning.push('High-significance patterns detected');
    }

    // Determine type based on change nature and patterns
    if (analysis.changeNature.isNewFile) {
      type = 'feat';
      confidence += 0.3;
      reasoning.push('New file created');
    } else if (analysis.changeNature.isDeletedFile) {
      type = 'refactor';
      confidence += 0.3;
      reasoning.push('File deleted');
    } else if (analysis.patterns.some(p => p.includes('error:'))) {
      type = 'fix';
      confidence += 0.4;
      reasoning.push('Error handling patterns found');
    } else if (analysis.patterns.some(p => p.includes('test:'))) {
      type = 'test';
      confidence += 0.4;
      reasoning.push('Test-related changes detected');
    } else if (analysis.patterns.some(p => p.includes('ui:'))) {
      type = 'feat';
      confidence += 0.3;
      reasoning.push('UI component changes');
    } else if (analysis.patterns.some(p => p.includes('api:'))) {
      type = 'feat';
      confidence += 0.3;
      reasoning.push('API-related changes');
    } else if (analysis.changeNature.majorChange) {
      type = 'refactor';
      confidence += 0.2;
      reasoning.push('Major change detected');
    }

    // Determine scope
    let scope = analysis.scope;
    if (!scope && analysis.hint) {
      scope = analysis.hint;
      confidence += 0.1;
      reasoning.push(`Scope inferred from hint: ${analysis.hint}`);
    }

    // Infer scope from patterns if not provided
    if (!scope) {
      for (const pattern of analysis.patterns) {
        if (pattern.includes('auth:')) {
          scope = 'auth';
          break;
        } else if (pattern.includes('api:')) {
          scope = 'api';
          break;
        } else if (pattern.includes('ui:')) {
          scope = 'ui';
          break;
        } else if (pattern.includes('test:')) {
          scope = 'test';
          break;
        }
      }
      if (scope) {
        confidence += 0.15;
        reasoning.push(`Scope inferred from patterns: ${scope}`);
      }
    }

    // Generate summary
    const summary = this.generateSummary(type, analysis);

    // Cap confidence at 0.95 to indicate AI suggestion
    confidence = Math.min(confidence, 0.95);

    return {
      category,
      type,
      scope,
      summary,
      confidence,
      reasoning,
      detected_patterns: analysis.patterns
    };
  }

  /**
   * Generate concise summary based on change type and analysis
   */
  private generateSummary(type: string, analysis: {
    patterns: string[];
    fileTypes: string[];
    changeNature: ReturnType<typeof CodeAnalyzer.prototype.analyzeChangeNature>;
  }): string {
    const { changeNature, patterns, fileTypes } = analysis;

    if (changeNature.isNewFile) {
      return `add new ${fileTypes[0] || 'file'}`;
    }

    if (changeNature.isDeletedFile) {
      return `remove unused ${fileTypes[0] || 'file'}`;
    }

    if (patterns.some(p => p.includes('error:'))) {
      return 'improve error handling';
    }

    if (patterns.some(p => p.includes('auth:'))) {
      return 'update authentication logic';
    }

    if (patterns.some(p => p.includes('api:'))) {
      return 'enhance API functionality';
    }

    if (patterns.some(p => p.includes('ui:'))) {
      return 'update UI components';
    }

    if (patterns.some(p => p.includes('test:'))) {
      return 'add test coverage';
    }

    if (type === 'refactor') {
      return 'refactor code structure';
    }

    // Generic summary based on change size
    if (changeNature.additions > changeNature.deletions) {
      return 'add functionality';
    } else if (changeNature.deletions > changeNature.additions) {
      return 'remove unused code';
    } else {
      return 'update implementation';
    }
  }

  /**
   * Analyze structural patterns in specific files
   */
  async analyzeStructuralPatterns(filePath: string): Promise<AstGrepResult[]> {
    if (!this.capabilities.ast_grep.available) {
      logger.warn('ast-grep not available for structural analysis');
      return [];
    }

    try {
      const { stdout } = await execFileAsync('ast-grep', [
        '-p', '$PATTERN',
        '--json',
        filePath
      ], {
        cwd: this.repoRoot,
        timeout: 10000
      });

      return JSON.parse(stdout) as AstGrepResult[];

    } catch (error) {
      logger.warn(`Failed to analyze structural patterns in ${filePath}:`, error);
      return [];
    }
  }
}