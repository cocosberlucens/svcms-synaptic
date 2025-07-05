# Auto-Discovery Algorithm Design

*Zero-config module discovery for SVCMS Synaptic MCP Server*

## Core Algorithm

### Phase 1: Directory Scanning
```typescript
async function discoverModules(projectRoot: string): Promise<DiscoveredModule[]> {
  const srcPath = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcPath)) {
    return []; // No src/ directory, return empty
  }
  
  const modules: DiscoveredModule[] = [];
  const entries = await fs.readdir(srcPath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const moduleName = entry.name;
      const modulePath = path.join(srcPath, moduleName);
      
      // Skip common non-module directories
      if (SKIP_DIRECTORIES.includes(moduleName)) {
        continue;
      }
      
      const module = await analyzeModule(moduleName, modulePath);
      modules.push(module);
    }
  }
  
  return modules;
}
```

### Phase 2: Module Analysis
```typescript
async function analyzeModule(name: string, path: string): Promise<DiscoveredModule> {
  const hasFiles = await hasSourceFiles(path);
  const claudeFilePath = path.join(path, 'CLAUDE.md');
  const hasClaudeFile = fs.existsSync(claudeFilePath);
  
  return {
    name,
    path,
    claudeFilePath,
    hasClaudeFile,
    hasSourceFiles: hasFiles,
    categories: inferCategories(name),
    patterns: [`src/${name}/**`],
    needsCreation: hasFiles && !hasClaudeFile
  };
}
```

### Phase 3: Category Inference
```typescript
function inferCategories(moduleName: string): string[] {
  const defaultCategories = ['standard', 'knowledge'];
  
  // Special cases that might need collaboration
  const collaborativeModules = ['api', 'auth', 'security', 'architecture'];
  if (collaborativeModules.includes(moduleName)) {
    return ['standard', 'knowledge', 'collaboration'];
  }
  
  return defaultCategories;
}
```

## Auto-Creation Logic

### CLAUDE.md Template Generation
```typescript
async function createClaudeFile(module: DiscoveredModule): Promise<void> {
  const template = `# ${capitalizeFirst(module.name)} Module

## SVCMS Memories

*Automatically synced by Synaptic*

`;

  if (!module.hasClaudeFile && module.hasSourceFiles) {
    await fs.writeFile(module.claudeFilePath, template, 'utf8');
    logger.info(`✅ Created ${module.claudeFilePath}`);
  }
}
```

## Configuration Integration

### Merging with Project Config
```typescript
function mergeWithProjectConfig(
  discoveredModules: DiscoveredModule[],
  projectConfig: ProjectConfig
): FinalConfiguration {
  const result = {
    modules: new Map<string, ModuleConfig>(),
    crossCutting: projectConfig.cross_cutting || {}
  };
  
  // Start with auto-discovered modules
  for (const module of discoveredModules) {
    result.modules.set(module.name, {
      location: module.claudeFilePath,
      categories: module.categories,
      patterns: module.patterns
    });
  }
  
  // Override with explicit project config
  for (const [name, config] of Object.entries(projectConfig.modules || {})) {
    if (result.modules.has(name)) {
      // Merge with discovered module
      const existing = result.modules.get(name)!;
      result.modules.set(name, {
        ...existing,
        ...config,
        categories: config.categories || existing.categories
      });
    } else {
      // Add new module not auto-discovered
      result.modules.set(name, {
        location: `src/${name}/CLAUDE.md`,
        patterns: [`src/${name}/**`],
        ...config
      });
    }
  }
  
  return result;
}
```

## Constants and Configuration

### Skip Patterns
```typescript
const SKIP_DIRECTORIES = [
  // Build/output directories
  'dist', 'build', 'out', 'target',
  // Dependencies
  'node_modules', 'vendor',
  // IDE/Editor
  '.vscode', '.idea',
  // Version control
  '.git', '.svn',
  // Cache
  '.cache', 'tmp', 'temp',
  // Tests (handled separately)
  '__tests__', '__mocks__'
];
```

### File Detection Patterns
```typescript
const SOURCE_FILE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',  // TypeScript/JavaScript
  '.py', '.pyx',                 // Python
  '.rs',                         // Rust
  '.go',                         // Go
  '.java', '.kt',                // JVM languages
  '.c', '.cpp', '.h', '.hpp',    // C/C++
  '.rb',                         // Ruby
  '.php',                        // PHP
  '.cs',                         // C#
  '.swift',                      // Swift
];
```

## Algorithm Benefits

### 1. **Zero Configuration**
- Works immediately on any project with `src/` structure
- No manual setup required for common cases

### 2. **Intelligent Defaults**
- Sensible category assignments based on module names
- Common patterns recognized automatically

### 3. **Non-Destructive**
- Never overwrites existing CLAUDE.md files
- Respects manual configurations and overrides

### 4. **Extensible**
- Easy to add new patterns and recognition rules
- Supports project-specific overrides

### 5. **Performance**
- Efficient single-pass directory scanning
- Minimal file system operations

## Error Handling

### Graceful Degradation
```typescript
try {
  const modules = await discoverModules(projectRoot);
  logger.info(`✅ Discovered ${modules.length} modules`);
  return modules;
} catch (error) {
  logger.warn(`⚠️ Auto-discovery failed: ${error.message}`);
  return []; // Fall back to manual configuration only
}
```

### Validation
```typescript
function validateDiscoveredModule(module: DiscoveredModule): boolean {
  // Ensure module name is valid
  if (!module.name || module.name.includes('..')) {
    return false;
  }
  
  // Ensure path is within project
  if (!module.path.startsWith(projectRoot)) {
    return false;
  }
  
  return true;
}
```

## Integration Points

### MCP Server Integration
- **svcms_sync**: Uses auto-discovery to determine target locations
- **svcms_suggest_commit**: Uses discovered modules for scope suggestions
- **svcms_memory_stats**: Includes auto-discovered modules in analysis

### Configuration Loader
- **Phase 1**: Load global config
- **Phase 2**: Run auto-discovery
- **Phase 3**: Load project config and merge
- **Phase 4**: Create missing CLAUDE.md files

## Testing Strategy

### Unit Tests
- Directory scanning with various structures
- Category inference for different module names
- Configuration merging logic

### Integration Tests
- Full auto-discovery on real project structures
- CLAUDE.md file creation and content validation
- Error handling with malformed directories

---

*Auto-Discovery: Making zero-config SVCMS a reality through intelligent analysis.*