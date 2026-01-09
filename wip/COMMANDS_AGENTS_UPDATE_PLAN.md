# PAI Commands & Agents Update Plan
## Leveraging Claude Code 2.0 - 2.1.2 Improvements

**Created:** 2026-01-10
**Status:** Ready for Implementation
**Estimated Effort:** 2-3 days

---

## Executive Summary

PAI commands and agents were created before many significant Claude Code improvements. This plan identifies specific upgrades to leverage new capabilities including: model routing, background execution, explore/plan agents, skill auto-loading, resume capability, and enhanced hook integration.

**Key Improvements Available:**
- Explore agent (CC 2.0.17+) - Native codebase exploration
- Plan agent (CC 2.0.28+) - Architecture planning
- Model routing (CC 2.0.28+) - Haiku/Sonnet/Opus selection
- Background execution (CC 2.0.60+) - Parallel task execution
- Skill auto-loading (CC 2.1.0+) - Frontmatter `skills:` field
- Resume capability (CC 2.0.27+) - Session continuity
- LSP tools (CC 2.0.74+) - Precise code navigation

---

## Part 1: Commands Optimization

### 1.1 `/create_plan` Command

**File:** `.claude/commands/create_plan.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Model routing | 2.0.28+ | Missing | Add `model: opus` in Task calls |
| Explore agent | 2.0.17+ | Manual grep/glob | Use `subagent_type="Explore"` |
| Plan agent | 2.0.28+ | Manual design | Use `subagent_type="Plan"` |
| Background tasks | 2.0.60+ | Sequential | Use `run_in_background: true` |
| Resume capability | 2.0.27+ | Missing | Add `resume` parameter |

**Actions:**
- [ ] Replace manual codebase-locator/analyzer with Explore agent
- [ ] Add `model: "opus"` to Task calls for complex analysis
- [ ] Use Plan agent for architecture design phase
- [ ] Enable `run_in_background: true` for parallel research tasks

---

### 1.2 `/implement_plan` Command

**File:** `.claude/commands/implement_plan.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Model routing | 2.0.28+ | Missing | Add `model: opus` |
| Background bash | 2.0.19+ | Missing | Use for test suites |
| Resume sessions | 2.0.27+ | Missing | Document `/resume` |
| TaskOutput polling | 2.1.x | Missing | Poll background results |

**Actions:**
- [ ] Add `model: opus` to frontmatter
- [ ] Run test suites in background
- [ ] Use `TaskOutput` to poll for test completion
- [ ] Document resume workflow for long implementations

---

### 1.3 `/validate_plan` Command

**File:** `.claude/commands/validate_plan.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Explore agent | 2.0.17+ | Manual grep | Use Explore for verification |
| Background validation | 2.0.60+ | Sequential | Parallel test/lint/type checks |
| Model routing | 2.0.28+ | Missing | Haiku for quick, Opus for analysis |

**Actions:**
- [ ] Run linting, type checking, tests in parallel background tasks
- [ ] Use Explore agent with `thoroughness: "very thorough"`
- [ ] Add model routing: Haiku for quick checks, Opus for analysis

---

### 1.4 `/research` Commands Family

**Files:** `research.md`, `research-claude.md`, `research-perplexity.md`, `research-gemini.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Parallel WebSearch | 2.0.70+ | Sequential | Native parallel queries |
| Background agents | 2.0.60+ | Sequential | Run researchers in parallel |
| Model routing | 2.0.28+ | Missing | Sonnet for research, Haiku for extraction |
| Skill auto-loading | 2.1.0+ | Manual | Add `skills: ["research"]` |

**Actions:**
- [ ] Add `skills: ["research"]` to command frontmatter
- [ ] Launch researcher Task agents with `run_in_background: true`
- [ ] Use `TaskOutput(block=true)` to wait for parallel results
- [ ] Add `model: "sonnet"` to researcher Task calls

---

### 1.5 `/research_codebase` Command

**File:** `.claude/commands/research_codebase.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Explore agent | 2.0.17+ | Custom agents | Use native Explore |
| Thoroughness | 2.1.x | Manual | Use `thoroughness` parameter |
| LSP tool | 2.0.74+ | Missing | Use for code navigation |
| Background research | 2.0.60+ | Sequential | Parallel exploration |

**Actions:**
- [ ] Replace `codebase-locator` with Explore agent
- [ ] Add LSP tool usage for precise navigation
- [ ] Run multiple Explore agents in parallel
- [ ] Keep custom analyzer for deep analysis

---

### 1.6 `/create_handoff` Command

**File:** `.claude/commands/create_handoff.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Named sessions | 2.0.50+ | Missing | Use `/rename` |
| Resume capability | 2.0.27+ | Manual | Document `/resume <name>` |
| Session metadata | 2.0.64+ | Missing | Include `agent_id` |

**Actions:**
- [ ] Add instruction to use `/rename` before handoff
- [ ] Include `/resume <session-name>` in handoff format
- [ ] Capture session metadata in handoff document

---

### 1.7 `/skills` Command

**File:** `.claude/commands/skills.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Hot-reload | 2.1.0+ | Not shown | Display reload status |
| Context type | 2.1.0+ | Not parsed | Show `context: fork|same` |
| Hooks field | 2.1.0+ | Not shown | Display skill-level hooks |

**Actions:**
- [ ] Parse and display `context:` field from frontmatter
- [ ] Show skill-level hooks if defined
- [ ] Indicate hot-reload availability

---

## Part 2: Agents Optimization

### 2.1 Codebase Agents

**Files:** `codebase-locator.md`, `codebase-analyzer.md`, `codebase-pattern-finder.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Explore integration | 2.0.17+ | Separate | Consider soft-deprecation |
| LSP tool | 2.0.74+ | Missing | Add for code navigation |
| Model routing | 2.0.28+ | Fixed sonnet | Haiku for locator, Sonnet for analyzer |

**Actions:**
- [ ] **codebase-locator**: Soft-deprecate, recommend Explore agent
- [ ] **codebase-analyzer**: Enhance with LSP tool
- [ ] **codebase-pattern-finder**: Add LSP for finding references

---

### 2.2 Research Agents

**Files:** `researcher.md`, `perplexity-researcher.md`, `gemini-researcher.md`, `claude-researcher.md`, `web-search-researcher.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Skill auto-load | 2.1.0+ | Manual | Add `skills: ["research"]` |
| Parallel WebSearch | 2.0.70+ | Not mentioned | Document capability |
| Background execution | 2.0.60+ | Missing | Guide for `run_in_background` |
| Model optimization | 2.0.28+ | Fixed | Haiku for extraction, Sonnet for synthesis |

**Actions:**
- [ ] Add `skills: ["research"]` to all researcher agent frontmatter
- [ ] Document parallel WebSearch capability
- [ ] Add `run_in_background` usage guidance

---

### 2.3 Design Agents

**Files:** `designer.md`, `design-iterator.md`, `design-implementation-reviewer.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Image metadata | 2.0.64+ | Not leveraged | Use dimension metadata |
| Background processing | 2.0.60+ | Missing | Run iterations in background |
| Model routing | 2.0.28+ | Mixed | Use Haiku for quick checks |

**Actions:**
- [ ] Document image dimension metadata for coordinate work
- [ ] Use background execution for screenshot cycles
- [ ] Keep Opus for reviewer, add image metadata guidance

---

### 2.4 Professional Role Agents

**Files:** `architect.md`, `engineer.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Plan agent | 2.0.28+ | Manual | Reference native Plan agent |
| Background builds | 2.0.60+ | Missing | Use for builds/tests |
| Model routing | 2.0.28+ | Fixed sonnet | Opus for architect |

**Actions:**
- [ ] **architect.md**: Reference Plan agent, add `model: opus`
- [ ] **engineer.md**: Add background task guidance for builds/tests

---

### 2.5 Thoughts Agents

**Files:** `thoughts-locator.md`, `thoughts-analyzer.md`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| Model optimization | 2.0.28+ | Sonnet | Haiku for locator |

**Actions:**
- [ ] **thoughts-locator.md**: Change to `model: haiku`
- [ ] **thoughts-analyzer.md**: Keep `model: sonnet`

---

## Part 3: Settings.json Enhancements

**File:** `.claude/settings.json`

| Feature | CC Version | Current | Upgrade |
|---------|-----------|---------|---------|
| SubagentStart hook | 2.0.43+ | Missing | Add for agent tracking |
| PermissionRequest hook | 2.0.45+ | Missing | Add for custom approval |
| once: true hooks | 2.1.0+ | Not used | For one-time setup |
| Hook input modification | 2.1.0+ | Not used | Use `updatedInput` |

**Actions:**
- [ ] Add `SubagentStart` hook for complete lifecycle tracking
- [ ] Consider `PermissionRequest` hook for auto-approval
- [ ] Use `once: true` for session initialization hooks

---

## Part 4: Priority Implementation Order

### High Priority (Do First)
1. [ ] Add `skills:` frontmatter to research agents for auto-loading
2. [ ] Update `/research_codebase` to use Explore agent
3. [ ] Add `model:` specification to commands missing it
4. [ ] Add background execution to `/create_plan` parallel research

### Medium Priority
5. [ ] Soft-deprecate codebase-locator in favor of Explore agent
6. [ ] Add LSP tool usage to codebase-analyzer
7. [ ] Update `/create_handoff` with resume capability documentation
8. [ ] Add model routing to Task calls in commands

### Lower Priority (Enhancement)
9. [ ] Add SubagentStart hook to settings.json
10. [ ] Update thoughts-locator to use Haiku
11. [ ] Add image dimension metadata guidance to design agents
12. [ ] Add thoroughness parameters to Explore agent calls

---

## Summary Statistics

| Category | Items | High | Medium | Low |
|----------|-------|------|--------|-----|
| Commands | 10 | 4 | 4 | 2 |
| Agents | 14 | 2 | 5 | 7 |
| Settings | 4 | 0 | 1 | 3 |
| **Total** | **28** | **6** | **10** | **12** |

**Key Themes:**
1. **Explore Agent Adoption** - Native codebase exploration replacing custom agents
2. **Model Routing** - Cost optimization with Haiku/Sonnet/Opus selection
3. **Background Execution** - Parallel task execution for faster workflows
4. **Skill Auto-Loading** - Removing manual `Skill()` calls
5. **Resume Capability** - Session continuity for long workflows
6. **LSP Integration** - Precise code navigation where applicable

---

## Next Steps

1. Review and approve this plan
2. Execute high priority items first (parallel agents recommended)
3. Test each updated command/agent after changes
4. Update PHASE3_PLAN.md or create PHASE4_PLAN.md to track

---

**Document Version:** 1.0
**Generated by:** cc-pai-optimiser skill
