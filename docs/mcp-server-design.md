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

## Implementation Phases

### Phase 1: Core MCP Server (MVP)
- Embedded SVCMS specification
- Basic commit/query tools
- Git diff integration
- Configuration loading

### Phase 2: Enhanced Code Awareness
- Intelligent diff analysis
- Commit message suggestions
- Pattern recognition in changes
- Similar change detection

### Phase 3: Obsidian Integration
- Vault connection
- Dataview.js query generation
- Visual knowledge graphs
- Cross-project insights

### Phase 4: Advanced AI Workflows
- Proactive memory surfacing
- Design pattern detection
- Refactoring suggestions based on history
- Team knowledge sharing

## Key Advantages Over Traditional Memory Systems

1. **Contextual by Design**: Every memory is tied to actual code changes
2. **Git-Native**: Leverages existing VCS infrastructure
3. **Diff-Aware**: AI understands not just what you learned, but what changed
4. **Team-Scalable**: Shared git history = shared team memory
5. **Tool-Agnostic**: Works with any git-compatible system
6. **Self-Documenting**: Code changes explain themselves semantically

## AI Instructions for Maximum Effectiveness

### For Claude (Embedded in MCP)

```markdown
You are working in an SVCMS-enabled repository with automatic diff awareness.

KEY BEHAVIORS:
1. ALWAYS analyze current diff before suggesting actions
2. Create semantic commits after EVERY meaningful change
3. Use empty commits for pure decisions/discussions
4. Query past learnings WITH diff context before implementing
5. Surface relevant past changes proactively

POWERFUL FEATURES:
- Every commit includes automatic code diff
- You can search memories by code patterns, not just text
- Similar past changes are automatically surfaced
- Team knowledge is embedded in git history

WORKFLOW:
1. Check current diff: "What files changed?"
2. Search similar: "Have we modified this pattern before?"
3. Apply learnings: "Past attempts show X approach works better"
4. Commit semantic: "category.type(scope): what and why"
5. Extract memory: "Key insight for future sessions"
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