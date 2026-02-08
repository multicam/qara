---
name: cc-upgrade
context: fork
description: |
  Audit any .claude/ folder: CC feature compatibility, 12-factor agent compliance,
  skills/hooks configuration, context engineering patterns. Generic — works on any codebase.
  USE WHEN: "audit this CC setup", "check CC compatibility", "optimize .claude/ folder".
  For PAI-specific repos, use cc-upgrade-pai instead.
---

# CC-Upgrade (v2.0.0)

**Base skill** for Claude Code folder analysis and optimization. Works on any codebase with a `.claude/` directory.

## Extending This Skill

This skill serves as the base for domain-specific upgrade skills:

| Skill | Extends With | Use Case |
|-------|--------------|----------|
| `cc-upgrade-pai` | PAI-specific analysis | Personal AI Infrastructure repos |

**Composition Pattern:**
```markdown
# In your extending skill's SKILL.md:

## Prerequisites
→ READ: `../cc-upgrade/references/cc-trusted-sources.md`
→ READ: `../cc-upgrade/references/12-factor-checklist.md`

## Workflow
1. Run base cc-upgrade analysis first
2. Then run domain-specific checks
```

## Core Workflow

### 1. Check Current CC Version

```bash
claude --version
```

Reference `references/cc-trusted-sources.md` for latest CC features and update sources.

### 2. Analyze .claude/ Folder Structure

Expected structure (CC 2.1.x):

```
.claude/
├── context/           # Context files (CLAUDE.md)
├── skills/            # Skill definitions with SKILL.md
│   └── */SKILL.md    # Each skill with frontmatter
├── agents/            # Agent configurations
├── commands/          # Reusable workflows (slash commands)
├── hooks/             # Hook scripts
├── state/             # State persistence
├── settings.json      # CC configuration with hooks
└── keybindings.json   # Custom keyboard shortcuts (optional)
```

### 3. Run Analysis Pipeline

Execute in order:

1. **Structure Analysis** - Directory layout and required files
2. **Skills System Audit** - SKILL.md format, context types, invocability
3. **Hooks Configuration** - settings.json hooks, lifecycle events
4. **Context Engineering** - UFC patterns, progressive disclosure, file sizes
5. **12-Factor Compliance** - Agent principles audit
6. **Upgrade Recommendations** - Prioritized improvements

## Analysis Modules

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

Hooks are in settings.json:

```json
{
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "SessionStart": [...],
    "SessionEnd": [...],
    "UserPromptSubmit": [...],
    "Setup": [...],
    "Stop": [...],
    "SubagentStop": [...]
  }
}
```

### CC Feature Gap Analysis

| CC Feature | Min Version | Check Location | Optimization Signal |
|------------|-------------|----------------|---------------------|
| Subagents | 1.0.80 | `.claude/agents/` | Missing parallel execution |
| Checkpoints | 2.0.0 | `/rewind` usage | No rollback safety |
| Hooks | 2.1.0 | `settings.json` | Missing automation |
| Skills | 2.0.40 | `.claude/skills/` | No reusable capabilities |
| Plan Mode | 2.0.50 | Commands | Missing planning phase |
| Model routing | 2.1.0 | Task tool usage | No per-task model selection |
| Status line | 2.1.0 | `settings.json` | No custom status |
| Context % | 2.1.6 | Status line | Not using native percentage |
| additionalContext | 2.1.9 | PreToolUse hooks | No context injection to model |
| plansDirectory | 2.1.9 | `settings.json` | Using default plans location |
| Session ID | 2.1.9 | Skills | No session tracking in skills |
| Setup hooks | 2.1.13 | `settings.json` | No --init automation |
| Hook output schema | 2.1.14 | Hook scripts | Using wrong output format |
| Keybindings | 2.1.18 | `keybindings.json` | No custom shortcuts |

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
# CC Folder Optimization Report

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

## Simplification Analysis

**Run this BEFORE adding features.** Identify superfluous code:

### Analysis Categories

1. **Dead Code** - Functions/exports never used
2. **Redundant Patterns** - Duplicates functionality elsewhere
3. **Over-Engineering** - Unnecessary abstractions, excessive config
4. **Outdated Patterns** - Doesn't align with modern CC patterns

### Common Findings

| Pattern | Example | Action |
|---------|---------|--------|
| Legacy integrations | Unused API clients | Delete entire file |
| Duplicate workflows | Same workflow in subdirs | Keep one, delete rest |
| Pre-2.1.x context mgmt | Manual UFC patterns | Remove (CC handles natively) |
| Excessive routing | Decision trees for similar outputs | Single workflow with params |

## Quick Commands

### Version Check
```bash
bun run .claude/skills/cc-upgrade/scripts/cc-version-check.ts .
```

### Full Analysis
```bash
bun run .claude/skills/cc-upgrade/scripts/analyse-claude-folder.ts .
```

## Version Tracking

```javascript
// Key CC 2.1.x features
const CC_2_1_FEATURES = {
  // 2.1.0
  modelRouting: "2.1.0",
  skillInvocation: "2.1.0",
  backgroundTasks: "2.1.0",
  taskResume: "2.1.0",
  statusLine: "2.1.0",
  settingsJsonHooks: "2.1.0",
  webSearch: "2.1.0",
  askUserQuestion: "2.1.0",
  // 2.1.3
  mergedSkillsCommands: "2.1.3",
  releaseChannelToggle: "2.1.3",
  enhancedDoctor: "2.1.3",
  extendedHookTimeout: "2.1.3",
  // 2.1.6
  configSearch: "2.1.6",
  statsDateFiltering: "2.1.6",
  nestedSkillDiscovery: "2.1.6",
  contextWindowPercentage: "2.1.6",
  // 2.1.9
  additionalContext: "2.1.9",
  plansDirectory: "2.1.9",
  sessionIdSubstitution: "2.1.9",
  // 2.1.13
  setupHooks: "2.1.13",
  // 2.1.14
  hookOutputSchema: "2.1.14",
  // 2.1.18
  keybindings: "2.1.18",
  chordBindings: "2.1.18",
};
```

See `scripts/cc-version-check.ts` for automated compatibility checking.
