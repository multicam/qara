# PAI External Skills Registry

Comprehensive documentation of all externally-installed skills in the PAI ecosystem.
Maintained as part of `cc-upgrade-pai`. Updated during each external skills deep analysis.

Last reviewed: 2026-03-23

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
**Stars:** 6.8k+ | **License:** MIT
**Installed:** 2026-02-20 | **Last Updated:** 2026-03-21
**Lock hash:** `1e92fcf6677...`

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
**Last upstream review:** 2026-03-27 (latest commit: `a6bdfd9` 2026-03-26)

These skills were **rewritten for PAI conventions** — not symlinked. They live as local
skills but track upstream for improvements.

| PAI Skill | Upstream Source | Adaptation Notes |
|-----------|---------------|------------------|
| `grill-me` | `grill-me/SKILL.md` | Expanded methodology, probe patterns, PAI structure |
| `design-it-twice` | `design-an-interface/SKILL.md` | Broadened to architecture + data models, uses `architect` agents |
| `edit-article` | `edit-article/SKILL.md` | Added Phase 3 humaniser pass, expanded to docs/specs |
| `refactor-plan` | `request-refactor-plan/SKILL.md` | PAI conventions, codebase-analyzer integration, JM-addressed |
| `triage-issue` | `triage-issue/SKILL.md` | PAI conventions, codebase-analyzer integration, TDD fix plans |
| `ubiquitous-language` | `ubiquitous-language/SKILL.md` | PAI conventions, DDD glossary extraction |
| `prd-to-plan` | `prd-to-plan/SKILL.md` | PAI conventions, vertical slice tracer bullets |
| `CORE/testing-guide.md` | `tdd/SKILL.md` + `tdd/tests.md` | Merged TDD into existing testing guide |
| `CORE/references/deep-modules.md` | `tdd/deep-modules.md` | Extracted as shared cross-cutting reference |
| `CORE/references/mocking-guidelines.md` | `tdd/mocking.md` + `improve-codebase-architecture/REFERENCE.md` | Combined mocking rules + dependency classification |
| `CORE/references/interface-design.md` | `tdd/interface-design.md` | Extracted as shared reference |
| `CORE/references/refactoring-signals.md` | `tdd/refactoring.md` | Extracted as shared reference |
| `product-shaping/workflows/breakdown.md` | `prd-to-issues/SKILL.md` | Vertical slice + HITL/AFK methodology as Phase 4 |
| `agents/codebase-analyzer.md` | `improve-codebase-architecture/SKILL.md` | Friction-driven analysis lens added |

### Upstream Skills NOT Yet Adopted

| Upstream Skill | Purpose | Adoption Status | Notes |
|---------------|---------|-----------------|-------|
| `write-a-prd` | PRD creation via interview | **Covered** by `product-shaping` | PAI version is more comprehensive |
| `prd-to-issues` | PRD → GitHub issues | **Merged** into `product-shaping/workflows/breakdown.md` | Combined with vertical slicing |
| `setup-pre-commit` | Husky + lint-staged setup | **Not needed** | PAI uses hooks system directly |
| `git-guardrails-claude-code` | Block dangerous git ops | **Covered** by `pre-tool-use-security.ts` hook | PAI uses hook-based security |
| `write-a-skill` | Skill creation guide | **Covered** by `system-create-skill` | PAI version is more structured |
| `migrate-to-shoehorn` | Test assertion migration | **Not relevant** | TypeScript-specific, not used in PAI |
| `scaffold-exercises` | Exercise directory creation | **Not relevant** | Educational tooling |
| `obsidian-vault` | Obsidian integration | **Evaluate** | Could complement thoughts/ system |

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