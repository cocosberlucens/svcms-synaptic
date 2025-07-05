/**
 * SVCMS Synaptic MCP Server
 * 
 * Main MCP server that exposes SVCMS functionality through Model Context Protocol.
 * Provides tools, resources, and prompts for git-embedded memory with semantic diff awareness.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { GitClient } from '../git/client.js';
import { ConfigLoader } from '../config/loader.js';
import { ToolDetector } from '../tools/detector.js';
import { CodeAnalyzer } from '../tools/analyzer.js';
import { MemoryManager } from '../memory/manager.js';
import { SVCMS_SPECIFICATION, AI_WORKFLOW_INSTRUCTIONS, SVCMS_SPEC_COMPRESSED } from '../svcms/specification.js';
import type { SvcmsConfig, McpTool, McpResource, McpPrompt, ToolCapabilities } from '../types.js';

export class SvcmsMcpServer {
  private server: Server;
  private config: SvcmsConfig;
  private gitClient: GitClient;
  private toolDetector: ToolDetector;
  private codeAnalyzer?: CodeAnalyzer;
  private memoryManager: MemoryManager;
  private toolCapabilities?: ToolCapabilities;
  private transport?: StdioServerTransport;

  constructor(config: SvcmsConfig) {
    this.config = config;
    this.gitClient = new GitClient();
    this.toolDetector = new ToolDetector();
    this.memoryManager = new MemoryManager(config);
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'svcms-synaptic-mcp',
        version: '0.1.0'
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        }
      }
    );

    this.setupHandlers();
    logger.info('SVCMS Synaptic MCP Server initialized');
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      // Check if we're in a git repository
      const isRepo = await this.gitClient.isRepository();
      if (!isRepo) {
        logger.warn('Not in a git repository - some features may be limited');
      }

      // Detect external tools capabilities
      logger.info('🔍 Detecting external tool capabilities...');
      this.toolCapabilities = await this.toolDetector.detectAll();

      // Initialize code analyzer if tools are available
      if (this.toolCapabilities.ast_grep.available || this.toolCapabilities.ripgrep.available) {
        this.codeAnalyzer = new CodeAnalyzer(this.toolCapabilities, this.config);
        logger.info('✅ Code analyzer initialized with external tools');
      } else {
        logger.warn('⚠️  No external tools available - commit suggestions will be basic');
      }

      // Create and connect transport
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);
      
      logger.info('🚀 SVCMS Synaptic MCP Server started');
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    try {
      if (this.transport) {
        await this.server.close();
        logger.info('SVCMS Synaptic MCP Server stopped');
      }
    } catch (error) {
      logger.error('Error stopping MCP server:', error);
      throw error;
    }
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.setupPromptHandlers();
  }

  /**
   * Setup resource handlers (static content)
   */
  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: McpResource[] = [
        {
          uri: 'svcms://specification',
          name: 'SVCMS Specification (Optimized)',
          description: 'Complete SVCMS specification in AI-optimized format',
          mimeType: 'application/json'
        },
        {
          uri: 'svcms://workflow-guide', 
          name: 'AI Development Workflow',
          description: 'Instructions for leveraging git-embedded memory',
          mimeType: 'text/markdown'
        },
        {
          uri: 'svcms://current-diff',
          name: 'Current Working Directory Diff',
          description: 'Real-time code changes in working directory',
          mimeType: 'text/plain'
        },
        {
          uri: 'svcms://config',
          name: 'Current Configuration',
          description: 'Merged global and project configuration',
          mimeType: 'application/json'
        },
        {
          uri: 'svcms://tool-capabilities',
          name: 'External Tool Capabilities',
          description: 'Detected ast-grep, ripgrep and custom tool capabilities',
          mimeType: 'application/json'
        }
      ];

      return { resources };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'svcms://specification':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(SVCMS_SPECIFICATION, null, 2)
            }]
          };

        case 'svcms://workflow-guide':
          return {
            contents: [{
              uri,
              mimeType: 'text/markdown', 
              text: AI_WORKFLOW_INSTRUCTIONS
            }]
          };

        case 'svcms://current-diff':
          try {
            const diff = await this.gitClient.getCurrentDiff();
            return {
              contents: [{
                uri,
                mimeType: 'text/plain',
                text: diff || 'No changes in working directory'
              }]
            };
          } catch (error) {
            return {
              contents: [{
                uri,
                mimeType: 'text/plain',
                text: `Error getting diff: ${error}`
              }]
            };
          }

        case 'svcms://config':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.config, null, 2)
            }]
          };

        case 'svcms://tool-capabilities':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.toolCapabilities || {}, null, 2)
            }]
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  /**
   * Setup tool handlers (executable functions)
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: McpTool[] = [
        {
          name: 'svcms_sync',
          description: 'Sync SVCMS memories to CLAUDE.md files',
          inputSchema: {
            type: 'object',
            properties: {
              depth: { 
                type: 'number', 
                description: 'Number of commits to process',
                default: 100 
              },
              dry_run: { 
                type: 'boolean', 
                description: 'Preview changes without writing',
                default: false 
              }
            }
          }
        },
        {
          name: 'svcms_query',
          description: 'Query SVCMS commits with full diff context',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { 
                type: 'string', 
                description: 'Search pattern for commits' 
              },
              include_code: { 
                type: 'boolean', 
                description: 'Include code diff in search',
                default: true 
              },
              max_results: { 
                type: 'number', 
                description: 'Maximum number of results',
                default: 10 
              }
            },
            required: ['pattern']
          }
        },
        {
          name: 'svcms_stats',
          description: 'Show SVCMS commit statistics and patterns',
          inputSchema: {
            type: 'object',
            properties: {
              period: { 
                type: 'string', 
                description: 'Time period for stats (e.g., "30 days")',
                default: '30 days' 
              }
            }
          }
        },
        {
          name: 'svcms_suggest_commit',
          description: 'AI analyzes diff and suggests semantic commit message with ast-grep patterns',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { 
                type: 'string', 
                description: 'Optional scope for the commit' 
              },
              hint: {
                type: 'string',
                description: 'Optional hint about the nature of changes'
              }
            }
          }
        },
        {
          name: 'svcms_analyze_structural',
          description: 'Deep structural analysis of code changes using ast-grep',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Path to file for structural analysis'
              },
              pattern: {
                type: 'string',
                description: 'Optional specific ast-grep pattern to analyze'
              }
            }
          }
        },
        {
          name: 'svcms_test_tools',
          description: 'Test external tool functionality and report capabilities',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'svcms_memory_stats',
          description: 'Analyze memory statistics and quality across commits',
          inputSchema: {
            type: 'object',
            properties: {
              depth: {
                type: 'number',
                description: 'Number of commits to analyze',
                default: 200
              },
              since: {
                type: 'string',
                description: 'Analyze commits since date (YYYY-MM-DD)'
              }
            }
          }
        },
        {
          name: 'svcms_search_memories',
          description: 'Search memories by pattern with filtering options',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Search pattern for memory content'
              },
              scope: {
                type: 'string',
                description: 'Filter by specific scope (e.g., auth, api)'
              },
              category: {
                type: 'string',
                description: 'Filter by category (knowledge, standard, etc.)'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 10
              }
            },
            required: ['pattern']
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'svcms_sync':
            return await this.handleSyncTool(args);
            
          case 'svcms_query':
            return await this.handleQueryTool(args);
            
          case 'svcms_stats':
            return await this.handleStatsTool(args);
            
          case 'svcms_suggest_commit':
            return await this.handleSuggestCommitTool(args);

          case 'svcms_analyze_structural':
            return await this.handleStructuralAnalysisTool(args);

          case 'svcms_test_tools':
            return await this.handleTestToolsTool(args);

          case 'svcms_memory_stats':
            return await this.handleMemoryStatsTool(args);

          case 'svcms_search_memories':
            return await this.handleSearchMemoriesTool(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool ${name} error:`, error);
        return {
          content: [{
            type: 'text',
            text: `Error executing ${name}: ${error}`
          }]
        };
      }
    });
  }

  /**
   * Setup prompt handlers (templates)
   */
  private setupPromptHandlers(): void {
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts: McpPrompt[] = [
        {
          name: 'analyze-changes',
          description: 'Analyze current diff and suggest SVCMS commit'
        },
        {
          name: 'find-similar-changes',
          description: 'Find similar past changes with learnings',
          arguments: [
            {
              name: 'pattern',
              description: 'Code pattern to search for',
              required: true
            }
          ]
        },
        {
          name: 'design-decision',
          description: 'Document design decision with empty commit'
        }
      ];

      return { prompts };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'analyze-changes':
          const diff = await this.gitClient.getCurrentDiff();
          return {
            description: 'Analyze current changes and suggest semantic commit',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Analyze these changes and suggest an SVCMS commit:\n\n${diff}`
              }
            }]
          };

        case 'find-similar-changes':
          const pattern = args?.pattern || '';
          return {
            description: `Find similar changes for pattern: ${pattern}`,
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Search for similar changes with pattern "${pattern}" and show learnings from past commits.`
              }
            }]
          };

        case 'design-decision':
          return {
            description: 'Document a design decision',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: 'Help me document this design decision as an empty SVCMS commit with proper rationale and memory field.'
              }
            }]
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  /**
   * Handle sync tool execution
   */
  private async handleSyncTool(args: any) {
    const depth = args?.depth || 100;
    const dryRun = args?.dry_run || false;

    logger.info(`Syncing memories (depth: ${depth}, dry_run: ${dryRun})`);

    try {
      // Use memory manager for real sync operations
      const report = await this.memoryManager.syncMemories({
        config: this.config,
        options: {
          depth,
          dry_run: dryRun,
          backup: true, // Always create backups for safety
          max_memories_per_file: 100 // Reasonable limit
        }
      });

      // Format comprehensive response
      const response = {
        operation: dryRun ? 'Preview' : 'Sync Completed',
        summary: {
          commits_processed: report.commits_processed,
          memories_extracted: report.memories_extracted,
          memories_synced: report.memories_synced,
          memories_skipped: report.memories_skipped,
          files_created: report.files_created,
          files_updated: report.files_updated
        },
        statistics: report.memory_stats,
        preview: report.preview,
        errors: report.errors,
        warnings: report.warnings
      };

      // Add detailed preview for dry runs
      if (dryRun && report.preview) {
        response.preview = {
          ...report.preview,
          files_to_create: report.preview.files_to_create,
          files_to_update: report.preview.files_to_update,
          sample_memories: report.preview.sample_memories
        };
      }

      return {
        content: [{
          type: 'text',
          text: `SVCMS Memory Sync ${dryRun ? 'Preview' : 'Results'}:\n\n${JSON.stringify(response, null, 2)}`
        }]
      };

    } catch (error) {
      logger.error('Memory sync failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory sync failed: ${error}\n\nPlease check the logs for more details.`
        }]
      };
    }
  }

  /**
   * Handle query tool execution
   */
  private async handleQueryTool(args: any) {
    const pattern = args?.pattern;
    const includeCode = args?.include_code !== false;
    const maxResults = args?.max_results || 10;

    logger.info(`Querying commits with pattern: ${pattern}`);

    const commits = await this.gitClient.searchCommitsWithContext(pattern, {
      includeCode,
      maxResults
    });

    const results = commits.map(commit => ({
      sha: commit.sha.substring(0, 8),
      message: commit.message.split('\n')[0],
      author: commit.author.name,
      date: commit.author.date.toISOString().split('T')[0],
      parsed: commit.parsed,
      diff_summary: commit.diff.split('\n').length + ' lines'
    }));

    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} matching commits:\n${JSON.stringify(results, null, 2)}`
      }]
    };
  }

  /**
   * Handle stats tool execution
   */
  private async handleStatsTool(args: any) {
    const period = args?.period || '30 days';
    
    logger.info(`Generating stats for period: ${period}`);

    const commits = await this.gitClient.getCommitsWithContext({ limit: 200 });
    
    const stats = {
      total_commits: commits.length,
      svcms_commits: commits.filter(c => c.parsed).length,
      by_type: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
      memory_commits: commits.filter(c => c.parsed?.memory).length
    };

    // Calculate type distribution
    commits.forEach(commit => {
      if (commit.parsed?.type) {
        stats.by_type[commit.parsed.type] = (stats.by_type[commit.parsed.type] || 0) + 1;
      }
      if (commit.parsed?.category) {
        stats.by_category[commit.parsed.category] = (stats.by_category[commit.parsed.category] || 0) + 1;
      }
    });

    return {
      content: [{
        type: 'text',
        text: `SVCMS Statistics:\n${JSON.stringify(stats, null, 2)}`
      }]
    };
  }

  /**
   * Handle suggest commit tool execution
   */
  private async handleSuggestCommitTool(args: any) {
    const scope = args?.scope;
    const hint = args?.hint;
    
    logger.info('Generating enhanced commit suggestion from diff');

    const diff = await this.gitClient.getCurrentDiff();
    if (!diff) {
      return {
        content: [{
          type: 'text',
          text: 'No changes in working directory to analyze'
        }]
      };
    }

    if (this.codeAnalyzer) {
      // Use enhanced analyzer with ast-grep patterns
      try {
        const suggestion = await this.codeAnalyzer.analyzeDiffForCommit(diff, { scope, hint });
        
        const scopePart = suggestion.scope ? `(${suggestion.scope})` : '';
        const commitMessage = `${suggestion.category}.${suggestion.type}${scopePart}: ${suggestion.summary}`;

        const response = {
          suggested_commit: commitMessage,
          confidence: Math.round(suggestion.confidence * 100),
          reasoning: suggestion.reasoning,
          detected_patterns: suggestion.detected_patterns,
          analysis: {
            category: suggestion.category,
            type: suggestion.type,
            scope: suggestion.scope
          }
        };

        return {
          content: [{
            type: 'text',
            text: `Enhanced Commit Suggestion:\n\n${JSON.stringify(response, null, 2)}`
          }]
        };

      } catch (error) {
        logger.warn('Enhanced analysis failed, falling back to basic:', error);
      }
    }

    // Fallback to basic suggestion
    const basicSuggestion = this.generateBasicCommitSuggestion(diff, { scope, hint });
    
    return {
      content: [{
        type: 'text',
        text: `Basic commit suggestion:\n\n${basicSuggestion}\n\n💡 Install ast-grep for enhanced pattern analysis`
      }]
    };
  }

  /**
   * Handle structural analysis tool execution
   */
  private async handleStructuralAnalysisTool(args: any) {
    const filePath = args?.file_path;
    const pattern = args?.pattern;

    if (!this.codeAnalyzer || !this.toolCapabilities?.ast_grep.available) {
      return {
        content: [{
          type: 'text',
          text: 'ast-grep not available for structural analysis'
        }]
      };
    }

    if (!filePath) {
      return {
        content: [{
          type: 'text',
          text: 'file_path parameter is required for structural analysis'
        }]
      };
    }

    try {
      const results = await this.codeAnalyzer.analyzeStructuralPatterns(filePath);
      
      return {
        content: [{
          type: 'text',
          text: `Structural analysis for ${filePath}:\n\n${JSON.stringify(results, null, 2)}`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to analyze ${filePath}: ${error}`
        }]
      };
    }
  }

  /**
   * Handle test tools functionality
   */
  private async handleTestToolsTool(args: any) {
    if (!this.toolCapabilities) {
      return {
        content: [{
          type: 'text',
          text: 'Tool capabilities not detected yet'
        }]
      };
    }

    try {
      const testResults = await this.toolDetector.testTools(this.toolCapabilities);
      
      const report = {
        tool_capabilities: this.toolCapabilities,
        test_results: testResults,
        recommendations: this.generateToolRecommendations()
      };

      return {
        content: [{
          type: 'text',
          text: `Tool Functionality Test:\n\n${JSON.stringify(report, null, 2)}`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Tool testing failed: ${error}`
        }]
      };
    }
  }

  /**
   * Generate basic commit suggestion fallback
   */
  private generateBasicCommitSuggestion(diff: string, options: { scope?: string; hint?: string }): string {
    const lines = diff.split('\n');
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    let type = 'chore';
    if (diff.includes('new file mode')) type = 'feat';
    else if (diff.includes('deleted file mode')) type = 'refactor';
    else if (additions > deletions) type = 'feat';
    else if (deletions > additions) type = 'refactor';

    const scope = options.scope || options.hint || '';
    const scopePart = scope ? `(${scope})` : '';
    
    return `standard.${type}${scopePart}: update implementation`;
  }

  /**
   * Generate tool recommendations based on capabilities
   */
  private generateToolRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.toolCapabilities?.ast_grep.available) {
      recommendations.push('Install ast-grep for enhanced structural code analysis');
      recommendations.push('Consider adding custom ast-grep rules in ./ast/ directory');
    }

    if (!this.toolCapabilities?.ripgrep.available) {
      recommendations.push('Install ripgrep for fast content search across large codebases');
    }

    if (this.toolCapabilities?.ast_grep.custom_rules.length === 0) {
      recommendations.push('Add project-specific ast-grep rules for better commit suggestions');
    }

    if (this.toolCapabilities?.ast_grep.custom_grammars.length === 0) {
      recommendations.push('Consider adding custom tree-sitter grammars for specialized languages');
    }

    return recommendations;
  }

  /**
   * Handle memory stats tool execution
   */
  private async handleMemoryStatsTool(args: any) {
    const depth = args?.depth || 200;
    const since = args?.since;

    logger.info(`Analyzing memory statistics (depth: ${depth}, since: ${since})`);

    try {
      const stats = await this.memoryManager.getMemoryStats({
        depth,
        since
      });

      const response = {
        analysis: {
          commits_analyzed: stats.commits_analyzed,
          memories_found: stats.memories_found,
          memory_density: Math.round((stats.memories_found / stats.commits_analyzed) * 100) + '%'
        },
        distribution: stats.stats,
        quality_issues: {
          total_issues: stats.validation_issues.length,
          issues: stats.validation_issues.slice(0, 10) // First 10 issues
        },
        recommendations: await this.generateStatsRecommendations(stats)
      };

      return {
        content: [{
          type: 'text',
          text: `Memory Statistics Analysis:\n\n${JSON.stringify(response, null, 2)}`
        }]
      };

    } catch (error) {
      logger.error('Memory stats analysis failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory stats analysis failed: ${error}`
        }]
      };
    }
  }

  /**
   * Handle search memories tool execution
   */
  private async handleSearchMemoriesTool(args: any) {
    const pattern = args?.pattern;
    const scope = args?.scope;
    const category = args?.category;
    const limit = args?.limit || 10;

    if (!pattern) {
      return {
        content: [{
          type: 'text',
          text: 'Pattern parameter is required for memory search'
        }]
      };
    }

    logger.info(`Searching memories for pattern: ${pattern}`);

    try {
      const memories = await this.memoryManager.searchMemories(pattern, {
        scope,
        category,
        limit
      });

      const results = memories.map(memory => ({
        content: memory.content,
        commit: memory.commit_sha.substring(0, 8),
        date: memory.commit_date.toISOString().split('T')[0],
        author: memory.author,
        scope: memory.scope,
        category: memory.category,
        type: memory.type,
        location: memory.location,
        tags: memory.tags
      }));

      const response = {
        search: {
          pattern,
          filters: { scope, category },
          results_found: results.length,
          showing: Math.min(results.length, limit)
        },
        memories: results
      };

      return {
        content: [{
          type: 'text',
          text: `Memory Search Results:\n\n${JSON.stringify(response, null, 2)}`
        }]
      };

    } catch (error) {
      logger.error('Memory search failed:', error);
      return {
        content: [{
          type: 'text',
          text: `Memory search failed: ${error}`
        }]
      };
    }
  }

  /**
   * Generate recommendations based on memory stats
   */
  private async generateStatsRecommendations(stats: any): Promise<string[]> {
    const recommendations: string[] = [];

    // Memory density recommendations
    const density = (stats.memories_found / stats.commits_analyzed) * 100;
    
    if (density < 20) {
      recommendations.push('Consider adding more Memory: fields to commits for better knowledge capture');
      recommendations.push('Focus on learning-oriented commits (knowledge.learned, knowledge.insight)');
    } else if (density > 80) {
      recommendations.push('High memory density detected - ensure memories are meaningful, not verbose');
    }

    // Distribution analysis
    const locationCount = Object.keys(stats.stats.by_location).length;
    if (locationCount === 1) {
      recommendations.push('Memories are all going to one location - consider using specific scopes');
      recommendations.push('Use explicit Location: fields for better organization');
    }

    // Quality issues
    if (stats.validation_issues.length > stats.memories_found * 0.3) {
      recommendations.push('Many memory quality issues detected - focus on more specific insights');
      recommendations.push('Aim for 50-200 character memory entries with concrete details');
    }

    // Category diversity
    const categoryCount = Object.keys(stats.stats.by_category).length;
    if (categoryCount <= 1) {
      recommendations.push('Consider using different SVCMS categories: knowledge, collaboration, meta');
    }

    return recommendations;
  }
}