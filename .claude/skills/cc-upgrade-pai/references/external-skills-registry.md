# PAI External Skills Registry

Comprehensive documentation of all externally-installed skills in the PAI ecosystem.
Maintained as part of `cc-upgrade-pai`. Updated during each external skills deep analysis.

Last reviewed: 2026-04-03

---

## Tracking Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| Lock file | `~/.agents/.skill-lock.json` | Version tracking, hashes, timestamps |
| Skills directory | `~/.agents/skills/` | Canonical location for external skills |
| Symlinks | `.claude/skills/<name>` → `../../.agents/skills/<name>` | Project-level access |
| Update script | `~/update-skills.sh` | Interactive update via `npx skills` CLI |
| Skills CLI | `npx skills` (Vercel Labs) | Install, list, check, update |

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
| `refactor-plan` | `request-refactor-plan/SKILL.md` | PAI conventions, codebase-analyzer integration, JM-addressed |
| `triage-issue` | `triage-issue/SKILL.md` + `qa/SKILL.md` | PAI conventions, codebase-analyzer integration, TDD fix plans, batch mode with blocking relationships (from qa) |
| `ubiquitous-language` | `ubiquitous-language/SKILL.md` | PAI conventions, DDD glossary extraction |
| `prd-to-plan` | `prd-to-plan/SKILL.md` | PAI conventions, vertical slice tracer bullets |
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
| `extract` vs `normalize` | Both improve consistency | `extract` = create system, `normalize` = align to system. **Sequential.** |
| `clarify` vs `onboard` | Both improve communication | `clarify` = fix copy, `onboard` = create flows. **Different scope.** |

### External × Local Overlaps

| External | Local | Overlap | Resolution |
|----------|-------|---------|------------|
| `audit` (visual-explainer) | `cc-upgrade` audit workflow | Name collision only — different domains (UI vs CC config) | **No conflict** — different activation triggers |
| `optimize` (visual-explainer) | General perf guidance in CORE | Minimal — external is CSS/JS specific | **No conflict** |
| `critique` (visual-explainer) | `grill-me` | Both evaluate quality | `critique` = design, `grill-me` = plans/decisions. **Complementary.** |
| `distill` (visual-explainer) | Simplification principles in CONSTITUTION.md | Philosophy overlap | External is actionable, CONSTITUTION is philosophical. **Complementary.** |

---

## Wrapping Opportunities

### Currently Wrapped

| External Skill | PAI Wrapper | How |
|---------------|-------------|-----|
| `frontend-design` | `designer` agent | Agent loads skill via `→ READ:` in agent prompt |
| `visual-explainer` | Direct symlink | No wrapper needed — stand-alone |

### Recommended Wrapping

| External Skill | Strategy | Rationale |
|---------------|----------|-----------|
| `audit` | Thin wrapper | Add PAI-specific checks (accessibility standards, component library compliance) |
| `teach-impeccable` | Direct use | One-time setup, no PAI customization needed |
| `overdrive` | Gate with review | High-risk skill — should require explicit approval |

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