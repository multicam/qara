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

Global skill that provides Chrome DevTools MCP integration for any project.

## What It Does

- **Browser automation** via Chrome DevTools Protocol (MCP server)
- **Auto-detects** dev server config from package.json (Gatsby, Next.js, Vite, etc.)
- **Tests live URLs** - staging, production, any website
- **Interactive debugging** - natural language commands to Claude
- **26+ MCP tools** - navigation, screenshots, console, network, performance, a11y

## Natural Language Triggers

Use any of these phrases to invoke the skill:

| Trigger | Example |
|---------|---------|
| `/devtools` | Direct skill invocation |
| `/web-test` | Test website |
| `/mcp` | MCP integration |
| "test this site" | `claude "test this site"` |
| "debug the page" | `claude "debug the page at /contact/"` |
| "check console errors" | `claude "check console errors"` |
| "screenshot at mobile size" | `claude "screenshot at mobile size"` |
| "run smoke test" | `claude "run smoke test on http://localhost:8000"` |
| "debug this component" | React: identify component via react-grab |
| "which component renders this" | React: get component name + file:line |

## Requirements

1. **Chrome DevTools MCP server** - `npm install -g chrome-devtools-mcp`
2. **Browser** - Brave, Chrome, or Chromium installed
3. **Claude CLI** - Claude Desktop with MCP configured
4. **MCP config** - `~/.config/claude-desktop/claude_desktop_config.json`

See `docs/setup.md` for installation instructions.

## Configuration Layers

The skill detects target URLs in priority order:

1. **Runtime argument** (highest priority)
   ```bash
   claude "test https://example.com"
   ```

2. **CLAUDE.md override**
   ```markdown
   ## DevTools MCP
   url: http://localhost:8000
   pages: [/, /about/, /contact/]
   ```

3. **Auto-detect** from package.json
   - Detects framework (Gatsby, Next.js, Vite, etc.)
   - Parses dev script for port
   - Builds localhost URL

4. **Framework defaults** (fallback)
   - Gatsby: 8000
   - Next.js: 3000
   - Vite: 5173

## Workflows

| Workflow | Description |
|----------|-------------|
| `smoke-test.md` | Quick health check (console, network, a11y) |
| `visual-test.md` | Multi-viewport screenshots, dark mode |
| `debug-console.md` | Debug console errors, network issues |
| `component-debug.md` | React component debug via react-grab (--grab) |
| `interactive.md` | Launch Claude with MCP for exploration |
| `performance.md` | Performance traces, Core Web Vitals |
| `accessibility.md` | A11y tree audit, keyboard navigation |

## Quick Start

```bash
# Test local dev server (auto-detected)
cd /path/to/project
claude "run smoke test"

# Test live URL
claude "test https://staging.example.com"

# Start with react-grab (React projects)
devtools-mcp start --grab

# Restart with react-grab addon
devtools-mcp restart grab

# Debug with component context
devtools-mcp debug --grab

# Interactive debugging
claude "/devtools interactive"

# Screenshot at mobile size
claude "screenshot homepage at 375px width"

# Check console errors
claude "check console errors on /contact/"
```

## MCP Tools Available

**Input Automation (8 tools)**
- click, dblClick, fill, fill_form, drag, hover, press_key, upload_file

**Navigation (6 tools)**
- navigate_page, new_page, select_page, list_pages, close_page, wait_for

**Emulation (2 tools)**
- emulate, resize_page

**Performance (3 tools)**
- performance_start_trace, performance_stop_trace, performance_analyze_insight

**Network (2 tools)**
- list_network_requests, get_network_request

**Debugging (5 tools)**
- list_console_messages, get_console_message, take_snapshot, take_screenshot, evaluate_script

**react-grab (React projects only, requires --grab)**
- get_element_context - Select DOM element, get React component name + file:line

See `docs/tools-reference.md` for complete documentation.

## Complementary to Playwright

This skill **complements** (does not replace) Playwright:

- **DevTools MCP**: Interactive debugging, ad-hoc testing, natural language
- **Playwright**: Automated test suites, CI/CD, axe-core/Lighthouse integration

Both can coexist in the same project for different workflows.

## Library Functions

Core functionality in `lib/`:

- `auto-detect.mjs` - Framework detection, package.json parsing
- `react-grab-detect.mjs` - React project + react-grab setup detection
- `mcp-verify.mjs` - MCP connection verification
- `url-builder.mjs` - Target URL construction
- `server-lifecycle.mjs` - Dev server management
- `prompt-builder.mjs` - Prompt template system
- `result-parser.mjs` - JSON extraction from output
- `browser-detect.mjs` - Cross-platform browser paths
- `grab-inspect.mjs` - React component inspection via CDP (see below)

## grab-inspect: React Component Inspector

Query react-grab state directly from Claude via Chrome DevTools Protocol.
Zero dependencies — uses native `WebSocket` and `fetch` (Node 22+).

### Requirements

- Chrome/Brave running with `--remote-debugging-port=9222`
- react-grab loaded in the page (`window.__REACT_GRAB__`)

### Exported Functions

| Function | Description |
|----------|-------------|
| `inspect(port?)` | Query current selection: filePath, component stack, element tag/text, scalar props |
| `activate(port?)` | Turn on the react-grab overlay programmatically |
| `hardRefresh(port?)` | Cache-busting page reload (`location.reload(true)`) |
| `evaluate(expr, port?)` | Run arbitrary JS in the browser context |
| `getPageWs(port?, host?)` | Find the WebSocket debugger URL for the app tab |
| `cdpEval(wsUrl, expr)` | Low-level CDP `Runtime.evaluate` over WebSocket |

All functions default to port `9222` and match tabs containing `localhost`.

### CLI Usage

```bash
node lib/grab-inspect.mjs                  # one-shot query
node lib/grab-inspect.mjs --activate       # activate react-grab first
node lib/grab-inspect.mjs --port 9223      # custom CDP port
```

### Programmatic Usage (from skill workflows)

```javascript
import { inspect, activate, hardRefresh } from './lib/grab-inspect.mjs'

// Activate overlay, then read what the user selected
await activate()
const state = await inspect()
// → { active: true, filePath: "src/components/Foo.js:42", components: ["Foo", "Bar"], element: { tag: "DIV", text: "..." }, props: { id: "main" } }

// Hard refresh after code changes
await hardRefresh()
```

### Workflow: Point-and-Inspect

1. User hovers over a component in the browser (react-grab overlay active)
2. User tells Claude "grab" or "which component is this?"
3. Claude calls `inspect()` to get filePath, component stack, and props
4. Claude reads the source file and has full context for edits

## Example: tgds-website Integration

The skill was extracted from tgds-website's mature MCP integration (v1.1, Feb 2026).

**tgds-website can:**
- Use `tgds-test.sh` wrapper for TGDS-specific tests
- Import skill libraries for core functions
- Use skill workflows for generic tests
- Keep TGDS-specific test targets and live-testing framework

**Other projects can:**
- Use skill directly without setup
- Override auto-detection in CLAUDE.md
- Test live URLs without dev server
- Launch interactive MCP sessions

## Documentation

- `docs/setup.md` - Installation and configuration
- `docs/tools-reference.md` - All 26 MCP tools
- `docs/examples.md` - Usage examples
- `docs/troubleshooting.md` - Common issues

## Future Enhancements (Out of Scope)

- Full test runner orchestration
- CI/CD integration patterns
- Screenshot diffing
- Multi-browser support (Firefox, Safari)
- Performance budgeting system
- Visual regression testing

---

**Status:** Implementation in progress (Priority 1: Foundation)
**Version:** 0.2.0
**Last updated:** February 13, 2026
