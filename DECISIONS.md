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
**Status (2026-04-06):** Confirmed — CC 2.1.92 has no multi-profile support. No divergence needed. Decision stands.

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
**Trade-offs:** CLI adds a code artifact to maintain. But it's deterministic code with tests, easier to debug than prompt-based parsing.
**Revisit if:** CC adds native log analysis tools, or the miner grows beyond 500 lines per module.
**Status (2026-04-02):** Miner reached 690 lines total, triggering the 500-line revisit condition. Resolved by extracting `miner-lib.ts` from `introspect-miner.ts`, then adding `miner-trace-lib.ts` (Phase 2) and `experiment-tracker.ts` (Phase 4). Current: miner-lib 498 lines, introspect-miner 422 lines, miner-trace-lib 490 lines, experiment-tracker 306 lines. All under threshold. Decision stands.

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

---

## 2026-04-01 — RTK adopted for token-efficient CLI sessions

**Chosen:** RTK (Rust Token Killer) v0.34.2 as global CLI proxy via PreToolUse hook
**Alternatives:** No proxy (status quo); custom filtering in post-tool-use hook; context window management via prompt engineering
**Why:** 60-90% token reduction on Bash output with <10ms overhead. Opus sessions are expensive; RTK amortizes quickly. MIT-licensed, 16k stars, Rust binary. Complements Phase 1 trace enrichment — different concerns (working model efficiency vs introspection signal).
**Trade-offs:** External binary dependency. Only filters Bash tool calls (not Read/Grep/Glob). Young project (months old). Settings.json patching requires care with symlink setup.
**Revisit if:** RTK project goes unmaintained, or CC adds native output compression, or token costs drop significantly.

---

## 2026-04-01 — Meta-Harness-inspired trace enrichment (Phase 1)

**Chosen:** Enrich post-tool-use and stop hooks with structural metadata (input_summary, output_len, error_detail, message_len, has_code_blocks, topic_hint)
**Alternatives:** Full output logging (privacy risk, storage bloat); summary-based logging (Meta-Harness ablation proved this ineffective); status quo (91 bytes/entry, "scores only" tier)
**Why:** Meta-Harness ablation study (Lee et al., arXiv 2603.28052) showed full traces at 50.0% median vs scores-only at 34.6%. Qara was at "scores only" tier. Enriched traces enable Phase 2 causal reasoning (recovery patterns, repeated failure detection) without logging sensitive content.
**Trade-offs:** ~3x storage increase per entry (91→300 bytes). Acceptable — gzip compression and existing rotation handle it. All new fields optional for backward compat.
**Revisit if:** Storage growth becomes a concern (monitor via `wc -l` on state files), or CC adds native trace logging.

---

## 2026-04-07 — Gemma 4 local LLM via Ollama adopted across stack

**Chosen:** Gemma 4 E4B (8B params, Q4_K_M) via Ollama for local inference — daily introspect reflect, Diderot reasoning, TGDS code review, MCP server for Claude Code, vision-based screenshot analysis.
**Alternatives:** Keep all AI on cloud APIs (status quo, ~$50/year for daily reflect alone); use Qwen 3 14B (stronger code but no vision/audio); use Llama 3.1 (already in Diderot, weaker than Gemma 4).
**Why:** Zero marginal cost, <1sec latency, privacy (code never leaves machine), vision capability, Apache 2.0 license. Gemma 4 E4B outperforms Llama 3.1 8B on reasoning (MMLU Pro 69.4% vs ~55%) at same VRAM. RTX 3090 handles it comfortably.
**Trade-offs:** 8B model can't match Claude for complex synthesis — weekly/monthly introspection stays on Claude. Vision works but misses subtle pixel-level differences (semantic, not pixel-perfect). Audio not yet supported by Ollama transport layer.
**Revisit if:** Ollama adds audio support (re-evaluate 5C), Gemma 5 releases, or a stronger local model appears that fits in 24GB VRAM.

---

## 2026-04-08 — ~/.claude/state symlinked to qara/.claude/state

**Chosen:** `~/.claude/state` → symlink to `qara/.claude/state` (canonical in qara, same as settings.json and .env)
**Alternatives:** Keep separate directories (status quo); only symlink individual files
**Why:** Post-mortem discovered split-brain: post-tool-use hook was writing to `~/.claude/state/tool-usage.jsonl` (14k entries) while `qara/.claude/state/tool-usage.jsonl` (6.8k entries) was stale since April 3. The introspection miner was reading from the correct file (`~/.claude/state/` via pai-paths.ts default), but the split caused confusion during debugging and the qara copy was dead weight. Merged both JSONL files (deduped: 20,871 tool-usage + 10,179 security-checks), moved all subdirs (agents, archive, digests, errors, sessions) and remaining state files to qara.
**Trade-offs:** State files are now in the git repo (risk of accidental commits of large JSONL). Mitigated by `.gitignore` awareness — state files should be gitignored.
**Revisit if:** State files grow too large for the repo, or CC gains native state directory configuration.
