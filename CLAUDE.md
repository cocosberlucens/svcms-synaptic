# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Synaptic** is a TypeScript-based MCP (Model Context Protocol) server that implements the Semantic Version Control Memory System (SVCMS). It transforms Git commits with semantic messages into queryable knowledge and automatically synchronizes insights to `CLAUDE.md` files. This bridges Git commit history with Claude Code's memory system through intelligent auto-discovery and zero-config operation.

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run with debug output
DEBUG=* node build/index.js

# Run tests
npm test

# Format code
npm run format

# Lint
npm run lint

# Install MCP server
claude mcp add svcms-synaptic -s project $(pwd)/build/index.js
```

## Core Architecture

### Main Components

- **MCP Server Entry Point** (`src/index.ts`): Main entry with zero-config auto-discovery
- **Auto-Discovery Engine** (`src/config/auto-discovery.ts`): Intelligent module detection and CLAUDE.md bootstrapping
- **Configuration Loader** (`src/config/loader.ts`): Layered configuration with global and project settings
- **Memory Manager** (`src/memory/manager.ts`): Orchestrates memory extraction, processing, and sync
- **MCP Protocol Handler** (`src/mcp/server.ts`): Exposes SVCMS functionality through Model Context Protocol
- **Git Integration** (`src/git/client.ts`): Interacts with Git repositories
- **Tool Integration** (`src/tools/`): ast-grep and ripgrep integration for semantic analysis

### SVCMS Commit Structure

The tool processes commits with this format:
```
<type>(<scope>): <summary>

<body>

Context: <project/module context>
Refs: <#issue, docs/file.md>
Memory: <key insight for CC>
Location: <target CLAUDE.md path>
Tags: <searchable keywords>
```

### Zero-Config Auto-Discovery

The system automatically:
- **Scans** `src/` directory for modules
- **Creates** CLAUDE.md files where needed
- **Routes** memories to appropriate locations  
- **Infers** sensible defaults for categories and patterns

### Memory Placement Logic

- **Auto-discovered modules** → `src/{module}/CLAUDE.md`
- **Explicit `Location:` field** → specified path
- **Cross-cutting concerns** → `docs/{scope}/CLAUDE.md`
- **Project-wide insights** → root `CLAUDE.md`

## Key Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `@iarna/toml`: Configuration file parsing
- `zod`: Runtime type validation
- `simple-git`: Git repository interaction
- TypeScript and Node.js 18+ runtime

## Current Implementation Status

**✅ Production Ready** - Zero-Config MCP Server:
- ✅ **Auto-Discovery**: Intelligent module detection and CLAUDE.md creation
- ✅ **Zero Configuration**: Works immediately without any setup
- ✅ **MCP Integration**: Full Model Context Protocol compliance
- ✅ **Memory Sync**: Complete git-embedded memory system
- ✅ **Tool Integration**: ast-grep and ripgrep for semantic analysis
- ✅ **Layered Config**: Global defaults + project-specific overrides
- ✅ **AI-Powered Suggestions**: Intelligent commit suggestions
- ✅ **Search & Stats**: Query memories and analyze commit patterns

## Installation & Usage

```bash
# Install MCP server in Claude Code
claude mcp add svcms-synaptic -s project $(pwd)/build/index.js

# Available MCP tools (automatically available)
svcms_sync                 # Sync memories to CLAUDE.md files  
svcms_sync --dry-run       # Preview memory sync
svcms_memory_stats         # Show commit statistics and patterns
svcms_search_memories      # Search across all memories
svcms_suggest_commit       # AI-powered commit suggestions
svcms_analyze_structural   # Semantic code analysis with ast-grep
```

## Testing Strategy

Comprehensive test suite implemented:
- Unit tests for SVCMS parsing logic
- Integration tests for Git operations using temporary repositories
- Memory placement and deduplication tests

## Project Context

This tool is part of the broader SVCMS (Semantic Version Control Memory System) initiative to enhance Claude Code's memory capabilities by leveraging Git's version control system with extended Conventional Commits specification.


## SVCMS Memories

*Automatically synced by Synaptic*

- Synaptic uses git2 for Git interaction, clap for CLI: commit `5d50d18b` (2025-06-15) [feat, initialization, project-setup, rust]
- Use git2 Repository API and convert timestamps with Utc.timestamp_opt: commit `df565f6b` (2025-06-15) [commit-parsing, feat, git, git2, repository]
- Building tools with SVCMS creates immediate feedback loops: commit `16c563ae` (2025-06-15) [development, development-process, insight, meta, svcms, workflow]
- Use HashMap to group memories by file, then update each file once: commit `9986c3ad` (2025-06-15) [claude-md, feat, file-io, memory, memory-sync]
- Check existing content to avoid duplicate memory entries: commit `91573401` (2025-06-15) [deduplication, feat, idempotency, memory, scope-routing, workflow]
- Always commit updated CLAUDE.md files after Synaptic sync: commit `025b4710` (2025-06-15) [docs, documentation, memory-sync]
- Always keep docs in sync with actual implementation status: commit `869fcaba` (2025-06-15) [docs, documentation, installation, status, usage]
- Provide fallback installation methods for Git auth issues: commit `65ccc192` (2025-06-15) [docs, documentation, installation, security, troubleshooting]
- Projects can define custom commit types via config.toml: commit `3f343cdf` (2025-06-25) [architecture, commit-types, configuration, docs, flexibility]
- Synaptic now supports dual-layer knowledge sync to both CLAUDE.md and Obsidian: commit `43214138` (2025-06-25) [feat, integration, obsidian, phase-2, templates, vault]
- Synaptic now has complete config-driven dual-layer sync functionality: commit `defa2200` (2025-06-25) [config, feat, integration, obsidian, phase-2-complete, vault]
- SVCMS now supports sophisticated category.type(scope) syntax with matrix permissions: commit `26a04c01` (2025-06-26) [categories, commit-types, feat, matrix, scopes, sophisticated, two-tier]
- Two-tier system enables natural language commits with structured validation: commit `2f9c0d62` (2025-06-26) [configuration, docs, documentation, svcms, two-tier]
- Layered config enables project-specific commit types while keeping personal prefs global: commit `1f895654` (2025-06-26) [config, configuration, feat, layered-config, project-specific, team-sync]
- Documentation now accurately reflects layered config capabilities: commit `76d6772b` (2025-06-28) [architecture, docs, documentation, layered-config, svcms, svcms-spec]
- SVCMS's killer feature is git-embedded memory with auto-diff awareness: commit `1f198c04` (2025-06-30) [architecture, auto-diff, design, docs, git-integration, mcp]
- External tools like ast-grep enable semantic code analysis beyond text diffs: commit `43b64840` (2025-06-30) [architecture, ast-grep, feat, mcp, semantic-analysis, tools, workflow-enhancement]
- MCP server foundation complete - ready for tool integration phase: commit `8ce4d8e6` (2025-07-03) [architecture, feat, foundation, git-integration, mcp, typescript]
- MCP SDK 0.6.1 requires Zod schemas, not string handlers: commit `0166cb07` (2025-07-03) [compilation-fixes, development-setup, fix, mcp, mcp-sdk, typescript]
- Focus on ast-grep integration first for semantic diff awareness: commit `0efe1118` (2025-07-03) [ast-grep, docs, mcp, memory-sync, obsidian, planning, roadmap]
- Memory sync transforms git commits into organized CLAUDE.md memories: commit `68350177` (2025-07-04) [ai-memories, feat, file-io, memory, memory-sync, svcms-core]

