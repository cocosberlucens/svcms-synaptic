# Synaptic Phase 2 Questions and Answers

This document tracks implementation decisions for Phase 2 (Obsidian Integration).

## 1. Wikilink Enrichment Strategy 🔗

**Question**: How should we handle concept extraction and linking?

**Decision**: Start simple - extract concepts automatically from commit messages. The `concepts/` folder integration will be considered at a later time.

**Implementation notes**:
- Extract capitalized phrases, technical terms, and phrases in quotes
- Create `[[concept]]` links inline without verifying existence
- Future: Check against existing notes in vault's `concepts/` folder

## 2. Obsidian Vault Discovery 📁

**Question**: How should we handle finding the vault?

**Decision**: Explicit configuration in `~/.synaptic/config.toml` only.

**Implementation notes**:
- No auto-detection
- Clear error if vault path not configured
- Single vault support for now

## 3. Template Customization 📝

**Question**: Should we support multiple templates?

**Decision**: Ship with default template only for now.

**Implementation notes**:
- Use the comprehensive template from Architecture v2.0
- Hardcode initially, make configurable later
- Focus on getting the core functionality working

## 4. Dataview Integration 📊

**Question**: How to handle Dataview queries for dashboards?

**Decision**: TBD - Considering custom query library vs standard queries.

**Claude's recommendation**: Start with standard queries to avoid over-engineering. A simple YAML file with query templates would suffice if customization is needed.

## 5. Error Handling ⚠️

**Question**: How to handle missing/unavailable vault?

**Decision**: Raise error "Unable to proceed, configure appropriately, please"

**Implementation notes**:
- Fail fast with clear error message
- No fallback behavior
- Guide user to configuration solution