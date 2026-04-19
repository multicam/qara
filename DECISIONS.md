# Decision Log

Append-only record of architectural and design decisions. Memory files capture *what* for Claude's recall; this file captures *why* for JM's audit trail.

Older entries live in `decisions/` year archives: [2025](decisions/2025.md) · [2026 (Jan–Mar)](decisions/2026.md).

> Style: see `.claude/CLAUDE.md` § Documentation Hygiene (Agent-Facing).

---

## 2026-04-19 — Memory system redesign: minimal-elegant, mirror DECISIONS.md pattern

**Problem:** Two native memory systems (CC's auto-injected MEMORY.md + PAI's session/memory/) with 8 gaps — chiefly G3 (CC silently truncates newest entries first past 200 lines OR 25 KB per v2.1.98 / #39811), G1 (session→project handoff missing), G6 (`DECISIONS.md` vs session `decisions.md` grep collision), G2/G7 (session-dir + stub MEMORY.md accumulation).

**Actions:**
- `session-start.ts` gains `checkMemoryBudget()` pure export + call site. Fires at 70 % of line-OR-byte budget (max(linePct, bytePct)). Single tunable `MEMORY_WARN_PCT = 70`. Direct-run guard added so tests can import the pure function.
- `~/.claude/scripts/memory-gc.sh` (86 lines Bash, cron-safe): two sweeps — empty session dirs > 14 d (three gates: mtime + no compact-checkpoint.json + empty memory/) + stub MEMORY.md (≤ 2 lines). `set -e` pitfall with `[ ] && cmd` found during TDD; rewritten with `if/then/fi`. Session-id treated as opaque (UUID or slug).
- Renamed session `decisions.md` → `mode-decisions.md` across `working-memory.ts`, 3 test files, 5 skill/doc files. One-shot migration script ran once (5 on-disk files renamed), then deleted.
- `memory-format.md` (Tier-2 pointer-gist convention) + global-tier "Cross-project pointers" section in `~/.claude/CLAUDE.md`.

**Why:** Ultrathink collapsed a 7-phase auto-distill + shared-primitive design down to 4 targeted changes after the CC native audit. DECISIONS.md already demonstrates the elegant pattern — grow append-only, hand-curated, archive oldest when near threshold. Only irreducible automation is the warning, because `#39811` drops newest entries silently. Everything else (compaction engine, `/distill-session` skill, CLI, primitive, retrofit) was preventively solving problems JM handles in 2 minutes manually. During implementation, discovered `loadCheckpoint()` is already wired at `session-start.ts:154` — the original G4 "dormant code" claim was wrong.

**Net:** Tests **2000 → 2022 pass** (+22 new: 8 memory-warning + 13 GC + 1 rename cascade). PAI audit **214/214** holds. 94 test files (+1). ~60 lines of permanent custom code + ~86 lines of Bash; throwaway script deleted post-run.

**Revisit if:** CC ships native compaction/cross-project memory/budget-warning (all candidates to remove), warning at 70 % fires too rarely to prevent truncation loss (bump to 60 %), or stub MEMORY.md regenerates faster than daily sweep (investigate CC harness behavior). Plan: `thoughts/shared/plans/infra--memory-system-redesign-v1.md`.

---

## 2026-04-18 — cc-upgrade iterative review inbox: unify 8 audit feeds + obsolescence detector

**Problem:** Eight audit feeds (cc-feature-sync, context-graph orphans/advisory/broken-refs, validateCrossSkillRefs, skill-pulse-check, analyse-pai, analyse-external-skills, cc-version-check feature-unused) accumulate findings the human never processes. April's monthly run tracked 13 CC version bumps but promoted zero features. Failure point = the human gate, not the detectors.

**Actions:**
- New subtree `.claude/hooks/lib/cc-upgrade-inbox/` with `types.ts`, `state.ts` (atomic load/save, canonicalizeSource, detectOrphanedIgnores, isSuppressed), 7 feeds wrapping existing audits + 1 new `obsolescence` detector (4 sub-checks: hook-removed-event, mcp-server-unused≥90d, feature-unused-long≥180d, CLAUDE.md-native-duplicate).
- `aggregate.ts` with suppression + bulk-eligibility (≥5 threshold). `actions/safe.ts` applies cc-feature appends + cross-skill-ref rewrites + `npx skills update`. `actions/unsafe.ts` writes to `~/.claude/state/cc-upgrade-action-queue.md`.
- `review-cli.ts` entrypoint. Grandfathers every non-obsolescence finding on first run. `cc-feature-sync.ts --since-baseline <v>` flag + JSON-only mode. `analyse-pai.ts --append-inbox` opt-in flag.
- `/cc-upgrade-review` command + `review-inbox.md` workflow. `monthly-evolve.md` step 3 now delegates changelog scan to the inbox.

**Why:** Iterative review with persistent decisions beats "read the changelog and hope". Tiered accept separates safe auto-edits from judgement calls, so the CLI can apply the mechanical work without touching refactors. Grandfather clause on first run handles accumulated backlog without drowning the user. Obsolescence exempt because 90d+ signal is load-bearing. Canonical `skill:<name>:<relPath>` IDs survive file moves within a skill.

**Net:** Tests **1,920 → 2,000 pass** (+80). PAI audit **214/214** holds. Typecheck clean (no new errors in touched files). 5 pre-existing test-file errors unchanged.

**Revisit if:** first-run triage exceeds 20 min (re-evaluate grandfather defaults), obsolescence produces >5 FP/month (tighten thresholds), JM skips `/cc-upgrade-review` >60 days (consider session-start nudge), 3rd-party adopts PAI (extract inbox lib).

---

## 2026-04-18 — Audit alignment: documentation hygiene rule + PAI-local skill classification + feature tracking

**Problem:** Three audit-surface gaps after the full sweep: (1) no central rule for Claude-facing doc conciseness, (2) `skill-pulse-check` flagged `harden` + `impeccable` as "no repository URL" — but 2026-04-15 explicitly decided they're PAI-maintained not upstream-tracked, (3) `cc-feature-sync` showed 260 changelog versions untracked, most noise, a few architectural.

**Actions:**
- Added `## Documentation Hygiene (Agent-Facing)` section to `.claude/CLAUDE.md` (scope, Keep/Drop, target, archive rule). `DECISIONS.md` swapped its 9-line style block for a 1-line pointer. `cc-upgrade-pai/SKILL.md:291–295` health check references the rule; `introspect/references/proposal-format.md` notes proposals flowing into IMPROVEMENT_LOG / DECISIONS must comply.
- Extended `InstalledSkill` with `maintenance: 'upstream' | 'local'`. New `readMaintenance()` reads `.claude-plugin/plugin.json` → `"maintenance": "local"`. Pulse CLI skips upstream fetch for local skills and renders them as `[LOCAL ]` under a new "LOCALLY MAINTAINED" section; they're excluded from "SKILLS WITHOUT GITHUB TRACKING". Added plugin.json for `harden` + `impeccable` with `maintenance: "local"`. DRY'd the default-UpstreamData shape via `emptyUpstreamData()`. +9 tests.
- Added 4 CC features to `FEATURE_REQUIREMENTS`: `preCompactBlocking` (v2.1.105), `pushNotificationTool` (v2.1.110), `xhighEffort` (v2.1.111), `sandboxDeniedDomains` (v2.1.113). All `detectable: false` — tracked for visibility, not enforced.
- `analyse-external-skills.ts` progressive-disclosure check now accepts `reference/` (singular) in addition to `references/` — matches impeccable's filesystem layout; avoided renaming 7 existing doctrine pointers.

**Why:** Silent false positives desensitize audits — the "no repository URL" advisory was load-bearing noise. Classifying deliberate PAI-local skills explicitly aligns audit with the 2026-04-15 tracking-model decision. Feature registry is a scoreboard, not a changelog mirror — add the few architectural features that matter. The `reference/` vs `references/` split was a terminology inconsistency; fixing the audit is cheaper than renaming 7 skill cross-refs.

**Net:** Tests **1,911 → 1,920 pass** (+9). PAI audit **214/214** holds. Pulse output: 1 ACTIVE + 2 LOCAL (down from 1 ACTIVE + 2 [?] errors). External skills audit: 1/3 → 2/3 progressive disclosure (score 46/50 unchanged — binary gate). No regressions.

**Revisit if:** 3rd+ external skill arrives and is PAI-local (consider auto-discovery from registry), or when the FEATURE_REQUIREMENTS registry drifts >5 versions behind.

---

## 2026-04-18 — Skills-review remediation: cross-skill ref policy, advisory scanner, keyword-router coverage

**Problem:** 2026-04-17 fix rewrote `tune/SKILL.md` to use `../impeccable/reference/X.md` but 7 sibling skills (review, flows, finish, design-research, enhance, design-system, impeccable-typeset) kept the bare form — ~20 broken cross-skill doctrine pointers. Scanner silently skipped unresolvable TABLE refs to dodge false positives from upstream docs. `harden` lacked keyword-router entry. Stray space in `"Bash( /dev/sda)"` deny pattern made it unreachable. Empty `~/.local/share/pnpm/` from a literal-`~` mkdir.

**Actions:**
- Rewrote 7 SKILL.md: `impeccable/reference/` → `../impeccable/reference/`.
- New validator rule `validateCrossSkillRefs` in `skill-validator-lib.ts` (warning: `cross-skill-ref-unprefixed`). Scans backticked `<sibling>/<path>.md` without `../`. +9 tests.
- New scanner `extractAdvisoryBrokenTableRefs`: re-scans table-cell refs where first segment = sibling skill AND path ≥3 segments (heuristic separates `grill-me/SKILL.md` 2-seg upstream from `impeccable/reference/typography.md` 3-seg internal). CLI reports as "Advisory table-cell refs". +3 tests.
- Canonicalized 3 non-standard READ callsites: `cc-upgrade/SKILL.md:31`, `cross-provider/SKILL.md:44`, `tdd-qa/SKILL.md:55`.
- `harden` added to `keyword-routes.json` (8 activation phrases).
- Removed `"Bash( /dev/sda)"`; kept `"Bash(> /dev/sda)"`.
- `rmdir` empty `~/.local/share/pnpm/` (4 dirs).
- Documented rule in `CORE/skill-structure.md` § Cross-Skill References + requirement #6 in `system-create-skill/SKILL.md`.

**Why:** Silent failures compound — advisory channel (non-blocking, labelled) keeps FP tolerance while surfacing real bugs. Validator-level enforcement catches the pattern at skill-creation time. Warning severity (not error) lets edge cases through review. `harden` was only activatable via `/harden`; sibling design skills have natural-language entries.

**Net:** 1,899 → 1,911 tests (+12). Typecheck clean. cc-upgrade-pai audit 214/214 holds. Infra baseline unchanged (34 skills, 19 hooks, 17 libs, 16 agents).

---

## 2026-04-17 — PAI audit fixes: symlink recovery, thoughts relocation, graph hygiene

**Problem:** cc-upgrade-pai scored 209/214 with 1 broken ref, 3 misplaced plans in `.claude/skills/thoughts/`, 2 pending skills-review flags (`harden`, `visual-explainer`), 2 large tier-3 orphans. Root causes: cross-skill refs `impeccable/reference/...` resolved vs source skill's dir not `skills/`; orphaned plans counted as ghost skill; scanner only detects bolded `**READ:**` refs.

**Actions:**
- Added `.claude/skills/impeccable → ../skills-external/impeccable` symlink.
- `tune/SKILL.md`: `impeccable/reference/` → `../impeccable/reference/` (11 occurrences).
- Relocated 3 plans from `.claude/skills/thoughts/shared/plans/` to `thoughts/shared/plans/`. Removed empty `.claude/skills/thoughts/` — dropped 7,537 orphan tokens + ghost skill (analyser count 37 → 34).
- Converted 5 `-> READ:` refs to `→ **READ:**` in `cc-upgrade-pai/SKILL.md` + `workflows/external-skills-deep-analysis.md`.
- `CORE/SKILL.md:72`: backticked filenames → explicit hyperlinks (matches `LINK_PATTERN`).
- Logged ACCEPT for `harden` (description + frontmatter) and `visual-explainer` (desc expansion: `project recap`, `plan review`, proactive ASCII→HTML) in `external-skills-registry.md`.
- OMC v4.12.0: SKIP (bug-fix + already-handled patterns). Two MONITOR items carried (per-role provider routing, release-automation-as-agent).

**Why:** Graph audits only work if they match real ref syntax. Cross-skill refs to shared doctrine (e.g., `impeccable/reference/color-and-contrast.md`) are load-bearing — `tune` explicitly delegates rule ownership to `impeccable`. `../impeccable/...` is the portable form (symlink or copy, survives reorg). Canonicalizing refs is cheaper than looser scanner patterns that would catch prose matches.

**Net:** analyse-pai **209 → 214/214 (100%)**. Broken 1→0. Orphan tier-3 tokens ~39K → ~19K. Tests 1,899/1,899. Infra: 39 skills, 16 agents, 17 libs, 19 hooks (ghost skill replaced by impeccable symlink).

---

## 2026-04-16 — Design skills pipeline-stage consolidation (v1.1)

**Problem:** 10 reference-only design skills had no activation path. Research/inspiration lifecycle gap. No DESIGN.md support. `tokens` was a thin alias with no brand-from-zero capability.

**Chosen:**
- 3 pipeline-stage skills absorbing 8 reference-only: `review` (critique+audit), `enhance` (layout+animate+adapt+optimize), `finish` (polish+clarify).
- `design-system` subsumes `tokens` — 4 modes: generate (DESIGN.md via devtools-mcp), consume, extract, enforce.
- `design-research` (3 modes: moodboard, competitive, inspiration).
- Removed `tokens`. Deleted 17 broken Factory symlinks.

**Sources studied:** VoltAgent awesome-design-md (66 DESIGN.md, Google Stitch spec), recursive-mode, Diderot (22 articles + 10 web sources, Designpowers 10-agent team, "skill architecture over individual skills").

**Net:** 15 active design skills (13 local + 2 symlinked), 0 reference-only, 1 lifecycle gap (post-ship, parked Q3 2026). Tests 148 pass (57 keyword + 91 validation). Plan: `.factory/specs/2026-04-16-design-skills-enhancement-plan-v1-1-refined.md`.

---

## 2026-04-16 — Context pointer migration (memory, skills, delegation)

**Problem:** MEMORY.md 28.7KB was truncating (limit ~24.4KB). Always-loaded context ~39KB (~9,770 tokens). Research confirmed: pointers > payloads, quality degrades ~40% when context doubles (Anthropic), "remember why not what" lifted recall 60→93% (El Fassi), "map not manual" (OpenAI Codex).

**Actions:**
- MEMORY.md: 28.7KB/116 lines → 1.7KB/35 lines. Extracted hook-dev-rules, symlink-topology, mcp-config.
- CORE SKILL.md: 8.0KB → 6.3KB.
- 27 skill descriptions trimmed to ≤200 chars (10.7KB → 5.7KB).
- PreCompact hook: Hermes-pattern memory flush prompt before compaction.
- `delegation-guide.md`: 3-bullet Task Packaging → briefing packet template (4-section + good/bad + "pass paths not content").
- 3 agent files (engineer, engineer-high, codebase-analyzer): spawner note.
- Deleted 17 broken symlinks from `.claude/skills/`.
- `skills-validation.test.ts`: NON_SKILL_DIRS excludes `thoughts/` (fixes 7 pre-existing failures).
- Codified MEMORY.md session-boundary write rule (cache stability).

**Net:** ~33.6KB (~8,400 tokens) savings/session. Skills 44 → 34 (32 local + 2 symlinked). Plan: `thoughts/shared/plans/infra--memory-pointer-migration-v1.md`. Research: `thoughts/shared/plans/research--pointers-in-context-memory-v1.md`.

---

## 2026-04-16 — jcodemunch activation audit + Phase 4 benchmark scaffold

**Finding:** 16 sessions since 2026-04-15 activation. **Zero** real `mcp__jcodemunch__*` invocations — every match in `tool-usage.jsonl` was a grep or ToolSearch query. Index `~/.code-index/local-lib-38808468.db` was scoped to `.claude/hooks/lib/` only.

**Chosen:** Path A — run benchmark + wire jcodemunch into code-exploration surfaces.

**Actions:**
- Indexed full qara repo: `local/qara-379c52b4`, 277 files, 3,699 symbols, 1.87s. `extra_ignore_patterns` correctly excludes `thoughts/`, `purgatory/`, `skills-external/`, `state/`, etc.
- Agent surface: added "jcodemunch-first protocol" to `codebase-analyzer(-low).md`, `engineer(-high).md` mapping situations→tool calls with Grep/Read fallback.
- Routing surface: `delegation-guide.md` §MCP Tools expanded; `routing-cheatsheet.md` §6a added; CORE pointer.
- Benchmark protocol at `thoughts/shared/benchmarks/jcodemunch-phase4.md`: 5 A/B scenarios (S1 caller search, S2 symbol body, S3 blast-radius rename, S4 dead-code audit, S5 markdown prose — Grep should win). Acceptance: ≥3/5 wins @ ≥50% token reduction = Builder tier; <2/5 wins = revert. Runs log to `jcodemunch-runs.jsonl`, decision doc `jcodemunch-decision-2026-04-22.md`.

**Why:** Zero-use after 16 sessions = signal. Adoption is behavioral: `claude mcp list` green from day one, so the gap is explicit first-touch rules in agents (where Claude reads guidance) and delegation surface. Benchmark adjudicates whether the tool actually saves tokens in Qara's workload vs. whether surface alone is enough.

**Rejected:**
- Abandon without benchmark — sunk setup cost is small; surface updates are useful regardless.
- Surface via keyword router — jcodemunch is a tool, not a skill; agent-level guidance is the right abstraction.
- Automated re-indexing on commit — parked until benchmark succeeds.

**Net:** 1870 tests pass. qara index: 0 → 3,699 symbols. Baseline: 0 invocations as of 2026-04-16 07:40. License still non-commercial; Builder tier ($79) decision deferred to EOD 2026-04-16 (compressed per JM: heavy coding day provides sufficient sample).

**Same-day followups (2026-04-16):**
- Decision date compressed 2026-04-22 → 2026-04-16 EOD.
- TDD violation fixed on `analyzeMcpJcodemunch`: +17 fixture tests + 4 qara integration tests. Regression test for relative-path bug.
- DRY refactor on `analyse-pai-lib.ts`: extracted `readJsonSafe<T>()` + `fileContainsPattern()`. −13 LOC.
- Relative-path bug fixed: `paiPath.split('/').pop()` on `.` returned `.`, missing `qara-*.db` prefix → bogus "run index_folder" rec. Fix: `basename(resolve(paiPath))`. Audit scores 20/20 regardless of invocation.
- TDD scorer convention: `-lib.ts` files MUST have `-lib.test.ts` for Rule B regex to fire. `miner-skills.test.ts` → `miner-skills-lib.test.ts` brought TDDCOMPLIANCE 18/20 → 20/20. Total audit: **214/214**.

---

## 2026-04-16 — Design-skills landscape consolidation (plan v1.2)

**Chosen:**
- **Merge** `bolder` + `quieter` + `colorize` → `tune` (thin dispatcher, 3 modes). Delegates doctrine to `impeccable/reference/*.md`.
- **Wrap** upstream `typeset` → `impeccable-typeset` (thin wrapper).
- **Add** `tokens` (thin alias, 39 lines) delegating to `/impeccable extract` — exists because "design tokens / design system" is phrase-distant from "extract."
- **Add** `flows` (152 lines): user journey + IA audit + flow diff. Covers gap between feature-scoped `shape` and product-scoped nav.
- **Kill** proposed `states` skill — copy lives in `impeccable/reference/ux-writing.md`, interaction in `interaction-design.md`; state-phrase routing → `polish`.
- **Fix** `designer` agent: `skills: [frontend-design]` (broken since 2026-04-11 rename) → `skills: [impeccable]` + disambiguation.
- **Surface** pipeline via `.claude/context/design-skills-map.md` pointing at `impeccable/reference/craft.md` (canonical 5-step build) + CORE index + routing-cheatsheet row. Map does NOT duplicate craft.md.
- **Introspection:** new `miner-skills-lib.ts` (178 lines) + 13 fixture tests. Metrics: design_skills_used, design_chains, design_reinvocations, design_orphans, extract_usage (direct vs tokens-alias).
- **Keyword routes:** 52 new patterns across 6 entries + 23 regression tests.

**Why:**
- Deep impeccable read showed v1's `tokens`/`states` were re-inventing existing surface; only `flows` was a real gap. Shifted "build new" → "surface what's there + close one gap."
- colorize duplicates doctrine (restates OKLCH/60-30-10 from `color-and-contrast.md`). Bolder/quieter/colorize are intensity-dial variants. Thin `tune` cuts 3 surfaces → 1 while preserving phrase routing.
- `craft.md` IS a full 5-step methodology but invisible unless you call `/impeccable craft`. Map surfaces the pointer without duplicating.
- Designer agent silently broken since 2026-04-11 rename — loud at every invocation.
- Instrumentation before usage: wiring now = real learning signal in 1 week.

**Rejected:**
- Keep bolder/quieter/colorize separate — 95% shared MANDATORY PREPARATION, duplicated doctrine.
- Full `tokens` skill with diff/enforce — `extract.md` already covers; ROI thin vs. `flows` (zero coverage). Thin alias preserves phrase routing.
- `states` skill — would duplicate ~60% of impeccable refs.
- Edit upstream impeccable's SKILL.md to add `typeset` mode — diverges `skills-external/` from upstream, breaks auto-sync. Open question: upstream PR eventually.
- UI-detection routing for mode skills (drive/cruise/turbo) — parked, revisit after 2 weeks of instrumented usage.

**Preserved:** upstream `skills-external/bolder|quieter|colorize|typeset` (audit history, excluded from symlink layer only). `critique`/`audit` still recommend old skill names in prose — accept transient inaccuracy (LLM reinterprets via keyword router).

**Net:** 1870 tests (was 1834, +36). 12 symlinks (was 16). 32 canonical local skills (was 28). 0 new context-graph cycles. Plan: `thoughts/shared/plans/design--skills-landscape-consolidation-v1.md`.

---

## 2026-04-16 — Prune CC feature registry + complete skill-symlink retarget

**Chosen:**
- Drop 10 env-only entries from `cc-version-check.ts` FEATURE_REQUIREMENTS: lsp, chromeIntegration, desktopApp, vscodeExtension, backgroundTasks flag, releaseChannelToggle, enhancedDoctor, extendedHookTimeout, bedrockSupport, vertexSupport. Dead detection code removed (`hooksUseExtendedTimeout` + 2 `usage.*` calls). Retain `enterpriseSettings` + `disableBackgroundTasks` (still plausible).
- Complete 2026-04-15 external-skills migration: retarget 14 symlinks from broken `../../.agents/skills/<name>` (resolves nowhere) to `../skills-external/<name>`. Delete 3 redundant (delight, distill, overdrive) per impeccable v2.1.1 prune.
- Delete `.claude/context/tools/lsp-integration.md` (docs for feature Qara doesn't use).

**Why:** 10 `[OK] [    ]` "available but not in use" rows for features Qara can't use (no VS Code/desktop/Bedrock/Vertex/Chrome-ext/enterprise /doctor/>60s hooks) = report clutter. `detectable: false` suppressed recs but not rows. Symlink regression: 2026-04-15 migration moved content to `skills-external/` but 14 symlinks were missed — pointed to nonexistent path. Audit flagged 17 broken (incl. 3 that should have been deleted).

**Rejected:**
- Hide behind `--hidden` flag — `detectable: false` already hides recs; rows give no signal.
- Patch `skills-sync-nightly.sh` broken-symlink repair — over-engineered; existing reaper is additive, retargeting is one-time.
- Keep `lsp-integration.md` for hypothetical LSP adoption — contradicts the signal; restore from git if needed.

**Net:** 1834 tests, 0 fail. Folder audit 90/90, external skills 45/50 → 46/50. Report 27 rows → 16 (every row now relevant). Plan: `thoughts/shared/plans/infra--cc-feature-cleanup-v1.md`.

---

## 2026-04-15 — Skill/CLI creator alignment with Anthropic open standard

**Chosen:** Layer Anthropic length caps (500-line body / 1,024-char desc / 1,536 combined) + gerund naming onto PAI compliance via executable validator. Extract shared validation into `.claude/hooks/lib/skill-validator-lib.ts` (335 lines). Add `system-create-cli` Agent-SDK + MCP workflows; demote Tier 3 (oclif) to reference-only.

**Rejected:** open-standard export mode (hypothetical portability, 2x test surface); full Anthropic eval framework (F1 optimizer, grader/comparator subagents — ROI thin below ~60 skills); rename `workflows/`→`scripts/` everywhere (breaks all cross-refs); bundle as CC plugin (PAI isn't a plugin dist).

**Why:** PAI compliance-first + Anthropic eval-first are complementary. Adopt measurable rules; skip eval infra that duplicates existing 8-category pattern. Shared lib prevents validator drift.

**Trade-offs:** `scanActivationTriggers` is a 8-seed-word proxy, not F1 measurement. Shared lib assumes identical semantics across consumers — parametrize or stop sharing if divergence.

**Net:** 1,655 → 1,711 tests (+56). Validator ~50ms/skill. W1 validator 362 → 131 lines after lib extraction.

**Revisit if:** skills >60 (adopt F1); need Codex/Gemini/Cursor portability; third consumer of validator lib; Agent SDK ships first-party scaffolder.

Plan: `thoughts/shared/plans/tooling--align-skill-cli-creators-with-anthropic-v1.md`.

---

## 2026-04-11 — Tool test coverage scorer: 4-rule strict detection with transitive credit

**Chosen:** `isToolCovered()` in `cc-upgrade/scripts/shared.ts` evaluates 4 rules with short-circuit + cycle-safe memo: (A) co-located `stem.test.ts`, (B) centralized `.claude/tests/stem.test.ts`, (C) `-lib.ts` whose `foo.ts` companion is covered, (D) `-lib.ts` with import edge to covered sibling. Strict: Rule D requires BOTH import edge AND covered importer (prevents blanket exemption).

**Rejected:** loose same-dir heuristic (gameable); pure 1:1 stem match (under-reports 47pp); live `bun test --coverage` parsing (expensive, format-coupled); centralized-location-only (misses transitive libs).

**Load-bearing:** Rule D regex `(?:from|import)\s+['"]\.\/<stem>(\.ts)?['"]` tolerates bare side-effect imports and missing `.ts` — earlier `from`-only missed `miner-trace-lib`. Cycle safety: memo seeded `false` before recursing.

**Paired:** `analyzeContext` now credits 3 signals (classic `context/references/`, any skill with `references/`, `**READ:?**` context). `mode-state.ts` `MODE_STATE_FILE` env override isolates tests from live mode state.

**Trade-offs:** heuristic not proof; import-detection same-dir only; ~100ms audit overhead.

**Net:** PAI audit 185/194 → 194/194. Tool coverage 15/30 → 30/30. Tests 1563 → 1588 (+25).

**Revisit if:** `-lib.ts` imported cross-dir (Rule D silent-fail, walk parents); `bun test --coverage` becomes parse-stable.

Plan: `thoughts/shared/plans/tdd-qa--coverage-and-scorer-gaps-v1.md`.

---

## 2026-04-11 — CC v2.1.85 conditional `if` field evaluated, not adopted

**Chosen:** Keep existing hook architecture (tight matchers + in-script fast-paths). Do NOT migrate to per-handler `if` field.

**Why rejected:** baseline 5,477 hook spawns/day × ~15ms avg = ~100s/day total. `if` offers leverage only when hook has broad matcher + no fast-path + narrow glob-expressible subset. No existing hook meets all three — security hook uses regex lookaheads, post-tool-use needs `*` for logger, tdd/quality already fast-path. Realistic savings: ~5s/day. Not worth settings complexity.

**Side-effect of evaluation:** fixed TDD correctness bug — `pre-tool-use-tdd.ts` wrongly denied non-source edits during RED (`isTestFile(.md) = false`). Added `SOURCE_EXTENSIONS` gate (.ts/.tsx/.js/.jsx/.mjs/.cjs/.svelte/.py/.rb/.go/.rs/.java/.kt/.php). +6 tests. `hook-authoring` updated with `if` decision matrix.

**Revisit if:** CC adds permission-rule negation/alternation (`Bash(!git *)`, `Edit(*.{ts,tsx})`); new hook satisfies all three criteria; hook wall-time grows >5min/day.

---

## 2026-04-01 — RTK adopted for token-efficient CLI sessions

**Chosen:** RTK (Rust Token Killer) v0.34.2 as global CLI proxy via PreToolUse hook.
**Alternatives:** No proxy; custom filtering in post-tool-use; prompt-engineering context mgmt.
**Why:** 60-90% Bash token reduction, <10ms overhead. MIT, 16k stars, Rust binary. Complements Phase 1 trace enrichment (different concerns).
**Trade-offs:** External binary dep. Only filters Bash (not Read/Grep/Glob). Young project. Settings.json patching needs care with symlinks.
**Revisit if:** RTK unmaintained; CC adds native output compression; token costs drop.

---

## 2026-04-01 — Meta-Harness-inspired trace enrichment (Phase 1)

**Chosen:** Enrich post-tool-use + stop hooks with structural metadata (input_summary, output_len, error_detail, message_len, has_code_blocks, topic_hint).
**Alternatives:** Full output logging (privacy/storage); summary-based (Meta-Harness ablation proved ineffective); status quo (91B/entry, "scores only" tier).
**Why:** Meta-Harness ablation (Lee et al., arXiv 2603.28052): full traces 50.0% median vs scores-only 34.6%. Qara was scores-only. Enriched traces enable Phase 2 causal reasoning (recovery, repeated failures) without logging sensitive content.
**Trade-offs:** ~3x storage/entry (91→300B). Gzip + rotation handle it. New fields optional (backward compat).
**Revisit if:** storage growth concerning (monitor via `wc -l`); CC adds native trace logging.

---

## 2026-04-07 — Gemma 4 local LLM via Ollama adopted across stack

**Chosen:** Gemma 4 E4B (8B params, Q4_K_M) via Ollama for daily introspect reflect, Diderot reasoning, TGDS code review, MCP server, vision-based screenshot analysis.
**Alternatives:** Keep all AI on cloud APIs (~$50/yr daily reflect alone); Qwen 3 14B (stronger code, no vision/audio); Llama 3.1 (already in Diderot, weaker).
**Why:** $0 marginal, <1s latency, privacy, vision, Apache 2.0. Gemma 4 E4B beats Llama 3.1 8B on MMLU Pro (69.4% vs ~55%) at same VRAM. RTX 3090 handles comfortably.
**Trade-offs:** 8B can't match Claude for complex synthesis — weekly/monthly introspection stays on Claude. Vision is semantic not pixel-perfect. Audio not yet in Ollama transport.
**Revisit if:** Ollama adds audio (re-eval 5C); Gemma 5 releases; stronger 24GB-fit local model appears.

---

## 2026-04-11 — Repo-wide skill/workflow trim (agent-direct prose pass)

**Chosen:** "Un-slop without losing power" on every local skill/workflow/command/agent prompt in `.claude/`. 6 parallel `engineer-high` agents, non-overlapping clusters.

**Preserve rule:** exact commands, file paths, decision rules, thresholds, retry limits, escalation paths, state machines, safety rules, output templates, cross-refs, frontmatter, append-only audit logs. **Remove:** "You are a..."/"You should..." leads, Overview/Purpose restating title, tutorial framing, duplicated Quick Reference, TS+Python pair duplication, rhetorical why-it-matters, decorative emoji headers.

**Skipped:** upstream symlinked skills, `.ts`/`.test.*` code, `external-skills-registry.md` (audit log), already-terse files (`spotcheck.md` 41L, `engineer-high.md` 31L).

**Net:** 63 files, ~−3,912 lines (34%). Tests 1550 pass. 0 broken refs. Est. 7–12k tokens/session on trimmed workflows. Not main lever (opus→sonnet was) — closes tail + improves cache-friendliness.

**Revisit if:** tests fail after compaction (lost info); agent output quality drops; new files grow without discipline.

---

## 2026-04-11 — Planning + execution pipeline token-cost remediation (11 changes)

**Chosen:** Biggest levers: `critic` + `verifier` opus→sonnet with 3rd-retry opus escalation (Task `model: opus`); `create_plan.md` 296→111 (no double-reads, complexity-gated agent spawns, lazy-load templates); plan-cache in `cruise/workflows/plan-entry.md` at `$STATE_DIR/sessions/{id}/memory/plan-cache.json` (mtime invalidation); drop per-story verifier re-spawns in `drive` completion (use `bun test` + `bunx tsc --noEmit` instead — per-story gates are source of truth); `turbo/SKILL.md` tiered dispatch matrix (haiku-low / sonnet / opus-high); `tdd-cycle.md` 256→163 (dedupe TS+Python).

**Rejected:** opus-tier everything + caching (doesn't fix defensive reads); model-selection oracle PreToolUse hook (Phase 3); fewer mode sessions (modes are the quality loop).

**Why:** `rtk cc-economics` showed $3752 spend, RTK saved $103 (2.7%). Real money: agent tiers + `create_plan` defensive reads + `plan-entry` re-reads (~32k wasted tokens/8-phase cruise). critic/verifier do mechanical work — loop provides quality, not tier.

**Trade-offs:** sonnet may miss subtle opus patterns → 3rd-retry escalation. Plan cache staleness → mtime compare every read. Aggressive prose compression risks lost mistake-prevention context → DECISIONS.md preserves why.

**Net:** ~−430 lines in pipeline (~8–10k tokens/session). Est. $30–60/mo savings on $3752 baseline (1–2%; architecture sound, marginal closes).

**Revisit if:** critic escalation >30% (sonnet insufficient); plan-cache false-negatives post-hand-edit; quality regression correlates with downgrade; 1-mo measured savings miss estimate.

---

## 2026-04-11 — /implement_plan deleted, routing migrated to cruise (Phase 1-5 cutover)

**Chosen:** Cold-turkey cutover — delete `/implement_plan`, migrate all plan-execution routing to `cruise` mode with `planPath` state field + plan-aware workflow. No compatibility shim.
**Alternatives:** Keep as thin alias invoking cruise; slow deprecation with warnings; maintain both in parallel.
**Why:** `/implement_plan` + `cruise` had 80% overlap (phase tracking, TDD, verification gates). Maintaining both caused routing confusion. Cruise already had mature quality sniff test, extendIterations, working memory. Aliasing preserves ambiguity; clean cutover forces single path. 5-phase rollout (schema → plan-entry → cruise delegation → keyword router → deletion) de-risked.
**Trade-offs:** In-flight `/implement_plan` plans break. Verified none mid-execution. Muscle memory retrain — CLAUDE.md + routing-cheatsheet updated.
**Commits:** 569646e, 39be32f, 1836193, afbfc3d, fad9f7d.
**Revisit if:** cruise gains complexity warranting split; significantly different execution style emerges (real-time collaborative plans) that doesn't fit phase model.

---

## 2026-04-08 — ~/.claude/state symlinked to qara/.claude/state

**Chosen:** `~/.claude/state` → symlink to `qara/.claude/state` (canonical in qara, same as settings.json and .env).
**Alternatives:** Keep separate directories (status quo); symlink individual files only.
**Why:** Post-mortem found split-brain: post-tool-use hook writing to `~/.claude/state/tool-usage.jsonl` (14k entries) while `qara/.claude/state/tool-usage.jsonl` (6.8k) was stale since April 3. Miner read the correct file (via pai-paths.ts default), but split caused debug confusion and qara copy was dead weight. Merged both JSONL (deduped: 20,871 tool-usage + 10,179 security-checks), moved subdirs (agents, archive, digests, errors, sessions) + remaining state to qara.
**Trade-offs:** State files in git repo — risk of accidental large JSONL commits. Mitigated by `.gitignore`.
**Revisit if:** state grows too large for repo; CC adds native state dir config.

---

## 2026-04-15 — jcodemunch-mcp adopted (Python policy exception)

**Chosen:** `jcodemunch-mcp==1.44.0` as 5th MCP server. `uv tool install` pin; `tool_profile: "standard"` BM25-only (no AI summaries, no ONNX embeddings, no Groq). Project config `qara/.jcodemunch.jsonc` with absolute `trusted_folders` + `extra_ignore_patterns` (`thoughts/`, `purgatory/`, `.claude/state/`, `.claude/skills-external/`).

**Why (Python exception):** No TS port of tree-sitter symbol retrieval at this capability. `find_importers`, `get_blast_radius`, `plan_refactoring`, `get_call_hierarchy` are structural queries grep+read can't produce deterministically. Exception scoped to this single server — "TS > Python" stands for new tooling.

**License:** non-commercial for eval. Dual-licensed; commercial tiers Builder $79 / Studio $349 / Platform $1,999. JM authorized TGDS-code use for Phase 4 benchmark; Builder required before sustained TGDS workflow.

**Trade-offs:** Python runtime dep, single-maintainer (mitigated by pin + easy removal), schema drift risk. `full` profile + AI summaries blocked until 1-week outbound audit + benchmark pass.

**Revisit if:** benchmark <50% token reduction on 5+ tasks; outbound audit shows non-localhost; maintainer disappears; TS-native equivalent emerges.

### Addendum (2026-04-15 same-day) — config + MCP-wiring gotchas

**Config-split:** server-scoped keys (`tool_profile`, `use_ai_summaries`, `allow_remote_summarizer`, `compact_schemas`, `disabled_tools`) are read at `list_tools` time (`server.py:1853`), BEFORE per-project context. Project `.jcodemunch.jsonc` **cannot override them**. Fix: move to global `~/.code-index/config.jsonc`.

**CLI display bug:** `jcodemunch-mcp config` reads `JCODEMUNCH_USE_AI_SUMMAIRES` (sic) env defaulting `"true"` — runtime reads correctly, don't trust CLI display on v1.44.0; verify via stdio probe.

**Durable MCP-wiring rules** (surfaced while debugging):
- Project-scope MCP = `<project-root>/.mcp.json`, NOT `<project-root>/.claude/mcp.json`.
- Must also add server name to `settings.json.enabledMcpjsonServers` whitelist (explicit allowlist at project scope).
- `~/.claude/mcp.json` is NEVER read — CC reads user-scope from `~/.claude.json`.
- CC picks up `.mcp.json` edits **live** (no restart needed); whitelist adds DO need restart.
- **Rule:** new MCP = update BOTH `.mcp.json` AND `settings.json.enabledMcpjsonServers` in same commit.

**Regression found:** `brave-devtools` + `ollama-local` were silently broken (config at dead `.claude/mcp.json`) until migrated to `/home/jean-marc/qara/.mcp.json` 2026-04-15. Backup: `~/.claude.json.backup-pre-mcp-migration-20260415-120239`.
