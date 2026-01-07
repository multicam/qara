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
- `capture-all-events.ts` - Logs all events to JSONL
- `stop-hook.ts` - Extracts completion status

### 4. Settings Configuration
- `settings.json` defines hooks and permissions
- Hooks are TypeScript (Bun-compatible)

### 5. Tools Work Cross-Platform
- Modern CLI tools: fd, rg, sd, bat, eza
- See `skills/CORE/TOOLS.md` for preference matrix

---

## Self-Test

Run health check:
```bash
bun .claude/hooks/self-test.ts
```

Expected: All tests pass (warnings for optional features are OK).

---

## What's NOT Guaranteed

- Voice server (optional)
- MCP servers (user-configured)
- External API keys (user-provided)

---

**Maintained by:** Qara PAI System
