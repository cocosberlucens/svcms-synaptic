//! Configuration management for Synaptic

use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Result, Context, anyhow};
use serde::{Deserialize, Serialize};

/// Synaptic configuration
#[derive(Debug, Deserialize, Serialize)]
pub struct SynapticConfig {
    pub sync: Option<SyncConfig>,
    pub obsidian: Option<ObsidianConfig>,
    pub commit_types: Option<CommitTypesConfig>,
    pub cleanup: Option<CleanupConfig>,
    pub query: Option<QueryConfig>,
    pub locations: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncConfig {
    pub default_depth: Option<usize>,
    pub auto_deduplicate: Option<bool>,
    pub dry_run: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ObsidianConfig {
    pub vault_path: Option<String>, // Now optional for project configs
    pub synaptic_folder: Option<String>,
    pub project_subfolder: Option<String>,
    pub project_name: Option<String>, // New: project-specific name
    pub enable_wikilinks: Option<bool>,
    pub enable_canvas: Option<bool>,
    pub template_path: Option<String>,
    pub dataview: Option<DataviewConfig>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DataviewConfig {
    pub default_limit: Option<usize>,
    pub enable_inline_queries: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CommitTypesConfig {
    // Legacy support for simple additional types
    pub additional: Option<Vec<String>>,
    #[serde(rename = "override")]
    pub override_types: Option<Vec<String>>,
    pub aliases: Option<std::collections::HashMap<String, String>>,
    
    // New two-tier system
    pub categories: Option<std::collections::HashMap<String, CommitTypeCategory>>,
    pub scopes: Option<CommitTypeScopesConfig>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CommitTypeCategory {
    pub description: String,
    pub types: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CommitTypeScopesConfig {
    pub modules: Option<std::collections::HashMap<String, ScopeConfig>>,
    pub cross_cutting: Option<std::collections::HashMap<String, ScopeConfig>>,
    pub tooling: Option<std::collections::HashMap<String, ScopeConfig>>,
    pub project_wide: Option<std::collections::HashMap<String, ScopeConfig>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScopeConfig {
    pub categories: Vec<String>, // "all" is special value meaning all categories
    pub custom_types: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CleanupConfig {
    pub mode: Option<String>,
    pub auto_cleanup_on_sync: Option<bool>,
    pub archive_format: Option<String>,
    pub retention_days: Option<u32>,
    pub validation: Option<ValidationConfig>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ValidationConfig {
    pub check_frequency: Option<String>,
    pub report_stale_memories: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct QueryConfig {
    pub default_source: Option<String>,
    pub show_context: Option<bool>,
}

impl SynapticConfig {
    /// Load configuration with layering: global + project-specific
    pub fn load() -> Result<Self> {
        // Load global config first
        let global_path = Self::default_config_path()?;
        let mut config = Self::load_from(&global_path)?;
        
        // Try to load project config and merge
        if let Ok(project_config) = Self::load_project_config() {
            config.merge(project_config);
        }
        
        Ok(config)
    }
    
    /// Load configuration from the default global location (legacy behavior)
    pub fn load_global() -> Result<Self> {
        let config_path = Self::default_config_path()?;
        Self::load_from(&config_path)
    }

    /// Load configuration from a specific path
    pub fn load_from(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }

        let content = fs::read_to_string(path)
            .context("Failed to read config file")?;
        
        let config: SynapticConfig = toml::from_str(&content)
            .context("Failed to parse config file")?;
        
        Ok(config)
    }

    /// Get the default global config file path
    pub fn default_config_path() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| anyhow!("Unable to determine home directory"))?;
        
        Ok(home_dir.join(".synaptic").join("config.toml"))
    }
    
    /// Get the project config file path
    pub fn project_config_path() -> Result<PathBuf> {
        // Find git root
        let git_root = Self::find_git_root()?;
        Ok(git_root.join(".synaptic").join("config.toml"))
    }
    
    /// Load project-specific configuration
    pub fn load_project_config() -> Result<Self> {
        let config_path = Self::project_config_path()?;
        Self::load_from(&config_path)
    }
    
    /// Find the git repository root
    fn find_git_root() -> Result<PathBuf> {
        let current_dir = std::env::current_dir()?;
        let repo = git2::Repository::discover(&current_dir)
            .context("Not in a git repository")?;
        
        repo.workdir()
            .ok_or_else(|| anyhow!("Repository has no working directory"))
            .map(|p| p.to_path_buf())
    }
    
    /// Merge another config into this one (project config overrides global)
    pub fn merge(&mut self, other: SynapticConfig) {
        // Merge sync config
        if let Some(other_sync) = other.sync {
            if let Some(ref mut sync) = self.sync {
                if other_sync.default_depth.is_some() {
                    sync.default_depth = other_sync.default_depth;
                }
                if other_sync.auto_deduplicate.is_some() {
                    sync.auto_deduplicate = other_sync.auto_deduplicate;
                }
                if other_sync.dry_run.is_some() {
                    sync.dry_run = other_sync.dry_run;
                }
            } else {
                self.sync = Some(other_sync);
            }
        }
        
        // Merge obsidian config
        if let Some(other_obsidian) = other.obsidian {
            if let Some(ref mut obsidian) = self.obsidian {
                // Don't override vault_path from project config (stays global)
                if other_obsidian.synaptic_folder.is_some() {
                    obsidian.synaptic_folder = other_obsidian.synaptic_folder;
                }
                if other_obsidian.project_subfolder.is_some() {
                    obsidian.project_subfolder = other_obsidian.project_subfolder;
                }
                // Project name is project-specific
                if other_obsidian.project_name.is_some() {
                    obsidian.project_name = other_obsidian.project_name;
                }
                if other_obsidian.enable_wikilinks.is_some() {
                    obsidian.enable_wikilinks = other_obsidian.enable_wikilinks;
                }
                if other_obsidian.enable_canvas.is_some() {
                    obsidian.enable_canvas = other_obsidian.enable_canvas;
                }
                if other_obsidian.template_path.is_some() {
                    obsidian.template_path = other_obsidian.template_path;
                }
                if other_obsidian.dataview.is_some() {
                    obsidian.dataview = other_obsidian.dataview;
                }
            } else {
                self.obsidian = Some(other_obsidian);
            }
        }
        
        // Merge commit types config
        if let Some(other_commit_types) = other.commit_types {
            if let Some(ref mut commit_types) = self.commit_types {
                // Only merge scopes from project config (categories stay global)
                if other_commit_types.scopes.is_some() {
                    commit_types.scopes = other_commit_types.scopes;
                }
                // Merge additional types
                if let Some(other_additional) = other_commit_types.additional {
                    if let Some(ref mut additional) = commit_types.additional {
                        additional.extend(other_additional);
                    } else {
                        commit_types.additional = Some(other_additional);
                    }
                }
            } else {
                self.commit_types = Some(other_commit_types);
            }
        }
        
        // Merge cleanup config (project can override)
        if other.cleanup.is_some() {
            self.cleanup = other.cleanup;
        }
        
        // Merge query config (project can override)
        if other.query.is_some() {
            self.query = other.query;
        }
        
        // Merge locations (project-specific)
        if let Some(other_locations) = other.locations {
            if let Some(ref mut locations) = self.locations {
                locations.extend(other_locations);
            } else {
                self.locations = Some(other_locations);
            }
        }
    }

    /// Create default configuration
    pub fn default() -> Self {
        Self {
            sync: Some(SyncConfig {
                default_depth: Some(100),
                auto_deduplicate: Some(true),
                dry_run: Some(false),
            }),
            obsidian: None,
            commit_types: None,
            cleanup: None,
            query: None,
            locations: None,
        }
    }

    /// Save configuration to the default location
    pub fn save(&self) -> Result<()> {
        let config_path = Self::default_config_path()?;
        self.save_to(&config_path)
    }

    /// Save configuration to a specific path
    pub fn save_to(&self, path: &Path) -> Result<()> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = toml::to_string_pretty(self)
            .context("Failed to serialize config")?;
        
        fs::write(path, content)
            .context("Failed to write config file")?;
        
        Ok(())
    }

    /// Get Obsidian configuration with defaults
    pub fn obsidian(&self) -> Option<&ObsidianConfig> {
        self.obsidian.as_ref()
    }

    /// Check if Obsidian integration is configured
    pub fn has_obsidian_config(&self) -> bool {
        self.obsidian.is_some()
    }

    /// Get the synaptic folder name (default: "synaptic")
    pub fn synaptic_folder(&self) -> String {
        self.obsidian
            .as_ref()
            .and_then(|o| o.synaptic_folder.as_ref())
            .cloned()
            .unwrap_or_else(|| "synaptic".to_string())
    }

    /// Get the project subfolder name (default: "projects")
    pub fn project_subfolder(&self) -> String {
        self.obsidian
            .as_ref()
            .and_then(|o| o.project_subfolder.as_ref())
            .cloned()
            .unwrap_or_else(|| "projects".to_string())
    }

    /// Create a sample configuration file
    pub fn create_sample_config() -> Result<()> {
        let config_path = Self::default_config_path()?;
        
        if config_path.exists() {
            return Err(anyhow!("Config file already exists at {}", config_path.display()));
        }

        let sample_config = Self {
            sync: Some(SyncConfig {
                default_depth: Some(100),
                auto_deduplicate: Some(true),
                dry_run: Some(false),
            }),
            obsidian: Some(ObsidianConfig {
                vault_path: Some("~/Documents/ObsidianVault".to_string()),
                synaptic_folder: Some("synaptic".to_string()),
                project_subfolder: Some("projects".to_string()),
                project_name: None, // Project-specific, not in global config
                enable_wikilinks: Some(true),
                enable_canvas: Some(true),
                template_path: None,
                dataview: Some(DataviewConfig {
                    default_limit: Some(20),
                    enable_inline_queries: Some(true),
                }),
            }),
            commit_types: Some(CommitTypesConfig {
                // Legacy support
                additional: Some(vec!["fixed".to_string(), "decided".to_string()]),
                override_types: None,
                aliases: Some({
                    let mut aliases = std::collections::HashMap::new();
                    aliases.insert("fixed".to_string(), "fix".to_string());
                    aliases.insert("decided".to_string(), "decision".to_string());
                    aliases
                }),
                // Two-tier system
                categories: Some({
                    let mut categories = std::collections::HashMap::new();
                    categories.insert("standard".to_string(), CommitTypeCategory {
                        description: "Standard Conventional Commits v1.0.0".to_string(),
                        types: vec!["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"]
                            .into_iter().map(|s| s.to_string()).collect(),
                    });
                    categories.insert("knowledge".to_string(), CommitTypeCategory {
                        description: "SVCMS Knowledge Types - discovered insights and learnings".to_string(),
                        types: vec!["learned", "insight", "context", "decision", "memory"]
                            .into_iter().map(|s| s.to_string()).collect(),
                    });
                    categories.insert("collaboration".to_string(), CommitTypeCategory {
                        description: "SVCMS Collaboration Types - team interactions and explorations".to_string(),
                        types: vec!["discussed", "explored", "attempted"]
                            .into_iter().map(|s| s.to_string()).collect(),
                    });
                    categories.insert("meta".to_string(), CommitTypeCategory {
                        description: "SVCMS Meta Types - process and methodology".to_string(),
                        types: vec!["workflow", "preference", "pattern"]
                            .into_iter().map(|s| s.to_string()).collect(),
                    });
                    categories
                }),
                scopes: Some(CommitTypeScopesConfig {
                    modules: Some({
                        let mut modules = std::collections::HashMap::new();
                        modules.insert("auth".to_string(), ScopeConfig {
                            categories: vec!["standard", "knowledge", "collaboration"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["integrated".to_string()],
                        });
                        modules.insert("api".to_string(), ScopeConfig {
                            categories: vec!["standard", "knowledge"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["migrated".to_string()],
                        });
                        modules.insert("scheduler".to_string(), ScopeConfig {
                            categories: vec!["all".to_string()],
                            custom_types: vec![],
                        });
                        modules.insert("database".to_string(), ScopeConfig {
                            categories: vec!["standard", "knowledge"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["seeded".to_string()],
                        });
                        modules
                    }),
                    cross_cutting: Some({
                        let mut cross_cutting = std::collections::HashMap::new();
                        cross_cutting.insert("architecture".to_string(), ScopeConfig {
                            categories: vec!["knowledge", "collaboration", "meta"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec![],
                        });
                        cross_cutting.insert("security".to_string(), ScopeConfig {
                            categories: vec!["knowledge", "collaboration"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["audited".to_string()],
                        });
                        cross_cutting.insert("performance".to_string(), ScopeConfig {
                            categories: vec!["standard", "knowledge"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["profiled".to_string()],
                        });
                        cross_cutting
                    }),
                    tooling: Some({
                        let mut tooling = std::collections::HashMap::new();
                        tooling.insert("eslint".to_string(), ScopeConfig {
                            categories: vec!["standard", "meta"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["configured".to_string()],
                        });
                        tooling.insert("webpack".to_string(), ScopeConfig {
                            categories: vec!["standard", "knowledge"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["optimized".to_string()],
                        });
                        tooling.insert("docker".to_string(), ScopeConfig {
                            categories: vec!["standard", "knowledge"].into_iter().map(|s| s.to_string()).collect(),
                            custom_types: vec!["containerized".to_string()],
                        });
                        tooling
                    }),
                    project_wide: Some({
                        let mut project_wide = std::collections::HashMap::new();
                        project_wide.insert("project".to_string(), ScopeConfig {
                            categories: vec!["all".to_string()],
                            custom_types: vec![],
                        });
                        project_wide.insert("global".to_string(), ScopeConfig {
                            categories: vec!["all".to_string()],
                            custom_types: vec![],
                        });
                        project_wide
                    }),
                }),
            }),
            cleanup: Some(CleanupConfig {
                mode: Some("archive".to_string()),
                auto_cleanup_on_sync: Some(true),
                archive_format: Some("dated".to_string()),
                retention_days: Some(30),
                validation: Some(ValidationConfig {
                    check_frequency: Some("weekly".to_string()),
                    report_stale_memories: Some(true),
                }),
            }),
            query: Some(QueryConfig {
                default_source: Some("unified".to_string()),
                show_context: Some(true),
            }),
            locations: Some({
                let mut locations = std::collections::HashMap::new();
                locations.insert("auth".to_string(), "src/authentication/CLAUDE.md".to_string());
                locations.insert("db".to_string(), "database/CLAUDE.md".to_string());
                locations
            }),
        };

        sample_config.save_to(&config_path)?;
        println!("📝 Created sample config at {}", config_path.display());
        
        Ok(())
    }
    
    /// Create a sample project configuration file
    pub fn create_sample_project_config(project_name: &str) -> Result<()> {
        let config_path = Self::project_config_path()?;
        
        if config_path.exists() {
            return Err(anyhow!("Project config already exists at {}", config_path.display()));
        }
        
        // Infer project name from git repo if not provided
        let final_project_name = if project_name.is_empty() {
            Self::infer_project_name()?
        } else {
            project_name.to_string()
        };
        
        let project_config = Self {
            sync: None, // Use global settings
            obsidian: Some(ObsidianConfig {
                vault_path: None, // Use global vault path
                synaptic_folder: None, // Use global settings
                project_subfolder: None, // Use global settings
                project_name: Some(final_project_name.clone()),
                enable_wikilinks: None, // Use global settings
                enable_canvas: None, // Use global settings
                template_path: None,
                dataview: None, // Use global settings
            }),
            commit_types: Some(CommitTypesConfig {
                additional: None, // Global only
                override_types: None,
                aliases: None, // Global only
                categories: None, // Global only - SVCMS standard categories
                scopes: Some(CommitTypeScopesConfig {
                    modules: Some({
                        let mut modules = std::collections::HashMap::new();
                        // Add some example module scopes based on common patterns
                        modules.insert("main".to_string(), ScopeConfig {
                            categories: vec!["standard".to_string(), "knowledge".to_string()],
                            custom_types: vec![],
                        });
                        modules
                    }),
                    cross_cutting: None,
                    tooling: None,
                    project_wide: None,
                }),
            }),
            cleanup: None, // Use global settings
            query: None, // Use global settings
            locations: Some({
                let mut locations = std::collections::HashMap::new();
                locations.insert("main".to_string(), "src/CLAUDE.md".to_string());
                locations
            }),
        };
        
        project_config.save_to(&config_path)?;
        println!("📝 Created project config at {}", config_path.display());
        println!("   Project name: {}", final_project_name);
        println!("   Edit .synaptic/config.toml to add your project-specific scopes");
        
        Ok(())
    }
    
    /// Infer project name from git repository
    fn infer_project_name() -> Result<String> {
        let git_root = Self::find_git_root()?;
        git_root.file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow!("Could not infer project name from directory"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_config_serialization() {
        let config = SynapticConfig::default();
        let toml_str = toml::to_string(&config).unwrap();
        assert!(toml_str.contains("[sync]"));
    }

    #[test]
    fn test_config_deserialization() {
        let toml_content = r#"
[sync]
default_depth = 50

[obsidian]
vault_path = "/test/vault"
synaptic_folder = "synaptic"
"#;
        
        let config: SynapticConfig = toml::from_str(toml_content).unwrap();
        assert_eq!(config.sync.unwrap().default_depth, Some(50));
        assert_eq!(config.obsidian.unwrap().vault_path, Some("/test/vault".to_string()));
    }

    #[test]
    fn test_config_save_load() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("config.toml");
        
        let original_config = SynapticConfig::default();
        original_config.save_to(&config_path).unwrap();
        
        let loaded_config = SynapticConfig::load_from(&config_path).unwrap();
        assert!(loaded_config.sync.is_some());
    }
}