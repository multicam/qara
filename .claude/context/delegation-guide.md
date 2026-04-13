# Delegation Guide

When to delegate to agents and how to use them effectively.

## Agent Selection

| Need | Agent | Model | Key trait |
|------|-------|-------|-----------|
| How does code X work? | `codebase-analyzer` | sonnet | Traces data flow, gives file:line refs |
| Where does X live? (haiku lookup) | `codebase-analyzer-low` | haiku | Fast file discovery + pattern finding |
| Design review / UI polish | `designer` | opus | Loads frontend-design skill |
| PRD / system design / planning | `architect` | opus | Loads research skill, reasoning protocol, dependency graphs |
| Implement from spec | `engineer` | sonnet | Code, tests, debugging |
| Trivial edit (rename, import fix) | `engineer-low` | haiku | Fast path for small changes |
| Cross-cutting refactor / new abstraction | `engineer-high` | opus | Deep reasoning, architectural changes |
| Review code quality | `reviewer` | **sonnet** | Security, perf, correctness. Opus escalation on 3rd retry. |
| Quick pass/fail review on small diffs | `reviewer-low` | sonnet | Routine correctness checks |
| Review plan before impl | `critic` | **sonnet** | Scenario coverage, scope, risks. Opus escalation on 3rd retry. |
| Verify impl meets criteria | `verifier` | **sonnet** | Fresh evidence, quality gates. Opus escalation on 3rd retry. |
| Find + analyze thoughts/ docs | `thoughts-analyzer` | **haiku** | Discovery + insight extraction. Task is grep+summarize, haiku sufficient. |
| Web research (primary) | `claude-researcher` | haiku | First-line web research via WebSearch |
| Web research fallback | `gemini-researcher` | haiku | When WebSearch fails |

## Built-in Agent Cost Rules

CC's built-in agent types (Explore, Plan, general-purpose) inherit the parent session's model — usually opus. This makes them the most expensive spawn option per token.

| Built-in type | Inherits | Rule |
|---|---|---|
| `general-purpose` | parent (opus) | **NEVER use.** Always specify `subagent_type`. |
| `Explore` | parent (opus) | **Always pass `model: "sonnet"`** (or `"haiku"` for quick file searches). Explore does grep/glob/read — sonnet is sufficient. |
| `Plan` | parent (opus) | Acceptable at opus for complex planning. For quick specs, use `architect-low` (sonnet) instead. |

**Cost per call** (rough, ~40k input + 8k output):

| Tier | Input | Output | Total/call |
|---|---|---|---|
| opus | $0.60 | $0.60 | **$1.20** |
| sonnet | $0.12 | $0.12 | **$0.24** |
| haiku | $0.03 | $0.03 | **$0.06** |

An Explore agent at opus costs 20x more than `codebase-analyzer-low` at haiku for the same file search.

## Model Tier Strategy

- **haiku** — Fast, cheap lookups (locating files, fallback searches)
- **sonnet** — Implementation work (coding, analysis, tracing)
- **opus** — Judgment calls (design, architecture, review)

**Per-task overrides:** Agent frontmatter defines the default model, but the `model` parameter on the Agent/Task tool overrides it. Use overrides when the task complexity doesn't match the agent's default:
- Override `engineer` to haiku for simple file renames or trivial edits (or use `engineer-low` directly)
- Override `codebase-analyzer` to opus for security-sensitive trace analysis
- Override `reviewer` to sonnet for quick pass/fail checks on small diffs (or use `reviewer-low` directly)
- Never override researchers — they're already haiku (cheapest tier)

**Critic + verifier + reviewer escalation (2026-04-12):** `critic`, `verifier`, and `reviewer` all default to sonnet. If the first two calls return `revise`/`FAIL`/`request changes` and the main session issues a third retry, **the third call MUST include `model: opus` override on the Task tool.** This gives sonnet first-pass coverage at ~5× lower cost while preserving opus-level judgment when the sonnet tier struggles. All three agents reference this escalation explicitly and prepend `[ESCALATED]` to their response so the introspection miner's `escalations` field can track safety-net usage. If escalations stay at zero for 2+ weeks, the safety net is either unnecessary or broken — either outcome informs the next tier decision.

**Delegation nudge (2026-04-12):** `keyword-router.ts` now emits a `<system-reminder>` on any out-of-mode prompt containing ≥3 distinct imperative verbs (or ≥3 list items, or ≥4 file paths, or an explicit enumeration cue like "three files"). The nudge says: "spawn parallel agents rather than solo execution". Added after delegation_pct drifted below 1.8% baseline for two consecutive days. The heuristic is mutually exclusive with `suggestMode` — mode triggers still win.

## Parallel Execution

Launch independent agents in a **single message** with multiple `Task` tool calls.

**Good parallel combos:**
- `codebase-analyzer` + `thoughts-analyzer` — understand code while finding related docs
- Multiple `engineer` agents on independent files (use `isolation: "worktree"`)
- `architect` for design + `gemini-researcher` for prior art

**Must be sequential:**
- `architect` → then `engineer` (need the spec first)
- `engineer` → then `reviewer` (need the code first)

## When to Delegate vs Do Inline

**Delegate** when the subtask needs 5+ tool calls, OR when working on 2+ independent concerns. Each subagent runs in a fresh context — intermediate results don't bloat the main session.

**Do inline** when the subtask is 1-3 tool calls on the current topic. Prompt cache amortizes the cost, and subagent spawn overhead (~30k tokens) would exceed the savings.

**Token math:** A 10-tool-call subtask done inline adds ~50k tokens to context, re-read on every subsequent turn. Over 20 turns: 1M extra input tokens. Delegated: main session sees ~2k summary — saving ~980k tokens.

**Rule of thumb:** 3+ sequential Read/Grep calls on a DIFFERENT topic from current work = delegation opportunity. Spawn `codebase-analyzer` (sonnet) or `codebase-analyzer-low` (haiku).

## Review Agent Disambiguation

| Agent | When | What it checks |
|-------|------|----------------|
| `reviewer` | "Review this code", "check for issues" | General code review: correctness, security, performance, maintainability |
| `critic` | "Review this plan", "is this approach right?" | Pre-implementation: approach vs criteria, scenario coverage, scope creep, risks |
| `verifier` | "Verify this works", "check acceptance criteria" | Post-implementation: fresh evidence per criterion, quality gates (regression, coverage, types) |

## Escalation Paths

1. **Simple question** → Answer directly, no agent needed
2. **Code understanding** → `codebase-analyzer`
3. **Multi-file implementation** → `engineer` (or multiple in worktrees)
4. **Complex implementation** → `architect` first, then `engineer`(s)
5. **Pre-impl review** → `critic` before starting work
6. **Quality gate** → `verifier` after implementation (acceptance + test gates), then `reviewer` for code quality
7. **Research needed** → `claude-researcher` first, then `gemini-researcher` as fallback

## Task Packaging

**Minimum viable task:**
- What to do (objective)
- What files to touch
- How to verify success

## Model Tier Escalation

When a subagent hits limits, escalate rather than retry at the same tier.

| Signal | Action |
|--------|--------|
| haiku agent returns incomplete/shallow results | Re-run with sonnet |
| sonnet agent fails on architectural decisions | Re-run with opus |
| Any agent loops >3 times on the same error | Escalate one tier |
| Agent output contradicts known project patterns | Escalate for review |
| Task requires cross-cutting changes (>5 files) | Start at sonnet minimum |

```
haiku → sonnet → opus → AskUserQuestion (JM)
```

Never skip tiers unless the task clearly requires it. Don't send a design review to haiku first. Don't retry the same prompt at the same tier expecting different results.

## Spotcheck Pattern

After parallel agents finish, launch `reviewer` to verify all work:
1. Track what each agent was assigned
2. Define pass/fail criteria per task
3. Have reviewer check each result
4. Roll back any failures before proceeding
