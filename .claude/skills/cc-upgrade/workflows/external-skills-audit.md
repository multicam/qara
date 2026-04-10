# External Skills Audit Workflow

Generic audit of external skill dependencies in any `.claude/` setup. Works with `skills` CLI, symlinked skills, manually installed skills.

## Prerequisites

-> READ: `../references/skills-ecosystem-sources.md`
-> READ: `../references/12-factor-checklist.md`

## When to Use

- Monthly skill hygiene
- Before adopting new external skills
- After `npx skills update` or `~/update-skills.sh`
- When context window pressure suggests skill overload
- When skill behavior seems stale or broken

## Workflow

> **ULTRATHINK:** Impacts entire dev environment. Use extended thinking at every analysis step — surface non-obvious interactions, second-order effects, architectural implications.

### Phase 1: Discovery

#### 1.1 Inventory Sources

```bash
# Globally installed (skills CLI)
npx skills ls -g 2>/dev/null

# Project-level
npx skills ls 2>/dev/null || true

# Symlinked
find .claude/skills/ -maxdepth 1 -type l -exec readlink -f {} \;

# Lock file
cat ~/.agents/.skill-lock.json 2>/dev/null | jq '.skills | keys[]'
```

#### 1.2 Classify Each Skill

| Field | Source |
|-------|--------|
| Origin | Lock file `source` field, or git remote |
| Author | GitHub username from source URL |
| Version | `skillFolderHash` in lock file, or `version:` in SKILL.md |
| Last Updated | `updatedAt` in lock file, or `git log -1` |
| Context Type | `context:` in SKILL.md frontmatter |
| Agent Compatibility | Which agents list this skill (`npx skills ls`) |
| Local vs External | Symlink or direct directory? |

#### 1.3 Dependency Graph

```markdown
| Skill | Depends On | Required By | Shared Context |
|-------|-----------|-------------|----------------|
```

### Phase 2: Redundancy Analysis

> **ULTRATHINK:** Consider semantic overlap, not just names. Two skills with different names may solve the same problem differently.

#### 2.1 Functional Overlaps

For each pair (external x external, external x local):

1. Read both SKILL.md — don't just compare names
2. Compare activation triggers — same user intents?
3. Compare capabilities — does one subsume the other?
4. Check for conflicting advice

| Overlap | Action |
|---------|--------|
| Full duplicate | Remove one, document which and why |
| Partial | Determine authoritative, wrap or delegate |
| Complementary | Keep both, document boundary |
| Conflicting | Resolve, adapt one to defer to the other |

#### 2.2 Context Window Impact

```bash
for skill in .claude/skills/*/SKILL.md; do
  wc -l "$skill"
done | sort -rn
```

Flag skills that:
- Exceed 500 lines (progressive disclosure violation)
- Use `context: same` unnecessarily (loads into every conversation)
- Define overlapping activation triggers (ambiguous routing)
- Include inline content belonging in `references/`

### Phase 3: Feature Evaluation

#### 3.1 Counterproductive Features

| Anti-Pattern | Detection | Impact |
|-------------|-----------|--------|
| Contradicts local conventions | Compare against CLAUDE.md, CORE | Conflicting instructions confuse model |
| Pollutes context | `context: same` + verbose | Wastes tokens every conversation |
| Stale upstream | No updates 60+ days | May recommend deprecated patterns |
| Agent mismatch | Designed for Cursor/Copilot | Instructions may not apply |
| Over-prescriptive | Forces specific tools/frameworks | Conflicts with stack preferences |

#### 3.2 Strong Features

| Signal | Meaning |
|--------|---------|
| Frequently activated | High-value capability |
| Unique methodology | Approach not covered locally |
| Active upstream | Author maintains regularly |
| Good progressive disclosure | Well-structured with `references/` |
| Community-validated | High installs, positive feedback |

#### 3.3 Wrapping Decision Matrix

```
Well-maintained?
  YES -> Matches PAI conventions?
    YES -> Direct use (symlink)
    NO  -> Gap small?
      YES -> Thin wrapper
      NO  -> Deep adaptation
  NO -> Methodology valuable?
    YES -> Deep adaptation (fork and own)
    NO  -> Consider removal
```

Options: direct use | thin wrapper | deep adaptation | merge into existing.

### Phase 4: Version Drift

#### 4.1 Check Updates

```bash
# Skills CLI managed
npx skills check 2>/dev/null

# Lock-file tracked
cat ~/.agents/.skill-lock.json | jq -r '.skills | to_entries[] | "\(.key): \(.value.sourceUrl) @ \(.value.skillFolderHash[0:7])"'

# GitHub-sourced latest commit
gh api repos/OWNER/REPO/commits --jq '.[0].sha[0:7]'
```

#### 4.2 Changelog Review

When upstream has new commits:
1. Read the diff
2. Assess relevance — affects capabilities we use?
3. Check breaking changes — will it break wrappers/adaptations?
4. Decide: update, skip, or adapt — document the decision

### Phase 5: Report

```markdown
# External Skills Audit Report

## Inventory
| Skill | Source | Version | Last Updated | Status |
|-------|--------|---------|-------------|--------|

## Redundancies Found
| Skills | Overlap Type | Recommendation |
|--------|-------------|----------------|

## Counterproductive Features
| Skill | Issue | Impact | Action |
|-------|-------|--------|--------|

## Strong Features to Enhance
| Skill | Strength | Enhancement |
|-------|----------|-------------|

## Wrapping Opportunities
| External Skill | Strategy | Effort | Priority |
|---------------|----------|--------|----------|

## Version Drift
| Skill | Local | Upstream | Behind By | Action |
|-------|-------|----------|-----------|--------|

## Recommendations (Prioritized)
1. [HIGH] ...
2. [MED] ...
3. [LOW] ...
```
