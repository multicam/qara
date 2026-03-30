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

---

## 2026-03-28 — Introspection uses CLI miner + skill workflows (not pure prompts)

**Chosen:** TypeScript CLI (`introspect-miner.ts`) for deterministic log parsing, with skill workflows for AI interpretation and synthesis
**Alternatives:** Pure prompt-based mining (COG-style, no code); full TypeScript pipeline (code for everything including synthesis)
**Why:** CONSTITUTION Principles 2 (Deterministic Code First) and 5 (Goal->Code->CLI->Prompts) dictate that repeatable operations should be code. Log parsing, aggregation, and anomaly detection are deterministic — same input always same output. Pattern synthesis and observation composition require judgment, so they stay as prompt workflows. Inspired by marciopuga/cog but adapted to Qara's Code-Before-Prompts philosophy.
**Trade-offs:** CLI adds a code artifact to maintain. But it's ~200 lines with tests, and deterministic code is easier to debug than prompt-based parsing.
**Revisit if:** CC adds native log analysis tools, or the miner grows beyond 500 lines (suggesting it should become its own standalone tool).

---

## 2026-03-29 — Introspection scheduling via system crontab (not RemoteTrigger)

**Chosen:** All three cadences (daily/weekly/monthly) scheduled via system crontab using `claude -p` with `cd ~/qara &&` prefix
**Alternatives:** RemoteTrigger API (tried — schema undocumented, rejected after 8 failed attempts); `/loop` skill (session-scoped, not persistent); hybrid (crontab for daily, RemoteTrigger for weekly/monthly)
**Why:** System crontab is the most reliable scheduling primitive available — runs regardless of CC state, survives reboots, uses the same pattern as existing qara cron jobs (daily-digest, log-rotate). RemoteTrigger API schema was not discoverable. The `cd ~/qara &&` prefix ensures the claude CLI loads the correct project context.
**Trade-offs:** Crontab means cold-start sessions (no warm context). Acceptable — each cadence is self-contained and loads its own workflow.
**Revisit if:** RemoteTrigger API is documented, or CC adds native scheduled task support.

---

## 2026-03-30 — Context7 MCP for live library documentation

**Chosen:** Context7 MCP (`@upstash/context7-mcp`) on free tier, no API key
**Alternatives:** Docfork (OSS, self-hosted, unlimited but requires setup); Ref ($9/mo, supports PDFs + private repos); direct WebSearch for docs (already available but returns mixed results)
**Why:** Bun, Playwright, and TypeScript ecosystem move fast. Model training cutoff (May 2025) is 10 months stale. Context7 injects current, version-specific docs with two MCP tool calls. Near-zero integration cost (one mcp.json entry). 9,000+ libraries indexed.
**Trade-offs:** Cloud dependency (every query hits Upstash servers, ~15s latency). Free tier limited to 1,000 calls/month (was 6,000, cut 92% in Jan 2026). No offline mode. 3.3k tokens per response consumes context.
**Revisit if:** Free tier hits limits regularly (upgrade to Pro $10/mo or switch to Docfork for self-hosted unlimited). Or if CC adds native doc-fetching capability.

---

## 2026-03-31 — Deep review audit and remediation

**Chosen:** Three-way parallel deep review (code, skills, config) followed by systematic fix-all
**Findings:**
- **C1 (security):** Mattermost token was hardcoded in tracked `mcp.json`. Moved to `.env`, replaced with env var references.
- **C2 (config):** `~/.claude/.env` was a regular file with test data, not the documented symlink. Fixed to symlink to `qara/.claude/.env`.
- **C3 (code):** `introspect-miner.ts` baseline comparison was dead code — early return made it unreachable. Fixed.
- **C4 (skills):** `context-loading-rules.md` had 7+ broken references to removed personal context dirs. Removed stale sections.
- **H1-H3 (code):** Fixed mismatched quote regex, array mutation in extractCCVersion, either/or archive logic (now merges both sources).
- **M1-M5 (code):** CVC consonant doubling, eval regex false positives, ensureDir TOCTOU, arg parsing edge case, prompting skill triggers.
- **W1-W11 (skills/config):** Research agent routing contradiction, missing TDD hook in docs, wrong product-shaping defaults, hollow example-skill, trigger overlaps, hooks-guide gaps, MEMORY lib count, settings-mac drift, duplicate CLAUDE.md.
- **Housekeeping:** Removed literal `~/` dir, stale `.venv`, empty `mcp-servers/`. Expanded CORE on-demand skills list.
**Why:** Accumulated drift between documentation and system state. Several bugs (dead code, archive data loss) only visible through deep review.
**Token impact:** Deduplicated `.claude/CLAUDE.md` saves ~36 lines of redundant context per session.
**Mattermost token:** Needs rotation — was in git history before this fix.
