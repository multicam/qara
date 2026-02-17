# DevTools MCP Skill

Global skill that provides Chrome DevTools MCP integration for browser automation, testing, and debugging across any project.

## What It Does

- **Browser automation** via Chrome DevTools Protocol (MCP server)
- **Auto-detects** dev server config (Gatsby, Next.js, Vite, CRA, etc.)
- **Tests live URLs** - staging, production, any website
- **Interactive debugging** - natural language commands to Claude
- **26+ MCP tools** - navigation, screenshots, console, network, performance, a11y

## Global CLI

The skill includes a global CLI for quick access from anywhere:

```bash
devtools-mcp <command>
```

**Available commands:**
- `verify` - Check MCP setup
- `detect` - Auto-detect project config
- `smoke` - Run smoke test
- `visual` - Multi-viewport screenshots
- `debug` - Debug console errors
- `perf` - Performance trace
- `a11y` - Accessibility audit
- `live` - Test live staging/production URL
- `interactive` - Launch Claude with MCP

**Documentation:** See `docs/cli-reference.md` for complete CLI reference.

## Quick Start

### 1. Install Requirements

```bash
# Install Chrome DevTools MCP server
bun install -g chrome-devtools-mcp

# Install browser (if not already installed)
# Linux
sudo snap install brave

# macOS
brew install --cask brave-browser

# Windows
# Download from https://brave.com
```

### 2. Configure MCP

Create MCP config:
```bash
mkdir -p ~/.config/claude-desktop
cp ${PAI_DIR}/skills/devtools-mcp/templates/mcp-config.json \
   ~/.config/claude-desktop/claude_desktop_config.json
```

**Important:** Edit the config and update `--executablePath` for your browser location.

### 3. Verify Setup

```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
```

Should show: `✅ All checks passed - MCP is ready`

### 4. Use the Skill

```bash
# Test local dev server (auto-detected)
cd /path/to/project
claude "run smoke test"

# Test live URL
claude "test https://example.com"

# Interactive debugging
claude "/devtools interactive"

# Screenshot at mobile size
claude "screenshot homepage at 375px width"
```

## Supported Frameworks

Auto-detection works with:
- **Gatsby** (port 8000)
- **Next.js** (port 3000)
- **Vite** (port 5173)
- **Create React App** (port 3000)
- **Nuxt** (port 3000)
- **Astro** (port 4321)
- **Remix** (port 3000)
- **SvelteKit** (port 5173)

## Workflows

| Workflow | Description | Use Case |
|----------|-------------|----------|
| `smoke-test` | Quick health check | Console, network, a11y validation |
| `visual-test` | Multi-viewport screenshots | Responsive design, dark mode |
| `debug-console` | Debug errors | Console errors, network failures |
| `component-debug` | React component debug | Identify components via react-grab |
| `interactive` | Launch Claude with MCP | Exploratory testing, debugging |
| `performance` | Performance traces | Core Web Vitals, load time |
| `accessibility` | A11y tree audit | WCAG compliance, keyboard nav |
| `live-test` | Live site audit | Staging/production testing |

## Natural Language Triggers

Use any of these phrases:
- `/devtools` - Direct invocation
- "test this site"
- "debug the page"
- "check console errors"
- "screenshot at mobile size"
- "run smoke test"

## Configuration

### Auto-Detection (Default)

Skill reads `package.json` and detects:
- Framework (Gatsby, Next, Vite, etc.)
- Dev server port
- Start command

### CLAUDE.md Override

Add to project's `CLAUDE.md`:
```markdown
## DevTools MCP
url: http://localhost:8000
pages:
  - /
  - /about/
  - /contact/
selectors:
  main: main[role="main"]
  nav: header nav
thresholds:
  console_errors: 0
  network_failures: 0
```

### Runtime Arguments

```bash
claude "test https://staging.example.com"
```

Priority: **Runtime > CLAUDE.md > Auto-detect > Defaults**

## Examples

### Test Local Development

```bash
cd /path/to/project
pnpm dev  # Start dev server

# In another terminal
claude "run smoke test"
```

### Test Live Staging / Production

```bash
# Full audit of a staging URL
devtools-mcp live --url https://staging.example.com

# Test specific pages on production
devtools-mcp live --url https://www.example.com --pages /,/about,/pricing

# Quick smoke test only
devtools-mcp smoke --url https://www.example.com --no-server
```

### Debug Console Errors

```bash
claude "check console errors on /contact/"
```

### Multi-Viewport Screenshots

```bash
claude "screenshot homepage at mobile, tablet, and desktop sizes"
```

### Interactive Testing

```bash
claude "/devtools interactive"

# Then in Claude:
> Navigate to /contact/ and test the form
> Check console for errors
> Take screenshots at different viewports
```

## MCP Tools Available

**26+ tools organized by category:**

- **Input Automation** (8): click, dblClick, fill, fill_form, press_key, hover, drag, upload_file
- **Navigation** (6): navigate_page, new_page, select_page, list_pages, close_page, wait_for
- **Emulation** (2): emulate, resize_page
- **Performance** (3): performance_start_trace, performance_stop_trace, performance_analyze_insight
- **Network** (2): list_network_requests, get_network_request
- **Debugging** (5): list_console_messages, get_console_message, take_snapshot, take_screenshot, evaluate_script

See `docs/tools-reference.md` for complete documentation.

## Complementary to Playwright

This skill **complements** (does not replace) Playwright:

| Tool | Purpose |
|------|---------|
| **DevTools MCP** | Interactive debugging, ad-hoc testing, natural language |
| **Playwright** | Automated test suites, CI/CD, axe-core/Lighthouse integration |

Both can coexist in the same project.

## Documentation

- `docs/setup.md` - Installation and configuration
- `docs/tools-reference.md` - All 26 MCP tools
- `docs/examples.md` - Usage examples
- `docs/troubleshooting.md` - Common issues

## Library Functions

Core functionality in `lib/`:

- `auto-detect.mjs` - Framework detection, package.json parsing
- `mcp-verify.mjs` - MCP connection verification
- `url-builder.mjs` - Target URL construction
- `server-lifecycle.mjs` - Dev server management
- `prompt-builder.mjs` - Prompt template system
- `result-parser.mjs` - JSON extraction from output
- `browser-detect.mjs` - Cross-platform browser paths
- `react-grab-detect.mjs` - React project + react-grab setup detection
- `grab-inspect.mjs` - React component inspection via CDP

## Extracted from tgds-website

This skill was extracted from tgds-website's mature MCP integration (v1.1, Feb 2026).

**Portable Core:** MCP integration, auto-detection, workflows

**Project-Specific (kept in tgds-website):**
- Full live-testing framework
- TGDS test targets (course pages, enrolment flows)
- Custom test runner orchestration

## Platform Support

- **Linux** ✅ Tested on Ubuntu with Snap/apt browsers
- **macOS** ✅ Should work (browser paths included)
- **Windows** ⚠️ Untested (browser paths included)

## Troubleshooting

### MCP not connected

```bash
# Verify config
cat ~/.config/claude-desktop/claude_desktop_config.json

# Restart Claude Desktop
# (macOS/Windows: Quit and reopen app)
# (Linux: killall claude-desktop && claude-desktop)

# Check connection
claude mcp list
```

### Browser not found

```bash
# Detect available browsers
node ${PAI_DIR}/skills/devtools-mcp/lib/browser-detect.mjs all

# Update MCP config with correct path
```

### Port conflict

```bash
# Check what's using port
lsof -i :8000

# Kill process
kill -9 <PID>

# Or change port in package.json
```

See `docs/troubleshooting.md` for complete guide.

## Contributing

This skill is part of Qara (Personal AI Infrastructure).

**Feedback/Issues:** Report to JM directly.

## Version

- **Version:** 0.3.0
- **Status:** Active
- **Last updated:** February 16, 2026

## License

Private - Part of Qara (JM's Personal AI Infrastructure)
