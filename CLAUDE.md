# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Identity

**Qara** is a Personal AI Infrastructure (PAI) system - NOT a traditional software project. This repository configures a sophisticated personal AI operating system built around Claude Code with Skills, Hooks, Agents, and structured Context management.

**Core Philosophy:** "System over Intelligence" - Good architecture beats raw model capability.

**Your Role:** You are operating within a user's personal AI infrastructure. The CORE skill (loaded at session start via hooks) defines system identity, preferences, security rules, and response format standards.

## Repository Structure

```
/home/jean-marc/qara/
├── .claude/                    # Core PAI infrastructure
│   ├── agents/                 # Specialized AI personas (architect, engineer, designer, etc.)
│   ├── commands/               # Custom slash commands (currently empty - reserved)
│   ├── context/                # Tiered knowledge management system
│   │   ├── architecture/       # System design documentation
│   │   ├── design/             # UX/UI patterns and guidelines
│   │   ├── philosophy/         # PAI principles and approach
│   │   ├── projects/           # Project-specific contexts (reserved)
│   │   ├── research/           # Research outputs (simlink to ~/research)
│   │   ├── testing/            # Testing strategies
│   │   ├── tools/              # Tool documentation (reserved)
│   │   └── working/            # Active work contexts
│   ├── documentation/          # Comprehensive system docs (~200KB)
│   │   ├── knowledge/          # Core concepts (skills, hooks, agents, CLI tools)
│   │   └── plans/              # Implementation roadmaps
│   ├── hooks/                  # Event-driven automation (TypeScript)
│   │   ├── lib/                # Shared hook utilities
│   │   └── utils/              # Helper functions
│   ├── settings.json           # Global Claude Code configuration
│   ├── settings.local.json     # Machine-specific settings
│   └── skills/                 # Modular capability system (8 skills)
│       ├── CORE/               # System identity, contacts, preferences, security
│       ├── agent-observability/  # Real-time multi-agent session dashboard
│       ├── alex-hormozi-pitch/ # $100M Offers methodology
│       ├── create-skill/       # Skill creation template
│       ├── example-skill/      # Reference implementation
│       ├── fabric/             # Fabric CLI pattern selector (242+ prompts)
│       ├── prompting/          # Prompt engineering best practices
│       └── research/           # Multi-source parallel research system
├── mcp.json                    # MCP server configurations (chrome-devtools)
├── .markdownlint.json          # Markdown quality standards
├── .gitignore                  # Security: excludes .env and sensitive files
└── RESEARCH_POST_MORTEM.md     # Research agent analysis (Nov 2025)
```

## Key Concepts

### 1. Skills System (Modular Capabilities)

Skills extend Claude Code's capabilities with specialized knowledge, workflows, and tool integrations.

**Skill Structure:**
- `skill.yml` - Metadata (name, description, tags)
- `SKILL.md` - Core instructions and usage
- `CLAUDE.md` - Development/architecture details
- `resources/` - Supporting files (optional)

**Pattern:** Progressive disclosure - load only what's needed for the task.

**Available Skills:**
- **CORE** (auto-loaded) - System identity, contacts, stack preferences, security
- **research** - Multi-source research with parallel agents (quick/standard/extensive modes)
- **agent-observability** - Vue 3 + D3.js dashboard for visualizing agent sessions
- **fabric** - Intelligent pattern selection for Fabric CLI's 242+ prompts
- **prompting** - Anthropic-based prompt engineering principles
- **create-skill** - Template and guidance for creating new skills

**Invocation:** `Skill(name)` tool or auto-loaded based on context.

### 2. Hooks System (Event-Driven Automation)

TypeScript/Bash scripts that execute automatically at specific lifecycle events:

- **SessionStart** - Loads PAI CORE context (runs once per session)
- **UserPromptSubmit** - Dynamic context loading before processing user requests
- **PreToolUse/PostToolUse** - Intercepts tool execution (validation, logging)
- **Stop/SubagentStop** - Cleanup, recording, archiving
- **PreCompact** - Context compression before hitting token limits

**Location:** `.claude/hooks/`
**Configuration:** `.claude/settings.json` (hooks section)

### 3. Agents System (Specialized AI Personas)

Six specialized agents for complex multi-step tasks:

- **architect** (Nova) - System design, PRD creation, technical specifications
- **engineer** (Atlas) - Implementation, debugging, optimization, security
- **designer** - UI/UX design, design systems, prototyping
- **researcher** - General web research
- **claude-researcher** - Deep research with citations (academic, legal, technical)
- **gemini-researcher** - Multi-perspective research and synthesis

**Launch:** Use `Task(subagent_type=name)` tool.

### 4. Context Management (3-Tier System)

**Tier 1 (Always On):** CORE skill loaded at session start (~2KB)
**Tier 2 (On-Demand):** Documentation files when needed (~200KB total)
**Tier 3 (Project-Specific):** Reserved for project contexts

**Philosophy:** Optimize signal-to-noise ratio - load contextually relevant information only.

## Current State (November 2025)

**Branch:** master | **Status:** Clean working tree

**Key Findings:**
- Multi-agent parallelization: 90% time savings (3 hours vs. 30 sequential)
- Critical issues: documentation-reality mismatches, error handling gaps
- Comprehensive recommendations for Priority 1-4 improvements documented

## Working with This Repository

### Creating a New Skill

1. Invoke `Skill(create-skill)` to load creation template
2. Read `.claude/skills/example-skill/` for reference implementation
3. Follow structure: `skill.yml` + `SKILL.md` + optional `CLAUDE.md`
4. Test skill invocation and documentation accuracy
5. Update this CLAUDE.md if skill adds significant capabilities

### Adding a Hook

1. Create TypeScript file in `.claude/hooks/`
2. Export function matching hook signature (see existing hooks)
3. Register in `.claude/settings.json` under `hooks` section
4. Test hook execution at appropriate lifecycle event
5. Document hook purpose in `.claude/documentation/knowledge/hooks.md`

### Running Research

**Method 1 (Direct - Works Now):**
```bash
# Launch Task tool with subagent_type=researcher, claude-researcher, or gemini-researcher
# For comprehensive research, launch multiple agents in parallel
```

**Method 2 (Skill - Documented but unclear):**
```bash
# Invoke Skill(research) - loads research skill context
# Note: /conduct-research command doesn't exist yet (see Known Issues)
```

**Modes:**
- Quick: 3 agents, ~2-5 minutes
- Standard: 9 agents, ~10-20 minutes
- Extensive: 24 agents, ~60-180 minutes

### Updating Documentation

**Documentation lives in:**
- `.claude/documentation/knowledge/` - Core concepts (skills, hooks, agents, CLI tools)
- `.claude/documentation/plans/` - Implementation roadmaps
- `.claude/context/*/` - Domain-specific knowledge

**Standard:** All markdown must pass markdownlint validation (`.markdownlint.json`)

**Key Rules:**
- Code blocks MUST specify language: ` ```bash ` not ` ``` `
- Blank lines around code blocks, lists, headings
- Line length max 120 chars (except code/tables)
- Tables: proper spacing `| Column | Value |`

## Security Guidelines

**CRITICAL - READ BEFORE ANY GIT OPERATIONS:**

1. **NEVER commit from wrong directory** - Run `git remote -v` BEFORE every commit
2. **`~/.claude/` contains EXTREMELY SENSITIVE PRIVATE DATA** - Never commit to public repos
3. **Check remote THREE TIMES** before `git add`/`git commit`
4. **.env file contains API keys** - Already in .gitignore, but verify before commits
5. **This is a personal infrastructure repo** - Treat all contents as potentially sensitive

**Before ANY commit:**
```bash
# 1. Verify location
pwd
git remote -v

# 2. Check what will be committed
git status
git diff --cached

# 3. Confirm no sensitive data
grep -r "api_key\|API_KEY\|secret\|password" <files-to-commit>
```

## Stack Preferences (from CORE)

**CLI Tools (Always prefer modern alternatives):**
- File search: `fd` over `find`
- Text search: `ripgrep` (rg) over `grep`
- File viewing: `bat` over `cat`
- Code search: `ast-grep` for semantic operations

**Markdown Standards:**
- All generated markdown MUST pass markdownlint validation
- Use `.markdownlint.json` configuration
- Test with: `markdownlint-cli2 <file>.md`

**Scratchpad Usage:**
- For test/random tasks: `~/.claude/scratchpad/YYYY-MM-DD-HHMMSS_description/`
- NEVER drop random projects directly in `~/.claude/`

## Documentation Map

**Core System Docs:**
- `.claude/skills/CORE/SKILL.md` - System identity, contacts, preferences, security
- `.claude/documentation/knowledge/skills-system.md` - Skills architecture
- `.claude/documentation/knowledge/hooks.md` - Hook system and patterns
- `.claude/documentation/knowledge/agents.md` - Specialized agents overview
- `.claude/documentation/knowledge/cli-tools.md` - fd, ripgrep, bat, ast-grep

**Architecture & Philosophy:**
- `.claude/context/architecture/` - System design decisions
- `.claude/context/philosophy/` - PAI principles and approach
- `.claude/documentation/plans/` - Implementation roadmaps

**Research System:**
- `.claude/skills/research/SKILL.md` - Multi-source research patterns
- `RESEARCH_POST_MORTEM.md` - Post-mortem analysis of a research workflow (Nov 2025)

**Agent Observability:**
- `.claude/skills/agent-observability/SKILL.md` - Dashboard overview
- `.claude/skills/agent-observability/CLAUDE.md` - Technical architecture

## Useful Commands

```bash
# Verify git remote (ALWAYS before committing)
git remote -v

# Check recent activity
git log --oneline -10

# List all skills
ls -la .claude/skills/

# List all hooks
ls -la .claude/hooks/*.ts

# Validate markdown
markdownlint-cli2 '**/*.md'

# Search codebase (use ripgrep from Grep tool)
rg "pattern" --type md

# Find files (use fd from Glob tool)
fd "pattern" .claude/
```

## Known Issues & Limitations

**High Priority (Fix Before Using):**

1. **Agent Type Availability Gap**
   - `perplexity-researcher` referenced in research skill docs but doesn't exist
   - Fallback: Use `claude-researcher` or `gemini-researcher`
   - Action needed: Update `.claude/skills/research/SKILL.md`

2. **Missing Slash Command**
   - `/conduct-research` documented but doesn't exist
   - Workaround: Launch Task tool with researcher agents directly
   - Action needed: Create command OR update documentation

3. **Timeout Implementation Missing**
   - Research skill docs claim 2-10 minute hard timeouts
   - Reality: No timeout mechanism exists, agents run until completion
   - Action needed: Implement OR remove timeout claims from docs

4. **Progress Visibility**
   - Multi-agent research runs in silent black box (3+ hours)
   - No real-time progress updates or partial results streaming
   - Action needed: Add progress tracking and intermediate output

**Medium Priority:**

5. **Error Recovery**
   - When agents fail, no automatic fallback or retry
   - 33% agent failure rate observed (8/24 in XRP research)
   - Action needed: Add agent type validation, fallback logic

6. **Result Deduplication**
   - Multiple agents produce duplicate sources (XRPScan mentioned 8+ times)
   - Adds synthesis overhead
   - Action needed: Post-processing deduplication step

**Low Priority:**

7. **Empty Reserved Directories**
   - `.claude/commands/` - no slash commands defined yet
   - `.claude/context/projects/` - no project contexts yet
   - `.claude/context/tools/` - no tool documentation yet
   - This is expected for a new system

## MCP Servers

**Configured in `mcp.json`:**
- **chrome-devtools** - Browser DevTools protocol access via `chrome-devtools-mcp@latest`

**Invocation:** MCP tools are prefixed with `mcp__` (e.g., `mcp__chrome_devtools__*`)

## Final Notes for Future Claude Instances

**This is NOT a traditional codebase.** You are operating within a user's personal AI infrastructure. The system is designed around:

1. **Skills** - Modular capabilities you can invoke
2. **Hooks** - Automatic context loading at lifecycle events
3. **Agents** - Specialized personas for complex tasks
4. **Context** - Tiered knowledge management

**Your CORE identity, preferences, and security rules are loaded automatically** via the SessionStart hook. Follow the response format, security guidelines, and stack preferences defined in the CORE skill.

**When in doubt:**
- Check `.claude/documentation/knowledge/` for system concepts
- Read relevant skill's `SKILL.md` for usage patterns
- Consult `RESEARCH_POST_MORTEM.md` for multi-agent research learnings
- ALWAYS verify git remote before commits

**Philosophy:** Optimize for signal-to-noise ratio. Be direct, concise, and actionable. Load context progressively based on task requirements.

**Security First:** This repository contains personal infrastructure configuration. Treat everything as potentially sensitive. Never commit sensitive data to public repositories.
