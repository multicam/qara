#!/bin/bash
# common.sh - Shared variables and functions for Qara scripts
#
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

# PAI directory resolution (defaults to ~/.claude)
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Qara directory
QARA_DIR="${QARA_DIR:-$HOME/qara}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print success message
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Print error message
error() {
    echo -e "${RED}✗${NC} $1"
}

# Print warning message
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Ensure a directory exists
ensure_dir() {
    if [[ ! -d "$1" ]]; then
        mkdir -p "$1"
    fi
}
