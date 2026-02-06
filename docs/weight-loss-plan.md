# Qara Weight Loss Plan

**Goal:** Strip redundancy with CC built-ins, reduce token overhead, keep what's genuinely valuable.
**Method:** Move cut files to `purgatory/` in their respective directory structure. Edit survivors in-place.

---

## Phase 1: Agents — Purge All

**Why:** Every one maps 1:1 to a CC built-in `subagent_type`. The built-ins are in the binary.

```bash
# Move all 15 agent definitions to purgatory
mv .claude/agents/architect.md                    purgatory/agents/
mv .claude/agents/claude-researcher.md            purgatory/agents/
mv .claude/agents/codebase-analyzer.md            purgatory/agents/
mv .claude/agents/codebase-locator.md             purgatory/agents/
mv .claude/agents/codebase-pattern-finder.md      purgatory/agents/
mv .claude/agents/designer.md                     purgatory/agents/
mv .claude/agents/design-implementation-reviewer.md purgatory/agents/
mv .claude/agents/design-iterator.md              purgatory/agents/
mv .claude/agents/engineer.md                     purgatory/agents/
mv .claude/agents/gemini-researcher.md            purgatory/agents/
mv .claude/agents/perplexity-researcher.md        purgatory/agents/
mv .claude/agents/researcher.md                   purgatory/agents/
mv .claude/agents/thoughts-analyzer.md            purgatory/agents/
mv .claude/agents/thoughts-locator.md             purgatory/agents/
mv .claude/agents/web-search-researcher.md        purgatory/agents/
```

**Risk:** Zero. CC's Task tool already knows these agent types.

---

## Phase 2: Commands — Cut 4 Redundant Research Commands

**Why:** `/research` auto-selects provider. The model can be told "use perplexity" in natural language.

```bash
mkdir -p purgatory/commands
mv .claude/commands/research-perplexity.md   purgatory/commands/
mv .claude/commands/research-claude.md       purgatory/commands/
mv .claude/commands/research-gemini.md       purgatory/commands/
mv .claude/commands/web-research.md          purgatory/commands/
```

**Keep:** `/research` (auto-select), `/research_codebase`, all non-research commands.

---

## Phase 3: Security Hook — Purge

**Why:** CC's permission system + settings.json deny list + model safety rails = triple coverage already. Hook fires on every Bash call adding latency for near-zero marginal safety.

```bash
mkdir -p purgatory/hooks/lib
mv .claude/hooks/pre-tool-use-security.ts    purgatory/hooks/
mv .claude/hooks/lib/checkpoint-utils.ts     purgatory/hooks/lib/
mv .claude/hooks/lib/checkpoint-utils.test.ts purgatory/hooks/lib/
mv .claude/hooks/lib/jsonl-utils.ts          purgatory/hooks/lib/
mv .claude/hooks/lib/jsonl-utils.test.ts     purgatory/hooks/lib/
```

**Then:** Remove the PreToolUse hook entry from `settings.json`.
**Keep:** Dual-repo security model, pre-commit .env prevention, settings.json deny list.

---

## Phase 4: CORE Skill — Purge Redundant Reference Files

**Why:** 47 files in CORE. Many restate CC built-in behavior or are never triggered.

### 4a. Delegation files (CC's Task tool docs cover this)

```bash
mkdir -p purgatory/skills/CORE
mv .claude/skills/CORE/delegation-guide.md          purgatory/skills/CORE/
mv .claude/skills/CORE/delegation-advanced.md        purgatory/skills/CORE/
mv .claude/skills/CORE/delegation-decomposition.md   purgatory/skills/CORE/
mv .claude/skills/CORE/delegation-launch.md          purgatory/skills/CORE/
mv .claude/skills/CORE/delegation-spotcheck.md       purgatory/skills/CORE/
mv .claude/skills/CORE/swarm-patterns.md             purgatory/skills/CORE/
mv .claude/skills/CORE/agent-guide.md                purgatory/skills/CORE/
```

### 4b. Routing architecture files (model routes naturally)

```bash
mv .claude/skills/CORE/routing-level1-system.md      purgatory/skills/CORE/
mv .claude/skills/CORE/routing-level2-activation.md   purgatory/skills/CORE/
mv .claude/skills/CORE/routing-level3-context.md      purgatory/skills/CORE/
mv .claude/skills/CORE/routing-level4-workflow.md      purgatory/skills/CORE/
mv .claude/skills/CORE/routing-patterns.md             purgatory/skills/CORE/
mv .claude/skills/CORE/routing-pattern-types.md        purgatory/skills/CORE/
mv .claude/skills/CORE/skill-archetypes.md             purgatory/skills/CORE/
mv .claude/skills/CORE/skill-structure.md              purgatory/skills/CORE/
```

### 4c. Response format examples (dropping the tier system)

```bash
mkdir -p purgatory/skills/CORE/workflows
mv .claude/skills/CORE/workflows/response-format-examples.md  purgatory/skills/CORE/workflows/
```

### 4d. Hook reference files (redundant with hooks-guide.md context file)

```bash
mv .claude/skills/CORE/hook-quickref.md          purgatory/skills/CORE/
mv .claude/skills/CORE/hook-reference.md          purgatory/skills/CORE/
mv .claude/skills/CORE/hook-system.md             purgatory/skills/CORE/
mv .claude/skills/CORE/hook-troubleshooting.md    purgatory/skills/CORE/
```

### 4e. CC features file (one-time migration reference)

```bash
mv .claude/skills/CORE/cc-features.md             purgatory/skills/CORE/
```

### 4f. Approval patterns (CC handles this natively)

```bash
mv .claude/skills/CORE/approval-patterns.md        purgatory/skills/CORE/
```

### 4g. TOOLS.md (CC knows its own tools)

```bash
mv .claude/skills/CORE/TOOLS.md                    purgatory/skills/CORE/
```

**Purged:** 24 of 47 CORE files.

**Keep in CORE:**
- `SKILL.md` (slimmed — see Phase 6)
- `CONSTITUTION.md`, `contacts.md`, `MY_DEFINITIONS.md`
- `stack-preferences.md`, `testing-guide.md`, `security-protocols.md`
- `cli-first-guide.md`, `cli-first-patterns.md`, `cli-first-api.md`, `cli-first-design.md`, `cli-first-prompting.md`
- `aesthetic.md`, `prompting.md`, `terminal-tabs.md`, `macos-fixes.md`
- `history-system.md`
- `workflows/git-update-repo.md`, `workflows/merge-conflict-resolution.md`
- `workflows/exploration-pattern.md`, `workflows/checkpoint-protocol.md`
- `workflows/file-organization-detailed.md`
- `workflows/intelligent-assistance-implementation.md`, `workflows/voice-routing-full.md`

---

## Phase 5: Hook Libs — Purge Orphans

After Phase 3, check which libs lost all consumers.

```bash
# transcript-utils only used by stop-hook for COMPLETED extraction — evaluate
# If stop-hook is simplified to just tab titles, purge:
mv .claude/hooks/lib/transcript-utils.ts       purgatory/hooks/lib/
mv .claude/hooks/lib/transcript-utils.test.ts  purgatory/hooks/lib/
```

**Keep:** `pai-paths.ts`, `stdin-utils.ts`, `tab-titles.ts`, `datetime-utils.ts` + their tests.

---

## Phase 6: Edit CORE SKILL.md

Slim the system prompt that loads every session. Remove these sections:

1. **Delete** the `🤝 Delegation` section (lines 115-124) — CC knows how to delegate
2. **Delete** the `📋 Response Format` section (lines 127-159) — replace with one line
3. **Update** Documentation Index table — remove rows for purged files:
   - Remove: `agent-guide.md`, `delegation-guide.md`, `cc-features.md`
   - Remove: `Checkpoints` row (if checkpoint-protocol.md is still useful, it stays but doesn't need an index entry — the model finds it via workflow routing above)
4. **Update** Workflow Routing — remove the delegation route:
   - Remove: "When user says 'use parallel agents', 'delegate tasks'" block
5. **Add** one line to Operating Principles or Identity: "Be concise by default. Give detail when the task warrants it."

**Target:** CORE SKILL.md from ~164 lines to ~90 lines. ~800 tokens instead of ~2000.

---

## Phase 7: settings.json — Remove Security Hook Entry

Remove the `PreToolUse` hook configuration block that references `pre-tool-use-security.ts`.
Keep all other hooks (SessionStart, UserPromptSubmit, Stop).

---

## Not In Scope (Keep As-Is)

| Component | Why it stays |
|---|---|
| **CORE identity/personality** | Shapes every interaction |
| **Stack preferences** | Concise, effective, globally applied |
| **Dual-repo security model** | Real risk CC doesn't handle |
| **humaniser skill** | Specialized domain knowledge |
| **frontend-design skill** | Anti-generic-AI aesthetic philosophy |
| **hook-authoring skill** | CC hooks are new, guidance helps |
| **system-create-skill** | Self-meta tooling |
| **system-create-cli** | CLI template value |
| **design-implementation skill** | Real automation (server+browser+verify loop) |
| **research skill** | Multi-source approach, auto-selection |
| **story-explanation skill** | Narrative formatting |
| **prompting skill** | Prompt engineering standards |
| **Tab title hooks** | UX polish |
| **Context files** | bun-guide.md, hooks-guide.md |
| **Settings layering** | settings.json + settings.local.json |
| **Pre-commit quality gates** | .env prevention, real safety |

---

## Reassess Later

After living with the cuts for 2-4 weeks:

1. **cc-upgrade / cc-upgrade-pai** — One-time migration tools? If unused, purge to purgatory/skills/.
2. **example-skill** — Teaching tool. Purge if not onboarding anyone.
3. **Stop hook complexity** — If simplified to just tab titles, consider whether it's worth keeping as a hook at all.
4. **CLI-first files** — 5 files (guide, patterns, api, design, prompting). Are all 5 triggered, or can they consolidate?
5. **Plan commands** (`/create_plan`, `/implement_plan`, `/validate_plan`) — If humanlayer sync is unused, replace with CC's native plan mode.

---

## Expected Outcome

| Metric | Before | After |
|---|---|---|
| Agent definitions | 15 files | 0 |
| Commands | 15 | 11 |
| CORE files | 47 | 23 |
| CORE SKILL.md | ~164 lines / ~2000 tokens | ~90 lines / ~800 tokens |
| Hook scripts | 4 | 3 |
| Hook libs | 7 (+tests) | 4 (+tests) |
| Total files purged | ~50 | → purgatory/ |

Net effect: Less context per session, fewer moving parts, same effective capability. Everything recoverable from purgatory if needed.

---

## Post-Mortem: Phase 1 Partially Reversed

**Phase 1 was based on a false premise.** The plan claimed "Every [agent] maps 1:1 to a CC built-in `subagent_type`." This is incorrect — CC's built-in subagent types are only: `Bash`, `general-purpose`, `Explore`, `Plan`, `claude-code-guide`, `statusline-setup`. Custom agents like `codebase-analyzer`, `architect`, `designer` etc. are NOT built-in and require `.claude/agents/` definitions to exist.

**Reversed:** 6 agents restored from purgatory, optimized (73% token reduction from originals), and wired back into CORE SKILL.md:
- `codebase-pattern-finder`, `codebase-analyzer` (codebase specialists)
- `thoughts-analyzer`, `thoughts-locator` (thoughts/ specialists)
- `designer` (with frontend-design skill), `architect` (with research skill)

**Still deleted (correctly):** `engineer` (main agent covers this), `codebase-locator` (Explore built-in replaces it), all research-specific agents (research skill handles routing), `design-iterator`, `design-implementation-reviewer`, `zai-coder`, `zai-researcher`.

**Updated metric:** Agent definitions: 15 → 0 → **6** (optimized)
