use anyhow::Result;
use clap::{Parser, Subcommand};
use synaptic::{git, memory, config::SynapticConfig, obsidian::ObsidianManager};

#[derive(Parser)]
#[command(name = "synaptic")]
#[command(version, about = "Transform Git commits into Claude Code memories using SVCMS", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Sync commit memories to CLAUDE.md files
    Sync {
        /// Number of commits to process
        #[arg(short, long, default_value = "100")]
        depth: usize,
        
        /// Preview changes without writing files
        #[arg(long)]
        dry_run: bool,
        
        /// Process commits since this date (YYYY-MM-DD)
        #[arg(long)]
        since: Option<String>,
    },
    
    /// Show statistics about SVCMS commits
    Stats,
    
    /// Initialize Synaptic in the current project
    Init {
        /// Create global config (~/.synaptic/config.toml)
        #[arg(long)]
        global: bool,
        
        /// Create project config (.synaptic/config.toml)
        #[arg(long)]
        project: bool,
        
        /// Specify project name (for project config)
        #[arg(long)]
        project_name: Option<String>,
    },
    
    /// Vault operations
    #[command(subcommand)]
    Vault(VaultCommands),
}

#[derive(Subcommand)]
enum VaultCommands {
    /// Initialize Obsidian vault structure
    Init,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Sync { depth, dry_run, since } => {
            println!("🧠 Synaptic Memory Sync");
            
            // Get the current directory as the repo path
            let repo_path = std::env::current_dir()?
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Invalid current directory"))?
                .to_string();
            
            // Get commits based on parameters
            let commits = if let Some(since_date) = since {
                println!("Processing commits since {}...", since_date);
                git::get_svcms_commits_since(&repo_path, &since_date)?
            } else {
                println!("Processing {} commits...", depth);
                git::get_svcms_commits(&repo_path, depth)?
            };
            
            if dry_run {
                println!("(dry run - no files will be modified)");
            }
            
            // Try to load config for Obsidian integration
            let config = SynapticConfig::load().ok();
            
            if let Some(config) = &config {
                if let Some(obsidian_config) = config.obsidian() {
                    // Get vault path, check if it exists
                    if let Some(vault_path_str) = &obsidian_config.vault_path {
                        // Expand tilde in vault path
                        let vault_path = if vault_path_str.starts_with("~/") {
                            if let Some(home) = dirs::home_dir() {
                                home.join(&vault_path_str[2..])
                            } else {
                                std::path::PathBuf::from(vault_path_str)
                            }
                        } else {
                            std::path::PathBuf::from(vault_path_str)
                        };
                        
                        let synaptic_folder = config.synaptic_folder();
                        
                        // Get project name from config
                        let project_name = config.obsidian()
                            .and_then(|o| o.project_name.as_ref())
                            .map(|s| s.as_str())
                            .unwrap_or_else(|| {
                                // Fallback to repo folder name
                                std::path::Path::new(&repo_path)
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("unknown-project")
                            });
                        
                        // Try Obsidian integration
                        match ObsidianManager::new(vault_path, synaptic_folder) {
                            Ok(obsidian_manager) => {
                                // Sync with Obsidian integration
                                memory::sync_memories_with_obsidian(commits, &repo_path, dry_run, &obsidian_manager, project_name)?;
                            }
                            Err(e) => {
                                println!("⚠️  Obsidian integration unavailable: {}", e);
                                println!("🔄 Falling back to CLAUDE.md-only sync...");
                                memory::sync_memories(commits, &repo_path, dry_run)?;
                            }
                        }
                    } else {
                        // No vault path configured
                        println!("⚠️  No vault_path in [obsidian] config");
                        println!("🔄 Using CLAUDE.md-only sync...");
                        memory::sync_memories(commits, &repo_path, dry_run)?;
                    }
                } else {
                    // No Obsidian config, use regular sync
                    memory::sync_memories(commits, &repo_path, dry_run)?;
                }
            } else {
                // No config file, use regular sync
                memory::sync_memories(commits, &repo_path, dry_run)?;
            }
            
            Ok(())
        }
        Commands::Stats => {
            // Get the current directory as the repo path
            let repo_path = std::env::current_dir()?
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Invalid current directory"))?
                .to_string();
            
            // Get all commits (up to 1000)
            let commits = git::get_svcms_commits(&repo_path, 1000)?;
            
            // Print statistics
            git::print_commit_stats(&commits);
            
            Ok(())
        }
        Commands::Init { global, project, project_name } => {
            // If no specific flag, show general instructions
            if !global && !project {
                println!("🚀 Initializing Synaptic...");
                println!("\nTo use Synaptic effectively:");
                println!("1. Follow the SVCMS specification when committing");
                println!("2. Use extended commit types: learned, insight, decision, etc.");
                println!("3. Include Memory: fields for key insights");
                println!("4. Run 'synaptic sync' to update CLAUDE.md files");
                
                println!("\n📝 Configuration options:");
                println!("   synaptic init --global       # Create global config (~/.synaptic/config.toml)");
                println!("   synaptic init --project      # Create project config (.synaptic/config.toml)");
                
                // Check if .git exists
                if !std::path::Path::new(".git").exists() {
                    println!("\n⚠️  Warning: No .git directory found. Initialize a git repository first.");
                }
                
                return Ok(());
            }
            
            // Create global config
            if global {
                match SynapticConfig::create_sample_config() {
                    Ok(_) => println!("✅ Global config created successfully!"),
                    Err(e) => {
                        if e.to_string().contains("already exists") {
                            println!("⚠️  Global config already exists");
                        } else {
                            return Err(e);
                        }
                    }
                }
            }
            
            // Create project config
            if project {
                if !std::path::Path::new(".git").exists() {
                    return Err(anyhow::anyhow!("Not in a git repository. Initialize git first."));
                }
                
                let project_name_str = project_name.as_deref().unwrap_or("");
                match SynapticConfig::create_sample_project_config(project_name_str) {
                    Ok(_) => println!("✅ Project config created successfully!"),
                    Err(e) => {
                        if e.to_string().contains("already exists") {
                            println!("⚠️  Project config already exists");
                        } else {
                            return Err(e);
                        }
                    }
                }
            }
            
            Ok(())
        }
        Commands::Vault(vault_cmd) => {
            match vault_cmd {
                VaultCommands::Init => {
                    println!("🔮 Initializing Obsidian vault structure...");
                    
                    // Check if config file exists
                    let config_path = SynapticConfig::default_config_path()?;
                    let config_exists = config_path.exists();
                    
                    // Load config
                    let config = SynapticConfig::load()?;
                    
                    // Check if Obsidian is configured
                    if !config_exists || config.obsidian().is_none() {
                        if !config_exists {
                            println!("\n⚠️  No config file found. Creating sample config...");
                        } else {
                            println!("\n⚠️  No [obsidian] section found in config.");
                        }
                        
                        match SynapticConfig::create_sample_config() {
                            Ok(_) => {
                                println!("\n✅ Sample config created at ~/.synaptic/config.toml");
                                println!("\nNext steps:");
                                println!("1. Edit ~/.synaptic/config.toml");
                                println!("2. Set the correct vault_path in [obsidian] section");
                                println!("3. Run 'synaptic vault init' again");
                                return Ok(());
                            }
                            Err(e) => {
                                println!("\n❌ Failed to create config: {}", e);
                                println!("\nPlease manually add to ~/.synaptic/config.toml:");
                                println!("[obsidian]");
                                println!("vault_path = \"/path/to/your/obsidian/vault\"");
                                println!("synaptic_folder = \"synaptic\"");
                                return Ok(());
                            }
                        }
                    }
                    
                    if let Some(obsidian_config) = config.obsidian() {
                        if let Some(vault_path_str) = &obsidian_config.vault_path {
                            // Expand tilde in vault path
                            let vault_path = if vault_path_str.starts_with("~/") {
                                if let Some(home) = dirs::home_dir() {
                                    home.join(&vault_path_str[2..])
                                } else {
                                    std::path::PathBuf::from(vault_path_str)
                                }
                            } else {
                                std::path::PathBuf::from(vault_path_str)
                            };
                        
                            let synaptic_folder = config.synaptic_folder();
                            
                            match ObsidianManager::new(vault_path.clone(), synaptic_folder) {
                                Ok(manager) => {
                                    match manager.init_vault_structure() {
                                        Ok(_) => {
                                            println!("\n✅ Vault structure initialized successfully!");
                                            println!("📁 Location: {}", vault_path.display());
                                            println!("📂 Synaptic folder: {}", manager.synaptic_path().display());
                                            println!("\nYou can now use 'synaptic sync' to sync commits to both CLAUDE.md and Obsidian!");
                                        }
                                        Err(e) => {
                                            println!("\n❌ Failed to initialize vault structure: {}", e);
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("\n❌ Failed to access vault: {}", e);
                                    println!("\n💡 Make sure the vault_path in your config is correct:");
                                    println!("   Current path: {}", vault_path.display());
                                }
                            }
                        } else {
                            println!("\n⚠️  No vault_path configured in [obsidian] section");
                            println!("💡 Add vault_path to your config file");
                        }
                    }
                    
                    Ok(())
                }
            }
        }
    }
}
