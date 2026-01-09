# PAI Installation Guide

## Table of Contents

- [Prerequisites](#prerequisites)
  - [Required](#required)
  - [Recommended](#recommended)
- [Setup](#setup)
  - [1. Environment Variables](#1-environment-variables)
  - [2. Claude Code Integration](#2-claude-code-integration)
  - [3. Install Dependencies](#3-install-dependencies)
- [Update](#update)
  - [Quick Update](#quick-update)
  - [Full Update with Validation](#full-update-with-validation)
- [Validation](#validation)
  - [Quick Check](#quick-check)
  - [Verify PAI Structure](#verify-pai-structure)
  - [Verify Symlinks](#verify-symlinks)
  - [Verify Environment](#verify-environment)
- [Troubleshooting](#troubleshooting)
  - [PAI_DIR not set](#pai_dir-not-set)
  - [Hooks not working](#hooks-not-working)
  - [Reset all symlinks](#reset-all-symlinks)
  - [Missing CLI tools](#missing-cli-tools)
- [Tools Reference](#tools-reference)
  - [Core Infrastructure](#core-infrastructure)
  - [Modern CLI Tools](#modern-cli-tools)
  - [Development Tools](#development-tools)
  - [AI Tools](#ai-tools)
  - [Language Runtimes](#language-runtimes)

---

## Prerequisites

### Required

```bash
# Check Git
git --version

# Check curl
curl --version
```

### Recommended

```bash
# Install Bun (JS runtime)
curl -fsSL https://bun.sh/install | bash

# Install Rust/Cargo (for CLI tools)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install modern CLI tools
cargo install fd-find ripgrep ast-grep bat
```

---

## Setup

### 1. Environment Variables

Add to `~/.zshrc` or `~/.bashrc`:

```bash
cat >> ~/.zshrc << 'EOF'

# ========== PAI Configuration ==========
export PAI_DIR="$HOME/qara"
export PAI_HOME="$HOME"
export DA="Qara"
export DA_COLOR="purple"
# ========================================
EOF

source ~/.zshrc
```

### 2. Claude Code Integration

```bash
# Create ~/.claude directory
mkdir -p ~/.claude

# Link settings
ln -sf $PAI_DIR/settings.json ~/.claude/settings.json

# Link hooks, skills, commands
ln -sf $PAI_DIR/hooks ~/.claude/hooks
ln -sf $PAI_DIR/skills ~/.claude/skills
ln -sf $PAI_DIR/commands ~/.claude/commands
ln -sf $PAI_DIR/agents ~/.claude/agents
ln -sf $PAI_DIR/rules ~/.claude/rules
ln -sf $PAI_DIR/.env ~/.claude/.env

# Create scratchpad
mkdir -p ~/.claude/scratchpad
```

### 3. Install Dependencies

```bash
cd $PAI_DIR && bun install
```

---

## Update

### Quick Update

```bash
cd $PAI_DIR && git pull && bun install
```

### Full Update with Validation

```bash
cd $PAI_DIR
git stash  # if needed
git pull
bun install

# Verify symlinks
ls -la ~/.claude/hooks
ls -la ~/.claude/skills
ls -la ~/.claude/commands
```

---

## Validation

### Quick Check

```bash
# Core tools
git --version && echo "Git OK"
bun --version && echo "Bun OK"
curl --version | head -1 && echo "curl OK"

# CLI tools (optional)
fd --version 2>/dev/null && echo "fd OK"
rg --version 2>/dev/null | head -1 && echo "ripgrep OK"
bat --version 2>/dev/null | head -1 && echo "bat OK"
```

### Verify PAI Structure

```bash
# Check directories exist
[ -d "$PAI_DIR/skills" ] && echo "Skills: OK" || echo "Skills: MISSING"
[ -d "$PAI_DIR/commands" ] && echo "Commands: OK" || echo "Commands: MISSING"
[ -d "$PAI_DIR/hooks" ] && echo "Hooks: OK" || echo "Hooks: MISSING"

# Count skills and commands
echo "Skills: $(ls -d $PAI_DIR/skills/*/ 2>/dev/null | wc -l | tr -d ' ')"
echo "Commands: $(ls $PAI_DIR/commands/*.md 2>/dev/null | wc -l | tr -d ' ')"
```

### Verify Symlinks

```bash
# Check all symlinks point correctly
for item in hooks skills commands settings.json; do
  if [ -L "$HOME/.claude/$item" ]; then
    target=$(readlink "$HOME/.claude/$item")
    echo "$item -> $target"
  else
    echo "$item: NOT LINKED"
  fi
done
```

### Verify Environment

```bash
# Check environment variables
echo "PAI_DIR: ${PAI_DIR:-NOT SET}"
echo "DA: ${DA:-NOT SET}"
```

---

## Troubleshooting

### PAI_DIR not set

```bash
source ~/.zshrc
# or
export PAI_DIR="$HOME/qara"
```

### Hooks not working

```bash
# Fix symlink
rm -f ~/.claude/hooks
ln -sf $PAI_DIR/hooks ~/.claude/hooks
ls -la ~/.claude/hooks
```

### Reset all symlinks

```bash
rm -f ~/.claude/{hooks,skills,commands,agents,rules,settings.json,.env}
ln -sf $PAI_DIR/hooks ~/.claude/hooks
ln -sf $PAI_DIR/skills ~/.claude/skills
ln -sf $PAI_DIR/commands ~/.claude/commands
ln -sf $PAI_DIR/agents ~/.claude/agents
ln -sf $PAI_DIR/rules ~/.claude/rules
ln -sf $PAI_DIR/settings.json ~/.claude/settings.json
ln -sf $PAI_DIR/.env ~/.claude/.env
```

### Missing CLI tools

```bash
# Install all recommended tools
cargo install fd-find ripgrep ast-grep bat
```

---

## Tools Reference

### Core Infrastructure

| Tool | Purpose | Required | Install |
|------|---------|----------|---------|
| Git | Version control | Yes | `xcode-select --install` or `brew install git` |
| curl | HTTP client | Yes | Pre-installed on most systems |
| Homebrew | Package manager | macOS | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Bun | Fast JS runtime | Recommended | `curl -fsSL https://bun.sh/install \| bash` |
| Cargo | Rust toolchain | Recommended | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

### Modern CLI Tools

| Tool | Purpose | Install |
|------|---------|---------|
| fd | Fast file finder (13-23x faster than find) | `cargo install fd-find` |
| ripgrep | Fast text search (10-50x faster than grep) | `cargo install ripgrep` |
| ast-grep | Semantic code search & refactoring | `cargo install ast-grep` |
| bat | Syntax-highlighted file viewer | `cargo install bat` |

### Development Tools

| Tool | Purpose | Install |
|------|---------|---------|
| gh | GitHub CLI | `brew install gh` |
| markdownlint-cli2 | Markdown linting | `bun install -g markdownlint-cli2` |
| TypeScript | TS compiler | `bun install -g typescript` |
| ts-node | TS execution | `bun install -g ts-node` |

### AI Tools

| Tool | Purpose | Install |
|------|---------|---------|
| Fabric | AI pattern system (242+ prompts) | [github.com/danielmiessler/fabric](https://github.com/danielmiessler/fabric) |
| Gemini CLI | Google's terminal AI agent | `npm install -g @anthropic-ai/gemini-cli` |
| Grok CLI | xAI's terminal agent | [github.com/xai-org/grok-cli](https://github.com/xai-org/grok-cli) |
| Ollama | Local LLM server | [ollama.com](https://ollama.com) |

### Language Runtimes

| Tool | Purpose | Install |
|------|---------|---------|
| Python 3 | Runtime for utilities | `brew install python` or pre-installed |
| uv | Fast Python package manager | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Playwright | Browser automation & UI testing | `bun install -g playwright` |
