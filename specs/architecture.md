# Architecture

## What Qara Is

Qara is Jean-Marc Giorgi's Personal AI Infrastructure (PAI) — a `.claude/` directory structure (symlinked to `~/.claude/`) that configures Claude Code's behavior via skills, hooks, commands, agents, and context files. Not a traditional application.

## Core Philosophy (CONSTITUTION.md)

1. **Scaffolding > Model** — System architecture matters more than the AI model
2. **Deterministic Code First** — Same input = same output
3. **Code Before Prompts** — Write code, use prompts to orchestrate
4. **CLI as Interface** — Every operation accessible via command line
5. **Goal -> Code -> CLI -> Prompts** — Development pipeline order
6. **Spec/Test/Evals First** — Define expected behavior before implementation
7. **Meta/Self Updates** — System improves itself
8. **Custom Skill Management** — Skills are the organizational unit

## The Three Primitives

| Primitive | Purpose | When to Use |
|-----------|---------|-------------|
| **Skills** | Meta-containers for domain expertise | Need competence in a topic/domain |
| **Commands** | Discrete task workflows (slash commands) | Repeatable task with clear steps |
| **Agents** | Custom subagent types with specialized prompts | Need a specialist role for delegation |

## Directory Layout

```
~/qara/                          # Repository root
├── .claude/                     # PAI configuration (symlinked to ~/.claude/)
│   ├── skills/                  # 18 skill containers
│   │   └── CORE/               # Foundation skill (always loaded)
│   ├── hooks/                   # 6 event hooks
│   │   └── lib/                # 4 shared TypeScript utilities
│   ├── commands/                # 12 slash commands
│   ├── agents/                  # 8 custom agent definitions
│   ├── context/                 # Context files (guides, references, tools)
│   ├── mcp-servers/             # MCP server implementations
│   ├── templates/               # Reusable output templates
│   ├── tests/                   # Validation test suites
│   ├── bin/                     # Utility scripts
│   ├── state/                   # Runtime state (gitignored)
│   └── settings.json            # Claude Code configuration
├── .mcp.json                    # MCP server config
├── docs/                        # User-facing documentation
├── specs/                       # These specification documents
├── purgatory/                   # Archived/deprecated features
├── scratchpad/                  # Temporary research workspace
├── thoughts/                    # Knowledge base (gitignored)
├── CLAUDE.md                    # Project-level instructions
├── PAI_CONTRACT.md              # System guarantees
├── SECURITY.md                  # Security guidelines
└── INSTALL.md                   # Installation guide
```

## Session Lifecycle

```
Session Start → SessionStart hook → CORE/SKILL.md loaded → tab title set
User Prompt   → UserPromptSubmit hook → tab title updated
Tool Use      → PreToolUse security hook → CC permission system → PostToolUse logging
Notification  → notification-hook.ts
Completion    → Stop hook → tab title from last query
```

## Context Loading (Progressive Disclosure)

| Tier | Location | When Loaded | Budget |
|------|----------|-------------|--------|
| 1 | Skill YAML `description:` | Always (session start) | ~100 tokens each |
| 2 | SKILL.md body | When skill activates | ~1000 tokens |
| 3 | Reference files | Just-in-time via `-> READ:` | 500-2000 tokens each |

## Technology Stack

- **Runtime:** Bun (NOT Node.js)
- **Language:** TypeScript (NOT Python unless explicitly approved; uv when forced)
- **Package manager:** bun (NOT npm/yarn/pnpm)
- **Content format:** Markdown (NOT HTML unless custom components)
- **Testing:** bun test, Playwright for UI
- **AI tools:** Gemini CLI, Ollama (via MCP)
- **Modern CLI tools:** fd, rg, ast-grep, bat
