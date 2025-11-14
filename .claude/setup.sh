#!/bin/bash

# ============================================
# PAI (Personal AI Infrastructure) Setup Script
# ============================================
#
# This script automates the entire PAI setup process.
# It's designed to be friendly, informative, and safe.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/danielmiessler/Personal_AI_Infrastructure/main/setup.sh | bash
#
# Or download and run manually:
#   ./setup.sh
#
# ============================================

set -e  # Exit on error

# Stash this script if it's a modified version (for testing)
# This allows testing custom fixes while still cloning from GitHub
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
if [ -f "$SCRIPT_PATH" ]; then
    # Check if this script differs from upstream (simple heuristic: line count)
    SCRIPT_LINES=$(wc -l < "$SCRIPT_PATH")
    if [ "$SCRIPT_LINES" -gt 800 ]; then
        # This is likely a modified version with fixes
        cp "$SCRIPT_PATH" /tmp/.pai_setup_stash
    fi
fi

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
PARTY="🎉"
THINKING="🤔"
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

ask_yes_no() {
    local question="$1"
    local default="${2:-y}"

    if [ "$default" = "y" ]; then
        local prompt="[Y/n]"
    else
        local prompt="[y/N]"
    fi

    while true; do
        printf "${CYAN}${THINKING} %s %s: ${NC}" "$question" "$prompt" >/dev/tty
        read -r response </dev/tty
        response=${response:-$default}
        case "$response" in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

ask_input() {
    local question="$1"
    local default="$2"
    local response

    if [ -n "$default" ]; then
        printf "${CYAN}${THINKING} %s [%s]: ${NC}" "$question" "$default" >/dev/tty
    else
        printf "${CYAN}${THINKING} %s: ${NC}" "$question" >/dev/tty
    fi

    read -r response </dev/tty
    echo "${response:-$default}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# Welcome Message
# ============================================

clear
{
echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   PAI - Personal AI Infrastructure Setup              ║
║                                                       ║
║   Welcome! Let's get you set up in a few minutes.     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "This script will:"
echo "  • Check your system for prerequisites"
echo "  • Install any missing software (with your permission)"
echo "  • Download or update PAI"
echo "  • Configure your environment"
echo "  • Test everything to make sure it works"
echo ""
echo "The whole process takes about 5 minutes."
echo ""
} >/dev/tty

if ! ask_yes_no "Ready to get started?"; then
    echo ""
    echo "No problem! When you're ready, just run this script again."
    echo ""
    exit 0
fi

# ============================================
# Step 1: Check Prerequisites
# ============================================

print_header "Step 1: Checking Prerequisites"

print_step "Checking for macOS..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    macos_version=$(sw_vers -productVersion)
    print_success "Running macOS $macos_version"
    IS_MACOS=true
else
    print_warning "This script is designed for macOS. You're running: $OSTYPE"
    if ! ask_yes_no "Continue anyway? (Some features may not work)" "n"; then
        exit 1
    fi
    IS_MACOS=false
fi

print_step "Checking for Git..."
if command_exists git; then
    git_version=$(git --version | awk '{print $3}')
    print_success "Git $git_version is installed"
    HAS_GIT=true
else
    print_warning "Git is not installed"
    HAS_GIT=false
fi

print_step "Checking for Homebrew..."
if command_exists brew; then
    brew_version=$(brew --version | head -n1 | awk '{print $2}')
    print_success "Homebrew $brew_version is installed"
    HAS_BREW=true
else
    print_warning "Homebrew is not installed"
    HAS_BREW=false
fi

print_step "Checking for Bun..."
if command_exists bun; then
    bun_version=$(bun --version)
    print_success "Bun $bun_version is installed"
    HAS_BUN=true
else
    print_warning "Bun is not installed"
    HAS_BUN=false
fi

print_step "Checking for Cargo (Rust)..."
if command_exists cargo; then
    cargo_version=$(cargo --version | awk '{print $2}')
    print_success "Cargo $cargo_version is installed"
    HAS_CARGO=true
else
    print_warning "Cargo is not installed"
    HAS_CARGO=false
fi

print_step "Checking for fd..."
if command_exists fd; then
    fd_version=$(fd --version | awk '{print $2}')
    print_success "fd $fd_version is installed"
    HAS_FD=true
else
    print_warning "fd is not installed"
    HAS_FD=false
fi

print_step "Checking for ast-grep..."
if command_exists ast-grep || command_exists sg; then
    if command_exists ast-grep; then
        astgrep_version=$(ast-grep --version 2>/dev/null | head -n1 | awk '{print $2}')
    else
        astgrep_version=$(sg --version 2>/dev/null | head -n1 | awk '{print $2}')
    fi
    print_success "ast-grep $astgrep_version is installed"
    HAS_ASTGREP=true
else
    print_warning "ast-grep is not installed"
    HAS_ASTGREP=false
fi

print_step "Checking for ripgrep..."
if command_exists rg; then
    rg_version=$(rg --version | head -n1 | awk '{print $2}')
    print_success "ripgrep $rg_version is installed"
    HAS_RIPGREP=true
else
    print_warning "ripgrep is not installed"
    HAS_RIPGREP=false
fi

print_step "Checking for bat..."
if command_exists bat; then
    bat_version=$(bat --version | head -n1 | awk '{print $2}')
    print_success "bat $bat_version is installed"
    HAS_BAT=true
else
    print_warning "bat is not installed"
    HAS_BAT=false
fi


# ============================================
# Step 2: Install Missing Software
# ============================================

NEEDS_INSTALL=false

if [ "$HAS_GIT" = false ] || [ "$HAS_BREW" = false ] || [ "$HAS_BUN" = false ]; then
    NEEDS_INSTALL=true
fi

if [ "$NEEDS_INSTALL" = true ]; then
    print_header "Step 2: Installing Missing Software"

    # Install Homebrew if needed
    if [ "$HAS_BREW" = false ]; then
        echo ""
        print_warning "Homebrew is not installed. Homebrew is a package manager for macOS."

        # Check if we're on Linux and already have the required dependencies
        if [ "$IS_MACOS" = false ] && [ "$HAS_GIT" = true ] && [ "$HAS_BUN" = true ]; then
            print_info "On Linux with Git and Bun already installed - Homebrew is optional."
            echo ""

            if ask_yes_no "Install Homebrew anyway?" "y"; then
                print_step "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

                # Add Homebrew to PATH for this session
                if [ -f "/opt/homebrew/bin/brew" ]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                elif [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
                    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
                fi

                print_success "Homebrew installed successfully!"
                HAS_BREW=true
            else
                print_info "Skipping Homebrew installation. Continuing with existing tools."
                HAS_BREW=false
            fi
        else
            # On macOS or missing dependencies - Homebrew is required
            print_info "We need it to install other tools like Bun."
            echo ""

            if ask_yes_no "Install Homebrew?" "y"; then
                print_step "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

                # Add Homebrew to PATH for this session
                if [ -f "/opt/homebrew/bin/brew" ]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                elif [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
                    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
                fi

                print_success "Homebrew installed successfully!"
                HAS_BREW=true
            else
                print_error "Homebrew is required to continue. Exiting."
                exit 1
            fi
        fi
    fi

    # Install Git if needed
    if [ "$HAS_GIT" = false ]; then
        echo ""
        print_warning "Git is not installed. Git is needed to download PAI."
        echo ""

        if ask_yes_no "Install Git?"; then
            print_step "Installing Git..."
            if [ "$HAS_BREW" = true ]; then
                brew install git
            else
                xcode-select --install
            fi
            print_success "Git installed successfully!"
            HAS_GIT=true
        else
            print_error "Git is required to continue. Exiting."
            exit 1
        fi
    fi

    # Install Bun if needed
    if [ "$HAS_BUN" = false ]; then
        echo ""
        print_warning "Bun is not installed. Bun is a fast JavaScript runtime."
        print_info "It's needed for features."
        echo ""

        if ask_yes_no "Install Bun?"; then
            print_step "Installing Bun..."
            brew install oven-sh/bun/bun
            print_success "Bun installed successfully!"
            HAS_BUN=true
        else
            print_warning "Bun is optional, but recommended. Continuing without it."
        fi
    fi

    # Install Cargo if needed
    if [ "$HAS_CARGO" = false ]; then
        echo ""
        print_warning "Cargo (Rust) is not installed. Cargo is needed for modern CLI tools."
        print_info "It's required to install fd, ripgrep, bat, and ast-grep."
        echo ""

        if ask_yes_no "Install Cargo (Rust)?"; then
            print_step "Installing Rust and Cargo..."
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

            # Source cargo environment for this session
            if [ -f "$HOME/.cargo/env" ]; then
                source "$HOME/.cargo/env"
            fi

            print_success "Rust and Cargo installed successfully!"
            HAS_CARGO=true
        else
            print_warning "Cargo is needed for fd, ripgrep, and ast-grep. Skipping those tools."
        fi
    fi

    # Install fd if needed and cargo is available
    if [ "$HAS_FD" = false ] && [ "$HAS_CARGO" = true ]; then
        echo ""
        print_warning "fd is not installed. fd is a modern, fast file finder."
        print_info "It's preferred over find for file searches (part of PAI CLI tool preferences)."
        echo ""

        if ask_yes_no "Install fd?"; then
            print_step "Installing fd via cargo..."
            cargo install fd-find
            print_success "fd installed successfully!"
            HAS_FD=true
        else
            print_warning "fd is optional, but recommended. Continuing without it."
        fi
    fi

    # Install ast-grep if needed and cargo is available
    if [ "$HAS_ASTGREP" = false ] && [ "$HAS_CARGO" = true ]; then
        echo ""
        print_warning "ast-grep is not installed. ast-grep is a semantic code search tool."
        print_info "It's preferred for code refactoring and semantic searches (part of PAI CLI tool preferences)."
        echo ""

        if ask_yes_no "Install ast-grep?"; then
            print_step "Installing ast-grep via cargo..."
            cargo install ast-grep
            print_success "ast-grep installed successfully!"
            HAS_ASTGREP=true
        else
            print_warning "ast-grep is optional, but recommended for code work. Continuing without it."
        fi
    fi

    # Install ripgrep if needed and cargo is available
    if [ "$HAS_RIPGREP" = false ] && [ "$HAS_CARGO" = true ]; then
        echo ""
        print_warning "ripgrep is not installed. ripgrep (rg) is a fast text search tool."
        print_info "It's preferred over grep for text searches (part of PAI CLI tool preferences)."
        echo ""

        if ask_yes_no "Install ripgrep?"; then
            print_step "Installing ripgrep via cargo..."
            cargo install ripgrep
            print_success "ripgrep installed successfully!"
            HAS_RIPGREP=true
        else
            print_warning "ripgrep is optional, but recommended. Continuing without it."
        fi
    fi

    # Install bat if needed and cargo is available
    if [ "$HAS_BAT" = false ] && [ "$HAS_CARGO" = true ]; then
        echo ""
        print_warning "bat is not installed. bat is a modern file viewer with syntax highlighting."
        print_info "It's preferred over cat for viewing files (part of PAI CLI tool preferences)."
        echo ""

        if ask_yes_no "Install bat?"; then
            print_step "Installing bat via cargo..."
            cargo install bat
            print_success "bat installed successfully!"
            HAS_BAT=true
        else
            print_warning "bat is optional, but recommended. Continuing without it."
        fi
    fi
else
    print_success "All prerequisites are already installed!"
fi


# ============================================
# Step 3: Choose Installation Directory -- Skipped
# ============================================

print_header "Step 3: Choose Installation Directory -- Skipped"

# Derive PAI_DIR from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAI_DIR="$(dirname "$SCRIPT_DIR")"
print_info "Using PAI directory: $PAI_DIR"


# ============================================
# Step 4: Download or Update PAI -- Skipped
# ============================================

print_header "Step 4: Download or Update -- Skipped"


# ============================================
# Step 5: Configure Environment Variables
# ============================================

print_header "Step 5: Configuring Environment"

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    print_warning "Couldn't detect shell type. Defaulting to .zshrc"
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
fi

print_info "Detected shell: $SHELL_NAME"
print_info "Configuration file: $SHELL_CONFIG"

# Check if PAI environment variables are already configured
if grep -q "PAI_DIR" "$SHELL_CONFIG" 2>/dev/null; then
    print_info "PAI environment variables already exist in $SHELL_CONFIG"

    if ask_yes_no "Update them?"; then
        # Remove old PAI configuration
        sed -i.bak '/# ========== PAI Configuration ==========/,/# =========================================/d' "$SHELL_CONFIG"
        SHOULD_ADD_CONFIG=true
    else
        SHOULD_ADD_CONFIG=false
    fi
else
    SHOULD_ADD_CONFIG=true
fi

if [ "$SHOULD_ADD_CONFIG" = true ]; then
    print_step "Adding PAI environment variables to $SHELL_CONFIG..."

    # Ask for AI assistant name
    AI_NAME=$(ask_input "What would you like to call your AI assistant?" "Qara")

    # Ask for color
    echo ""
    echo "Choose a display color:"
    echo "  1) purple (default)"
    echo "  2) blue"
    echo "  3) green"
    echo "  4) cyan"
    echo "  5) red"
    echo ""
    color_choice=$(ask_input "Enter your choice (1-5)" "1")

    case $color_choice in
        1) AI_COLOR="purple" ;;
        2) AI_COLOR="blue" ;;
        3) AI_COLOR="green" ;;
        4) AI_COLOR="cyan" ;;
        5) AI_COLOR="red" ;;
        *) AI_COLOR="purple" ;;
    esac

    # Add configuration to shell config
    {
        echo ""
        echo "# ========== PAI Configuration =========="
        echo "# Personal AI Infrastructure"
        echo "# Added by PAI setup script on $(date)"
        echo ""
        echo "# Where PAI is installed"
        echo "export PAI_DIR=\"$PAI_DIR\""
        echo ""
        echo "# Your home directory"
        echo "export PAI_HOME=\"\$HOME\""
        echo ""
        echo "# Your AI assistant's name"
        echo "export DA=\"$AI_NAME\""
        echo ""
        echo "# Display color"
        echo "export DA_COLOR=\"$AI_COLOR\""
        echo ""
        echo "# ========================================="
        echo ""
    } >> "$SHELL_CONFIG"

    print_success "Environment variables added to $SHELL_CONFIG"
else
    print_info "Keeping existing environment variables"
fi

# Source the configuration for this session
export PAI_DIR="$PAI_DIR"
export PAI_HOME="$HOME"

# ============================================
# Step 6: Create .env File
# ============================================

print_header "Step 6: Configuring API Keys"

if [ -f "$PAI_DIR/.env" ]; then
    print_info ".env file already exists"

    if ! ask_yes_no "Keep existing .env file?"; then
        rm "$PAI_DIR/.env"
        SHOULD_CREATE_ENV=true
    else
        SHOULD_CREATE_ENV=false
    fi
else
    SHOULD_CREATE_ENV=true
fi

if [ "$SHOULD_CREATE_ENV" = true ]; then
    print_step "Creating .env file from template..."

    # In v0.6.0, .env.example is in .claude/ subdirectory
    if [ -f "$PAI_DIR/.env.example" ]; then
        cp "$PAI_DIR/.env.example" "$PAI_DIR/.env"

        # Update PAI_DIR in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|PAI_DIR=\"/path/to/PAI\"|PAI_DIR=\"$PAI_DIR\"|g" "$PAI_DIR/.env"
        else
            sed -i "s|PAI_DIR=\"/path/to/PAI\"|PAI_DIR=\"$PAI_DIR\"|g" "$PAI_DIR/.env"
        fi

        print_success ".env file created"
        print_info "You can add API keys later by editing: $PAI_DIR/.env"
    else
        print_warning ".env.example not found. Skipping .env creation."
    fi
fi

echo ""
print_info "PAI works without API keys, but some features require them:"
echo "  • PERPLEXITY_API_KEY - For advanced web research"
echo "  • GOOGLE_API_KEY - For Gemini AI integration"
echo "  • REPLICATE_API_TOKEN - For AI image/video generation"
echo ""

if ask_yes_no "Would you like to add API keys now?" "n"; then
    echo ""
    print_info "Opening .env file in your default editor..."
    sleep 1
    open -e "$PAI_DIR/.env" 2>/dev/null || nano "$PAI_DIR/.env"
    echo ""
    print_info "When you're done editing, save and close the file."
    read -p "Press Enter when you're ready to continue..."
else
    print_info "You can add API keys later by editing: $PAI_DIR/.env"
fi

# ============================================
# Step 7: Voice Server Setup (Optional)
# ============================================

print_header "Step 7: Voice Server -- disabled"


# ============================================
# Step 8: Claude Code Integration
# ============================================

print_header "Step 8: AI Assistant Integration"

echo "PAI works with various AI assistants (Claude Code, GPT, Gemini, etc.)"
echo ""

if ask_yes_no "Are you using Claude Code?"; then
    print_step "Configuring Claude Code integration..."

    # Create Claude directory if it doesn't exist
    mkdir -p "$HOME/.claude"

    # Check if settings.json already exists
    if [ -L "$HOME/.claude/settings.json" ]; then
        print_info "Claude Code settings already linked to PAI"
    elif [ -f "$HOME/.claude/settings.json" ]; then
        print_warning "Claude Code settings file already exists"

        if ask_yes_no "Replace it with PAI's settings?"; then
            mv "$HOME/.claude/settings.json" "$HOME/.claude/settings.json.backup"
            print_info "Backed up existing settings to settings.json.backup"

            ln -sf "$PAI_DIR/settings.json" "$HOME/.claude/settings.json"
            print_success "Claude Code configured to use PAI!"
        fi
    else
        ln -sf "$PAI_DIR/settings.json" "$HOME/.claude/settings.json"
        print_success "Claude Code configured to use PAI!"
    fi

    # Update load-dynamic-requirements.md with the user's chosen AI assistant name
    if [ -f "$PAI_DIR/commands/load-dynamic-requirements.md" ]; then
        # Replace hardcoded "Qara" references with the user's chosen name
        if grep -q "respond like Qara" "$PAI_DIR/commands/load-dynamic-requirements.md" 2>/dev/null; then
            print_warning "Updating AI name in load-dynamic-requirements.md..."

            # Replace the two Qara references in the conversational section
            sed -i "s/respond like Qara having a chat/respond like $AI_NAME having a chat/g" "$PAI_DIR/commands/load-dynamic-requirements.md"
            sed -i "s/You're Qara, their assistant/You're $AI_NAME, their assistant/g" "$PAI_DIR/commands/load-dynamic-requirements.md"

            print_success "load-dynamic-requirements.md updated with AI name: $AI_NAME"
        fi
    fi

    # Update SKILL.md with the user's chosen AI assistant name
    if [ -f "$PAI_DIR/skills/CORE/SKILL.md" ]; then
        # Check if SKILL.md still has the template placeholder
        if grep -q "Your Name: \[CUSTOMIZE" "$PAI_DIR/skills/CORE/SKILL.md" 2>/dev/null; then
            print_warning "Updating AI name in SKILL.md..."

            # Replace the template placeholder with the user's chosen name
            sed -i "s/Your Name: \[CUSTOMIZE - e.g., Qara, Nova, Atlas\]/Your Name: $AI_NAME/" "$PAI_DIR/skills/CORE/SKILL.md"

            print_success "SKILL.md updated with AI name: $AI_NAME"
        fi
    fi


    # Fix executable permission on load-dynamic-requirements.ts
    chmod +x "$PAI_DIR/hooks/load-dynamic-requirements.ts" 2>/dev/null

    print_success "Hooks configuration verified"

    echo ""
    print_info "Next steps for Claude Code:"
    echo "  1. Download Claude Code from: https://claude.ai/code"
    echo "  2. Sign in with your Anthropic account"
    echo "  3. Restart Claude Code if it's already running"
    echo ""
else
    print_info "For other AI assistants, refer to the documentation:"
    echo "  $PAI_DIR/documentation/how-to-start.md"
fi

# ============================================
# Step 8.5: Create Critical Symlinks
# ============================================

print_header "Step 8.5: Creating Critical Symlinks"

# Create hooks symlink (CRITICAL for hooks to work!)
print_step "Linking hooks to Claude Code..."
if [ -L "$HOME/.claude/hooks" ]; then
    print_info "Hooks already linked to PAI"
elif [ -d "$HOME/.claude/hooks" ]; then
    print_warning "Hooks directory already exists"
    if ask_yes_no "Replace it with PAI's hooks?"; then
        mv "$HOME/.claude/hooks" "$HOME/.claude/hooks.backup"
        print_info "Backed up existing hooks to hooks.backup"
        ln -sf "$PAI_DIR/hooks" "$HOME/.claude/hooks"
        print_success "Hooks linked to PAI!"
    fi
else
    ln -sf "$PAI_DIR/hooks" "$HOME/.claude/hooks"
    print_success "Hooks linked to PAI!"
fi

# Create skills symlink (PAI-global skills)
print_step "Linking skills to Claude Code..."
if [ -L "$HOME/.claude/skills" ]; then
    print_info "Skills already linked to PAI"
elif [ -d "$HOME/.claude/skills" ]; then
    print_warning "Skills directory already exists"
    if ask_yes_no "Replace it with PAI's skills?"; then
        mv "$HOME/.claude/skills" "$HOME/.claude/skills.backup"
        print_info "Backed up existing skills to skills.backup"
        ln -sf "$PAI_DIR/skills" "$HOME/.claude/skills"
        print_success "Skills linked to PAI!"
    fi
else
    ln -sf "$PAI_DIR/skills" "$HOME/.claude/skills"
    print_success "Skills linked to PAI!"
fi

# Create scratchpad directory (required by PAI.md)
print_step "Creating scratchpad directory..."
if [ -d "$HOME/.claude/scratchpad" ]; then
    print_info "Scratchpad directory already exists"
else
    mkdir -p "$HOME/.claude/scratchpad"
    print_success "Scratchpad directory created"
fi

# Clean up old wrapper files from pre-v0.6.0 (if they exist)
print_step "Cleaning up old wrapper files (if any)..."
if [ -d "$HOME/.claude/bin" ]; then
    print_warning "Found old ~/.claude/bin directory from pre-v0.6.0"
    if ask_yes_no "Remove it? (No longer needed in v0.6.0)" "y"; then
        rm -rf "$HOME/.claude/bin"
        print_success "Old bin directory removed"
    fi
elif [ -f "$HOME/.claude/bin" ]; then
    print_warning "Found ~/.claude/bin file (should be a directory or not exist)"
    rm -f "$HOME/.claude/bin"
    print_success "Removed unexpected bin file"
else
    print_info "No old wrapper files found (clean install)"
fi

# ============================================
# Step 9: Test Installation
# ============================================

print_header "Step 9: Testing Installation"

print_step "Running system checks..."

# Test 1: PAI_DIR exists
if [ -d "$PAI_DIR" ]; then
    print_success "PAI directory exists: $PAI_DIR"
else
    print_error "PAI directory not found: $PAI_DIR"
fi

# Test 2: Skills directory exists
if [ -d "$PAI_DIR/skills" ]; then
    skill_count=$(find "$PAI_DIR/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
    print_success "Found $skill_count skills"
else
    print_warning "Skills directory not found"
fi

# Test 3: Commands directory exists
if [ -d "$PAI_DIR/commands" ]; then
    command_count=$(find "$PAI_DIR/commands" -type f -name "*.md" | wc -l | tr -d ' ')
    print_success "Found $command_count commands"
else
    print_warning "Commands directory not found"
fi

# Test 4: Environment variables
if [ -n "$PAI_DIR" ]; then
    print_success "PAI_DIR environment variable is set"
else
    print_warning "PAI_DIR environment variable not set in this session"
    print_info "It will be available after you restart your terminal"
fi

# Test 5: .env file
if [ -f "$PAI_DIR/.env" ]; then
    print_success ".env file exists"
else
    print_warning ".env file not found"
fi

# Test 6: Claude Code integration
if [ -L "$HOME/.claude/settings.json" ]; then
    print_success "Claude Code integration configured"
elif [ -f "$HOME/.claude/settings.json" ]; then
    print_info "Claude Code settings exist (not linked to PAI)"
else
    print_info "Claude Code settings not configured"
fi

# Test 7: Hooks symlink
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

# Test 8: Skills symlink
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

# Test 9: Scratchpad directory
if [ -d "$HOME/.claude/scratchpad" ]; then
    print_success "Scratchpad directory exists"
else
    print_warning "Scratchpad directory not found"
fi

# Test 10: Cargo (Rust) installation
if command_exists cargo; then
    print_success "Cargo (Rust) is available"
else
    print_info "Cargo not installed (optional, needed for fd, ripgrep, bat, and ast-grep)"
fi

# Test 11: fd installation
if command_exists fd; then
    print_success "fd is available (preferred file finder)"
else
    print_info "fd not installed (optional, but recommended for file searches)"
fi

# Test 12: ast-grep installation
if command_exists ast-grep || command_exists sg; then
    print_success "ast-grep is available (semantic code search)"
else
    print_info "ast-grep not installed (optional, but recommended for code work)"
fi

# Test 13: ripgrep installation
if command_exists rg; then
    print_success "ripgrep is available (preferred text search)"
else
    print_info "ripgrep not installed (optional, but recommended for text searches)"
fi

# Test 14: bat installation
if command_exists bat; then
    print_success "bat is available (preferred file viewer)"
else
    print_info "bat not installed (optional, but recommended for viewing files)"
fi

# ============================================
# Final Success Message
# ============================================

print_header "${PARTY} Installation Complete! ${PARTY}"

echo -e "${GREEN}"
cat << "EOF"
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🎉 Congratulations! PAI is ready to use! 🎉      │
│                                                     │
└─────────────────────────────────────────────────────┘
EOF
echo -e "${NC}"

echo ""
echo "Here's what was set up:"
echo "  ✅ PAI installed to: $PAI_DIR"
echo "  ✅ Environment variables configured"
echo "  ✅ Skills and commands ready to use"
if [ -f "$PAI_DIR/.env" ]; then
    echo "  ✅ Environment file created"
fi
if [ -L "$HOME/.claude/settings.json" ]; then
    echo "  ✅ Claude Code integration configured"
fi
echo ""

print_header "Next Steps"

echo "1. ${CYAN}Restart your terminal${NC} (or run: source $SHELL_CONFIG)"
echo ""
echo "2. ${CYAN}Open Claude Code${NC} and try these commands:"
echo "   • 'Hey, tell me about yourself'"
echo "   • 'Research the latest AI developments'"
echo "   • 'What skills do you have?'"
echo ""
echo "3. ${CYAN}Customize PAI for you:${NC}"
echo "   • Edit: $PAI_DIR/skills/CORE/SKILL.md"
echo "   • Add API keys: $PAI_DIR/.env"
echo "   • Read the docs: $PAI_DIR/documentation/how-to-start.md"
echo ""

print_header "Quick Reference"

echo "Essential commands to remember:"
echo ""
echo "  ${CYAN}cd \$PAI_DIR${NC}                    # Go to PAI directory"
echo "  ${CYAN}cd \$PAI_DIR && git pull${NC}       # Update PAI to latest version"
echo "  ${CYAN}open -e \$PAI_DIR/.env${NC}         # Edit API keys"
echo "  ${CYAN}ls \$PAI_DIR/skills${NC}            # See available skills"
echo "  ${CYAN}source ~/.zshrc${NC}                # Reload environment"
echo ""

print_header "Resources"

echo "  📖 Documentation: $PAI_DIR/documentation/"
echo "  🌐 GitHub: https://github.com/danielmiessler/Personal_AI_Infrastructure"
echo "  📝 Blog: https://danielmiessler.com/blog/personal-ai-infrastructure"
echo "  🎬 Video: https://youtu.be/iKwRWwabkEc"
echo ""

print_header "Support"

echo "  🐛 Report issues: https://github.com/danielmiessler/Personal_AI_Infrastructure/issues"
echo "  💬 Discussions: https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions"
echo "  ⭐ Star the repo to support the project!"
echo ""

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${ROCKET} Welcome to PAI! You're now ready to augment your life with AI. ${ROCKET}${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

