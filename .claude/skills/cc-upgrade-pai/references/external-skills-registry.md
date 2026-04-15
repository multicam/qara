# PAI External Skills Registry

Comprehensive documentation of all externally-installed skills in the PAI ecosystem.
Maintained as part of `cc-upgrade-pai`. Updated during each external skills deep analysis.

Last reviewed: 2026-04-15

---

## Tracking Infrastructure

As of 2026-04-15, external skill content is **git-tracked inside the qara repo** at `.claude/skills-external/`. The upstream `~/.agents/skills/` tree is still populated by the `npx skills` CLI but now serves as a cache, not the canonical copy. Drift detection runs nightly via `scripts/skills-sync-nightly.sh` and surfaces material changes for weekly Claude review.

| Component | Location | Purpose |
|-----------|----------|---------|
| **Canonical skill content** | `.claude/skills-external/<name>/` | Git-tracked mirror — source of truth |
| Upstream CLI cache | `~/.agents/skills/<name>/` | Written by `npx skills`; mirrored nightly into repo |
| Lock file | `~/.agents/.skill-lock.json` | Vercel CLI's own version tracking (read-only to us) |
| Project symlinks | `.claude/skills/<name>` → `../skills-external/<name>` | What CC discovers |
| HTML diagrams (visual-explainer) | `thoughts/shared/diagrams/` (via `~/.agent/diagrams` symlink) | Git-tracked in thoughts repo |
| Nightly sync | `scripts/skills-sync-nightly.sh` | `npx skills update -y` → rsync → detect (structural + Gemma) → auto-commit or flag |
| Weekly review | `~/.claude/scripts/introspect-synthesize.sh` | Claude applies philosophy + overlap lenses to flagged items |
| Detection lib | `.claude/skills/cc-upgrade-pai/scripts/skills-detect-lib.ts` | Pure logic, unit-tested |
| Review artifacts | `thoughts/shared/introspection/skills-review-YYYY-MM-DD.md` | Flagged diffs pending Claude verdict |
| Review log | `~/.claude/state/digests/skills-sync.log` | Nightly sync outcomes |
| Cron | `0 2 * * *` invokes `skills-sync-nightly.sh` | Daily upstream pull + drift check |
| Symlinks | `.claude/skills/<name>` → `../../.agents/skills/<name>` | Project-level access |
| Update script | `~/update-skills.sh` | Interactive update via `npx skills` CLI |
| Skills CLI | `npx skills` (Vercel Labs) | Install, list, check, update |

---

## Source 0: Anthropic impeccable (v2.1.1 migration — added 2026-04-15)

**Author:** Anthropic (fork of their frontend-design skill)
**Distribution:** Manual install into `~/.agents/skills/` (not currently tracked in `.skill-lock.json`)
**License:** Apache 2.0
**Installed:** 2026-04-15 (via manual placement, cleanup script auto-run)

### Migration event (2026-04-15)

The impeccable v2.1.1 release **consolidated and renamed** several visual-explainer design sub-skills. A `<post-update-cleanup>` block in `impeccable/SKILL.md` invoked `scripts/cleanup-deprecated.mjs`, which removed 5 deprecated symlinks on first invocation.

| Deprecated skill | Replacement | Notes |
|---|---|---|
| `frontend-design` | `impeccable` (as master skill) | All design context now lives under impeccable |
| `teach-impeccable` | `/impeccable teach` subcommand | Setup folded into argument dispatcher |
| `arrange` | `layout` (renamed) | Functionality unchanged |
| `normalize` | `polish` (absorbed) | Consistency checks merged into polish |
| `onboard` | `polish` / `impeccable` (absorbed) | Onboarding patterns distributed across broader skills |

### Skills Provided (3 skills)

| Skill | Purpose | Context | Version |
|---|---|---|---|
| `impeccable` | Master design skill — craft/teach/extract subcommands, anti-AI-slop patterns, design context gathering | fork | 2.1.1 |
| `shape` | Pre-implementation UX/UI planning — discovery interview → design brief | fork | 2.1.1 |
| `layout` | Layout and visual rhythm review (replaces `arrange`) | fork | 2.1.1 |

### PAI integration

- `designer` agent updated to load `impeccable` (was `frontend-design`)
- `design-implementation` skill references updated
- `routing-cheatsheet.md` + `delegation-guide.md` updated
- Test files `pai-validation.test.ts` + `skills-validation.test.ts` updated
- `skills-ecosystem-sources.md` updated with new sub-skill count

### Open items

1. **Provenance:** SKILL.md notes "Based on Anthropic's frontend-design skill. See NOTICE.md" — upstream canonical repo unconfirmed.

## Tracking model (resolved 2026-04-15)

**Decision:** PAI maintains its own canonical copies of all non-visual-explainer externals under `.claude/skills-external/<name>/` (git-tracked). `~/.agents/.skill-lock.json` tracks only `visual-explainer` — the other 15 externals (3 impeccable-family + 12 Anthropic design skills) are **deliberately not** registered with the `npx skills` CLI.

**Why:** re-registering via `npx skills install` would re-download from upstream and replace our git-tracked copies, wiping any PAI-specific modifications. Our nightly sync (`scripts/skills-sync-nightly.sh`) handles drift detection via structural diff + Gemma 4 semantic classification, which covers the update-tracking need without owning the install path.

**Canonical locations:**
- Source of truth: `.claude/skills-external/<name>/` (git-tracked)
- CC discovery: `.claude/skills/<name>` → `../skills-external/<name>` (symlinks)
- `~/.agents/skills/` is the `npx skills` cache — used only for `visual-explainer`; other entries may exist as copies but are not authoritative.

**Drift detection:** `scripts/skills-sync-nightly.sh` (cron 02:00) → `npx skills update -y` → per-skill detection against repo copy. Benign changes auto-commit; flagged changes go to `thoughts/shared/introspection/skills-review-YYYY-MM-DD.md` for weekly Claude review. See `skills-detect-lib.ts` for the detection logic.

**When to add a new external:** copy upstream content into `.claude/skills-external/<name>/`, add symlink in `.claude/skills/<name>`, update this registry. Do NOT run `npx skills install` for PAI-tracked externals.

---

## Source 1: nicobailon/visual-explainer

**Author:** Nico Bailón ([@nicobailon](https://github.com/nicobailon))
**Repository:** [github.com/nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer)
**Stars:** 7.0k+ | **License:** MIT
**Installed:** 2026-02-20 | **Last Updated:** 2026-03-29
**Lock hash:** `339a338e9e2...`

### Skills Provided (22 sub-skills)

#### Foundation (2 skills)

| Skill | Purpose | Context | PAI Integration |
|-------|---------|---------|-----------------|
| **frontend-design** | Core design principles, anti-AI-slop patterns, Context Gathering Protocol, typography/color/layout/motion/interaction/responsive | fork | Loaded by `designer` agent. Foundational — all other design skills reference this. |
| **teach-impeccable** | One-time setup to gather design context → persists to `.impeccable.md` | fork | Run once per project to establish design guidelines |

#### Visual Explanation (1 skill)

| Skill | Purpose | Context | PAI Integration |
|-------|---------|---------|-----------------|
| **visual-explainer** | Generate HTML diagrams, Mermaid visualizations, slides, data tables, diff reviews, project recaps | fork | Stand-alone. Used for architecture documentation, visual planning. 8 subcommands. |

#### Design Optimization & Refinement (7 skills)

| Skill | Purpose | Context | PAI Integration |
|-------|---------|---------|-----------------|
| **audit** | Comprehensive quality checks — accessibility, performance, theming, responsive, anti-patterns | fork | Run after implementation for quality gate |
| **optimize** | Performance — Core Web Vitals (LCP, FID/INP, CLS), bundle size, rendering, fonts | fork | Performance-focused, pairs with `harden` |
| **polish** | Final quality pass — alignment, spacing, typography, interactions, edge cases | fork | Last step before shipping |
| **critique** | Holistic design evaluation — hierarchy, IA, emotional resonance, discoverability | fork | UX quality assessment (vs `audit` for bugs) |
| **harden** | Resilience — error handling, i18n, text overflow, edge cases, input validation | fork | Defensive quality layer |
| **extract** | Extract reusable components, design tokens, patterns into design system | fork | Design system creation |
| **distill** | Strip to essence — remove unnecessary complexity across IA, visual, layout, interaction | fork | Simplification pass |

#### Design Creation & Styling (6 skills)

| Skill | Purpose | Context | PAI Integration |
|-------|---------|---------|-----------------|
| **animate** | Purposeful animations, micro-interactions, timing/easing, accessibility | fork | Motion design specialist |
| **arrange** | Layout and visual rhythm — spacing systems, grid strategy, hierarchy | fork | Layout specialist |
| **typeset** | Typography — font selection, hierarchy, sizing, readability, consistency | fork | Typography specialist |
| **clarify** | UX copy — error messages, form labels, button text, help text, microcopy | fork | Writing/copy specialist |
| **colorize** | Strategic color addition — semantic meaning, accent, backgrounds, data viz | fork | Color strategy specialist |
| **delight** | Moments of joy — micro-interactions, personality, illustrations, easter eggs | fork | Emotional design layer |

#### Design Amplification (2 skills)

| Skill | Purpose | Context | PAI Integration |
|-------|---------|---------|-----------------|
| **bolder** | Amplify safe/boring designs — typography, color, spatial drama, effects | fork | When design is too conservative |
| **quieter** | Tone down aggressive designs — desaturate, reduce weight, refine | fork | When design is too intense |

#### Specialized (4 skills)

| Skill | Purpose | Context | PAI Integration |
|-------|---------|---------|-----------------|
| **adapt** | Responsive adaptation — mobile, tablet, desktop, print, email strategies | fork | Multi-device design |
| **normalize** | Align feature to design system standards | fork | Design system compliance |
| **onboard** | Onboarding flows, empty states, first-time user experience | fork | User journey design |
| **overdrive** | Technically ambitious effects — View Transitions, WebGL, scroll-driven animations | fork | Advanced browser APIs |

### Quality Standards (embedded in all visual-explainer skills)

- **AI Slop Detection:** All skills warn against Inter font + purple gradients, glassmorphism, neon dashboards, bounce easing, gradient text on metrics, emoji icons
- **Context-First:** Design depends on audience, brand, purpose — never formulaic
- **Accessibility:** WCAG compliance, `prefers-reduced-motion`, keyboard navigation, semantic HTML
- **Performance:** 60fps target, graceful degradation, lazy initialization

### Dependency Chain

```
teach-impeccable (run once)
  └─→ frontend-design (referenced by ALL design skills)
        ├─→ audit, critique (evaluation)
        ├─→ optimize, polish, harden (refinement)
        ├─→ arrange, typeset, colorize, animate (creation)
        ├─→ bolder, quieter (amplification)
        ├─→ adapt, normalize, onboard (specialized)
        ├─→ extract, distill (system-level)
        └─→ overdrive (advanced)

visual-explainer (stand-alone, no prerequisites)
```

---

## Source 2: mattpocock/skills (Adapted, Not Symlinked)

**Author:** Matt Pocock ([@mattpocock](https://github.com/mattpocock))
**Repository:** [github.com/mattpocock/skills](https://github.com/mattpocock/skills)
**License:** MIT
**Last upstream review:** 2026-04-02 (latest commit: `651eab0` 2026-04-01)

These skills were **rewritten for PAI conventions** — not symlinked. They live as local
skills but track upstream for improvements.

| PAI Skill | Upstream Source | Adaptation Notes |
|-----------|---------------|------------------|
| `grill-me` | `grill-me/SKILL.md` | Expanded methodology, probe patterns, PAI structure |
| `design-it-twice` | `design-an-interface/SKILL.md` | Broadened to architecture + data models, uses `architect` agents |
| `edit-article` | `edit-article/SKILL.md` | Added Phase 3 humaniser pass, expanded to docs/specs |
| ~~`refactor-plan`~~ | `request-refactor-plan/SKILL.md` | **RETIRED** — subsumed by cruise mode. Skill removed. |
| `triage-issue` | `triage-issue/SKILL.md` + `qa/SKILL.md` | PAI conventions, codebase-analyzer integration, TDD fix plans, batch mode with blocking relationships (from qa) |
| `ubiquitous-language` | `ubiquitous-language/SKILL.md` | PAI conventions, DDD glossary extraction |
| ~~`prd-to-plan`~~ | `prd-to-plan/SKILL.md` | **RETIRED** — subsumed by drive mode + product-shaping Phase 4. Skill removed. |
| `CORE/testing-guide.md` | `tdd/SKILL.md` + `tdd/tests.md` | Merged TDD into existing testing guide |
| `CORE/references/deep-modules.md` | `tdd/deep-modules.md` | Extracted as shared cross-cutting reference |
| `CORE/references/mocking-guidelines.md` | `tdd/mocking.md` + `improve-codebase-architecture/REFERENCE.md` | Combined mocking rules + dependency classification |
| `CORE/references/interface-design.md` | `tdd/interface-design.md` | Extracted as shared reference |
| `CORE/references/refactoring-signals.md` | `tdd/refactoring.md` | Extracted as shared reference |
| `product-shaping/workflows/breakdown.md` | `prd-to-issues/SKILL.md` | Vertical slice + HITL/AFK methodology as Phase 4 |
| `agents/codebase-analyzer.md` | `improve-codebase-architecture/SKILL.md` | Friction-driven analysis lens added |

### Upstream Skills — Declined

All upstream skills evaluated. Redundant entries (write-a-prd, prd-to-issues, git-guardrails-claude-code, write-a-skill, qa) removed — covered by PAI equivalents (product-shaping, pre-tool-use-security.ts, system-create-skill, triage-issue). New `github-triage` (2026-04-01) evaluated below.

| Upstream Skill | Purpose | Status | Notes |
|---------------|---------|--------|-------|
| `setup-pre-commit` | Husky + lint-staged setup | **Not needed** | PAI uses hooks system directly |
| `migrate-to-shoehorn` | Test assertion migration | **Not relevant** | TypeScript-specific, not used in PAI |
| `scaffold-exercises` | Exercise directory creation | **Not relevant** | Educational tooling |
| `obsidian-vault` | Obsidian integration | **Not adopted** | Built custom `diderot` skill instead — JM's vault uses folders (not flat wikilinks), needs retrieval not creation |
| `github-triage` | Label-based issue state machine with grilling, agent briefs, `.out-of-scope/` KB | **Cherry-picked** | Added 2026-04-01. Two patterns cherry-picked into PAI `triage-issue` (2026-04-03): (1) Agent brief template (Phase 4.5) for durable behavioral specs, (2) `.out-of-scope/` KB for wontfix institutional memory (Phase 3.5 check + Phase 5 record creation). Full skill not adopted — PAI has TDD fix plans and codebase-analyzer integration. |

---

## Potential Overlap Analysis

### External × External Overlaps

| Skills | Overlap | Resolution |
|--------|---------|------------|
| `audit` vs `critique` | Both evaluate design quality | `audit` = bugs/compliance, `critique` = UX/effectiveness. **Complementary.** |
| `optimize` vs `polish` | Both refine implementation | `optimize` = performance metrics, `polish` = visual details. **Complementary.** |
| `bolder` vs `quieter` | Opposite poles of same axis | **By design** — complementary pair. |

Prior `extract`/`normalize`/`onboard`/`distill`/`delight` overlap rows resolved 2026-04-15 by removing those skills (extract → `impeccable extract`; normalize+onboard → absorbed into polish; distill/delight/overdrive → redundant scope with impeccable).

### External × Local Overlaps

| External | Local | Overlap | Resolution |
|----------|-------|---------|------------|
| `audit` (visual-explainer) | `cc-upgrade` audit workflow | Name collision only — different domains (UI vs CC config) | **No conflict** — different activation triggers |
| `optimize` (visual-explainer) | General perf guidance in CORE | Minimal — external is CSS/JS specific | **No conflict** |
| `critique` (visual-explainer) | `grill-me` | Both evaluate quality | `critique` = design, `grill-me` = plans/decisions. **Complementary.** |

---

## Wrapping Opportunities

### Currently Wrapped

| External Skill | PAI Wrapper | How |
|---------------|-------------|-----|
| `impeccable` | `designer` agent | Agent loads skill via `skills:` frontmatter |
| `visual-explainer` | Direct symlink | No wrapper needed — stand-alone |

### Recommended Wrapping

| External Skill | Strategy | Rationale |
|---------------|----------|-----------|
| `audit` | Thin wrapper | Add PAI-specific checks (accessibility standards, component library compliance) |
| `impeccable` | Currently wrapped via `designer` agent | Consider adding PAI-specific brand/aesthetic context to `teach` subcommand output |

---

## Update History

| Date | Change | Source |
|------|--------|--------|
| 2026-02-20 | Initial install of visual-explainer | nicobailon/visual-explainer |
| 2026-03-21 | Updated to latest | npx skills update |
| 2026-03-22 | Registry created | cc-upgrade-pai deep analysis |
| 2026-03-23 | Added 4 missing mattpocock adaptations (refactor-plan, triage-issue, ubiquitous-language, prd-to-plan), updated upstream review date, removed adopted skills from NOT-yet-adopted table | PAI audit |
| 2026-03-27 | Upstream review: `a6bdfd9` (grill-me: "ask questions one at a time") — already incorporated in PAI version. No action needed. visual-explainer at v0.6.3, up to date. | PAI audit |
| 2026-03-27 | Deep analysis: 3 new upstream commits reviewed (`eebfb3c`, `98fecc7`, `6a87ed0`). ubiquitous-language: merged "domain expert terms only" rule from upstream. New `qa` skill discovered (issue breakdown + blocking relationships) — logged for evaluation. visual-explainer v0.6.3 confirmed up to date. Context graph: 1 broken ref in upstream visual-explainer (double-nested path). All 25 CORE doc index paths valid, all 10 agents match, 1035 tests pass. | cc-upgrade-pai deep analysis |
| 2026-03-27 | Addressed 3 recommendations: (1) Merged qa patterns into triage-issue batch mode (scope assessment, blocking relationships, session continuation). (2) Filed upstream issue nicobailon/visual-explainer#35 for broken path; applied fix locally. (3) Built custom `diderot` knowledge retrieval skill; marked obsidian-vault as Not adopted. **MONITOR:** On next `npx skills update`, check if nicobailon/visual-explainer#35 is fixed upstream — if so, remove local patch note. | Post-audit implementation |
| 2026-03-30 | Renamed "NOT Yet Adopted" → "Declined". Removed 5 redundant entries (write-a-prd, prd-to-issues, git-guardrails-claude-code, write-a-skill, qa) — all covered by PAI equivalents. 4 remaining entries kept for historical context. | cc-upgrade-pai audit cleanup |
| 2026-03-31 | Quarterly deep analysis. visual-explainer v0.6.3 confirmed up to date (updated 2026-03-29, lock hash refreshed). Issue #35 closed upstream and fix included — MONITOR note cleared. mattpocock: no new commits since `eebfb3c` (2026-03-26). Stars: visual-explainer 7.0k, mattpocock 11.0k. Context graph: 183 nodes, 0 broken local refs, 1 cosmetic upstream ref (`slide-patterns.md` without `references/` prefix — functional, not worth upstream issue). 27/27 CORE doc index paths valid. 10/10 agents match. 1120 tests pass (42 files). No action items. | cc-upgrade-pai deep analysis |
| 2026-04-02 | Deep analysis. **mattpocock:** 1 new commit `651eab0` (2026-04-01) adds `github-triage` skill (175-line SKILL.md + AGENT-BRIEF.md + OUT-OF-SCOPE.md). Evaluated: heavy overlap with PAI `triage-issue` — declined as standalone adoption. Two patterns worth cherry-picking: (1) durable agent brief template (behavioral specs, no file paths/line numbers), (2) `.out-of-scope/` knowledge base for rejected features. **visual-explainer:** v0.6.3 confirmed current (last commit `9a97a58` 2026-03-29, no changes since last audit). Stars: 7.1k (+100). **Context graph:** 189 nodes (+6), 195 edges, 0 broken local refs, 1 cosmetic upstream ref persists (line 334 `slide-patterns.md`). 15 unreferenced files (mostly visual-explainer commands — by design, invoked via slash commands). 11 agents (+1 `planner.md`). 1225 tests pass (45 files, +105 tests, +3 files). **awesome-agent-skills:** active (commit 2026-04-01, PR #329 ru-text skill), no PAI-relevant additions. **anthropics/skills:** `claude-api` skill auto-synced (2026-03-25), already loaded by CC natively. No action items beyond optional `triage-issue` enhancement. | cc-upgrade-pai deep analysis |
| 2026-04-03 | Routine deep analysis. **mattpocock:** No new commits since `651eab0` (2026-04-01). 21 entries (19 skills + LICENSE + README). All PAI adaptations current. **visual-explainer:** v0.6.3 confirmed current (last commit `9a97a58` 2026-03-29, lock hash `339a338e9e2`). Stars: 7,127 (+27). 22 sub-skills installed, all symlinks intact. **Context graph:** 189 nodes, 195 edges, 0 broken local refs, 1 cosmetic upstream ref persists (line 334 `slide-patterns.md` without `references/` prefix). 15 unreferenced files (visual-explainer commands + cc-upgrade refs — by design). 27 local + 22 symlinked = 49 skills. 11 agents. **Tests:** 1,218 pass (45 files, -7 from prior count — likely test consolidation). **anthropics/skills:** `claude-api` auto-synced 2026-03-25, no new activity. **awesome-agent-skills:** 2 commits since last audit (`91aa397` link updates 2026-04-02, `23f7569` ru-text skill 2026-04-01) — no PAI-relevant additions. | cc-upgrade-pai deep analysis |
| 2026-04-03 | Cherry-picked 2 patterns from mattpocock `github-triage` into PAI `triage-issue`: (1) Agent brief template added as Phase 4.5 — durable behavioral specs for agent-ready issues. (2) `.out-of-scope/` KB pattern integrated into Phase 3.5 (wontfix check) and Phase 5 (record creation). Registry status updated from "Not adopted" to "Cherry-picked". MEMORY.md test count corrected 1225→1218. | Post-audit implementation |
| 2026-04-06 | Unified plan (qara-evolution-unified.md) all 5 phases implemented. 13 agents (+2: critic, verifier). 12 hook scripts (+5: keyword-router, post-tool-failure, subagent-start, subagent-stop, pre-compact). 10 CC hook events used (+4: PostToolUseFailure, SubagentStart, SubagentStop, PreCompact). 3 mode skills (drive, cruise, turbo). 11 new hook libs (mode-state, keyword-routes.json, working-memory, compact-checkpoint, prd-utils). 52 skills (+3 mode skills). 1368 tests pass (55 files, +150 tests, +10 files). | Post-implementation audit |
| 2026-04-09 | Routine deep analysis. **mattpocock:** No new commits since `651eab0` (2026-04-01). 21 entries (19 skills + LICENSE + README). All PAI adaptations current. Registry updated: `refactor-plan` and `prd-to-plan` now marked RETIRED (were missing strikethrough). **visual-explainer:** v0.6.3 confirmed current (last commit `9a97a58` 2026-03-29, lock hash `339a338e9e2`). Stars: 7,376 (+249). Forks: 501. 22 sub-skills installed, all symlinks intact. **OMC:** v4.11.2 (2026-04-08), active development — installer dedup fix, setup regression tests, worktree project identifier fix, HUD plugin root env var. No new patterns relevant to PAI. **Context graph:** 0 broken local refs, 0 circular deps. 1 cosmetic upstream ref persists (`slide-patterns.md` without `references/` prefix). **Infrastructure:** 14 hook scripts, 14 hook libs + context-graph/, 10 CC hook events, 15 agents, 28 local + 22 symlinked = 50 skills. MEMORY.md skill count corrected 51→50 (28 local + 22 symlinked). **Tests:** 1,461 pass (61 files, +93 tests, +6 files since 2026-04-06). **awesome-agent-skills:** 3 new PRs since last audit (Qdrant, Resend, Courier skills) — no PAI-relevant additions. No action items. | cc-upgrade-pai deep analysis |
| 2026-04-10 | Routine deep analysis. **mattpocock:** No new commits since `651eab0` (2026-04-01). 21 entries (19 skills + LICENSE + README). All PAI adaptations current. **visual-explainer:** v0.6.3 confirmed current (last commit `9a97a58` 2026-03-29, lock hash `339a338e9e2`). Stars: 7,396 (+20). Forks: 503 (+2). 22 sub-skills installed, all 22 symlinks verified resolving. **OMC:** v4.11.4 (2026-04-09), bug-fix-only releases (v4.11.3-4) — preemptive-compaction fallback, keyword-detector false-positive narrowing, hook .json/.jsonl extension check fix. Keyword-detector narrowing is relevant pattern but PAI's keyword-routes.json already uses strict patterns (word boundary + colon/mode/this); no action needed. **Context graph:** 188 nodes, 167 edges. 0 broken refs, 0 circular deps. Prior cosmetic upstream ref (`slide-patterns.md`) now resolved — all upstream SKILL.md refs use correct `./references/` prefix. **Infrastructure:** 14 hook scripts, 14 hook libs + context-graph/, 10 CC hook events, 15 agents, 28 local + 22 symlinked = 50 skills. All counts match MEMORY.md. **Tests:** 1,461 pass (61 files), stable since 2026-04-09. **awesome-agent-skills:** 3 new PRs merged 2026-04-04 (Qdrant, Resend, Courier) — no PAI-relevant additions. No action items. | cc-upgrade-pai deep analysis |
| 2026-04-10 | Deep analysis (session 2). **mattpocock:** No new commits since `651eab0` (2026-04-01). 21 entries (19 skills + LICENSE + README). All PAI adaptations current. **visual-explainer:** v0.6.3 confirmed current (last commit `9a97a58` 2026-03-29, lock hash `339a338e9e2`). Stars: 7,396. Forks: 503. 22 sub-skills installed, all 22 symlinks verified resolving. **OMC:** v4.11.4 (2026-04-09), no new commits since last audit. **Context graph:** 0 broken refs, 0 circular deps. `slide-patterns.md` cosmetic ref fully resolved upstream. **Infrastructure CORRECTED:** 18 production hook scripts (+4 since 2026-04-09: permission-denied.ts, post-compact.ts, stop-failure.ts, task-created.ts). 14 hook libs + context-graph/ (unchanged). 14 CC hook events (+4: PermissionDenied, PostCompact, StopFailure, TaskCreated). 15 agents. 28 local + 22 symlinked = 50 skills. Prior audits undercounted — MEMORY.md needs update. **Tests:** 1,511 pass (67 files, +50 tests, +6 files since 2026-04-09). **Validation:** validate-skills.sh 0 errors, check-references.sh 51 refs checked/0 broken. **awesome-agent-skills:** No new PRs since 2026-04-04. No action items beyond MEMORY.md correction. | cc-upgrade-pai deep analysis |
| 2026-04-15 | **MAJOR: Impeccable v2.1.1 migration.** Three new skills installed at `~/.agents/skills/`: `impeccable` (21.5K), `shape` (5.1K), `layout` (7.2K — renamed from arrange). Cleanup script `impeccable/scripts/cleanup-deprecated.mjs` auto-ran during audit and removed 5 deprecated symlinks: `frontend-design`, `teach-impeccable`, `arrange`, `normalize`, `onboard`. `designer.md` agent updated to load `impeccable` (was `frontend-design`). `design-implementation` skill refs updated. `routing-cheatsheet.md`, `delegation-guide.md`, `pai-validation.test.ts`, `skills-validation.test.ts`, `skills-ecosystem-sources.md` all updated. **Upstream status:** mattpocock unchanged since `651eab0` (2026-04-01). visual-explainer v0.6.3 (last commit `9a97a58` 2026-03-29). OMC v4.11.6 (2026-04-13). **Infrastructure:** 18 hook scripts, 14 hook libs, 14 CC events, 15 agents, 28 local + 20 symlinked = **48 skills** (down from 50 post-cleanup). **Context graph:** 206 nodes, 167 edges, 0 broken refs, 0 cycles. **Tests:** 1637 pass (77 files, +49 tests since 2026-04-11). **Audit score:** 194/194 (100%). **Open items:** `.skill-lock.json` only tracks visual-explainer — impeccable-family skills installed outside npx skills CLI, lock file not updated. SKILL.md post-fix validation step was pointing at non-existent `scripts/validate-skills.sh` + `scripts/check-references.sh` — replaced with context-graph CLI command. | cc-upgrade-pai impeccable migration |
| 2026-04-11 | Scorer-fix cruise: `tdd-qa--coverage-and-scorer-gaps-v1.md`. **analyse-claude-folder.ts scorer rebuilt** — 4-rule `isToolCovered()` helper added to `shared.ts` (co-located / centralized / stem-companion / sibling-import-transitive), wired into hook + tool checks. Broadened `analyzeContext` to 3 progressive-disclosure signals. Closed under-reporting bug where the scorer saw 50% tool coverage while reality was 97%. **New test** `screenshot-analyze.test.ts` (16 tests, centralized location, mocked Ollama via `spyOn(globalThis, 'fetch')` — all three CLI modes covered). **Structural guard** added to `screenshot-analyze.ts` (7 exports + `isDirectRun` check matching cc-version-check.ts pattern) so test imports don't trigger `main()`. **Test isolation fix**: `mode-state.ts` STATE_FILE env-overridable via `MODE_STATE_FILE` — fixes `compact-checkpoint.test.ts` failing when a real cruise session is active on host. **Side quests caught by Phase 3 verifier**: stale `tdd-qa/workflows/tdd-cycle.md` path in `CORE/testing-guide.md:73` (should have been `../tdd-qa/...`), and a `cli-examples-basic ⇄ cli-examples-advanced` mutual-See cycle — both pre-existing, both fixed. **PAI audit: 185/194 (95%) → 194/194 (100%)**. CONTEXT 10/15 → 15/15. TDDCOMPLIANCE 18/20 → 20/20. TDDCOMPLIANCEPAI 18/20 → 20/20. MODESYSTEM steady at 20/20. **Tests:** 1,563 → 1,588 (+25: 9 scorer unit tests + 16 screenshot-analyze tests). **Context graph:** 190 nodes, 144 edges (was 145), 0 broken refs, 0 circular deps. **Infrastructure unchanged:** 18 hook scripts, 14 hook libs, 14 CC events, 15 agents, 28 local + 22 symlinked = 50 skills. No upstream changes this session. See `DECISIONS.md` for the full architectural rationale. | cc-upgrade-pai scorer fix + new test |
| 2026-04-15 | **Git-tracked externals + nightly sync infrastructure.** External skill content migrated from `~/.agents/skills/` to `.claude/skills-external/` (git-tracked). 20 `.claude/skills/<name>` symlinks retargeted. HTML diagrams: `~/.agent/diagrams` is now a symlink to `thoughts/shared/diagrams/` (git-tracked in thoughts repo, 13 existing HTMLs migrated). **New infrastructure:** `scripts/skills-sync-nightly.sh` (cron 02:00) runs `npx skills update -y` → rsync (with excludes) → per-skill detection (structural frontmatter/workflows/references diff + Gemma semantic diff via `skills-detect-lib.ts`) → auto-commit benign OR write `thoughts/shared/introspection/skills-review-YYYY-MM-DD.md` for flagged. Claude weekly review extended `~/.claude/scripts/introspect-synthesize.sh` to trigger on pending review files, applies philosophy + overlap lenses, verdicts adopt/modify/reject. **Pruning:** removed 4 skills as redundant with impeccable — `extract` (→ impeccable extract subcommand), `delight`, `distill`, `overdrive`. Excluded the 5 impeccable-v2.1.1 ghosts from sync (`arrange`, `frontend-design`, `normalize`, `onboard`, `teach-impeccable`). **Active external skills: 20 → 16.** **New tests:** 15 `skills-detect-lib.test.ts` + 6 `skills-sync-nightly-helpers.test.ts` (21 total, all mocked). **ollama-client refactor:** replaced live-integration tests with mocked fetch (6 → 14 tests, 900ms → 19ms, 100% deterministic). Documented known `/api/embed` 500 issue + recovery steps in library docstring. **gemma4 standardization:** all bare `gemma4` refs → `gemma4:latest` across 9 files (ollama-client, MCP server, screenshot-analyze, cross-provider SKILL, 2 scripts, mcp.json). **Tests:** 1,655 pass (79 files). **Audit:** 194/194 (100%). **Commits (this session):** 893160e migration, d81ba39 sync infra, f49da7c gitignore, 11ce40f prune, 4517d6e mocked tests, e9650ad gemma4:latest, 8211a55 embed docs. | cc-upgrade-pai skills-external + nightly sync + prune + ollama-client hardening |
