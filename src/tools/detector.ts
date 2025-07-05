/**
 * External Tool Detection and Integration
 * 
 * Discovers and validates external tools (ast-grep, ripgrep) with project-specific
 * customizations including custom rules, grammars, and configuration.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import type { 
  ToolCapabilities, 
  AstGrepCapabilities, 
  RipgrepCapabilities,
  CustomAstGrepRule 
} from '../types.js';

const execFileAsync = promisify(execFile);

export class ToolDetector {
  private repoRoot: string;

  constructor(repoRoot: string = process.cwd()) {
    this.repoRoot = repoRoot;
  }

  /**
   * Detect all available external tools and their capabilities
   */
  async detectAll(): Promise<ToolCapabilities> {
    logger.info('🔍 Detecting external tools and capabilities...');

    const [astGrep, ripgrep] = await Promise.all([
      this.detectAstGrep(),
      this.detectRipgrep()
    ]);

    const capabilities: ToolCapabilities = {
      ast_grep: astGrep,
      ripgrep: ripgrep,
      detection_timestamp: new Date().toISOString()
    };

    logger.info('✅ Tool detection completed', {
      ast_grep: astGrep.available,
      ripgrep: ripgrep.available,
      custom_rules: astGrep.custom_rules?.length || 0,
      custom_grammars: astGrep.custom_grammars?.length || 0
    });

    return capabilities;
  }

  /**
   * Detect ast-grep installation and project customizations
   */
  private async detectAstGrep(): Promise<AstGrepCapabilities> {
    const capabilities: AstGrepCapabilities = {
      available: false,
      version: null,
      executable_path: null,
      supported_languages: [],
      custom_rules: [],
      custom_grammars: [],
      rules_directory: null,
      grammars_directory: null
    };

    try {
      // Check for ast-grep executable
      const { stdout } = await execFileAsync('ast-grep', ['--version']);
      const versionMatch = stdout.match(/ast-grep\s+([^\s]+)/);
      
      capabilities.available = true;
      capabilities.version = versionMatch?.[1] || 'unknown';
      capabilities.executable_path = await this.findExecutablePath('ast-grep');

      logger.debug(`Found ast-grep v${capabilities.version}`);

      // Detect supported languages
      capabilities.supported_languages = await this.detectAstGrepLanguages();

      // Discover custom rules in ./ast directory
      const customRules = await this.discoverCustomRules();
      if (customRules.rules.length > 0) {
        capabilities.custom_rules = customRules.rules;
        capabilities.rules_directory = customRules.directory;
        logger.info(`📋 Found ${customRules.rules.length} custom ast-grep rules in ${customRules.directory}`);
      }

      // Discover custom grammars in .tree-sitter directory
      const customGrammars = await this.discoverCustomGrammars();
      if (customGrammars.grammars.length > 0) {
        capabilities.custom_grammars = customGrammars.grammars;
        capabilities.grammars_directory = customGrammars.directory;
        logger.info(`🌳 Found ${customGrammars.grammars.length} custom tree-sitter grammars in ${customGrammars.directory}`);
      }

    } catch (error) {
      logger.warn('ast-grep not found or not working:', error);
    }

    return capabilities;
  }

  /**
   * Detect ripgrep installation and configuration
   */
  private async detectRipgrep(): Promise<RipgrepCapabilities> {
    const capabilities: RipgrepCapabilities = {
      available: false,
      version: null,
      executable_path: null,
      supports_json: false,
      supports_multiline: false
    };

    try {
      // Check for ripgrep executable
      const { stdout } = await execFileAsync('rg', ['--version']);
      const versionMatch = stdout.match(/ripgrep\s+([^\s]+)/);
      
      capabilities.available = true;
      capabilities.version = versionMatch?.[1] || 'unknown';
      capabilities.executable_path = await this.findExecutablePath('rg');

      // Test JSON output support
      try {
        await execFileAsync('rg', ['--json', '--help']);
        capabilities.supports_json = true;
      } catch {
        capabilities.supports_json = false;
      }

      // Test multiline support
      try {
        await execFileAsync('rg', ['--multiline', '--help']);
        capabilities.supports_multiline = true;
      } catch {
        capabilities.supports_multiline = false;
      }

      logger.debug(`Found ripgrep v${capabilities.version}`, {
        json: capabilities.supports_json,
        multiline: capabilities.supports_multiline
      });

    } catch (error) {
      logger.warn('ripgrep not found or not working:', error);
    }

    return capabilities;
  }

  /**
   * Detect supported languages for ast-grep
   */
  private async detectAstGrepLanguages(): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync('ast-grep', ['--list-languages']);
      const languages = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('-'))
        .sort();

      logger.debug(`ast-grep supports ${languages.length} languages`);
      return languages;

    } catch (error) {
      logger.warn('Failed to detect ast-grep languages:', error);
      return ['typescript', 'javascript', 'python', 'rust']; // Common defaults
    }
  }

  /**
   * Discover custom ast-grep rules in project
   */
  private async discoverCustomRules(): Promise<{
    rules: CustomAstGrepRule[];
    directory: string | null;
  }> {
    const possibleDirs = [
      path.join(this.repoRoot, 'ast'),
      path.join(this.repoRoot, '.ast-grep'),
      path.join(this.repoRoot, 'ast-grep')
    ];

    for (const dir of possibleDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const rules = await this.loadRulesFromDirectory(dir);
          if (rules.length > 0) {
            return { rules, directory: dir };
          }
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }

    return { rules: [], directory: null };
  }

  /**
   * Load custom rules from directory
   */
  private async loadRulesFromDirectory(directory: string): Promise<CustomAstGrepRule[]> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const rules: CustomAstGrepRule[] = [];

      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
          try {
            const filePath = path.join(directory, entry.name);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Parse YAML to extract rule metadata
            const rule: CustomAstGrepRule = {
              name: path.basename(entry.name, path.extname(entry.name)),
              file_path: filePath,
              description: this.extractRuleDescription(content),
              language: this.extractRuleLanguage(content),
              significance: this.extractRuleSignificance(content)
            };

            rules.push(rule);

          } catch (error) {
            logger.warn(`Failed to load rule ${entry.name}:`, error);
          }
        }
      }

      return rules;

    } catch (error) {
      logger.warn(`Failed to read rules directory ${directory}:`, error);
      return [];
    }
  }

  /**
   * Discover custom tree-sitter grammars
   */
  private async discoverCustomGrammars(): Promise<{
    grammars: string[];
    directory: string | null;
  }> {
    const possibleDirs = [
      path.join(this.repoRoot, '.tree-sitter'),
      path.join(this.repoRoot, 'tree-sitter'),
      path.join(this.repoRoot, 'grammars')
    ];

    for (const dir of possibleDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const grammars = await this.loadGrammarsFromDirectory(dir);
          if (grammars.length > 0) {
            return { grammars, directory: dir };
          }
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }

    return { grammars: [], directory: null };
  }

  /**
   * Load grammar files from directory
   */
  private async loadGrammarsFromDirectory(directory: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const grammars: string[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.so')) {
          const languageName = path.basename(entry.name, '.so');
          grammars.push(languageName);
        }
      }

      return grammars.sort();

    } catch (error) {
      logger.warn(`Failed to read grammars directory ${directory}:`, error);
      return [];
    }
  }

  /**
   * Find executable path for a command
   */
  private async findExecutablePath(command: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('which', [command]);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Extract rule description from YAML content
   */
  private extractRuleDescription(content: string): string {
    const descMatch = content.match(/(?:description|message):\s*["']?([^"'\n]+)["']?/i);
    return descMatch?.[1] || 'Custom rule';
  }

  /**
   * Extract rule language from YAML content
   */
  private extractRuleLanguage(content: string): string {
    const langMatch = content.match(/language:\s*["']?([^"'\n]+)["']?/i);
    return langMatch?.[1] || 'unknown';
  }

  /**
   * Extract rule significance from YAML content
   */
  private extractRuleSignificance(content: string): 'low' | 'medium' | 'high' {
    const content_lower = content.toLowerCase();
    
    if (content_lower.includes('error') || content_lower.includes('critical') || content_lower.includes('security')) {
      return 'high';
    } else if (content_lower.includes('warning') || content_lower.includes('performance') || content_lower.includes('todo')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Test tool functionality with sample operations
   */
  async testTools(capabilities: ToolCapabilities): Promise<{
    ast_grep_working: boolean;
    ripgrep_working: boolean;
    test_results: string[];
  }> {
    const results: string[] = [];
    let astGrepWorking = false;
    let ripgrepWorking = false;

    // Test ast-grep with simple pattern
    if (capabilities.ast_grep.available) {
      try {
        await execFileAsync('ast-grep', ['-p', 'console.log($MSG)', '--stats-only']);
        astGrepWorking = true;
        results.push('✅ ast-grep pattern matching works');
      } catch (error) {
        results.push(`❌ ast-grep test failed: ${error}`);
      }
    }

    // Test ripgrep with JSON output
    if (capabilities.ripgrep.available && capabilities.ripgrep.supports_json) {
      try {
        await execFileAsync('rg', ['--json', '--max-count=1', 'test', '.']);
        ripgrepWorking = true;
        results.push('✅ ripgrep JSON output works');
      } catch (error) {
        results.push(`❌ ripgrep test failed: ${error}`);
      }
    }

    return {
      ast_grep_working: astGrepWorking,
      ripgrep_working: ripgrepWorking,
      test_results: results
    };
  }
}