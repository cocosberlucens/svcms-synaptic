/**
 * Layered Configuration Loader for SVCMS Synaptic MCP Server
 * 
 * Loads and merges global (~/.synaptic/config.toml) and project (./.synaptic/config.toml) 
 * configurations with intelligent defaults and validation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as toml from '@iarna/toml';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import type { 
  SvcmsConfig, 
  GlobalConfig, 
  ProjectConfig,
  ToolsConfig,
  AstGrepConfig,
  RipgrepConfig 
} from '../types.js';

// Zod schemas for validation
const DiffPatternSchema = z.object({
  pattern: z.string(),
  significance: z.enum(['low', 'medium', 'high'])
});

const AstGrepConfigSchema = z.object({
  enabled: z.boolean().default(true),
  default_lang: z.string().default('typescript'),
  analyze_diffs: z.boolean().default(true),
  extract_patterns: z.boolean().default(true),
  diff_patterns: z.array(DiffPatternSchema).default([])
});

const RipgrepConfigSchema = z.object({
  enabled: z.boolean().default(true),
  extra_args: z.array(z.string()).default(['--json', '--max-columns=200']),
  ignore_patterns: z.array(z.string()).default(['node_modules', '.git', 'dist']),
  context_lines: z.number().default(2)
});

const ToolsConfigSchema = z.object({
  useful_bash_tools: z.array(z.string()).default(['ast-grep', 'rg', 'fd', 'delta']),
  integration: z.object({
    diff_analysis: z.boolean().default(true),
    query_enhancement: z.boolean().default(true),
    context_optimization: z.boolean().default(true),
    auto_install_missing: z.boolean().default(false)
  }).default({}),
  ast_grep: AstGrepConfigSchema.optional(),
  ripgrep: RipgrepConfigSchema.optional(),
  custom: z.record(z.object({
    path: z.string(),
    args: z.array(z.string()).default([]),
    output_format: z.enum(['json', 'text']).default('json'),
    description: z.string()
  })).default({})
});

const GlobalConfigSchema = z.object({
  svcms: z.object({
    use_compressed_format: z.boolean().default(true),
    auto_suggest_commits: z.boolean().default(true),
    include_diff_summaries: z.boolean().default(true),
    custom_categories: z.array(z.string()).optional()
  }).default({}),
  obsidian: z.object({
    vault_path: z.string(),
    project_name: z.string().optional(),
    use_dataview: z.boolean().default(true),
    auto_generate_queries: z.boolean().default(true)
  }).optional(),
  git: z.object({
    diff_context_lines: z.number().default(3),
    include_file_moves: z.boolean().default(true),
    summarize_large_diffs: z.boolean().default(true)
  }).default({}),
  ai_workflow: z.object({
    instruction_style: z.enum(['concise', 'detailed']).default('concise'),
    reminder_frequency: z.enum(['always', 'periodic']).default('always')
  }).default({}),
  tools: ToolsConfigSchema.default({})
});

const ProjectPatternSchema = z.object({
  pattern: z.string(),
  significance: z.enum(['low', 'medium', 'high']),
  commit_hint: z.string().optional(),
  description: z.string().optional()
});

const ProjectAstGrepSchema = z.object({
  enabled: z.boolean().default(true),
  default_lang: z.string().optional(),
  rules_directory: z.string().default('./ast'),
  custom_grammars_dir: z.string().default('./.tree-sitter'),
  project_patterns: z.array(ProjectPatternSchema).default([]),
  commit_analysis: z.object({
    error_patterns: z.array(z.string()).default([]),
    auth_patterns: z.array(z.string()).default([]),
    api_patterns: z.array(z.string()).default([]),
    ui_patterns: z.array(z.string()).default([])
  }).default({})
}).optional();

const ProjectConfigSchema = z.object({
  project: z.object({
    name: z.string()
  }),
  svcms: z.object({
    use_compressed_format: z.boolean(),
    auto_suggest_commits: z.boolean(),
    include_diff_summaries: z.boolean(),
    custom_categories: z.array(z.string())
  }).partial().optional(),
  commit_defaults: z.record(z.object({
    scope: z.string(),
    category: z.string()
  })).optional(),
  code_awareness: z.object({
    important_patterns: z.array(z.string()).default([])
  }).optional(),
  tools: z.object({
    ast_grep: ProjectAstGrepSchema
  }).optional()
});

export class ConfigLoader {
  private static readonly GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.synaptic', 'config.toml');
  private static readonly PROJECT_CONFIG_PATH = '.synaptic/config.toml';

  /**
   * Load and merge layered configuration
   */
  static async load(): Promise<SvcmsConfig> {
    logger.debug('Loading layered configuration...');
    
    // Load global config with defaults
    const globalConfig = await this.loadGlobalConfig();
    
    // Load project config (optional)
    const projectConfig = await this.loadProjectConfig();
    
    // Merge configurations
    const mergedConfig: SvcmsConfig = {
      global: globalConfig,
      project: projectConfig
    };
    
    logger.info('✅ Configuration loaded successfully');
    logger.debug('Merged config:', JSON.stringify(mergedConfig, null, 2));
    
    return mergedConfig;
  }

  /**
   * Load global configuration from ~/.synaptic/config.toml
   */
  private static async loadGlobalConfig(): Promise<GlobalConfig> {
    try {
      logger.debug(`Loading global config from: ${this.GLOBAL_CONFIG_PATH}`);
      
      const exists = await this.fileExists(this.GLOBAL_CONFIG_PATH);
      if (!exists) {
        logger.warn('Global config not found, using defaults');
        return this.getDefaultGlobalConfig();
      }
      
      const content = await fs.readFile(this.GLOBAL_CONFIG_PATH, 'utf-8');
      const parsed = toml.parse(content);
      
      // Validate and apply defaults
      const validated = GlobalConfigSchema.parse(parsed);
      
      logger.debug('Global config loaded successfully');
      return validated;
      
    } catch (error) {
      logger.warn(`Failed to load global config: ${error}. Using defaults.`);
      return this.getDefaultGlobalConfig();
    }
  }

  /**
   * Load project configuration from ./.synaptic/config.toml
   */
  private static async loadProjectConfig(): Promise<ProjectConfig | undefined> {
    try {
      logger.debug(`Loading project config from: ${this.PROJECT_CONFIG_PATH}`);
      
      const exists = await this.fileExists(this.PROJECT_CONFIG_PATH);
      if (!exists) {
        logger.debug('Project config not found (optional)');
        return undefined;
      }
      
      const content = await fs.readFile(this.PROJECT_CONFIG_PATH, 'utf-8');
      const parsed = toml.parse(content);
      
      // Validate project config
      const validated = ProjectConfigSchema.parse(parsed);
      
      logger.debug('Project config loaded successfully');
      return validated;
      
    } catch (error) {
      logger.warn(`Failed to load project config: ${error}. Continuing without it.`);
      return undefined;
    }
  }

  /**
   * Check if file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get default global configuration
   */
  private static getDefaultGlobalConfig(): GlobalConfig {
    return GlobalConfigSchema.parse({});
  }

  /**
   * Create initial global configuration file
   */
  static async initGlobalConfig(options: { vault_path?: string } = {}): Promise<void> {
    const configDir = path.dirname(this.GLOBAL_CONFIG_PATH);
    
    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });
    
    const defaultConfig = {
      svcms: {
        use_compressed_format: true,
        auto_suggest_commits: true,
        include_diff_summaries: true
      },
      ...(options.vault_path && {
        obsidian: {
          vault_path: options.vault_path,
          use_dataview: true,
          auto_generate_queries: true
        }
      }),
      git: {
        diff_context_lines: 3,
        include_file_moves: true,
        summarize_large_diffs: true
      },
      ai_workflow: {
        instruction_style: 'concise',
        reminder_frequency: 'always'
      },
      tools: {
        useful_bash_tools: ['ast-grep', 'rg', 'fd', 'delta', 'jq'],
        integration: {
          diff_analysis: true,
          query_enhancement: true,
          context_optimization: true,
          auto_install_missing: false
        },
        ast_grep: {
          enabled: true,
          default_lang: 'typescript',
          analyze_diffs: true,
          extract_patterns: true,
          diff_patterns: [
            { pattern: 'console.log($MSG)', significance: 'low' },
            { pattern: 'throw new Error($MSG)', significance: 'high' },
            { pattern: '// TODO: $COMMENT', significance: 'medium' }
          ]
        },
        ripgrep: {
          enabled: true,
          extra_args: ['--json', '--max-columns=200', '--max-count=50'],
          ignore_patterns: ['node_modules', '.git', 'dist', 'build', 'coverage'],
          context_lines: 2
        }
      }
    };
    
    const tomlContent = toml.stringify(defaultConfig);
    await fs.writeFile(this.GLOBAL_CONFIG_PATH, tomlContent);
    
    logger.info(`✅ Global configuration created at: ${this.GLOBAL_CONFIG_PATH}`);
  }

  /**
   * Create initial project configuration file
   */
  static async initProjectConfig(projectName: string): Promise<void> {
    const configDir = path.dirname(this.PROJECT_CONFIG_PATH);
    
    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });
    
    const defaultConfig = {
      project: {
        name: projectName
      },
      commit_defaults: {
        'src/api/*': { scope: 'api', category: 'standard' },
        'src/auth/*': { scope: 'auth', category: 'knowledge' },
        'src/ui/*': { scope: 'ui', category: 'standard' },
        'src/tools/*': { scope: 'tools', category: 'knowledge' },
        'src/config/*': { scope: 'config', category: 'standard' }
      },
      code_awareness: {
        important_patterns: [
          'TODO',
          'FIXME',
          'Memory:',
          '@deprecated',
          'HACK',
          'NOTE'
        ]
      },
      tools: {
        ast_grep: {
          enabled: true,
          rules_directory: './ast',
          custom_grammars_dir: './.tree-sitter',
          project_patterns: [
            {
              pattern: 'useAuth($HOOK)',
              significance: 'high',
              commit_hint: 'auth',
              description: 'Authentication hook usage'
            },
            {
              pattern: 'router.push($PATH)',
              significance: 'medium',
              commit_hint: 'navigation',
              description: 'Navigation changes'
            },
            {
              pattern: 'fetch($URL)',
              significance: 'medium',
              commit_hint: 'api',
              description: 'API calls'
            },
            {
              pattern: 'useState($STATE)',
              significance: 'low',
              commit_hint: 'ui',
              description: 'React state usage'
            }
          ],
          commit_analysis: {
            error_patterns: [
              'throw new Error($MSG)',
              'console.error($MSG)',
              'logger.error($MSG)',
              'reject($REASON)'
            ],
            auth_patterns: [
              'jwt.sign($PAYLOAD)',
              'passport.authenticate($STRATEGY)',
              'bcrypt.hash($PASSWORD)',
              'verifyToken($TOKEN)'
            ],
            api_patterns: [
              'app.get($PATH, $HANDLER)',
              'app.post($PATH, $HANDLER)',
              'express.Router()',
              'axios.get($URL)'
            ],
            ui_patterns: [
              'React.useState($INITIAL)',
              'useEffect($EFFECT)',
              'component.render()',
              'styled.div`$STYLES`'
            ]
          }
        }
      }
    };
    
    const tomlContent = toml.stringify(defaultConfig);
    await fs.writeFile(this.PROJECT_CONFIG_PATH, tomlContent);
    
    logger.info(`✅ Project configuration created at: ${this.PROJECT_CONFIG_PATH}`);
    logger.info(`💡 Consider adding custom ast-grep rules to ./ast/ directory`);
    logger.info(`💡 Custom tree-sitter grammars can be placed in ./.tree-sitter/ directory`);
  }
}