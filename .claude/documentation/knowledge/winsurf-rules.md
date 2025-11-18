# WinSurf Rules

## Purpose
- Serve as WinSurf's operating manual inside the Qara Personal AI Infrastructure (PAI).
- Translate CLAUDE.md guidance into concise, enforceable rules WinSurf can follow without reloading the full document.

## Core Philosophy
- Prioritize architecture and process integrity over improvisation ("System over Intelligence").
- Operate as part of a personal infrastructure, not a generic software repo.
- Optimize for signal-to-noise ratio: load only the context required for the active task.

## Operating Context
### System Identity & Role
- Respect that CORE skill defines identity, preferences, security rules, and response formats.
- Treat every action as occurring inside the user's personal AI OS; default to caution with data and automation.

### Context Management (3 tiers)
1. **Tier 1:** CORE skill (always on, ~2 KB) – already loaded at session start.
2. **Tier 2:** Documentation files (~200 KB) – load on demand when relevant.
3. **Tier 3:** Project-specific contexts – load only when explicitly requested.

## Capability Modules
### Skills
- Understand each skill contains `skill.yml`, `SKILL.md`, optional `CLAUDE.md`, and resources.
- Use progressive disclosure: invoke only the skills relevant to the task (e.g., CORE, research, agent-observability, fabric, prompting, create-skill).

### Hooks
- Lifecycle automation exists for SessionStart, UserPromptSubmit, Pre/PostToolUse, Stop/SubagentStop, and PreCompact.
- Hooks live in `.claude/hooks/` and are registered in `.claude/settings.json`.

### Agents
- Specialized personas available via `Task(subagent_type=...)`: architect (Nova), engineer (Atlas), designer, researcher, claude-researcher, gemini-researcher.
- Use agents for complex, multi-step tasks; default to direct execution otherwise.

## Operational Playbooks
### Creating a Skill
1. Invoke `Skill(create-skill)` to load the template.
2. Review `.claude/skills/example-skill/` for reference.
3. Follow structure: metadata (`skill.yml`), instructions (`SKILL.md`), optional `CLAUDE.md`, optional `resources/`.
4. Test invoking the skill and verify docs.
5. Update `CLAUDE.md` if the new skill changes system capabilities.

### Adding a Hook
1. Place a TypeScript file in `.claude/hooks/` with the correct signature.
2. Register it inside `.claude/settings.json` under `hooks`.
3. Test against the appropriate lifecycle event.
4. Document intent in `.claude/documentation/knowledge/hooks.md`.

### Running Research
- **Method 1 (preferred):** Launch Task tool with researcher, claude-researcher, or gemini-researcher agents (parallel agents encouraged for depth).
- **Method 2:** `Skill(research)` loads research patterns.
- **Modes:** Quick (3 agents), Standard (9 agents), Extensive (24 agents).

### Documentation Standards
- Core docs: `.claude/documentation/knowledge/`, plans in `.claude/documentation/plans/`, domain contexts inside `.claude/context/*/`.
- All Markdown must satisfy `.markdownlint.json` rules: specify code block languages, add blank lines around structural elements, keep line length ≤120 (except code/tables), format tables with proper spacing.

## Security Rules
1. **Before any git action:** run `pwd` and `git remote -v` to confirm location.
2. Treat `~/.claude/` as highly sensitive; never expose it publicly.
3. Verify remotes three times before staging/committing.
4. Keep `.env` (API keys) out of commits; double-check before staging.
5. Run `git status`, `git diff --cached`, and targeted `grep` for secrets before commits.
6. Assume all repo contents could be sensitive; default to least-privilege behavior.

## Tooling & Stack Preferences
- Use modern CLI defaults: `fd` for search, `rg` for text, `bat` for viewing, `ast-grep` for semantic queries.
- Validate Markdown via `markdownlint-cli2` using the repo config.
- Store experiments in `~/.claude/scratchpad/YYYY-MM-DD-HHMMSS_description/`, not in core directories.

## Known Issues & Limitations
- Multi-agent research lacks progress visibility; expect silent runs and plan mitigations.
- Recovery gaps: ~33% agent failure observed; add validation and fallback logic when possible.
- Result deduplication missing – anticipate duplicate sources and handle downstream.

## Useful Commands Reference
- Verify remotes: `git remote -v`.
- Inspect recent work: `git log --oneline -10`.
- List skills: `ls -la .claude/skills/`.
- List hooks: `ls -la .claude/hooks/*.ts`.
- Validate Markdown: `markdownlint-cli2 '**/*.md'`.
- Search text: `rg "pattern" --type md`.
- Find files: `fd "pattern" .claude/`.

## When Uncertain
- Check `.claude/documentation/knowledge/` for conceptual guidance.
- Read the relevant skill's `SKILL.md` for usage patterns before invoking.
- Always re-verify git remotes before committing or pushing any change.
- Default to concise, actionable communication aligned with CORE formatting rules.
