# Routing Cheatsheet — All Activation Patterns

Quick reference for every trigger, keyword, and activation mechanism in Qara's PAI system.

---

## 1. Keyword Routes (regex via keyword-router.ts)

Activated by `UserPromptSubmit` hook before CORE routing evaluates. Takes precedence over everything.

| Route | Regex Patterns | Effect |
|-------|----------------|--------|
| `drive` | `\bdrive mode\b` · `\bdrive:\s` · `\bdrive this\b` | Activates drive mode (maxIter:50, ext:2×10) + injects drive skill |
| `cruise` | `\bcruise mode\b` · `\bcruise:\s` · `\bcruise this\b` | Activates cruise mode (maxIter:20, ext:1×5) + injects cruise skill |
| `turbo` | `\bturbo mode\b` · `\bturbo:\s` · `\bturbo this\b` | Activates turbo mode (maxIter:30, ext:1×5) + injects turbo skill |
| `stop-mode` | `\bstop mode\b` · `\bexit mode\b` · `\bmode off\b` · `\bcancel mode\b` | Deactivates any active mode |
| `tune` | `\btoo loud\b` · `\btoo bold\b` · `\btoo safe\b` · `\btoo bland\b` · `\btoo gray\b` · `\btoo monochromatic\b` · `\bmake it bolder\b` · `\btone (?:it\|this) down\b` · `\bmore colorf?ul\b` · `\bneeds? (?:more )?color\b` · `\blacks? personality\b` | Injects `tune` skill (intensity dispatcher: bolder/quieter/colorize) |
| `impeccable-typeset` | `\btypography (?:off\|wrong\|broken)\b` · `\bfonts? look wrong\b` · `\bfix typography\b` · `\btype hierarchy broken\b` · `\breadability issues\b` | Injects `impeccable-typeset` local wrapper |
| `tokens` | `\bdesign tokens?\b` · `\bdesign system\b` · `\bhardcoded colors?\b` · `\btheme variables?\b` · `\bextract palette\b` · `\btoken hierarchy\b` | Injects `tokens` alias (delegates to `/impeccable extract`) |
| `flows` | `\buser (?:flow\|journey)\b` · `\binformation architecture\b` · `\bIA audit\b` · `\bnav(?:igation)? structure\b` · `\bsite ?map\b` · `\bmenu hierarchy\b` | Injects `flows` skill (product-scoped journeys, IA, navigation) |
| `polish` (state phrases) | `\bempty state\b` · `\bloading state\b` · `\bskeleton screen\b` · `\berror state\b` · `\bfirst.?run\b` · `\bno.?results?\b` · `\bzero.?data\b` | Injects `polish` skill (state coverage replaces killed `states` skill) |

**Examples:** `"drive: implement the auth flow"` · `"cruise this"` · `"the hero is too loud"` · `"fix the typography"` · `"extract design tokens"` · `"map the user journey"`

---

## 2. CORE Workflow Routes (semantic, SKILL.md)

Evaluated after keyword-router. Mode-specific workflows override these when a mode is active.

| Trigger phrases | Action |
|-----------------|--------|
| "update the Qara repo", "push these changes", "commit and push", "sync repo" | READ `skills/CORE/workflows/git-update-repo.md` |
| "merge conflict", "complex decision", "git conflict", "resolve conflict" | READ `skills/CORE/workflows/merge-conflict-resolution.md` |
| "explore codebase", "understand architecture", "before we start", "how does X work", "walk me through" | READ `skills/CORE/workflows/exploration-pattern.md` |
| "background research", "research while I work", "async research", "look into X for me" | READ `skills/research/workflows/conduct.md` |
| "rewind", "checkpoint", "rollback", "recover", "undo changes" | READ `skills/CORE/workflows/checkpoint-protocol.md` |
| "ask diderot", "diderot search", "check my notes", "what do I know about", "vault search", "in my knowledge base" | INVOKE SKILL: diderot |
| "review this plan", "is this approach right?", "check my plan", "critique this" | SPAWN AGENT: critic |
| "is this plan ready", "check plan readiness", "assess this plan", "ready to implement?", "accept and implement", "ready to build" | READ `skills/CORE/workflows/plan-readiness-assessment.md` — verdict + routing |
| "verify this works", "check acceptance criteria", "run verification", "did this pass?" | SPAWN AGENT: verifier |

---

## 3. Skill Triggers (from SKILL.md USE WHEN / triggers frontmatter)

These phrases invoke the named skill when spoken naturally.

| Skill | Trigger phrases |
|-------|----------------|
| `diderot` | "ask diderot", "diderot search", "check my notes", "what do I know about", "vault search", "in my knowledge base", "find notes about", "what have I saved about" |
| `introspect` | "daily reflect", "introspect", "mine logs", "weekly synthesize", "monthly evolve", "self-audit", "what patterns do you see", "review sessions" |
| `image` | "generate image", "create graphic", "hero image", "blog image", "UI mockup", "stock photo", "unsplash", "teaching diagram", "visual", "illustration" |
| `research` | "research X", "extract wisdom from", "analyze this content", "find info about" |
| `csf-view` | "csf-view", "open canvas", "visual shaping", "tldraw", "draw it" |
| `product-shaping` | "product-shaping", "shape", "spec", "new feature", "scope this", "research competitors", "user evidence", "codebase audit" |
| `triage-issue` | "triage this bug", "investigate issue", "file a bug", "root cause analysis", "what's causing this", "create issue for this bug", "batch triage", "QA session" |
| `grill-me` | "grill me", "stress-test this", "poke holes", "challenge this", "what am I missing", "devil's advocate" |
| `edit-article` | "edit this article", "tighten this", "restructure this doc", "improve this spec", "revise this" |
| `humaniser` | "humanise this", "remove AI patterns", "make this sound natural" |
| `tdd-qa` | "run TDD", "write scenarios", "backtest", "set up testing", "run the pyramid", "verify E2E", "init testing", "quality gates" |
| `hook-authoring` | "create hook", "hook system", "modify hooks", "add hook" |
| `system-create-skill` | "create skill", "new skill", "build skill", "make skill", "skill for X", "Create-A-Skill", "validate skill", "audit skill" |
| `system-create-cli` | "create CLI", "build command-line tool", "make CLI for X", "generate CLI", "add command to CLI", "upgrade CLI", "add tests to CLI", "publish CLI", "wrap Claude in a CLI", "AI CLI", "Claude-powered CLI", "expose CLI as MCP", "MCP server CLI" |
| `ubiquitous-language` | "define terms", "glossary", "ubiquitous language", "domain terminology", "what do we call X", "clarify naming", "DDD" |
| `cc-upgrade` | "audit this CC setup", "check CC compatibility", "optimize .claude/ folder" |

---

## 3a. Planning Lifecycle (hub-and-spoke)

Entry points (any planning tool produces a plan file):
- **Plan mode** (Shift+Tab) → lightweight scoping → `thoughts/shared/plans/`
- **Ultraplan** (`/ultraplan`) → cloud planning → **always teleport back** to local terminal
- **`/create_plan`** → deep interactive planning with research agents

Quality hub:
- **`/grill-me`** → stress-tests plan, ends with readiness verdict (invokes assessment)
- **"is this plan ready?"** → standalone readiness assessment → verdict + routing

Execution dispatch (recommended by readiness assessment):
- Any plan, sequential phases → `cruise: implement {plan-file}`
- 3+ independent phases → `turbo: implement {plan-file}`
- PRD with user stories → `drive:` (separate track, not plan-consuming)

Quality enforcement per mode (gap matrix, coverage definition):
→ READ `.claude/context/execution-modes-quality.md`

Plan naming: `domain--specific-feature-vN.md` (e.g., `planning-ux--unified-lifecycle-v1.md`)

---

## 4. Slash Commands

Invoked as `/command-name` in Claude Code.

| Command | File | Description |
|---------|------|-------------|
| `/research` | `commands/research.md` | Research auto-select (picks best researcher agent) |
| `/create_plan` | `commands/create_plan.md` | Create detailed implementation plan (interactive, opus) |
| `/validate_plan` | `commands/validate_plan.md` | Validate implementation against plan + success criteria |
| `/research_codebase` | `commands/research_codebase.md` | Document codebase as-is using thoughts/ history |
| `/skills` | `commands/skills.md` | Skills discovery — list available skills |
| `/spotcheck` | `commands/spotcheck.md` | Verify quality/consistency after parallel agent dispatches |
| `/create_handoff` | `commands/create_handoff.md` | Create handoff doc for transferring work to next session |

---

## 5. Design Skills

All are `user-invocable: true`. Say the skill name or describe the intent.

**Post-optimization 2026-04-16 — 10 active design skills (2 symlinked + 8 local).** 10 former symlinks (impeccable, shape, layout, adapt, animate, audit, clarify, critique, optimize, polish) removed from `.claude/skills/` — content preserved in `skills-external/` for reference but no activation path. See `.claude/context/design-skills-map.md` for the full landscape.

**Pipeline source of truth:** `.claude/skills-external/impeccable/reference/craft.md` (5-step build methodology).

| Skill | Origin | Trigger / intent |
|-------|--------|-----------------|
| `harden` | symlink | Accessibility, performance, resilience |
| `visual-explainer` | symlink | Create diagrams and visual explanations |
| `tune` | local | Intensity dispatcher (bolder/quieter/colorize modes) |
| `impeccable-typeset` | local | Typography wrapper over `impeccable/reference/typography.md` |
| `tokens` | local | Thin alias for `/impeccable extract` |
| `flows` | local | Product-scoped journeys, IA, navigation |
| `design-it-twice` | local | Parallel-agent module design (software-biased) |
| `design-implementation` | local | Automated dev-server + browser-verify loop |
| `image` | local | AI image generation / stock sourcing |
| `csf-view` | local | Visual canvas (tldraw) for design communication |
| `csf-view` | local | tldraw canvas input |

**Removed** (2026-04-16 consolidation):
- `bolder`, `quieter`, `colorize` → merged into `tune` (use `/tune bolder|quieter|colorize`)
- `typeset` → wrapped by `impeccable-typeset` (use `/impeccable-typeset`)

**Removed (earlier rounds):**
- `frontend-design`, `teach-impeccable` → folded into `impeccable` (craft / teach subcommands)
- `extract` → use `impeccable extract` subcommand (or `/tokens` alias)
- `arrange` → renamed to `layout`
- `normalize`, `onboard` → absorbed into `polish`
- `delight`, `distill`, `overdrive` → pruned as redundant with impeccable's scope

---

## 6. Agent Delegation

Use via `Task` tool with `subagent_type`. Parallelize when tasks are independent.

| Agent | Model | Typical trigger |
|-------|-------|----------------|
| `architect` | opus | PRD creation, system design, technical specs, implementation planning |
| `critic` | sonnet (→opus on 3rd retry) | Pre-implementation plan review, risk check |
| `verifier` | sonnet (→opus on 3rd retry) | Post-implementation acceptance, quality gates |
| `reviewer` | sonnet (→opus on 3rd retry) | Code review: correctness, security, perf, maintainability |
| `designer` | opus | UX/UI, typography, visual polish (loads `impeccable` skill — fix 2026-04-16) |
| `engineer` | sonnet | Code implementation, debugging, optimization, testing |
| `codebase-analyzer` | sonnet | Trace data flow, explain components with file:line refs (calls jcodemunch MCP first — 2026-04-16) |
| `thoughts-analyzer` | haiku | Find + analyze thoughts/ docs for insights and decisions |
| `claude-researcher` | haiku | Primary web research (always try first) |
| `gemini-researcher` | haiku | Fallback when WebSearch fails or returns stale results |

---

## 6a. MCP Tools for Code Exploration (jcodemunch)

**First-touch for code questions** — use jcodemunch MCP before Grep/Read on `.ts`/`.py`/`.js` files. ~20× cheaper in tokens for symbol queries. Qara repo id: resolve via `mcp__jcodemunch__resolve_repo` (hash is path-deterministic; currently `local/qara-379c52b4` after 2026-04-16 indexing of 277 files / 3,699 symbols).

| Situation | Tool call | Fallback |
|---|---|---|
| Where is function X defined? | `search_symbols({query:"X", detail_level:"compact"})` | Grep |
| Show me the body of function Y | `search_symbols → get_symbol_source(symbol_id)` | Read |
| Signatures in this file | `get_file_outline({file_path})` | Read |
| Who calls function Z? | `find_importers` or `get_call_hierarchy(direction:"callers")` | Grep `\bZ\(` |
| If I change X, what breaks? | `get_blast_radius(symbol_id)` | Grep + Read |
| Dependency cycles | `get_dependency_cycles()` | — (no simple Grep) |
| Untested symbols | `get_untested_symbols()` | — |
| Dead code | `find_dead_code` / `get_dead_code_v2` | — |
| Safe rename preview | `check_rename_safe(old, new)` | — |
| What symbols changed in diff | `get_changed_symbols(base, head)` | `git diff` + Read |

**Schema loading:** jcodemunch tool schemas are deferred — if you see them in the "deferred tools" list, call `ToolSearch` with `"select:mcp__jcodemunch__<name>[,<name>...]"` first.

**Re-index after major changes:** `mcp__jcodemunch__index_folder({path:"/home/jean-marc/qara", use_ai_summaries:false})`. Takes ~2s for full qara. Auto-invalidates stale entries.

**Not indexed:** `thoughts/`, `purgatory/`, `.claude/state/`, `.claude/skills-external/`, `node_modules/`, `dist/`, `.git/` (via `.jcodemunch.jsonc` `extra_ignore_patterns`).

**Benchmark window:** 2026-04-16 single-day opportunistic (compressed from 1-week 2026-04-16). Protocol in `thoughts/shared/benchmarks/jcodemunch-phase4.md`. Builder tier ($79) decision end-of-day 2026-04-16 pending benchmark outcome.

---

## 7. Hook Events

14 CC hook events registered in `settings.json`. 19 hook scripts total (added `post-tool-use-sanitize.ts` 2026-04-15 — WebFetch/WebSearch prompt-injection defense). Runs in order listed for each event.

| Event | Scripts | What it does |
|-------|---------|-------------|
| `SessionStart` | `session-start.ts` | Load hints, mode state, session context |
| `PreToolUse` | `rtk-rewrite.sh` | RTK v0.34.2 — rewrites Bash for 60-90% token reduction |
| `PreToolUse` | `pre-tool-use-security.ts` | Block destructive ops (deny list) |
| `PreToolUse` | `pre-tool-use-tdd.ts` | TDD enforcement — track test/implementation ratio |
| `PreToolUse` | `pre-tool-use-quality.ts` | Quality sniff gate before write ops |
| `UserPromptSubmit` | `update-tab-titles.ts` | Set terminal tab title from prompt content |
| `UserPromptSubmit` | `keyword-router.ts` | Detect drive/cruise/turbo/stop-mode, inject skill |
| `PostToolUse` | `post-tool-use.ts` | Trace logging, JSONL audit trail |
| `PostToolUseFailure` | `post-tool-failure.ts` | Log failures, update error metrics |
| `SubagentStart` | `subagent-start.ts` | Track agent spawns for delegation metrics |
| `SubagentStop` | `subagent-stop.ts` | Finalize agent trace on completion |
| `PreCompact` | `pre-compact.ts` | Checkpoint working memory before context compaction |
| `PostCompact` | `post-compact.ts` | Post-compaction state reconciliation |
| `Stop` | `stop-hook.ts` | Session wrap-up: persist state, update tab title |
| `StopFailure` | `stop-failure.ts` | Handle stop hook failures, graceful degradation |
| `ConfigChange` | `config-change.ts` | Sync config changes, rebuild derived state |
| `PermissionDenied` | `permission-denied.ts` | Log denied tool calls for security audit |
| `TaskCreated` | `task-created.ts` | Track task creation for progress monitoring |
