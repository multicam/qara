# Interactive Audit Workflow

Combines automated analysis with an interview to surface context-specific issues. Use this instead of (or before) the Quick Commands when doing a thorough review.

## Step 1: Intake Interview

Use AskUserQuestion with up to 4 questions to scope the audit:

**Call 1 — Scope & context (2 questions):**

| # | Question | Header | Options |
|---|----------|--------|---------|
| 1 | "Which areas should this audit focus on?" | Scope | **Full audit (Recommended)** — review everything; **Hooks & automation** — hook scripts, settings.json events, lifecycle; **Skills & workflows** — SKILL.md quality, workflow routing, dead skills; **Context & agents** — context file sizes, agent definitions, delegation |
| 2 | "What's the primary goal for this audit?" | Goal | **Find problems (Recommended)** — surface bugs, anti-patterns, stale config; **Optimize** — reduce bloat, improve performance, simplify; **Expand** — identify unused CC features worth adopting; **Modernize** — update to latest CC patterns |

**Call 2 — Pain points (1-2 questions, adjust based on scope):**

| # | Question | Header | Options |
|---|----------|--------|---------|
| 3 | "What's causing the most friction right now?" | Pain point | **Context window pressure** — running out of context mid-task; **Hook failures** — hooks erroring or behaving unexpectedly; **Stale documentation** — docs/skills out of sync with reality; **Agent routing confusion** — wrong agent chosen for tasks |
| 4 | "How mature is this CC setup?" | Maturity | **New** — just getting started with .claude/; **Growing** — actively adding hooks/skills/agents; **Mature** — optimizing an established setup; **Legacy** — needs modernization or cleanup |

## Step 2: Code Review

Based on interview answers, **read actual source files** (not just check existence). Focus the review on the scope selected in Step 1.

### Hook Code Quality
Read each hook script in `.claude/hooks/` and check:
- stdin reading pattern (`readFileSync(0, 'utf-8')` — not streams, not timeouts)
- Exit behavior (must exit 0 even on error — exit 1 blocks CC)
- Output schema compliance (CC 2.1.14+ JSON format)
- Error handling (try/catch around all IO, graceful degradation)
- Shebang + executable bit (`#!/usr/bin/env bun` + `chmod +x`)

### Skill Definition Quality
Read each `SKILL.md` and check:
- Frontmatter completeness (name, context, description with USE WHEN)
- Workflow routing clarity (when does this skill activate?)
- Dead references (→ READ: paths that don't exist)
- Size discipline (<500 lines, progressive disclosure via references/)

### Agent Configuration Quality
Read each agent `.md` and check:
- Clear single purpose (Factor 10: small focused agents)
- Model assignment appropriate for task complexity
- No overlap with other agents (deduplicate responsibilities)
- Tool access matches agent needs

### Settings.json Review
Parse settings.json and check:
- Hook events: all core events configured (PreToolUse, PostToolUse, SessionStart, UserPromptSubmit, Stop)
- Hook timeouts: appropriate for hook complexity (500ms simple, 2000ms+ with bun overhead)
- Permission rules: no unreachable or contradictory rules
- Deny patterns: regex anchoring correct (no bare `$` — use `(;|&&|\|\||$)`)

## Step 3: Gap Analysis

Compare current state against CC capabilities. Present as a matrix:

```markdown
| Capability | Available | In Use | Gap | Priority |
|------------|-----------|--------|-----|----------|
| [feature]  | CC 2.1.x+ | Yes/No | [description] | HIGH/MED/LOW |
```

Priority is informed by the interview: if the user said "context window pressure" then context-saving features get HIGH; if "hook failures" then hook-related gaps get HIGH.

## Step 4: Report

Present findings using the Output Format from SKILL.md (Executive Summary, per-module details, recommendations). Add an **Interview-Driven Priorities** section that maps findings to the stated goal and pain points.
