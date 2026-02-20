# PAI Quick Start

## Prerequisites

```bash
curl -fsSL https://bun.sh/install | bash    # Install Bun
source ~/.bashrc
```

Install Claude Code from [code.claude.com](https://code.claude.com).

## Install

```bash
git clone https://github.com/multicam/qara.git && cd qara
cp .claude/.env.example .claude/.env         # Add your ANTHROPIC_API_KEY
ln -s $(pwd)/.claude ~/.claude               # Symlink (or cp -r for copy)
```

## First Run

```bash
claude    # CORE skill loads automatically via SessionStart hook
```

Try: `"What skills are available?"`, `"Show stack preferences"`, `"Read the CONSTITUTION"`

## Structure

```
~/.claude/
├── skills/           # Domain capabilities (auto-activate on triggers)
│   └── CORE/         # Main PAI docs: CONSTITUTION.md, SKILL.md, etc.
├── agents/           # Specialized AI workers
├── hooks/            # Event-driven automation
└── .env              # API keys (never commit!)
```

**Three primitives:** Skills (domain containers) → Workflows (task steps) → Agents (parallel orchestrators)

**Three principles:** CLI-First, Deterministic Code First, Prompts Wrap Code

## Common Tasks

```bash
cd ~/qara && git pull && bun install    # Update PAI
ls ~/.claude/skills/                     # Browse skills
```

## Troubleshooting

- **PAI not loading?** Check `cat ~/.claude/settings.json | grep SessionStart`
- **Manual load:** `read ~/.claude/skills/CORE/SKILL.md`
- **API keys:** Verify `.env` exists with `KEY=value` format (no spaces around `=`)
