# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Synaptic** is a Rust-based CLI tool that implements the Semantic Version Control Memory System (SVCMS). It transforms Git commits with semantic messages into queryable knowledge and automatically synchronizes insights to `CLAUDE.md` files. This bridges Git commit history with Claude Code's memory system.

## Development Commands

```bash
# Build the project
cargo build --release

# Run with debug output
RUST_LOG=debug cargo run -- sync

# Run tests
cargo test

# Format code
cargo fmt

# Lint
cargo clippy

# Install globally
cargo install --path .
```

## Core Architecture

### Main Components

- **CLI Entry Point** (`src/main.rs`): Command line interface with sync, stats, and init commands
- **SVCMS Parser** (`src/parser.rs`): Parses commit messages following SVCMS format
- **Memory Sync Engine** (`src/memory.rs`): Syncs extracted memories to appropriate CLAUDE.md files
- **Git Integration** (`src/git.rs`): Interacts with Git repositories using git2 crate
- **Core Types** (`src/lib.rs`): Defines `SvcmsCommit` struct with all commit metadata

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

### Memory Placement Logic

- Explicit `Location:` field → specified path
- Scope-based inference → `src/{scope}/CLAUDE.md`
- Global insights → project root `CLAUDE.md`
- Default fallback → project root `CLAUDE.md`

## Key Dependencies

- `git2`: Git repository interaction
- `clap`: CLI argument parsing with derive features
- `serde`: Serialization support
- `regex`: Commit message parsing
- `anyhow`: Error handling
- `chrono`: Timestamp handling
- `colored`: Terminal output formatting

## Current Implementation Status

This is an early-stage project with basic structure in place:
- ✅ CLI framework and command structure
- ✅ Core data types (SvcmsCommit)
- 🚧 SVCMS commit parsing (basic pattern matching implemented)
- 🚧 Git repository interaction (skeleton implemented)
- 🚧 Memory synchronization (placeholder implementation)
- ❌ Full SVCMS parsing (body, memory, location, tags extraction)
- ❌ File writing and update logic
- ❌ Deduplication and conflict resolution

## Testing Strategy

Tests are planned but not yet implemented. The project uses:
- Unit tests for parsing logic
- Integration tests for Git operations
- `tempfile` crate for temporary repository testing

## Project Context

This tool is part of the broader SVCMS (Semantic Version Control Memory System) initiative to enhance Claude Code's memory capabilities by leveraging Git's version control system with extended Conventional Commits specification.


## SVCMS Memories

*Automatically synced by Synaptic*

- Check existing content to avoid duplicate memory entries: feat `feat(memory): implement idempotency and improved scope routing` (9157340) [idempotency, deduplication, workflow, scope-routing]
- MVP + enhanced sync features completed in initial implementation: docs `docs(roadmap): mark Milestones 1 & 2 as completed` (7ba49d9) [documentation, milestones, progress]
- Synaptic exemplifies human-AI pair programming at its best: docs `docs(authors): add Claude as co-author in Cargo.toml` (e82b0cb) [collaboration, authors, acknowledgment]
- Route test/build/chore scopes to project root, not src/: decision `decision(memory): route project-wide scopes to root CLAUDE.md` (d04b57b) [memory-placement, scope-routing]
- Use HashMap to group memories by file, then update each file once: feat `feat(memory): implement full memory sync functionality` (9986c3a) [memory-sync, file-io, claude-md]
- Building tools with SVCMS creates immediate feedback loops: insight `insight(development): SVCMS enables self-documenting development process` (16c563a) [svcms, meta, development-process]
- Always create initial commit in test repos before walking history: learned `learned(testing): git repos need initial commit for HEAD reference` (e760d70) [testing, git2, repository]
- Use git2 Repository API and convert timestamps with Utc.timestamp_opt: feat `feat(git): implement git repository interaction module` (df565f6) [git, repository, commit-parsing, git2]
- Prefix unused parameters with _ to avoid warnings: chore `chore(cleanup): fix all compiler warnings` (7a7256d) [cleanup, warnings, rust]
- Both 'decision' and 'decided' are valid SVCMS commit types: fixed `fixed(parser): add 'decided' as valid SVCMS commit type` (8e65289) [parser, svcms, testing, commit-types]
- Synaptic uses git2 for Git interaction, clap for CLI: feat `feat: initialize Synaptic project with core structure` (5d50d18) [rust, initialization, project-setup]
