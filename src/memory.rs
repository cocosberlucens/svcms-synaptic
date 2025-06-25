//! Memory synchronization to CLAUDE.md files

use std::path::{Path, PathBuf};
use std::fs;
use std::io::{Read, Write};
use std::collections::HashMap;
use anyhow::{Result, Context};
use colored::Colorize;
use crate::SvcmsCommit;

/// Determine the target CLAUDE.md file for a commit
pub fn determine_memory_location(commit: &SvcmsCommit, project_root: &str) -> PathBuf {
    if let Some(location) = &commit.location {
        // Explicit location specified
        PathBuf::from(project_root).join(location)
    } else if let Some(scope) = &commit.scope {
        // Infer from scope
        match scope.as_str() {
            // Project-wide scopes
            "global" | "project" | "build" | "ci" | "chore" | 
            "docs" | "test" | "tests" | "testing" | "cleanup" |
            "workflow" | "development" | "architecture" |
            "authors" | "roadmap" | "memory" | "mvp" | "milestone" => {
                PathBuf::from(project_root).join("CLAUDE.md")
            }
            // Module-specific scopes (assume they're in src/)
            _ => {
                // Check if scope looks like a path (contains /)
                if scope.contains('/') {
                    PathBuf::from(project_root).join(format!("{}/CLAUDE.md", scope))
                } else {
                    // Default to src/ subdirectory
                    PathBuf::from(project_root).join(format!("src/{}/CLAUDE.md", scope))
                }
            }
        }
    } else {
        // Default to project root
        PathBuf::from(project_root).join("CLAUDE.md")
    }
}

/// Group memories by their target file
fn group_memories_by_file(commits: &[SvcmsCommit], project_root: &str) -> HashMap<PathBuf, Vec<Memory>> {
    let mut grouped = HashMap::new();
    
    for commit in commits {
        if let Some(memory_text) = &commit.memory {
            let location = determine_memory_location(commit, project_root);
            let memory = Memory {
                content: memory_text.clone(),
                commit_sha: commit.sha.clone(),
                commit_type: commit.commit_type.clone(),
                scope: commit.scope.clone(),
                summary: commit.summary.clone(),
                timestamp: commit.timestamp,
                tags: commit.tags.clone(),
            };
            
            grouped.entry(location).or_insert_with(Vec::new).push(memory);
        }
    }
    
    grouped
}

/// Represents a memory to be synced
#[derive(Debug, Clone)]
struct Memory {
    content: String,
    commit_sha: String,
    commit_type: String,
    scope: Option<String>,
    summary: String,
    timestamp: chrono::DateTime<chrono::Utc>,
    tags: Vec<String>,
}

/// Format a memory for inclusion in CLAUDE.md
fn format_memory(memory: &Memory) -> String {
    let scope_str = memory.scope.as_ref()
        .map(|s| format!("({})", s))
        .unwrap_or_default();
    
    let tags_str = if !memory.tags.is_empty() {
        format!(" [{}]", memory.tags.join(", "))
    } else {
        String::new()
    };
    
    format!(
        "- {}: {} `{}{}: {}` ({}){}\n",
        memory.content,
        memory.commit_type,
        memory.commit_type,
        scope_str,
        memory.summary,
        memory.commit_sha,
        tags_str
    )
}

/// Read existing CLAUDE.md content
fn read_claude_md(path: &Path) -> Result<String> {
    if path.exists() {
        let mut content = String::new();
        fs::File::open(path)
            .context("Failed to open CLAUDE.md")?
            .read_to_string(&mut content)
            .context("Failed to read CLAUDE.md")?;
        Ok(content)
    } else {
        Ok(String::new())
    }
}

/// Find the memories section in CLAUDE.md content
fn find_memories_section(content: &str) -> Option<(usize, usize)> {
    let lines: Vec<&str> = content.lines().collect();
    let mut start_idx = None;
    let mut end_idx = None;
    
    for (i, line) in lines.iter().enumerate() {
        if line.contains("## Memories from SVCMS") || line.contains("## SVCMS Memories") {
            start_idx = Some(i);
        } else if start_idx.is_some() && line.starts_with("## ") {
            // Found next section
            end_idx = Some(i);
            break;
        }
    }
    
    if let Some(start) = start_idx {
        let end = end_idx.unwrap_or(lines.len());
        
        // Calculate byte positions
        let start_byte = lines[..start].iter().map(|l| l.len() + 1).sum::<usize>();
        let end_byte = lines[..end].iter().map(|l| l.len() + 1).sum::<usize>();
        
        Some((start_byte, end_byte))
    } else {
        None
    }
}

/// Check if a memory is already present in the content
fn memory_already_exists(content: &str, memory: &Memory) -> bool {
    // Look for the memory content and commit SHA
    content.contains(&memory.content) && content.contains(&memory.commit_sha)
}

/// Filter out memories that are already present
fn filter_new_memories(path: &Path, memories: &[Memory]) -> Result<Vec<Memory>> {
    let existing_content = read_claude_md(path)?;
    
    let new_memories: Vec<Memory> = memories
        .iter()
        .filter(|memory| !memory_already_exists(&existing_content, memory))
        .cloned()
        .collect();
    
    Ok(new_memories)
}

/// Update or create CLAUDE.md with new memories
fn update_claude_md(path: &Path, memories: &[Memory], dry_run: bool) -> Result<()> {
    // Filter out memories that already exist
    let new_memories = filter_new_memories(path, memories)?;
    
    if new_memories.is_empty() {
        if dry_run {
            println!("{} {} (no new memories)", 
                "Would skip:".bright_black(), 
                path.display()
            );
        } else {
            println!("{} {} (no new memories)", 
                "⚡ Skipped:".bright_black(), 
                path.display()
            );
        }
        return Ok(());
    }
    
    let existing_content = read_claude_md(path)?;
    
    // Format new memories
    let mut memory_lines = Vec::new();
    memory_lines.push("\n## SVCMS Memories\n\n".to_string());
    memory_lines.push("*Automatically synced by Synaptic*\n\n".to_string());
    
    // Sort new memories by timestamp (newest first)
    let mut sorted_new_memories = new_memories.clone();
    sorted_new_memories.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    // If there are existing memories, we need to merge them properly
    if let Some((start, end)) = find_memories_section(&existing_content) {
        // Extract existing memories and combine with new ones
        let existing_memories_text = &existing_content[start..end];
        let existing_memory_lines: Vec<&str> = existing_memories_text
            .lines()
            .filter(|line| line.starts_with("- "))
            .collect();
        
        // Add new memories first (they're newer)
        for memory in &sorted_new_memories {
            memory_lines.push(format_memory(memory));
        }
        
        // Then add existing memories
        for line in existing_memory_lines {
            memory_lines.push(format!("{}\n", line));
        }
    } else {
        // No existing memories section, just add new ones
        for memory in &sorted_new_memories {
            memory_lines.push(format_memory(memory));
        }
    }
    
    let new_memory_section = memory_lines.join("");
    
    // Determine new content
    let new_content = if let Some((start, end)) = find_memories_section(&existing_content) {
        // Replace existing section
        format!(
            "{}{}{}",
            &existing_content[..start],
            new_memory_section,
            &existing_content[end..]
        )
    } else if existing_content.is_empty() {
        // Create new file with header
        format!(
            "# CLAUDE.md\n\nThis file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.\n{}",
            new_memory_section
        )
    } else {
        // Append to existing file
        format!("{}\n{}", existing_content.trim_end(), new_memory_section)
    };
    
    if dry_run {
        println!("\n{} {}", "Would update:".yellow(), path.display());
        println!("{}", "─".repeat(50).bright_black());
        
        // Show a preview of what would be added
        let preview_lines: Vec<&str> = new_memory_section.lines().take(10).collect();
        for line in preview_lines {
            println!("{}", line.bright_black());
        }
        if new_memory_section.lines().count() > 10 {
            println!("{}", "... (more memories)".bright_black());
        }
    } else {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .context("Failed to create directory")?;
        }
        
        // Write the file
        let mut file = fs::File::create(path)
            .context("Failed to create CLAUDE.md")?;
        file.write_all(new_content.as_bytes())
            .context("Failed to write CLAUDE.md")?;
        
        println!("{} {} ({} new memories)", 
            "✓ Updated:".green(), 
            path.display(), 
            new_memories.len()
        );
    }
    
    Ok(())
}

/// Sync memories from commits to CLAUDE.md files and optionally Obsidian
pub fn sync_memories(commits: Vec<SvcmsCommit>, project_root: &str, dry_run: bool) -> Result<()> {
    sync_memories_with_options(commits, project_root, dry_run, None)
}

/// Sync memories with Obsidian integration
pub fn sync_memories_with_obsidian(
    commits: Vec<SvcmsCommit>, 
    project_root: &str, 
    dry_run: bool,
    obsidian_manager: &crate::obsidian::ObsidianManager
) -> Result<()> {
    sync_memories_with_options(commits, project_root, dry_run, Some(obsidian_manager))
}

/// Internal sync function with optional Obsidian integration
fn sync_memories_with_options(
    commits: Vec<SvcmsCommit>, 
    project_root: &str, 
    dry_run: bool,
    obsidian_manager: Option<&crate::obsidian::ObsidianManager>
) -> Result<()> {
    let memories_by_file = group_memories_by_file(&commits, project_root);
    
    if memories_by_file.is_empty() && commits.is_empty() {
        println!("{}", "No memories found to sync.".yellow());
        return Ok(());
    }
    
    // Sync to CLAUDE.md files
    let mut total_memories = 0;
    if !memories_by_file.is_empty() {
        println!("\n{} Syncing memories to {} CLAUDE.md files...", 
            "🧠".bright_blue(),
            memories_by_file.len()
        );
        
        for (path, memories) in &memories_by_file {
            update_claude_md(path, memories, dry_run)?;
            total_memories += memories.len();
        }
    }
    
    // Sync to Obsidian if configured
    let mut obsidian_synced = 0;
    if let Some(obsidian) = obsidian_manager {
        if !dry_run {
            println!("\n{} Syncing to Obsidian vault...", "🔮".bright_magenta());
            
            // Extract project name from git repository
            let project_name = std::path::Path::new(project_root)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown-project");
            
            obsidian_synced = obsidian.sync_commits(&commits, project_name)?;
        } else {
            // Count commits with memories for dry run
            obsidian_synced = commits.iter().filter(|c| c.memory.is_some()).count();
            println!("\n{} Would sync {} commits to Obsidian vault", 
                "🔮".bright_black(),
                obsidian_synced
            );
        }
    }
    
    // Final summary
    if !dry_run {
        if obsidian_synced > 0 {
            println!("\n{} Synced {} memories to CLAUDE.md + {} notes to Obsidian", 
                "✨".bright_green(),
                total_memories,
                obsidian_synced
            );
        } else {
            println!("\n{} Synced {} memories to {} files", 
                "✨".bright_green(),
                total_memories,
                memories_by_file.len()
            );
        }
    } else {
        if obsidian_synced > 0 {
            println!("\n{} Would sync {} memories to CLAUDE.md + {} notes to Obsidian", 
                "📋".bright_yellow(),
                total_memories,
                obsidian_synced
            );
        } else {
            println!("\n{} Would sync {} memories to {} files", 
                "📋".bright_yellow(),
                total_memories,
                memories_by_file.len()
            );
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    
    #[test]
    fn test_determine_memory_location() {
        let commit = SvcmsCommit {
            sha: "abc123".to_string(),
            commit_type: "learned".to_string(),
            scope: Some("parser".to_string()),
            summary: "test".to_string(),
            body: None,
            memory: Some("test memory".to_string()),
            location: None,
            context: None,
            refs: vec![],
            tags: vec![],
            timestamp: Utc::now(),
        };
        
        let location = determine_memory_location(&commit, "/project");
        assert_eq!(location, PathBuf::from("/project/src/parser/CLAUDE.md"));
    }
    
    #[test]
    fn test_determine_memory_location_with_explicit() {
        let commit = SvcmsCommit {
            sha: "abc123".to_string(),
            commit_type: "learned".to_string(),
            scope: Some("parser".to_string()),
            summary: "test".to_string(),
            body: None,
            memory: Some("test memory".to_string()),
            location: Some("docs/CLAUDE.md".to_string()),
            context: None,
            refs: vec![],
            tags: vec![],
            timestamp: Utc::now(),
        };
        
        let location = determine_memory_location(&commit, "/project");
        assert_eq!(location, PathBuf::from("/project/docs/CLAUDE.md"));
    }
    
    #[test]
    fn test_format_memory() {
        let memory = Memory {
            content: "Use lazy_static for regex patterns".to_string(),
            commit_sha: "abc123".to_string(),
            commit_type: "learned".to_string(),
            scope: Some("parser".to_string()),
            summary: "implement regex parsing".to_string(),
            timestamp: Utc::now(),
            tags: vec!["rust".to_string(), "regex".to_string()],
        };
        
        let formatted = format_memory(&memory);
        assert!(formatted.contains("Use lazy_static for regex patterns"));
        assert!(formatted.contains("learned(parser)"));
        assert!(formatted.contains("[rust, regex]"));
    }
}
