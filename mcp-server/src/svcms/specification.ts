/**
 * Embedded SVCMS Specification in AI-Optimized Format
 * 
 * This specification is hardcoded for maximum context efficiency and 
 * ensures consistent SVCMS behavior across all AI interactions.
 */

export const SVCMS_SPECIFICATION = {
  // Core Directive
  core: "Commit frequently with semantic messages capturing what+why+learned",
  
  // Commit Triggers - When to create commits
  triggers: [
    "new_function",
    "bug_fix", 
    "refactor",
    "learning",
    "design_decision",
    "failed_attempt",
    "conversation_milestone",
    "before_context_switch"
  ],
  
  // Commit Format
  format: {
    syntax: "<category>.<type>(<scope>): <summary>",
    legacy_support: "<type>(<scope>): <summary>",
    body_structure: [
      "<body - explain what and why, not how>",
      "",
      "Context: <project/module/conversation context>", 
      "Refs: <#issue, docs/file.md, commit-sha>",
      "Memory: <key insight for future CC sessions>",
      "Location: <target CLAUDE.md path for memory sync>",
      "Tags: <searchable keywords>"
    ]
  },
  
  // Two-Tier Category System
  categories: {
    // Standard (Conventional Commits v1.0.0)
    standard: {
      feat: "New feature",
      fix: "Bug fix", 
      docs: "Documentation only",
      style: "Code style (formatting, semicolons, etc)",
      refactor: "Code restructuring without behavior change",
      perf: "Performance improvements",
      test: "Adding or modifying tests",
      build: "Build system or dependencies", 
      ci: "CI configuration",
      chore: "Maintenance tasks"
    },
    
    // Knowledge (SVCMS Discovery Types)  
    knowledge: {
      learned: "Discovered behavior, pattern, or constraint",
      insight: "Recognized optimization or improvement opportunity",
      context: "Important circumstantial information", 
      decision: "Architectural or design choice with rationale",
      memory: "Explicit knowledge to persist for future sessions"
    },
    
    // Collaboration (SVCMS Team Types)
    collaboration: {
      discussed: "Key points from conversations",
      explored: "Investigation findings or research results", 
      attempted: "Tried approaches (successes and failures)"
    },
    
    // Meta (SVCMS Process Types)
    meta: {
      workflow: "Process or methodology establishment",
      preference: "User preferences and coding style choices",
      pattern: "Recurring patterns identified in codebase or workflow"
    }
  },
  
  // Scope Guidelines
  scopes: {
    guidelines: [
      "Use specific module/component names: auth, api, scheduler, database",
      "For cross-cutting concerns: architecture, security, performance", 
      "For tooling: eslint, webpack, docker",
      "For project-wide: project, global"
    ],
    examples: {
      modules: ["auth", "api", "scheduler", "database", "ui", "core"],
      cross_cutting: ["architecture", "security", "performance", "testing"],
      tooling: ["eslint", "webpack", "docker", "ci", "build"],
      project_wide: ["project", "global", "config"]
    }
  },
  
  // Memory Field Best Practices
  memory_guidelines: [
    "Concise, actionable insights",
    "Constraints or limitations discovered", 
    "Patterns to follow or avoid",
    "User preferences and specific requirements",
    "Technical decisions and their rationale"
  ],
  
  // Location Field Usage
  location_guidelines: {
    patterns: {
      project_wide: "./CLAUDE.md",
      module_specific: "src/{scope}/CLAUDE.md",
      global_user: "~/.claude/CLAUDE.md"
    },
    inference: "Synaptic tool infers from scope if omitted"
  },
  
  // Empty Commits for Pure Knowledge
  empty_commits: {
    when: [
      "Design decisions without code changes",
      "Research findings",
      "Architectural discussions", 
      "Failed experiments with learnings",
      "Collaborative insights"
    ],
    syntax: "git commit --allow-empty -m \"...\""
  },
  
  // Auto-Diff Integration (THE KEY DIFFERENTIATOR)
  auto_diff: {
    advantage: "Every SVCMS commit provides automatic code context via git diff",
    components: [
      "Semantic Intent: What you were trying to achieve",
      "Code Changes: Exact diff of what changed (via git)",
      "Learned Context: What was discovered or decided", 
      "Future Guidance: Memories for subsequent sessions"
    ],
    workflow: [
      "AI sees changes in real-time via git diff",
      "Intelligent commit suggestions based on diff analysis", 
      "Query with full context (commit message + diff + memories)",
      "Pattern recognition across similar code changes"
    ]
  }
} as const;

// AI Workflow Instructions (embedded at protocol level)
export const AI_WORKFLOW_INSTRUCTIONS = `
You are working in an SVCMS-enabled repository with automatic diff awareness and external tool integration.

KEY BEHAVIORS:
1. ALWAYS analyze current diff before suggesting actions
2. Use ast-grep for structural analysis when examining code patterns
3. Create semantic commits after EVERY meaningful change
4. Use empty commits for pure decisions/discussions
5. Query past learnings WITH diff AND structural context before implementing
6. Surface relevant past changes proactively using pattern matching

POWERFUL FEATURES:
- Every commit includes automatic code diff
- ast-grep provides structural pattern analysis, not just text matching
- ripgrep enables blazing-fast searches across large codebases
- You can search memories by code patterns AND structural signatures
- Similar past changes are automatically surfaced with context optimization
- Team knowledge is embedded in git history with semantic understanding
- Custom tools provide domain-specific analysis capabilities

ENHANCED WORKFLOW:
1. Structural analysis: "ast-grep shows you modified error handling patterns"
2. Context search: "ripgrep found 5 similar JWT implementations"
3. Pattern recognition: "This matches the auth refactor pattern from commit abc123"
4. Targeted queries: "Previous try-catch removals needed Promise handling"
5. Optimized context: "Extracting just function signatures, not full files"
6. Semantic commit: "knowledge.learned(auth): error boundaries need async handling"
7. Memory extraction: "Key structural insight for future sessions"

TOOL USAGE:
- Use svcms_analyze_commit_structural for deep code change analysis
- Use svcms_search_patterns for finding similar code structures
- Use svcms_optimize_context to extract minimal relevant information
- Leverage external tools to understand WHY changes matter structurally
`;

// Compressed specification for token efficiency
export const SVCMS_SPEC_COMPRESSED = {
  core: "Commit frequently: semantic messages = what+why+learned",
  format: "category.type(scope): summary + Memory: insight + auto-diff context",
  categories: ["standard", "knowledge", "collaboration", "meta"], 
  key_types: ["feat", "fix", "learned", "decided", "discussed", "attempted"],
  auto_diff: "Every commit = semantic intent + code changes + learned context",
  workflow: "analyze diff → query patterns → apply learnings → commit semantic → extract memory"
} as const;