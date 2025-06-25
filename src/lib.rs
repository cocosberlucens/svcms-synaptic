pub mod parser;
pub mod memory;
pub mod git;
pub mod obsidian;

// Re-export for easier access
pub use git::*;
pub use memory::*;
pub use obsidian::*;

#[derive(Debug, Clone)]
pub struct SvcmsCommit {
    pub sha: String,
    pub commit_type: String,
    pub scope: Option<String>,
    pub summary: String,
    pub body: Option<String>,
    pub memory: Option<String>,
    pub location: Option<String>,
    pub context: Option<String>,
    pub refs: Vec<String>,
    pub tags: Vec<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
