//! Memory synchronization to CLAUDE.md files

use std::path::PathBuf;
use anyhow::{Result, Context};
use crate::SvcmsCommit;

/// Determine the target CLAUDE.md file for a commit
pub fn determine_memory_location(commit: &SvcmsCommit, project_root: &str) -> PathBuf {
    if let Some(location) = &commit.location {
        // Explicit location specified
        PathBuf::from(project_root).join(location)
    } else if let Some(scope) = &commit.scope {
        // Infer from scope
        match scope.as_str() {
            "global" | "project" => PathBuf::from(project_root).join("CLAUDE.md"),
            _ => PathBuf::from(project_root).join(format!("src/{}/CLAUDE.md", scope)),
        }
    } else {
        // Default to project root
        PathBuf::from(project_root).join("CLAUDE.md")
    }
}

/// Sync memories from commits to CLAUDE.md files
pub fn sync_memories(commits: Vec<SvcmsCommit>, project_root: &str, dry_run: bool) -> Result<()> {
    // TODO: Implement memory sync logic
    println!("Would sync {} commits with memories", 
        commits.iter().filter(|c| c.memory.is_some()).count());
    
    Ok(())
}
