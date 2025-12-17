# Qara Simplification Plan for Claude Code 2.0.71

**Created:** 2025-12-17  
**Status:** Draft  
**Purpose:** Align qara's architecture with Claude Code 2.0.71 native capabilities while preserving unique value

---

## Executive Summary

Claude Code 2.0.71 (released 2025-12-16) introduces native features that overlap with some of qara's custom infrastructure. This plan identifies what to keep, simplify, and remove to reduce complexity while maintaining qara's unique value proposition.

**Key insight:** Qara's *philosophy* (CLI-First, Code Before Prompts, Progressive Disclosure) aligns perfectly with Anthropic's recommendations. The redundancy is in *documentation about how CC works*, not in qara's core architecture.

---

## Reference Sources

### Claude Code 2.0.71 Master Prompt
- **Source:** https://github.com/marckrenn/cc-mvp-prompts/blob/main/cc-prompt.md
- **Key features:**
  - Native `Skill` tool for invoking skills by name
  - Native `Task` tool with subagent types (`general-purpose`, `Explore`, `Plan`)
  - `TodoWrite` as first-class task management
  - Automatic context summarization ("unlimited context through summarization")
  - Strong anti-over-engineering guidance

### Anthropic Official Documentation

#### Agent Skills Documentation
- **URL:** https://code.claude.com/docs/en/skills
- **Key points:**
  - Skills are directories with `SKILL.md` files
  - YAML frontmatter: `name` and `description` (max 1024 chars)
  - Progressive disclosure: metadata → SKILL.md body → linked files
  - `allowed-tools` field for restricting tool access
  - Best practices: Keep skills focused, write clear descriptions

#### Claude Code Best Practices
- **URL:** https://www.anthropic.com/engineering/claude-code-best-practices
- **Key points:**
  - Create and tune `CLAUDE.md` files for project-specific context
  - Use custom slash commands in `.claude/commands/`
  - Use checklists and scratchpads for complex workflows
  - Multi-Claude workflows: one writes, another verifies
  - Git worktrees for parallel development

#### Claude Code Plugins
- **URL:** https://claude.com/blog/claude-code-plugins
- **Key points:**
  - Plugins bundle: slash commands, subagents, MCP servers, hooks
  - Install via `/plugin` command
  - Plugin marketplaces for sharing
  - Toggle on/off to reduce system prompt complexity

#### Building Effective Agents
- **URL:** https://www.anthropic.com/research/building-effective-agents
- **Key points:**
  - "Find the simplest solution possible, only increase complexity when needed"
  - Workflows (predefined code paths) vs Agents (dynamic LLM control)
  - Patterns: Prompt chaining, Routing, Parallelization, Orchestrator-workers
  - "Agents are typically just LLMs using tools based on environmental feedback in a loop"
  - Three principles: Simplicity, Transparency, Careful ACI design

#### Equipping Agents with Skills
- **URL:** https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- **Key points:**
  - "Progressive disclosure is the core design principle"
  - Skills = "organized folders of instructions, scripts, and resources"
  - Three levels: metadata (always loaded) → SKILL.md body → linked files
  - Skills can include executable code/scripts
  - "Start with evaluation: identify gaps before building skills"

---

## Analysis: Qara vs CC 2.0.71

### What Qara Does That CC 2.0.71 Now Does Natively

| Qara Feature | CC 2.0.71 Native | Redundancy Level |
|--------------|------------------|------------------|
| 4-level routing hierarchy | Skill tool with description matching | HIGH |
| Custom agent hierarchy (intern/engineer) | Task tool with subagent_type | MEDIUM |
| Parallel agent delegation docs | Task tool parallelization | MEDIUM |
| Context compression hooks | Automatic summarization | MEDIUM |
| Routing map documentation | Native skill discovery | HIGH |

### What Qara Does That CC 2.0.71 Does NOT Do

| Qara Feature | Why Unique | Keep? |
|--------------|------------|-------|
| CONSTITUTION.md (8 principles) | Project philosophy, not in CC | ✅ YES |
| CLI-First architecture | Project-specific pattern | ✅ YES |
| Security protocols (multi-repo) | Project-specific safety | ✅ YES |
| Jean-Marc identity/contacts | Personal context | ✅ YES |
| Spotcheck pattern | Quality verification after parallel work | ✅ YES |
| Hook implementations | Custom event handlers | ✅ YES |

---

## Simplification Plan

### Phase 1: Accurate Inventory & Quick Wins

**Estimated effort:** 2 hours  
**Estimated reduction:** ~5KB (conservative)

#### 1.1 Verified Skills Inventory (via `find` command)

**Total: 14 skills, 146 content files (excluding node_modules), ~1.38 MB**

| Skill | Total Size | Files | Notes |
|-------|------------|-------|-------|
| `CORE/` | 388 KB | 28 | Main skill + 21 reference docs + 7 workflows |
| `art/` | 251 KB | 19 | SKILL.md + 14 workflows + tools |
| `agent-observability/` | 168 KB | 28 | Includes Vue app in apps/ |
| `finance-charts/` | 99 KB | 15 | Includes chart-app with node_modules |
| `story-explanation/` | 98 KB | 12 | SKILL.md + 6 workflows + subdir |
| `research/` | 83 KB | 11 | SKILL.md + 10 workflows (.md and .ts) |
| `fabric/` | 83 KB | 5 | SKILL.md + 3 large reference files |
| `system-create-cli/` | 71 KB | 7 | SKILL.md + 3 workflows + 3 pattern files |
| `system-create-skill/` | 70 KB | 5 | SKILL.md + 4 workflows |
| `example-skill/` | 23 KB | 7 | Template skill with assets |
| `brightdata/` | 21 KB | 3 | SKILL.md + README + 1 workflow |
| `alex-hormozi-pitch/` | 13 KB | 2 | SKILL.md + 1 workflow |
| `prompting/` | 5 KB | 3 | SKILL.md + 2 workflows |
| `frontend-design/` | 4 KB | 1 | SKILL.md only |

#### 1.2 Key Finding: Orphaned Documentation

**SKILL-STRUCTURE-AND-ROUTING.md (77KB) contains documentation for skills that DON'T EXIST in this repo:**
- `system/` - referenced but doesn't exist
- `development/` - referenced but doesn't exist  
- `writing/` - referenced but doesn't exist
- `social/` - referenced but doesn't exist
- `media/` - referenced but doesn't exist
- `business/` - referenced but doesn't exist
- `personal/` - referenced but doesn't exist
- `extract-alpha/` - referenced but doesn't exist

This suggests the file was copied from a larger PAI installation and contains ~400 lines of irrelevant skill ecosystem documentation.

#### 1.3 Actual Duplicate/Redundant Files

**contacts-full.md is a redirect file (1KB):**
- `CORE/workflows/contacts-full.md` - Just says "see contacts.md"
- **Action:** Delete contacts-full.md (it's just a pointer)

**cli-first files are complementary, NOT duplicates:**
- `cli-first-guide.md` (16KB) - Patterns and best practices
- `cli-first-examples.md` (17KB) - Real-world examples
- **Action:** Keep both OR merge if desired, but not redundant

**agent-guide.md and delegation-guide.md are complementary:**
- `agent-guide.md` (11KB) - Agent hierarchy and roles
- `delegation-guide.md` (11KB) - Task decomposition patterns
- **Action:** Keep both, they serve different purposes

#### 1.4 Empty Directories

**Only truly empty directories (verified via `find -type d -empty`):**
```
.claude/skills/agent-observability/apps/client/node_modules/.vite-temp
.claude/skills/agent-observability/apps/client/node_modules/.vite
```
These are build artifacts, not structural issues.

---

### Phase 2: SKILL-STRUCTURE-AND-ROUTING.md Cleanup (Primary Target)

**Estimated effort:** 3-4 hours  
**Estimated reduction:** ~40-50KB (from 77KB)

#### 2.1 The Problem

`SKILL-STRUCTURE-AND-ROUTING.md` is 77KB (2,356 lines) and contains:

**Useful qara-specific content (~25KB, lines 1-1549):**
- Mandatory skill structure requirements
- Canonical SKILL.md template
- 4-level routing hierarchy explanation
- Canonical directory structure
- Routing patterns
- Workflow organization
- Practical guides
- Quick reference

**Orphaned skill ecosystem documentation (~25KB, lines 1550-1964):**
- Documents skills that DON'T EXIST in this repo
- References: system, development, writing, social, media, business, personal, extract-alpha
- This entire section should be removed

**Research notes that don't belong (~15KB, lines 1965-2302):**
- "Skill Management Operations" and research summaries
- Working notes, not reference documentation

#### 2.2 Recommended Actions

**Option A: Surgical removal (~40KB reduction)**
- Remove lines 1550-2302 (orphaned ecosystem + research notes)
- Keep lines 1-1549 (actual routing documentation)
- Result: ~35KB file focused on routing patterns

**Option B: Split into focused files**
- `skill-structure.md` - Structure requirements and templates (~15KB)
- `routing-patterns.md` - 4-level hierarchy and patterns (~20KB)
- Delete orphaned content
- Result: Two focused files totaling ~35KB

#### 2.3 Other CORE Files - Revised Analysis

**Files that are qara-specific and should be KEPT AS-IS:**

| File | Size | Reason to Keep |
|------|------|----------------|
| `CONSTITUTION.md` | 32KB | Core philosophy, unique to qara |
| `SKILL.md` | 14KB | Main skill definition |
| `cli-first-guide.md` | 16KB | Qara's CLI-first architecture |
| `cli-first-examples.md` | 17KB | Practical examples (complementary, not duplicate) |
| `security-protocols.md` | 11KB | Multi-repo safety |
| `testing-guide.md` | 16KB | Project-specific testing |
| `stack-preferences.md` | 10KB | Technology choices |
| `contacts.md` | 5KB | Personal context |
| `MY_DEFINITIONS.md` | 9KB | Personal definitions |
| `aesthetic.md` | 11KB | Design preferences |

**Files with potential CC overlap but contain qara-specific value:**

| File | Size | Analysis |
|------|------|----------|
| `hook-system.md` | 25KB | Documents qara's CUSTOM hooks - NOT generic. **KEEP** |
| `agent-guide.md` | 11KB | Qara's agent hierarchy. Extends CC's Task tool. **KEEP** |
| `delegation-guide.md` | 11KB | Spotcheck pattern, task decomposition. **KEEP** |
| `parallel-execution.md` | 17KB | CLI-specific patterns. **REVIEW for trim** |
| `mcp-guide.md` | 13KB | Two-tier MCP strategy. Unique. **KEEP** |
| `history-system.md` | 12KB | UOCS documentation. **KEEP** |
| `prompting.md` | 16KB | Fabric integration. **KEEP** |
| `TOOLS.md` | 20KB | PAI tools inventory. **KEEP** |

**Conclusion:** Most CORE files are qara-specific. Main simplification target is removing orphaned content from `SKILL-STRUCTURE-AND-ROUTING.md`.

---

### Phase 3: Minor Cleanup (Low Priority)

**Estimated effort:** 1 hour  
**Estimated reduction:** ~2KB

#### 3.1 Delete contacts-full.md redirect file

`CORE/workflows/contacts-full.md` (1KB) is just a pointer saying "see contacts.md". Delete it.

#### 3.2 ROUTING_MAP.md Assessment

`ROUTING_MAP.md` (14KB) in `.claude/` provides a quick reference for skill activation. 

**Recommendation:** KEEP as-is. It's a useful navigation aid that complements (not duplicates) CC's native routing.

#### 3.3 Consider Future Consolidation

These pairs could potentially be merged in the future, but are NOT duplicates:
- `cli-first-guide.md` + `cli-first-examples.md` → Could become single `cli-first.md`
- `agent-guide.md` + `delegation-guide.md` → Could become single `agents.md`

**Recommendation:** Keep separate for now. They serve different purposes and merging adds risk without significant benefit.

---

## Revised Summary

### What to Actually Do

| Action | Target | Reduction | Risk |
|--------|--------|-----------|------|
| Remove orphaned content from SKILL-STRUCTURE-AND-ROUTING.md | Lines 1550-2302 | ~40KB | Low |
| Delete contacts-full.md redirect | 1 file | ~1KB | None |
| **Total** | | **~41KB** | Low |

### What to KEEP (Previously Marked for Simplification)

| File | Size | Why Keep |
|------|------|----------|
| `hook-system.md` | 25KB | Documents qara's CUSTOM hooks, not generic CC hooks |
| `agent-guide.md` | 11KB | Qara's agent hierarchy extends CC's Task tool |
| `delegation-guide.md` | 11KB | Spotcheck pattern is qara-specific |
| `parallel-execution.md` | 17KB | CLI-specific patterns, not just Promise.all |
| `ROUTING_MAP.md` | 14KB | Useful navigation aid |
| All other CORE files | ~200KB | Project-specific, no CC overlap |

### Files to Modify Summary

| File | Current | After | Action |
|------|---------|--------|--------|
| `SKILL-STRUCTURE-AND-ROUTING.md` | 77KB | ~35KB | Remove lines 1550-2302 |
| `contacts-full.md` | 1KB | DELETE | It's just a redirect |

---

## Risk Assessment (Revised)

### Low Risk
- Removing orphaned skill documentation from SKILL-STRUCTURE-AND-ROUTING.md
- Deleting contacts-full.md redirect

### NOT Recommended (Previously Suggested)
- ~~Merging agent-guide.md + delegation-guide.md~~ - Different purposes
- ~~Trimming hook-system.md~~ - Documents custom hooks
- ~~Simplifying parallel-execution.md~~ - CLI-specific content
- ~~Deleting empty skill directories~~ - None exist

**Mitigation:** 
- Git commit before changes
- Test skill activation after changes

---

## Success Criteria

1. **Skill activation still works** - Test each skill triggers correctly
2. **No lost functionality** - All workflows still accessible
3. **Cleaner SKILL-STRUCTURE-AND-ROUTING.md** - No orphaned references
4. **Accurate documentation** - References only skills that exist

---

## Revised Summary Table

| Category | Current | After | Change |
|----------|---------|-------|--------|
| CORE files to keep | 388KB | 388KB | 0 |
| SKILL-STRUCTURE-AND-ROUTING.md | 77KB | ~35KB | -42KB |
| contacts-full.md | 1KB | 0 | -1KB |
| **Total CORE** | ~389KB | ~346KB | **-43KB (11%)** |
| Other skills | ~990KB | ~990KB | 0 |
| **Grand Total** | ~1.38MB | ~1.34MB | **-43KB (3%)** |

**Note:** The original plan overestimated simplification opportunities. Most qara content is project-specific and should be preserved.

---

## Next Steps

1. [x] Review this revised plan
2. [x] Create backup: `cp -r .claude/skills/CORE wip/cc-2.0.71/backup/` ✅ **DONE 2025-12-17 20:02** (28 files backed up)
3. [x] Remove orphaned content from SKILL-STRUCTURE-AND-ROUTING.md ✅ **DONE 2025-12-17 20:04**
   - Removed lines 1550-2356 (807 lines, 29KB)
   - Original: 2,355 lines, 77KB
   - New: 1,549 lines, 48KB
   - Removed: "Skill Ecosystem Reference" (documented non-existent skills) + research notes
4. [x] Delete contacts-full.md redirect file ✅ **DONE 2025-12-17 20:05**
   - Deleted `.claude/skills/CORE/workflows/contacts-full.md` (1KB redirect file)
   - CORE/workflows/ now has 6 files (was 7)
5. [x] Test skill activation for all 14 skills ✅ **DONE 2025-12-17 20:06**
   - All 14 skills validated: valid SKILL.md with name and description
   - Fixed 2 broken references in CORE/SKILL.md (contacts-full.md → contacts.md)
6. [x] Commit changes ✅ **DONE 2025-12-17 20:07**
   - Commit: d292652
   - 4 files changed, 16 insertions(+), 861 deletions(-)

---

## Appendix: Key Quotes from Anthropic

### On Simplicity
> "When building applications with LLMs, we recommend finding the simplest solution possible, and only increasing complexity when needed."
> — Building Effective Agents

### On Progressive Disclosure
> "Progressive disclosure is the core design principle that makes Agent Skills flexible and scalable. Like a well-organized manual that starts with a table of contents, then specific chapters, and finally a detailed appendix, skills let Claude load information only as needed."
> — Equipping Agents with Skills

### On Skill Descriptions
> "Include both what the Skill does and when to use it in the description."
> — Agent Skills Documentation

### On Over-Engineering
> "Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task."
> — Claude Code 2.0.71 System Prompt

### On CLAUDE.md
> "Your CLAUDE.md files become part of Claude's prompts, so they should be refined like any frequently used prompt. A common mistake is adding extensive content without iterating on its effectiveness."
> — Claude Code Best Practices
