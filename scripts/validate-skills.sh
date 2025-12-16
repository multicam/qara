#!/bin/bash
# validate-skills.sh - Validate skill directory structure
# Usage: ./scripts/validate-skills.sh

set -e

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
ERRORS=0
WARNINGS=0

echo "=== Validating Skills Structure in $PAI_DIR/skills ==="
echo ""

# Check each skill directory
for skill_dir in "$PAI_DIR/skills"/*/; do
    skill_name=$(basename "$skill_dir")
    
    # Skip hidden directories
    [[ "$skill_name" == .* ]] && continue
    
    echo "Checking: $skill_name"
    
    # Check for SKILL.md (required)
    if [[ ! -f "$skill_dir/SKILL.md" ]]; then
        echo "  ❌ Missing SKILL.md"
        ERRORS=$((ERRORS + 1))
    else
        # Check SKILL.md has frontmatter
        if ! head -1 "$skill_dir/SKILL.md" | grep -q "^---"; then
            echo "  ⚠️  SKILL.md missing frontmatter (---)"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        # Check SKILL.md has name field
        if ! grep -q "^name:" "$skill_dir/SKILL.md"; then
            echo "  ⚠️  SKILL.md missing 'name:' field"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        # Check SKILL.md has description field
        if ! grep -q "^description:" "$skill_dir/SKILL.md"; then
            echo "  ⚠️  SKILL.md missing 'description:' field"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
    
    # Check for empty directories (warning only)
    file_count=$(find "$skill_dir" -type f -name "*.md" | wc -l)
    if [[ $file_count -eq 0 ]]; then
        echo "  ⚠️  No .md files found"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check workflows directory if it exists
    if [[ -d "$skill_dir/workflows" ]]; then
        workflow_count=$(find "$skill_dir/workflows" -type f -name "*.md" -o -name "*.ts" | wc -l)
        if [[ $workflow_count -eq 0 ]]; then
            echo "  ⚠️  Empty workflows directory"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

echo ""
echo "=== Summary ==="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [[ $ERRORS -eq 0 ]]; then
    echo "✅ All skills have valid structure"
    exit 0
else
    echo "❌ Found $ERRORS structural errors"
    exit 1
fi
