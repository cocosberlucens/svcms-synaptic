//! Obsidian vault integration for Synaptic

use std::path::{Path, PathBuf};
use std::fs;
use std::io::Write;
use anyhow::{Result, Context, anyhow};
use handlebars::Handlebars;
use serde_json::json;
use crate::SvcmsCommit;

/// Manages Obsidian vault operations for Synaptic
pub struct ObsidianManager {
    vault_path: PathBuf,
    synaptic_folder: String,
    template_engine: Handlebars<'static>,
}

impl ObsidianManager {
    /// Create a new ObsidianManager
    pub fn new(vault_path: PathBuf, synaptic_folder: String) -> Result<Self> {
        // Validate vault path exists
        if !vault_path.exists() {
            return Err(anyhow!(
                "Unable to proceed, configure appropriately, please. Vault path does not exist: {}",
                vault_path.display()
            ));
        }

        let mut template_engine = Handlebars::new();
        
        // Register the default commit note template
        template_engine.register_template_string("commit_note", DEFAULT_COMMIT_TEMPLATE)?;
        
        Ok(ObsidianManager {
            vault_path,
            synaptic_folder,
            template_engine,
        })
    }

    /// Get the path to the synaptic folder within the vault
    pub fn synaptic_path(&self) -> PathBuf {
        self.vault_path.join(&self.synaptic_folder)
    }

    /// Get the path to a project folder within synaptic
    pub fn project_path(&self, project_name: &str) -> PathBuf {
        self.synaptic_path().join("projects").join(project_name)
    }

    /// Get the path to the commits folder for a project
    pub fn commits_path(&self, project_name: &str) -> PathBuf {
        self.project_path(project_name).join("commits")
    }

    /// Create the basic vault structure
    pub fn init_vault_structure(&self) -> Result<()> {
        let synaptic_path = self.synaptic_path();
        
        // Create main directories
        fs::create_dir_all(synaptic_path.join("projects"))?;
        fs::create_dir_all(synaptic_path.join("concepts"))?;
        fs::create_dir_all(synaptic_path.join("people"))?;
        fs::create_dir_all(synaptic_path.join("daily"))?;

        // Create main index file
        let index_path = synaptic_path.join("_synaptic_index.md");
        if !index_path.exists() {
            let mut file = fs::File::create(&index_path)?;
            file.write_all(SYNAPTIC_INDEX_TEMPLATE.as_bytes())?;
        }

        Ok(())
    }

    /// Create a commit note in Obsidian
    pub fn create_commit_note(&self, commit: &SvcmsCommit, project_name: &str) -> Result<()> {
        // Ensure commits directory exists
        let commits_dir = self.commits_path(project_name);
        fs::create_dir_all(&commits_dir)?;

        // Generate filename: YYYY-MM-DD-type-scope-summary.md
        let filename = generate_note_filename(commit);
        let note_path = commits_dir.join(filename);

        // Skip if note already exists
        if note_path.exists() {
            return Ok(());
        }

        // Prepare template data
        let template_data = json!({
            "commit_sha": commit.sha,
            "commit_type": commit.commit_type,
            "commit_scope": commit.scope.as_deref().unwrap_or(""),
            "commit_summary": commit.summary,
            "commit_body": commit.body.as_deref().unwrap_or(""),
            "commit_date": commit.timestamp.format("%Y-%m-%d").to_string(),
            "memory_field": commit.memory.as_deref().unwrap_or(""),
            "context_field": commit.context.as_deref().unwrap_or(""),
            "project_name": project_name,
            "refs": commit.refs,
            "tags": commit.tags,
            "is_empty_commit": commit.body.is_none(),
            "extracted_concepts": extract_concepts(commit),
            "author": "Corrado & Claude" // TODO: Extract from git commit
        });

        // Render template
        let note_content = self.template_engine.render("commit_note", &template_data)
            .context("Failed to render commit note template")?;

        // Write note file
        let mut file = fs::File::create(&note_path)?;
        file.write_all(note_content.as_bytes())?;

        Ok(())
    }

    /// Sync a batch of commits to Obsidian
    pub fn sync_commits(&self, commits: &[SvcmsCommit], project_name: &str) -> Result<usize> {
        let mut synced_count = 0;

        // Ensure vault structure exists
        self.init_vault_structure()?;

        for commit in commits {
            // Only sync commits with memories
            if commit.memory.is_some() {
                self.create_commit_note(commit, project_name)?;
                synced_count += 1;
            }
        }

        Ok(synced_count)
    }
}

/// Generate a filename for a commit note
fn generate_note_filename(commit: &SvcmsCommit) -> String {
    let date = commit.timestamp.format("%Y-%m-%d");
    let scope = commit.scope.as_deref().unwrap_or("general");
    
    // Sanitize summary for filename
    let summary = commit.summary
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_lowercase();
    
    // Truncate if too long
    let summary = if summary.len() > 30 {
        &summary[..30]
    } else {
        &summary
    };

    format!("{}-{}-{}-{}.md", date, commit.commit_type, scope, summary)
}

/// Extract concepts from commit for wikilink generation
fn extract_concepts(commit: &SvcmsCommit) -> Vec<String> {
    let mut concepts = Vec::new();
    
    // Simple concept extraction - look for capitalized words and technical terms
    let text = format!("{} {}", 
        commit.summary, 
        commit.body.as_deref().unwrap_or("")
    );
    
    // Look for capitalized words (potential concepts)
    for word in text.split_whitespace() {
        let clean_word = word.trim_matches(|c: char| !c.is_alphabetic());
        if clean_word.len() > 2 && clean_word.chars().next().unwrap().is_uppercase() {
            // Avoid common words
            if !["The", "This", "That", "When", "Where", "How", "What", "Why"].contains(&clean_word) {
                concepts.push(clean_word.to_string());
            }
        }
    }
    
    // Look for technical patterns (camelCase, PascalCase)
    for word in text.split_whitespace() {
        if word.chars().any(|c| c.is_uppercase()) && word.chars().any(|c| c.is_lowercase()) {
            concepts.push(word.to_string());
        }
    }
    
    // Deduplicate and limit
    concepts.sort();
    concepts.dedup();
    concepts.truncate(5); // Limit to 5 concepts per commit
    
    concepts
}

/// Default template for commit notes
const DEFAULT_COMMIT_TEMPLATE: &str = r#"---
id: {{commit_sha}}
type: {{commit_type}}
scope: {{commit_scope}}
date: {{commit_date}}
tags: {{#each tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
memory: "{{memory_field}}"
project: {{project_name}}
refs: {{#each refs}}["{{this}}"]{{#unless @last}}, {{/unless}}{{/each}}
aliases: ["{{commit_summary}}"]
---

# {{commit_type}}({{commit_scope}}): {{commit_summary}}

## What Changed
{{commit_body}}

## Key Insight
{{memory_field}}

{{#if is_empty_commit}}
> 📝 This was a pure knowledge commit (no code changes)
{{/if}}

## Context
{{context_field}}

## Related Concepts
{{#each extracted_concepts}}
- [[{{this}}]]
{{/each}}

## References
{{#each refs}}
- {{this}}
{{/each}}

## Project Context
![[projects/{{project_name}}/_index#Current Focus]]

---
*Commit: {{commit_sha}} | Author: {{author}} | Date: {{commit_date}}*
"#;

/// Template for the main Synaptic index
const SYNAPTIC_INDEX_TEMPLATE: &str = r#"# Synaptic Knowledge Index

Welcome to your project's knowledge base, powered by SVCMS and Synaptic.

## Recent Insights

```dataview
TABLE type, scope, date, memory
FROM "synaptic"
WHERE memory != ""
SORT date DESC
LIMIT 10
```

## Projects

```dataview
LIST
FROM "synaptic/projects"
WHERE file.name = "_index"
```

## Concept Map

```dataview
LIST
FROM "synaptic/concepts"
SORT file.name ASC
```

---
*Generated by Synaptic - Your Git commits become living knowledge*
"#;

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use tempfile::TempDir;

    fn create_test_commit() -> SvcmsCommit {
        SvcmsCommit {
            sha: "abc1234".to_string(),
            commit_type: "learned".to_string(),
            scope: Some("auth".to_string()),
            summary: "JWT tokens have 24h expiry".to_string(),
            body: Some("Discovered that our JWT implementation uses 24-hour expiry.".to_string()),
            memory: Some("JWT tokens expire after 24 hours".to_string()),
            location: None,
            context: Some("Authentication debugging session".to_string()),
            refs: vec!["#123".to_string()],
            tags: vec!["auth".to_string(), "jwt".to_string()],
            timestamp: Utc::now(),
        }
    }

    #[test]
    fn test_generate_note_filename() {
        let commit = create_test_commit();
        let filename = generate_note_filename(&commit);
        assert!(filename.contains("learned"));
        assert!(filename.contains("auth"));
        assert!(filename.ends_with(".md"));
    }

    #[test]
    fn test_extract_concepts() {
        let commit = create_test_commit();
        let concepts = extract_concepts(&commit);
        assert!(concepts.contains(&"JWT".to_string()));
    }

    #[test]
    fn test_obsidian_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        let manager = ObsidianManager::new(
            temp_dir.path().to_path_buf(),
            "synaptic".to_string()
        );
        assert!(manager.is_ok());
    }

    #[test]
    fn test_vault_structure_creation() {
        let temp_dir = TempDir::new().unwrap();
        let manager = ObsidianManager::new(
            temp_dir.path().to_path_buf(),
            "synaptic".to_string()
        ).unwrap();
        
        manager.init_vault_structure().unwrap();
        
        assert!(temp_dir.path().join("synaptic/projects").exists());
        assert!(temp_dir.path().join("synaptic/concepts").exists());
        assert!(temp_dir.path().join("synaptic/_synaptic_index.md").exists());
    }
}