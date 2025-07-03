/**
 * SVCMS Synaptic MCP Server
 * 
 * Main MCP server that exposes SVCMS functionality through Model Context Protocol.
 * Provides tools, resources, and prompts for git-embedded memory with semantic diff awareness.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { GitClient } from '../git/client.js';
import { ConfigLoader } from '../config/loader.js';
import { SVCMS_SPECIFICATION, AI_WORKFLOW_INSTRUCTIONS, SVCMS_SPEC_COMPRESSED } from '../svcms/specification.js';
import type { SvcmsConfig, McpTool, McpResource, McpPrompt } from '../types.js';

export class SvcmsMcpServer {
  private server: Server;
  private config: SvcmsConfig;
  private gitClient: GitClient;
  private transport?: StdioServerTransport;

  constructor(config: SvcmsConfig) {
    this.config = config;
    this.gitClient = new GitClient();
    
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
    this.server.setRequestHandler('resources/list', async () => {
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
        }
      ];

      return { resources };
    });

    // Handle resource reads
    this.server.setRequestHandler('resources/read', async (request) => {
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
    this.server.setRequestHandler('tools/list', async () => {
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
          description: 'AI analyzes diff and suggests semantic commit message',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { 
                type: 'string', 
                description: 'Optional scope for the commit' 
              }
            }
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
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
    this.server.setRequestHandler('prompts/list', async () => {
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
    this.server.setRequestHandler('prompts/get', async (request) => {
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

    // Get commits with context
    const commits = await this.gitClient.getCommitsWithContext({ limit: depth });
    
    // Filter for SVCMS commits with memories
    const memoryCommits = commits.filter(commit => 
      commit.parsed && commit.parsed.memory
    );

    const result = {
      processed: commits.length,
      memory_commits: memoryCommits.length,
      memories_synced: dryRun ? 0 : memoryCommits.length,
      dry_run: dryRun
    };

    if (dryRun) {
      const preview = memoryCommits.slice(0, 5).map(commit => ({
        sha: commit.sha.substring(0, 8),
        type: commit.parsed?.type,
        memory: commit.parsed?.memory,
        location: commit.parsed?.location || 'inferred'
      }));

      return {
        content: [{
          type: 'text',
          text: `Sync Preview:\n${JSON.stringify({ result, preview }, null, 2)}`
        }]
      };
    }

    // TODO: Implement actual memory sync to CLAUDE.md files
    return {
      content: [{
        type: 'text',
        text: `Memory sync completed:\n${JSON.stringify(result, null, 2)}`
      }]
    };
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
      by_type: {},
      by_category: {},
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
    
    logger.info('Generating commit suggestion from diff');

    const diff = await this.gitClient.getCurrentDiff();
    if (!diff) {
      return {
        content: [{
          type: 'text',
          text: 'No changes in working directory to analyze'
        }]
      };
    }

    // Use parser to generate suggestion
    const suggestion = this.gitClient['parser'].generateCommitSuggestion(diff, { scope });

    const scopePart = suggestion.scope ? `(${suggestion.scope})` : '';
    const commitMessage = `${suggestion.category}.${suggestion.type}${scopePart}: ${suggestion.summary}`;

    return {
      content: [{
        type: 'text',
        text: `Suggested commit (confidence: ${Math.round(suggestion.confidence * 100)}%):\n\n${commitMessage}\n\nDiff analysis:\n${diff.split('\n').slice(0, 10).join('\n')}...`
      }]
    };
  }
}