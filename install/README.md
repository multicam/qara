# PAI Installation Scripts

This directory contains scripts for installing, updating, and validating your PAI (Personal AI Infrastructure) installation.

## Scripts Overview

### 🚀 setup.sh - Initial Installation

The main installation script that sets up PAI from scratch.

**Usage:**

```bash
./setup.sh
```

**What it does:**

- Checks for prerequisites (Git, Homebrew, Bun, Cargo, etc.)
- Installs missing software with your permission
- Configures environment variables
- Sets up Claude Code integration
- Creates necessary symlinks
- Validates the installation

**When to use:**

- First-time PAI installation
- Reinstalling PAI on a new machine
- Adding missing tools to your system

---

### ✅ validate.sh - Installation Validation

Validates your PAI installation and checks that all tools are properly configured.

**Usage:**

```bash
./validate.sh              # Full validation with detailed output
./validate.sh --quiet      # Only show warnings and errors
./validate.sh --json       # Output results as JSON
```

**What it checks:**

- **Core Infrastructure**: Git, Homebrew, Bun, Cargo
- **Modern CLI Tools**: fd, ripgrep, ast-grep, bat
- **Development Tools**: GitHub CLI, markdownlint, curl
- **AI Tools**: Fabric, Gemini CLI, Grok CLI, Ollama
- **Language Runtimes**: TypeScript, ts-node, Python, uv, Playwright
- **PAI Configuration**: Directory structure, symlinks, environment variables

**Exit codes:**

- `0` - All checks passed or only optional warnings
- `1` - Critical errors found

**When to use:**

- After installation to verify everything works
- Troubleshooting issues
- Before reporting bugs
- Automated CI/CD checks

---

### 🔄 update.sh - Update & Validation

Updates your PAI installation from the git repository and validates the result.

**Usage:**

```bash
./update.sh                 # Update and validate
./update.sh --skip-validate # Update without validation
./update.sh --validate-only # Only run validation
```

**What it does:**

1. Checks for uncommitted changes (offers to stash)
2. Fetches latest changes from remote
3. Pulls updates from the current branch
4. Updates git submodules (if any)
5. Updates dependencies (Bun packages, Python packages)
6. Verifies symlinks are correct
7. Runs validation (unless skipped)

**When to use:**

- Regularly to get latest PAI features and fixes
- After seeing update notifications
- Before starting a new project

---

## Quick Reference

### First Time Setup

```bash
cd /path/to/pai/install
./setup.sh
```

### Regular Updates

```bash
cd /path/to/pai/install
./update.sh
```

### Check Installation Health

```bash
cd /path/to/pai/install
./validate.sh
```

### Troubleshooting

```bash
# Run validation to identify issues
./validate.sh

# If issues found, re-run setup
./setup.sh

# Or update to latest version
./update.sh
```

---

## Tool Categories

### Critical Tools (Required)

- **Git** - Version control
- **curl** - HTTP client for downloads and API calls

### Recommended Tools

- **Homebrew** - Package manager (recommended for macOS, optional on Linux)
- **Bun** - Fast JavaScript runtime
- **Cargo** - Rust toolchain (needed for CLI tools)
- **Python** - Runtime for utilities

### Optional CLI Tools

- **fd** - Fast file finder (13-23x faster than find)
- **ripgrep** - Fast text search (10-50x faster than grep)
- **ast-grep** - Semantic code search
- **bat** - Enhanced file viewer with syntax highlighting

### Optional Development Tools

- **GitHub CLI (gh)** - GitHub operations from terminal
- **markdownlint-cli2** - Markdown linting
- **TypeScript/ts-node** - TypeScript support
- **uv** - Fast Python package manager

### Optional AI Tools

- **Fabric** - AI pattern system
- **Gemini CLI** - Google's terminal AI agent
- **Grok CLI** - xAI's terminal agent
- **Ollama** - Local LLM server
- **Playwright** - Browser automation

---

## Environment Variables

After installation, these variables are added to your shell config:

```bash
export PAI_DIR="/path/to/pai"           # PAI installation directory
export PAI_HOME="$HOME"                 # Your home directory
export DA="Qara"                        # Your AI assistant's name
export DA_COLOR="purple"                # Display color
```

To reload after changes:

```bash
source ~/.zshrc   # or ~/.bashrc
```

---

## Symlinks Created

The setup script creates these symlinks for Claude Code integration:

```bash
~/.claude/settings.json -> $PAI_DIR/settings.json
~/.claude/hooks         -> $PAI_DIR/hooks
~/.claude/skills        -> $PAI_DIR/skills
~/.claude/commands      -> $PAI_DIR/commands
```

---

## Common Issues

### "PAI_DIR not set"

**Solution:** Restart your terminal or run:

```bash
source ~/.zshrc   # or ~/.bashrc
```

### "Hooks not working"

**Solution:** Verify hooks symlink:

```bash
ls -la ~/.claude/hooks
# Should point to: /path/to/pai/hooks
```

If incorrect, re-run setup:

```bash
./setup.sh
```

### "Command not found: fd/rg/etc"

**Solution:** Install Cargo and CLI tools:

```bash
# Install Rust/Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install CLI tools
cargo install fd-find ripgrep ast-grep bat
```

### "Git pull fails"

**Solution:** Check for local changes:

```bash
cd $PAI_DIR
git status

# Stash changes if needed
git stash

# Then update
./update.sh
```

---

## Advanced Usage

### JSON Output for CI/CD

```bash
./validate.sh --json > validation-results.json
```

### Quiet Mode for Scripts

```bash
if ./validate.sh --quiet; then
    echo "PAI is healthy"
else
    echo "PAI has issues"
fi
```

### Update Without Validation

```bash
# Faster updates when you trust the changes
./update.sh --skip-validate
```

### Validation Only

```bash
# Check health without updating
./update.sh --validate-only
```

---

## Documentation

For more information, see:

- **PAI Overview**: `$PAI_DIR/PAI.md`
- **Tools Inventory**: `$PAI_DIR/.claude/TOOLS.md`
- **CLI Tools Guide**: `$PAI_DIR/.claude/skills/CORE/TOOLS.md`
- **Getting Started**: `$PAI_DIR/documentation/how-to-start.md`

---

## Support

If you encounter issues:

1. Run `./validate.sh` to identify problems
2. Check the documentation in `$PAI_DIR/documentation/`
3. Review recent changes: `cd $PAI_DIR && git log --oneline -10`
4. Re-run setup: `./setup.sh`

---

**Last Updated**: 2025-11-19
**Scripts Version**: 1.0.0
