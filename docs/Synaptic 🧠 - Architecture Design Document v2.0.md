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
┌─────────────────────────────────────────────────────┐
│                    Synaptic CLI                     │
├─────────────────────────────────────────────────────┤
│                  Command Handler                    │
│         ┌──────────┴──────────┴──────────┐          │
│         │          │          │          │          │
│    sync │     query│     vault│      init│          │
│         ▼          ▼          ▼          ▼          │
├─────────────────────────────────────────────────────┤
│   Memory Sync   Query Engine  Obsidian    Config    │
│     Engine      (Dual Mode)   Manager     Manage    │
│         │            │            │                 │
│         ▼            ▼            ▼                 │
│  ┌─────────────┬─────────────┬─────────────┐        │
│  │Commit Parser│ Git Search  │Vault Syncer │        │
│  ├─────────────┼─────────────┼─────────────┤        │
│  │   Memory    │  Dataview   │  Template   │        │
│  │  Extractor  │   Query     │  Renderer   │        │
│  ├─────────────┼─────────────┼─────────────┤        │
│  │File Placer  │  Unified    │ Wikilink    │        │
│  │             │  Search     │ Enricher    │        │
│  └─────────────┴─────────────┴─────────────┘        │
├─────────────────────────────────────────────────────┤
│     Git Repository          Obsidian Vault          │
│   (Source of Truth)      (Living Knowledge)         │
│   + CLAUDE.md files         + Note Files            │
│   + Commit History          + Dataview Indices      │
│   + Empty Commits           + Canvas Files          │
└─────────────────────────────────────────────────────┘
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

#### 4. **Obsidian Manager** (Enhanced)

```rust
pub struct ObsidianManager {
    vault_path: PathBuf,
    synaptic_folder: String,
    template_engine: Handlebars,
}
```

- **Vault Syncer**: Creates/updates notes from commits with project organization
- **Template Renderer**: Converts SVCMS data to Obsidian format using Handlebars
- **Wikilink Enricher**: Auto-creates `[[concept]]` links through concept extraction
- **Project Organization**: Automatically organizes notes by project name

#### 5. **Configuration Manager** (New Component)

```rust
pub struct SynapticConfig {
    sync: Option<SyncConfig>,
    obsidian: Option<ObsidianConfig>,
    commit_types: Option<CommitTypesConfig>,
    cleanup: Option<CleanupConfig>,
    query: Option<QueryConfig>,
    locations: Option<HashMap<String, String>>,
}
```

**Layered Configuration System:**
- **Global Config** (`~/.synaptic/config.toml`): Personal preferences, universal SVCMS categories
- **Project Config** (`.synaptic/config.toml`): Team-shared project definitions, module scopes
- **Smart Merging**: Project config extends/overrides global selectively
- **Automatic Discovery**: Uses git repository discovery for project configs

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

#### 6. **Config Manager** (Enhanced)

```rust
pub struct ConfigManager {
    config_path: PathBuf,
    hook_installer: HookInstaller,
}

pub struct HookInstaller {
    template_path: PathBuf,
    target_permissions: u32,
}
```

- **Hook Installation**: Automated post-commit hook setup
- **Conflict Detection**: Checks for existing hooks, offers merge options
- **Cross-platform Support**: Handles Windows/Unix permission differences
- **Template Management**: Maintains hook script templates
- **Rollback Capability**: Can uninstall/restore previous hooks

### Obsidian Vault Structure

```
vault/
└── synaptic/                # Synaptic container (keeps vault organized)
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
    ├── daily/                   # Optional daily rollups
    └── _synaptic_index.md       # Main dashboard for all Synaptic content
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

### Phase 2: Obsidian Integration ✅ (Complete)

- [x] Obsidian vault structure design
- [x] ObsidianManager struct implementation
- [x] Template engine integration (Handlebars)
- [x] Wikilink enrichment logic (concept extraction)
- [x] Vault init command (synaptic vault init)
- [x] Dual sync flow (CLAUDE.md + Obsidian notes)
- [x] Layered configuration system (global + project configs)
- [x] Smart config merging and discovery
- [x] Project-specific scope definitions and custom types
- [x] Automatic project organization in Obsidian vault
- [x] Enhanced CLI with config initialization commands
- [ ] Post-commit hook implementation (Phase 2.5)

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

## Layered Configuration System

### Global Configuration (`~/.synaptic/config.toml`)

**Personal preferences and universal SVCMS settings:**

```toml
[sync]
default_depth = 100
auto_deduplicate = true

[obsidian]
vault_path = "~/Documents/ObsidianVault"
synaptic_folder = "synaptic"
project_subfolder = "projects"
enable_wikilinks = true
enable_canvas = true

[obsidian.dataview]
default_limit = 20
enable_inline_queries = true

[query]
default_source = "unified"  # git | obsidian | unified
show_context = true

[commit_types]
additional = ["fixed", "decided"]

[commit_types.aliases]
fixed = "fix"
decided = "decision"

# Universal SVCMS categories (shared across all projects)
[commit_types.categories.standard]
description = "Standard Conventional Commits v1.0.0"
types = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"]

[commit_types.categories.knowledge]
description = "SVCMS Knowledge Types"
types = ["learned", "insight", "context", "decision", "memory"]

[commit_types.categories.collaboration]
description = "SVCMS Collaboration Types"
types = ["discussed", "explored", "attempted"]

[commit_types.categories.meta]
description = "SVCMS Meta Types"
types = ["workflow", "preference", "pattern"]
```

### Project Configuration (`.synaptic/config.toml`)

**Team-shared project-specific definitions:**

```toml
[obsidian]
project_name = "staff-scheduling-web-app"

[commit_types.scopes.modules]
auth = { categories = ["standard", "knowledge"], custom_types = ["integrated"] }
scheduler = { categories = ["standard", "knowledge"], custom_types = ["optimized"] }
shifts = { categories = ["standard", "knowledge"], custom_types = ["assigned"] }
api = { categories = ["standard", "knowledge", "collaboration"], custom_types = [] }

[commit_types.scopes.cross_cutting]
security = { categories = ["knowledge", "collaboration"], custom_types = ["audited"] }
architecture = { categories = ["knowledge", "collaboration", "meta"], custom_types = [] }

[locations]
auth = "src/auth/CLAUDE.md"
scheduler = "src/scheduling/CLAUDE.md"
shifts = "src/shifts/CLAUDE.md"
api = "src/api/CLAUDE.md"
```

### Configuration Benefits

**Team Synchronization:**
- Project configs live in git, automatically shared across team
- Consistent commit type validation for all team members
- Domain-specific types tailored to project architecture

**Clean Separation:**
- Personal preferences (vault path, cleanup settings) stay local
- Project definitions (scopes, modules) are team-shared
- No conflicts between personal and team settings

**Perfect Fallback:**
- Works seamlessly even without project config
- Global config provides complete SVCMS functionality
- Project config extends rather than replaces global settings

**Automatic Organization:**
- Project name drives Obsidian folder organization
- Notes land in `vault/synaptic/projects/{project-name}/`
- Clear separation between different projects in vault

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

# Configuration initialization (Enhanced)
synaptic init                     # Show configuration options
synaptic init --global            # Create global config (~/.synaptic/config.toml)
synaptic init --project           # Create project config (.synaptic/config.toml)
synaptic init --project --project-name="my-app"  # With specific project name

# Utility commands
synaptic stats                    # Show statistics from both sources
synaptic clean                    # Clean duplicate memories
```

## Post-Commit Hook

### Automated Installation

When running `synaptic init`, the tool automatically:

1. **Detects existing hooks**: Checks if `.git/hooks/post-commit` exists
2. **Handles conflicts**: Offers to merge with existing hooks or backup/replace
3. **Sets permissions**: Ensures the hook is executable (`chmod +x`)
4. **Validates setup**: Tests that Synaptic is in PATH and accessible

### Hook Template

`.git/hooks/post-commit`:

```bash
#!/bin/sh
# Automatically sync SVCMS commits to Obsidian
# Installed by Synaptic v0.1.0

# Only process if it's a SVCMS commit
if git log -1 --pretty=%s | grep -qE '^(feat|fix|learned|insight|decision|memory|discussed|explored|attempted|workflow|preference|pattern)(\(.+\))?:'; then
    # Sync silently to avoid interrupting commit workflow
    synaptic sync --last=1 --quiet
fi
```

### Installation Options

```bash
synaptic init                    # Install hook + create config
synaptic init --hook-only        # Just install/update the hook
synaptic init --no-hook          # Skip hook installation
synaptic init --backup-existing  # Backup existing hook before replacing
```

## Memory Lifecycle Management

### The Stale Knowledge Problem

Git repositories are dynamic - commits get rebased, branches are deleted, and history is rewritten. However, traditional sync approaches are add-only, leading to **knowledge pollution**:

```bash
# Day 1: Bad approach committed
git commit -m "attempted(auth): try complex OAuth flow
Memory: OAuth with 3rd party tokens is overly complex"

# Day 5: Commit gets rebased/deleted during cleanup
git rebase -i HEAD~10  # Commit SHA abc1234 no longer exists

# Day 6: Memory sync still shows phantom knowledge
synaptic sync  # Still references abc1234 - a ghost commit!
```

**Result**: Misleading memories referencing non-existent commits create confusion and technical debt.

### Solution: Intelligent Memory Cleanup

Synaptic implements **memory lifecycle management** that keeps knowledge synchronized with actual Git history:

#### CLI Commands

```bash
# Memory cleanup operations
synaptic unsync                    # Remove memories for missing commits
synaptic unsync --dry-run         # Preview what would be removed
synaptic unsync --commit=abc1234  # Remove specific commit memory
synaptic unsync --archive         # Move stale memories to archive section

# Integrated cleanup
synaptic sync --cleanup           # Auto-cleanup during normal sync
synaptic sync --validate          # Sync + validate all existing memories

# Memory validation
synaptic validate                 # Check memory/commit consistency
synaptic validate --fix           # Fix inconsistencies automatically
synaptic validate --report        # Generate cleanup report
```

#### Implementation Strategy

1. **Commit Hash Validation**: Check if each memory's SHA exists in current Git history
2. **Graceful Degradation**: Archive vs delete options for different scenarios
3. **Batch Processing**: Handle rebased/squashed commits intelligently
4. **User Control**: Manual cleanup vs automatic during sync
5. **Audit Trail**: Log what memories were removed and why

#### Memory Archive Format

Instead of deletion, memories can be archived:

```markdown
## SVCMS Memories

*Automatically synced by Synaptic*

- Current insight: decided(auth): use JWT pattern (def5678) [auth, jwt]
- Another insight: learned(api): rate limits are strict (ghi9012) [api, limits]

## Archived Memories

*Memories from commits no longer in Git history*

- 📦 Archived 2025-01-28: attempted(auth): try complex OAuth (abc1234) [auth, oauth]
  *Reason: Commit not found in Git history*
```

#### Configuration Options

```toml
[cleanup]
mode = "archive"              # "archive" | "delete" | "manual"
auto_cleanup_on_sync = true   # Run cleanup automatically
archive_format = "dated"      # "dated" | "separate_file"
retention_days = 30           # Keep archived memories for N days

[cleanup.validation]
check_frequency = "weekly"    # "always" | "daily" | "weekly" | "manual"
report_stale_memories = true  # Alert when stale memories detected
```

### Benefits

1. **Knowledge Accuracy**: Memories always correspond to actual Git commits
2. **Reduced Confusion**: No phantom insights from deleted experiments
3. **Clean Evolution**: Knowledge base stays current with codebase reality
4. **Audit Trail**: Track what knowledge was removed and why
5. **Flexible Recovery**: Archived memories can be restored if needed

This transforms Synaptic from a simple sync tool into a sophisticated **knowledge curator** that maintains the integrity of your project's memory system.

## Two-Tier Commit Type System

### Revolutionary Architecture

SVCMS now supports a sophisticated two-tier commit type system that creates natural language-like commit messages:

**Syntax**: `category.type(scope): summary`

**Examples**:
- `knowledge.learned(auth): JWT tokens expire after 24 hours`
- `standard.feat(api): add user authentication endpoint`
- `collaboration.discussed(architecture): decided on microservices approach`
- `meta.workflow(testing): established TDD cycle for new features`
- `auth.integrated(oauth): connected third-party OAuth provider`

### Matricial Permission System

The system uses sophisticated matricial intersections where **scopes** define which **categories** are allowed, creating natural constraints:

- **Module scopes** (auth, api, database) → Typically allow standard + knowledge + collaboration
- **Cross-cutting scopes** (architecture, security) → Focus on knowledge + collaboration + meta
- **Tooling scopes** (eslint, webpack, docker) → Primarily standard + knowledge + meta
- **Project scopes** (project, global) → Allow all categories with "all" wildcard

### Enhanced Configuration

#### Real-World Examples

```bash
# Module-specific knowledge discovery
knowledge.learned(auth): JWT tokens expire after 24 hours
knowledge.insight(api): rate limiting could be optimized with Redis

# Cross-cutting architectural decisions  
collaboration.discussed(architecture): decided on microservices approach
knowledge.decision(security): use OAuth2 with PKCE for mobile apps

# Development workflow establishment
meta.workflow(testing): established TDD cycle for new features
meta.pattern(database): repository pattern works well for our use case

# Custom domain-specific types
auth.integrated(oauth): connected Google OAuth provider
database.seeded(test): populated test database with sample data
security.audited(api): completed security review of user endpoints
```

#### Configuration Structure

The sophisticated config enables these natural language commits through matricial permissions:

```toml
# See complete configuration example above in "Configuration" section
[commit_types.categories.knowledge]
types = ["learned", "insight", "context", "decision", "memory"]

[commit_types.scopes.modules.auth]
categories = ["standard", "knowledge", "collaboration"]  
custom_types = ["integrated"]  # Enables auth.integrated(oauth)
```

#### Implementation Architecture

```rust
pub struct CommitTypeValidator {
    base_types: HashSet<String>,      // SVCMS spec types
    additional_types: HashSet<String>, // From config
    override_types: Option<HashSet<String>>, // Complete replacement
    aliases: HashMap<String, String>,  // Type normalization
}

impl CommitTypeValidator {
    pub fn is_valid(&self, commit_type: &str) -> bool {
        // Check aliases first
        let normalized = self.aliases.get(commit_type)
            .map(|s| s.as_str())
            .unwrap_or(commit_type);
        
        // Use override if specified, otherwise base + additional
        if let Some(ref overrides) = self.override_types {
            overrides.contains(normalized)
        } else {
            self.base_types.contains(normalized) || 
            self.additional_types.contains(normalized)
        }
    }
}
```

#### CLI Integration

```bash
# Discover commit types in use
synaptic stats --show-types       # List all commit types found
synaptic stats --unrecognized     # Show commits with unknown types

# Validate configuration
synaptic config validate          # Check config syntax
synaptic config suggest-types     # Suggest types based on git history
```

### Benefits

1. **Project Autonomy**: Teams define what's meaningful for their context
2. **Backward Compatibility**: Existing commits remain valid
3. **Type Consistency**: Aliases ensure normalized knowledge extraction
4. **Progressive Enhancement**: Start with SVCMS, extend as needed
5. **Discovery Tools**: Find and validate project-specific patterns

This flexible type system ensures Synaptic adapts to real-world usage patterns while maintaining the semantic richness that makes SVCMS valuable.

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