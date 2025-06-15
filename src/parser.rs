//! Parse SVCMS-formatted commit messages

use regex::Regex;
use anyhow::Result;
use crate::SvcmsCommit;

lazy_static::lazy_static! {
    // Header pattern: <type>(<scope>): <summary>
    static ref HEADER_PATTERN: Regex = Regex::new(
        r"^(\w+)(?:\(([^)]+)\))?:\s*(.+)"
    ).unwrap();
    
    // Footer patterns for extracting metadata
    static ref CONTEXT_PATTERN: Regex = Regex::new(
        r"(?m)^Context:\s*(.+)$"
    ).unwrap();
    
    static ref REFS_PATTERN: Regex = Regex::new(
        r"(?m)^Refs?:\s*(.+)$"
    ).unwrap();
    
    static ref MEMORY_PATTERN: Regex = Regex::new(
        r"(?m)^Memory:\s*(.+)$"
    ).unwrap();
    
    static ref LOCATION_PATTERN: Regex = Regex::new(
        r"(?m)^Location:\s*(.+)$"
    ).unwrap();
    
    static ref TAGS_PATTERN: Regex = Regex::new(
        r"(?m)^Tags?:\s*(.+)$"
    ).unwrap();
}

/// Parse a commit message following SVCMS format
pub fn parse_commit_message(
    sha: &str, 
    message: &str, 
    timestamp: chrono::DateTime<chrono::Utc>
) -> Result<Option<SvcmsCommit>> {
    let lines: Vec<&str> = message.lines().collect();
    if lines.is_empty() {
        return Ok(None);
    }
    
    // Parse header
    let header = lines[0];
    let captures = match HEADER_PATTERN.captures(header) {
        Some(c) => c,
        None => return Ok(None), // Not an SVCMS commit
    };
    
    let commit_type = captures.get(1)
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    
    // Check if this is an SVCMS-extended type
    if !is_valid_svcms_type(&commit_type) {
        return Ok(None);
    }
    
    let scope = captures.get(2).map(|m| m.as_str().to_string());
    let summary = captures.get(3)
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    
    // Extract body (everything between header and footers)
    let body = extract_body(&lines);
    
    // Extract footers
    let full_message = lines.join("\n");
    let context = extract_field(&full_message, &CONTEXT_PATTERN);
    let refs = extract_refs(&full_message);
    let memory = extract_field(&full_message, &MEMORY_PATTERN);
    let location = extract_field(&full_message, &LOCATION_PATTERN);
    let tags = extract_tags(&full_message);
    
    Ok(Some(SvcmsCommit {
        sha: sha.to_string(),
        commit_type,
        scope,
        summary,
        body,
        memory,
        location,
        context,
        refs,
        tags,
        timestamp,
    }))
}

/// Check if the commit type is valid according to SVCMS
fn is_valid_svcms_type(commit_type: &str) -> bool {
    matches!(
        commit_type,
        // Standard Conventional Commits
        "feat" | "fix" | "fixed" | "docs" | "style" | "refactor" | 
        "perf" | "test" | "build" | "ci" | "chore" |
        // SVCMS Knowledge Types
        "learned" | "insight" | "context" | "decision" | "decided" | "memory" |
        // SVCMS Collaboration Types
        "discussed" | "explored" | "attempted" |
        // SVCMS Meta Types
        "workflow" | "preference" | "pattern"
    )
}

/// Extract the body content (between header and footers)
fn extract_body(lines: &[&str]) -> Option<String> {
    if lines.len() <= 1 {
        return None;
    }
    
    let mut body_lines = Vec::new();
    let mut in_body = false;
    
    for line in lines.iter().skip(1) {
        // Empty line after header starts the body
        if !in_body && line.trim().is_empty() {
            in_body = true;
            continue;
        }
        
        // Check if we've hit a footer
        if in_body && is_footer_line(line) {
            break;
        }
        
        if in_body {
            body_lines.push(*line);
        }
    }
    
    if body_lines.is_empty() {
        None
    } else {
        Some(body_lines.join("\n").trim().to_string())
    }
}

/// Check if a line is a footer line
fn is_footer_line(line: &str) -> bool {
    line.starts_with("Context:") ||
    line.starts_with("Refs:") ||
    line.starts_with("Ref:") ||
    line.starts_with("Memory:") ||
    line.starts_with("Location:") ||
    line.starts_with("Tags:") ||
    line.starts_with("Tag:")
}

/// Extract a single field value from the message
fn extract_field(message: &str, pattern: &Regex) -> Option<String> {
    pattern.captures(message)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
}

/// Extract references as a vector
fn extract_refs(message: &str) -> Vec<String> {
    extract_field(message, &REFS_PATTERN)
        .map(|refs_str| {
            refs_str.split(',')
                .map(|r| r.trim().to_string())
                .filter(|r| !r.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

/// Extract tags as a vector
fn extract_tags(message: &str) -> Vec<String> {
    extract_field(message, &TAGS_PATTERN)
        .map(|tags_str| {
            tags_str.split(',')
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    
    #[test]
    fn test_parse_standard_commit() {
        let message = "feat(auth): add JWT authentication";
        let result = parse_commit_message("abc123", message, Utc::now()).unwrap();
        
        assert!(result.is_some());
        let commit = result.unwrap();
        assert_eq!(commit.commit_type, "feat");
        assert_eq!(commit.scope, Some("auth".to_string()));
        assert_eq!(commit.summary, "add JWT authentication");
    }
    
    #[test]
    fn test_parse_svcms_commit_with_memory() {
        let message = r#"learned(api): rate limiting resets at minute boundaries

Discovered through testing that the API rate limiter uses fixed minute
boundaries rather than a rolling 60-second window.

Context: Staff Scheduling API integration
Refs: #87, src/api/client.ts
Memory: API rate limit resets at :00 seconds of each minute
Location: src/api/CLAUDE.md
Tags: api, rate-limiting, retry-strategy"#;
        
        let result = parse_commit_message("def456", message, Utc::now()).unwrap();
        
        assert!(result.is_some());
        let commit = result.unwrap();
        assert_eq!(commit.commit_type, "learned");
        assert_eq!(commit.scope, Some("api".to_string()));
        assert_eq!(commit.summary, "rate limiting resets at minute boundaries");
        assert!(commit.body.is_some());
        assert_eq!(commit.context, Some("Staff Scheduling API integration".to_string()));
        assert_eq!(commit.memory, Some("API rate limit resets at :00 seconds of each minute".to_string()));
        assert_eq!(commit.location, Some("src/api/CLAUDE.md".to_string()));
        assert_eq!(commit.refs.len(), 2);
        assert_eq!(commit.tags.len(), 3);
    }
    
    #[test]
    fn test_parse_non_svcms_commit() {
        let message = "random commit message without proper format";
        let result = parse_commit_message("ghi789", message, Utc::now()).unwrap();
        assert!(result.is_none());
    }
    
    #[test]
    fn test_parse_empty_commit() {
        let message = r#"decided(architecture): use event-driven pattern

Context: Design discussion with Corrado
Memory: All state changes through events
Tags: architecture, events"#;
        
        let result = parse_commit_message("jkl012", message, Utc::now()).unwrap();
        
        assert!(result.is_some());
        let commit = result.unwrap();
        assert_eq!(commit.commit_type, "decided");
        assert_eq!(commit.scope, Some("architecture".to_string()));
        assert!(commit.body.is_none()); // No body, just footers
        assert_eq!(commit.memory, Some("All state changes through events".to_string()));
    }
}
