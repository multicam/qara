# PAI Contract

**Guarantees for Personal AI Infrastructure (Qara)**

This document defines what works out of the box when PAI is set up correctly.

---

## Core Guarantees

### 1. Directory Structure
```
${PAI_DIR}/
├── hooks/          # Event handlers (session-start, stop, etc.)
├── skills/         # Loadable context (CORE always loaded)
├── agents/         # Agent definitions
├── history/        # Session history and captures
└── settings.json   # Configuration
```

### 2. CORE Skill Loads Automatically
- `skills/CORE/SKILL.md` loads at every session start
- Contains identity, routing, stack preferences, security protocols

### 3. Hooks Execute Reliably
- `session-start.ts` - Loads CORE context at session start
- `pre-tool-use-security.ts` - Blocks dangerous Bash commands
- `pre-tool-use-tdd.ts` - TDD discipline enforcement (Write/Edit/MultiEdit)
- `pre-tool-use-quality.ts` - Advisory duplicate code detection (Write/Edit)
- `post-tool-use.ts` - Logs all tool usage to JSONL
- `post-tool-failure.ts` - Tracks tool failure patterns
- `update-tab-titles.ts` - Sets terminal tab titles on prompt submit
- `keyword-router.ts` - Activates execution modes (drive/cruise/turbo)
- `stop-hook.ts` - Checkpoint logging, tab update on completion
- `subagent-start.ts` / `subagent-stop.ts` - Subagent lifecycle tracking
- `pre-compact.ts` - Context preservation before compaction
- `config-change.ts` - Settings sync validation
- `rtk-rewrite.sh` - RTK token reduction for Bash output

### 4. Settings Configuration
- `settings.json` defines hooks and permissions
- Hooks are TypeScript (Bun-compatible)

### 5. Tools Work Cross-Platform
- Modern CLI tools: fd, rg, sd, bat, eza
- See `skills/CORE/TOOLS.md` for preference matrix

---

## Validation

Run tests:
```bash
cd $PAI_DIR && bun run test
```

Verify key symlinks:
```bash
for item in settings.json .env state RTK.md; do
  [ -L "$HOME/.claude/$item" ] && echo "$item: OK ($(readlink $HOME/.claude/$item))" || echo "$item: NOT LINKED"
done
```

> **Note:** In Qara's setup, `~/.claude/` IS the qara checkout's `.claude/` via the settings.json symlink. Hooks, skills, commands, and agents are referenced via `${PAI_DIR}` paths in settings.json, not individual symlinks.

---

## What's NOT Guaranteed

- MCP servers (user-configured)
- External API keys (user-provided)

---

**Maintained by:** Qara PAI System
