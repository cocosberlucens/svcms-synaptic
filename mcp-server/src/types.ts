/**
 * Core TypeScript types for SVCMS Synaptic MCP Server
 */

// SVCMS Commit Structure
export interface SvcmsCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  diff: string;
  parsed?: ParsedSvcmsCommit;
}

export interface ParsedSvcmsCommit {
  category?: string;
  type: string;
  scope?: string;
  summary: string;
  body?: string;
  context?: string;
  refs?: string[];
  memory?: string;
  location?: string;
  tags?: string[];
}

// Configuration Types
export interface SvcmsConfig {
  global: GlobalConfig;
  project?: ProjectConfig;
}

export interface GlobalConfig {
  svcms: SvcmsSettings;
  obsidian?: ObsidianConfig;
  git: GitConfig;
  ai_workflow: AiWorkflowConfig;
  tools: ToolsConfig;
}

export interface ProjectConfig {
  project: ProjectSettings;
  svcms?: Partial<SvcmsSettings>;
  commit_defaults?: Record<string, CommitDefault>;
  code_awareness?: CodeAwarenessConfig;
}

export interface SvcmsSettings {
  use_compressed_format: boolean;
  auto_suggest_commits: boolean;
  include_diff_summaries: boolean;
  custom_categories?: string[];
}

export interface ObsidianConfig {
  vault_path: string;
  project_name?: string;
  use_dataview: boolean;
  auto_generate_queries: boolean;
}

export interface GitConfig {
  diff_context_lines: number;
  include_file_moves: boolean;
  summarize_large_diffs: boolean;
}

export interface AiWorkflowConfig {
  instruction_style: 'concise' | 'detailed';
  reminder_frequency: 'always' | 'periodic';
}

export interface ToolsConfig {
  useful_bash_tools: string[];
  integration: ToolIntegrationConfig;
  ast_grep?: AstGrepConfig;
  ripgrep?: RipgrepConfig;
  custom?: Record<string, CustomToolConfig>;
}

export interface ToolIntegrationConfig {
  diff_analysis: boolean;
  query_enhancement: boolean;
  context_optimization: boolean;
  auto_install_missing: boolean;
}

export interface AstGrepConfig {
  enabled: boolean;
  default_lang: string;
  analyze_diffs: boolean;
  extract_patterns: boolean;
  diff_patterns: DiffPattern[];
}

export interface DiffPattern {
  pattern: string;
  significance: 'low' | 'medium' | 'high';
}

export interface RipgrepConfig {
  enabled: boolean;
  extra_args: string[];
  ignore_patterns: string[];
  context_lines: number;
}

export interface CustomToolConfig {
  path: string;
  args: string[];
  output_format: 'json' | 'text';
  description: string;
}

export interface ProjectSettings {
  name: string;
}

export interface CommitDefault {
  scope: string;
  category: string;
}

export interface CodeAwarenessConfig {
  important_patterns: string[];
}

// Tool Integration Types
export interface ToolResult {
  tool: string;
  success: boolean;
  output: any;
  error?: string;
  execution_time_ms: number;
}

export interface AstGrepResult {
  file: string;
  matches: AstGrepMatch[];
}

export interface AstGrepMatch {
  text: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  metavariables?: Record<string, string>;
}

// Memory Types
export interface Memory {
  content: string;
  source_commit: string;
  tags: string[];
  location: string;
  created_at: Date;
}

// MCP Types
export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments?: any[];
}