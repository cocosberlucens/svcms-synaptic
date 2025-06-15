# Synaptic 🧠 - Architecture Design Document

## Overview

Synaptic is a Rust-based tool that bridges Git commit history with Claude Code's memory system, implementing the Semantic Version Control Memory System (SVCMS) specification. It transforms semantic commits into queryable knowledge and automatically synchronizes insights to appropriate `CLAUDE.md` files.

## Core Design Principles

1. **Performance First**: Built in Rust for speed and reliability
2. **Local First**: All processing happens locally, no external dependencies
3. **Git Native**: Integrates seamlessly with existing Git workflows
4. **Progressive Enhancement**: Start with memory sync, add features incrementally

## Architecture Components

### Phase 1: Memory Sync Engine (Priority)

The foundation that provides immediate value by extracting knowledge from commits.

```
┌─────────────────────────────────────────────────────────┐
│                    Synaptic CLI                         │
├─────────────────────────────────────────────────────────┤
│                  Command Handler                        │
│                 ┌──────┴──────┐                        │
│                 │              │                        │
│            sync │              │ query                  │
│                 ▼              ▼                        │
├─────────────────────────────────────────────────────────┤
│          Memory Sync Engine    Query Engine             │
│                 │              (Phase 2)                │
│                 ▼                                       │
│         ┌───────────────┐                             │
│         │ Commit Parser │                             │
│         └───────┬───────┘                             │
│                 ▼                                       │
│         ┌───────────────┐                             │
│         │Memory Extractor│                             │
│         └───────┬───────┘                             │
│                 ▼                                       │
│         ┌───────────────┐                             │
│         │ File Placer   │                             │
│         └───────┬───────┘                             │
├─────────────────┴───────────────────────────────────────┤
│                    Git Repository                       │
│                  + CLAUDE.md files                      │
└─────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. **Commit Parser**

- Parses Git log using `git2` crate
- Extracts SVCMS-formatted commits
- Identifies: type, scope, memory field, location field, tags
- Handles both regular and empty commits

#### 2. **Memory Extractor**

- Processes `Memory:` fields from commits
- Groups memories by scope and location
- Deduplicates similar insights
- Maintains chronological order

#### 3. **File Placer**

- Intelligent placement algorithm:
    - Explicit `Location:` field → specified path
    - Scope-based inference → `src/{scope}/CLAUDE.md`
    - Global insights → project root `CLAUDE.md`
    - User preferences → `~/.claude/CLAUDE.md`
- Handles file creation and updates
- Preserves existing content structure
- Adds timestamps and commit references

### Phase 2: Query Engine

Built on top of the parsing infrastructure, enabling semantic search.

#### 4. **Local Knowledge Store** (SQLite)

```sql
-- Core schema concept
CREATE TABLE commits (
    id INTEGER PRIMARY KEY,
    sha TEXT UNIQUE,
    type TEXT,
    scope TEXT,
    summary TEXT,
    body TEXT,
    memory TEXT,
    context TEXT,
    timestamp DATETIME
);

CREATE TABLE tags (
    commit_id INTEGER,
    tag TEXT,
    FOREIGN KEY (commit_id) REFERENCES commits(id)
);

CREATE TABLE references (
    commit_id INTEGER,
    ref_type TEXT, -- 'issue', 'doc', 'commit'
    ref_value TEXT,
    FOREIGN KEY (commit_id) REFERENCES commits(id)
);

-- Full-text search
CREATE VIRTUAL TABLE commits_fts USING fts5(
    summary, body, memory, context, tags
);
```

#### 5. **Query Processor**

- Natural language query parsing
- Temporal queries ("last week", "since December")
- Type/scope filtering
- Tag-based search
- Reference following

### Data Flow

#### Memory Sync Flow

1. User runs: `synaptic sync`
2. Parser reads Git log (configurable depth)
3. Extracts SVCMS commits
4. Groups memories by target location
5. Updates/creates appropriate `CLAUDE.md` files
6. Reports summary of changes

#### Query Flow (Phase 2)

1. User runs: `synaptic query "authentication decisions"`
2. Query processor parses intent
3. Searches SQLite FTS index
4. Ranks results by relevance
5. Formats output with context

## Implementation Roadmap

### Milestone 1: MVP Memory Sync (Week 1-2)

- [ ] Basic commit parsing
- [ ] Memory extraction
- [ ] Simple file placement
- [ ] CLI with `sync` command

### Milestone 2: Enhanced Sync (Week 3-4)

- [ ] Scope-based inference
- [ ] Deduplication logic
- [ ] Dry-run mode
- [ ] Progress reporting

### Milestone 3: Local Knowledge Store (Week 5-6)

- [ ] SQLite integration
- [ ] Import existing commits
- [ ] Basic indexing

### Milestone 4: Query Engine (Week 7-8)

- [ ] Query parsing
- [ ] Search implementation
- [ ] Result ranking
- [ ] Formatted output

## Technology Stack

### Core Dependencies

- **git2**: Git repository interaction
- **clap**: CLI argument parsing
- **serde**: Serialization for config/data
- **regex**: Commit message parsing
- **rusqlite**: SQLite integration (Phase 2)
- **tantivy**: Full-text search (Phase 2 alternative)

### Development Tools

- **cargo**: Build system
- **rustfmt**: Code formatting
- **clippy**: Linting
- **cargo-test**: Testing framework

## Configuration

`~/.synaptic/config.toml`:

```toml
[sync]
default_depth = 100  # commits to process
auto_deduplicate = true
dry_run = false

[query]
default_limit = 20
show_context = true

[locations]
# Custom location mappings
auth = "src/authentication/CLAUDE.md"
db = "database/CLAUDE.md"
```

## CLI Interface

```bash
# Memory sync operations
synaptic sync                      # Sync recent commits
synaptic sync --all               # Sync entire history
synaptic sync --since="2024-01-01" # Sync from date
synaptic sync --dry-run           # Preview changes

# Query operations (Phase 2)
synaptic query "authentication"    # Search commits
synaptic query --type="decision"  # Filter by type
synaptic query --scope="api"      # Filter by scope
synaptic query --format=json      # Output format

# Utility commands
synaptic stats                    # Show statistics
synaptic clean                    # Clean duplicate memories
synaptic init                     # Initialize in project
```

## Future Enhancements

1. **VSCode Extension**: Real-time commit template assistance
2. **GitHub Action**: Automated sync on push
3. **Cross-Project Learning**: Aggregate insights across repositories
4. **AI-Enhanced Queries**: Semantic understanding beyond keywords
5. **Memory Decay**: Archive outdated insights

## Success Metrics

- **Performance**: Process 1000 commits in <1 second
- **Accuracy**: 95%+ correct memory placement
- **Usability**: Single command to sync
- **Value**: Measurable improvement in CC context retention

---

_"Synaptic: Where commits become memories, and memories become knowledge."_