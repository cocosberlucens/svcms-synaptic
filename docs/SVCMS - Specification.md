# Semantic Version Control Memory System (SVCMS) Specification

## Core Directive

When working with Git repositories, commit **very frequently** using semantic commit messages that capture not just what changed, but why it changed and what was learned. Every non-trivial edit should result in a commit that contributes to the project’s knowledge base.

## Commit Triggers

Always commit after:

- ✅ Implementing a new function or method
- ✅ Fixing a bug (even small ones)
- ✅ Refactoring existing code
- ✅ Learning something new about the codebase
- ✅ Making architectural or design decisions
- ✅ Discovering user preferences or requirements
- ✅ Failed attempts (document what didn’t work and why)
- ✅ Completing a conversation milestone
- ✅ Before context switching to a different module/feature
- ✅ **Design discussions that yield decisions (use `--allow-empty`)**
- ✅ **Research phases that produce insights (use `--allow-empty`)**
- ✅ **Planning sessions with concrete outcomes (use `--allow-empty`)**

## Extended Conventional Commits Types

### Standard Types (Conventional Commits v1.0.0)

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc)
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `build`: Build system or dependencies
- `ci`: CI configuration
- `chore`: Maintenance tasks

### SVCMS Knowledge Types

- `learned(<scope>)`: Discovered behavior, pattern, or constraint
- `insight(<scope>)`: Recognized optimization or improvement opportunity
- `context(<scope>)`: Important circumstantial information
- `decision(<scope>)`: Architectural or design choice with rationale
- `memory(<scope>)`: Explicit knowledge to persist for future sessions

### SVCMS Collaboration Types

- `discussed(<scope>)`: Key points from conversation with Corrado
- `explored(<scope>)`: Investigation findings or research results
- `attempted(<scope>)`: Tried approach (document both successes and failures)

### SVCMS Meta Types

- `workflow(<scope>)`: Process or methodology establishment
- `preference(<scope>)`: User preference discovered (Corrado’s coding style, tool choices)
- `pattern(<scope>)`: Recurring pattern identified in codebase or workflow

## Commit Message Format

```
<type>(<scope>): <summary max 72 chars>

<body - explain what and why, not how>

Context: <project/module/conversation context>
Refs: <#issue, docs/file.md, commit-sha>
Memory: <key insight for future CC sessions>
Location: <target CLAUDE.md path for memory sync>
Tags: <searchable keywords>
```

## Scope Guidelines

- Use specific module/component names: `auth`, `api`, `scheduler`, `database`
- For cross-cutting concerns: `architecture`, `security`, `performance`
- For tooling: `eslint`, `webpack`, `docker`
- For project-wide: `project`, `global`

## Memory Field Best Practices

The `Memory:` field should contain:

- Concise, actionable insights
- Constraints or limitations discovered
- Patterns to follow or avoid
- User preferences (Corrado’s specific requirements)
- Technical decisions and their rationale

## Location Field Usage

Specify where memories should be synced:

- `./CLAUDE.md` - Project-wide memories
- `src/auth/CLAUDE.md` - Module-specific memories
- `~/.claude/CLAUDE.md` - Global user preferences
- Omit if unsure (Synaptic tool will infer from scope)

## Example Commits Following SVCMS

```
learned(api): rate limiting resets at minute boundaries not rolling window

Discovered through testing that the API rate limiter uses fixed minute
boundaries rather than a rolling 60-second window. This affects our
retry strategy implementation.

Context: Staff Scheduling API integration
Refs: #87, src/api/client.ts
Memory: API rate limit resets at :00 seconds of each minute
Location: src/api/CLAUDE.md
Tags: api, rate-limiting, retry-strategy
```

```
preference(testing): Corrado prefers describe/it over test syntax

During test refactoring discussion, established preference for
Jest's describe/it syntax over test() for better readability
and nested test organization.

Context: Setting up testing standards
Memory: Use describe/it blocks for all Jest tests
Location: ~/.claude/CLAUDE.md
Tags: testing, jest, code-style
```

```
decision(architecture): implement repository pattern for data access

After discussing pros/cons, decided to use repository pattern to
abstract database operations from business logic. This enables
easier testing and future database migrations.

Context: Staff Scheduling Application architecture review
Refs: docs/architecture/data-layer.md
Memory: All database operations go through repository interfaces
Location: ./CLAUDE.md
Tags: architecture, repository-pattern, database, testing
```

## Integration with Existing Workflow

1. **Before starting work**: Run `git log --oneline -n 20` to review recent learnings
2. **During work**: Commit after each trigger point
3. **During discussions**: Use `git commit --allow-empty` for design decisions
4. **Before ending session**: Create a `context(session)` commit summarizing the session
5. **When stuck**: Search commits for similar problems: `git log --grep="<keyword>"`

### Empty Commits for Pure Knowledge

When no code changes exist but valuable knowledge was gained:

```bash
git commit --allow-empty -m "decided(auth): use JWT with refresh token pattern..."
git commit --allow-empty -m "explored(caching): evaluated Redis vs Memcached..."
git commit --allow-empty -m "discussed(ui): Corrado prefers dark mode with high contrast..."
```
#### Timing

Empty commit after reaching a decision, including negative ones
```bash
git commit --allow-empty -m "decided(ui): keep single activity display pattern 

Explored adding aggregated rows for shared person assignments across business units. Decided against it to maintain consistent display patterns throughout the application. 

Context: Staff Scheduling UI consistency discussion 
Memory: Prioritize UI consistency over data aggregation shortcuts Tags: ui-patterns, design-decision, consistency"
```
#### Granularity

Multiple related decisions in one discussion should be separate commits because:

- Each decision might affect different scopes
- Easier to reference specific decisions later
- Better granularity for the Synaptic tool to parse

#### Collaborative context

The collaborative nature is crucial! These commits document our design dialogue, creating a searchable history of our reasoning.
```bash
git commit --allow-empty -m "discussed(architecture): Corrado and Claude aligned on repository pattern

Established that all database operations should go through repository interfaces to enable easier testing and future migrations.

Context: Architecture planning session
Memory: Repository pattern mandatory for all data access
Location: ./CLAUDE.md"
```

### Decision Hierarchy

For complex discussions with sub-decisions:

```
decided(architecture): adopt microservices for scaling...
decided(architecture/auth): separate auth service with JWT...
decided(architecture/data): event sourcing for audit trail...
```

### Exploration vs Decision

Clear distinction:
```
explored(caching): investigated Redis clustering options...
decided(caching): use Redis Sentinel for HA, not Cluster...
```
### The Balance

The key is:

- Not too granular (every thought)
- Not too coarse (entire session)
- Just right: One meaningful insight/decision per commit

This way, `git log` becomes a design decision log, and Synaptic will have rich, structured data to work with!
## Synaptic Tool Usage (Once Available)

```bash
# Query mode examples
synaptic query "authentication errors"
synaptic query --type="learned" --scope="database"
synaptic query --after="2025-01-01" --tags="performance"

# Memory sync mode
synaptic sync                    # Sync all memories to appropriate CLAUDE.md files
synaptic sync --dry-run         # Preview what would be synced
synaptic sync --scope="auth"    # Sync only auth-related memories
```

## Quality Checklist

Before committing, ensure:

- [ ] Type accurately reflects the change
- [ ] Scope is specific and meaningful
- [ ] Summary is clear and under 72 characters
- [ ] Body explains the “why” behind the change
- [ ] Memory field contains actionable insight
- [ ] References are included where applicable
- [ ] Tags will help future searches

## Remember

Every commit is an opportunity to teach future Claude Code sessions about the project. Make each commit count as a valuable piece of the project’s collective memory.

-----

*SVCMS: Transforming commits into memories, one semantic message at a time.*