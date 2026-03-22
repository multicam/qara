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
echo "Checking: → READ patterns + inline backtick file references + READ: directives"
echo ""

# Placeholder patterns to ignore (examples in documentation)
IGNORE_PATTERNS="workflow[0-9]|\[.*\]|due-diligence|lookup|some-plan|YYYY|description\.md|skill-name"

# Find all .md files and check references
# Checks: "→ READ:" patterns, standalone "READ:" directives, backtick-quoted .md refs
while IFS= read -r file; do
    # Extract workflow references from routing patterns like:
    # → **READ:** ~/.claude/skills/research/workflows/conduct.md
    # → READ: ${PAI_DIR}/skills/CORE/SKILL.md
    # READ: .claude/skills/CORE/workflows/plan-template.md
    refs=$(grep -oE '(→.*READ|^\s*READ:).*[~/\.\$][^[:space:]]+\.md' "$file" 2>/dev/null | grep -oE '[^/]+\.md$' | sort -u || true)

    # Also extract backtick-quoted .md file references like `CONSTITUTION.md`
    # Only match UPPERCASE filenames (cross-cutting docs) that actually exist in the repo
    backtick_refs=$(grep -oE '`[A-Z][A-Z_-]*\.md`' "$file" 2>/dev/null | tr -d '`' | sort -u || true)
    # Filter: only keep backtick refs where the file exists somewhere in the repo
    filtered_backtick_refs=""
    for bref in $backtick_refs; do
        if fd -t f "^${bref}$" "$(dirname "$PAI_DIR")" --max-depth 5 --quiet 2>/dev/null; then
            filtered_backtick_refs="$filtered_backtick_refs $bref"
        fi
    done
    refs=$(printf '%s\n%s' "$refs" "$filtered_backtick_refs" | tr ' ' '\n' | sort -u | grep -v '^$' || true)
    
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
        elif [[ -f "$dir/references/$ref" ]]; then
            found=true
        elif [[ -f "$skill_dir/workflows/$ref" ]]; then
            found=true
        elif [[ -f "$skill_dir/references/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/workflows/$ref" ]]; then
            found=true
        elif [[ -f "$PAI_DIR/skills/CORE/references/$ref" ]]; then
            found=true
        elif [[ -f "$(dirname "$PAI_DIR")/$ref" ]]; then
            # Check parent of PAI_DIR (e.g., home dir)
            found=true
        elif [[ -f "$SCRIPT_DIR/../$ref" ]]; then
            # Check repo root (e.g., CONSTITUTION.md, DECISIONS.md)
            found=true
        fi

        # Search all skill directories as fallback (handles ../skill-name/ refs)
        if [[ "$found" == "false" ]]; then
            if fd -t f "$ref" "$PAI_DIR/skills" --max-depth 4 --quiet 2>/dev/null; then
                found=true
            fi
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
