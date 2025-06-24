# Synaptic 🧠 - Architecture Design Document v2.0

## Overview

Synaptic is a Rust-based tool that bridges Git commit history with Claude Code’s memory system, implementing the Semantic Version Control Memory System (SVCMS) specification. It transforms semantic commits into queryable knowledge through a dual-layer architecture: Git as the immutable source of truth, and Obsidian as the living knowledge base.

## Core Design Principles

1. **Performance First**: Built in Rust for speed and reliability
2. **Local First**: All processing happens locally, no external dependencies
3. **Git Native**: Integrates seamlessly with existing Git workflows
4. **Dual-Layer Truth**: Git for immutable history, Obsidian for evolving knowledge
5. **Progressive Enhancement**: Start with memory sync, add features incrementally

## Architecture Evolution

### Key Insight from Corrado & Claude Discussion (2025-01-28)

The architecture maintains a crucial distinction between two knowledge layers:

- **Git Layer**: Immutable journal of decisions, learnings, and attempts (including empty commits)
- **Obsidian Layer**: Living encyclopedia that evolves with enriched understanding

This dual approach ensures we have both historical accuracy AND practical usability.

## Architecture Components

### Updated System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Synaptic CLI                         │
├─────────────────────────────────────────────────────────┤
│                  Command Handler                        │
│         ┌──────────┴──────────┴──────────┐            │
│         │          │          │          │            │
│    sync │     query│    vault│      init│            │
│         ▼          ▼          ▼          ▼            │
├─────────────────────────────────────────────────────────┤
│   Memory Sync   Query Engine  Obsidian    Config      │
│     Engine      (Dual Mode)   Manager     Manager     │
│         │            │            │                    │
│         ▼            ▼            ▼                    │
│  ┌─────────────┬─────────────┬─────────────┐        │
│  │Commit Parser│ Git Search  │Vault Syncer │        │
│  ├─────────────┼─────────────┼─────────────┤        │
│  │   Memory    │  Dataview   │  Template   │        │
│  │  Extractor  │   Query     │  Renderer   │        │
│  ├─────────────┼─────────────┼─────────────┤        │
│  │File Placer │Unified Search│ Wikilink   │        │
│  │            │              │ Enricher    │        │
│  └─────────────┴─────────────┴─────────────┘        │
├─────────────────────────────────────────────────────────┤
│     Git Repository          Obsidian Vault             │
│   (Source of Truth)      (Living Knowledge)            │
│   + CLAUDE.md files         + Note Files               │
│   + Commit History          + Dataview Indices         │
│   + Empty Commits           + Canvas Files             │
└─────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. **Commit Parser** (Enhanced)

- Parses Git log using `git2` crate
- Extracts SVCMS-formatted commits (including empty commits)
- Identifies: type, scope, memory field, location field, tags
- **Special handling for empty commits** (pure knowledge artifacts)

#### 2. **Memory Extractor** (Unchanged)

- Processes `Memory:` fields from commits
- Groups memories by scope and location
- Deduplicates similar insights
- Maintains chronological order

#### 3. **File Placer** (Dual Target)

- Intelligent placement algorithm for CLAUDE.md files
- **NEW**: Triggers Obsidian sync for each placement
- Handles both:
  - Traditional CLAUDE.md updates
  - Obsidian note generation

#### 4. **Obsidian Manager** (New Component)

```rust
pub struct ObsidianManager {
    vault_path: PathBuf,
    template_engine: Handlebars,
    link_enricher: WikilinkEnricher,
}
```

- **Vault Syncer**: Creates/updates notes from commits
- **Template Renderer**: Converts SVCMS data to Obsidian format
- **Wikilink Enricher**: Auto-creates `[[concept]]` links
- **Post-commit Hook Integration**: Triggered automatically

#### 5. **Query Engine** (Dual Mode)

```rust
pub enum QuerySource {
    Git,        // Historical, immutable queries
    Obsidian,   // Current knowledge queries  
    Unified,    // Both sources with deduplication
}
```

- **Git Search**: Traditional commit log searching
- **Dataview Query**: Leverages Obsidian’s Dataview plugin
- **Unified Search**: Merges results from both sources

### Obsidian Vault Structure

```
vault/
├── projects/
│   ├── staff-scheduling/
│   │   ├── commits/
│   │   │   ├── 2025-01-28-learned-scheduler-backtracking.md
│   │   │   ├── 2025-01-28-decided-auth-jwt-pattern.md
│   │   │   └── 2025-01-28-attempted-greedy-algorithm.md
│   │   ├── _index.md        # Project-specific queries
│   │   ├── _dashboard.md    # Knowledge dashboard
│   │   └── _canvas/         # Visual architecture decisions
│   └── [other-projects]/
├── concepts/                # Cross-project patterns
│   ├── Backtracking Algorithms.md
│   ├── Repository Pattern.md
│   └── JWT Authentication.md
├── people/                  # User preferences (Corrado's patterns)
└── daily/                   # Optional daily rollups
```

### Data Flow

#### Memory Sync Flow (Enhanced)

1. User runs: `synaptic sync` OR git commit triggers post-commit hook
2. Parser reads Git log (including empty commits)
3. Extracts SVCMS commits
4. Groups memories by target location
5. **Parallel execution**:
- Updates appropriate CLAUDE.md files
- Generates Obsidian notes with enriched content
1. Reports summary of changes

#### Query Flow (Dual Mode)

1. User runs: `synaptic query "authentication decisions"`
2. Query processor determines optimal source(s)
3. **For historical queries**: Search Git log
4. **For knowledge queries**: Execute Dataview query
5. **For comprehensive**: Unified search across both
6. Ranks and deduplicates results
7. Formats output with context

### Obsidian Note Template

```markdown
---
id: {{commit_sha}}
type: {{commit_type}}
scope: {{commit_scope}}
date: {{commit_date}}
tags: {{#each tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
memory: "{{memory_field}}"
project: {{project_name}}
refs: {{#each refs}}["{{this}}"]{{#unless @last}}, {{/unless}}{{/each}}
aliases: ["{{commit_summary}}"]
---

# {{commit_type}}({{commit_scope}}): {{commit_summary}}

## What Changed
{{commit_body}}

## Key Insight
{{memory_field}}

{{#if is_empty_commit}}
> 📝 This was a pure knowledge commit (no code changes)
{{/if}}

## Context
{{context_field}}

## Related Concepts
{{#each extracted_concepts}}
- [[{{this}}]]
{{/each}}

## References
{{#each refs}}
- {{this}}
{{/each}}

## Project Context
![[projects/{{project_name}}/_index#Current Focus]]

---
*Commit: {{commit_sha}} | Author: {{author}} | Date: {{commit_date}}*
```

## Implementation Roadmap (Updated)

### Phase 1: Enhanced Memory Sync ✅ (Completed)

- [x] Basic commit parsing
- [x] Memory extraction
- [x] Scope-based inference
- [x] Deduplication logic

### Phase 2: Obsidian Integration (Current - Week 3-4)

- [ ] Obsidian vault structure design
- [ ] Post-commit hook implementation
- [ ] Template engine integration
- [ ] Wikilink enrichment logic
- [ ] Basic Dataview query templates

### Phase 3: Dual Query Engine (Week 5-6)

- [ ] Git query mode (existing)
- [ ] Dataview query processor
- [ ] Unified search implementation
- [ ] Result ranking algorithm
- [ ] Query source optimization

### Phase 4: Advanced Features (Week 7-8)

- [ ] Canvas integration for architecture decisions
- [ ] Cross-project concept extraction
- [ ] Daily/weekly rollup generation
- [ ] iOS Shortcuts integration (for Corrado!)

## Technology Stack

### Core Dependencies

- **git2**: Git repository interaction
- **clap**: CLI argument parsing
- **serde**: Serialization for config/data
- **regex**: Commit message parsing
- **handlebars**: Template rendering (NEW)
- **tantivy**: Full-text search for unified queries

### Obsidian Integration

- **Post-commit hooks**: Git integration
- **Dataview plugin**: Query engine
- **Templater plugin**: Note consistency
- **Canvas plugin**: Visual architecture

## Configuration (Enhanced)

`~/.synaptic/config.toml`:

```toml
[sync]
default_depth = 100
auto_deduplicate = true
dry_run = false

[obsidian]
vault_path = "~/Documents/ObsidianVault"
project_subfolder = "projects"
enable_wikilinks = true
enable_canvas = true
template_path = "~/.synaptic/templates/commit.hbs"

[obsidian.dataview]
default_limit = 20
enable_inline_queries = true

[query]
default_source = "unified"  # git | obsidian | unified
show_context = true

[locations]
# Custom location mappings (for CLAUDE.md files)
auth = "src/authentication/CLAUDE.md"
db = "database/CLAUDE.md"
```

## CLI Interface (Enhanced)

```bash
# Memory sync operations
synaptic sync                      # Sync to both CLAUDE.md and Obsidian
synaptic sync --all               # Sync entire history
synaptic sync --since="2024-01-01"
synaptic sync --dry-run           # Preview changes
synaptic sync --obsidian-only     # Skip CLAUDE.md updates

# Query operations (Dual mode)
synaptic query "authentication"    # Unified search
synaptic query --source=git       # Git-only search
synaptic query --source=obsidian  # Obsidian-only search

# Vault-specific operations (NEW)
synaptic vault init               # Initialize Obsidian structure
synaptic vault query 'type = "decision"'  # Direct Dataview
synaptic vault stats --project="sched"
synaptic vault graph --scope="auth"
synaptic vault canvas --type="architecture"

# Utility commands
synaptic stats                    # Show statistics from both sources
synaptic clean                    # Clean duplicate memories
synaptic init                     # Initialize in project
```

## Post-Commit Hook

`.git/hooks/post-commit`:

```bash
#!/bin/sh
# Automatically sync SVCMS commits to Obsidian

# Only process if it's a SVCMS commit
if git log -1 --pretty=%s | grep -qE '^(feat|fix|learned|insight|decision|memory|discussed|explored|attempted|workflow|preference|pattern)(\(.+\))?:'; then
    synaptic sync --last=1 --quiet
fi
```

## Why Dual-Layer Architecture

Per Corrado & Claude’s discussion (2025-01-28):

1. **Git = Journal**: Immutable record of WHEN insights occurred
2. **Obsidian = Encyclopedia**: Living knowledge that evolves
3. **Best of Both**: Historical accuracy AND practical usability

Example:

- Git shows: “Decided JWT on 2025-01-28 after exploring 3 options”
- Obsidian adds: Diagrams, updated edge cases, links to best practices

## Success Metrics

- **Performance**: Process 1000 commits in <2 seconds
- **Accuracy**: 95%+ correct memory placement
- **Obsidian Sync**: <100ms per commit note generation
- **Query Speed**: Dataview queries return in <500ms
- **iOS Usability**: Full knowledge access on Corrado’s iPhone

## Future Enhancements

1. **VSCode Extension**: Real-time commit template + Obsidian preview
2. **GitHub Action**: Team-wide Obsidian sync
3. **AI-Enhanced Linking**: Auto-discover concept relationships
4. **Memory Decay**: Archive outdated insights automatically
5. **Obsidian Publish**: Share project knowledge publicly

## Context for Claude Code Sessions

When implementing Synaptic:

1. **Remember the Philosophy**: Git is source of truth, Obsidian is living knowledge
2. **Empty Commits Matter**: They capture pure knowledge moments
3. **Corrado’s Workflow**: Prioritize iOS accessibility and visual tools
4. **Incremental Progress**: Each phase builds on the previous
5. **User Experience**: Make it feel magical, not technical

The goal is to make every commit a valuable knowledge artifact that grows richer over time!

-----

*“Synaptic: Where commits become memories, memories become notes, and notes become wisdom.”*

*Architecture v2.0 - Evolved through collaboration between Corrado & Claude*