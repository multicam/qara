#!/bin/bash

# ============================================
# PAI (Personal AI Infrastructure) Validation Script
# ============================================
#
# This script validates your PAI installation and checks
# that all tools are properly installed and configured.
#
# Usage:
#   ./validate.sh              # Run full validation
#   ./validate.sh --quiet      # Only show warnings/errors
#   ./validate.sh --json       # Output results as JSON
#
# ============================================

set -e  # Exit on error

# Parse arguments
QUIET_MODE=false
JSON_MODE=false

for arg in "$@"; do
    case $arg in
        --quiet|-q)
            QUIET_MODE=true
            ;;
        --json|-j)
            JSON_MODE=true
            ;;
        --help|-h)
            echo "PAI Validation Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quiet, -q    Only show warnings and errors"
            echo "  --json, -j     Output results as JSON"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji support
CHECK="✅"
CROSS="❌"
WARN="⚠️"
INFO="ℹ️"

# JSON output arrays
declare -a JSON_RESULTS

# ============================================
# Helper Functions
# ============================================

print_header() {
    if [ "$JSON_MODE" = false ]; then
        echo ""
        echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${PURPLE}  $1${NC}"
        echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    fi
}

print_success() {
    if [ "$JSON_MODE" = false ] && [ "$QUIET_MODE" = false ]; then
        echo -e "${GREEN}${CHECK} $1${NC}"
    fi
    JSON_RESULTS+=("{\"status\":\"success\",\"message\":\"$1\"}")
}

print_error() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "${RED}${CROSS} $1${NC}"
    fi
    JSON_RESULTS+=("{\"status\":\"error\",\"message\":\"$1\"}")
}

print_warning() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "${YELLOW}${WARN} $1${NC}"
    fi
    JSON_RESULTS+=("{\"status\":\"warning\",\"message\":\"$1\"}")
}

print_info() {
    if [ "$JSON_MODE" = false ] && [ "$QUIET_MODE" = false ]; then
        echo -e "${CYAN}${INFO} $1${NC}"
    fi
    JSON_RESULTS+=("{\"status\":\"info\",\"message\":\"$1\"}")
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# Determine PAI Directory
# ============================================

# Try to find PAI_DIR from environment
if [ -n "$PAI_DIR" ]; then
    PAI_DIR="$PAI_DIR"
else
    # Try to derive from script location
    # Script is in: /path/to/.claude/install/
    # PAI_DIR is:   /path/to/.claude/
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PAI_DIR="$(dirname "$SCRIPT_DIR")"
fi

# ============================================
# Validation Header
# ============================================

if [ "$JSON_MODE" = false ]; then
    clear
    echo -e "${PURPLE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   PAI - Installation Validation                       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
fi

# ============================================
# Check Core Tools
# ============================================

print_header "Core Infrastructure"

# Git
if command_exists git; then
    git_version=$(git --version | awk '{print $3}')
    print_success "Git $git_version is installed"
else
    print_error "Git is not installed (REQUIRED)"
fi

# Homebrew
if command_exists brew; then
    brew_version=$(brew --version | head -n1 | awk '{print $2}')
    print_success "Homebrew $brew_version is installed"
else
    # Homebrew is optional on Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_warning "Homebrew is not installed (recommended for macOS)"
    else
        print_info "Homebrew is not installed (optional on Linux)"
    fi
fi

# Bun
if command_exists bun; then
    bun_version=$(bun --version)
    print_success "Bun $bun_version is installed"
else
    print_warning "Bun is not installed (recommended)"
fi

# Cargo/Rust
if command_exists cargo; then
    cargo_version=$(cargo --version | awk '{print $2}')
    print_success "Cargo $cargo_version is installed"
else
    print_warning "Cargo is not installed (needed for CLI tools)"
fi

# ============================================
# Check Modern CLI Tools
# ============================================

print_header "Modern CLI Tools"

# fd
if command_exists fd; then
    fd_version=$(fd --version | awk '{print $2}')
    print_success "fd $fd_version is installed"
else
    print_info "fd is not installed (optional)"
fi

# ripgrep
if command_exists rg; then
    rg_version=$(rg --version | head -n1 | awk '{print $2}')
    print_success "ripgrep $rg_version is installed"
else
    print_info "ripgrep is not installed (optional)"
fi

# ast-grep
if command_exists ast-grep || command_exists sg; then
    if command_exists ast-grep; then
        astgrep_version=$(ast-grep --version 2>/dev/null | head -n1 | awk '{print $2}')
    else
        astgrep_version=$(sg --version 2>/dev/null | head -n1 | awk '{print $2}')
    fi
    print_success "ast-grep $astgrep_version is installed"
else
    print_info "ast-grep is not installed (optional)"
fi

# bat
if command_exists bat; then
    bat_version=$(bat --version | head -n1 | awk '{print $2}')
    print_success "bat $bat_version is installed"
else
    print_info "bat is not installed (optional)"
fi

# ============================================
# Check Development Tools
# ============================================

print_header "Development Tools"

# GitHub CLI
if command_exists gh; then
    gh_version=$(gh --version | head -n1 | awk '{print $3}')
    print_success "GitHub CLI $gh_version is installed"
else
    print_info "GitHub CLI is not installed (optional)"
fi

# markdownlint-cli2
if command_exists markdownlint-cli2; then
    markdownlint_version=$(markdownlint-cli2 --version 2>/dev/null | head -n1)
    print_success "markdownlint-cli2 $markdownlint_version is installed"
else
    print_info "markdownlint-cli2 is not installed (optional)"
fi

# curl
if command_exists curl; then
    curl_version=$(curl --version | head -n1 | awk '{print $2}')
    print_success "curl $curl_version is installed"
else
    print_error "curl is not installed (REQUIRED)"
fi

# ============================================
# Check AI Tools
# ============================================

print_header "AI Tools"

# Fabric
if command_exists fabric; then
    print_success "Fabric is installed"
else
    print_info "Fabric is not installed (optional)"
fi

# Gemini CLI
if command_exists gemini; then
    print_success "Gemini CLI is installed"
else
    print_info "Gemini CLI is not installed (optional)"
fi

# Grok CLI
if command_exists grok; then
    print_success "Grok CLI is installed"
else
    print_info "Grok CLI is not installed (optional)"
fi

# Ollama
if command_exists ollama; then
    ollama_version=$(ollama --version 2>/dev/null | awk '{print $NF}')
    print_success "Ollama $ollama_version is installed"
else
    print_info "Ollama is not installed (optional)"
fi

# ============================================
# Check Language Runtimes
# ============================================

print_header "Language Runtimes"

# TypeScript
if command_exists tsc; then
    ts_version=$(tsc --version | awk '{print $2}')
    print_success "TypeScript $ts_version is installed"
else
    print_info "TypeScript is not installed (optional)"
fi

# ts-node
if command_exists ts-node; then
    tsnode_version=$(ts-node --version | head -n1 | awk '{print $2}')
    print_success "ts-node $tsnode_version is installed"
else
    print_info "ts-node is not installed (optional)"
fi

# Python
if command_exists python3; then
    python_version=$(python3 --version | awk '{print $2}')
    print_success "Python $python_version is installed"
elif command_exists python; then
    python_version=$(python --version | awk '{print $2}')
    print_success "Python $python_version is installed"
else
    print_warning "Python is not installed (needed for some utilities)"
fi

# uv
if command_exists uv; then
    uv_version=$(uv --version | awk '{print $2}')
    print_success "uv $uv_version is installed"
else
    print_info "uv is not installed (optional)"
fi

# Playwright
if command_exists playwright; then
    print_success "Playwright is installed"
else
    print_info "Playwright is not installed (optional)"
fi

# ============================================
# Check PAI Configuration
# ============================================

print_header "PAI Configuration"

# PAI directory
if [ -d "$PAI_DIR" ]; then
    print_success "PAI directory exists: $PAI_DIR"
else
    print_error "PAI directory not found: $PAI_DIR"
fi

# Skills directory
if [ -d "$PAI_DIR/skills" ]; then
    skill_count=$(fd -t d --max-depth 1 . "$PAI_DIR/skills" 2>/dev/null | wc -l | tr -d ' ')
    print_success "Found $skill_count skills"
else
    print_warning "Skills directory not found"
fi

# Commands directory
if [ -d "$PAI_DIR/commands" ]; then
    command_count=$(fd -e md -t f . "$PAI_DIR/commands" 2>/dev/null | wc -l | tr -d ' ')
    print_success "Found $command_count commands"
else
    print_warning "Commands directory not found"
fi

# Environment variables
if [ -n "$PAI_DIR" ]; then
    print_success "PAI_DIR environment variable is set"
else
    print_warning "PAI_DIR environment variable not set"
fi

# .env file
if [ -f "$PAI_DIR/.env" ]; then
    print_success ".env file exists"
else
    print_info ".env file not found (optional)"
fi

# ============================================
# Check Claude Code Integration
# ============================================

print_header "Claude Code Integration"

# settings.json symlink
if [ -L "$HOME/.claude/settings.json" ]; then
    print_success "Claude Code settings linked to PAI"
elif [ -f "$HOME/.claude/settings.json" ]; then
    print_info "Claude Code settings exist (not linked to PAI)"
else
    print_info "Claude Code settings not configured"
fi

# hooks symlink
if [ -L "$HOME/.claude/hooks" ]; then
    hooks_target=$(readlink "$HOME/.claude/hooks")
    if [ "$hooks_target" = "$PAI_DIR/hooks" ]; then
        print_success "Hooks symlink configured correctly"
    else
        print_warning "Hooks symlink points to wrong location: $hooks_target"
    fi
else
    print_warning "Hooks symlink not found (PAI may not work correctly)"
fi

# skills symlink
if [ -L "$HOME/.claude/skills" ]; then
    skills_target=$(readlink "$HOME/.claude/skills")
    if [ "$skills_target" = "$PAI_DIR/skills" ]; then
        print_success "Skills symlink configured correctly"
    else
        print_warning "Skills symlink points to wrong location: $skills_target"
    fi
else
    print_info "Skills symlink not found (optional)"
fi

# commands symlink
if [ -L "$HOME/.claude/commands" ]; then
    commands_target=$(readlink "$HOME/.claude/commands")
    if [ "$commands_target" = "$PAI_DIR/commands" ]; then
        print_success "Commands symlink configured correctly"
    else
        print_warning "Commands symlink points to wrong location: $commands_target"
    fi
else
    print_info "Commands symlink not found (optional)"
fi

# scratchpad directory
if [ -d "$HOME/.claude/scratchpad" ]; then
    print_success "Scratchpad directory exists"
else
    print_warning "Scratchpad directory not found"
fi

# ============================================
# Output Results
# ============================================

if [ "$JSON_MODE" = true ]; then
    # Output JSON
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"pai_dir\": \"$PAI_DIR\","
    echo "  \"results\": ["

    # Join array elements with commas
    first=true
    for result in "${JSON_RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        echo "    $result"
    done

    echo ""
    echo "  ]"
    echo "}"
else
    # Summary
    print_header "Validation Summary"

    error_count=$(printf '%s\n' "${JSON_RESULTS[@]}" | grep -c '"status":"error"' || true)
    warning_count=$(printf '%s\n' "${JSON_RESULTS[@]}" | grep -c '"status":"warning"' || true)
    success_count=$(printf '%s\n' "${JSON_RESULTS[@]}" | grep -c '"status":"success"' || true)

    echo "Results:"
    echo "  ${GREEN}✅ Success: $success_count${NC}"
    echo "  ${YELLOW}⚠️  Warnings: $warning_count${NC}"
    echo "  ${RED}❌ Errors: $error_count${NC}"
    echo ""

    if [ "$error_count" -gt 0 ]; then
        echo -e "${RED}Some critical issues were found. Run setup.sh to fix them.${NC}"
        exit 1
    elif [ "$warning_count" -gt 0 ]; then
        echo -e "${YELLOW}Some optional tools are missing. Everything should work, but consider installing them.${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ All checks passed! PAI is properly configured.${NC}"
        exit 0
    fi
fi
