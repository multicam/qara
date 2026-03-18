# Decision Log

Append-only record of architectural and design decisions. Memory files capture *what* for Claude's recall; this file captures *why* for JM's audit trail.

---

## 2025-12-15 — Hooks use readFileSync(0) for stdin

**Chosen:** `readFileSync(0, 'utf-8')` for all hook stdin reading
**Alternatives:** `Bun.stdin.stream()`, custom `readStdinWithTimeout` wrapper
**Why:** Bun.stdin.stream() hangs when no stdin is provided (common in CC hook invocations). readFileSync is synchronous, predictable, and fails fast with an empty string rather than hanging indefinitely.
**Trade-offs:** No async streaming — entire stdin must fit in memory. Fine for CC hook payloads (always small JSON).
**Revisit if:** Bun fixes stdin.stream() behavior for empty/missing stdin, or hook payloads grow beyond a few KB.
**Status (2026-03-19):** Confirmed — streaming APIs hanging on empty stdin is expected behavior, not a Bun bug. readFileSync(0) is the correct pattern for synchronous, small payloads. Hook payloads remain small JSON. Decision stands.

---

## 2025-12-20 — pai-paths.ts warns instead of exit(1)

**Chosen:** `console.error()` warnings on bad paths, never `process.exit(1)`
**Alternatives:** Hard exit on missing PAI_DIR or invalid paths
**Why:** pai-paths.ts is imported by every hook. A hard exit in a shared module crashes all importing hooks — one bad path config takes down the entire hook system. Warnings let individual hooks degrade gracefully.
**Trade-offs:** Silent failures possible if warnings are missed. Mitigated by hooks still functioning and errors being logged.
**Revisit if:** Hook system gets a centralized health check that can surface warnings proactively.
**Status (2026-03-19):** Condition partially met — `hook-test` skill now runs end-to-end hook validation, surfaces errors/warnings, and auto-corrects common issues. Decision still sound: warn-not-exit remains correct even with health checks, since runtime resilience matters independently of diagnostics.

---

## 2025-12-28 — settings.json is a direct symlink

**Chosen:** `~/.claude/settings.json` → direct symlink to `qara/.claude/settings.json`
**Alternatives:** Copy-on-write, settings-minimal.json as separate file, build script that merges
**Why:** Single source of truth. Any edit to either path is immediately reflected. No sync scripts, no drift, no merge conflicts. settings-minimal.json was a redundant duplicate and was removed.
**Trade-offs:** Editing via CC settings UI modifies the repo file directly (could cause accidental commits). Mitigated by git awareness.
**Revisit if:** CC gains native multi-profile settings support, or if repo-level settings need to diverge from global.
**Status (2026-03-19):** Confirmed — CC 2.1.78 has no multi-profile support. No divergence needed. Decision stands.

---

## 2026-01-15 — codebase-pattern-finder merged into codebase-analyzer

**Chosen:** Single `codebase-analyzer` agent handles both deep code analysis and pattern finding
**Alternatives:** Keep as separate specialized agents
**Why:** 80% overlap in tooling and prompts. Two agents doing similar work caused confusion about which to delegate to. Merged agent is simpler to maintain and route to.
**Trade-offs:** Slightly larger agent prompt. Acceptable given the reduced routing complexity.
**Revisit if:** codebase-analyzer prompt exceeds context limits, or pattern-finding needs diverge significantly from code analysis.
**Status (2026-03-19):** Confirmed — prompt size is comfortable, no divergence pressure. Decision stands.

---

## 2026-03-11 — Deleted live-testing and react-best-practices skills (598ee7c)

**Chosen:** Remove both skills entirely, move to purgatory
**Alternatives:** Keep and maintain, or archive as read-only references
**Why:** live-testing duplicated what hooks + Playwright already handle. react-best-practices was language-specific bloat in a TS-first system that rarely touches React. Both were dead weight after the cleanup audit showed they had zero recent usage.
**Trade-offs:** If JM starts a React-heavy project, react patterns would need to be rebuilt. Acceptable — better to build fresh than maintain stale rules.
**Revisit if:** A project requires sustained React work, or live-testing patterns aren't fully covered by existing hooks + Playwright skill.
**Status (2026-03-19):** Confirmed — no React projects active, hooks + Playwright cover live-testing needs. Decision stands.
