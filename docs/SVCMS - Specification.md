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

## Two-Tier Commit Type System

SVCMS now supports a sophisticated two-tier commit type system with layered configuration. This allows for natural language-like commit messages with structured validation while maintaining clear separation between personal preferences and team standards.

### Syntax Format

```
category.type(scope): summary
```

**Examples:**
- `knowledge.learned(auth): JWT tokens expire after 24 hours`
- `standard.feat(api): add user authentication endpoint`
- `collaboration.discussed(architecture): decided on microservices approach`
- `meta.workflow(testing): established TDD cycle for new features`

## Extended Conventional Commits Types (Legacy Reference)

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

## Default Categories (Two-Tier System)

### Standard (Conventional Commits v1.0.0)
- `standard.feat`: New feature
- `standard.fix`: Bug fix  
- `standard.docs`: Documentation only
- `standard.style`: Code style changes
- `standard.refactor`: Code restructuring without behavior change
- `standard.perf`: Performance improvements
- `standard.test`: Adding or modifying tests
- `standard.build`: Build system or dependencies
- `standard.ci`: CI configuration
- `standard.chore`: Maintenance tasks

### Knowledge (SVCMS Discovery Types)
- `knowledge.learned`: Discovered behavior, pattern, or constraint
- `knowledge.insight`: Recognized optimization or improvement opportunity
- `knowledge.context`: Important circumstantial information
- `knowledge.decision`: Architectural or design choice with rationale
- `knowledge.memory`: Explicit knowledge to persist for future sessions

### Collaboration (SVCMS Team Types)
- `collaboration.discussed`: Key points from conversations
- `collaboration.explored`: Investigation findings or research results
- `collaboration.attempted`: Tried approaches (successes and failures)

### Meta (SVCMS Process Types)
- `meta.workflow`: Process or methodology establishment
- `meta.preference`: User preferences and coding style choices
- `meta.pattern`: Recurring patterns identified in codebase or workflow

## Layered Configuration System

SVCMS uses a sophisticated two-layer configuration system that balances personal preferences with team standards:

### Global Configuration (`~/.synaptic/config.toml`)

**Personal Preferences & Universal Settings:**
- Obsidian vault path and personal workflow preferences
- Standard SVCMS categories (standard, knowledge, collaboration, meta)
- Global aliases and type normalization
- Cleanup and sync preferences

**Create with:** `synaptic init --global`

### Project Configuration (`.synaptic/config.toml`)

**Team-Shared Project Definition:**
- Project name for Obsidian organization
- Project-specific modules and scopes
- Domain-specific custom types
- Location mappings for CLAUDE.md files

**Create with:** `synaptic init --project [--project-name="my-project"]`

### Configuration Layering

Projects automatically inherit global settings while overriding with project-specific definitions:

**Project Config Example:**
```toml
[obsidian]
project_name = "staff-scheduling-web-app"

[commit_types.scopes.modules]
auth = { categories = ["standard", "knowledge"], custom_types = ["integrated"] }
scheduler = { categories = ["standard", "knowledge"], custom_types = ["optimized"] }
api = { categories = ["standard", "knowledge", "collaboration"], custom_types = [] }

[commit_types.scopes.cross_cutting]
security = { categories = ["knowledge", "collaboration"], custom_types = ["audited"] }

[locations]
auth = "src/auth/CLAUDE.md"
scheduler = "src/scheduling/CLAUDE.md"
api = "src/api/CLAUDE.md"
```

**Benefits:**
- **Team Synchronization**: Project configs live in git, automatically shared
- **Clean Separation**: Personal preferences stay local, project definitions are shared
- **Perfect Fallback**: Works even without project config
- **Automatic Organization**: Projects land in `vault/synaptic/projects/{project-name}/`

**Usage Examples:**
- `auth.integrated(oauth): connected Google OAuth provider`
- `scheduler.optimized(backtracking): improved algorithm performance`
- `security.audited(api): completed security review of endpoint permissions`

## Legacy Support

For backwards compatibility, traditional single-tier formats are still supported:
- `learned(auth): JWT tokens expire after 24 hours`
- `feat(api): add user authentication endpoint`

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
## Synaptic Tool Usage

**Memory Sync Mode** ✅ Available:
```bash
# Install Synaptic
cargo install --git https://github.com/cocosberlucens/svcms-synaptic

# Configuration setup (one-time)
synaptic init --global                  # Create global config (~/.synaptic/config.toml)
synaptic init --project                 # Create project config (.synaptic/config.toml)
synaptic init --project --project-name="my-app"  # With specific project name

# Memory sync with layered config
synaptic sync                           # Sync all memories using layered config
synaptic sync --dry-run                 # Preview what would be synced
synaptic sync --depth 50               # Process last 50 commits
synaptic sync --since="2025-01-01"     # Process commits since date

# Obsidian vault initialization
synaptic vault init                     # Initialize Obsidian vault structure

# Statistics and help
synaptic stats                          # Show SVCMS commit statistics
synaptic init                           # Show configuration options
synaptic --help                         # Full help documentation
```

**Query Mode** 🚧 Not Yet Available (Planned for Milestone 3):
```bash
# Future query functionality (not implemented yet)
synaptic query "authentication errors"
synaptic query --type="learned" --scope="database"
synaptic query --after="2025-01-01" --tags="performance"

# Note: --scope filtering in sync mode is also not yet implemented
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