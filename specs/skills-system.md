# Skills System

## Pattern: Skills-as-Containers

Skills are self-contained knowledge containers with progressive disclosure. Each skill has:

- **SKILL.md** -- Core definition with YAML frontmatter and routing logic
- **workflows/** -- Discrete task workflows (optional)
- **references/** / **assets/** -- Supporting documentation and templates (optional)

## Skill Context Types

| Type | Behavior | Used By |
|------|----------|---------|
| `context: same` | Loads in main conversation | CORE, humaniser |
| `context: fork` | Isolated subagent execution | All other 11 skills |

## All 13 Active Skills

### CORE (Foundation)
- **Context:** same (loaded every session)
- **Files:** 24 (including workflows, reference docs)
- **Purpose:** Identity, routing hub, stack preferences, security
- **Key files:** CONSTITUTION.md (8 principles), security-protocols.md, contacts.md

### research
- **Context:** fork | **Model:** sonnet
- **Workflows:** 9+ (conduct, claude-research, perplexity-research, interview, retrieve, youtube, web-scraping, enhance, extract-knowledge)
- **Purpose:** Multi-source parallel research with 3 modes (quick/standard/extensive)
- **Triggers:** "do research", "find information about", "extract wisdom"

### story-explanation
- **Context:** fork | **Model:** sonnet
- **Workflows:** 5 (create, create-with-links, create-abridged, cse, cse5)
- **Purpose:** Narrative summaries using UltraThink for best framing selection
- **Triggers:** "create story explanation", "narrative summary", /cse, /cse5

### system-create-skill
- **Context:** fork | **Model:** sonnet
- **Workflows:** 4 (create-skill, validate-skill, update-skill, canonicalize-skill)
- **Purpose:** Skill creation with architectural compliance enforcement
- **Triggers:** "create skill", "new skill", "validate skill"

### system-create-cli
- **Context:** fork
- **Workflows:** 5 (create-cli, add-command, upgrade-tier, add-testing, setup-distribution)
- **Purpose:** Generate TypeScript CLIs with 3-tier template system
- **Triggers:** "create a CLI", "build a command-line tool"

### design-implementation
- **Context:** fork
- **Workflows:** 5 (implement-feature, verify-visual, fix-errors, manage-server, test-interactions)
- **Purpose:** Automated UI dev workflow: server + browser + verify + fix loop
- **Triggers:** "implement next feature", "verify this implementation"

### frontend-design
- **Context:** fork | **Model:** sonnet
- **Workflows:** 0 (philosophy-driven, no discrete workflows)
- **Purpose:** Production-grade UI creation avoiding generic AI aesthetics
- **Triggers:** "build web components", "create pages", styling requests

### hook-authoring
- **Context:** fork
- **Workflows:** 2 (create-hook, debug-hooks)
- **Purpose:** Claude Code hook creation and configuration
- **Triggers:** "create hook", "hook not working", "debug hooks"

### prompting
- **Context:** fork
- **Workflows:** 2 (create-prompt, optimize-prompt)
- **Purpose:** Prompt engineering standards based on Anthropic best practices
- **Triggers:** "prompt engineering", "context engineering guidance"

### humaniser
- **Context:** same | **Model:** haiku
- **Workflows:** 0 (inline editing)
- **Purpose:** Remove 24 categories of AI-generated writing patterns
- **Triggers:** Text editing/reviewing to sound more natural

### cc-upgrade
- **Context:** fork
- **Workflows:** 0 (analysis pipeline)
- **Purpose:** Generic Claude Code folder analysis, feature compatibility, 12-factor compliance
- **Triggers:** Analyzing .claude/ folders, checking CC version compatibility

### cc-upgrade-pai
- **Context:** fork
- **Workflows:** 0 (extends cc-upgrade)
- **Purpose:** PAI-specific CC analysis (CORE audit, delegation patterns)
- **Triggers:** Optimizing PAI codebases

### example-skill
- **Context:** fork
- **Workflows:** 3 (simple-task, complex-task, parallel-task)
- **Purpose:** Template demonstrating Skills-as-Containers pattern
- **Triggers:** "show me an example", "how do skills work"

## Skill Dependencies

```
CORE (foundation -- all skills depend on it)
├── cc-upgrade
│   └── cc-upgrade-pai (extends base)
├── research
│   └── story-explanation (complementary)
├── design-implementation
│   └── frontend-design (design philosophy)
├── system-create-skill
├── system-create-cli
├── hook-authoring
├── prompting
├── humaniser
└── example-skill
```
