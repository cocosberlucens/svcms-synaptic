# SVCMS - Specification – Home CLAUDE with MCP

*Simplified instructions for ~/.claude/CLAUDE.md when using SVCMS MCP Server*

## Core Directive

Commit **very frequently** with semantic messages that capture not just what changed, but why it changed and what was learned. Every non-trivial edit should result in a commit that contributes to the project's knowledge base.

## When to Commit

Always commit after:
- ✅ Implementing a new function or method
- ✅ Fixing a bug (even small ones)
- ✅ Learning something new about the codebase
- ✅ Making architectural or design decisions
- ✅ **Design discussions that yield decisions (use `--allow-empty`)**
- ✅ **Research phases that produce insights (use `--allow-empty`)**
- ✅ Failed attempts (document what didn't work and why)

## Basic Format

```
<category>.<type>(<scope>): <summary>

<body - explain what and why, not how>

Memory: <key insight for future Claude Code sessions>
Location: <optional target CLAUDE.md path>
Tags: <searchable keywords>
```

## Examples

```
knowledge.learned(auth): JWT tokens expire after 24 hours

Discovered through testing that the API rate limiter uses fixed minute
boundaries rather than a rolling 60-second window.

Memory: API rate limit resets at :00 seconds of each minute
Tags: api, rate-limiting, authentication
```

```
collaboration.discussed(architecture): decided on microservices approach

After discussing pros/cons, decided to use repository pattern to
abstract database operations from business logic.

Memory: All database operations go through repository interfaces
Location: ./CLAUDE.md
Tags: architecture, repository-pattern, database
```

## Quick Reference

**Categories:**
- `standard.*` - Traditional conventional commits (feat, fix, docs, etc.)
- `knowledge.*` - Discoveries (learned, insight, decision, memory)
- `collaboration.*` - Team interactions (discussed, explored, attempted)
- `meta.*` - Process improvements (workflow, preference, pattern)

**Legacy support:** Single-tier formats still work: `learned(auth): ...`, `feat(api): ...`

## MCP Server Integration

With the SVCMS MCP Server active, you have access to:
- **Commit suggestions** with semantic analysis
- **Memory search** across all projects
- **Automatic sync** to CLAUDE.md files
- **Statistics** and quality analysis
- **Smart scope detection** and placement

Use MCP tools like:
- `svcms_suggest_commit` - AI-powered commit suggestions
- `svcms_search_memories` - Search across all memories
- `svcms_sync` - Sync memories to CLAUDE.md files
- `svcms_memory_stats` - View commit patterns and quality

## Zero-Config Setup

**No configuration required!** The MCP server automatically:
- 🔍 **Scans** your `src/` directory for modules
- 📝 **Creates** CLAUDE.md files where needed  
- 🎯 **Routes** memories to appropriate locations
- ⚙️ **Infers** sensible defaults for everything

**Optional configuration:**
- **Global config:** `~/.synaptic/config.toml` (personal preferences)
- **Project config:** `.synaptic/config.toml` (exceptions only)

## Remember

Every commit is an opportunity to teach future Claude Code sessions about the project. The MCP server handles the complexity - you focus on capturing valuable insights!

---

*SVCMS with MCP: Git-embedded memory made simple.*