# PAI Tools Inventory

**Comprehensive directory of all tools used in the Personal AI Infrastructure (PAI) system**

This document provides a complete inventory of tools across the PAI ecosystem, organized by category with quick reference information and links to detailed documentation.

**Last Updated**: 2025-11-18
**Research Document**: `/thoughts/global/shared/research/2025-11-18-pai-tools-comprehensive-inventory.md`

---

## 📋 Table of Contents

- [Core Infrastructure](#core-infrastructure)
- [Modern CLI Tools](#modern-cli-tools)
- [Development & Integration](#development--integration)
- [Language Runtimes & Package Managers](#language-runtimes--package-managers)
- [Quick Reference Matrix](#quick-reference-matrix)
- [Installation Quick Start](#installation-quick-start)

---

## Core Infrastructure

### Git - Version Control System

**Purpose**: Distributed version control for tracking code changes and collaboration

**Key Benefits**: Industry standard, offline work, cryptographic integrity, flexible branching

**Installation**: `brew install git` (usually pre-installed)

**PAI Usage**: Version control for PAI directories, skills, commands, configuration

**Security Note**: Always verify remote with `git remote -v` before commits. ~/.claude/ may contain sensitive data.

---

### Homebrew - Package Manager

**Purpose**: Package management for macOS and Linux

**Key Benefits**: Cross-platform consistency, user-level installation, automated dependencies

**Installation**:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**PAI Usage**: Primary package manager for setup script, installs Bun and other tools

---

### Bun - JavaScript Runtime

**Purpose**: All-in-one JavaScript runtime, package manager, bundler, test runner

**Key Benefits**: 15x faster than npm, native TypeScript/JSX support, sub-40ms startup, 70K+ RPS

**Installation**:
```bash
curl -fsSL https://bun.sh/install | bash
# or: brew install oven-sh/bun/bun
```

**PAI Preference**: Replaces npm + webpack + Babel + Jest, aligns with TypeScript-first approach

---

### Cargo/Rust - Rust Toolchain

**Purpose**: Rust programming language toolchain and package manager

**Key Benefits**: Memory-safe, blazing-fast performance, zero-cost abstractions, static binaries

**Installation**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**PAI Usage**: Installs fd, ripgrep, ast-grep, bat via `cargo install`

**Why**: Cross-platform consistency, latest versions, user-level install, no dependencies

---

## Modern CLI Tools

### fd (fd-find) - Fast File Finder

**Purpose**: Modern alternative to Unix `find`, 13-23x faster

**Key Features**: Parallel execution, .gitignore aware, colored output, smart case, regex support

**Installation**: `cargo install fd-find` or `brew install fd`

**Why PAI Uses**: Speed for AI agents, reduced noise, simplified commands

**Detailed Docs**: [`~/.claude/documentation/CLI-TOOLS.md`](documentation/CLI-TOOLS.md)

**Common Usage**:
```bash
fd pattern                    # Simple search
fd -e ts                      # Find TypeScript files
fd -H secret                  # Include hidden files
```

---

### ripgrep (rg) - Lightning Text Search

**Purpose**: Fast text search tool, 10-50x faster than `grep`

**Key Features**: Parallelized, .gitignore aware, Unicode support, skips binaries, file type filtering

**Installation**: `cargo install ripgrep` or `brew install ripgrep`

**Why PAI Uses**: Critical for AI codebase analysis, reliable filtering, Claude Code integration

**Detailed Docs**: [`~/.claude/documentation/CLI-TOOLS.md`](documentation/CLI-TOOLS.md)

**Common Usage**:
```bash
rg "pattern"                  # Search current directory
rg -i error                   # Case insensitive
rg -t js console.log          # Search JavaScript files
```

---

### ast-grep - Semantic Code Search

**Purpose**: AST-aware code search and refactoring

**Key Features**: Structural search, multi-language, format-independent, safe refactoring, custom linting

**Installation**: `cargo install ast-grep`

**Why PAI Uses**: Semantic precision, eliminates false positives, structural transformations

**Detailed Docs**: [`~/.claude/documentation/CLI-TOOLS.md`](documentation/CLI-TOOLS.md)

**Common Usage**:
```bash
ast-grep --pattern 'console.log($$$)'              # Find all console.log
ast-grep -p 'old($A)' -r 'new($A)'                # Refactor code
```

---

### bat - Enhanced File Viewer

**Purpose**: Modern `cat` alternative with syntax highlighting

**Key Features**: Syntax highlighting, Git integration, line numbers, automatic paging, themes

**Installation**: `cargo install bat` or `brew install bat`

**Why PAI Uses**: Improved code readability, integrated Git context, better developer UX

**Detailed Docs**: [`~/.claude/documentation/CLI-TOOLS.md`](documentation/CLI-TOOLS.md)

**Common Usage**:
```bash
bat file.txt                  # View with highlighting
bat --theme=Github script.py  # Use specific theme
bat --line-range 10:50 file   # View specific lines
```

---

## Development & Integration

### GitHub CLI (gh)

**Purpose**: Official command-line tool for GitHub platform operations

**Key Features**: PR management, issue tracking, repo operations, Actions integration, release management

**Installation**: `brew install gh`

**Why PAI Uses**: Terminal-native GitHub ops, AI agent automation, context-aware operations

**Common Usage**:
```bash
gh auth login
gh pr create --title "Feature" --body "Description"
gh pr checkout 123
gh workflow run "CI Pipeline"
```

---

### markdownlint-cli2

**Purpose**: Markdown linting and validation

**Key Features**: Comprehensive rules, auto-fix, flexible config, custom rules, in-file control

**Installation**: `bun add -g markdownlint-cli2`

**PAI Config**: `/home/jean-marc/qara/.markdownlint.json` (120 char lines, language-specified blocks)

**Common Usage**:
```bash
markdownlint-cli2 path/to/file.md      # Lint file
markdownlint-cli2 --fix file.md        # Auto-fix issues
markdownlint-cli2 .claude/documentation/*.md  # Lint all docs
```

---

### curl - HTTP Client

**Purpose**: Universal command-line tool for data transfer with URLs

**Key Features**: 20+ protocols, all HTTP methods, multiple auth, custom headers, debugging

**Installation**: Pre-installed on most systems

**PAI Usage**: Installation scripts, API calls (Perplexity), notifications, data pipelines, health checks

**Common Usage**:
```bash
curl -X POST https://api.example.com -H "Content-Type: application/json" -d '{"key":"value"}'
curl -u user:pass https://api.example.com
curl -s https://example.com | fabric -p summarize
```

---

### Fabric - AI Pattern System

**Purpose**: 242+ pre-engineered AI prompt templates for task automation

**Key Features**: Model-agnostic, threat modeling, summarization, analysis, pattern composability

**Installation**: See Fabric repository

**PAI Integration**: Intelligent pattern selection via fabric skill, workflow automation

**Common Use Cases**:
- Threat modeling and security analysis
- Content summarization and extraction
- Code analysis and improvement
- Technical writing assistance

---

### Gemini CLI - Terminal AI Agent

**Purpose**: Google's open-source AI agent bringing Gemini 2.5 Pro directly into the terminal

**Key Features**: 1M token context window, Google Search grounding, MCP support, multimodal capabilities, conversation checkpointing

**Installation**:

```bash
npm install -g @google/gemini-cli
# or: npx https://github.com/google-gemini/gemini-cli
# or: brew install gemini-cli
```

**Version**: 0.15.4 (installed on system)

**Why PAI Uses**: Free access to Gemini 2.5 Pro (60 req/min, 1K req/day), terminal-native AI coding, complements Claude Code

**Authentication Options**:

- Google OAuth (free tier)
- Gemini API Key (100 req/day free)
- Vertex AI (enterprise)

**Common Usage**:

```bash
gemini                                    # Start interactive mode
gemini -p "Explain this codebase"         # Non-interactive prompt
gemini -m gemini-2.5-flash                # Use specific model
gemini --output-format json               # JSON output
gemini --resume latest                    # Resume previous session
gemini mcp                                # Manage MCP servers
```

**PAI Integration**: Alternative AI perspective, research tasks, multimodal analysis (PDFs/images),
complementary to Claude

**Documentation**: [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | [geminicli.com/docs](https://geminicli.com/docs)

---

### Grok CLI - xAI Terminal Agent

**Purpose**: Open-source conversational AI tool bringing xAI's Grok models into the terminal

**Key Features**: Natural language interface, smart file operations, bash integration, MCP support, fast code editing
(4,500+ tokens/sec), OpenAI-compatible API

**Installation**:

```bash
bun add -g @vibe-kit/grok-cli
```

**Version**: 1.0.1 (installed on system)

**Why PAI Uses**: Access to Grok models (grok-4-latest, grok-code-fast-1), fast editing capabilities, MCP integration,
complements Claude/Gemini

**Authentication**: Requires xAI API key from X.AI

**Available Models**:

- grok-4-latest (latest flagship)
- grok-code-fast-1 (optimized for code)
- grok-3-latest, grok-3-fast, grok-3-mini-fast

**Common Usage**:

```bash
grok                                      # Start interactive mode
grok --prompt "show me the package.json"  # Headless/scripting mode
grok --model grok-4-latest                # Use specific model
grok --directory /path/to/project         # Set working directory
grok --max-tool-rounds 50                 # Control tool usage
grok mcp add NAME                         # Add MCP server
grok mcp list                             # List MCP servers
grok git                                  # Git operations with AI
```

**PAI Integration**: Alternative AI perspective, fast code editing, scripting automation,
MCP-based workflows

**Documentation**: [github.com/superagent-ai/grok-cli](https://github.com/superagent-ai/grok-cli)

---

### Ollama - Local LLM Server

**Purpose**: Lightweight framework for running large language models locally with client-server architecture

**Architecture Type**: **Client-Server Model** (unlike direct CLI tools)

- **Server**: `ollama serve` runs backend on localhost:11434 (processes model inference)
- **Client**: CLI communicates with server via REST API
- **Key Difference**: Server runs continuously, handles multiple requests, manages model lifecycle

**Key Features**: Local model execution (no cloud), model management (pull/push/list/rm), multimodal support
(vision models), REST API, embedding generation, custom Modelfiles, GGUF/Safetensors import

**Installation**:

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or download from ollama.com
```

**Version**: 0.1.18 (installed on system)

**Why PAI Uses**: Privacy-first local inference, no API costs, offline capability, supports multiple model families
(Llama, Gemma, DeepSeek), MCP integration for local AI workflows

**System Requirements**: 8GB+ RAM recommended, GPU acceleration supported (NVIDIA CUDA, AMD ROCm, Apple Metal)

**Client-Server Workflow**:

```bash
# 1. Start server (runs in background)
ollama serve                              # Starts server on localhost:11434

# 2. Client commands (in separate terminal)
ollama pull llama3.2                      # Download model
ollama list                               # Show installed models
ollama run llama3.2 "Hello world"         # Run model with prompt
ollama run llama3.2                       # Interactive chat mode

# 3. Model management
ollama show llama3.2                      # Show model info
ollama cp llama3.2 my-llama               # Copy model
ollama rm my-llama                        # Remove model

# 4. Advanced usage
ollama run llama3.2 --format json         # JSON output
ollama create mymodel -f Modelfile        # Create custom model
echo "prompt" | ollama run llama3.2       # Pipe input
```

**REST API Access**:

```bash
# Direct API calls (when server is running)
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Why is the sky blue?"
}'

curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [{"role": "user", "content": "Hello"}]
}'
```

**Popular Model Families**:

- Llama (Meta): llama3.2, llama3.1, llama2
- Gemma (Google): gemma2, gemma
- DeepSeek: deepseek-r1, deepseek-coder
- Phi (Microsoft): phi3, phi
- Vision: llava, bakllava

**PAI Integration**: Local AI inference without cloud dependency, privacy-sensitive workloads, offline development,
MCP server integration for local LLM tool use, cost-free experimentation

**Documentation**: [github.com/ollama/ollama](https://github.com/ollama/ollama) |
[ollama.com/library](https://ollama.com/library)

---

## Language Runtimes & Package Managers

### TypeScript/ts-node

**Purpose**: Typed superset of JavaScript with JIT execution

**Key Features**: Static types, type inference, modern features, compile-time error catching

**Installation**: `bun add -d typescript ts-node @types/node`

**Why PAI Prefers**: Error prevention, maintainability, safer refactoring, stack consistency

**PAI Usage**: Git hooks, build scripts, PAI hooks system, automation

---

### Python

**Purpose**: High-level, interpreted, general-purpose language

**Key Strengths**: Easy to learn, large ecosystem, AI/ML dominance, multi-paradigm

**Version**: Python 3.11.13 (PAI system)

**Installation**: Pre-installed on most systems

**PAI Usage**: Hooks and utilities (`/home/jean-marc/qara/.claude/hooks/utils/`), LLM integration, TTS

---

### uv - Fast Python Package Manager

**Purpose**: Rust-based ultra-fast pip replacement

**Key Benefits**: 10-100x faster than pip, unified tool, robust lock files, script execution format

**Installation**:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**PAI Usage Pattern**:
```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = ["anthropic", "python-dotenv"]
# ///
```

---

### Playwright

**Purpose**: Cross-browser automation and testing framework

**Key Features**: Chromium/WebKit/Firefox support, auto-wait, network mocking, screenshots, mobile emulation

**Installation**: `bun add -D @playwright/test`

**PAI Usage**: Designer agent visual testing, UI/UX validation, Playwright MCP tools integration

---

## Quick Reference Matrix

| Tool | Category | Speed vs Traditional | PAI Priority | Installation |
|------|----------|---------------------|--------------|--------------|
| **Git** | Core | N/A | Critical | Pre-installed / brew |
| **Homebrew** | Core | N/A | Critical | curl script |
| **Bun** | Core | 15x (vs npm) | High | curl / brew |
| **Cargo/Rust** | Core | N/A | High | rustup script |
| **fd** | CLI | 13-23x (vs find) | High | cargo / brew |
| **ripgrep** | CLI | 10-50x (vs grep) | High | cargo / brew |
| **ast-grep** | CLI | AST-aware | Medium | cargo |
| **bat** | CLI | Visual enhancement | Medium | cargo / brew |
| **gh** | Dev | N/A | Medium | brew |
| **markdownlint** | Dev | N/A | Medium | bun |
| **curl** | Dev | N/A | Medium | Pre-installed |
| **Fabric** | Dev | N/A | Medium | See docs |
| **Gemini CLI** | Dev | N/A | Medium | npm / brew |
| **Grok CLI** | Dev | N/A | Medium | bun |
| **Ollama** | Dev | Local inference | Medium | curl script |
| **TypeScript** | Runtime | N/A | High | bun |
| **Python** | Runtime | N/A | Medium | Pre-installed |
| **uv** | Runtime | 10-100x (vs pip) | Medium | curl script |
| **Playwright** | Dev | N/A | Low | bun |

---

## Installation Quick Start

### Complete PAI Setup

```bash
# 1. Run PAI setup script (installs everything)
cd ~/.claude && ./setup.sh

# 2. Or manual installation in order:

# Install Homebrew (if on macOS/Linux)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Bun
brew install oven-sh/bun/bun

# Install Rust/Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install modern CLI tools
cargo install fd-find ripgrep ast-grep bat

# Install GitHub CLI
brew install gh

# Install markdownlint
bun add -g markdownlint-cli2

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Verification Commands

```bash
# Check all tools installed
git --version
brew --version
bun --version
cargo --version
fd --version
rg --version
ast-grep --version
bat --version
gh --version
markdownlint-cli2 --version
curl --version
gemini --version
grok --version
ollama --version
python --version
uv --version
```

---

## Tool Selection Guidelines

### When to Use Which Tool

**File Search**:
- Files by name/path → `fd`
- Text content → `ripgrep` (rg)
- Code structure → `ast-grep`
- View files → `bat`

**Package Management**:
- JavaScript/TypeScript → `bun`
- Rust tools → `cargo`
- Python packages → `uv`
- System packages → `brew`

**Automation**:
- TypeScript → Build scripts, git hooks, PAI hooks
- Python → Utilities, LLM integration, TTS
- Shell → Simple automation, curl scripts

**GitHub Operations**:
- CLI → `gh` (PRs, issues, workflows)
- Version control → `git` (commits, branches)

---

## Additional Resources

### Detailed Documentation

- **CLI Tools Guide**: `~/.claude/documentation/CLI-TOOLS.md` (fd, ripgrep, ast-grep, bat)
- **Fabric Patterns**: `~/.claude/documentation/fabric-patterns-reference.md`
- **Hook System**: `~/.claude/documentation/hook-system.md`
- **Agent System**: `~/.claude/documentation/agent-system.md`

### PAI Configuration

- **Setup Script**: `.claude/setup.sh` - Automated installation
- **Global Preferences**: `.claude/PAI.md` - TypeScript > Python, Bun > npm
- **Stack Preferences**: `.claude/skills/CORE/SKILL.md` - CLI tool preferences

### Research

- **Comprehensive Inventory**: `/thoughts/global/shared/research/2025-11-18-pai-tools-comprehensive-inventory.md`
- **16 parallel gemini-researcher agents** conducted deep research on each tool
- **Multi-angle analysis** covering purpose, features, installation, use cases, PAI integration

---

## Updates and Maintenance

**Adding New Tools**:
1. Add entry to appropriate category section above
2. Update Quick Reference Matrix
3. Update Installation Quick Start if system-critical
4. Document PAI-specific usage patterns
5. Update research document in `/thoughts/global/shared/research/`

**Tool Version Updates**:
- Modern CLI tools: `cargo install-update -a` (requires cargo-update)
- JavaScript/TypeScript: `bun update`
- Python packages: `uv pip list --outdated`
- System tools: `brew upgrade`

---

**Maintained By**: PAI System
**Last Research**: 2025-11-18
**Tools Documented**: 19 core tools across 4 categories
