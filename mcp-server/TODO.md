# SVCMS Synaptic MCP Server - Development TODO

## Next Implementation Phases

### 1. Add External Tool Integration (ast-grep, ripgrep)
- [ ] **Tool Detection & Verification**
  - Implement tool availability checking (`synaptic tools check`)
  - Add tool installation verification in config loader
  - Handle graceful fallbacks when tools are missing

- [ ] **AST-Grep Integration**
  - Implement structural diff analysis using ast-grep patterns
  - Add pattern-based commit suggestions (error handling, auth patterns, etc.)
  - Create semantic code search for similar past changes
  - Support configurable diff patterns from config.toml

- [ ] **Ripgrep Integration**
  - Ultra-fast content search across large codebases
  - Context-optimized searches (extract minimal relevant info)
  - Integration with SVCMS commit search for blazing performance
  - Support ignore patterns and context lines from config

- [ ] **Enhanced MCP Tools**
  - `svcms_analyze_commit_structural`: Deep structural analysis with ast-grep
  - `svcms_search_patterns`: Pattern-based commit search
  - `svcms_optimize_context`: Token-efficient context extraction
  - Update existing tools to leverage external tools

### 2. Implement Memory Sync to CLAUDE.md Files
- [ ] **Memory Extraction Engine**
  - Parse `Memory:` fields from SVCMS commits
  - Extract and deduplicate memories intelligently
  - Support commit scope-based routing (project vs module-specific)

- [ ] **File Placement Logic**
  - Implement smart memory placement (`./CLAUDE.md`, `src/{scope}/CLAUDE.md`)
  - Respect explicit `Location:` field when provided
  - Handle module-specific vs cross-cutting concerns

- [ ] **Idempotent Sync Operations**
  - Prevent duplicate memory entries
  - Maintain chronological order of memories
  - Support incremental sync (only new commits since last sync)
  - Add conflict resolution for memory updates

- [ ] **Sync Tool Enhancement**
  - Complete `svcms_sync` tool implementation
  - Add real file I/O operations (currently placeholder)
  - Support dry-run mode with detailed preview
  - Add progress reporting for large sync operations

### 3. Add Obsidian Vault Integration
- [ ] **Vault Connection & Setup**
  - Implement Obsidian vault detection and validation
  - Create project-specific folder structure (`vault/synaptic/projects/{project-name}/`)
  - Support vault initialization for new projects

- [ ] **Dataview.js Query Generation**
  - Auto-generate dataview queries for SVCMS insights
  - Create queries by commit type, scope, time period, tags
  - Generate visual dashboards for team knowledge patterns
  - Support custom query templates in config

- [ ] **Knowledge Graph Integration**
  - Create cross-project insights and patterns
  - Link related memories across different repositories
  - Generate team knowledge sharing views
  - Support knowledge export/import between projects

- [ ] **Enhanced MCP Resources**
  - `svcms://obsidian-queries`: Generated dataview.js queries
  - `svcms://vault-status`: Current vault connection status
  - `svcms://knowledge-graph`: Cross-project insights

## Future Enhancements (After Core Features)

### Query & Prompt Refinement
- [ ] **Enhanced Query Capabilities**
  - Natural language query interpretation
  - Semantic search across memories and code changes
  - Time-based and author-based filtering
  - Cross-repository pattern recognition

- [ ] **Improved Prompts**
  - Context-aware commit message generation
  - Design decision documentation templates
  - Retrospective analysis prompts
  - Team knowledge sharing workflows

### Advanced Features
- [ ] **Team Collaboration**
  - Shared memory sync across team repositories
  - Knowledge conflict resolution strategies
  - Team-wide pattern recognition and insights

- [ ] **AI-Powered Insights**
  - Proactive memory surfacing based on current work
  - Pattern-based refactoring suggestions
  - Historical decision context for current changes

## Key Advantages We're Building

✅ **Git-Embedded Memory**: Every memory tied to actual code changes  
✅ **Auto-Diff Awareness**: AI sees both learnings AND code context  
🔄 **Tool-Enhanced Analysis**: ast-grep for structural understanding  
🔄 **Token-Efficient Context**: Smart extraction vs full file dumps  
🔄 **Team-Scalable**: Shared git history = shared team intelligence  

## Development Notes

- **Commit Defaults**: The `commit_defaults` in `./.synaptic/config.toml` enables auto-scoped commits:
  ```toml
  [commit_defaults]
  "src/api/*" = { scope = "api", category = "standard" }
  "src/auth/*" = { scope = "auth", category = "knowledge" }
  ```

- **MCP Advantage**: All-in-one package vs standalone CLI:
  - Embedded specification (no external file reads)
  - Native Claude integration (tools, not commands)
  - Real-time context access (diffs, configs, memories)
  - Structured interface (clean types, not text parsing)

- **Architecture Decision**: Keep Rust CLI for power users, MCP for AI integration
  - MCP Server: AI-native workflow integration
  - Rust CLI: Batch operations, CI/CD, power user tools

---

*Next: Let's start with external tool integration - ast-grep will unlock semantic diff awareness!*