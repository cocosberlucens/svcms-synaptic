//! Git repository interaction

use git2::Repository;
use anyhow::{Result, Context};
use crate::SvcmsCommit;
use crate::parser::parse_commit_message;

/// Get SVCMS commits from the repository
pub fn get_svcms_commits(repo_path: &str, depth: usize) -> Result<Vec<SvcmsCommit>> {
    let repo = Repository::open(repo_path)
        .context("Failed to open Git repository")?;
    
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    
    let mut commits = Vec::new();
    let mut count = 0;
    
    for oid in revwalk {
        if count >= depth {
            break;
        }
        
        let oid = oid?;
        let commit = repo.find_commit(oid)?;
        
        // Parse commit message
        if let Some(message) = commit.message() {
            let timestamp = chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
                .unwrap_or_default();
            
            if let Some(svcms_commit) = parse_commit_message(&oid.to_string(), message, timestamp)? {
                commits.push(svcms_commit);
            }
        }
        
        count += 1;
    }
    
    Ok(commits)
}
