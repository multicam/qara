# External Skills Audit Workflow

Generic workflow for auditing external skill dependencies in any `.claude/` setup.
Works with the `skills` CLI ecosystem, symlinked skills, and manually installed skills.

## Prerequisites

→ READ: `../references/skills-ecosystem-sources.md` for ecosystem context
→ READ: `../references/12-factor-checklist.md` for compliance criteria

## When to Use

- Periodic skill hygiene (monthly recommended)
- Before adopting new external skills
- After running `npx skills update` or `~/update-skills.sh`
- When context window pressure suggests too many skills are loading
- When skill behavior seems stale or broken

## Workflow

> **ULTRATHINK:** This workflow impacts the entire development environment.
> Use extended thinking at every analysis step — surface non-obvious interactions,
> second-order effects, and architectural implications.

### Phase 1: Discovery — Map the Skill Landscape

#### 1.1 Inventory All Skill Sources

```bash
# List globally installed skills (skills CLI)
npx skills ls -g 2>/dev/null

# List project-level skills
npx skills ls 2>/dev/null || true

# Find symlinked skills
find .claude/skills/ -maxdepth 1 -type l -exec readlink -f {} \;

# Check for lock file
cat ~/.agents/.skill-lock.json 2>/dev/null | jq '.skills | keys[]'
```

#### 1.2 Classify Each Skill

For every skill found, determine:

| Field | How to Check |
|-------|-------------|
| **Origin** | Lock file `source` field, or git remote in skill dir |
| **Author** | GitHub username from source URL |
| **Version** | `skillFolderHash` in lock file, or `version:` in SKILL.md |
| **Last Updated** | `updatedAt` in lock file, or `git log -1` in skill dir |
| **Context Type** | `context:` field in SKILL.md frontmatter |
| **Agent Compatibility** | Which agents list this skill (from `npx skills ls`) |
| **Local vs External** | Is it a symlink or a direct directory? |

#### 1.3 Build Dependency Graph

```markdown
| Skill | Depends On | Required By | Shared Context |
|-------|-----------|-------------|----------------|
| [name] | [prerequisites] | [consumers] | fork/same |
```

### Phase 2: Redundancy Analysis

> **ULTRATHINK:** Consider semantic overlap, not just name overlap.
> Two skills with different names may solve the same problem differently.

#### 2.1 Detect Functional Overlaps

For each pair of skills (external × external, external × local):

1. **Read both SKILL.md files** — don't just compare names
2. **Compare activation triggers** — do they respond to the same user intents?
3. **Compare capabilities** — does one subsume the other?
4. **Check for conflicting advice** — do they recommend contradictory patterns?

Classification:

| Overlap Type | Action |
|-------------|--------|
| **Full duplicate** | Remove one, document which and why |
| **Partial overlap** | Determine which is authoritative, wrap or delegate |
| **Complementary** | Keep both, document the boundary |
| **Conflicting** | Resolve conflict, adapt one to defer to the other |

#### 2.2 Context Window Impact Assessment

```bash
# Measure total skill footprint
for skill in .claude/skills/*/SKILL.md; do
  wc -l "$skill"
done | sort -rn
```

Flag skills that:
- Exceed 500 lines (progressive disclosure violation)
- Use `context: same` unnecessarily (loads into every conversation)
- Define overlapping activation triggers (ambiguous routing)
- Include inline content that should be in `references/`

### Phase 3: Feature Evaluation

> **ULTRATHINK:** Think about the compound effect of skill interactions.
> A weak skill can degrade a strong one if they share context space.

#### 3.1 Counterproductive Feature Detection

Check for external skills that:

| Anti-Pattern | Detection | Impact |
|-------------|-----------|--------|
| **Contradicts local conventions** | Compare advice against CLAUDE.md, CORE skill | Conflicting instructions confuse the model |
| **Pollutes context** | `context: same` with verbose content | Wastes context tokens on every conversation |
| **Stale upstream** | No updates in 60+ days, known issues open | May recommend deprecated patterns |
| **Agent mismatch** | Designed for Cursor/Copilot, not Claude Code | Instructions may not apply or may conflict |
| **Over-prescriptive** | Forces specific tools/frameworks | Conflicts with stack preferences |

#### 3.2 Strong Feature Identification

Identify external skills worth enhancing:

| Signal | Meaning |
|--------|---------|
| **Frequently activated** | High-value capability, worth investing in |
| **Unique methodology** | Teaches approach not covered by local skills |
| **Active upstream** | Author maintains and improves regularly |
| **Good progressive disclosure** | Well-structured with references/ |
| **Community-validated** | High install count, positive feedback |

#### 3.3 Wrapping Opportunity Analysis

For each strong external skill, evaluate:

1. **Direct use** — Symlink as-is, no modification needed
2. **Thin wrapper** — Local SKILL.md that adds PAI conventions then delegates
3. **Deep adaptation** — Rewrite for PAI (like mattpocock adaptations)
4. **Merge into existing** — Extract valuable parts into existing local skills

Decision matrix:

```
Is the external skill well-maintained?
  ├─ YES → Does it match PAI conventions?
  │   ├─ YES → Direct use (symlink)
  │   └─ NO → Is the gap small?
  │       ├─ YES → Thin wrapper
  │       └─ NO → Deep adaptation
  └─ NO → Is the methodology valuable?
      ├─ YES → Deep adaptation (fork and own)
      └─ NO → Consider removal
```

### Phase 4: Version Drift & Upstream Tracking

#### 4.1 Check for Updates

```bash
# For skills CLI managed skills
npx skills check 2>/dev/null

# For lock-file tracked skills
cat ~/.agents/.skill-lock.json | jq -r '.skills | to_entries[] | "\(.key): \(.value.sourceUrl) @ \(.value.skillFolderHash[0:7])"'

# For GitHub-sourced skills — check latest commit
gh api repos/OWNER/REPO/commits --jq '.[0].sha[0:7]'
```

#### 4.2 Changelog Review

When upstream has new commits:

1. **Read the diff** — What changed?
2. **Assess relevance** — Does it affect capabilities we use?
3. **Check for breaking changes** — Will update break our wrappers/adaptations?
4. **Decide: update, skip, or adapt** — Document the decision

### Phase 5: Report

Generate structured output:

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
| Skill | Strength | Enhancement Opportunity |
|-------|----------|------------------------|

## Wrapping Opportunities
| External Skill | Strategy | Effort | Priority |
|---------------|----------|--------|----------|

## Version Drift
| Skill | Local Version | Upstream | Behind By | Action |
|-------|--------------|----------|-----------|--------|

## Recommendations (Prioritized)
1. [HIGH] ...
2. [MED] ...
3. [LOW] ...
```