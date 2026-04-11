# Decision Log

Append-only record of architectural and design decisions. Memory files capture *what* for Claude's recall; this file captures *why* for JM's audit trail.

---

## 2026-04-11 — CC v2.1.85 conditional `if` field evaluated, not adopted

**Chosen:** Keep existing hook architecture (tight matchers + in-script fast-paths). Do NOT migrate hooks to the per-handler `if` field introduced in CC v2.1.85.

**Alternatives:**
- Migrate every tool-event hook to `if`-filtered variants with glob patterns (e.g., `"Bash(rm *)"`, `"Edit(*.ts)"`)
- Split multi-responsibility hooks into many narrow `if`-filtered handlers
- Adopt `if` only for new hooks, leave existing ones alone

**Why NOT adopted:**

Measured baseline (7-day window, 19,681 tool calls):
- ~5,477 hook spawns/day total
- Per-hook real wall-time (measured via `/usr/bin/time`, 5 samples): bun hooks ~20ms, shell hooks ~10ms
- Total daily hook overhead: ~100 seconds/day (~1.7 min/day, ~50 min/month)

Per-hook analysis:
1. **rtk-rewrite.sh** (Bash matcher) — already filters via rtk's own exit codes. `if` can't express "all Bash except trivial" without negation. Glob patterns can't target the no-rewrite set.
2. **pre-tool-use-security.ts** (Bash matcher) — 30+ dangerous-command regex patterns including complex lookaheads (`/rm\s+(-[rfRF]+\s+)*\/(?!tmp\b|home\b)/`). Glob patterns cannot express these. Narrowing the `if` would lose security coverage — non-negotiable.
3. **pre-tool-use-tdd.ts** (Write/Edit/MultiEdit) — has a fast-path that exits in ~20ms when no TDD state exists. Narrowing to source extensions saves ~5s/day. The source-file bug (see below) is better fixed in-script.
4. **pre-tool-use-quality.ts** (Write/Edit/MultiEdit) — runs read-before-edit enforcement (load-bearing per #42796) on ALL file types. Cannot narrow without losing coverage.
5. **post-tool-use.ts** (`*` matcher) — logs every tool call to `tool-usage.jsonl`; introspection miner depends on full log. Cannot narrow.
6. **post-tool-failure.ts / permission-denied.ts** — fire on rare events (failures, denials) and need full coverage.

Qara's hook architecture is already well-optimized: tool-type matchers are tight (`Bash`, `Write`, `Edit`, `MultiEdit`, not `*` where avoidable), hooks with fast-paths short-circuit in <20ms, broad `*` matchers exist only where full coverage is a requirement (logging, audit, security). The `if` field offers the most leverage for hooks that are broadly-matched AND have no fast-path AND only care about a narrow glob-expressible subset — none of Qara's existing hooks meet all three criteria.

Realistic savings if `if` were adopted for TDD hook narrowing: **~5 seconds/day** (=2.5 minutes/month). Not worth the settings.json complexity or the maintenance cost of per-handler `if` entries.

**Trade-offs:**
- Miss out on the ~5 seconds/day TDD savings. Acceptable — that's noise compared to the ~$30-60/month saved from today's model-tier downgrade.
- Future hooks must still evaluate `if` applicability at authoring time. Added to `hook-authoring` skill as a required check.

**What this evaluation DID produce:**
1. **TDD hook correctness fix** (committed 2026-04-11): `pre-tool-use-tdd.ts` previously denied non-source file edits during RED phase because `isTestFile(.md) = false`. Editing `README.md` or `package.json` during RED phase was being denied with "cannot edit source file" which is wrong — docs and configs are not part of the TDD cycle. Added a `SOURCE_EXTENSIONS` gate (.ts/.tsx/.js/.jsx/.mjs/.cjs/.svelte/.py/.rb/.go/.rs/.java/.kt/.php) so TDD enforcement only applies to behavioral source. 6 new tests added, 1557 tests pass.
2. **hook-authoring skill updated** with `if` field documentation and a "when to use it" decision matrix for future hook authors.

**Revisit if:**
- CC adds negation or alternation to permission rule syntax (e.g., `Bash(!git *)` or `Edit(*.{ts,tsx})`).
- A new hook is authored that genuinely satisfies: broad matcher + no fast-path + narrow glob-expressible subset. Use `if` from the start for those.
- The hook-overhead wall-time grows substantially (>5 minutes/day) — re-measure and re-evaluate.
- CC `/cost` per-model breakdown reveals hook-execution overhead on cache-read tokens we haven't been tracking.

**Files touched by this decision:**
- `.claude/hooks/pre-tool-use-tdd.ts` — source-extension gate added
- `.claude/hooks/pre-tool-use-tdd.test.ts` — 6 new tests for non-source RED behavior
- `.claude/skills/hook-authoring/SKILL.md` — `if` field documentation + authoring checklist

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

## 2026-04-11 — Repo-wide skill/workflow trim (agent-direct prose pass)

**Chosen:** Second phase of token-cost remediation. After the planning+execution pipeline trim (11 items, above), apply the same "un-slop without losing power" discipline to every local skill, workflow, command, and agent prompt in `.claude/`. Skills and workflows are read by AI agents, not humans — agents don't need tutorial prose, "You should" framing, duplicated examples, or "why it matters" paragraphs. Preserve exact commands, file paths, decision rules, escalation paths, state machines, output format templates, safety rules, and cross-references. Remove the rhetorical wrapping.

**Alternatives:** (a) Leave narrative files alone on the theory that "it's cheap to read"; (b) trim only the top 3-5 biggest files; (c) wait for a future CC feature like cached skill loading to make it moot.

**Why:** Every skill file loads into context when its workflow runs. The planning+dev phase demonstrated that `create_plan.md` (296→111), `tdd-cycle.md` (256→163), and mode SKILLs can all drop 30-60% without losing a single load-bearing rule. The rest of the repo has the same pattern — tutorial-style prose, duplicated "Quick Reference" sections, verbose example pairs, rhetorical lead-ins like "You are a X specialist". Session-start + every skill invocation reads these files; the aggregate token cost across a month of usage is substantial. Agents don't benefit from the narrative — they benefit from structure and decision rules.

**Execution:** 6 parallel `engineer-high` agents, each assigned a non-overlapping cluster. Explicit "what is slop / what to preserve" guidelines in each prompt. Tests, code files, append-only audit logs, and frontmatter explicitly off-limits.

**Files touched (63 total):**

| Batch | Files | Before | After | Δ | % |
|---|---|---|---|---|---|
| cli-first-guide.md (direct rewrite) | 1 | 734 | 188 | −546 | 74% |
| CORE cluster (aesthetic, contacts, 5 workflows) | 7 | 1763 | 1038 | −725 | 41% |
| cc-upgrade + cc-upgrade-pai | 5 | 1463 | 1154 | −309 | 21% |
| system-create-cli (SKILL + 3 workflows + 3 refs + patterns) | 8 | 2111 | 1365 | −746 | 35% |
| commands (6) + remaining agents (7) | 13 | 1134 | 810 | −324 | 29% |
| research + triage-issue + hook-authoring + introspect (9) | 9 | 1594 | 1207 | −387 | 24% |
| system-create-skill + design-implementation + tdd-qa refs | 10 | 2282 | 1757 | −525 | 23% |
| **Subtotal** | **53** | **11081** | **7519** | **−3562** | **32%** |

Plus the earlier planning+dev pipeline trim (10 files, ~−350 lines).

**Grand total: ~−3912 lines across ~63 files (34% aggregate reduction).**

**Reduction variance explained:**
- High-reduction files (40-75%): narrative-heavy skill prompts (`cli-first-guide.md`, `create_plan.md`, `research/SKILL.md`, `system-create-cli/SKILL.md`, `CORE/workflows/file-organization-detailed.md`).
- Low-reduction files (6-15%): data-dense references where nearly every line is load-bearing (`introspect/workflows/*-reflect.md` — downstream miner parses output formats; `cc-upgrade/references/12-factor-checklist.md` — every factor is a check; `system-create-skill/references/archetype-templates.md` — templates are the product).
- Restraint is correct. The mandate was "un-slop without losing power", not uniform 40%.

**What was removed:**
- "You are a..." and "You should..." lead-ins
- "Overview", "Purpose", "Introduction" headers that repeated the title
- Tutorial-style "first we do X, then we do Y" framing where a numbered list works
- Duplicated "Quick Reference" sections that mirrored the full content
- Verbose example pairs (TS + Python) where one language suffices
- "Key Takeaways" sections that restated the opening principle
- Rhetorical "why it matters" paragraphs unless the why changes behavior
- Emoji-prefixed section headers used purely for visual variety

**What was preserved (load-bearing content contract):**
- Every exact command (`bun test`, `bunx tsc --noEmit`, `git ...`)
- Every file path (`~/.claude/...`, `${PAI_DIR}/...`, `thoughts/shared/plans/...`)
- Every decision rule, threshold, retry limit
- Every escalation path (critic 3× → opus override, verifier 3× → opus override)
- Every state machine (RED → GREEN → REFACTOR, Discover → Plan → Implement → Verify)
- Every safety rule, hard constraint, output format template
- Every cross-reference other files rely on
- All frontmatter (name/description/model/tools/memory/skills fields)
- Append-only audit logs (`cc-upgrade-pai/references/external-skills-registry.md`)

**Validation after trim:**
- `bun run test` — **1550 pass, 0 fail** (same as baseline)
- `bash scripts/check-references.sh` — **0 broken references** (2 fixed post-trim: `QUICKSTART.md` backtick reference in system-create-cli/SKILL.md rephrased, relative workflow links in `references/*.md` prefixed with `../`)
- `bun .claude/hooks/lib/context-graph/cli.ts orphans` — **0 broken references, 0 cycles**

**Trade-offs:**
- A human reading the trimmed files gets less narrative hand-holding. Mitigation: the files are designed for agent consumption, not human tutorial. Humans have git history, DECISIONS.md, and CONSTITUTION.md for the "why".
- Aggressive compression risks losing context that prevented past mistakes. Mitigation: explicit "what to preserve" list for each cluster, spot-checked post-trim for load-bearing content.
- Future additions may accidentally reintroduce slop. Mitigation: update the trim philosophy into `cc-upgrade` audit rules so the next audit pass can detect it.
- Some reference files (archetype-templates.md, setup-guide.md) have legitimate structural duplication (three complete templates; per-project setup steps). The quality hook flagged these; they are kept intact because deduplicating them would defeat the file's purpose.

**Revisit if:**
- Session tests start failing after compaction (maybe a compressed workflow lost information Claude was depending on).
- Agents start producing lower-quality output in trimmed workflows (would need to correlate quality regression to the trim date).
- New files grow without trim discipline — re-run the audit periodically.

**Files specifically skipped:**
- 22 symlinked upstream skills (adapt, animate, arrange, audit, bolder, clarify, colorize, critique, delight, distill, extract, frontend-design, harden, normalize, onboard, optimize, overdrive, polish, quieter, teach-impeccable, typeset, visual-explainer) — upstream-owned, changes would revert on sync.
- All `.ts`, `.test.ts`, `.test.md` files — code, not prose.
- `cc-upgrade-pai/references/external-skills-registry.md` — append-only audit log.
- `spotcheck.md` (41 lines) + `engineer-high.md` (31 lines) — already terse, no slop found.

**Estimated token savings per session:** 7-12k tokens when a session touches the trimmed workflows (read-once or after compaction recovery). Not the main money lever (that was the opus→sonnet downgrade from the earlier phase), but closes the tail of the cost distribution — every small skill invocation is now lighter, and cache-friendliness improves because the static prefixes are smaller.

---

## 2026-04-11 — Planning + execution pipeline token-cost remediation (11 changes)

**Chosen:** Across-the-board token-cost reduction on the planning and execution pipeline. 11 concrete changes driven by deep workflow audit. Biggest levers: (1) downgrade `critic` + `verifier` from opus to sonnet with opus escalation on 3rd retry; (2) rewrite `create_plan.md` to remove double-reads, gate agent spawns on complexity, lazy-load templates, compress reasoning; (3) add plan-cache to `cruise/workflows/plan-entry.md` so phase identification stops re-reading the full plan; (4) drop redundant per-story verifier re-spawns in drive completion (tests + tsc cover cross-story regression); (5) tiered dispatch matrix in `turbo/SKILL.md` so subtasks pick the cheapest sufficient agent; (6) tighten workflow prose for agent-direct consumption (no narrative, no pleasantries).

**Alternatives:** (a) Keep everything opus-tier, optimize prompt caching instead; (b) introduce a model-selection oracle PreToolUse hook (punted as Phase 3 architectural work); (c) stop-gap: run fewer mode sessions (rejected — modes are the quality loop).

**Why:** `rtk cc-economics` reports $3752 spend, RTK saves only $103 (2.7%). RTK is a margin-level optimization. The real money is in agent model tiers and create_plan's defensive reading patterns. Deep audit of `.claude/commands/create_plan.md` (296 lines → 111 lines after rewrite), `cruise/workflows/plan-entry.md` (re-reads plan file every phase identification, ~32k wasted tokens per 8-phase cruise), and `drive/SKILL.md` (spawns verifier per story at completion on top of per-story verifier gates that already ran). `critic.md` and `verifier.md` do mechanical work (grep imports, map criteria to steps, run commands, parse output) where opus pattern-matching earns nothing over sonnet — the loop provides quality, not the tier.

**Changes landed:**
1. `critic.md` + `verifier.md`: `model: opus` → `model: sonnet`. Escalation note: 3rd retry uses `model: opus` override via Task tool.
2. `create_plan.md`: 296 → 111 lines. Removed "read ALL files identified by research tasks... FULLY into main context" (double-read). Gated agent spawns on task complexity. Moved `plan-template.md` read to Step 4. Made `plan-common-patterns.md` conditional on multi-service/migration/unusual-phasing. Compressed 5-dimension reasoning protocol to one-bullet-per-dimension unless task is genuinely architectural.
3. `cruise/workflows/plan-entry.md`: added Plan Cache (`$STATE_DIR/sessions/{id}/memory/plan-cache.json`) with mtime-based invalidation. Re-read plan file only when cache is missing/stale or cruise itself mutates the plan.
4. `cruise/workflows/plan-entry.md`: batched checkbox Edit — rewrite the phase block in a single Edit instead of N edits per criterion.
5. `drive/SKILL.md`: completion regression is `bun test` + `bunx tsc --noEmit`, NOT per-story verifier re-spawns. Per-story gates are the source of truth.
6. `turbo/SKILL.md`: Dispatch matrix mapping subtask complexity → tiered agent variant (haiku-low / sonnet / opus-high).
7. `create_plan.md`, `cruise/SKILL.md`, `drive/SKILL.md`, `turbo/SKILL.md`, `cruise/workflows/plan-entry.md`: working-memory writes now batched per phase/story transition rather than flushed per small event.
8. `tdd-qa/workflows/tdd-cycle.md`: 256 → 163 lines. Deduplicated TS + Python examples, consolidated verify code blocks.
9. Agent prompts tightened for agent-direct consumption: `critic.md`, `verifier.md`, `architect.md`, `reviewer.md`. Removed "You are a..." pleasantries, narrative explanations, redundant examples.
10. All mode SKILLs and workflows: rewritten for imperative agent-direct style. Removed rhetorical "why it matters" paragraphs (agents don't need persuasion).
11. `specs/commands-and-agents.md`: removed stale `/implement_plan` row (caught during verification).

**Total line reduction** (planning + dev pipeline only):
- `create_plan.md`: 296 → 111 (−185)
- `tdd-cycle.md`: 256 → 163 (−93)
- Mode SKILLs + plan-entry + agent prompts: ~150 lines total reduction
- **Aggregate: ~430 lines removed**, ≈ 8-10k tokens saved per session that touches these files.

**Estimated savings:**
- Model downgrade (critic + verifier → sonnet): ~$15-30/month (biggest lever)
- Create_plan double-read removal: ~$4-12/month
- Drive completion verifier drop: ~$2-5/month
- Plan cache: ~$3-6/month
- Other items combined: ~$5-10/month
- **Total: ~$30-60/month** on a $3752 baseline (~1-2% of spend — meaningful but small. The architecture is fundamentally sound; these are marginal closes.)

**Trade-offs:**
- Critic/verifier at sonnet may miss subtle architectural anti-patterns opus would catch. Mitigation: 3rd-retry escalation to opus via Task tool `model` override.
- Plan cache may serve stale data if JM hand-edits plan mid-cruise. Mitigation: mtime comparison on every read.
- Tightened workflow prose assumes agent consumption; a human reading the skill files gets less narrative hand-holding. Mitigation: agents are the primary reader; humans have git history and DECISIONS.md for context.
- Aggressive prose compression risks losing context that prevented past mistakes. Mitigation: DECISIONS.md preserves the "why" for every load-bearing decision.

**Revisit if:**
- Critic escalation to opus fires >30% of the time (sonnet is insufficient).
- Plan cache mtime check produces false negatives (cache served after hand-edit).
- Quality regression: if mode sessions start producing lower-quality code, correlate with the sonnet downgrade and re-evaluate.
- Savings measured after 1 month don't match the estimate (need to re-audit).

**Files touched:** 10 production files (2 agents downgraded, 4 agents tightened, 1 command rewritten, 3 mode SKILLs rewritten, 2 workflow files updated).

---

## 2026-04-11 — /implement_plan deleted, routing migrated to cruise (Phase 1-5 cutover)

**Chosen:** Cold-turkey cutover — delete `/implement_plan` command entirely, migrate all plan-execution routing to `cruise` mode with `planPath` state field and plan-aware workflow. No compatibility shim.
**Alternatives:** Keep `/implement_plan` as a thin alias that invokes cruise (backward-compatible); deprecate slowly with warnings; maintain both commands in parallel.
**Why:** `/implement_plan` and `cruise` had 80% overlapping responsibilities — phase tracking, TDD enforcement, verification gates — and maintaining both caused routing confusion (keyword router had to disambiguate). Cruise mode already has mature quality sniff test, extendIterations, and working memory. Aliasing would preserve the ambiguity; clean cutover forces a single routing path. The 5-phase rollout (Phase 1 schema, Phase 2 plan-entry workflow, Phase 3 cruise delegation, Phase 4 keyword router, Phase 5 deletion) de-risked the migration.
**Trade-offs:** Any in-flight plan referencing `/implement_plan` breaks immediately. Acceptable — no plans were mid-execution at cutover (verified). Muscle memory for the old command needs retraining; CLAUDE.md and routing cheatsheet updated to document cruise entry points.
**Commits:** 569646e (Phase 1), 39be32f (Phase 2), 1836193 (Phase 3), afbfc3d (Phase 4 docs), fad9f7d (Phase 5 deletion).
**Revisit if:** Cruise mode gains complexity that warrants splitting plan execution back into a dedicated command, or if a significantly different execution style emerges (e.g., real-time collaborative plans) that doesn't fit cruise's phase model.

---

## 2026-04-08 — ~/.claude/state symlinked to qara/.claude/state

**Chosen:** `~/.claude/state` → symlink to `qara/.claude/state` (canonical in qara, same as settings.json and .env)
**Alternatives:** Keep separate directories (status quo); only symlink individual files
**Why:** Post-mortem discovered split-brain: post-tool-use hook was writing to `~/.claude/state/tool-usage.jsonl` (14k entries) while `qara/.claude/state/tool-usage.jsonl` (6.8k entries) was stale since April 3. The introspection miner was reading from the correct file (`~/.claude/state/` via pai-paths.ts default), but the split caused confusion during debugging and the qara copy was dead weight. Merged both JSONL files (deduped: 20,871 tool-usage + 10,179 security-checks), moved all subdirs (agents, archive, digests, errors, sessions) and remaining state files to qara.
**Trade-offs:** State files are now in the git repo (risk of accidental commits of large JSONL). Mitigated by `.gitignore` awareness — state files should be gitignored.
**Revisit if:** State files grow too large for the repo, or CC gains native state directory configuration.
