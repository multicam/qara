---
name: cc-pai-optimiser
description: Review and optimize PAI (Personal AI Infrastructure) codebases as Claude Code evolves. Use when analyzing PAI repositories against 12-factor agent principles, checking for Claude Code feature compatibility, auditing context management patterns, or generating upgrade recommendations. Triggers on requests involving PAI optimization, Claude Code feature adoption, agent architecture review, or context engineering improvements.
---

# CC-PAI Optimizer

Review and optimize PAI codebases by tracking Claude Code evolution and applying 12-factor agent principles.

## Core Workflow

### 1. Gather Latest Claude Code Features

Before any optimization, fetch current CC capabilities from trusted sources:

```bash
# Set trusted sources
CC_SOURCES=(
  "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md"
  "https://github.com/anthropics/claude-code/releases"
  "https://docs.claude.com/en/release-notes/overview"
  "https://github.com/marckrenn/claude-code-changelog/blob/main/cc-prompt.md"
  "https://github.com/marckrenn/claude-code-changelog"
)

# Check latest version
claude --version 2>/dev/null || echo "Claude Code not installed locally"
```

Reference `references/cc-trusted-sources.md` for complete source list and update frequency recommendations.

### 2. Load PAI Repository

```bash
# Discover PAI structure
find "$PAI_DIR" -name "CLAUDE.md" -o -name ".claude" -type d -exec basename {} \; 2>/dev/null
```

### 3. Run Analysis Pipeline

Execute analysis in this order:

1. **Feature Gap Analysis** - Compare current PAI against latest CC features
2. **12-Factor Compliance** - Audit against agent principles
3. **Context Engineering Audit** - Review context management patterns
4. **Upgrade Plan Generation** - Create prioritized recommendations

## Analysis Modules

### Feature Gap Analysis

Compare PAI implementation against CC capabilities:

| CC Feature | Check Location | Optimization Signal |
|------------|----------------|---------------------|
| Subagents | `.claude/` config | Missing parallel execution patterns |
| Checkpoints | `/rewind` usage | No rollback safety nets |
| Hooks | `hooks/` directory | Missing automation triggers |
| Skills | `.claude/rules/` | No reusable skill definitions |
| Plan Mode | Agent configs | Missing planning phase |

### 12-Factor Compliance Check

Reference `references/12-factor-checklist.md` for complete audit criteria.

Key factors to validate:

1. **Factor 3 - Own Context Window**: Is context hydration explicit and controlled?
2. **Factor 8 - Own Control Flow**: Is agent loop logic in application code, not framework?
3. **Factor 10 - Small Focused Agents**: Are agents single-purpose or monolithic?
4. **Factor 12 - Stateless Reducer**: Is state externalized properly?

### Context Engineering Audit

Evaluate against UFC (Universal File-based Context) principles:

```
Check hierarchy:
~/.claude/
├── context/           # Should exist with CLAUDE.md files
├── agents/            # Specialized agent configs
├── commands/          # Reusable workflows
└── hooks/             # Event automation
```

Red flags:
- Context files >500 lines (split needed)
- Missing progressive disclosure patterns
- Hardcoded context (should be file-based)
- No context loading enforcement

## Output Format

Generate report as:

```markdown
# PAI Optimization Report

## Executive Summary
[1-2 sentence overall assessment]

## CC Feature Adoption
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|

## 12-Factor Compliance
[Factor-by-factor status with specific file references]

## Context Engineering
[UFC audit results]

## Recommended Upgrades
1. [High Priority] ...
2. [Medium Priority] ...

## Implementation Snippets
[Ready-to-use code for top recommendations]
```

## Quick Commands

### Full Audit
```bash
# Comprehensive PAI review
analyze_pai() {
  local pai_path="${1:-.}"
  echo "=== PAI Analysis: $pai_path ==="
  
  # Structure check
  echo "## Structure"
  tree -L 3 "$pai_path/.claude" 2>/dev/null || echo "No .claude directory"
  
  # Context file audit
  echo "## Context Files"
  find "$pai_path" -name "CLAUDE.md" -exec wc -l {} \;
  
}
```

### Feature Diff
```bash
# Compare PAI against CC version
cc_feature_diff() {
  echo "Claude Code Version: $(claude --version 2>/dev/null || echo 'N/A')"
  echo "Checking for:"
  echo "  - Subagent support: $(grep -r 'subagent' . 2>/dev/null | wc -l) references"
  echo "  - Hook usage: $(ls .claude/hooks 2>/dev/null | wc -l) hooks"
  echo "  - Skill definitions: $(ls .claude/rules 2>/dev/null | wc -l) skills"
}
```

## Integration with PAI System

When optimizing an existing PAI setup:

1. **Preserve** existing context loading protocols (Layer 1-4 enforcement)
2. **Enhance** with new CC features (subagents, checkpoints, hooks)
3. **Validate** changes don't break context hydration
4. **Document** all changes in appropriate CLAUDE.md files

## Version Tracking

Track CC versions against PAI compatibility:

```javascript
// scripts/cc-version-check.js
const CC_MIN_VERSION = "2.0.0";
const FEATURE_REQUIREMENTS = {
  subagents: "1.0.80",
  checkpoints: "2.0.0",
  hooks: "1.0.85",
  skills: "2.0.40",
  planMode: "2.0.50"
};
```

See `scripts/cc-version-check.js` for automated compatibility checking.