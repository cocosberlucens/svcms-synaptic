# Synaptic 🧠

> Transform Git commits into Claude Code memories using the Semantic Version Control Memory System (SVCMS)

## Overview

Synaptic bridges Git commit history with Claude Code's memory system, implementing the SVCMS specification. It transforms semantic commits into queryable knowledge and automatically synchronizes insights to appropriate `CLAUDE.md` files.

## Why SVCMS is Different: Git-Embedded Memory with Auto-Diff

Unlike traditional AI memory tools that operate as external layers, SVCMS embeds memory directly into your git workflow. This means:

- **Every memory has automatic code context**: When you commit `knowledge.learned(auth): JWT tokens expire after 24h`, the AI sees both the learning AND the exact code changes
- **Diff-aware intelligence**: AI understands not just what you learned, but precisely what code changed when you learned it
- **Self-documenting development**: Your git history becomes a queryable knowledge base with full code awareness
- **Team knowledge sharing**: Shared repository = shared team intelligence

## 🚀 Coming Soon: MCP Server Integration

We're transforming Synaptic into an MCP (Model Context Protocol) server, making SVCMS a first-class citizen in AI development environments. [Read the full design specification →](docs/mcp-server-design.md)

## Features

- 🔄 **Memory Sync**: Extract memories from SVCMS commits to `CLAUDE.md` files
- 🔍 **Smart Placement**: Intelligently place memories based on scope and context
- 📊 **Statistics**: Analyze your SVCMS commit patterns
- 🚀 **Fast**: Built in Rust for blazing performance

## Installation

**Method 1: Install from GitHub (Recommended)**
```bash
cargo install --git https://github.com/cocosberlucens/svcms-synaptic
```

**Method 2: Clone and install locally**
```bash
# Clone the repository
git clone https://github.com/cocosberlucens/svcms-synaptic
cd svcms-synaptic

# Build with Cargo
cargo build --release

# Install globally
cargo install --path .
```

**Troubleshooting Installation**
If you get authentication errors with Method 1:
```bash
# Clone manually then install
git clone https://github.com/cocosberlucens/svcms-synaptic.git
cd svcms-synaptic
cargo install --path .
```

## Usage

### Sync memories from recent commits
```bash
synaptic sync                 # Default: last 100 commits
synaptic sync --depth 500    # Process more commits
synaptic sync --dry-run      # Preview without writing
```

### View SVCMS statistics
```bash
synaptic stats
```

### Initialize in a new project
```bash
synaptic init
```

## SVCMS Commit Format

Synaptic processes commits following the SVCMS specification:

```
<type>(<scope>): <summary>

<body>

Context: <project/module context>
Refs: <#issue, docs/file.md>
Memory: <key insight for CC>
Location: <target CLAUDE.md path>
Tags: <searchable keywords>
```

## Development

```bash
# Run tests
cargo test

# Run with debug output
RUST_LOG=debug cargo run -- sync

# Format code
cargo fmt

# Lint
cargo clippy
```

## License

MIT

---

*"Every commit tells a story. Synaptic ensures those stories become memories."*
