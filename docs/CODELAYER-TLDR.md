# HumanLayer/CodeLayer - TL;DR

## What Is This?

**CodeLayer** is an open-source IDE for orchestrating AI coding agents, built on Claude Code. Think "Superhuman for Claude Code" - keyboard-first workflows for running multiple Claude Code sessions in parallel.

**HumanLayer** was the original project (human-in-the-loop SDK for AI agents), now evolved into CodeLayer.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CodeLayer IDE                      │
│              (humanlayer-wui/)                       │
│           Tauri-based desktop app                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│              HLD Daemon (hld/)                       │
│         Go service managing sessions                 │
│    REST API, WebSockets, SQLite database            │
└───────────────────┬─────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│               HLYR CLI (hlyr/)                       │
│  Commands: hlyr, humanlayer, codelayer              │
│  TypeScript/Node.js - launch sessions, MCP, etc     │
└─────────────────────────────────────────────────────┘
```

## Key Components

### 1. **hld/** - Daemon (Go)
- Backend service managing Claude Code sessions
- REST API + WebSocket support
- SQLite database for persistence
- Builds to: `hld/hld`, `hld/hld-dev`

### 2. **hlyr/** - CLI Tool (TypeScript/Node.js)
- Command aliases: `hlyr`, `humanlayer`, `codelayer`, `codelayer-nightly`
- Launch Claude Code sessions
- MCP (Model Context Protocol) server
- Thoughts management (developer notes)
- Claude Code configuration setup
- Builds to: `hlyr/dist/index.js`

### 3. **humanlayer-wui/** - Desktop IDE (Tauri/React)
- Full GUI application (CodeLayer)
- Manages multiple parallel Claude sessions
- Keyboard-first workflows
- Advanced context engineering
- Not yet publicly released (join waitlist)

### 4. **claudecode-go/** - Claude Code SDK (Go)
- Go client library for Claude Code

## Quick Start

```bash
# Setup everything
make setup

# Run CodeLayer in dev mode
make codelayer-dev

# Run just the WUI
make wui-dev

# Run just the daemon
make daemon-dev

# Build specific components
make -C hlyr build    # Build CLI
make -C hld check     # Build and test daemon
```

## CLI Commands

```bash
# Launch a Claude session
hlyr launch "implement feature X"

# MCP server
hlyr mcp serve
hlyr mcp claude_approvals

# Thoughts management
hlyr thoughts init
hlyr thoughts sync
hlyr thoughts status

# Claude Code setup
hlyr claude init

# Human contact (legacy SDK feature)
hlyr contact_human -m "message"
```

## Development Workflow

```bash
# 1. Install dependencies and build
make setup

# 2. Run checks and tests
make check test

# 3. Install git hooks
make githooks

# 4. Run in dev mode
make codelayer-dev
```

## Make Targets

| Command | Description |
|---------|-------------|
| `make setup` | Install all dependencies and build |
| `make check` | Run all quality checks (format, lint, test, build) |
| `make test` | Run all tests |
| `make codelayer-dev` | Run CodeLayer in dev mode |
| `make wui-dev` | Run WUI only |
| `make daemon-dev` | Run daemon only |
| `make clean-wui-release` | Clean WUI release artifacts |

## Project Structure

```
humanlayer/
├── hld/                  # Go daemon service
├── hlyr/                 # TypeScript CLI tool
├── humanlayer-wui/       # Tauri desktop app
├── claudecode-go/        # Go SDK for Claude Code
├── packages/            # Shared packages
│   └── hld-sdk/         # TypeScript SDK for HLD daemon
├── hack/                # Build scripts
├── docs/                # Documentation
└── .claude/             # Claude Code commands & agents
```

## Tech Stack

- **Backend**: Go, SQLite, REST/WebSocket APIs
- **CLI**: TypeScript, Node.js, Commander.js
- **Desktop**: Tauri (Rust), React, Vite
- **AI Integration**: Claude Code (Anthropic)
- **Protocols**: MCP (Model Context Protocol)

## Key Features

1. **MULTICLLAUDE** - Run Claude Code sessions in parallel
2. **Context Engineering** - Advanced context management for AI agents
3. **Keyboard-First** - Superhuman-style keyboard workflows
4. **Thoughts System** - Developer notes accessible to AI
5. **MCP Integration** - Model Context Protocol for AI tools
6. **Worktree Support** - Multiple git worktrees per session

## TODO Priority System

- `TODO(0)` - Critical, never merge
- `TODO(1)` - High priority (architectural flaws, major bugs)
- `TODO(2)` - Medium (minor bugs, missing features)
- `TODO(3)` - Low (polish, tests, docs)
- `TODO(4)` - Questions/investigations
- `PERF` - Performance optimization

## Status

- **CLI (hlyr)**: ✅ Stable, v0.17.2
- **Daemon (hld)**: ✅ Development ready
- **WUI (CodeLayer)**: 🚧 In development, waitlist only
- **Legacy SDK**: ⚠️ Deprecated (removed in #646)

## Links

- Website: https://humanlayer.dev
- Discord: https://humanlayer.dev/discord
- YouTube: https://humanlayer.dev/youtube
- Podcast: https://humanlayer.dev/podcast
- License: Apache-2.0

## Philosophy

> "Even with state-of-the-art agentic reasoning, LLMs are not sufficiently reliable to be given access to high-stakes functions without human oversight"

The project evolved from providing human-in-the-loop guarantees for AI agents to building a full IDE for AI-first development with advanced context engineering.
