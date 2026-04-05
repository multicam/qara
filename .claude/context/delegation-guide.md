# Delegation Guide

When to delegate to agents and how to use them effectively.

## Agent Selection

| Need | Agent | Model | Key trait |
|------|-------|-------|-----------|
| How does code X work? | `codebase-analyzer` | sonnet | Traces data flow, gives file:line refs |
| Design review / UI polish | `designer` | opus | Loads frontend-design skill |
| PRD / system design | `architect` | opus | Loads research skill |
| Implement from spec | `engineer` | sonnet | Code, tests, debugging |
| Review code quality | `reviewer` | opus | Security, perf, correctness |
| Review plan before impl | `critic` | opus | Scenario coverage, scope, risks |
| Verify impl meets criteria | `verifier` | opus | Fresh evidence, quality gates |
| Mine thoughts/ docs | `thoughts-analyzer` | sonnet | Extracts decisions & insights |
| Find relevant thought | `thoughts-locator` | haiku | Fast doc discovery |
| Web research (primary) | `claude-researcher` | haiku | First-line web research via WebSearch |
| Web research fallback | `gemini-researcher` | haiku | When WebSearch fails |
| Web research fallback | `perplexity-researcher` | haiku | When WebSearch fails — strong citations |

## Model Tier Strategy

- **haiku** — Fast, cheap lookups (locating files, fallback searches)
- **sonnet** — Implementation work (coding, analysis, tracing)
- **opus** — Judgment calls (design, architecture, review)

## Parallel Execution

Launch independent agents in a **single message** with multiple `Task` tool calls.

**Good parallel combos:**
- `codebase-analyzer` + `thoughts-locator` — understand code while finding related docs
- Multiple `engineer` agents on independent files (use `isolation: "worktree"`)
- `architect` for design + `gemini-researcher` for prior art

**Must be sequential:**
- `architect` → then `engineer` (need the spec first)
- `engineer` → then `reviewer` (need the code first)
- `thoughts-locator` → then `thoughts-analyzer` (need to know which doc)

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
7. **Research needed** → `claude-researcher` first, then `gemini-researcher` or `perplexity-researcher` as fallback

## Task Packaging

Use `templates/delegation-task.md` for complex delegations. For simple tasks, a clear prompt is enough — don't over-template.

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
