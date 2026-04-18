---
name: cc-upgrade-pai
context: fork
description: |
  PAI-specific .claude/ analysis extending cc-upgrade. CORE integration, delegation, PAI patterns.
  USE WHEN: "upgrade this PAI repo", "optimize Qara's CC setup", "PAI compliance check".
---

# CC-Upgrade-PAI (v1.0.0)

Extends `cc-upgrade` with PAI-specific analysis.

## Workflow Routing

**PAI external skills analysis / Qara skill review**: "audit PAI skills", "deep skill analysis", "PAI skill redundancies", "visual-explainer audit", "mattpocock sync", "skill wrapping opportunities"
→ **READ:** `workflows/external-skills-deep-analysis.md`

**External skills registry / inventory**: "external skills registry", "skill inventory", "what skills are installed"
→ **READ:** `references/external-skills-registry.md`

**Iterative review inbox**: "cc upgrade review", "review inbox", "audit inbox", "process pending audit findings"
→ **READ:** `workflows/review-inbox.md`

**General PAI CC audit**: continue below.

## Prerequisites

→ **READ:** `../cc-upgrade/references/cc-trusted-sources.md`
→ **READ:** `../cc-upgrade/references/12-factor-checklist.md`

## PAI-Specific Analysis

### 1. PAI Structure (v2.x)

```
$PAI_DIR/
├── .claude/
│   ├── context/           # UFC
│   ├── skills/
│   │   └── CORE/          # Core skill (identity, routing)
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   │   └── lib/
│   └── settings.json
├── CLAUDE.md              # Project-specific (global via symlink)
├── .claude/skills/CORE/CONSTITUTION.md
└── DECISIONS.md           # Append-only decision log
```

### 2. CORE Skill Audit

```bash
cat "$PAI_DIR/.claude/skills/CORE/SKILL.md" | head -20
```

Required:
- [ ] `context: same` (loads in main conversation)
- [ ] Identity section (name, personality)
- [ ] Workflow routing (-> READ: patterns)
- [ ] Response format tiers
- [ ] Delegation instructions

### 3. Delegation Patterns

| Pattern | Location | Check |
|---------|----------|-------|
| Parallel agents | `delegation-guide.md` | Task tool with multiple calls |
| Agent hierarchy | `.claude/context/delegation-guide.md` | Escalation paths |
| Spotcheck | Commands | Post-delegation verification |

### 4. Hook Library (18 scripts, 14 libs + context-graph/)

```
.claude/hooks/
├── lib/
│   ├── pai-paths.ts          # Paths + getSessionId + atomicWriteJson
│   ├── tab-titles.ts
│   ├── jsonl-utils.ts        # JSONL append/rotate
│   ├── datetime-utils.ts
│   ├── tdd-state.ts          # RED/GREEN/REFACTOR state machine
│   ├── trace-utils.ts        # Topic classification
│   ├── mode-state.ts         # drive/cruise/turbo lifecycle
│   ├── keyword-routes.json   # Declarative routing config
│   ├── working-memory.ts     # Session-scoped 4-file memory
│   ├── compact-checkpoint.ts # Pre-compression snapshot
│   ├── prd-utils.ts          # PRD read/write
│   ├── test-macros.ts
│   ├── ollama-client.ts      # Gemma 4 via Ollama
│   ├── file-patterns.ts
│   └── context-graph/        # Static context analyzer
├── session-start.ts          # SessionStart: CORE, hints, crash recovery
├── update-tab-titles.ts      # UserPromptSubmit
├── keyword-router.ts         # UserPromptSubmit: mode activation
├── rtk-rewrite.sh            # PreToolUse:Bash: token reduction
├── pre-tool-use-security.ts  # PreToolUse:Bash: dangerous patterns
├── pre-tool-use-tdd.ts       # PreToolUse:Write,Edit: TDD enforcement
├── pre-tool-use-quality.ts   # PreToolUse: read-before-edit
├── post-tool-use.ts          # PostToolUse: telemetry
├── post-tool-failure.ts      # PostToolUseFailure
├── subagent-start.ts
├── subagent-stop.ts          # Deliverable recording
├── pre-compact.ts            # PreCompact: state checkpoint
├── post-compact.ts           # PostCompact: state recovery
├── stop-hook.ts              # Stop: mode continuation, memory injection
├── stop-failure.ts           # StopFailure: crash logging
├── config-change.ts          # ConfigChange: settings sync
├── permission-denied.ts      # PermissionDenied: logging
└── task-created.ts           # TaskCreated: subagent tracking
```

Required:
- [ ] TypeScript (not JS)
- [ ] Tests in `.claude/tests/` (hidden, use `bun test ./.claude/`)
- [ ] Hook output schema (CC 2.1.14)
- [ ] Never `exit(1)` — always `exit(0)`
- [ ] `readFileSync(0, 'utf-8')` for stdin (not Bun.stdin.stream)
- [ ] `getSessionId()` from pai-paths.ts (not inline env chains)

### 4a. Execution Modes

| Mode | Trigger | Purpose | Max Iter |
|------|---------|---------|----------|
| drive | `drive:`, `drive mode` | PRD-driven TDD with critic/verifier | 50 |
| cruise | `cruise:`, `cruise mode` | Discover→Plan→Implement→Verify | 20 |
| turbo | `turbo:`, `turbo mode` | Parallel agent dispatch | 30 |

Required:
- [ ] mode-state.ts: state machine, TTL, session scoping, atomic writes
- [ ] keyword-routes.json: patterns require colon or "mode" suffix (no bare words)
- [ ] Stop hook: reads mode state, injects continuation, respects safety valves
- [ ] Working memory: session-scoped, survives compression via re-injection
- [ ] PreCompact saves state; session-start recovers from crash
- [ ] 3 deactivation paths: complete, cancelled, max-iterations

### 4b. Quality Gate Agents

| Agent | Role | When |
|-------|------|------|
| critic | Pre-impl plan review | Before coding |
| verifier | Post-impl acceptance | After coding — quality gates |
| reviewer | Code review | General |

Required:
- [ ] critic.md: deterministic checks, proceed/revise verdict
- [ ] verifier.md: quality gate suite (bun test, tsc, baseline)
- [ ] No overlap; disambiguation in delegation-guide

### 4c. MCP Servers — jcodemunch audit

Validates jcodemunch MCP configuration, indexing state, and wiring into code-exploration workflows. Added 2026-04-16 after activation audit found 0 invocations across 16 sessions post-activation.

**Checks (max 20 pts):**

| Check | Evidence |
|---|---|
| `.mcp.json` contains `jcodemunch` entry | 2 pts |
| `enabledMcpjsonServers` whitelist includes `jcodemunch` | 2 pts |
| `.jcodemunch.jsonc` has `trusted_folders` + `extra_ignore_patterns` | 2 pts |
| Index db exists in `~/.code-index/` for this repo | 3 pts |
| Index fresh (<7 days old) | 2 pts |
| ≥3 of 4 code-exploration agents reference jcodemunch | up to 3 pts |
| Both `delegation-guide.md` + `routing-cheatsheet.md` cover jcodemunch | up to 2 pts |
| ≥1 real invocation in `~/.claude/state/tool-usage.jsonl` | 2 pts |
| Benchmark protocol documented (`thoughts/shared/benchmarks/jcodemunch-phase4.md`) | 2 pts |

**Rationale:** The tool is only useful if (a) registered, (b) indexed, (c) surfaced in agent definitions so Claude reaches for it. Zero-invocation after activation is the strongest signal that surfacing is the bottleneck — this check flags it.

**Run:**
```bash
bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts . 2>&1 | grep -A 20 "mcpJcodemunch"
```

**Quick status (manual):**
```bash
grep -c '"tool":"mcp__jcodemunch__' ~/.claude/state/tool-usage.jsonl  # invocation count
ls -la ~/.code-index/*.db 2>/dev/null                                  # index freshness
claude mcp list 2>&1 | grep jcodemunch                                 # connection status
```

If invocation count is 0 and surfacing is green, run the Phase 4 benchmark in `thoughts/shared/benchmarks/jcodemunch-phase4.md` to decide adoption vs revert.

### 5. Context Engineering (UFC)

| Pattern | Implementation |
|---------|----------------|
| Progressive disclosure | `-> READ:` directives |
| Context routing | Workflow routing in CORE |
| Size limits | <500 lines per file |
| Enforcement | MANDATORY/MUST directives |

### 6. External Skills (Symlinked)

Canonical copy lives at `.claude/skills-external/<name>/` (git-tracked). `~/.agents/skills/` is the `npx skills` CLI cache only. Project symlinks at `.claude/skills/<name>` point to `../skills-external/<name>`. Nightly sync runs `scripts/skills-sync-nightly.sh`.

| Skill | Source | Canonical path |
|-------|--------|----------------|
| visual-explainer | `nicobailon/visual-explainer` | `.claude/skills-external/visual-explainer/` |

Update check:
```bash
grep 'version:' .claude/skills-external/visual-explainer/SKILL.md
gh api repos/nicobailon/visual-explainer/releases/latest --jq '.tag_name'
```

### 7. Adapted Community Skills

Skills adapted from [mattpocock/skills](https://github.com/mattpocock/skills) — rewritten for PAI conventions, not symlinked. Review upstream for improvements to incorporate.

| PAI Location | Upstream Source | What Was Adapted |
|---|---|---|
| `skills/grill-me/SKILL.md` | `grill-me/SKILL.md` | Expanded methodology, probe patterns, PAI structure |
| `skills/design-it-twice/SKILL.md` | `design-an-interface/SKILL.md` | Broadened to architecture+data models, uses `architect` agents |
| `skills/edit-article/SKILL.md` | `edit-article/SKILL.md` | Added Phase 3 humaniser, expanded to docs/specs |
| ~~`skills/refactor-plan/SKILL.md`~~ | ~~`request-refactor-plan/SKILL.md`~~ | RETIRED — subsumed by cruise mode |
| `skills/triage-issue/SKILL.md` | `triage-issue/SKILL.md` | PAI conventions, codebase-analyzer integration, TDD fix plans |
| `skills/ubiquitous-language/SKILL.md` | `ubiquitous-language/SKILL.md` | DDD glossary extraction |
| ~~`skills/prd-to-plan/SKILL.md`~~ | ~~`prd-to-plan/SKILL.md`~~ | RETIRED — subsumed by drive mode + product-shaping Phase 4 |
| `skills/CORE/testing-guide.md` | `tdd/SKILL.md` + `tdd/tests.md` | Merged TDD into existing guide |
| `skills/CORE/references/deep-modules.md` | `tdd/deep-modules.md` | Extracted as shared reference |
| `skills/CORE/references/mocking-guidelines.md` | `tdd/mocking.md` + `improve-codebase-architecture/REFERENCE.md` | Mocking rules + dependency classification |
| `skills/CORE/references/interface-design.md` | `tdd/interface-design.md` | Extracted as shared reference |
| `skills/CORE/references/refactoring-signals.md` | `tdd/refactoring.md` | Extracted as shared reference |
| `skills/product-shaping/workflows/breakdown.md` | `prd-to-issues/SKILL.md` | Vertical slice + HITL/AFK as Phase 4 |
| `agents/codebase-analyzer.md` | `improve-codebase-architecture/SKILL.md` | Friction-driven analysis lens |

Upstream check:
```bash
gh api repos/mattpocock/skills/commits --jq '.[0] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"'
gh api repos/mattpocock/skills/contents/ --jq '.[].name' | sort
```

When upstream changes:
1. Fetch changed files, compare against PAI adaptations
2. Look for: new methodology, improved patterns, additional references
3. Merge while preserving PAI conventions (frontmatter, routing, references)
4. Do NOT blindly replace — PAI versions are intentionally different

Visual-explainer update procedure: prefer the nightly sync (`scripts/skills-sync-nightly.sh`) which runs `npx skills update -y` → rsync into `.claude/skills-external/` → Gemma/structural diff → auto-commit or flag for review. Manual override if needed:
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer-update
rsync -av --delete --exclude='.git' /tmp/visual-explainer-update/ .claude/skills-external/visual-explainer/
rm -rf /tmp/visual-explainer-update
ls -la $(readlink -f .claude/skills/visual-explainer)/SKILL.md
```

Post-update — check for new prompts:
```bash
diff <(ls .claude/skills-external/visual-explainer/prompts/ 2>/dev/null) <(ls .claude/commands/ | grep -f <(ls .claude/skills-external/visual-explainer/prompts/ 2>/dev/null))
```

## Interactive PAI Audit

Extends base cc-upgrade interactive audit. Run base audit first.

### PAI Interview (AskUserQuestion)

**Call 1 — PAI context (2 questions):**

| # | Question | Header | Options |
|---|----------|--------|---------|
| 1 | "Which PAI subsystem needs the most attention?" | PAI focus | **Hook system (Recommended)** — scripts, libs, event coverage; **CORE skill & routing** — identity, workflow routing, tiers; **Agent delegation** — configs, routing, parallel; **Context engineering** — UFC compliance, sizes |
| 2 | "What triggered this audit?" | Trigger | **Post-cleanup validation**; **Capability expansion**; **Debugging**; **Routine maintenance** |

**Call 2 — Deeper diagnostics (based on Call 1):**

If Hook system:

| # | Question | Header | Options | multiSelect |
|---|----------|--------|---------|-------------|
| 3 | "Which hook issues have you encountered?" | Hook issues | **Timeout errors**; **Silent failures** (exit 0 but don't work); **Stdin parsing**; **Settings desync** | true |

If CORE skill:

| # | Question | Header | Options |
|---|----------|--------|---------|
| 3 | "What's wrong with CORE routing?" | Routing | **Wrong workflow loads**; **Missing routes**; **Stale references** (-> READ: points to deleted); **Context bloat** |

If Agent delegation:

| # | Question | Header | Options |
|---|----------|--------|---------|
| 3 | "What's the delegation pain point?" | Delegation | **Wrong agent chosen**; **Agent overlap**; **Missing coverage**; **Performance** |

### PAI Code Review Extensions

In addition to base cc-upgrade review:

**CLAUDE.md compliance**:
- Minimal pointer to CORE (avoids token duplication with CC system prompt)
- Delegation guidance (agent dispatch thresholds)
- No rules duplicating CC built-in behavior

**DECISIONS.md health**:
- Exists, follows template (Chosen/Alternatives/Why/Trade-offs/Revisit if)
- Complies with `.claude/CLAUDE.md` § Documentation Hygiene (Agent-Facing): concise, 1–3 sentences per section, archive pointer present when live file ≥400 lines
- "Revisit if" conditions — flag any now true
- No stale entries referencing deleted files

**Hook library integrity**:
- `pai-paths.ts`: warns on bad paths, never exit(1)
- `jsonl-utils.ts`: imports ensureDir from pai-paths (no duplicate)
- `datetime-utils.ts`: pure functions
- `context-graph/`: CLI resolves, no broken imports

**CORE routing validation**:
- Every `-> READ:` path resolves
- No duplicate trigger patterns
- Documentation Index entries resolve
- Agent table matches `.claude/agents/` contents

### PAI Gap Analysis

```markdown
| PAI Capability | Expected | Actual | Gap | Priority |
|----------------|----------|--------|-----|----------|
| CLAUDE.md minimal + delegation | Pointer to CORE, no duplication | ? | | |
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
| Diderot CLI sync | Skill routes available subcommands | ? | | |
| Diderot schema sync | Skill uses current frontmatter | ? | | |
```

## PAI Report Format

```markdown
# PAI Optimization Report

## Executive Summary
[1-2 sentence PAI-specific assessment]

## Base CC Analysis
[cc-upgrade results summary]

## PAI-Specific Findings

### CORE Skill
- Identity / Workflow routing / Response tiers / Delegation

### Delegation Patterns
| Pattern | Status | Notes |

### Hook Library
| Module | Coverage | Notes |

### UFC Compliance
| Metric | Value | Target |

## PAI-Specific Recommendations
1. [High] ...
2. [Medium] ...
```

## Quick Commands

```bash
# Full PAI audit
bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts $PAI_DIR

# Context graph audit
bun run .claude/hooks/lib/context-graph/cli.ts audit --pai-dir $PAI_DIR/.claude

# Hook test coverage
cd $PAI_DIR/.claude/hooks && bun test --coverage

# External skills analysis
bun run .claude/skills/cc-upgrade/scripts/analyse-external-skills.ts $PAI_DIR

# External skills drift check (run nightly via cron; callable on demand)
bash scripts/skills-sync-nightly.sh
```

## OMC Monitoring

Track [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) as inspiration source. OMC was the prior art that triggered the unified evolution plan (persistent modes, working memory, subagent tracking). May evolve new patterns worth adopting.

```bash
gh api repos/Yeachan-Heo/oh-my-claudecode/commits --jq '.[0:3] | .[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0]) (\(.commit.author.date[0:10]))"'
```

When new features detected:
1. Compare against PAI capabilities
2. IF OMC has pattern PAI lacks: evaluate for adoption
3. IF PAI has better implementation: document why (prevents re-evaluation)
4. Log in `references/external-skills-registry.md`

## Workflow

1. Run base analysis: use `cc-upgrade` skill on generic `.claude/` structure
2. Run PAI-specific: `bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts .`
3. Context graph audit: `bun run .claude/hooks/lib/context-graph/cli.ts audit --pai-dir .claude` — check broken refs, orphaned files, circular deps, bloated skills
4. Hook coverage: `cd .claude/hooks && bun test --coverage`
5. Generate combined report
6. External skills deep analysis: -> READ & EXECUTE: `workflows/external-skills-deep-analysis.md`
7. Apply fixes from recommendations
8. **Update affected documentation (MANDATORY):**
   - Docs referencing changed files/patterns/architecture
   - Key docs: `delegation-guide.md`, `MEMORY.md`
   - If `settings.json` changed: verify `~/.claude/settings.json` symlink resolves
   - If hooks changed: update hook-authoring skill and test expectations
   - If agents changed: update CORE agent table and `delegation-guide.md`
   - If skills added/removed: update CORE Documentation Index
9. **Post-fix validation (MANDATORY):**
   - Load `hook-test` skill workflow (`${PAI_DIR}/skills/hook-test/workflows/test-and-fix.md`) — execute all 8 steps
   - `bun run test`
   - `bun run .claude/hooks/lib/context-graph/cli.ts audit --pai-dir .claude` (broken refs, cycles, orphans)
   - Check pending external-skill reviews: `ls thoughts/shared/introspection/skills-review-*.md 2>/dev/null`
   - Do NOT report success until all validations pass
