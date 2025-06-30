# SVCMS and Synaptic as an MCP Server

## Executive Summary

SVCMS (Semantic Version Control Memory System) revolutionizes AI-assisted development by embedding memory directly into the git workflow. Unlike traditional memory tools that operate as external layers, SVCMS leverages git's native diff capabilities to provide **automatic, contextual code awareness** with every commit. This design document outlines the transformation of Synaptic into an MCP (Model Context Protocol) server, making SVCMS a first-class citizen in AI development environments.

## Core Innovation: Git-Embedded Memory with Auto-Diff

### The Fundamental Insight

Traditional AI memory systems suffer from a critical flaw: they're disconnected from code changes. SVCMS solves this by making memory inseparable from version control:

```bash
# Traditional approach: Memory without context
AI: "I remember we discussed authentication"
Developer: "But what changed in the code?"

# SVCMS approach: Memory WITH automatic diff context
git commit -m "knowledge.learned(auth): JWT tokens expire after 24h

Discovered during debugging that our JWT implementation has a hard
24-hour expiry, not the configurable duration we assumed.

Memory: JWT tokens have fixed 24h expiry - plan accordingly
Location: src/auth/CLAUDE.md"

# AI automatically sees BOTH the memory AND the exact code changes
```

### Auto-Diff Advantage

Every SVCMS commit provides:
1. **Semantic Intent**: What you were trying to achieve
2. **Code Changes**: Exact diff of what changed (via git)
3. **Learned Context**: What was discovered or decided
4. **Future Guidance**: Memories for subsequent sessions

This creates a **self-documenting, self-aware development history** that AI can traverse intelligently.

## MCP Server Architecture

### Design Principles

1. **Embedded Specification**: SVCMS spec hardcoded in AI-optimized format
2. **Layered Configuration**: Global + project configs via TOML
3. **Optional Obsidian Integration**: Vault support with dataview.js queries
4. **Workflow-Aware AI**: Instructions embedded at protocol level
5. **External Tool Integration**: Leverage powerful CLI tools for enhanced analysis

### Core Components

```typescript
interface SvcmsMcpServer {
  // Embedded Knowledge Base
  specification: CompressedSvcmsSpec;
  aiWorkflowGuide: OptimizedInstructions;
  
  // Configuration Management
  globalConfig: GlobalConfig;      // ~/.synaptic/config.toml
  projectConfig?: ProjectConfig;   // ./.synaptic/config.toml
  
  // Git Integration (THE KEY DIFFERENTIATOR)
  gitContext: {
    getCurrentDiff(): Promise<string>;
    getCommitWithDiff(sha: string): Promise<CommitWithDiff>;
    searchCommitsWithContext(query: string): Promise<CommitWithDiff[]>;
  };
  
  // Optional Integrations
  obsidianVault?: ObsidianConnection;
}
```

### Exposed MCP Capabilities

#### Tools

```typescript
tools: [
  {
    name: "svcms_commit_with_diff",
    description: "Create SVCMS commit and return full diff context",
    // This is the killer feature - AI sees changes immediately
  },
  {
    name: "svcms_query_with_context",
    description: "Search commits with full code diff context",
    // Not just "what was learned" but "what code changed when we learned it"
  },
  {
    name: "svcms_sync",
    description: "Sync memories to CLAUDE.md with diff summaries"
  },
  {
    name: "svcms_suggest_commit",
    description: "AI analyzes diff and suggests semantic commit message"
  },
  {
    name: "svcms_obsidian_dataview",
    description: "Generate dataview queries for Obsidian visualization"
  }
]
```

#### Resources

```typescript
resources: [
  {
    uri: "svcms://specification",
    name: "SVCMS Specification (Optimized)",
    // Compressed, token-efficient format
  },
  {
    uri: "svcms://workflow-guide",
    name: "AI Development Workflow",
    // How to leverage git-embedded memory
  },
  {
    uri: "svcms://current-diff",
    name: "Current Working Directory Diff",
    // Real-time code changes
  },
  {
    uri: "svcms://recent-learnings",
    name: "Recent Learnings with Diffs",
    // Last N commits with full context
  }
]
```

#### Prompts

```typescript
prompts: [
  {
    name: "analyze-changes",
    description: "Analyze current diff and suggest SVCMS commit"
  },
  {
    name: "find-similar-changes",
    description: "Find similar past changes with learnings"
  },
  {
    name: "design-decision",
    description: "Document design decision with empty commit"
  }
]
```

## Workflow Integration

### Development Flow with Auto-Diff Awareness

1. **AI Sees Changes in Real-Time**
   ```typescript
   // MCP server continuously provides:
   const currentDiff = await git.diff();
   const semanticContext = analyzeDiff(currentDiff);
   ```

2. **Intelligent Commit Suggestions**
   ```typescript
   // Based on diff analysis:
   "You added error handling to auth.ts
    Suggested: standard.fix(auth): handle token expiry edge case"
   ```

3. **Query with Full Context**
   ```typescript
   // When AI queries "how did we handle auth errors before?"
   // It gets: commit message + full diff + extracted memories
   ```

### Example Workflow

```bash
# Developer makes changes
vim src/auth/jwt.ts

# AI analyzes diff automatically via MCP
AI: "I see you've modified the JWT validation. Based on similar past changes
     (3 found), we typically need to update the test suite."

# Developer requests commit
Developer: "Commit this with what I learned"

# AI creates semantic commit with full context
AI: "Created commit: knowledge.learned(auth): JWT validation requires try-catch

Modified validation to handle malformed tokens gracefully.
The jsonwebtoken library throws synchronously for certain malformed inputs,
not just expired tokens.

Memory: Always wrap jwt.verify() in try-catch, not just .catch()
Location: src/auth/CLAUDE.md

Diff: +15 -3 lines in src/auth/jwt.ts"
```

## Configuration Specification

### Global Configuration (~/.synaptic/config.toml)

```toml
[svcms]
# AI-friendly format optimizations
use_compressed_format = true
auto_suggest_commits = true
include_diff_summaries = true

[obsidian]
vault_path = "~/Documents/ObsidianVault"
use_dataview = true
auto_generate_queries = true

[git]
# Auto-diff settings
diff_context_lines = 3
include_file_moves = true
summarize_large_diffs = true

[ai_workflow]
# Embedded instructions preference
instruction_style = "concise"  # or "detailed"
reminder_frequency = "always"  # or "periodic"
```

### Project Configuration (./.synaptic/config.toml)

```toml
[project]
name = "my-awesome-app"

[svcms]
# Project-specific commit types
custom_categories = ["architecture", "performance"]

[commit_defaults]
# Smart defaults based on file patterns
"src/api/*" = { scope = "api", category = "standard" }
"src/auth/*" = { scope = "auth", category = "knowledge" }

[code_awareness]
# Patterns to highlight in diffs
important_patterns = [
  "TODO",
  "FIXME", 
  "Memory:",
  "@deprecated"
]
```

## External Tool Integration: Supercharged Analysis

### The Power of Tool Integration

SVCMS becomes **semantically diff-aware** by integrating powerful CLI tools like ast-grep, ripgrep, and custom analyzers. This transforms simple text-based analysis into deep structural understanding.

### Enhanced Configuration with Tools

#### Global Configuration - Tool Integration

```toml
[tools]
# Essential tools for enhanced analysis
useful_bash_tools = ["ast-grep", "rg", "fd", "delta", "jq"]

[tools.integration]
# How deeply to integrate tools
diff_analysis = true
query_enhancement = true
context_optimization = true
auto_install_missing = false

[tools.ast_grep]
# AST-specific settings for structural analysis
enabled = true
default_lang = "typescript"
analyze_diffs = true
extract_patterns = true
diff_patterns = [
  { pattern = "console.log($MSG)", significance = "low" },
  { pattern = "throw new Error($MSG)", significance = "high" },
  { pattern = "// TODO: $COMMENT", significance = "medium" },
  { pattern = "try { $BODY } catch ($ERR) { $HANDLER }", significance = "high" },
  { pattern = "$FUNC($ARGS) => jwt.$METHOD", significance = "high" },
  { pattern = "setState($UPDATE)", significance = "medium" }
]

[tools.ripgrep]
# Ultra-fast content search
enabled = true
extra_args = ["--json", "--max-columns=200", "--max-count=50"]
ignore_patterns = ["node_modules", ".git", "dist", "build", "coverage"]
context_lines = 2

[tools.custom]
# User's domain-specific tools
awesome_analyzer = { 
  path = "~/.local/bin/code-analyzer",
  args = ["--svcms-mode", "--output=json"],
  output_format = "json",
  description = "Custom code pattern analyzer"
}
security_scanner = {
  path = "semgrep",
  args = ["--config=auto", "--json"],
  output_format = "json",
  description = "Security pattern detection"
}
```

### Tool-Enhanced Workflows

#### 1. Structural Diff Analysis

Instead of simple text diffs, SVCMS uses ast-grep for syntax-aware analysis:

```bash
# Traditional diff
git diff HEAD~1
# + console.log("Debug auth")
# - console.log("Old debug")

# Tool-enhanced analysis
ast-grep --lang typescript -p 'console.log($MSG)' --json | \
  jq '.[] | select(.file | contains("src/auth"))'

# AI Output: "You removed 3 debug logs from auth module, 
# but added 1 new one. Pattern suggests debugging session."
```

#### 2. Pattern-Based Memory Search

```bash
# Query: "How did we handle async errors before?"
# Synaptic runs enhanced search:

for commit in $(git log --grep="error" --grep="async" --format="%H"); do
  echo "=== Commit $commit ==="
  git show $commit | ast-grep -p 'catch ($ERR) { $BODY }' -A 3 -B 1
done

# Returns: Commits with actual error handling patterns, not just mentions
```

#### 3. Smart Context Optimization

```bash
# Instead of full file dumps
ast-grep -p 'function $FUNC' -A 5 -B 2 --json | \
  jq '.[] | {file, function: .text, line: .range.start.line}'

# Returns: Just function signatures with minimal context
```

### MCP Tool Integration

The MCP server exposes tool-enhanced capabilities:

```typescript
tools: [
  {
    name: "svcms_analyze_commit_structural",
    description: "Analyze commit using ast-grep for structural changes",
    inputSchema: {
      properties: {
        commit_sha: { type: "string" },
        analysis_type: { 
          enum: ["error_handling", "auth_patterns", "state_management", "all"] 
        }
      }
    }
  },
  {
    name: "svcms_search_patterns",
    description: "Search commits for specific code patterns",
    inputSchema: {
      properties: {
        ast_pattern: { type: "string", description: "ast-grep pattern" },
        scope: { type: "string", description: "File scope (e.g., src/auth)" },
        significance: { enum: ["low", "medium", "high"] }
      }
    }
  },
  {
    name: "svcms_optimize_context",
    description: "Extract minimal context using external tools",
    inputSchema: {
      properties: {
        files: { type: "array", items: { type: "string" } },
        focus: { type: "string", description: "What to focus on" }
      }
    }
  }
]
```

### Example Enhanced Workflows

#### Scenario 1: Error Handling Changes

```bash
# You modify error handling
vim src/api/handler.ts

# Synaptic + ast-grep analyze together
AI: "I see you've changed error handling patterns. ast-grep analysis shows:
- Removed 2 try-catch blocks (lines 45-52, 67-74)
- Added 1 error boundary pattern (line 23)
- Similar structural changes in commits: abc123, def456
- Warning: Both previous commits had follow-up bug fixes"

# Enhanced commit suggestion
AI: "Suggested: knowledge.learned(api): replaced try-catch with error boundary pattern

ast-grep detected significant error handling restructure. Previous similar
changes (abc123, def456) required follow-up fixes for uncaught promises.

Memory: Error boundaries don't catch async errors - need Promise.catch() too
Location: src/api/CLAUDE.md"
```

#### Scenario 2: Targeted Memory Query

```bash
# Developer query
Developer: "Find all JWT-related learnings"

# Synaptic runs enhanced search
ast-grep -p 'jwt.$METHOD($ARGS)' --json | \
  jq -r '.[] | .file' | sort -u | \
  xargs -I {} git log --grep="learned.*jwt" -p -- {}

AI: "Found 5 JWT-related learnings with code context:
1. jwt.verify() throws sync errors (commit def456)
   - Code: Added try-catch around jwt.verify()
   - Learning: Library throws synchronously for malformed tokens
2. jwt.sign() with async options (commit abc123)
   - Code: Changed to jwt.sign(payload, secret, options, callback)
   - Learning: Async signing prevents event loop blocking
..."
```

#### Scenario 3: Context Optimization

```bash
# Large codebase query
Developer: "Understand our authentication flow"

# Traditional approach: Dump entire auth files (thousands of lines)
# Tool-enhanced approach:
ast-grep -p 'export function $FUNC' src/auth/ | \
  rg -A 5 -B 1 'auth|login|token' | \
  jq '.[] | {function: .text, file: .file, purpose: .context}'

AI: "Authentication flow extracted (45 lines vs 2,400 full files):
- login() → generates JWT
- authenticate() → verifies JWT  
- refresh() → issues new token
- logout() → invalidates token"
```

### Tool Installation and Verification

```bash
# Synaptic verifies tool availability
synaptic tools check
# ✓ ast-grep: Available (v0.12.0)
# ✓ ripgrep: Available (v13.0.0)
# ✗ fd: Not installed
# ✓ Custom analyzer: Available

# Auto-install missing tools (if enabled)
synaptic tools install fd
```

### Benefits of Tool Integration

1. **Semantic Awareness**: ast-grep understands code structure, not just text
2. **Blazing Speed**: ripgrep for ultra-fast searches across large codebases
3. **Precision**: Extract only relevant context, not entire files
4. **Pattern Recognition**: Identify recurring code patterns across commits
5. **Domain Expertise**: Custom tools for project-specific analysis
6. **Token Efficiency**: Minimal context extraction for AI processing

This transforms SVCMS from diff-aware to **semantically diff-aware** - understanding not just what changed, but the structural significance of those changes.

## Implementation Phases

### Phase 1: Core MCP Server (MVP)
- Embedded SVCMS specification
- Basic commit/query tools
- Git diff integration
- Configuration loading

### Phase 2: External Tool Integration
- ast-grep for structural analysis
- ripgrep for blazing-fast searches
- Custom tool configuration
- Pattern-based diff analysis
- Tool availability verification

### Phase 3: Enhanced Code Awareness
- Semantic diff analysis with ast-grep
- Intelligent commit message suggestions
- Structural pattern recognition
- Similar change detection with context
- Token-optimized context extraction

### Phase 4: Obsidian Integration
- Vault connection
- Dataview.js query generation
- Visual knowledge graphs
- Cross-project insights

### Phase 5: Advanced AI Workflows
- Proactive memory surfacing
- Design pattern detection
- Refactoring suggestions based on history
- Team knowledge sharing
- Custom analyzer integration

## Key Advantages Over Traditional Memory Systems

1. **Contextual by Design**: Every memory is tied to actual code changes
2. **Git-Native**: Leverages existing VCS infrastructure
3. **Semantically Diff-Aware**: AI understands not just what you learned, but the structural significance of what changed
4. **Tool-Enhanced**: Integrates ast-grep, ripgrep, and custom analyzers for deep code understanding
5. **Token-Efficient**: Extract minimal, relevant context instead of dumping entire files
6. **Pattern-Aware**: Recognizes recurring code patterns and structural changes across commits
7. **Team-Scalable**: Shared git history = shared team memory with structural insights
8. **Tool-Agnostic**: Works with any git-compatible system and extensible tool ecosystem
9. **Self-Documenting**: Code changes explain themselves both semantically and structurally

## AI Instructions for Maximum Effectiveness

### For Claude (Embedded in MCP)

```markdown
You are working in an SVCMS-enabled repository with automatic diff awareness and external tool integration.

KEY BEHAVIORS:
1. ALWAYS analyze current diff before suggesting actions
2. Use ast-grep for structural analysis when examining code patterns
3. Create semantic commits after EVERY meaningful change
4. Use empty commits for pure decisions/discussions
5. Query past learnings WITH diff AND structural context before implementing
6. Surface relevant past changes proactively using pattern matching

POWERFUL FEATURES:
- Every commit includes automatic code diff
- ast-grep provides structural pattern analysis, not just text matching
- ripgrep enables blazing-fast searches across large codebases
- You can search memories by code patterns AND structural signatures
- Similar past changes are automatically surfaced with context optimization
- Team knowledge is embedded in git history with semantic understanding
- Custom tools provide domain-specific analysis capabilities

ENHANCED WORKFLOW:
1. Structural analysis: "ast-grep shows you modified error handling patterns"
2. Context search: "ripgrep found 5 similar JWT implementations"
3. Pattern recognition: "This matches the auth refactor pattern from commit abc123"
4. Targeted queries: "Previous try-catch removals needed Promise handling"
5. Optimized context: "Extracting just function signatures, not full files"
6. Semantic commit: "knowledge.learned(auth): error boundaries need async handling"
7. Memory extraction: "Key structural insight for future sessions"

TOOL USAGE:
- Use svcms_analyze_commit_structural for deep code change analysis
- Use svcms_search_patterns for finding similar code structures
- Use svcms_optimize_context to extract minimal relevant information
- Leverage external tools to understand WHY changes matter structurally
```

## Conclusion

SVCMS as an MCP server represents a paradigm shift in AI-assisted development. By embedding memory directly into the git workflow and leveraging automatic diff capabilities, we create a development environment where:

- **Every code change carries its context**
- **AI truly understands what changed, not just what was said**
- **Team knowledge accumulates naturally**
- **Past learnings surface automatically**

This is not just another memory tool - it's a fundamental rethinking of how AI and version control can work together to create truly intelligent development workflows.

---

*"The best memory system is the one you're already using - git just needed to learn how to speak AI."*