#!/usr/bin/env bash
# check-references.sh - Verify all .md references in skills resolve correctly
# Usage: ./scripts/check-references.sh [--verbose]

set -e

# Source common variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

ERRORS=0
CHECKED=0

echo "=== Checking .md references in $PAI_DIR/skills ==="
echo ""
echo "Note: Only checking explicit workflow routing references (→ READ patterns)"
echo ""

# Placeholder patterns to ignore (examples in documentation)
IGNORE_PATTERNS="workflow[0-9]|\[.*\]|due-diligence|lookup"

# Find all .md files and check workflow routing references
# Only check lines that contain "→ READ:" or "→ **READ:**" patterns
while IFS= read -r file; do
    # Extract workflow references from routing patterns like:
    # → **READ:** ~/.claude/skills/research/workflows/conduct.md
    # → READ: ${PAI_DIR}/skills/CORE/SKILL.md
    refs=$(grep -oE '→.*READ.*[~/\$][^[:space:]]+\.md' "$file" 2>/dev/null | grep -oE '[^/]+\.md$' | sort -u || true)
    
    for ref in $refs; do
        # Skip placeholder/example patterns
        if echo "$ref" | grep -qE "$IGNORE_PATTERNS"; then
            continue
        fi
        
        CHECKED=$((CHECKED + 1))
        dir=$(dirname "$file")
        skill_dir=$(dirname "$dir")
        
        # Check if reference exists in likely locations
        found=false
        
        if [[ -f "$dir/$ref" ]]; then
            found=true
        elif [[ -f "$dir/workflows/$ref" ]]; then
            found=true
        elif [[ -f "$skill_dir/workflows/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/workflows/$ref" ]]; then
            found=true
        fi
        
        if [[ "$found" == "false" ]]; then
            echo "❌ Broken workflow reference in $(basename "$file"): $ref"
            echo "   File: $file"
            ERRORS=$((ERRORS + 1))
        elif [[ "$VERBOSE" == "true" ]]; then
            echo "✓ $ref (in $file)"
        fi
    done
done < <(fd -e md -t f . "$PAI_DIR/skills" --exclude node_modules 2>/dev/null)

echo ""
echo "=== Summary ==="
echo "References checked: $CHECKED"
echo "Broken references: $ERRORS"

if [[ $ERRORS -eq 0 ]]; then
    echo "✅ All references valid"
    exit 0
else
    echo "❌ Found $ERRORS broken references"
    exit 1
fi
