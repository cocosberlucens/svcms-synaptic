//! Git repository interaction

use git2::Repository;
use anyhow::{Result, Context};
use chrono::{Utc, TimeZone};
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
            // Convert git2 time to chrono DateTime
            let timestamp = Utc.timestamp_opt(commit.time().seconds(), 0)
                .single()
                .unwrap_or_else(Utc::now);
            
            // Use short SHA (first 7 chars) like git log
            let sha = oid.to_string()[..7].to_string();
            
            if let Some(svcms_commit) = parse_commit_message(&sha, message, timestamp)? {
                commits.push(svcms_commit);
            }
        }
        
        count += 1;
    }
    
    Ok(commits)
}

/// Get SVCMS commits since a specific date
pub fn get_svcms_commits_since(repo_path: &str, since_date: &str) -> Result<Vec<SvcmsCommit>> {
    let repo = Repository::open(repo_path)
        .context("Failed to open Git repository")?;
    
    // Parse the since date
    let since_timestamp = chrono::NaiveDate::parse_from_str(since_date, "%Y-%m-%d")
        .context("Invalid date format. Use YYYY-MM-DD")?
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp();
    
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    
    let mut commits = Vec::new();
    
    for oid in revwalk {
        let oid = oid?;
        let commit = repo.find_commit(oid)?;
        
        // Stop if we've gone past the since date
        if commit.time().seconds() < since_timestamp {
            break;
        }
        
        // Parse commit message
        if let Some(message) = commit.message() {
            let timestamp = Utc.timestamp_opt(commit.time().seconds(), 0)
                .single()
                .unwrap_or_else(Utc::now);
            
            let sha = oid.to_string()[..7].to_string();
            
            if let Some(svcms_commit) = parse_commit_message(&sha, message, timestamp)? {
                commits.push(svcms_commit);
            }
        }
    }
    
    Ok(commits)
}

/// Print a summary of SVCMS commits
pub fn print_commit_stats(commits: &[SvcmsCommit]) {
    use colored::Colorize;
    
    let total = commits.len();
    let with_memory = commits.iter().filter(|c| c.memory.is_some()).count();
    
    // Count by type
    let mut type_counts = std::collections::HashMap::new();
    for commit in commits {
        *type_counts.entry(commit.commit_type.as_str()).or_insert(0) += 1;
    }
    
    println!("\n📊 {} SVCMS Statistics", "Synaptic".bright_blue());
    println!("─────────────────────────");
    println!("Total SVCMS commits: {}", total.to_string().bright_green());
    println!("Commits with memories: {}", with_memory.to_string().bright_yellow());
    
    if !type_counts.is_empty() {
        println!("\nCommit types:");
        let mut types: Vec<_> = type_counts.iter().collect();
        types.sort_by_key(|(_, count)| -(**count as i32));
        
        for (commit_type, count) in types {
            println!("  {}: {}", commit_type.bright_cyan(), count);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    fn create_test_repo() -> Result<(TempDir, Repository)> {
        let dir = TempDir::new()?;
        let repo = Repository::init(dir.path())?;
        
        // Configure git author
        let mut config = repo.config()?;
        config.set_str("user.name", "Test User")?;
        config.set_str("user.email", "test@example.com")?;
        
        Ok((dir, repo))
    }
    
    #[test]
    fn test_get_svcms_commits_empty_repo() {
        let (dir, repo) = create_test_repo().unwrap();
        
        // Create an initial commit so there's a HEAD
        let sig = git2::Signature::now("Test User", "test@example.com").unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
            index.write_tree().unwrap()
        };
        let tree = repo.find_tree(tree_id).unwrap();
        
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            "Initial commit",
            &tree,
            &[],
        ).unwrap();
        
        // Now test - should find no SVCMS commits (initial commit isn't SVCMS)
        let commits = get_svcms_commits(dir.path().to_str().unwrap(), 10).unwrap();
        assert_eq!(commits.len(), 0);
    }
    
    #[test]
    fn test_get_svcms_commits_with_svcms_commit() {
        let (dir, repo) = create_test_repo().unwrap();
        
        // Create an initial commit
        let sig = git2::Signature::now("Test User", "test@example.com").unwrap();
        let tree_id = {
            let mut index = repo.index().unwrap();
            index.write_tree().unwrap()
        };
        let tree = repo.find_tree(tree_id).unwrap();
        
        let parent = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            "Initial commit",
            &tree,
            &[],
        ).unwrap();
        
        // Create an SVCMS commit
        let parent_commit = repo.find_commit(parent).unwrap();
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            "feat(test): add test feature\n\nThis is a test commit.\n\nMemory: Test memory content\nTags: test, feature",
            &tree,
            &[&parent_commit],
        ).unwrap();
        
        // Should find one SVCMS commit
        let commits = get_svcms_commits(dir.path().to_str().unwrap(), 10).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].commit_type, "feat");
        assert_eq!(commits[0].scope, Some("test".to_string()));
        assert_eq!(commits[0].memory, Some("Test memory content".to_string()));
    }
}
