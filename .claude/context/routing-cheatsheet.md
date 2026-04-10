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

**Examples:** `"drive: implement the auth flow"` · `"cruise this"` · `"stop mode"`

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
| `system-create-skill` | "create skill", "new skill", "build skill", "make skill", "skill for X", "Create-A-Skill" |
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
- 1-2 phases, simple → `/implement_plan`
- 3+ sequential phases → `cruise: implement {plan-file}`
- 3+ independent phases → `turbo: implement {plan-file}`
- PRD with user stories → `drive:` (separate track, not plan-consuming)

Quality enforcement per mode (gap matrix, coverage definition, `/implement_plan → drive` migration decision):
→ READ `.claude/context/execution-modes-quality.md`

Plan naming: `domain--specific-feature-vN.md` (e.g., `planning-ux--unified-lifecycle-v1.md`)

---

## 4. Slash Commands

Invoked as `/command-name` in Claude Code.

| Command | File | Description |
|---------|------|-------------|
| `/research` | `commands/research.md` | Research auto-select (picks best researcher agent) |
| `/create_plan` | `commands/create_plan.md` | Create detailed implementation plan (interactive, opus) |
| `/implement_plan` | `commands/implement_plan.md` | Implement a plan from `thoughts/shared/plans/` |
| `/validate_plan` | `commands/validate_plan.md` | Validate implementation against plan + success criteria |
| `/research_codebase` | `commands/research_codebase.md` | Document codebase as-is using thoughts/ history |
| `/skills` | `commands/skills.md` | Skills discovery — list available skills |
| `/spotcheck` | `commands/spotcheck.md` | Verify quality/consistency after parallel agent dispatches |
| `/create_handoff` | `commands/create_handoff.md` | Create handoff doc for transferring work to next session |

---

## 5. Design Skills (symlinked from .agents/skills)

All are `user-invocable: true`. Say the skill name or describe the intent.

| Skill | Trigger / intent |
|-------|-----------------|
| `adapt` | Adapt design for different screen/device/context |
| `animate` | Add purposeful animations and micro-interactions |
| `arrange` | Layout and spatial composition review |
| `audit` | Design audit — systematic quality review |
| `bolder` | Make design more confident / less timid |
| `clarify` | Improve information hierarchy and clarity |
| `colorize` | Color palette, contrast, and brand alignment |
| `critique` | Design critique — structured feedback |
| `delight` | Add delight and polish to interactions |
| `distill` | Simplify and reduce — remove noise |
| `extract` | Extract design patterns or reusable components |
| `frontend-design` | Full frontend design workflow (used by designer agent) |
| `harden` | Accessibility, performance, resilience |
| `normalize` | Consistency pass — normalize spacing, type, tokens |
| `onboard` | Onboarding flow design and review |
| `optimize` | Performance and render optimization |
| `overdrive` | Maximum design intensity — full polish sprint |
| `polish` | Final polish pass before shipping |
| `quieter` | Reduce visual noise, improve focus |
| `teach-impeccable` | Teaching-quality design with impeccable craft |
| `typeset` | Typography review and correction |
| `visual-explainer` | Create diagrams and visual explanations |

---

## 6. Agent Delegation

Use via `Task` tool with `subagent_type`. Parallelize when tasks are independent.

| Agent | Model | Typical trigger |
|-------|-------|----------------|
| `architect` | opus | PRD creation, system design, technical specs, implementation planning |
| `critic` | opus | Pre-implementation plan review, risk check |
| `verifier` | opus | Post-implementation acceptance, quality gates |
| `reviewer` | opus | Code review: correctness, security, perf, maintainability |
| `designer` | opus | UX/UI, typography, visual polish (loads frontend-design skill) |
| `engineer` | sonnet | Code implementation, debugging, optimization, testing |
| `codebase-analyzer` | sonnet | Trace data flow, explain components with file:line refs |
| `thoughts-analyzer` | sonnet | Find + analyze thoughts/ docs for insights and decisions |
| `claude-researcher` | haiku | Primary web research (always try first) |
| `gemini-researcher` | haiku | Fallback when WebSearch fails or returns stale results |

---

## 7. Hook Events

14 CC hook events registered in `settings.json`. 18 hook scripts total. Runs in order listed for each event.

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
