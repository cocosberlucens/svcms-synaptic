# SVCMS Synaptic MCP Server - Development TODO

## Next Implementation Phases

### 1. ✅ External Tool Integration (ast-grep, ripgrep) - COMPLETED
- [x] **Tool Detection & Verification**
  - ✅ Comprehensive tool availability checking with version detection
  - ✅ Custom rules discovery in `./ast/` directory
  - ✅ Custom tree-sitter grammars detection in `./.tree-sitter/`
  - ✅ Graceful fallbacks when tools are missing

- [x] **AST-Grep Integration**
  - ✅ Structural diff analysis using ast-grep patterns
  - ✅ Pattern-based commit suggestions (error, auth, api, ui patterns)
  - ✅ Semantic code search for similar past changes
  - ✅ Project-specific patterns in config.toml with significance levels

- [x] **Ripgrep Integration**
  - ✅ Fast content search with JSON output support
  - ✅ Context-optimized searches with configurable ignore patterns
  - ✅ Integration with SVCMS commit search
  - ✅ Support for multiline and context lines configuration

- [x] **Enhanced MCP Tools**
  - ✅ `svcms_analyze_structural`: Deep structural analysis with ast-grep
  - ✅ `svcms_suggest_commit`: Enhanced with pattern-based analysis
  - ✅ `svcms_test_tools`: Tool capability verification and recommendations
  - ✅ Updated existing tools to leverage external tools

**New Configuration Options Added:**
```toml
[tools.ast_grep]
enabled = true
rules_directory = "./ast"              # Custom rules auto-discovery
custom_grammars_dir = "./.tree-sitter" # Custom tree-sitter grammars
project_patterns = [
  { pattern = "useAuth($HOOK)", significance = "high", commit_hint = "auth" }
]
commit_analysis = {
  error_patterns = ["throw new Error($MSG)", "console.error($MSG)"]
  auth_patterns = ["jwt.sign($PAYLOAD)", "passport.authenticate($STRATEGY)"]
  api_patterns = ["app.get($PATH, $HANDLER)", "fetch($URL)"]
  ui_patterns = ["React.useState($INITIAL)", "useEffect($EFFECT)"]
}
```

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
✅ **Tool-Enhanced Analysis**: ast-grep for structural understanding  
🔄 **Token-Efficient Context**: Smart extraction vs full file dumps  
🔄 **Team-Scalable**: Shared git history = shared team intelligence  

## Development Notes

- **Commit Defaults**: The `commit_defaults` in `./.synaptic/config.toml` enables auto-scoped commits:
  ```toml
  [commit_defaults]
  "src/api/*" = { scope = "api", category = "standard" }
  "src/auth/*" = { scope = "auth", category = "knowledge" }
  "src/tools/*" = { scope = "tools", category = "knowledge" }
  ```

- **Custom ast-grep Integration**: Auto-discovers project-specific customizations:
  - Custom rules in `./ast/*.yml` files (following your pattern!)
  - Custom tree-sitter grammars in `./.tree-sitter/*.so`
  - Project-specific patterns for commit analysis
  - Intelligent fallback when tools are unavailable

- **Enhanced MCP Resources**:
  - `svcms://tool-capabilities`: Real-time tool detection status
  - `svcms://current-diff`: Live working directory changes
  - `svcms://config`: Merged global and project configuration
  - `svcms://specification`: AI-optimized SVCMS specification

- **MCP Advantage**: All-in-one package vs standalone CLI:
  - Embedded specification (no external file reads)
  - Native Claude integration (tools, not commands)
  - Real-time context access (diffs, configs, memories)
  - Structured interface (clean types, not text parsing)
  - Smart semantic analysis with ast-grep patterns

- **Architecture Decision**: Keep Rust CLI for power users, MCP for AI integration
  - MCP Server: AI-native workflow integration with semantic analysis
  - Rust CLI: Batch operations, CI/CD, power user tools

## Future Refinements Planned

- **Enhanced Configuration Options**:
  - `ast_grep_custom_grammars_folder`: Configurable grammar directory
  - `ast_grep_custom_rules_folder`: Configurable rules directory
  - More granular pattern matching and significance levels
  - Project-specific commit type mappings

---

*Next Priority: Implement memory sync to CLAUDE.md files with smart placement logic!*