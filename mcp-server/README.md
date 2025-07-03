# SVCMS Synaptic MCP Server 🧠

> Transform git commits into AI memories through Model Context Protocol

## Overview

The SVCMS Synaptic MCP Server implements the Semantic Version Control Memory System as a Model Context Protocol server, making git-embedded memory a first-class citizen in AI development environments.

## Key Features

### 🔄 Git-Embedded Memory with Auto-Diff
- **Every memory has automatic code context**: AI sees both learnings AND exact code changes
- **Diff-aware intelligence**: Understands not just what you learned, but what code changed when you learned it
- **Self-documenting development**: Git history becomes a queryable knowledge base

### 🛠️ MCP Integration
- **Tools**: Execute SVCMS operations (sync, query, stats, suggest)
- **Resources**: Access embedded specs, current diff, configuration
- **Prompts**: Template-driven workflows for common tasks

### ⚙️ Layered Configuration
- **Global config**: `~/.synaptic/config.toml` for personal preferences
- **Project config**: `./.synaptic/config.toml` for team-shared settings
- **Intelligent merging**: Project overrides global with fallbacks

### 🎯 External Tool Integration (Coming Soon)
- **ast-grep**: Structural code analysis beyond text matching
- **ripgrep**: Blazing-fast searches with context optimization
- **Custom tools**: Domain-specific analyzers

## Installation

### Prerequisites
- Node.js >= 18.0.0
- TypeScript
- Git repository

### Build from Source
```bash
# Navigate to MCP server directory
cd mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Test with MCP inspector
npm run inspector
```

### Global Installation
```bash
# Install globally for use with Claude Desktop
npm install -g .

# Or link for development
npm link
```

## Usage

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "svcms-synaptic": {
      "command": "node",
      "args": ["/path/to/svcms-synaptic/mcp-server/build/index.js"]
    }
  }
}
```

### Available MCP Capabilities

#### Tools
- **`svcms_sync`**: Sync memories from commits to CLAUDE.md files
- **`svcms_query`**: Search commits with full diff context
- **`svcms_stats`**: Show SVCMS commit statistics and patterns
- **`svcms_suggest_commit`**: AI analyzes diff and suggests semantic commit

#### Resources
- **`svcms://specification`**: Complete SVCMS spec in AI-optimized format
- **`svcms://workflow-guide`**: AI development workflow instructions
- **`svcms://current-diff`**: Real-time working directory changes
- **`svcms://config`**: Current merged configuration

#### Prompts
- **`analyze-changes`**: Analyze current diff and suggest SVCMS commit
- **`find-similar-changes`**: Find similar past changes with learnings
- **`design-decision`**: Document design decision with empty commit

## Configuration

### Global Configuration (`~/.synaptic/config.toml`)

```toml
[svcms]
use_compressed_format = true
auto_suggest_commits = true
include_diff_summaries = true

[obsidian]
vault_path = "~/Documents/ObsidianVault"
use_dataview = true
auto_generate_queries = true

[git]
diff_context_lines = 3
include_file_moves = true
summarize_large_diffs = true

[ai_workflow]
instruction_style = "concise"
reminder_frequency = "always"

[tools]
useful_bash_tools = ["ast-grep", "rg", "fd", "delta"]

[tools.integration]
diff_analysis = true
query_enhancement = true
context_optimization = true
```

### Project Configuration (`./.synaptic/config.toml`)

```toml
[project]
name = "my-awesome-project"

[commit_defaults]
"src/api/*" = { scope = "api", category = "standard" }
"src/auth/*" = { scope = "auth", category = "knowledge" }

[code_awareness]
important_patterns = ["TODO", "FIXME", "Memory:", "@deprecated"]
```

## Development

### Project Structure
```
src/
├── index.ts              # Main entry point
├── types.ts              # TypeScript type definitions
├── svcms/
│   ├── specification.ts  # Embedded SVCMS spec
│   └── parser.ts         # Commit message parsing
├── config/
│   └── loader.ts         # Layered TOML configuration
├── git/
│   └── client.ts         # Git operations with diff awareness
├── mcp/
│   └── server.ts         # Main MCP server implementation
└── utils/
    └── logger.ts         # Logging utilities
```

### Development Commands
```bash
# Development mode with watch
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Testing with MCP Inspector
```bash
# Build and test with inspector
npm run build && npm run inspector

# This opens a web interface to test MCP tools and resources
```

## SVCMS Commit Format

The server recognizes commits following the SVCMS specification:

```
<category>.<type>(<scope>): <summary>

<body>

Context: <project context>
Memory: <key insight for future sessions>
Location: <target CLAUDE.md path>
Tags: <searchable keywords>
```

### Examples
```bash
# Knowledge commit
knowledge.learned(auth): JWT tokens expire after 24h

Discovered during debugging that our JWT implementation has a hard
24-hour expiry, not the configurable duration we assumed.

Memory: JWT tokens have fixed 24h expiry - plan accordingly
Location: src/auth/CLAUDE.md
Tags: jwt, authentication, expiry

# Standard commit
standard.feat(api): add user authentication endpoint

Implemented OAuth2 flow with JWT token generation.

Memory: OAuth2 flow requires PKCE for security
Location: src/api/CLAUDE.md
Tags: oauth2, security, api
```

## Key Differentiators

### Git-Embedded Memory
Unlike traditional AI memory tools, SVCMS embeds memory directly into your git workflow:
- Every memory is tied to actual code changes
- AI sees both what was learned AND what code changed
- Team knowledge accumulates naturally in shared repositories

### Automatic Diff Context
Every SVCMS commit provides:
1. **Semantic Intent**: What you were trying to achieve
2. **Code Changes**: Exact diff of what changed (via git)
3. **Learned Context**: What was discovered or decided
4. **Future Guidance**: Memories for subsequent sessions

### MCP Protocol Benefits
- **Native Integration**: Works seamlessly with Claude Desktop and Claude Code
- **Structured Interface**: Clean, typed tools instead of CLI commands
- **Real-time Context**: Live access to diffs, configs, and memories
- **Extensible**: Easy to add new tools and capabilities

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes following SVCMS conventions
4. Commit with semantic messages: `standard.feat(mcp): add amazing feature`
5. Push and create a Pull Request

## License

MIT License - see LICENSE file for details.

---

*"The best memory system is the one you're already using - git just needed to learn how to speak AI."*