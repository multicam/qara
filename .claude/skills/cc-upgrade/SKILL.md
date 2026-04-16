---
name: cc-upgrade
context: fork
description: |
  Audit any .claude/ folder: CC feature compatibility, agent compliance, context engineering.
  USE WHEN: "audit this CC setup", "check CC compatibility". For PAI repos: cc-upgrade-pai.
---

# CC-Upgrade (v2.0.0)

Base skill for Claude Code folder analysis. Works on any codebase with a `.claude/` directory.

Domain extensions: `cc-upgrade-pai` (Personal AI Infrastructure repos).

## Workflow Routing

**Generic external skills audit** (non-PAI): "check installed skills", "skill redundancies", "skill hygiene", "analyze skill dependencies"
-> READ: `workflows/external-skills-audit.md`

**Skill ecosystem references/sources/evaluation criteria**: "skill ecosystem", "where to find skills", "evaluate this skill"
-> READ: `references/skills-ecosystem-sources.md`

**Changelog sync / feature gap check**: "sync features from changelog", "what CC features aren't tracked", "feature gap", "update FEATURE_REQUIREMENTS"
-> RUN: `bun run scripts/cc-feature-sync.ts`
-> REVIEW: suggested additions; update `cc-version-check.ts` FEATURE_REQUIREMENTS

**Skill pulse check / upstream activity**: "check skill updates", "skill pulse", "which skills are stale"
-> RUN: `bun run scripts/skill-pulse-check.ts`

**Thorough/interactive audit**: "full audit", "interview me about my setup"
-> READ: `workflows/interactive-audit.md`

**CC version check / general audit**: continue with Core Workflow below.

## Core Workflow

### 1. CC Version

```bash
claude --version
```

Reference `references/cc-trusted-sources.md` for latest features.

### 2. Expected Structure (CC 2.1.x)

```
.claude/
├── context/           # CLAUDE.md context files
├── skills/            # SKILL.md with frontmatter
├── agents/            # Agent configs
├── commands/          # Slash commands
├── hooks/             # Hook scripts
├── state/             # State persistence
├── settings.json      # Hooks config
└── keybindings.json   # Optional
```

### 3. Analysis Pipeline (in order)

1. Structure analysis
2. Skills system audit (SKILL.md format, context types)
3. Hooks configuration (settings.json, lifecycle events)
4. Context engineering (UFC patterns, file sizes)
5. TDD compliance (tests, coverage, scenario specs)
6. 12-factor compliance
7. Prioritized upgrade recommendations

## Analysis Modules

### Skills System

SKILL.md frontmatter:

```yaml
---
name: skill-name
context: fork|same
description: What this skill does
---
```

Checks:
- All skills have SKILL.md with frontmatter
- `context: fork` = isolated subagent, `context: same` = main conversation
- references/, scripts/, workflows/ subdirs present where needed

### Hooks (CC 2.1.x)

Run `bun run scripts/analyse-claude-folder.ts .` — checks stdin pattern, exit behavior, output schema, shebang, executable bit, settings.json events, timeouts.

### Execution Modes (Advanced)

Persistent modes via Stop hook continuation loops:
- Mode state management (JSON with TTL, session-scoped)
- Keyword-based activation (UserPromptSubmit)
- Working memory (session-scoped, survives compression)
- Quality gates (pre-impl critic + post-impl verifier)
- Crash recovery (PreCompact checkpoint + SessionStart restore)

### CC Feature Gap [AUTOMATED]

Run `bun run scripts/cc-version-check.ts .` — canonical list in FEATURE_REQUIREMENTS.

### 12-Factor Compliance

See `references/12-factor-checklist.md`. Key factors:

1. **F3 Own Context Window**: explicit context hydration (PreCompact, working memory)
2. **F5 Unify State**: externalized state (mode-state.json, tdd-mode.json, prd.json)
3. **F6 Launch/Pause/Resume**: compact checkpoints, SessionStart crash recovery
4. **F8 Own Control Flow**: agent loop in application code (Stop hook, keyword router)
5. **F10 Small Focused Agents**: critic vs verifier vs reviewer — no overlap
6. **F12 Stateless Reducer**: all state in files, not context window

## Output Format

```markdown
# CC Folder Optimization Report

## Executive Summary
[1-2 sentences]

## CC Feature Adoption
| Feature | Status | Priority | Effort |

## Skills System
## Hooks Configuration
## 12-Factor Compliance
## Context Engineering

## Recommended Upgrades
1. [High] ...
2. [Medium] ...

## Implementation Snippets
```

## Simplification Analysis

Run BEFORE adding features. Categories:

1. **Dead Code** — unused functions/exports
2. **Redundant Patterns** — duplicates elsewhere
3. **Over-Engineering** — unnecessary abstractions
4. **Outdated Patterns** — pre-2.1.x context mgmt, manual UFC

| Pattern | Action |
|---------|--------|
| Legacy integrations (unused API clients) | Delete file |
| Duplicate workflows across subdirs | Keep one |
| Pre-2.1.x manual UFC | Remove (CC handles natively) |
| Decision trees for similar outputs | Single parameterized workflow |

## Quick Commands

```bash
# Version check
bun run .claude/skills/cc-upgrade/scripts/cc-version-check.ts .

# Full analysis
bun run .claude/skills/cc-upgrade/scripts/analyse-claude-folder.ts .

# External skills analysis
bun run .claude/skills/cc-upgrade/scripts/analyse-external-skills.ts .

# Feature sync (changelog vs tracked)
bun run .claude/skills/cc-upgrade/scripts/cc-feature-sync.ts [--verbose]

# Skill pulse check
bun run .claude/skills/cc-upgrade/scripts/skill-pulse-check.ts [--verbose]
```

Canonical feature registry: `scripts/cc-version-check.ts` FEATURE_REQUIREMENTS.
