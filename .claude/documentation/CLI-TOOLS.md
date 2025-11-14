# PAI CLI Tools Suite

**Modern, fast, and intelligent command-line tools for developers**

This guide covers the CLI tools that PAI recommends and helps you install. These tools are faster, smarter, and more user-friendly than their traditional Unix counterparts.

---

## 📋 Table of Contents

- [Overview](#overview)
- [The Three Pillars](#the-three-pillars)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Detailed Usage](#detailed-usage)
- [Comparison Tables](#comparison-tables)
- [Integration with PAI](#integration-with-pai)
- [Pro Tips](#pro-tips)

---

## Overview

PAI uses a modern CLI tool stack that provides:

- **Speed**: Parallel execution, optimized algorithms
- **Intelligence**: Respects .gitignore, smart defaults
- **User Experience**: Colored output, intuitive syntax
- **Consistency**: All tools share similar design philosophy

### The Modern Stack

| Traditional | Modern | Purpose | Speed Improvement |
|-------------|--------|---------|-------------------|
| `find` | `fd` | File search | 5-10x faster |
| `grep` | `ripgrep (rg)` | Text search | 10-50x faster |
| N/A | `ast-grep` | Code search | AST-aware |

---

## The Three Pillars

### 🔍 fd - Modern File Finder

**What it does:** Finds files by name, path, or attributes

**Why it's better:**
- 5-10x faster than `find` (parallel execution)
- Respects .gitignore by default (no clutter)
- Colored output (easier to scan)
- Simpler syntax: `fd pattern` vs `find -name pattern`
- Smart defaults (excludes hidden files)

**Install:**
```bash
cargo install fd-find
```

**Quick example:**
```bash
# Find all TypeScript files
fd -e ts

# Find files named "config"
fd config

# Include hidden files
fd -H config
```

---

### ⚡ ripgrep (rg) - Lightning Fast Text Search

**What it does:** Searches file contents for patterns

**Why it's better:**
- 10-50x faster than `grep` (parallelized, optimized)
- Respects .gitignore by default (searches what matters)
- Skips binary files automatically (no garbage output)
- Unicode support out of the box
- Beautiful colored output with context

**Install:**
```bash
cargo install ripgrep
```

**Quick example:**
```bash
# Search for "TODO" in current directory
rg TODO

# Case-insensitive search
rg -i error

# Search only JavaScript files
rg -t js console.log

# Show 3 lines of context
rg -C 3 function
```

---

### 🌳 ast-grep - Semantic Code Search

**What it does:** Searches and refactors code by structure, not just text

**Why it's better:**

- AST-based (understands code structure)
- Language-aware (ignores formatting differences)
- Multi-language (TypeScript, JavaScript, Python, Rust, Go, etc.)
- Can rewrite code while preserving structure
- Pattern-based (use code patterns instead of regex)

**Install:**

```bash
cargo install ast-grep
```

**Quick example:**

```bash
# Find all console.log calls
ast-grep --pattern 'console.log($$$)'

# Find function definitions
ast-grep -p 'function $NAME($$$) {}'

# Refactor: replace old() with new()
ast-grep --pattern 'old($A)' --rewrite 'new($A)'
```

---

## Installation

### Automated Installation (Recommended)

PAI's setup script installs everything for you:

```bash
cd /home/jean-marc/qara/.claude
./setup.sh
```

The script will:

1. Check if Rust/Cargo is installed
2. Offer to install Cargo if missing
3. Install fd, ripgrep, and ast-grep via Cargo
4. Verify installations

### Manual Installation

If you prefer to install manually:

```bash
# Install Rust and Cargo first
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Source cargo environment
source $HOME/.cargo/env

# Install the tools
cargo install fd-find
cargo install ripgrep
cargo install ast-grep
```

### Verify Installation

```bash
fd --version       # Should show: fd x.x.x
rg --version       # Should show: ripgrep x.x.x
ast-grep --version # Should show: ast-grep x.x.x (or sg)
```

---

## Quick Start

### File Search with fd

```bash
# Basic search
fd pattern                    # Find files matching pattern

# By extension
fd -e js                      # Find all .js files
fd -e ts -e tsx               # Find TypeScript files

# By type
fd -t f pattern               # Files only
fd -t d pattern               # Directories only

# Including hidden/ignored
fd -H pattern                 # Include hidden files
fd -I pattern                 # Don't respect .gitignore

# With depth control
fd -d 2 pattern               # Max depth of 2 levels
```

### Text Search with ripgrep

```bash
# Basic search
rg "pattern"                  # Search in current directory

# Case handling
rg -i "pattern"               # Case insensitive
rg -s "Pattern"               # Case sensitive (default)

# Output control
rg -l "pattern"               # List filenames only
rg -n "pattern"               # Show line numbers (default)
rg -C 3 "pattern"             # Show 3 lines of context

# File type filtering
rg -t js "pattern"            # Search only JavaScript files
rg -T js "pattern"            # Exclude JavaScript files
rg -t rust -t python "TODO"   # Multiple types

# Advanced
rg --hidden "pattern"         # Include hidden files
rg --no-ignore "pattern"      # Don't respect .gitignore
rg -v "pattern"               # Invert match (exclude)
```

### Code Search with ast-grep

```bash
# Find patterns
ast-grep --pattern 'console.log($$$)'              # Any console.log
ast-grep -p 'function $NAME($$$) {}'              # Function declarations
ast-grep -p 'import $A from "$B"'                 # Import statements

# Short alias (sg)
sg -p 'console.log($$$)'                          # Same as above

# Refactoring
ast-grep --pattern 'old($A)' --rewrite 'new($A)'  # Replace pattern

# Language-specific
ast-grep -l typescript -p 'const $X = $Y'         # TypeScript only
ast-grep -l python -p 'def $NAME($$$):'           # Python only

# Rule files (for complex patterns)
sg scan --rule rule.yml                           # Use rule file
```

---

## Detailed Usage

### fd - Advanced Patterns

**Search by name:**

```bash
fd config                     # Contains "config"
fd '^config'                  # Starts with "config"
fd 'config$'                  # Ends with "config"
fd '^test.*\.ts$'            # Regex: test*.ts files
```

**Excluding patterns:**

```bash
fd -E node_modules pattern   # Exclude node_modules
fd -E '*.test.*' -e ts       # Exclude test files
```

**Execute commands:**

```bash
fd -e js -x prettier --write # Format all JS files
fd -t f -x chmod 644         # Set permissions on files
```

**Integration with other tools:**

```bash
fd -e md | xargs wc -l       # Count lines in markdown files
fd -e ts | xargs rg TODO     # Find TODOs in TypeScript files
```

---

### ripgrep - Advanced Patterns

**Regex patterns:**

```bash
rg '\b(TODO|FIXME|HACK)\b'   # Find code comments
rg '^import.*from'            # Lines starting with import
rg '(error|warning):'         # Error or warning messages
```

**Multiline search:**

```bash
rg -U 'function.*\n.*return' # Multiline patterns
```

**Replace (preview only):**

```bash
rg -l 'old' | xargs sed -i 's/old/new/g'  # Unix
```

**Stats and counting:**

```bash
rg -c 'pattern'              # Count matches per file
rg --stats 'pattern'         # Show search statistics
```

**Whitelist/blacklist:**

```bash
rg -g '*.ts' 'pattern'       # Only .ts files
rg -g '!*.test.*' 'pattern'  # Exclude test files
rg -g '!node_modules/**'     # Exclude directory
```

---

### ast-grep - Advanced Patterns

**Metavariables:**

```bash
# $$ - single AST node
# $$$ - multiple AST nodes
# $A, $B, $NAME - named captures

ast-grep -p 'function $NAME($$$) { $$$ }' # Function body
ast-grep -p '$OBJ.$METHOD($$$)'           # Method calls
```

**Complex refactoring:**

```bash
# Change from callbacks to promises
ast-grep \
  --pattern 'fs.readFile($PATH, function(err, data) { $$$ })' \
  --rewrite 'fs.promises.readFile($PATH).then(data => { $$$ })'
```

**Rule files for complex searches:**

Create `rule.yml`:

```yaml
id: no-console-log
language: typescript
rule:
  pattern: console.log($$$)
message: Avoid using console.log in production
severity: warning
```

Run:

```bash
ast-grep scan --rule rule.yml
```

**Interactive mode:**

```bash
ast-grep run                 # Interactive refactoring
```

---

## Comparison Tables

### fd vs find

| Feature | fd | find |
|---------|-----|------|
| **Syntax** | `fd pattern` | `find -name pattern` |
| **Speed** | 5-10x faster | Baseline |
| **Ignores .gitignore** | ✅ Yes (default) | ❌ No |
| **Colored output** | ✅ Yes | ❌ No |
| **Hidden files** | Excluded by default | Included |
| **Regex** | Default | `-regex` flag |
| **Parallel** | ✅ Yes | ❌ No |
| **POSIX standard** | ❌ No | ✅ Yes |

**When to use find:**

- Need POSIX compatibility
- Complex boolean expressions
- fd not available

---

### ripgrep vs grep

| Feature | ripgrep | grep |
|---------|---------|------|
| **Syntax** | `rg pattern` | `grep pattern` |
| **Speed** | 10-50x faster | Baseline |
| **Ignores .gitignore** | ✅ Yes (default) | ❌ No |
| **Colored output** | ✅ Yes (default) | Flag required |
| **Binary files** | Skips automatically | Shows garbage |
| **Unicode** | ✅ Full support | Limited |
| **Parallel** | ✅ Yes | ❌ No |
| **Type filtering** | `-t js` (built-in) | Complex patterns |
| **POSIX standard** | ❌ No | ✅ Yes |

**When to use grep:**

- Need POSIX compatibility
- Specific grep features
- ripgrep not available

---

### ast-grep vs ripgrep

| Feature | ast-grep | ripgrep |
|---------|----------|---------|
| **Search type** | Semantic (AST) | Text (regex) |
| **Understands code** | ✅ Yes | ❌ No |
| **Language-aware** | ✅ Yes | ❌ No |
| **Format-independent** | ✅ Yes | ❌ No |
| **Refactoring** | ✅ Yes | ❌ No |
| **Speed** | Slower (parses AST) | Faster (text only) |
| **Use case** | Code structure | Text content |

**When to use ast-grep:**

- Finding code patterns (functions, classes, imports)
- Semantic refactoring
- Language-aware searches
- Need to preserve code structure

**When to use ripgrep:**

- Simple text searches
- Searching strings, comments, docs
- Need maximum speed
- Pattern doesn't depend on syntax

---

## Integration with PAI

### PAI Preferences

PAI's CORE skill defines these preferences (loaded automatically):

```
CLI Tools:
• File search: fd over find
• Text search: ripgrep (rg) over grep
• Code search: ast-grep for semantic operations
```

### How PAI Uses These Tools

1. **File Search**: When PAI needs to find files, it uses `fd`
2. **Text Search**: When searching content, PAI uses `ripgrep`
3. **Code Search**: For semantic code operations, PAI uses `ast-grep`

### Claude Code Integration

Claude Code has a built-in `Grep` tool that uses ripgrep under the hood. When you're in Claude Code, prefer using the Grep tool over bash commands for better integration.

---

## Decision Tree

Use this to choose the right tool:

```
Need to search for...

├─ Files by NAME or PATH
│  └─ Use: fd
│     Example: fd -e ts config
│
├─ TEXT CONTENT (strings, comments, logs)
│  └─ Use: ripgrep (rg)
│     Example: rg -i "error"
│
└─ CODE STRUCTURE (functions, classes, patterns)
   └─ Use: ast-grep
      Example: ast-grep -p 'function $NAME($$$)'
```

---

## Pro Tips

### 1. Combine Tools

```bash
# Find TypeScript files, then search for TODOs
fd -e ts -x rg TODO

# Find all JS files modified today
fd -e js -t f --changed-within 1d

# Search in specific file types only
rg -t rust -t python "unsafe"
```

### 2. Aliases for Speed

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Quick searches
alias f='fd'
alias s='rg'
alias g='rg'

# Common patterns
alias todos='rg -i "TODO|FIXME|HACK"'
alias errors='rg -i "error|exception|fail"'

# Find files modified recently
alias recent='fd -t f --changed-within 1d'
```

### 3. Ignore Files

All tools respect `.gitignore`, but you can also use:

**Global ignore file:**

```bash
# Create ~/.rgignore for ripgrep
echo "node_modules/" >> ~/.rgignore
echo "*.log" >> ~/.rgignore

# fd uses .fdignore
echo "*.tmp" >> ~/.fdignore
```

### 4. Config Files

**ripgrep config:** `~/.ripgreprc`

```
--smart-case
--colors=match:fg:green
--colors=match:style:bold
--max-columns=150
```

**ast-grep config:** `~/.ast-grep/config.yml`

```yaml
ruleDirs:
  - ./rules
language: typescript
```

### 5. Performance Tuning

```bash
# ripgrep with threading control
rg -j 4 pattern              # Use 4 threads

# fd with max depth for speed
fd -d 3 pattern              # Stop at depth 3
```

---

## Common Use Cases

### Finding Configuration Files

```bash
# All config files
fd config

# Specific formats
fd -e json -e yaml -e toml config

# In specific directory
fd config ~/.config/
```

### Code Refactoring

```bash
# Find all console.log statements
ast-grep -p 'console.log($$$)'

# Replace with logger
ast-grep \
  --pattern 'console.log($MSG)' \
  --rewrite 'logger.info($MSG)'

# Preview changes first
ast-grep -p 'old($A)' --rewrite 'new($A)' --dry-run
```

### Security Auditing

```bash
# Find potential secrets
rg -i '(api[_-]?key|password|secret|token).*=.*["\047]'

# Find eval usage (dangerous)
ast-grep -p 'eval($$$)'

# Find SQL queries (potential injection)
rg -i 'select.*from.*where'
```

### Dependency Analysis

```bash
# Find all imports
ast-grep -p 'import $X from "$Y"'

# Find specific dependency usage
rg -t ts -t js 'from ["\047]lodash'

# Find all package.json files
fd package.json
```

### Documentation Search

```bash
# Find all markdown files with TODOs
fd -e md -x rg TODO

# Find specific documentation
rg -t md "## Installation"

# Find broken links in markdown
rg -t md '\[.*\]\(http.*\)' --only-matching
```

---

## Troubleshooting

### fd not finding files

```bash
# Check if .gitignore is hiding them
fd -I pattern                # Ignore .gitignore

# Check if files are hidden
fd -H pattern                # Include hidden files

# Check depth limit
fd -d 10 pattern             # Increase depth
```

### ripgrep missing results

```bash
# Check ignore files
rg --no-ignore pattern       # Skip all ignore files

# Check if file type is excluded
rg -t all pattern            # Search all file types

# Check for binary files
rg -a pattern                # Include binary files
```

### ast-grep not matching

```bash
# Check language
ast-grep -l typescript -p 'pattern'

# Use more general pattern
ast-grep -p '$ANY'           # Match anything

# Debug with verbose
ast-grep -p 'pattern' --debug
```

---

## Resources

### Official Documentation

- **fd:** https://github.com/sharkdp/fd
- **ripgrep:** https://github.com/BurntSushi/ripgrep
- **ast-grep:** https://ast-grep.github.io/

### Cheat Sheets

- **fd cheat sheet:** https://github.com/sharkdp/fd#command-line-options
- **ripgrep guide:** https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md
- **ast-grep patterns:** https://ast-grep.github.io/guide/pattern-syntax.html

### Community

- Report issues via GitHub
- PAI discussions: https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions

---

## Quick Reference Card

### fd

```bash
fd pattern           # Find by name
fd -e ext           # By extension
fd -t f             # Files only
fd -H               # Include hidden
fd -I               # Don't ignore
fd -d N             # Max depth N
fd -x cmd           # Execute command
```

### ripgrep

```bash
rg pattern          # Search content
rg -i               # Case insensitive
rg -l               # Filenames only
rg -t type          # File type
rg -T type          # Exclude type
rg -C N             # N lines context
rg --hidden         # Include hidden
rg --no-ignore      # Don't ignore
rg -v               # Invert match
```

### ast-grep

```bash
ast-grep -p 'code'  # Find pattern
sg -p 'code'        # Short alias
ast-grep --rewrite  # Replace
ast-grep -l lang    # Language
sg scan --rule      # Use rules
ast-grep run        # Interactive
```

---

**Last Updated:** November 2025

**Questions?** Check PAI documentation or file an issue on GitHub!

---

*These tools make you faster, more productive, and happier.* ⚡
