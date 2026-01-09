---
name: cc-pai-optimiser
context: fork
description: Review and optimize PAI (Personal AI Infrastructure) codebases as Claude Code evolves. Use when analyzing PAI repositories against 12-factor agent principles, checking for Claude Code feature compatibility, auditing context management patterns, or generating upgrade recommendations. Triggers on requests involving PAI optimization, Claude Code feature adoption, agent architecture review, or context engineering improvements.
---

# CC-PAI Optimizer (v2.1.2)

Review and optimize PAI codebases by tracking Claude Code evolution and applying 12-factor agent principles.

## Core Workflow

### 1. Gather Latest Claude Code Features

Before any optimization, fetch current CC capabilities from trusted sources:

```bash
# Check current version
claude --version

# Trusted sources
CC_SOURCES=(
  "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md"
  "https://github.com/anthropics/claude-code/releases"
  "https://docs.anthropic.com/en/docs/claude-code"
  "https://github.com/marckrenn/claude-code-changelog/blob/main/cc-prompt.md"
)
```

Reference `references/cc-trusted-sources.md` for complete source list and update frequency recommendations.

### 2. Load PAI Repository

```bash
# Discover PAI structure
ls -la "$PAI_DIR/.claude/"
```

### 3. Run Analysis Pipeline

Execute analysis in this order:

1. **Structure Analysis** - Directory layout and required files
2. **Skills System Audit** - SKILL.md format, context types, invocability
3. **Hooks Configuration** - settings.json hooks, lifecycle events
4. **Context Engineering Audit** - UFC patterns, progressive disclosure
5. **Delegation Patterns** - Multi-agent workflows
6. **12-Factor Compliance** - Agent principles audit
7. **Upgrade Plan Generation** - Prioritized recommendations

## Analysis Modules

### Structure Analysis

Expected PAI v2.x structure:

```
.claude/
├── context/           # Context files (CLAUDE.md)
├── skills/            # Skill definitions (replaces rules/)
│   └── */SKILL.md    # Each skill with frontmatter
├── agents/            # Agent configurations
├── commands/          # Reusable workflows
├── hooks/             # Hook scripts
├── state/             # State persistence
└── settings.json      # CC configuration with hooks
```

### Skills System Analysis

Check for proper SKILL.md format:

```yaml
---
name: skill-name
context: fork|same
description: What this skill does
---
```

Key checks:
- All skills have SKILL.md with frontmatter
- `context: fork` for isolated execution (subagent)
- `context: same` for main conversation
- references/, scripts/, workflows/ subdirectories

### Hooks Configuration (CC 2.1.x)

Hooks are now in settings.json:

```json
{
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "SessionStart": [...],
    "SessionEnd": [...],
    "UserPromptSubmit": [...],
    "Stop": [...],
    "SubagentStop": [...]
  }
}
```

### Feature Gap Analysis

Compare PAI implementation against CC capabilities:

| CC Feature | Min Version | Check Location | Optimization Signal |
|------------|-------------|----------------|---------------------|
| Subagents | 1.0.80 | `.claude/agents/` | Missing parallel execution |
| Checkpoints | 2.0.0 | `/rewind` usage | No rollback safety |
| Hooks | 2.1.0 | `settings.json` | Missing automation |
| Skills | 2.0.40 | `.claude/skills/` | No reusable capabilities |
| Plan Mode | 2.0.50 | Commands | Missing planning phase |
| Model routing | 2.1.0 | Task tool usage | No per-task model selection |
| Status line | 2.1.0 | `settings.json` | No custom status |

### 12-Factor Compliance Check

Reference `references/12-factor-checklist.md` for complete audit criteria.

Key factors to validate:

1. **Factor 3 - Own Context Window**: Is context hydration explicit and controlled?
2. **Factor 8 - Own Control Flow**: Is agent loop logic in application code?
3. **Factor 10 - Small Focused Agents**: Are agents single-purpose?
4. **Factor 12 - Stateless Reducer**: Is state externalized?

## Output Format

Generate report as:

```markdown
# PAI Optimization Report

## Executive Summary
[1-2 sentence overall assessment]

## CC Feature Adoption
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|

## Skills System
[SKILL.md format compliance, context types]

## Hooks Configuration
[settings.json hooks audit]

## 12-Factor Compliance
[Factor-by-factor status]

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
cd ${PAI_DIR}/skills/cc-pai-optimiser
bun run scripts/analyse-pai.js ${PAI_DIR}/..
```

### Version Check
```bash
cd ${PAI_DIR}/skills/cc-pai-optimiser
bun run scripts/cc-version-check.js ${PAI_DIR}/..
```

## Version Tracking

Track CC versions against PAI compatibility:

```javascript
// Key CC 2.1.x features
const CC_2_1_FEATURES = {
  modelRouting: "2.1.0",      // Per-task model selection
  skillInvocation: "2.1.0",   // Skill tool
  backgroundTasks: "2.1.0",   // run_in_background
  taskResume: "2.1.0",        // Resume via agent ID
  statusLine: "2.1.0",        // Custom status line
  settingsJsonHooks: "2.1.0", // Hooks in settings.json
  webSearch: "2.1.0",         // Built-in WebSearch
  askUserQuestion: "2.1.0"    // Interactive questions
};
```

See `scripts/cc-version-check.js` for automated compatibility checking.
