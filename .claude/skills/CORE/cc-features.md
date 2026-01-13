# Claude Code 2.1.2 Features Used

This document tracks which Claude Code features this PAI uses, for compatibility tracking.

## Current Version

- **CC Version:** 2.1.2
- **Last Audit:** 2026-01-14
- **Recent Improvements:** Article-based optimizations (checkpoint hints, context monitoring, error learning, skill suggestions)

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

| Hook Event | Scripts | Enhanced Features |
|------------|---------|-------------------|
| PreToolUse | `pre-tool-use-security.ts`, `capture-all-events.ts` | Checkpoint hints (2026-01-14) |
| PostToolUse | `post-tool-use-audit.ts`, `capture-all-events.ts` | Error pattern learning (2026-01-14) |
| SessionStart | `session-start.ts`, `capture-all-events.ts` | Skill suggestions (2026-01-14) |
| SessionEnd | `capture-all-events.ts` | - |
| UserPromptSubmit | `update-tab-titles.ts`, `capture-all-events.ts` | - |
| Stop | `stop-hook.ts`, `capture-all-events.ts` | - |
| SubagentStop | `subagent-stop-hook.ts`, `capture-all-events.ts` | - |
| PreCompact | `capture-all-events.ts` | - |

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

## Article-Based Improvements (2026-01-14)

Implemented from [Sankalp's Claude Code 2.0 article](https://sankalp.bearblog.dev/my-experience-with-claude-code-20-and-how-to-get-better-at-using-coding-agents/):

### Phase 1: High Priority ✅
1. **Checkpoint Hints** - PreToolUse hook suggests checkpoints before high-risk operations (>5 min since last)
   - Tracks 13 high-risk patterns: rm -rf, git reset --hard, DROP TABLE, etc.
   - State: `.claude/state/last-checkpoint.json`
   - Impact: 60% → 95% checkpoint usage (target)

2. **Context Monitoring** - Status line displays effective context budget (60% of stated capacity)
   - Color-coded indicators: ✅ (0-60%), ⚠️ (60-80%), 🚨 (80%+)
   - Based on research: effective usage ~50-60% of 1M token capacity
   - Impact: 75% reduction in context issues (target)

3. **Plan Mode Formalization** - Workflow routing for complex tasks
   - "plan this out" → /plan mode with create_plan
   - "explore codebase" → exploration-pattern.md (3-agent parallel pattern)
   - Documented: `.claude/skills/CORE/workflows/exploration-pattern.md`

### Phase 2: Medium Priority ✅
4. **Error Pattern Learning** - JSONL database of errors + solutions
   - Auto-logs errors in PostToolUse hook
   - Suggests known solutions when patterns recur
   - 10 seed patterns: ENOENT, TS2339, HTTP 401/404/429, git merge conflicts
   - State: `.claude/state/error-patterns.jsonl`
   - Library: `.claude/hooks/lib/error-patterns.ts`
   - Impact: 30% reduction in error iterations (5-7 → 3-4, target)

5. **Skill Suggestion System** - Context-aware skill discovery at session start
   - Analyzes: package.json, session-context.md, directory names
   - 8 skills mapped to pattern triggers
   - Non-intrusive display via console.error
   - Impact: Proactive feature discovery vs reactive

## Upgrade Path

When new CC versions release:

1. Check CHANGELOG at `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md`
2. Run `/cc-pai-optimiser` to audit against new features
3. Update this document with adoption status

## Success Metrics

Track for 2 weeks after 2026-01-14 implementation:

- **Checkpoint Usage**: 60% → 95% (before risky operations)
- **Context Issues**: 2/week → 0.5/week (75% reduction)
- **Error Iterations**: 5-7 → 3-4 (30% reduction)
- **Skill Discovery**: Reactive → Proactive

---

**Last Updated:** 2026-01-14
