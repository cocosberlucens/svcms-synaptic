//! Two-tier commit type validation system

use std::collections::{HashMap, HashSet};
use crate::config::{CommitTypesConfig, CommitTypeCategory, ScopeConfig};

/// Comprehensive commit type validator supporting two-tier system
pub struct CommitTypeValidator {
    // Standard categories with their types
    categories: HashMap<String, HashSet<String>>,
    
    // Scope configurations by scope type
    module_scopes: HashMap<String, ScopeConfig>,
    cross_cutting_scopes: HashMap<String, ScopeConfig>,
    tooling_scopes: HashMap<String, ScopeConfig>,
    project_wide_scopes: HashMap<String, ScopeConfig>,
    
    // Legacy support
    legacy_types: HashSet<String>,
    aliases: HashMap<String, String>,
}

/// Parsed commit type representation
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedCommitType {
    pub category: Option<String>,
    pub commit_type: String,
    pub scope: Option<String>,
    pub original: String,
}

impl CommitTypeValidator {
    /// Create a new validator from configuration
    pub fn from_config(config: &CommitTypesConfig) -> Self {
        let mut validator = Self::default();
        
        // Load categories
        if let Some(categories) = &config.categories {
            for (category_name, category) in categories {
                let types: HashSet<String> = category.types.iter().cloned().collect();
                validator.categories.insert(category_name.clone(), types);
            }
        }
        
        // Load scopes
        if let Some(scopes) = &config.scopes {
            if let Some(modules) = &scopes.modules {
                validator.module_scopes = modules.clone();
            }
            if let Some(cross_cutting) = &scopes.cross_cutting {
                validator.cross_cutting_scopes = cross_cutting.clone();
            }
            if let Some(tooling) = &scopes.tooling {
                validator.tooling_scopes = tooling.clone();
            }
            if let Some(project_wide) = &scopes.project_wide {
                validator.project_wide_scopes = project_wide.clone();
            }
        }
        
        // Legacy support
        if let Some(additional) = &config.additional {
            validator.legacy_types.extend(additional.iter().cloned());
        }
        if let Some(override_types) = &config.override_types {
            validator.legacy_types = override_types.iter().cloned().collect();
        }
        if let Some(aliases) = &config.aliases {
            validator.aliases = aliases.clone();
        }
        
        validator
    }
    
    /// Parse commit type string into components
    pub fn parse_commit_type(&self, commit_type_str: &str) -> ParsedCommitType {
        // Handle aliases first
        let normalized = self.aliases.get(commit_type_str)
            .map(|s| s.as_str())
            .unwrap_or(commit_type_str);
        
        // Try to parse two-tier format: category.type
        if let Some(dot_pos) = normalized.find('.') {
            let category = normalized[..dot_pos].to_string();
            let commit_type = normalized[dot_pos + 1..].to_string();
            
            ParsedCommitType {
                category: Some(category),
                commit_type,
                scope: None,
                original: commit_type_str.to_string(),
            }
        } else {
            // Legacy single-tier format
            ParsedCommitType {
                category: None,
                commit_type: normalized.to_string(),
                scope: None,
                original: commit_type_str.to_string(),
            }
        }
    }
    
    /// Validate a commit type with optional scope
    pub fn is_valid(&self, commit_type_str: &str, scope: Option<&str>) -> bool {
        let parsed = self.parse_commit_type(commit_type_str);
        
        match (&parsed.category, &parsed.commit_type, scope) {
            // Two-tier validation: category.type(scope)
            (Some(category), commit_type, Some(scope)) => {
                self.validate_two_tier(category, commit_type, scope)
            }
            
            // Two-tier without scope: category.type
            (Some(category), commit_type, None) => {
                self.validate_category_type(category, commit_type)
            }
            
            // Legacy validation: type(scope) or just type
            (None, commit_type, _) => {
                self.validate_legacy(commit_type)
            }
        }
    }
    
    /// Validate two-tier format with scope
    fn validate_two_tier(&self, category: &str, commit_type: &str, scope: &str) -> bool {
        // First, check if the category.type combination is valid
        if !self.validate_category_type(category, commit_type) {
            return false;
        }
        
        // Then, check if this scope allows this category
        self.is_scope_category_allowed(scope, category)
    }
    
    /// Validate category.type combination
    fn validate_category_type(&self, category: &str, commit_type: &str) -> bool {
        self.categories
            .get(category)
            .map(|types| types.contains(commit_type))
            .unwrap_or(false)
    }
    
    /// Check if a scope allows a specific category
    fn is_scope_category_allowed(&self, scope: &str, category: &str) -> bool {
        // Check all scope types
        let scope_configs = [
            &self.module_scopes,
            &self.cross_cutting_scopes,
            &self.tooling_scopes,
            &self.project_wide_scopes,
        ];
        
        for scope_map in scope_configs {
            if let Some(scope_config) = scope_map.get(scope) {
                return scope_config.categories.contains(&"all".to_string()) ||
                       scope_config.categories.contains(&category.to_string());
            }
        }
        
        // If scope not found, allow standard categories by default
        matches!(category, "standard" | "knowledge" | "collaboration" | "meta")
    }
    
    /// Legacy validation for backwards compatibility
    fn validate_legacy(&self, commit_type: &str) -> bool {
        // Check legacy types
        if self.legacy_types.contains(commit_type) {
            return true;
        }
        
        // Check if it's a type from any category (for backwards compatibility)
        self.categories.values()
            .any(|types| types.contains(commit_type))
    }
    
    /// Get all valid commit types for a scope
    pub fn get_valid_types_for_scope(&self, scope: &str) -> Vec<String> {
        let mut valid_types = Vec::new();
        
        // Find scope configuration
        let scope_config = self.find_scope_config(scope);
        
        if let Some(config) = scope_config {
            // Add types from allowed categories
            for category_name in &config.categories {
                if category_name == "all" {
                    // Add all types from all categories
                    for types in self.categories.values() {
                        for commit_type in types {
                            valid_types.push(format!("{}", commit_type));
                            // Also add two-tier format
                            for (cat_name, cat_types) in &self.categories {
                                if cat_types.contains(commit_type) {
                                    valid_types.push(format!("{}.{}", cat_name, commit_type));
                                }
                            }
                        }
                    }
                } else if let Some(types) = self.categories.get(category_name) {
                    for commit_type in types {
                        valid_types.push(format!("{}.{}", category_name, commit_type));
                        valid_types.push(commit_type.clone()); // Legacy format
                    }
                }
            }
            
            // Add custom types
            for custom_type in &config.custom_types {
                valid_types.push(custom_type.clone());
            }
        } else {
            // No scope configuration found, return default types
            for (category, types) in &self.categories {
                for commit_type in types {
                    valid_types.push(format!("{}.{}", category, commit_type));
                    valid_types.push(commit_type.clone()); // Legacy format
                }
            }
        }
        
        valid_types.sort();
        valid_types.dedup();
        valid_types
    }
    
    /// Find scope configuration across all scope types
    fn find_scope_config(&self, scope: &str) -> Option<&ScopeConfig> {
        self.module_scopes.get(scope)
            .or_else(|| self.cross_cutting_scopes.get(scope))
            .or_else(|| self.tooling_scopes.get(scope))
            .or_else(|| self.project_wide_scopes.get(scope))
    }
    
    /// Get suggestions for invalid commit types
    pub fn suggest_alternatives(&self, invalid_type: &str, scope: Option<&str>) -> Vec<String> {
        let mut suggestions = Vec::new();
        
        // If it's a legacy type, suggest two-tier format
        for (category, types) in &self.categories {
            if types.contains(invalid_type) {
                suggestions.push(format!("{}.{}", category, invalid_type));
            }
        }
        
        // If scope is provided, get valid types for that scope
        if let Some(scope) = scope {
            let valid_types = self.get_valid_types_for_scope(scope);
            suggestions.extend(valid_types.into_iter().take(5)); // Limit to 5 suggestions
        }
        
        suggestions.sort();
        suggestions.dedup();
        suggestions
    }
}

impl Default for CommitTypeValidator {
    fn default() -> Self {
        let mut categories = HashMap::new();
        
        // Default SVCMS categories
        categories.insert("standard".to_string(), 
            ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"]
                .iter().map(|s| s.to_string()).collect());
        
        categories.insert("knowledge".to_string(),
            ["learned", "insight", "context", "decision", "memory"]
                .iter().map(|s| s.to_string()).collect());
        
        categories.insert("collaboration".to_string(),
            ["discussed", "explored", "attempted"]
                .iter().map(|s| s.to_string()).collect());
        
        categories.insert("meta".to_string(),
            ["workflow", "preference", "pattern"]
                .iter().map(|s| s.to_string()).collect());
        
        Self {
            categories,
            module_scopes: HashMap::new(),
            cross_cutting_scopes: HashMap::new(),
            tooling_scopes: HashMap::new(),
            project_wide_scopes: HashMap::new(),
            legacy_types: HashSet::new(),
            aliases: HashMap::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_two_tier_commit_type() {
        let validator = CommitTypeValidator::default();
        
        let parsed = validator.parse_commit_type("knowledge.learned");
        assert_eq!(parsed.category, Some("knowledge".to_string()));
        assert_eq!(parsed.commit_type, "learned");
        
        let parsed = validator.parse_commit_type("feat");
        assert_eq!(parsed.category, None);
        assert_eq!(parsed.commit_type, "feat");
    }
    
    #[test]
    fn test_validate_two_tier_types() {
        let validator = CommitTypeValidator::default();
        
        // Valid two-tier types
        assert!(validator.is_valid("knowledge.learned", None));
        assert!(validator.is_valid("standard.feat", None));
        assert!(validator.is_valid("collaboration.discussed", None));
        
        // Invalid combinations
        assert!(!validator.is_valid("knowledge.feat", None));
        assert!(!validator.is_valid("standard.learned", None));
    }
    
    #[test]
    fn test_legacy_compatibility() {
        let validator = CommitTypeValidator::default();
        
        // Legacy types should still work
        assert!(validator.is_valid("learned", None));
        assert!(validator.is_valid("feat", None));
        assert!(validator.is_valid("discussed", None));
    }
    
    #[test]
    fn test_get_valid_types_for_scope() {
        let validator = CommitTypeValidator::default();
        let types = validator.get_valid_types_for_scope("auth");
        
        // Should return something even for unconfigured scope
        assert!(!types.is_empty());
    }
}