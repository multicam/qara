# CodeLayer / HumanLayer Reference

## What It Is

**CodeLayer** — Open-source IDE for orchestrating AI coding agents, built on Claude Code. Keyboard-first workflows for running multiple Claude Code sessions in parallel. Evolved from HumanLayer (human-in-the-loop SDK).

## Architecture

```
CodeLayer IDE (Tauri/React) → HLD Daemon (Go, REST/WS, SQLite) → HLYR CLI (TypeScript)
```

| Component | Location | Purpose |
|-----------|----------|---------|
| **hld/** | Go daemon | Session management, REST API, SQLite |
| **hlyr/** | TS CLI | Launch sessions, MCP server, thoughts management |
| **humanlayer-wui/** | Tauri app | Desktop IDE (not yet public) |
| **claudecode-go/** | Go SDK | Claude Code client library |

## CLI Commands

```bash
hlyr launch "implement feature X"    # Launch Claude session
hlyr mcp serve                        # MCP server
hlyr thoughts init / sync / status    # Developer notes
hlyr claude init                      # CC setup
```

## PAI Integration

PAI skills/agents/hooks are accessible from CodeLayer sessions via symlinks:

```bash
ln -sf ~/qara/.claude/skills ~/.claude/skills
ln -sf ~/qara/.claude/agents ~/.claude/agents
ln -sf ~/qara/.claude/hooks ~/.claude/hooks
```

**Thoughts system** syncs developer notes across all AI interfaces:
```bash
hlyr thoughts init --directory ~/qara
hlyr thoughts sync -m "Session notes"
```

## System Install

```bash
which hlyr humanlayer codelayer codelayer-nightly
# /usr/local/bin/hlyr
# /usr/local/bin/humanlayer
# /usr/local/bin/codelayer
# /usr/local/bin/codelayer-nightly
```

## Links

- Repo: https://github.com/humanlayer/humanlayer
- Docs: https://humanlayer.dev
- License: Apache-2.0
