# Skills System

## Pattern: Skills-as-Containers

Skills are self-contained knowledge containers with progressive disclosure:

- **SKILL.md** — Core definition with YAML frontmatter and routing logic
- **workflows/** — Discrete task workflows (optional)
- **references/** / **assets/** — Supporting docs and templates (optional)

## Skill Context Types

| Type | Behavior | Used By |
|------|----------|---------|
| `context: same` | Loads in main conversation | CORE, grill-me, cross-provider, csf-view, design-it-twice, edit-article |
| `context: fork` | Isolated subagent execution | All other local + symlinked skills |

## Active Skills (37 total — 2026-04-16 post-consolidation v1.1)

**Breakdown:** 35 local + 2 symlinked external (harden, visual-explainer)

5 new pipeline-stage skills absorb 10 reference-only skills: review (critique+audit), enhance (layout+animate+adapt+optimize), finish (polish+clarify), design-system (subsumes tokens), design-research (fills research gap).

External skill content is git-tracked at `.claude/skills-external/<name>/`. `~/.agents/skills/` is the `npx skills` CLI cache only. Nightly sync (`scripts/skills-sync-nightly.sh`, cron 02:00) pulls upstream → detects drift via Gemma (structural + semantic) → auto-commits benign changes or writes a review artifact for material ones. Claude's weekly synthesize reads pending reviews and applies philosophy + overlap lenses before adopt/modify/reject.

### Foundation

**CORE** — `same` context, loaded every session. Identity, routing hub, stack preferences, security, agent roster, response tiers. Has references/ + workflows/.

### Execution Modes (3)

**drive** — PRD-driven persistent execution with TDD cycles, critic/verifier gates, regression checks.
**cruise** — Phased autonomous execution: Discover → Plan → Implement → Verify with checkpoints.
**turbo** — Parallel agent dispatch; decomposes tasks, spawns parallel agents, verifies results.

### Research & Content

**research** — Multi-source parallel research with extended thinking.
**thoughts-consolidate** — Consolidate thoughts/ files with codebase verification.
**diderot** — Knowledge retrieval from JM's Obsidian vault via keyword + semantic search.
**cross-provider** — Synthesis across Claude subagent + local Gemma 4.

### Development Tools

**system-create-skill** — Skill creation with architectural compliance.
**system-create-cli** — TypeScript CLI generation with 3-tier template system.
**design-implementation** — Automated UI dev loop: server + browser + verify + fix. Delegates to `impeccable` for design work.
**hook-authoring** — Hook creation and configuration.
**hook-test** — End-to-end hook health checking and auto-correction.
**prompting** — Prompt engineering standards per Anthropic best practices.
**devtools-mcp** — Browser automation via Chrome DevTools MCP.
**tdd-qa** — TDD and QA architecture — agent-executable blueprints for scenarios, cycles, back-testing, quality gates.

### Text & Content

**humaniser** — Removes AI writing patterns.
**edit-article** — Phase 1-3 editing: DAG restructure, paragraph tightening, humaniser pass.
**ubiquitous-language** — DDD glossary extraction from conversation.

### Analysis & Upgrade

**cc-upgrade** — Generic Claude Code folder analysis, feature compatibility, 12-factor compliance.
**cc-upgrade-pai** — PAI-specific analysis; hosts `skills-detect-lib.ts` and nightly sync helpers.
**introspect** — Cognitive introspection: daily reflect, weekly synthesize, monthly evolve.
**grill-me** — Stress-test plans/designs/proposals through relentless questioning. Dependency-graph-aware.
**design-it-twice** — Generate multiple radically different designs via parallel sub-agents.

### Product Work

**product-shaping** — Problem framing → research → specs.
**triage-issue** — Investigate bugs → root-cause → GitHub issues with TDD-based fix plans.
**image** — AI image generation + stock photo sourcing. Smart model routing.
**csf-view** — Visual canvas (tldraw) for communicating designs to Claude.

### Symlinked — Anthropic impeccable family (3)

**impeccable** — v2.1.1. Master design skill. Anti-AI-slop patterns, production-grade frontend. Subcommands: `craft` (shape-then-build), `teach` (design context setup), `extract` (reusable components + tokens). Consolidates former frontend-design + teach-impeccable + extract.

**shape** — v2.1.1. Pre-implementation UX/UI planning — discovery interview → design brief.

**layout** — v2.1.1. Layout, spacing, visual rhythm. Renamed from `arrange`.

### Symlinked — nicobailon/visual-explainer (13)

**visual-explainer** — v0.6.3. Generate HTML diagrams, Mermaid, slides, data tables, diff reviews, project recaps. HTML outputs land in `thoughts/shared/diagrams/` via `~/.agent/diagrams` symlink.

**Active design sub-skills (post-consolidation 2026-04-16):** `adapt`, `animate`, `audit`, `clarify`, `critique`, `harden`, `layout`, `optimize`, `polish`, `shape`, `visual-explainer` (12 upstream symlinked) + local wrappers `tune` (merges bolder/quieter/colorize), `impeccable-typeset` (wraps typeset), `tokens` (thin alias for `/impeccable extract`), `flows` (user journey + IA). See `.claude/context/design-skills-map.md` for the landscape and `.claude/context/design-cookbook.md` for recipes.

### Migration & prune history

**2026-04-16 (plan v1.2):**
- `bolder` + `quieter` + `colorize` → merged into local `tune` dispatcher; 3 upstream symlinks removed, mirrors preserved.
- `typeset` → wrapped by local `impeccable-typeset`; upstream symlink removed, mirror preserved.
- `states` (proposed) → killed; state phrases routed to `polish` (copy/interaction already covered by impeccable refs).
- New local skills: `tune`, `impeccable-typeset`, `tokens`, `flows`.
- `designer` agent: `skills: [frontend-design]` → `[impeccable]` (was broken since 2026-04-11 rename).

**2026-04-15 (Impeccable v2.1.1 migration + prune):**
- `arrange` → `layout`; `normalize` + `onboard` → absorbed into `polish`; `frontend-design` + `teach-impeccable` → superseded by `impeccable`.
- Pruned as redundant with impeccable's scope: `extract` (use `impeccable extract`), `delight`, `distill`, `overdrive`.

## Skill Dependencies

```
CORE (foundation — loads every session)
├── Execution modes
│   ├── drive → tdd-qa, critic + verifier agents
│   ├── cruise → tdd-qa, critic + verifier agents
│   └── turbo (parallel dispatch)
├── Development tools
│   ├── cc-upgrade → cc-upgrade-pai (imports base analyzers)
│   ├── design-implementation → impeccable (design philosophy)
│   ├── system-create-skill, system-create-cli
│   ├── hook-authoring → hook-test
│   └── tdd-qa (consumed by modes)
├── Research
│   ├── research, thoughts-consolidate, diderot
│   └── cross-provider (Claude + Gemma 4)
├── Text & Content
│   ├── humaniser, edit-article, ubiquitous-language
│   └── image, csf-view
├── Analysis
│   ├── introspect (self-audit)
│   ├── grill-me (plan stress test)
│   └── design-it-twice (parallel alternatives)
├── Product
│   ├── product-shaping, triage-issue
│   └── impeccable (anchor for 13 visual-explainer sub-skills + shape + layout)
└── MCP
    └── devtools-mcp
```

## External Skill Sources

See `.claude/skills/cc-upgrade-pai/references/external-skills-registry.md` for detailed provenance, version hashes, migration history, and upstream monitoring cadence.

| Source | Author | Active | Tracking |
|---|---|---|---|
| Anthropic impeccable family | Anthropic fork | 3 (impeccable, shape, layout) | Manual (registry-only; outside `npx skills` lock file) |
| nicobailon/visual-explainer | nicobailon | 13 (visual-explainer + 12 sub-skills) | Lock file + registry |
| mattpocock/skills | mattpocock | — | Adapted (rewritten for PAI conventions), not symlinked |
