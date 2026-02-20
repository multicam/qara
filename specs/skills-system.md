# Skills System

## Pattern: Skills-as-Containers

Skills are self-contained knowledge containers with progressive disclosure:

- **SKILL.md** — Core definition with YAML frontmatter and routing logic
- **workflows/** — Discrete task workflows (optional)
- **references/** / **assets/** — Supporting docs and templates (optional)

## Skill Context Types

| Type | Behavior | Used By |
|------|----------|---------|
| `context: same` | Loads in main conversation | CORE, humaniser |
| `context: fork` | Isolated subagent execution | All other skills |

## All 18 Active Skills

### Foundation

**CORE** — `same` context, loaded every session. Identity, routing hub, stack preferences, security, agent roster, response tiers. Key files: CONSTITUTION.md, security-protocols.md, contacts.md.

### Research & Content

**research** — `fork`, sonnet. Multi-source parallel research with 3 modes (quick/standard/extensive). Auto-selects agent by API key: Perplexity > Claude WebSearch > Gemini. 9+ workflows including conduct, claude-research, perplexity-research, interview, youtube, web-scraping.

**story-explanation** — `fork`, sonnet. Narrative summaries using UltraThink. 5 workflows (create, create-with-links, create-abridged, cse, cse5).

**thoughts-consolidate** — `fork`, sonnet. Consolidate and clean up thoughts/ files with codebase verification.

### Development Tools

**system-create-skill** — `fork`, sonnet. Skill creation with architectural compliance. 4 workflows.

**system-create-cli** — `fork`. TypeScript CLI generation with 3-tier template system. 5 workflows.

**design-implementation** — `fork`. Automated UI dev loop: server + browser + verify + fix. 5 workflows.

**frontend-design** — `fork`, sonnet. Production-grade UI avoiding generic AI aesthetics. Philosophy-driven, no discrete workflows.

**hook-authoring** — `fork`. Hook creation and configuration. 2 workflows.

**prompting** — `fork`. Prompt engineering standards per Anthropic best practices. 2 workflows.

**devtools-mcp** — `fork`. Browser automation via Chrome DevTools MCP.

**live-testing** — `fork`. Live testing workflows.

### Text & Content

**humaniser** — `same`, haiku. Removes 24 categories of AI writing patterns. Inline editing.

**visual-explainer** — `fork`. Visual explanation generation.

### Analysis & Upgrade

**cc-upgrade** — `fork`. Generic Claude Code folder analysis, feature compatibility, 12-factor compliance. Exports 5 analyzers for extension skills.

**cc-upgrade-pai** — `fork`. PAI-specific analysis, imports 3 base analyzers from cc-upgrade + 5 PAI-specific.

**hook-test** — `fork`. End-to-end hook health checking and auto-correction.

### Template

**example-skill** — `fork`. Template demonstrating Skills-as-Containers pattern. 3 workflows.

## Skill Dependencies

```
CORE (foundation)
├── cc-upgrade → cc-upgrade-pai (imports base analyzers)
├── research → story-explanation (complementary)
├── design-implementation → frontend-design (design philosophy)
├── system-create-skill
├── system-create-cli
├── hook-authoring → hook-test
├── prompting
├── humaniser
├── devtools-mcp
├── live-testing
├── visual-explainer
├── thoughts-consolidate
└── example-skill
```
