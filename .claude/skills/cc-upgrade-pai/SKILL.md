---
name: cc-upgrade-pai
context: fork
description: |
  PAI-specific .claude/ analysis extending cc-upgrade: CORE skill integration, delegation
  workflows, PAI repository patterns. Only for PAI (Personal AI Infrastructure) repos.
  USE WHEN: "upgrade this PAI repo", "optimize Qara's CC setup", "PAI compliance check".
---

# CC-Upgrade-PAI (v1.0.0)

PAI-specific analysis extending the base `cc-upgrade` skill.

## Workflow Routing (SYSTEM PROMPT)

**When user requests PAI external skills analysis, PAI skill ecosystem audit, or Qara skill review:**
Examples: "audit PAI skills", "deep skill analysis", "analyze PAI installed skills",
"PAI skill redundancies", "what external skills do we have", "PAI skill hygiene",
"visual-explainer audit", "mattpocock sync", "skill wrapping opportunities"
→ **READ:** `workflows/external-skills-deep-analysis.md`
→ **EXECUTE:** Full PAI external skills deep analysis with UltraThink

**When user needs the external skills registry or inventory:**
Examples: "external skills registry", "skill inventory", "what skills are installed"
→ **READ:** `references/external-skills-registry.md`

**When user requests general PAI CC audit:**
→ Continue with PAI-Specific Analysis below

## Prerequisites

**Before running PAI analysis, load base skill context:**

→ READ: `../cc-upgrade/references/cc-trusted-sources.md` for CC feature sources
→ READ: `../cc-upgrade/references/12-factor-checklist.md` for compliance audit

## PAI-Specific Analysis

### 1. PAI Structure Validation

Expected PAI v2.x structure:

```
$PAI_DIR/
├── .claude/
│   ├── context/           # UFC (Universal File-based Context)
│   ├── skills/            # Skills-as-Containers
│   │   └── CORE/          # Core skill (identity, routing)
│   ├── agents/            # Specialized agents
│   ├── commands/          # Slash commands
│   ├── hooks/             # TypeScript hooks
│   │   └── lib/           # Hook libraries
│   └── settings.json
├── CLAUDE.md              # Root context
├── .claude/skills/CORE/CONSTITUTION.md  # Philosophy doc
└── DECISIONS.md           # Decision log (append-only)
```

### 2. CORE Skill Audit

Check CORE skill compliance:

```bash
# Verify CORE skill exists and loads at startup
cat "$PAI_DIR/.claude/skills/CORE/SKILL.md" | head -20
```

Key checks:
- [ ] `context: same` (loads in main conversation)
- [ ] Identity section (name, personality)
- [ ] Workflow routing (→ READ: patterns)
- [ ] Response format tiers
- [ ] Delegation instructions

### 3. Delegation Patterns

PAI requires explicit delegation guidance:

| Pattern | Location | Check |
|---------|----------|-------|
| Parallel agents | `delegation-guide.md` | Task tool with multiple calls |
| Agent hierarchy | `.claude/context/delegation-guide.md` | Escalation paths defined |
| Spotcheck pattern | Commands | Post-delegation verification |

### 4. Hook Library Analysis

PAI hooks (12 scripts, 10 CC events, 11 libs):

```
.claude/hooks/
├── lib/
│   ├── pai-paths.ts          # Paths + getSessionId + atomicWriteJson
│   ├── tab-titles.ts         # Terminal tab title generation
│   ├── jsonl-utils.ts        # JSONL append/rotate
│   ├── datetime-utils.ts     # Timestamp formatting
│   ├── tdd-state.ts          # TDD RED/GREEN/REFACTOR state machine
│   ├── trace-utils.ts        # Topic classification
│   ├── mode-state.ts         # Execution mode lifecycle (drive/cruise/turbo)
│   ├── keyword-routes.json   # Declarative keyword→skill routing config
│   ├── working-memory.ts     # Session-scoped 4-file memory
│   ├── compact-checkpoint.ts # State snapshot before compression
│   ├── prd-utils.ts          # PRD read/write, story tracking
│   └── context-graph/        # Static context analyzer
├── session-start.ts          # SessionStart: CORE, hints, crash recovery
├── update-tab-titles.ts      # UserPromptSubmit: processing indicator
├── keyword-router.ts         # UserPromptSubmit: mode activation
├── rtk-rewrite.sh            # PreToolUse:Bash: RTK token reduction
├── pre-tool-use-security.ts  # PreToolUse:Bash: dangerous pattern detection
├── pre-tool-use-tdd.ts       # PreToolUse:Write,Edit: TDD enforcement
├── post-tool-use.ts          # PostToolUse: telemetry logging
├── post-tool-failure.ts      # PostToolUseFailure: consecutive failure tracking
├── subagent-start.ts         # SubagentStart: delegation logging
├── subagent-stop.ts          # SubagentStop: deliverable recording
├── pre-compact.ts            # PreCompact: state checkpoint
├── stop-hook.ts              # Stop: tab title, mode continuation, memory injection
└── config-change.ts          # ConfigChange: settings logging
```

Check for:
- [ ] TypeScript (not JavaScript)
- [ ] Tests in `.claude/tests/` (hidden dir, use `bun test ./.claude/`)
- [ ] Proper hook output schema (CC 2.1.14)
- [ ] Never `exit(1)` — always `exit(0)`, even on error
- [ ] Uses `readFileSync(0, 'utf-8')` for stdin (not Bun.stdin.stream)
- [ ] Uses `getSessionId()` from pai-paths.ts (not inline env var chains)

### 4a. Execution Modes System

PAI has 3 persistent execution modes activated via keyword-router:

| Mode | Trigger | Purpose | Max Iterations |
|------|---------|---------|----------------|
| drive | `drive:`, `drive mode` | PRD-driven TDD with critic/verifier gates | 50 |
| cruise | `cruise:`, `cruise mode` | Phased: Discover → Plan → Implement → Verify | 20 |
| turbo | `turbo:`, `turbo mode` | Parallel agent dispatch | 30 |

Check for:
- [ ] mode-state.ts: state machine with TTL, session scoping, atomic writes
- [ ] keyword-routes.json: patterns require colon or "mode" suffix (no bare words)
- [ ] Stop hook: reads mode state, injects continuation, respects safety valves
- [ ] Working memory: session-scoped 4-file memory survives compression via re-injection
- [ ] Compact checkpoint: PreCompact saves state, session-start recovers from crash
- [ ] Deactivation: 3 exit paths (complete, cancelled, max-iterations)

### 4b. Quality Gate Agents

| Agent | Role | When |
|-------|------|------|
| critic | Pre-implementation plan review | Before coding — checks approach vs criteria |
| verifier | Post-implementation acceptance | After coding — runs quality gates |
| reviewer | Code review | General code quality |

Check for:
- [ ] critic.md: deterministic checks, verdict format (proceed/revise)
- [ ] verifier.md: quality gate suite (bun test, tsc, baseline comparison)
- [ ] No overlap between the three (disambiguation documented in delegation-guide)

### 5. Context Engineering (UFC)

PAI uses Universal File-based Context:

| Pattern | Implementation |
|---------|----------------|
| Progressive disclosure | `→ READ:` directives |
| Context routing | Workflow routing in CORE |
| Size limits | <500 lines per file |
| Enforcement | MANDATORY/MUST directives |

### 6. External Skills Update

PAI uses symlinked external skills from `~/.agents/skills/`. These need version checking against upstream.

**Managed external skills:**

| Skill | Source | Local Path |
|-------|--------|------------|
| visual-explainer | `nicobailon/visual-explainer` | `~/.agents/skills/visual-explainer` |

**Update check:**
```bash
# Get local version
grep 'version:' ~/.agents/skills/visual-explainer/SKILL.md

# Get latest release
gh api repos/nicobailon/visual-explainer/releases/latest --jq '.tag_name'
```

### 7. Adapted Community Skills Update

PAI includes skills adapted from [mattpocock/skills](https://github.com/mattpocock/skills). These are not symlinked — they were rewritten for PAI conventions. When Matt updates the upstream repo, review changes for improvements to incorporate.

**Adapted skills and their upstream sources:**

| PAI Location | Upstream Source | What Was Adapted |
|---|---|---|
| `skills/grill-me/SKILL.md` | `grill-me/SKILL.md` | Expanded methodology, probe patterns, PAI structure |
| `skills/design-it-twice/SKILL.md` | `design-an-interface/SKILL.md` | Broadened scope (architecture + data models), uses `architect` agents |
| `skills/edit-article/SKILL.md` | `edit-article/SKILL.md` | Added Phase 3 humaniser pass, expanded scope to docs/specs |
| ~~`skills/refactor-plan/SKILL.md`~~ | ~~`request-refactor-plan/SKILL.md`~~ | RETIRED — subsumed by cruise mode |
| `skills/triage-issue/SKILL.md` | `triage-issue/SKILL.md` | PAI conventions, codebase-analyzer integration, TDD fix plans |
| `skills/ubiquitous-language/SKILL.md` | `ubiquitous-language/SKILL.md` | PAI conventions, DDD glossary extraction |
| ~~`skills/prd-to-plan/SKILL.md`~~ | ~~`prd-to-plan/SKILL.md`~~ | RETIRED — subsumed by drive mode + product-shaping Phase 4 |
| `skills/CORE/testing-guide.md` | `tdd/SKILL.md` + `tdd/tests.md` | Merged TDD methodology into existing testing guide |
| `skills/CORE/references/deep-modules.md` | `tdd/deep-modules.md` | Extracted as shared cross-cutting reference |
| `skills/CORE/references/mocking-guidelines.md` | `tdd/mocking.md` + `improve-codebase-architecture/REFERENCE.md` | Combined mocking rules + dependency classification |
| `skills/CORE/references/interface-design.md` | `tdd/interface-design.md` | Extracted as shared reference |
| `skills/CORE/references/refactoring-signals.md` | `tdd/refactoring.md` | Extracted as shared reference |
| `skills/product-shaping/workflows/breakdown.md` | `prd-to-issues/SKILL.md` | Vertical slice + HITL/AFK methodology added as Phase 4 |
| `agents/codebase-analyzer.md` | `improve-codebase-architecture/SKILL.md` | Friction-driven analysis lens added to agent prompt |

**Update check:**
```bash
# Check for new commits since last review
gh api repos/mattpocock/skills/commits --jq '.[0] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"'

# List all skill directories for new additions
gh api repos/mattpocock/skills/contents/ --jq '.[].name' | sort
```

**When upstream changes are detected:**
1. Fetch the changed files and compare against PAI adaptations
2. Look for: new methodology, improved patterns, additional reference material
3. Merge improvements while preserving PAI conventions (frontmatter, routing, references)
4. Do NOT blindly replace — PAI versions are intentionally different from upstream

**Update procedure (when outdated):**
```bash
# Clone latest to temp
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer-update

# Sync files (preserves local .gitignore, removes deleted upstream files)
rsync -av --delete --exclude='.git' /tmp/visual-explainer-update/ ~/.agents/skills/visual-explainer/

# Cleanup
rm -rf /tmp/visual-explainer-update

# Verify symlink still works
ls -la $(readlink -f ~/.claude/skills/visual-explainer)/SKILL.md
```

**Post-update:** Copy any new prompt templates to commands:
```bash
# Check for new prompts not yet in commands/
diff <(ls ~/.agents/skills/visual-explainer/prompts/) <(ls ~/.claude/commands/ | grep -f <(ls ~/.agents/skills/visual-explainer/prompts/))
```

## Interactive PAI Audit

Extends the base cc-upgrade Interactive Audit with PAI-specific interview questions and deeper code review. Run the base audit first, then this.

### PAI Interview (AskUserQuestion)

**Call 1 — PAI-specific context (2 questions):**

| # | Question | Header | Options |
|---|----------|--------|---------|
| 1 | "Which PAI subsystem needs the most attention?" | PAI focus | **Hook system (Recommended)** — hook scripts, libs, event coverage; **CORE skill & routing** — identity, workflow routing, response tiers; **Agent delegation** — agent configs, routing, parallel execution; **Context engineering** — UFC compliance, file sizes, progressive disclosure |
| 2 | "What triggered this audit?" | Trigger | **Post-cleanup validation** — verify recent deletions/refactors didn't break things; **Capability expansion** — planning to add new hooks/skills/agents; **Debugging** — something is broken or behaving unexpectedly; **Routine maintenance** — periodic health check |

**Call 2 — Deeper diagnostics (1-2 questions, based on Call 1 answers):**

If Hook system selected:

| # | Question | Header | Options | multiSelect |
|---|----------|--------|---------|-------------|
| 3 | "Which hook issues have you encountered?" | Hook issues | **Timeout errors** — hooks taking too long; **Silent failures** — hooks exit 0 but don't work; **Stdin parsing** — JSON parse errors or empty input; **Settings desync** — settings.json doesn't match actual hook files | true |

If CORE skill selected:

| # | Question | Header | Options |
|---|----------|--------|---------|
| 3 | "What's wrong with CORE routing?" | Routing | **Wrong workflow loads** — triggers match too broadly or too narrowly; **Missing routes** — common requests have no routing; **Stale references** — → READ: points to deleted files; **Context bloat** — CORE loads too much at startup |

If Agent delegation selected:

| # | Question | Header | Options |
|---|----------|--------|---------|
| 3 | "What's the delegation pain point?" | Delegation | **Wrong agent chosen** — tasks routed to the wrong specialist; **Agent overlap** — multiple agents could handle the same task; **Missing coverage** — no agent for a needed capability; **Performance** — agents too slow or use too many tokens |

### PAI Code Review Extensions

In addition to the base cc-upgrade code review, perform these PAI-specific checks:

#### CLAUDE.md Compliance
Read the global CLAUDE.md and verify:
- Severity levels present (MUST / SHOULD / RECOMMENDED structure)
- Structured escalation format defined (Problem/Tried/Hypothesis/Need)
- Two-attempt debug rule has concrete trigger
- Refactoring isolation rule present

#### DECISIONS.md Health
Check root `DECISIONS.md`:
- File exists and follows the template (Chosen/Alternatives/Why/Trade-offs/Revisit if)
- "Revisit if" conditions — flag any that may now be true
- No stale entries referencing deleted files or patterns

#### Hook Library Integrity
Read `.claude/hooks/lib/` files and verify:
- `pai-paths.ts`: warns on bad paths, never exit(1)
- `jsonl-utils.ts`: imports ensureDir from pai-paths (no duplicate)
- `datetime-utils.ts`: pure functions, no side effects
- `context-graph/`: CLI entry point resolves, no broken imports

#### CORE Skill Routing Validation
Read CORE's workflow routing table and verify:
- Every `→ READ:` path resolves to an existing file
- No duplicate trigger patterns across routes
- Documentation Index entries all resolve
- Agent table matches actual `.claude/agents/` contents

### PAI Gap Analysis

Extend the base gap analysis matrix with PAI-specific rows:

```markdown
| PAI Capability | Expected | Actual | Gap | Priority |
|----------------|----------|--------|-----|----------|
| CLAUDE.md severity levels | MUST/SHOULD/RECOMMENDED | ? | | |
| Decision log | DECISIONS.md exists | ? | | |
| Hook lib coverage | All 11 libs present | ? | | |
| Hook event coverage | 10 CC events configured | ? | | |
| CORE routing integrity | All paths resolve | ? | | |
| Context graph health | 0 broken refs, 0 cycles | ? | | |
| Agent specialization | No overlap, 13 agents | ? | | |
| External skill versions | Up to date | ? | | |
| Execution modes | 3 modes (drive/cruise/turbo) | ? | | |
| Mode state machine | TTL, session scoping, atomic writes | ? | | |
| Working memory | 4-file session memory | ? | | |
| Compact checkpoint | PreCompact + crash recovery | ? | | |
| Quality gates | critic + verifier agents | ? | | |
| Keyword routing | No false positives, colon/mode patterns | ? | | |
```

## PAI Compliance Report Format

```markdown
# PAI Optimization Report

## Executive Summary
[1-2 sentence PAI-specific assessment]

## Base CC Analysis
[Run cc-upgrade first, summarize results]

## PAI-Specific Findings

### CORE Skill
- Identity: ✅/❌
- Workflow routing: ✅/❌
- Response tiers: ✅/❌
- Delegation: ✅/❌

### Delegation Patterns
| Pattern | Status | Notes |
|---------|--------|-------|

### Hook Library
| Module | Coverage | Notes |
|--------|----------|-------|

### UFC Compliance
| Metric | Value | Target |
|--------|-------|--------|

## PAI-Specific Recommendations
1. [High Priority] ...
2. [Medium Priority] ...
```

## Quick Commands

### Full PAI Audit
```bash
bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts $PAI_DIR
```

### Context Graph Audit
```bash
bun run .claude/hooks/lib/context-graph/cli.ts audit --pai-dir $PAI_DIR/.claude
```

### Hook Test Coverage
```bash
cd $PAI_DIR/.claude/hooks && bun test --coverage
```

### External Skills Analysis
```bash
bun run .claude/skills/cc-upgrade/scripts/analyse-external-skills.ts $PAI_DIR
```

### OMC (oh-my-claudecode) Monitoring

Track OMC evolution as an inspiration source for PAI improvement opportunities. OMC was the prior art that triggered the unified evolution plan (persistent modes, working memory, subagent tracking). Even though PAI now has its own implementation, OMC may evolve new patterns worth adopting.

**Check:**
```bash
gh api repos/anthropics/oh-my-claudecode/commits --jq '.[0:3] | .[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"'
```

**When new OMC features detected:**
1. Compare against PAI's current capabilities
2. IF OMC has a pattern PAI lacks: evaluate for adoption
3. IF PAI has a better implementation: document why (prevents re-evaluation)
4. Log findings in `references/external-skills-registry.md` update history

## Workflow

1. **Run base analysis first:**
   ```
   Use cc-upgrade skill to analyze generic .claude/ structure
   ```

2. **Then run PAI-specific:**
   ```bash
   bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts .
   ```

3. **Run context graph audit:**
   ```bash
   bun run .claude/hooks/lib/context-graph/cli.ts audit --pai-dir .claude
   ```
   Check for: broken references, orphaned files, circular dependencies, bloated skills.

4. **Check hook coverage:**
   ```bash
   cd .claude/hooks && bun test --coverage
   ```

5. **Generate combined report** using the format above

6. **Run external skills deep analysis:**
   ```
   → READ & EXECUTE: workflows/external-skills-deep-analysis.md
   ```
   This covers: visual-explainer ecosystem (22 sub-skills), mattpocock adaptation sync,
   redundancy analysis, wrapping opportunities, and ecosystem scanning.

7. **Apply fixes** from the report recommendations

8. **Update all affected documentation (MANDATORY after any changes):**
   - Update docs that reference changed files, patterns, or architecture
   - Key docs to check: `delegation-guide.md`, `MEMORY.md`
   - If `settings.json` changed: verify symlink at `~/.claude/settings.json` still resolves correctly
   - If hooks changed: update hook-authoring skill and hook test expectations
   - If agents changed: update CORE skill agent table and `delegation-guide.md`
   - If skills added/removed: update CORE documentation index
   - **Do NOT skip this step** — stale docs cause cascading confusion in future sessions

9. **Post-fix validation (MANDATORY after any changes):**
   - Run hook health check: load `hook-test` skill workflow (`${PAI_DIR}/skills/hook-test/workflows/test-and-fix.md`) and execute all 8 steps
   - Run full test suite: `bun run test`
   - Run shell scripts: `scripts/validate-skills.sh`, `scripts/check-references.sh`
   - **Do NOT report success until all validations pass**
   - If validation fails, fix the issue and re-run validation
