# Qara

Personal AI Infrastructure (PAI) built on Claude Code.

## Quick Start

```bash
git clone https://github.com/multicam/qara.git
cd qara
bun install
```

See [INSTALL.md](INSTALL.md) for full setup or [docs/QUICKSTART.md](docs/QUICKSTART.md) for the 5-minute guide.

## What's Inside

```
.claude/
  hooks/      # Event-driven automation (session start, security, etc.)
  skills/     # Loadable AI capabilities (CORE + domain skills)
  agents/     # Specialized subagent configurations
  commands/   # Slash command workflows
```

## Requirements

- [Bun](https://bun.sh) (JS runtime)
- [Claude Code](https://claude.ai/code) (CLI)
- Git
