# Qara Maintenance Guide

## Validation Scripts

```bash
bash scripts/validate-skills.sh        # SKILL.md structure, frontmatter, required fields
bash scripts/check-references.sh       # Broken routing references (--verbose for all)
bash scripts/check-file-sizes.sh       # Files exceeding line limits (--warn-at=500)
```

Pre-commit hook runs these automatically: `cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`

## Monthly Checklist

- [ ] Run all 3 validation scripts
- [ ] Spot-check for redundancy (similar file names, overlapping content)
- [ ] Review files flagged as oversized

## Quarterly Checklist

- [ ] **Content audit:** Files >800 lines? Split. Duplicate concepts? Consolidate. Unused >6 months? Archive.
- [ ] **Structure audit:** All SKILL.md files have routing? Triggers clear? Cross-refs valid?
- [ ] **Usage analysis:** `git log --since="3 months ago" --name-only --pretty=format: .claude/skills/CORE/ | grep "\.md$" | sort | uniq -c | sort -rn`

## When Adding Content

**New workflow:** Create in `workflows/` → add routing to SKILL.md → test trigger phrases

**New guide:** Verify it can't fit in existing file → target 200-500 lines → add to SKILL.md Documentation Index

**New skill:** Copy `example-skill` template → create SKILL.md with frontmatter + routing → add `workflows/` dir

## File Size Guidelines

| Type | Target | Max |
|------|--------|-----|
| SKILL.md (CORE) | 300-500 | 800 |
| SKILL.md (others) | 200-400 | 600 |
| Guide files | 200-500 | 800 |
| Workflow files | 100-300 | 500 |

## Emergency: Broken References

```bash
bash scripts/check-references.sh    # Find broken refs
# Fix: update filename, remove ref, or restore deleted file
```
