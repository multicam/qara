#!/bin/bash
# check-file-sizes.sh - Monitor file sizes and flag oversized files
# Usage: ./scripts/check-file-sizes.sh [--warn-at=400]

set -e

WARN_THRESHOLD=${1:-400}
if [[ "$1" == --warn-at=* ]]; then
    WARN_THRESHOLD="${1#--warn-at=}"
fi

PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== File Size Analysis for $PAI_DIR/skills ==="
echo "Warning threshold: $WARN_THRESHOLD lines"
echo ""

# Count files in each category
small=0
medium=0
large=0
oversized=0
total=0

echo "=== Oversized Files (>$WARN_THRESHOLD lines) ==="
while IFS= read -r file; do
    lines=$(wc -l < "$file")
    total=$((total + 1))
    
    if [[ $lines -le 200 ]]; then
        small=$((small + 1))
    elif [[ $lines -le 400 ]]; then
        medium=$((medium + 1))
    elif [[ $lines -le $WARN_THRESHOLD ]]; then
        large=$((large + 1))
    else
        oversized=$((oversized + 1))
        relpath="${file#$PAI_DIR/}"
        echo "⚠️  $relpath ($lines lines)"
    fi
done < <(fd -e md -t f . "$PAI_DIR/skills" --exclude node_modules 2>/dev/null)

echo ""
echo "=== Size Distribution ==="
echo "Small (≤200 lines):     $small files"
echo "Medium (201-400 lines): $medium files"
echo "Large (401-$WARN_THRESHOLD lines):  $large files"
echo "Oversized (>$WARN_THRESHOLD lines): $oversized files"
echo "─────────────────────────"
echo "Total:                  $total files"

if [[ $oversized -eq 0 ]]; then
    echo ""
    echo "✅ No oversized files"
    exit 0
else
    echo ""
    echo "⚠️  $oversized files exceed $WARN_THRESHOLD lines"
    exit 1
fi
