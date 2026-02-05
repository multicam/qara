# Architecture

## What Qara Is

Qara is Jean-Marc Giorgi's Personal AI Infrastructure (PAI) -- a Claude Code configuration system that transforms Claude into a personalized, multi-agent development assistant with persistent identity, event-driven automation, and domain-specific skills.

It is NOT a traditional application. It's a `.claude/` directory structure that configures Claude Code's behavior via skills, hooks, agents, commands, and context files.

## Core Philosophy (CONSTITUTION.md)

Eight founding principles:

1. **Scaffolding > Model** -- System architecture matters more than the AI model
2. **Deterministic Code First** -- Same input = same output
3. **Code Before Prompts** -- Write code, use prompts to orchestrate
4. **CLI as Interface** -- Every operation accessible via command line
5. **Goal -> Code -> CLI -> Prompts** -- Development pipeline order
6. **Spec/Test/Evals First** -- Define expected behavior before implementation
7. **Meta/Self Updates** -- System improves itself
8. **Custom Skill Management** -- Skills are the organizational unit

## The Three Primitives

| Primitive | Purpose | When to Use |
|-----------|---------|-------------|
| **Skills** | Meta-containers for domain expertise | Need competence in a topic/domain |
| **Commands** | Discrete task workflows (slash commands) | Repeatable task with clear steps |
| **Agents** | Autonomous task executors | Need specialized expertise or parallel execution |

## Directory Layout

```
~/qara/                          # Repository root
├── .claude/                     # PAI configuration (symlinked to ~/.claude/)
│   ├── skills/                  # 13 skill containers
│   │   └── CORE/               # Foundation skill (always loaded)
│   ├── hooks/                   # 4 active event hooks + 7 shared libs
│   │   └── lib/                 # Shared TypeScript utilities
│   ├── commands/                # Slash commands (/research, /create_plan, etc.)
│   ├── agents/                  # 14 specialized agent definitions
│   ├── context/                 # Context files (@include'd into sessions)
│   ├── templates/               # Reusable output templates
│   ├── tests/                   # Validation test suites
│   ├── bin/                     # Utility scripts
│   ├── state/                   # Runtime state (gitignored)
│   └── settings.json            # Claude Code configuration
├── docs/                        # User-facing documentation
├── scripts/                     # Quality assurance shell scripts
├── purgatory/                   # Archived/deprecated features
├── scratchpad/                  # Temporary research workspace
├── thoughts/                    # HumanLayer-managed knowledge base (gitignored)
├── specs/                       # These specification documents
├── CLAUDE.md                    # Project-level instructions
├── PAI_CONTRACT.md              # System guarantees
├── SECURITY.md                  # Security guidelines
├── INSTALL.md                   # Installation guide
└── GEMINI.md                    # Gemini CLI instructions
```

## Data Flow

### Session Lifecycle

```
Session Start
  -> SessionStart hook fires
  -> Subagent check (skip if subagent)
  -> Debounce check (2s lockfile)
  -> Load CORE/SKILL.md into context
  -> Suggest relevant skills based on cwd/package.json
  -> Set terminal tab title

User Prompt
  -> UserPromptSubmit hook fires
  -> Update tab title with processing indicator

Tool Use (Bash)
  -> PreToolUse hook fires
  -> Security pattern check (block/approve/require-approval)
  -> Checkpoint age check
  -> Additional context injection (CC 2.1.9)

Claude Completes
  -> Stop hook fires
  -> Extract COMPLETED line from transcript
  -> Compact errors to JSONL summary
  -> Set final tab title
  -> Suggest recovery if error threshold exceeded
```

### Context Loading (Progressive Disclosure)

| Tier | Location | When Loaded | Budget |
|------|----------|-------------|--------|
| 1 | Skill YAML `description:` | Always (session start) | ~100 tokens each |
| 2 | SKILL.md body | When skill activates | ~2000 tokens |
| 3 | Reference files | Just-in-time via `-> READ:` | 500-2000 tokens each |

## Technology Stack

- **Runtime:** Bun (NOT Node.js)
- **Language:** TypeScript (NOT Python -- "we hate Python")
- **Package manager:** bun (NOT npm/yarn/pnpm); uv for Python when forced
- **Content format:** Markdown (NOT HTML unless custom components)
- **Testing:** bun test, Playwright for UI
- **AI tools:** Fabric (242+ prompts), Gemini CLI, Ollama
- **Modern CLI tools:** fd, rg, ast-grep, bat
