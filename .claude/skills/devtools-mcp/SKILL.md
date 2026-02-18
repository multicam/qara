---
name: devtools-mcp
context: fork
model: sonnet
description: |
  Chrome DevTools MCP integration for browser automation, testing, and debugging.
  Supports localhost dev servers (auto-detected) and live URLs (staging, production).
  Natural language interface to 26+ DevTools MCP tools via Claude CLI.
  Optional react-grab MCP for React component identification (--grab flag).
---

# DevTools MCP Skill

Browser automation, testing, and debugging via Chrome DevTools Protocol MCP server.

## Workflow Routing

| Intent | Workflow | Triggers |
|--------|----------|----------|
| Quick health check | `READ: workflows/smoke-test.md` | "smoke test", "check console errors" |
| Multi-viewport screenshots | `READ: workflows/visual-test.md` | "screenshot", "visual test" |
| Console/network debug | `READ: workflows/debug-console.md` | "debug the page", "network issues" |
| React component debug | `READ: workflows/component-debug.md` | "debug this component", "which component" (requires --grab) |
| Interactive session | `READ: workflows/interactive.md` | "interactive", "/devtools interactive" |
| Performance traces | `READ: workflows/performance.md` | "performance", "Core Web Vitals" |
| Accessibility audit | `READ: workflows/accessibility.md` | "a11y", "accessibility audit" |
| Live URL testing | `READ: workflows/live-test.md` | "test staging", "test production", "audit this website" |

## URL Detection (priority order)

1. Runtime argument (e.g. `claude "test https://example.com"`)
2. CLAUDE.md `## DevTools MCP` section (url, pages, selectors, thresholds)
3. Auto-detect from package.json (framework + port)
4. Framework defaults (Gatsby:8000, Next:3000, Vite:5173)

## Requirements

- `chrome-devtools-mcp` installed globally
- Brave, Chrome, or Chromium browser
- MCP config at `~/.config/claude-desktop/claude_desktop_config.json`

## Reference (load when needed)

| Topic | File |
|-------|------|
| All 26 MCP tools | `READ: docs/tools-reference.md` |
| Setup & installation | `READ: docs/setup.md` |
| Usage examples | `READ: docs/examples.md` |
| CLI commands | `READ: docs/cli-reference.md` |
| Troubleshooting | `READ: docs/troubleshooting.md` |
| grab-inspect API | `READ: lib/grab-inspect.mjs` (header comments) |
