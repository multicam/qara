# PAI Quick Reference Card

**Bookmark this page!** This is your quick reference for common PAI commands and tasks.

---

## 🚀 Getting Started

### Environment Check

```bash
# Verify PAI is installed
echo $PAI_DIR                    # Should show: /Users/yourname/PAI

# Go to PAI directory
cd $PAI_DIR

# See what's available
ls -la
```

---

## 📁 Essential Directories

| Directory | What's There | Example |
|-----------|--------------|---------|
| `$PAI_DIR/skills/` | All available skills | `ls $PAI_DIR/skills/` |
| `$PAI_DIR/commands/` | Pre-built commands | `ls $PAI_DIR/commands/` |
| `$PAI_DIR/documentation/` | Help and guides | `open $PAI_DIR/documentation/` |
| `$PAI_DIR/agents/` | Specialized AI agents | `ls $PAI_DIR/agents/` |
| `$PAI_DIR/hooks/` | Automation scripts | `ls $PAI_DIR/hooks/` |
| `$PAI_DIR/.env` | Your API keys and settings | `open -e $PAI_DIR/.env` |

---

## ⚙️ Common Commands

### View Available Skills

```bash
# List all skills
ls $PAI_DIR/skills/

# See what a skill does
cat $PAI_DIR/skills/research/SKILL.md

# Search for a specific skill
find $PAI_DIR/skills -name "*research*"
```

### Manage Environment Variables

```bash
# Check current settings
echo $PAI_DIR                    # PAI location
echo $DA                         # AI assistant name
echo $DA_COLOR                   # Display color

# Edit environment variables
code ~/.bashrc                 # or ~/.bashrc

# Reload after changes
source ~/.bashrc                  # or source ~/.bashrc
```

### Configure API Keys

```bash
# Edit API keys
open -e $PAI_DIR/.env

# View current keys (safe - doesn't show values)
grep "^[A-Z]" $PAI_DIR/.env | cut -d= -f1

# Copy example env file
cp $PAI_DIR/.env.example $PAI_DIR/.env
```

---

## 🔍 Troubleshooting

### PAI_DIR Not Found

```bash
# Check if set
echo $PAI_DIR

# If empty, add to shell config
echo 'export PAI_DIR="$HOME/PAI"' >> ~/.bashrc
source ~/.bashrc
```

### Skills Not Loading

```bash
# Verify skills exist
ls -la $PAI_DIR/skills/

# Check permissions
chmod -R u+r $PAI_DIR/skills/

# Look for SKILL.md files
find $PAI_DIR/skills -name "SKILL.md"
```

### Environment File Issues

```bash
# Check if .env exists
ls -la $PAI_DIR/.env

# Create from template
cp $PAI_DIR/.env.example $PAI_DIR/.env

# Verify format (no quotes around values)
cat $PAI_DIR/.env
```

### Claude Code Not Recognizing PAI

```bash
# Check if settings are linked
ls -la ~/.claude/settings.json

# Create symbolic link
ln -sf $PAI_DIR/settings.json ~/.claude/settings.json

# Restart Claude Code
```

### Git Issues

```bash
# Check remote
cd $PAI_DIR && git remote -v

# Reset to latest
cd $PAI_DIR && git fetch && git reset --hard origin/main

# Check status
cd $PAI_DIR && git status
```

---

## 🎨 Customization

### Customize PAI Skill

```bash
# Open main PAI skill
open -e $PAI_DIR/skills/CORE/SKILL.md

# Look for [CUSTOMIZE:] markers
grep -n "CUSTOMIZE:" $PAI_DIR/skills/CORE/SKILL.md
```

### Change AI Assistant Name

```bash
# Edit shell config
open -e ~/.bashrc

# Find this line and change "Qara" to your preference:
export DA="Qara"

# Reload
source ~/.bashrc
```

### Change Display Color

```bash
# Edit shell config
open -e ~/.bashrc

# Options: purple, blue, green, cyan, red, yellow
export DA_COLOR="purple"

# Reload
source ~/.bashrc
```

---

## 📚 Skills Quick Reference

| Skill | Trigger Words | Example |
|-------|---------------|---------|
| **research** | research, investigate, find | "Research quantum computing" |
| **development** | build, create, implement | "Build a meditation app" |
| **fabric** | threat model, summarize, extract | "Summarize this article" |
| **blogging** | blog, write, publish | "Write a blog post about AI" |
| **design** | design, UI, UX | "Design a dashboard" |
| **web-scraping** | scrape, extract, crawl | "Scrape data from this site" |
| **chrome-devtools** | browser, screenshot, debug | "Take a screenshot" |

---

## 🛠️ Modern CLI Tools

PAI uses modern CLI tools that are faster and smarter than traditional Unix tools:

| Traditional | Modern | What it does | Speed |
|-------------|--------|--------------|-------|
| `find` | `fd` | Find files | 5-10x faster |
| `grep` | `ripgrep (rg)` | Search text | 10-50x faster |
| N/A | `ast-grep` | Search code semantically | AST-aware |

### Quick Examples

```bash
# Find files (fd is faster than find)
fd config                     # Find files named "config"
fd -e ts                      # Find all TypeScript files
fd -H secret                  # Include hidden files

# Search text (ripgrep is faster than grep)
rg "TODO"                     # Search for TODO in all files
rg -i error                   # Case-insensitive search
rg -t js console.log          # Search only JavaScript files

# Search code structure (ast-grep understands syntax)
ast-grep -p 'console.log($$$)' # Find all console.log calls
ast-grep -p 'function $NAME($$$)' # Find function definitions
```

**Full guide:** See [CLI-TOOLS.md](./CLI-TOOLS.md) for complete documentation

### Installation

These tools are installed automatically by PAI's setup script:

```bash
cd $PAI_DIR/.claude && ./setup.sh
```

Or install manually:

```bash
cargo install fd-find ripgrep ast-grep
```

---

## 🛠️ Useful One-Liners

```bash
# Quick PAI status check
echo "PAI: $PAI_DIR" && ls $PAI_DIR/skills | wc -l | xargs echo "Skills:"

# Count commands
fd -e md . $PAI_DIR/commands | wc -l

# Find all skill files
fd SKILL.md $PAI_DIR/skills

# View recent PAI updates
cd $PAI_DIR && git log --oneline -10

# Search for a keyword in all skills (use ripgrep)
rg "keyword" $PAI_DIR/skills/

# Backup your .env file
cp $PAI_DIR/.env $PAI_DIR/.env.backup

# View all environment variables related to PAI
env | grep PAI
```

---

## 📞 Getting Help

### Check Logs

```bash
# System logs (if configured)
ls -la ~/Library/Logs/pai*

# Git history
cd $PAI_DIR && git log --oneline -20

```

### Documentation

```bash
# View all documentation
ls $PAI_DIR/documentation/

# CLI tools guide (fd, ripgrep, ast-grep)
open $PAI_DIR/documentation/CLI-TOOLS.md

# Getting started guide
open $PAI_DIR/documentation/how-to-start.md

# Skills system explanation
open $PAI_DIR/documentation/skills-system.md

# Architecture overview
open $PAI_DIR/documentation/architecture.md
```

---

## 🔑 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PAI_DIR` | PAI installation location | `/Users/daniel/PAI` |
| `PAI_HOME` | Your home directory | `/Users/daniel` |
| `DA` | AI assistant name | `Qara` |
| `DA_COLOR` | Display color | `purple` |
| `PERPLEXITY_API_KEY` | Perplexity research | `pk-...` |
| `GOOGLE_API_KEY` | Gemini AI | `AIza...` |
| `REPLICATE_API_TOKEN` | AI generation | `r8_...` |
| `OPENAI_API_KEY` | GPT integration | `sk-...` |

---

## 💡 Pro Tips

### Aliases for Speed

Add these to your `~/.bashrc`:

```bash
# Quick navigation
alias pai='cd $PAI_DIR'
alias pskills='ls $PAI_DIR/skills'
alias pcmds='ls $PAI_DIR/commands'

# Quick edits
alias pai-env='open -e $PAI_DIR/.env'
alias pai-skill='open -e $PAI_DIR/skills/CORE/SKILL.md'
alias pai-shell='open -e ~/.bashrc'

# Updates
alias pai-update='cd $PAI_DIR && git pull'
alias pai-status='cd $PAI_DIR && git status'
```

### Keyboard Shortcuts in Terminal

- `Ctrl+R` - Search command history
- `Ctrl+A` - Jump to start of line
- `Ctrl+E` - Jump to end of line
- `Ctrl+U` - Clear line
- `Ctrl+C` - Cancel current command
- `Ctrl+D` - Exit terminal

---

*Keep this page bookmarked for quick reference!* 🔖