use anyhow::Result;
use clap::{Parser, Subcommand};
use synaptic::{git, memory};

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
            
            // Sync memories to CLAUDE.md files
            memory::sync_memories(commits, &repo_path, dry_run)?;
            
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
        Commands::Init => {
            println!("🚀 Initializing Synaptic in current project...");
            println!("\nTo use Synaptic effectively:");
            println!("1. Follow the SVCMS specification when committing");
            println!("2. Use extended commit types: learned, insight, decision, etc.");
            println!("3. Include Memory: fields for key insights");
            println!("4. Run 'synaptic sync' to update CLAUDE.md files");
            
            // Check if .git exists
            if !std::path::Path::new(".git").exists() {
                println!("\n⚠️  Warning: No .git directory found. Initialize a git repository first.");
            }
            
            Ok(())
        }
    }
}
