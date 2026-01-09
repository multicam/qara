# Claude Code 2.1.2 Features Used

This document tracks which Claude Code features this PAI uses, for compatibility tracking.

## Current Version

- **CC Version:** 2.1.2
- **Last Audit:** 2026-01-09

## Feature Usage Matrix

| Feature | Min Version | Status | Usage Location |
|---------|-------------|--------|----------------|
| Subagents | 1.0.80 | **Adopted** | `.claude/agents/` (17 agents) |
| Checkpoints | 2.0.0 | **Adopted** | `checkpoint-protocol.md` |
| Hooks (settings.json) | 2.1.0 | **Adopted** | `.claude/settings.json` (8 events) |
| Skills System | 2.0.40 | **Adopted** | `.claude/skills/` (16 skills) |
| Plan Mode | 2.0.50 | **Available** | Used on-demand |
| Model Routing | 2.1.0 | **Adopted** | `frontend-design`, `research` skills |
| Status Line | 2.1.0 | **Adopted** | Custom status via hooks |
| WebSearch | 2.1.0 | **Adopted** | `research` skill |
| AskUserQuestion | 2.1.0 | **Adopted** | `delegation-guide.md` |
| Background Tasks | 2.1.0 | **Adopted** | `delegation-guide.md` |
| Task Resume | 2.1.0 | **Adopted** | `delegation-guide.md` |
| PreCompact Hook | 2.1.x | **Adopted** | `settings.json` |
| Skill Invocation | 2.1.0 | **Adopted** | All skills via `context:` field |

## Hooks Configuration

All 8 CC hook events are configured:

| Hook Event | Scripts |
|------------|---------|
| PreToolUse | `capture-all-events.ts` |
| PostToolUse | `capture-all-events.ts` |
| SessionStart | `session-start.ts`, `capture-all-events.ts` |
| SessionEnd | `capture-all-events.ts` |
| UserPromptSubmit | `update-tab-titles.ts`, `capture-all-events.ts` |
| Stop | `stop-hook.ts`, `capture-all-events.ts` |
| SubagentStop | `subagent-stop-hook.ts`, `capture-all-events.ts` |
| PreCompact | `capture-all-events.ts` |

## Skills with Model Routing

| Skill | Model | Reason |
|-------|-------|--------|
| frontend-design | sonnet | Design requires creativity |
| research | sonnet | Complex reasoning needed |

## 12-Factor Compliance

| Factor | Status | Score |
|--------|--------|-------|
| 1. Natural Language to Tools | Full | 2/2 |
| 2. Own Your Prompts | Full | 2/2 |
| 3. Own Your Context Window | Full | 2/2 |
| 4. Tools Are Structured Outputs | Full | 2/2 |
| 5. Unify Execution State | Full | 2/2 |
| 6. Launch/Pause/Resume | Full | 2/2 |
| 7. Contact Humans with Tools | Full | 2/2 |
| 8. Own Your Control Flow | Full | 2/2 |
| 9. Compact Errors | Full | 2/2 |
| 10. Small Focused Agents | Full | 2/2 |
| 11. Trigger from Anywhere | Full | 2/2 |
| 12. Stateless Reducer | Full | 2/2 |

**Total Score: 100%** (24/24)

## CC 2.1.x New Features Adopted

1. **Image metadata** - Supported via hooks
2. **File hyperlinks** - Supported in output
3. **PreCompact hook** - Configured for event capture
4. **Error compaction** - Implemented in `stop-hook.ts`

## Upgrade Path

When new CC versions release:

1. Check CHANGELOG at `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md`
2. Run `/cc-pai-optimiser` to audit against new features
3. Update this document with adoption status

---

**Last Updated:** 2026-01-09
