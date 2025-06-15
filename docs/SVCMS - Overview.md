# Semantic Version Control Memory System (SVCMS)

## Project Overview

The **Semantic Version Control Memory System (SVCMS)** is an innovative approach to augmenting Claude Code’s memory capabilities by leveraging Git’s version control system with an extended Conventional Commits specification. By committing **very frequently** with semantically rich commit messages, we create a queryable, distributed knowledge base that captures not just code changes but the context, decisions, and learnings that accompany them.

## Core Concept

SVCMS transforms every Git commit into a knowledge artifact, creating a temporal narrative of project evolution that Claude Code can reference, query, and learn from. This addresses Claude Code’s current limitation of session-based memory by persisting insights directly in the version control system.

## Key Components

### 1. **Frequent Semantic Commits**

- Commit after every non-trivial edit
- Each commit captures not just *what* changed but *why* and *what was learned*
- Creates a fine-grained audit trail of development decisions

### 2. **Extended Commit Specification**

Building on Conventional Commits v1.0.0, SVCMS introduces knowledge-centric commit types:

#### Knowledge Types

- `learned(<scope>):` - Discovered behavior or pattern
- `insight(<scope>):` - Optimization opportunities recognized
- `context(<scope>):` - Important circumstantial information
- `decision(<scope>):` - Architectural choices made
- `memory(<scope>):` - Explicit memories for CC

#### Collaboration Types

- `discussed(<scope>):` - Key conversation points
- `explored(<scope>):` - Research findings
- `attempted(<scope>):` - Tried approaches

#### Meta Types

- `workflow(<scope>):` - Process establishment
- `preference(<scope>):` - User preferences discovered
- `pattern(<scope>):` - Recurring patterns identified

### 3. **Synaptic Tool** 🧠

A sophisticated tool with two primary modes:

#### Query Mode

- Semantic search through commit history
- Pattern extraction and analysis
- Context building from commit narratives
- Example queries:
  - “What did we learn about authentication?”
  - “Show all architectural decisions this week”
  - “What patterns emerged in the scheduler module?”

#### Memory Sync Mode

- Extracts knowledge from commits to appropriate `CLAUDE.md` files
- Intelligently places memories based on scope:
  - `auth/CLAUDE.md` for authentication insights
  - `db/CLAUDE.md` for database patterns
  - Root `CLAUDE.md` for global learnings
- Maintains living documentation that evolves with codebase

## Commit Template Structure

```
<type>(<scope>): <summary>

<body>

Context: <project/module/conversation context>
Refs: <#issue, docs/file.md, commit-sha>
Memory: <key insight for CC to remember>
Location: <target CLAUDE.md path, if specific>
Tags: <searchable keywords>
```

## Implementation Triggers

Claude Code should commit when:

- After implementing a function
- After fixing a bug
- After refactoring code
- After learning something new about the codebase
- After making architectural decisions
- After discovering user preferences
- After failed attempts (valuable learning!)

## Benefits

1. **Persistent Memory**: Knowledge persists across CC sessions
2. **Contextual Understanding**: Every change is documented with its reasoning
3. **Searchable History**: Semantic commits enable intelligent queries
4. **Team Knowledge Sharing**: Commit messages become team documentation
5. **Automatic Documentation**: Living docs generated from commit history
6. **Learning Trail**: CC can trace how understanding evolved

## Example Usage Scenario

```bash
# After implementing a complex feature
learned(scheduler): staff availability conflicts require recursive backtracking

Implemented backtracking algorithm to handle complex constraint scenarios
where multiple staff members have overlapping unavailability periods.

Context: Staff Scheduling Application - shift assignment module
Refs: #42, docs/scheduling-algorithm.md, 3f4a2b1
Memory: Use backtracking for constraint satisfaction in scheduling
Location: src/scheduler/CLAUDE.md
Tags: algorithm, scheduling, constraints, backtracking
```

## Future Enhancements

1. **GitHub Actions Integration**: Automated memory file updates on push
2. **VSCode Extension**: Real-time commit template assistance
3. **Analytics Dashboard**: Visualize knowledge accumulation over time
4. **AI-Powered Insights**: Pattern recognition across multiple projects
5. **Memory Decay**: Automatic archival of outdated memories

## Integration with Claude Code Workflow

SVCMS seamlessly integrates with Claude Code’s existing memory system:

- Complements `CLAUDE.md`, `CLAUDE.local.md`, and `~/.claude/CLAUDE.md`
- Provides temporal context that static memory files lack
- Enables Claude Code to understand not just current state but evolution
- Creates a feedback loop where CC learns from its own commits

## Project Status

**Current Phase**: Specification and Design
**Next Steps**:

1. [x] Finalize SVCMS specification for `~/.claude/CLAUDE.md`
2. [ ] Develop Synaptic tool MVP
3. [ ] Create GitHub Action for automated memory sync
4. [ ] Test with real projects (starting with Staff Scheduling Application)

-----

*“Every commit tells a story. SVCMS ensures those stories become memories.”* - Corrado & Claude, 2025