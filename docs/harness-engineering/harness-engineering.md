# Harness Engineering

## Harness Engineering Patterns

Patterns extracted from [OpenAI's harness engineering approach](https://openai.com/index/harness-engineering/) — validated against our own PAI architecture. These are the principles governing how we build with agents.

### Core Philosophy

**Humans steer. Agents execute.**

The engineer's job is not to write code — it's to design environments, specify intent, and build feedback loops that let agents do reliable work. When something fails, the fix is never "try harder" — it's "what capability is missing, and how do we make it legible and enforceable for the agent?"

### The Seven Patterns

#### 1. Map, Not Manual

Agent context files (AGENTS.md, CLAUDE.md) should be ~100 lines — a table of contents, not an encyclopedia.

- **Too much guidance becomes non-guidance.** When everything is "important," nothing is.
- A monolithic instruction file rots instantly and crowds out the actual task.
- Use **progressive disclosure**: agents start with a small stable entry point and are taught where to look next.
- Deep knowledge lives in a structured `docs/` directory as the system of record.

*PAI equivalent: CLAUDE.md + skill routing with just-in-time loading.*

#### 2. Repo-Local Knowledge as System of Record

What the agent can't see in-context doesn't exist. Knowledge in Google Docs, Slack, or people's heads is invisible.

- Every architectural decision, product principle, and team alignment must be pushed into versioned repo artifacts (code, markdown, schemas, executable plans).
- Plans are first-class artifacts — checked into the repo with progress and decision logs.
- A "doc-gardening" agent scans for stale docs and opens fix-up PRs.

*PAI equivalent: `thoughts/` directory, `docs/` patterns, `thoughts-consolidate` skill.*

#### 3. Enforce Invariants, Not Implementations

Define strict boundaries. Allow autonomy within them.

- Enforce *what* (parse data at boundaries), not *how* (Zod vs. other libs — agent's choice).
- Layered domain architecture with strict dependency direction: `Types → Config → Repo → Service → Runtime → UI`.
- Cross-cutting concerns (auth, telemetry, feature flags) enter through a single explicit interface: **Providers**.
- This is architecture you'd usually postpone until 200+ engineers. With agents, it's an early prerequisite — constraints allow speed without drift.

*PAI equivalent: skill boundaries, hook enforcement, CONSTITUTION.md principles.*

#### 4. Custom Lints as Agent Teaching

Linter error messages are agent context injection points.

- Custom linters enforce naming conventions, structured logging, file size limits, dependency directions.
- Error messages are written to include **remediation instructions** — the lint teaches the agent how to fix the violation.
- Because lints are custom, they encode team taste mechanically.
- In a human-first workflow these feel pedantic. With agents, they're multipliers — once encoded, they apply everywhere at once.

*PAI equivalent: hooks with actionable error messages, CI checks.*

#### 5. Agent Self-Validation Loops

Agents validate their own work through the actual application.

- **Chrome DevTools MCP loop**: snapshot before → trigger UI path → snapshot after → apply fix → loop until clean.
- **Observability stack per worktree**: ephemeral Victoria Logs/Metrics/Traces with LogQL/PromQL/TraceQL APIs, torn down when the task completes.
- Makes prompts like "ensure startup < 800ms" or "no critical span > 2s" tractable.
- Enables 6+ hour unsupervised agent runs.

*PAI gap: `design-implementation` skill does browser validation; full observability stack is the next frontier.*

#### 6. Agent-to-Agent Review (Ralph Wiggum Loop)

Agents review each other's work in a loop until all reviewers are satisfied.

- Agent writes code → reviews its own changes → requests additional agent reviews → responds to feedback → iterates.
- Humans may review but aren't required to.
- Over time, almost all review effort moves to agent-to-agent.
- Agents use standard dev tools directly (gh, local scripts, repo-embedded skills) — no copy-paste into CLI.

*PAI equivalent: `reviewer` agent type, Task tool chains. Full loop automation is buildable.*

#### 7. Continuous Garbage Collection

Agent-generated code drifts. Entropy is inevitable. Clean it continuously, not in painful bursts.

- "Golden principles" encoded in the repo — mechanical rules for codebase consistency.
- Recurring background agents scan for deviations, update quality grades, open targeted refactoring PRs.
- Technical debt is a high-interest loan — pay it down in small daily increments.
- Replaced manual "AI slop cleanup Fridays" (20% of human time) with automated processes.

*PAI equivalent: `thoughts-consolidate`, doc gardening. Could extend with scheduled quality-scan agents.*

### Key Technical Choices

| Choice | Rationale |
|--------|-----------|
| Boring tech over trendy | Composable, stable APIs with good training-set representation are easier for agents to model |
| Reimplement over depend | Reimplemented `p-limit` rather than depend on opaque upstream — tighter integration, 100% test coverage, predictable behavior |
| Minimal merge gates | Corrections are cheap, waiting is expensive. Test flakes get follow-up runs, not blocked PRs |
| Per-worktree isolation | App + observability stack per worktree — fully isolated, torn down after task completion |
| Plans as code | Execution plans checked into repo with progress logs — agents operate without external context |

### Architecture Diagram (from OpenAI)

```
Business Logic Domain (per domain, e.g. "App Settings"):

  Utils (shared)
    ↓
  Providers ──→ App Wiring + UI
    ↑
  Service ──→ Runtime ──→ UI
    ↑
  Types ──→ Config ──→ Repo

Dependencies flow FORWARD only. Cross-cutting via Providers only.
Enforced by custom linters — violations break the build.
```

### What We're Building Toward

The OpenAI team arrived at the same patterns PAI already implements, independently validating the architecture. The two capabilities we're adding:

1. **Per-worktree observability stack** — ephemeral logs/metrics/traces so agents can query, correlate, and reason about runtime behavior
2. **Chrome DevTools MCP validation loop** — agents drive the actual application, snapshot before/after, and loop until clean

These are the force multipliers that unlock fully unsupervised multi-hour agent runs.
