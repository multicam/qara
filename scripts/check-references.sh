#!/bin/bash
# check-references.sh - Verify all .md references in skills resolve correctly
# Usage: ./scripts/check-references.sh [--verbose]

set -e

VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

ERRORS=0
CHECKED=0
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== Checking .md references in $PAI_DIR/skills ==="
echo ""

# Find all .md files and check their references
while IFS= read -r file; do
    # Extract .md references (words ending in .md)
    refs=$(grep -oE '[a-zA-Z0-9_-]+\.md' "$file" 2>/dev/null | sort -u || true)
    
    for ref in $refs; do
        CHECKED=$((CHECKED + 1))
        dir=$(dirname "$file")
        
        # Check if reference exists in same directory, workflows subdir, or templates
        found=false
        
        if [[ -f "$dir/$ref" ]]; then
            found=true
        elif [[ -f "$dir/workflows/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/workflows/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/templates/$ref" ]]; then
            found=true
        fi
        
        if [[ "$found" == "false" ]]; then
            echo "❌ Broken reference in $(basename "$file"): $ref"
            echo "   File: $file"
            ERRORS=$((ERRORS + 1))
        elif [[ "$VERBOSE" == "true" ]]; then
            echo "✓ $ref (in $file)"
        fi
    done
done < <(find "$PAI_DIR/skills" -name "*.md" -type f -not -path "*/node_modules/*" 2>/dev/null)

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
