# Synaptic 🧠

> Transform Git commits into Claude Code memories using the Semantic Version Control Memory System (SVCMS)

## Overview

Synaptic bridges Git commit history with Claude Code's memory system, implementing the SVCMS specification. It transforms semantic commits into queryable knowledge and automatically synchronizes insights to appropriate `CLAUDE.md` files.

## Features

- 🔄 **Memory Sync**: Extract memories from SVCMS commits to `CLAUDE.md` files
- 🔍 **Smart Placement**: Intelligently place memories based on scope and context
- 📊 **Statistics**: Analyze your SVCMS commit patterns
- 🚀 **Fast**: Built in Rust for blazing performance

## Installation

```bash
# Clone the repository
git clone https://github.com/cocosberlucens/svcms-synaptic
cd svcms-synaptic

# Build with Cargo
cargo build --release

# Install globally
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
