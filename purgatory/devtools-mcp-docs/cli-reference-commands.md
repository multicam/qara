# DevTools MCP CLI Reference — Commands

Global command-line interface for the DevTools MCP skill. This file covers Installation, Usage, and all Commands.

For Options, Examples, Configuration, Troubleshooting, and Related Documentation see: `cli-reference-config.md`

## Installation

The CLI is automatically available after skill installation:

```bash
# Symlink created at
~/.local/bin/devtools-mcp -> ${PAI_DIR}/skills/devtools-mcp/bin/devtools-mcp

# Ensure ~/.local/bin is in PATH
export PATH="$HOME/.local/bin:$PATH"
```

## Usage

```bash
devtools-mcp <command> [options]
```

## Commands

### Setup & Verification

#### verify
Verify MCP setup is complete and ready.

```bash
devtools-mcp verify
```

**Output:**
```
✓ Verifying MCP setup...
✅ All checks passed - MCP is ready

## Checks
✅ config exists
✅ server configured
✅ binary installed
✅ browser available
✅ connection
```

#### detect
Auto-detect project configuration from package.json.

```bash
devtools-mcp detect
```

**Output:**
```json
{
  "framework": "gatsby",
  "port": 8000,
  "url": "http://localhost:8000",
  "detected": true
}
```

#### url [url]
Build target URL configuration.

```bash
# Auto-detect from project
devtools-mcp url

# Specify URL
devtools-mcp url --url https://example.com
```

**Output:**
```
URL: http://localhost:8000
Type: localhost
Source: auto-detect
Framework: gatsby
Port: 8000
Requires Server: Yes
```

#### browser
Detect available browsers on the system.

```bash
devtools-mcp browser
```

**Output:**
```
Found 2 browser(s):

1. Brave
   Path: /snap/bin/brave
   Version: Brave Browser 144.1.86.148

2. Chrome
   Path: /usr/bin/google-chrome
   Version: Google Chrome 145.0.7632.45
```

---

### Development Server

#### dev
Start or restart the dev server for the current project.

```bash
devtools-mcp dev
```

**Features:**
- Auto-detects framework and start command
- Checks if port is already in use
- Prompts to kill existing process if needed
- Starts server in background
- Waits for server to be ready (up to 60s)
- Logs output to `.dev-server.log`
- Saves PID to `.dev-server.pid`

**Output:**
```
ℹ Starting dev server...
ℹ Detected: gatsby on port 8000
ℹ Starting server with: gatsby develop -p 8000
✓ Dev server started (PID: 12345)
ℹ Logs: .dev-server.log
ℹ Waiting for server to be ready...
✓ Server is ready at http://localhost:8000
ℹ PID file: .dev-server.pid

To stop: kill $(cat .dev-server.pid)
To view logs: tail -f .dev-server.log
```

**If port is in use:**
```
⚠ Port 8000 is already in use
Kill existing process and restart? [y/N]
```

**To stop the server:**
```bash
# Using saved PID
kill $(cat .dev-server.pid)

# Or manually
lsof -ti :8000 | xargs kill -9
```

**To view logs:**
```bash
tail -f .dev-server.log
```

---

### Testing & Debugging

**Note:** All test commands auto-start the dev server if testing localhost and server is not running.

#### smoke
Run smoke test (console, network, a11y checks).

```bash
# Auto-detect URL and auto-start server if needed
devtools-mcp smoke

# Specify localhost URL (will start server if needed)
devtools-mcp smoke --url http://localhost:8000

# Live site (no server needed)
devtools-mcp smoke --url https://example.com
```

**Behavior:**
1. If no `--url` specified: auto-detects from package.json
2. If localhost URL: checks if server running, starts if needed
3. If live URL: skips server check, tests directly
4. Waits for server to be ready (up to 60s)
5. Then launches Claude with prompt

Launches Claude with prompt:
```
run smoke test on {url}
```

#### visual
Run visual test (multi-viewport screenshots).

```bash
# Auto-detect URL and auto-start server
devtools-mcp visual

# Specify URL
devtools-mcp visual --url http://localhost:8000
```

Auto-starts dev server if needed (same as `smoke`).

Launches Claude with prompt:
```
screenshot {url} at mobile, tablet, and desktop sizes
```

#### debug
Debug console errors and network issues.

```bash
# Auto-detect URL and auto-start server
devtools-mcp debug

# Specific URL
devtools-mcp debug --url http://localhost:8000/contact/
```

Auto-starts dev server if needed (same as `smoke`).

Launches Claude with prompt:
```
check console errors on {url}
```

#### perf
Run performance trace and measure Core Web Vitals.

```bash
# Auto-detect URL and auto-start server
devtools-mcp perf

# Specific page
devtools-mcp perf --url http://localhost:8000/products/
```

Auto-starts dev server if needed (same as `smoke`).

Launches Claude with prompt:
```
measure Core Web Vitals for {url}
```

#### a11y
Run accessibility audit.

```bash
# Auto-detect URL and auto-start server
devtools-mcp a11y

# Specific page
devtools-mcp a11y --url http://localhost:8000/about/
```

Auto-starts dev server if needed (same as `smoke`).

Launches Claude with prompt:
```
check accessibility on {url}
```

---

### Interactive Mode

#### interactive
Launch Claude CLI with MCP integration active.

```bash
devtools-mcp interactive
```

**Features:**
- Shows detected project config
- Verifies MCP is ready
- Launches Claude with full MCP tool access
- Natural language interface to all DevTools MCP tools

**Example session:**
```bash
$ devtools-mcp interactive

ℹ Launching Claude in interactive mode...
ℹ MCP DevTools integration active

ℹ Detected project config:
{
  "framework": "gatsby",
  "port": 8000,
  "url": "http://localhost:8000"
}

ℹ Starting Claude CLI...

Claude: How can I help you?

You: Navigate to homepage and check console

Claude: [Navigates and checks console]
Found 0 errors. Console is clean.

You: exit
```

---

### Help & Information

#### help
Show help message.

```bash
devtools-mcp help
devtools-mcp --help
devtools-mcp -h
```

#### version
Show version and environment info.

```bash
devtools-mcp version
devtools-mcp --version
devtools-mcp -v
```

**Output:**
```
DevTools MCP CLI v0.1.0
Skill location: /home/user/.claude/skills/devtools-mcp
Node version: v24.11.0
```

---

**Continued in:** `cli-reference-config.md` (Options, Examples, Configuration, Troubleshooting, Related Documentation)

**Last updated:** February 12, 2026
**CLI Version:** 0.1.0
