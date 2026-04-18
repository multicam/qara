# External Skills Deep Analysis (PAI)

PAI-specific deep analysis extending `cc-upgrade/workflows/external-skills-audit.md` with PAI evaluation, wrapping strategy, and enhancement planning.

## Prerequisites

→ **READ:** `../../cc-upgrade/workflows/external-skills-audit.md` (base methodology)
→ **READ:** `../../cc-upgrade/references/skills-ecosystem-sources.md`
→ **READ:** `../references/external-skills-registry.md` (current inventory)

## When to Use

- After `~/update-skills.sh` or `npx skills update`
- When planning to adopt new external skills
- When evaluating conflicts with PAI conventions
- Quarterly deep review
- User says: "audit external skills", "analyze installed skills", "skill redundancies", "skill hygiene"

## Workflow

> **ULTRATHINK MANDATE:** External skills touch the entire PAI dev environment. Every phase requires extended thinking:
> - Second-order effects (adopting X makes Y less useful?)
> - Context budget (every `context: same` eats into every conversation)
> - Convention conflicts (does the skill contradict PAI patterns?)
> - Maintenance burden (who updates if upstream dies?)

### Phase 1: Run Base Audit

-> READ & EXECUTE: `../../cc-upgrade/workflows/external-skills-audit.md`

Capture output — Phase 2 builds on it.

### Phase 2: PAI Skill Deep Dive

#### 2.1 Visual-Explainer Ecosystem (22 sub-skills)

Read the actual SKILL.md for each. Don't rely on names alone.

**Evaluate on 5 axes (0-3 each):**

| Axis | Question |
|------|----------|
| Value | Invoked in last 30 days? |
| Uniqueness | Does any local skill cover same ground? |
| Convention Fit | Matches PAI principles (CLI-first, TS > Python)? |
| Context Cost | Tokens consumed when loaded? |
| Maintenance | Upstream active? Last commit? |

**Score interpretation:**
- 12-15: keep as-is
- 8-11: keep, consider wrapping
- 4-7: wrap, adapt, or remove
- 0-3: strong removal candidate

**Specific checks:**

1. **Foundation (impeccable — consolidates frontend-design + teach-impeccable + extract):** aligned with `designer` agent? `.impeccable.md` generated? Anti-AI-slop matches PAI aesthetic? `shape` skill used for pre-implementation planning?
2. **Design creation (animate, layout, typeset, clarify, colorize):** used in any frontend work? Conflicts with TS > Python? Could a subset suffice?
3. **Design evaluation (audit, critique, optimize, polish, harden):** `audit` collides with cc-upgrade `audit` workflow — routing clear? `critique` overlaps with `grill-me` — boundary defined? Could some merge? `polish` absorbed normalize+onboard in v2.1.1.
4. **Amplification (bolder, quieter):** usage frequency? Single skill with mode parameter?
5. **Specialized (adapt):** multi-device strategy still needed as a separate skill vs. folded into `impeccable craft`?

#### 2.2 Matt Pocock Adaptations Review

```bash
gh api repos/mattpocock/skills/commits \
  --jq '.[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"' \
  | head -20
```

**Review each adaptation:**

| PAI Skill | Compare | Questions |
|-----------|---------|-----------|
| `grill-me` | Methodology sections | New probe patterns? |
| `design-it-twice` | Constraint definitions | Interface approach evolved? |
| `edit-article` | Phases | Improved editing pipeline? |
| `CORE/testing-guide.md` | TDD methodology | New test patterns? |
| `CORE/references/deep-modules.md` | Module definitions | New depth criteria? |
| `CORE/references/mocking-guidelines.md` | Mocking rules | New anti-patterns? |
| `CORE/references/interface-design.md` | Design principles | New patterns? |
| `CORE/references/refactoring-signals.md` | Refactoring triggers | New smells? |
| `product-shaping/workflows/breakdown.md` | Vertical slicing | New methodology? |
| `agents/codebase-analyzer.md` | Analysis lens | New friction patterns? |

**Check for NEW upstream skills:**

```bash
gh api repos/mattpocock/skills/contents/ --jq '.[].name' | sort
```

Compare against "Upstream Skills NOT Yet Adopted" table in registry.

#### 2.3 Ecosystem Scanning

Focus on: trusted authors (Tier 1/2 in ecosystem sources), skills solving problems PAI handles poorly, new CC capabilities not yet adopted.

```bash
gh api repos/VoltAgent/awesome-agent-skills/commits \
  --jq '.[0] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"'
```

Evaluation criteria: → **READ:** `../../cc-upgrade/references/skills-ecosystem-sources.md` ("Evaluation Criteria for New Skills")

### Phase 3: Strategic Analysis

#### 3.1 Redundancy Resolution

For each redundancy from Phase 2:
1. Measure usage — grep session logs, check invocation history
2. Compare quality — read both, determine which is more complete
3. Check maintenance — which upstream is more active?
4. Decide: keep one, merge, or differentiate
5. Document in `../references/external-skills-registry.md`

#### 3.2 Enhancement Opportunities

| Enhancement | When | How |
|-------------|------|-----|
| Thin PAI wrapper | Skill good, needs PAI conventions | Local SKILL.md `-> READ:`s external, adds context |
| Reference injection | Missing PAI-relevant references | Add `references/` with PAI guidelines |
| Agent integration | Should load via specific agent | Update agent prompt to reference skill |
| Activation refinement | Triggers too broad/narrow | Wrapper with precise triggers |

#### 3.3 Removal Candidates

For skills scoring 0-3:
1. Check hidden dependencies — does any local skill `-> READ:` this?
2. Check agent prompts — does any load this skill?
3. Check settings.json — referenced in hooks/permissions?
4. If safe: unlink, update registry, update lock file

```bash
rm .claude/skills/<skill-name>
```

### Phase 4: Documentation Update (MANDATORY)

1. **Update `../references/external-skills-registry.md`:**
   - Refresh versions, dates, hashes
   - Update overlap analysis tables
   - Update wrapping recommendations
   - Add/remove skills
   - Append to "Update History"

2. **Update `../../cc-upgrade/references/skills-ecosystem-sources.md`:**
   - New trusted sources
   - Star counts, activity levels
   - New evaluation results

3. **If skills added/removed:**
   - Update CORE Documentation Index
   - Update `delegation-guide.md` (if agent routing changed)
   - Update MEMORY.md architecture counts

### Phase 5: Report

```markdown
# PAI External Skills Deep Analysis Report

**Date:** [YYYY-MM-DD]
**Analyst:** Qara (cc-upgrade-pai)
**Scope:** [Global + Project skills]

## Executive Summary
[2-3 sentences: health, key findings, urgency]

## Skill Inventory
| Source | Skills | Symlinked | Adapted | Direct |
|--------|--------|-----------|---------|--------|
| nicobailon/visual-explainer | 22 | ? | 0 | 0 |
| mattpocock/skills | 10 | 0 | 10 | 0 |
| Local (PAI-built) | ? | 0 | 0 | ? |

## Deep Dive: Visual-Explainer
### Per-Skill Evaluation
| Skill | Value | Uniq | Fit | Cost | Maint | Total | Action |
|-------|-------|------|-----|------|-------|-------|--------|

### Dependency Chain Impact
[What breaks if we remove X? What improves if we enhance Y?]

## Deep Dive: Matt Pocock Adaptations
### Upstream Drift
| PAI Skill | Last Synced | Upstream Changes | Action |
|-----------|-------------|------------------|--------|

### New Upstream Skills
| Skill | Purpose | Adoption Recommendation |
|-------|---------|------------------------|

## Ecosystem Scan
| Source | New Skills | Worth Evaluating |
|--------|-----------|------------------|

## Redundancies
| Skills | Type | Resolution | Priority |
|--------|------|-----------|----------|

## Enhancement Opportunities
| Skill | Enhancement | Impact | Effort |
|-------|-------------|--------|--------|

## Removal Candidates
| Skill | Score | Dependencies | Safe? |
|-------|-------|-------------|-------|

## Recommendations (Prioritized)
1. [CRITICAL] ...
2. [HIGH] ...
3. [MEDIUM] ...
4. [LOW] ...

## Registry Updates Made
[Changes applied to external-skills-registry.md]
```

### Phase 6: Web Research (Optional, Quarterly)

Launch parallel research agents:

```
Agent 1 (claude-researcher): "Best practices for managing Claude Code skills 2026,
  skill composition patterns, context engineering for skills"

Agent 2 (claude-researcher): "nicobailon visual-explainer latest features,
  mattpocock skills latest updates, agent skills specification changes"

Agent 3 (claude-researcher): "Claude Code skill redundancy management,
  skill lifecycle best practices, agent skill ecosystem trends"
```

Synthesize findings into recommendations; update registry.
