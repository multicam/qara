# Qara Routing Map

**Quick reference for skill activation and workflow routing**

**Last Updated:** 2025-12-01  
**Purpose:** Navigate Qara's skill and workflow system efficiently

---

## Table of Contents

1. [User Intent → Skill Activation](#user-intent--skill-activation)
2. [CORE Skill Routing](#core-skill-routing)
3. [Research Skill Routing](#research-skill-routing)
4. [Other Skills Routing](#other-skills-routing)
5. [Context Loading Triggers](#context-loading-triggers)
6. [Template Usage](#template-usage)

---

## User Intent → Skill Activation

**Quick lookup: What skill activates when?**

| User Says | Activate Skill | Primary Action |
|-----------|---------------|----------------|
| "do research on X" | research | Multi-source parallel research |
| "extract wisdom" | research | Fabric pattern processing |
| "find information about" | research | Comprehensive research workflow |
| "update qara repo" | CORE | Git workflow |
| "use parallel interns" | CORE | Delegation workflow |
| "switch MCP profile" | CORE | MCP profile management |
| "merge conflict" | CORE | Conflict resolution workflow |
| "create a skill" | system-create-skill | Skill creation workflow |
| "create a CLI tool" | system-create-cli | CLI tool creation |
| "tell a story about" | story-explanation | Technical storytelling |
| "generate art" | art | Image generation |
| "create chart" | finance-charts | Financial visualization |

---

## CORE Skill Routing

**Always loaded at session start**

### Workflow Routing

#### Git Operations
**Trigger:** "update the Qara repo", "commit and push to Qara", "push to Qara repo", "push these changes"

**Route:** → `${PAI_DIR}/skills/CORE/workflows/git-update-repo.md`

**Execute:** Complete git workflow (status, diff, commit, push with verification)

---

#### Parallel Delegation
**Trigger:** "use parallel interns", "have the interns", "delegate to interns", "parallelize this"

**Route:** → `${PAI_DIR}/skills/CORE/delegation-guide.md`

**Execute:** Deploy multiple parallel intern agents with full context and spotcheck

**Related:**
- `agent-guide.md` - Agent hierarchy and escalation
- `${PAI_DIR}/templates/delegation-task.md` - Task packaging template

---

#### MCP Profile Management
**Trigger:** "switch MCP", "change MCP profile", "load chrome MCP", "swap MCP profile"

**Route:** → `${PAI_DIR}/skills/CORE/workflows/mcp-profile-management.md`

**Execute:** MCP profile switching and restart workflow

**Related:**
- `mcp-guide.md` - Two-tier MCP strategy

---

#### Merge Conflict Resolution
**Trigger:** "merge conflict", "complex decision", "trade-offs", "/plan mode for this"

**Route:** → `${PAI_DIR}/skills/CORE/workflows/merge-conflict-resolution.md`

**Execute:** Use /plan mode with UltraThink for analysis and recommendation

---

### Reference Documentation

#### File Organization
**Reference:** `${PAI_DIR}/skills/CORE/workflows/file-organization-detailed.md`

**Content:** Scratchpad vs history, verification gates, backup patterns

---

#### Response Format
**Reference:** `${PAI_DIR}/skills/CORE/workflows/response-format-examples.md`

**Content:** Complete format examples and edge cases

**Related:**
- `${PAI_DIR}/templates/response-format.md` - Canonical format template

---

#### Contact Directory
**Reference:** `${PAI_DIR}/skills/CORE/workflows/contacts-full.md`

**Content:** Extended contact list with all details

---

## Research Skill Routing

**Activates when:** User requests research, content extraction, or analysis

### Multi-Source Research

#### Comprehensive Research
**Trigger:** "do research on X", "research this topic", "find information about Y"

**Route:** → `${PAI_DIR}/skills/research/workflows/conduct.md`

**Execute:** Parallel multi-agent research using available researcher agents

**Research Modes:**
- **Quick:** 1 agent per type, 2min timeout
- **Standard:** 3 agents per type, 3min timeout (default)
- **Extensive:** 8 agents per type, 10min timeout

---

#### Claude Research (FREE)
**Trigger:** "use claude for research", "claude research on X", "websearch"

**Route:** → `${PAI_DIR}/skills/research/workflows/claude-research.md`

**Execute:** Query decomposition with Claude's WebSearch

---

#### Perplexity Research
**Trigger:** "use perplexity to research X", "perplexity research on Y"

**Route:** → `${PAI_DIR}/skills/research/workflows/perplexity-research.md`

**Execute:** Fast web search via Perplexity API (requires PERPLEXITY_API_KEY)

---

#### Interview Preparation
**Trigger:** "prepare interview questions for X", "interview research on Y"

**Route:** → `${PAI_DIR}/skills/research/workflows/interview-research.md`

**Execute:** Interview prep with diverse question generation

---

### Content Retrieval

#### Difficult Content Access
**Trigger:** "can't get this content", "site is blocking me", "CAPTCHA blocking"

**Route:** → `${PAI_DIR}/skills/research/workflows/retrieve.md`

**Execute:** Escalation through layers (WebFetch → BrightData → Apify)

---

#### YouTube Extraction
**Trigger:** "get this youtube video", "extract from youtube URL"

**Route:** → `${PAI_DIR}/skills/research/workflows/youtube-extraction.md`

**Execute:** YouTube content extraction using fabric -y

---

#### Web Scraping
**Trigger:** "scrape this site", "extract data from this website"

**Route:** → `${PAI_DIR}/skills/research/workflows/web-scraping.md`

**Execute:** Web scraping techniques and tools

---

### Content Processing

#### Fabric Patterns
**Trigger:** "use fabric to X", "create threat model", "summarize with fabric"

**Route:** → `${PAI_DIR}/skills/research/workflows/fabric.md`

**Execute:** Auto-select best pattern from 242+ Fabric patterns

---

#### Content Enhancement
**Trigger:** "enhance this content", "improve this draft"

**Route:** → `${PAI_DIR}/skills/research/workflows/enhance.md`

**Execute:** Content improvement and refinement

---

#### Knowledge Extraction
**Trigger:** "extract knowledge from X", "get insights from this"

**Route:** → `${PAI_DIR}/skills/research/workflows/extract-knowledge.md`

**Execute:** Knowledge extraction and synthesis

---

## Other Skills Routing

### system-create-skill
**Activates when:** "create a skill", "new skill", "skill creation"

**Primary Workflow:** Create comprehensive skill with routing and workflows

**Status:** Implementation ready

---

### system-create-cli
**Activates when:** "create a CLI tool", "build CLI command", "new CLI"

**Primary Workflow:** Generate production-ready CLI tool with TypeScript/Bun

**Status:** Implementation ready

---

### story-explanation
**Activates when:** "tell a story about", "explain technically", "storytelling"

**Primary Workflow:** Technical storytelling with narrative structure

**Status:** Implementation ready

---

### finance-charts
**Activates when:** "create chart", "visualize data", "financial chart"

**Primary Workflow:** Financial data visualization

**Status:** Implementation ready

---

### art
**Activates when:** "generate art", "create image", "make artwork"

**Primary Workflow:** AI-powered image generation

**Status:** Implementation ready

---

### fabric
**Activates when:** "use fabric pattern", "fabric processing"

**Primary Workflow:** Fabric pattern selection and execution

**Status:** Implementation ready

---

## Context Loading Triggers

**When to read additional CORE documentation files**

### Core Architecture & Patterns

**CLI-First Implementation** → READ `cli-first-guide.md` when:
- Building a new CLI tool or command
- Integrating with external APIs
- Wrapping AI functionality with deterministic code
- Jean-Marc asks about CLI-First architecture or patterns

**CLI-First Examples** → READ `cli-first-examples.md` when:
- Need real-world examples of CLI-First pattern
- Migrating from prompt-based to CLI-based approach
- Looking for anti-patterns to avoid
- Need before/after comparison examples

**System Architecture** → READ `CONSTITUTION.md` when:
- Jean-Marc asks about fundamental principles
- Need clarification on core philosophy
- Making architectural decisions
- Understanding why Qara works a certain way

---

### Development & Quality

**Testing Implementation** → READ `testing-guide.md` when:
- Jean-Marc requests test implementation
- Writing or modifying CLI tools (tests required)
- Setting up test infrastructure (Vitest, Playwright)
- Need testing best practices or patterns

**Stack Decisions** → READ `stack-preferences.md` when:
- Choosing between technologies (TypeScript vs Python, etc.)
- Selecting tools or libraries
- Jean-Marc asks "what stack should I use"
- Need extended tooling information

**Technical Parallelization** → READ `parallel-execution.md` when:
- Implementing Promise.all patterns
- Need concurrency control strategies
- Handling parallel I/O operations
- Error handling in parallel code (separate from agent delegation)

---

### Agent & Delegation System

**Agent Hierarchy** → READ `agent-guide.md` when:
- Need to invoke Engineer or Principal agents
- Unclear about escalation paths
- Questions about agent capabilities or authority
- Setting up quality gates for agent work

**Task Decomposition** → READ `delegation-guide.md` when:
- Jean-Marc requests parallel intern delegation
- Breaking down complex tasks into parallel subtasks
- Implementing spotcheck patterns
- Scaling delegation strategies

---

### Integration & Tools

**MCP Strategy** → READ `mcp-guide.md` when:
- Deciding between MCP server vs CLI wrapper
- Jean-Marc mentions MCP or asks about integration strategy
- Migrating from MCP to production CLI
- Setting up Tier 1 (discovery) vs Tier 2 (production) tools

**Personal Context** → READ `MY_DEFINITIONS.md` when:
- Jean-Marc uses terms that might have specific definitions
- Need his perspective on AGI, consciousness, or other concepts
- Clarifying philosophical positions

---

### Configuration & Systems

**Hook Configuration** → READ `hook-system.md` when:
- Creating or modifying hooks
- Jean-Marc asks about hook system
- Need hook implementation patterns

**History System** → READ `history-system.md` when:
- Questions about UOCS or automatic documentation
- Modifying history capture system
- Need to understand session context preservation

**Security** → READ `security-protocols.md` when:
- Handling API keys or sensitive data
- Working with multiple repositories (Qara vs PAI)
- Jean-Marc asks about security practices
- Potential prompt injection scenarios

---

## Template Usage

**When to use output templates from `.claude/templates/`**

### response-format.md
**Use:** Every single response (MANDATORY)

**Content:** Canonical response format structure

**Sections:** SUMMARY, ANALYSIS, ACTIONS, RESULTS, STATUS, CAPTURE, NEXT, STORY, COMPLETED

---

### delegation-task.md
**Use:** When launching parallel interns

**Content:** Task packaging template with complete context

**Sections:** Objective, Context, Instructions, Files, Acceptance Criteria, Testing

---

### analysis-report.md
**Use:** When conducting deep analysis or investigation

**Content:** Structured analysis framework

**Sections:** Executive Summary, Scope, Findings, Root Cause, Recommendations, Implementation Plan

---

### implementation-plan.md
**Use:** When planning multi-phase projects

**Content:** Comprehensive planning template

**Sections:** Goals, Current State, Proposed Solution, Phases, Tasks, Testing, Risks, Timeline

---

## Quick Lookup Tables

### Skill → Primary Workflow

| Skill | Primary Workflow File | Typical Use Case |
|-------|----------------------|------------------|
| CORE | git-update-repo.md | Repository updates |
| CORE | delegation-guide.md | Parallel execution |
| research | conduct.md | Multi-source research |
| research | retrieve.md | Difficult content access |
| research | fabric.md | Pattern-based processing |

---

### Workflow → Related Documentation

| Workflow | Related Docs | Purpose |
|----------|-------------|---------|
| delegation-guide.md | agent-guide.md, parallel-execution.md | Complete delegation context |
| git-update-repo.md | security-protocols.md | Safe repository operations |
| mcp-profile-management.md | mcp-guide.md | MCP strategy context |
| conduct.md (research) | fabric.md, retrieve.md | Research tool options |

---

## Navigation Tips

### Finding Workflows
1. Check skill's SKILL.md for "Workflow Routing" section
2. Look in `${PAI_DIR}/skills/[skill-name]/workflows/`
3. Reference this routing map for quick lookup

### Finding Reference Docs
1. CORE docs: `${PAI_DIR}/skills/CORE/` (flat structure)
2. Skill-specific docs: `${PAI_DIR}/skills/[skill-name]/`
3. Templates: `${PAI_DIR}/templates/`

### Debugging Routing Issues
1. Verify skill description has clear triggers
2. Check SKILL.md has workflow routing section
3. Confirm workflow file exists at referenced path
4. Test activation with example trigger phrases

---

## Maintenance

**When adding new workflows:**
1. Add route in skill's SKILL.md
2. Add trigger examples
3. Update this routing map
4. Test activation with trigger phrases

**When adding new skills:**
1. Create clear activation triggers in description
2. Add workflow routing section to SKILL.md
3. Update this routing map
4. Document in appropriate category

---

## Related Documentation

- **SKILL-STRUCTURE-AND-ROUTING.md** - Detailed skill structure patterns
- **CONSTITUTION.md** - System architecture principles
- **COMPREHENSIVE_REFACTOR_PLAN_v1.md** - Refactor history and rationale
- **REFACTOR_PART_I_SUMMARY.md** - Redundancy elimination work
- **REFACTOR_PHASE_II_SUMMARY.md** - Reference integrity fixes
- **REFACTOR_PHASE_III_SUMMARY.md** - Optimization implementation

---

**Document Version:** 1.0  
**Created:** 2025-12-01  
**Maintained By:** Qara System  
**Update Frequency:** As workflows and skills change
