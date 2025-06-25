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
    pub vault_path: String,
    pub synaptic_folder: Option<String>,
    pub project_subfolder: Option<String>,
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
    pub additional: Option<Vec<String>>,
    #[serde(rename = "override")]
    pub override_types: Option<Vec<String>>,
    pub aliases: Option<std::collections::HashMap<String, String>>,
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
    /// Load configuration from the default location
    pub fn load() -> Result<Self> {
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

    /// Get the default config file path
    pub fn default_config_path() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| anyhow!("Unable to determine home directory"))?;
        
        Ok(home_dir.join(".synaptic").join("config.toml"))
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
                vault_path: "~/Documents/ObsidianVault".to_string(),
                synaptic_folder: Some("synaptic".to_string()),
                project_subfolder: Some("projects".to_string()),
                enable_wikilinks: Some(true),
                enable_canvas: Some(true),
                template_path: None,
                dataview: Some(DataviewConfig {
                    default_limit: Some(20),
                    enable_inline_queries: Some(true),
                }),
            }),
            commit_types: Some(CommitTypesConfig {
                additional: Some(vec!["fixed".to_string(), "decided".to_string()]),
                override_types: None,
                aliases: Some({
                    let mut aliases = std::collections::HashMap::new();
                    aliases.insert("fixed".to_string(), "fix".to_string());
                    aliases.insert("decided".to_string(), "decision".to_string());
                    aliases
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
        assert_eq!(config.obsidian.unwrap().vault_path, "/test/vault");
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