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

## Workflow Routing (SYSTEM PROMPT)

**When user requests generic CC external skills audit (non-PAI repos):**
Examples: "check installed skills", "skill redundancies",
"skill hygiene", "analyze skill dependencies"
-> **READ:** `workflows/external-skills-audit.md`
-> **EXECUTE:** Full external skills audit with redundancy analysis

**When user needs skill ecosystem references, sources, or evaluation criteria:**
Examples: "skill ecosystem", "where to find skills", "skill sources", "evaluate this skill"
-> **READ:** `references/skills-ecosystem-sources.md`

**When user requests a changelog sync, feature gap check, or wants to know what new CC features are not yet tracked:**
Examples: "sync features from changelog", "what CC features aren't tracked", "check for new CC features", "feature gap", "update FEATURE_REQUIREMENTS"
-> **RUN:** `bun run scripts/cc-feature-sync.ts`
-> **REVIEW:** Suggested additions and update `cc-version-check.ts` FEATURE_REQUIREMENTS as needed

**When user requests a skill pulse check, skill update check, or wants to see upstream activity on installed skills:**
Examples: "check skill updates", "skill pulse", "are my skills up to date", "which skills are stale", "skill ecosystem health"
-> **RUN:** `bun run scripts/skill-pulse-check.ts`
-> **REVIEW:** Report for outdated versions and stale upstream repositories

**When user requests thorough/interactive audit:**
Examples: "full audit", "interview me about my setup", "thorough CC review"
-> **READ:** `workflows/interactive-audit.md`

**When user requests CC version check or general .claude/ audit:**
-> Continue with Core Workflow below

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

Run `bun run scripts/analyse-claude-folder.ts .` — checks hook scripts for stdin pattern, exit behavior, output schema, shebang, and executable bit. Verifies settings.json hook events and timeout values.

### CC Feature Gap Analysis [AUTOMATED]

Run `bun run scripts/cc-version-check.ts .` — canonical feature list in FEATURE_REQUIREMENTS.

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

### External Skills Analysis
```bash
bun run .claude/skills/cc-upgrade/scripts/analyse-external-skills.ts .
```

### Feature Sync (changelog vs tracked features)
```bash
bun run .claude/skills/cc-upgrade/scripts/cc-feature-sync.ts
bun run .claude/skills/cc-upgrade/scripts/cc-feature-sync.ts --verbose
```

### Skill Ecosystem Pulse Check
```bash
bun run .claude/skills/cc-upgrade/scripts/skill-pulse-check.ts
bun run .claude/skills/cc-upgrade/scripts/skill-pulse-check.ts --verbose
```

## Version Tracking

See `scripts/cc-version-check.ts` FEATURE_REQUIREMENTS for the canonical feature registry.
