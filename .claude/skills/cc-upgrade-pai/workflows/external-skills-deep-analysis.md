# External Skills Deep Analysis (PAI)

PAI-specific deep analysis of installed external skills. Extends the base
`cc-upgrade/workflows/external-skills-audit.md` with PAI-specific evaluation,
wrapping strategy, and enhancement planning.

## Prerequisites

→ READ: `../../cc-upgrade/workflows/external-skills-audit.md` for base methodology
→ READ: `../../cc-upgrade/references/skills-ecosystem-sources.md` for ecosystem context
→ READ: `../references/external-skills-registry.md` for current skill inventory

## When to Use

- After running `~/update-skills.sh` or `npx skills update`
- When planning to adopt new external skills into PAI
- When evaluating whether external skills conflict with local PAI conventions
- Quarterly deep review of external skill value and version drift
- When JM says "audit external skills", "analyze installed skills", "skill redundancies",
  "what external skills do we have", "skill hygiene"

---

## Workflow

> **ULTRATHINK MANDATE:** Every phase in this workflow requires extended thinking.
> External skills touch the entire PAI development environment. A bad skill
> recommendation compounds across every future session. Think deeply about:
> - Second-order effects (does adopting skill X make skill Y less useful?)
> - Context budget impact (every `context: same` skill eats into every conversation)
> - Convention conflicts (does the skill teach patterns that contradict PAI?)
> - Maintenance burden (who updates this if upstream dies?)

### Phase 1: Run Base Audit

Execute the base external-skills-audit workflow first:

```
→ READ & EXECUTE: ../../cc-upgrade/workflows/external-skills-audit.md
```

Capture the output — Phase 2 builds on it.

### Phase 2: PAI-Specific Skill Deep Dive

> **ULTRATHINK:** For each skill category below, consider not just "does it work"
> but "does it make PAI better or worse as a whole system?"

#### 2.1 Visual-Explainer Ecosystem Analysis (22 sub-skills)

**Read the actual SKILL.md** for each of these 22 skills. Don't rely on names alone.

**Evaluate each skill on 5 axes:**

| Axis | Question | Score |
|------|----------|-------|
| **Value** | Does PAI actually use this? Has it been invoked in the last 30 days? | 0-3 |
| **Uniqueness** | Does any local PAI skill cover the same ground? | 0-3 |
| **Convention Fit** | Does it follow PAI's design principles (CLI-first, TS > Python, etc.)? | 0-3 |
| **Context Cost** | How many tokens does loading this skill consume? | 0-3 |
| **Maintenance** | Is the upstream actively maintained? Last commit date? | 0-3 |

**Score interpretation:**
- 12-15: Keep as-is
- 8-11: Keep but consider wrapping for PAI conventions
- 4-7: Evaluate whether to wrap, adapt, or remove
- 0-3: Strong candidate for removal

**Specific checks for visual-explainer ecosystem:**

1. **Foundation skills (frontend-design, teach-impeccable):**
   - Is `frontend-design` still aligned with the `designer` agent prompt?
   - Has `.impeccable.md` been generated for any PAI project?
   - Do the anti-AI-slop patterns match PAI's aesthetic standards?

2. **Design creation skills (animate, arrange, typeset, clarify, colorize, delight):**
   - Are these used in any PAI project's frontend work?
   - Do they conflict with PAI's stack preferences (TS > Python)?
   - Would a subset (e.g., just typeset + arrange) suffice?

3. **Design evaluation skills (audit, critique, optimize, polish, harden):**
   - `audit` has a name collision with cc-upgrade's audit workflow — is routing clear?
   - `critique` overlaps with `grill-me` — is the boundary well-defined?
   - Are all 5 evaluation skills necessary, or could some merge?

4. **Amplification pair (bolder, quieter):**
   - How often are these actually used?
   - Could they be a single skill with a mode parameter?

5. **Specialized skills (adapt, normalize, onboard, overdrive, extract, distill):**
   - `overdrive` recommends bleeding-edge browser APIs — is this appropriate for PAI projects?
   - `extract` and `distill` are system-level — do they overlap with PAI's simplification philosophy?

#### 2.2 Matt Pocock Adaptations Review

**For each adapted skill:**

```bash
# Check latest upstream commits since our last review
gh api repos/mattpocock/skills/commits \
  --jq '.[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"' \
  | head -20
```

**Review each adaptation:**

| PAI Skill | Upstream Check | Questions |
|-----------|---------------|-----------|
| `grill-me` | Compare methodology sections | Has Matt added new probe patterns? |
| `design-it-twice` | Compare constraint definitions | Has the interface design approach evolved? |
| `edit-article` | Compare phases | Has Matt improved the editing pipeline? |
| `CORE/testing-guide.md` | Compare TDD methodology | New test patterns or approaches? |
| `CORE/references/deep-modules.md` | Compare module definitions | New depth criteria? |
| `CORE/references/mocking-guidelines.md` | Compare mocking rules | New anti-patterns discovered? |
| `CORE/references/interface-design.md` | Compare design principles | New interface patterns? |
| `CORE/references/refactoring-signals.md` | Compare refactoring triggers | New smell patterns? |
| `product-shaping/workflows/breakdown.md` | Compare vertical slicing | New breakdown methodology? |
| `agents/codebase-analyzer.md` | Compare analysis lens | New friction patterns? |

**Check for NEW upstream skills not yet evaluated:**

```bash
# List all current upstream skills
gh api repos/mattpocock/skills/contents/ --jq '.[].name' | sort
```

Compare against the "Upstream Skills NOT Yet Adopted" table in the registry.
Flag any new additions worth evaluating.

#### 2.3 Ecosystem Scanning

> **ULTRATHINK:** The agent skills ecosystem is exploding (280k+ on SkillsMP).
> Most are noise. Focus on: skills from trusted authors (Tier 1/2 in ecosystem sources),
> skills that solve problems PAI currently handles poorly, and skills that represent
> new Claude Code capabilities we haven't adopted yet.

**Scan trusted sources for new skills worth adopting:**

```bash
# Check awesome-agent-skills for new high-quality additions
gh api repos/VoltAgent/awesome-agent-skills/commits \
  --jq '.[0] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"'
```

**Evaluation criteria for new skills:**
→ READ: `../../cc-upgrade/references/skills-ecosystem-sources.md` — "Evaluation Criteria for New Skills" section

### Phase 3: Strategic Analysis

> **ULTRATHINK:** This is the most critical phase. You're not just auditing —
> you're shaping PAI's development capability surface. Every skill kept or removed
> changes what JM can accomplish efficiently.

#### 3.1 Redundancy Resolution

For each redundancy found in Phase 2:

1. **Measure actual usage** — grep session logs, check invocation history
2. **Compare quality** — read both skills, determine which is more complete
3. **Check maintenance** — which has a more active upstream?
4. **Decide: keep one, merge, or differentiate**
5. **Document the decision** in `../references/external-skills-registry.md`

#### 3.2 Enhancement Opportunities

For strong external skills that could be better:

| Enhancement Type | When | How |
|-----------------|------|-----|
| **Thin PAI wrapper** | Skill is good but needs PAI conventions | Create local SKILL.md that `→ READ:`s the external and adds PAI context |
| **Reference injection** | Skill is missing PAI-relevant references | Add `references/` dir with PAI-specific guidelines |
| **Agent integration** | Skill should be loaded by a specific agent | Update agent prompt to reference the skill |
| **Activation refinement** | Skill triggers too broadly or narrowly | Create wrapper with precise activation triggers |

#### 3.3 Removal Candidates

For skills scoring 0-3 in the evaluation:

1. **Check for hidden dependencies** — does any local skill `→ READ:` this?
2. **Check agent prompts** — does any agent load this skill?
3. **Check settings.json** — is it referenced in any hook or permission?
4. **If safe to remove:** unlink, update registry, update lock file

```bash
# Remove symlink (does NOT delete the source)
rm .claude/skills/<skill-name>

# Update lock file if needed
# (Only if removing the entire source, not just a sub-skill)
```

### Phase 4: Documentation Update

> **MANDATORY** — All analysis results must be persisted.

1. **Update `../references/external-skills-registry.md`:**
   - Refresh all version numbers, dates, hashes
   - Update overlap analysis tables
   - Update wrapping recommendations
   - Add/remove skills as needed
   - Update "Update History" section

2. **Update `../../cc-upgrade/references/skills-ecosystem-sources.md`:**
   - Add any new trusted sources discovered
   - Update star counts and activity levels
   - Add new evaluation results

3. **If skills were added/removed:**
   - Update CORE skill Documentation Index (if applicable)
   - Update `delegation-guide.md` (if agent routing changed)
   - Update MEMORY.md architecture counts

### Phase 5: Report

Generate the PAI External Skills Deep Analysis Report:

```markdown
# PAI External Skills Deep Analysis Report

**Date:** [YYYY-MM-DD]
**Analyst:** Qara (cc-upgrade-pai)
**Scope:** [Global + Project skills]

## Executive Summary
[2-3 sentences: overall health, key findings, urgency]

## Skill Inventory (Current State)
| Source | Skills | Symlinked | Adapted | Direct |
|--------|--------|-----------|---------|--------|
| nicobailon/visual-explainer | 22 | ? | 0 | 0 |
| mattpocock/skills | 10 | 0 | 10 | 0 |
| Local (PAI-built) | ? | 0 | 0 | ? |

## Deep Dive: Visual-Explainer Ecosystem
### Per-Skill Evaluation
| Skill | Value | Uniqueness | Convention Fit | Context Cost | Maintenance | Total | Action |
|-------|-------|-----------|---------------|-------------|------------|-------|--------|
| [each skill...] | 0-3 | 0-3 | 0-3 | 0-3 | 0-3 | /15 | keep/wrap/adapt/remove |

### Dependency Chain Impact
[What breaks if we remove X? What improves if we enhance Y?]

## Deep Dive: Matt Pocock Adaptations
### Upstream Drift Report
| PAI Skill | Last Synced | Upstream Changes | Action Needed |
|-----------|------------|-----------------|---------------|

### New Upstream Skills
| Skill | Purpose | Adoption Recommendation |
|-------|---------|------------------------|

## Ecosystem Scan Results
| Source | New Skills Found | Worth Evaluating |
|--------|-----------------|------------------|

## Redundancies
| Skills | Type | Resolution | Priority |
|--------|------|-----------|----------|

## Enhancement Opportunities
| Skill | Enhancement | Expected Impact | Effort |
|-------|------------|----------------|--------|

## Removal Candidates
| Skill | Score | Dependencies | Safe to Remove? |
|-------|-------|-------------|----------------|

## Recommendations (Prioritized)
1. [CRITICAL] ...
2. [HIGH] ...
3. [MEDIUM] ...
4. [LOW] ...

## Registry Updates Made
[List of changes applied to external-skills-registry.md]
```

### Phase 6: Web Research (Optional, Recommended Quarterly)

> **ULTRATHINK:** Best practices evolve. What was best-in-class 3 months ago
> may be superseded. Research proactively.

Launch parallel research agents:

```
Agent 1 (claude-researcher): "Best practices for managing Claude Code skills 2026,
  skill composition patterns, context engineering for skills"

Agent 2 (claude-researcher): "nicobailon visual-explainer latest features,
  mattpocock skills latest updates, agent skills specification changes"

Agent 3 (claude-researcher): "Claude Code skill redundancy management,
  skill lifecycle best practices, agent skill ecosystem trends"
```

Synthesize findings into actionable recommendations and update the registry.