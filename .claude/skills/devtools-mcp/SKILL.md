---
name: devtools-mcp
context: devtools
model: sonnet
description: |
  Chrome DevTools MCP integration for browser automation, testing, and debugging.
  Supports localhost dev servers (auto-detected) and live URLs (staging, production).
  Natural language interface to 26+ DevTools MCP tools via Claude CLI.
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

See `docs/tools-reference.md` for complete documentation.

## Complementary to Playwright

This skill **complements** (does not replace) Playwright:

- **DevTools MCP**: Interactive debugging, ad-hoc testing, natural language
- **Playwright**: Automated test suites, CI/CD, axe-core/Lighthouse integration

Both can coexist in the same project for different workflows.

## Library Functions

Core functionality in `lib/`:

- `auto-detect.mjs` - Framework detection, package.json parsing
- `mcp-verify.mjs` - MCP connection verification
- `url-builder.mjs` - Target URL construction
- `server-lifecycle.mjs` - Dev server management
- `prompt-builder.mjs` - Prompt template system
- `result-parser.mjs` - JSON extraction from output
- `browser-detect.mjs` - Cross-platform browser paths

## Example: tgds-website Integration

The skill was extracted from tgds-website's mature MCP integration (v1.1, Feb 2026).

**tgds-website can:**
- Keep custom `claude-mcp.sh` orchestrator
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
**Version:** 0.1.0
**Last updated:** February 12, 2026
