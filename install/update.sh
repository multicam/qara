#!/bin/bash

# ============================================
# PAI (Personal AI Infrastructure) Update Script
# ============================================
#
# This script updates your PAI installation and validates
# that everything is still working correctly.
#
# Usage:
#   ./update.sh                # Update PAI and validate
#   ./update.sh --skip-validate # Update without validation
#   ./update.sh --validate-only # Only run validation
#
# ============================================

set -e  # Exit on error

# Parse arguments
SKIP_VALIDATE=false
VALIDATE_ONLY=false

for arg in "$@"; do
    case $arg in
        --skip-validate)
            SKIP_VALIDATE=true
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            ;;
        --help|-h)
            echo "PAI Update Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-validate    Update without running validation"
            echo "  --validate-only    Only run validation, skip update"
            echo "  --help, -h         Show this help message"
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
ROCKET="🚀"
WRENCH="🔧"

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARN} $1${NC}"
}

print_info() {
    echo -e "${CYAN}${INFO} $1${NC}"
}

print_step() {
    echo -e "${BLUE}${WRENCH} $1${NC}"
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
# Update Header
# ============================================

clear
echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   PAI - Update & Validation                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""

# ============================================
# Validate Only Mode
# ============================================

if [ "$VALIDATE_ONLY" = true ]; then
    print_header "Running Validation Only"

    VALIDATE_SCRIPT="./validate.sh"
    if [ -f "$VALIDATE_SCRIPT" ]; then
        bash "$VALIDATE_SCRIPT"
        exit $?
    else
        print_error "Validation script not found: $VALIDATE_SCRIPT"
        exit 1
    fi
fi


# ============================================
# Update Dependencies
# ============================================

print_header "Updating Dependencies"

# Update Bun packages if package.json exists
if [ -f "$PAI_DIR/package.json" ]; then
    if command -v bun >/dev/null 2>&1; then
        print_step "Updating Bun packages..."
        if bun install; then
            print_success "Bun packages updated"
        else
            print_warning "Failed to update Bun packages"
        fi
    else
        print_info "Bun not installed, skipping package updates"
    fi
fi

# Update Python packages if requirements.txt exists
if [ -f "$PAI_DIR/requirements.txt" ]; then
    if command -v uv >/dev/null 2>&1; then
        print_step "Updating Python packages with uv..."
        if uv pip install -r "$PAI_DIR/requirements.txt"; then
            print_success "Python packages updated"
        else
            print_warning "Failed to update Python packages"
        fi
    elif command -v pip3 >/dev/null 2>&1; then
        print_step "Updating Python packages with pip..."
        if pip3 install -r "$PAI_DIR/requirements.txt"; then
            print_success "Python packages updated"
        else
            print_warning "Failed to update Python packages"
        fi
    else
        print_info "No Python package manager found, skipping"
    fi
fi

# ============================================
# Verify Symlinks
# ============================================

print_header "Verifying Configuration"

# Check hooks symlink
if [ -L "$HOME/.claude/hooks" ]; then
    hooks_target=$(readlink "$HOME/.claude/hooks")
    if [ "$hooks_target" = "$PAI_DIR/hooks" ]; then
        print_success "Hooks symlink is correct"
    else
        print_warning "Hooks symlink points to wrong location"
        print_info "Expected: $PAI_DIR/hooks"
        print_info "Actual: $hooks_target"
    fi
else
    print_warning "Hooks symlink not found"
fi

# Check skills symlink
if [ -L "$HOME/.claude/skills" ]; then
    skills_target=$(readlink "$HOME/.claude/skills")
    if [ "$skills_target" = "$PAI_DIR/skills" ]; then
        print_success "Skills symlink is correct"
    else
        print_warning "Skills symlink points to wrong location"
    fi
else
    print_info "Skills symlink not found (optional)"
fi

# Check commands symlink
if [ -L "$HOME/.claude/commands" ]; then
    commands_target=$(readlink "$HOME/.claude/commands")
    if [ "$commands_target" = "$PAI_DIR/commands" ]; then
        print_success "Commands symlink is correct"
    else
        print_warning "Commands symlink points to wrong location"
    fi
else
    print_info "Commands symlink not found (optional)"
fi

# Check settings.json symlink
if [ -L "$HOME/.claude/settings.json" ]; then
    print_success "Claude Code settings linked"
else
    print_info "Claude Code settings not linked (optional)"
fi

# ============================================
# Run Validation
# ============================================

if [ "$SKIP_VALIDATE" = false ]; then
    echo ""
    print_header "Running Validation"

    VALIDATE_SCRIPT="$SCRIPT_DIR/validate.sh"
    if [ -f "$VALIDATE_SCRIPT" ]; then
        bash "$VALIDATE_SCRIPT" --quiet
        VALIDATE_EXIT=$?

        if [ $VALIDATE_EXIT -eq 0 ]; then
            print_success "Validation passed"
        else
            print_warning "Validation found some issues"
            print_info "Run './validate.sh' for details"
        fi
    else
        print_warning "Validation script not found: $VALIDATE_SCRIPT"
    fi
fi

# ============================================
# Success Message
# ============================================

print_header "${ROCKET} Update Complete! ${ROCKET}"

echo -e "${GREEN}"
cat << "EOF"
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ✅ PAI has been successfully updated!            │
│                                                     │
└─────────────────────────────────────────────────────┘
EOF
echo -e "${NC}"

echo ""
echo "Next steps:"
echo "  • Restart Claude Code if it's running"
echo "  • Check the changelog: git log --oneline -10"
echo "  • Run './validate.sh' to verify everything works"
echo ""

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${ROCKET} Happy coding with PAI! ${ROCKET}${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
