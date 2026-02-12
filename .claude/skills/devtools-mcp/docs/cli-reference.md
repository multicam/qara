# DevTools MCP CLI Reference

Global command-line interface for the DevTools MCP skill.

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

### Testing & Debugging

#### smoke [url]
Run smoke test (console, network, a11y checks).

```bash
# Auto-detect URL
devtools-mcp smoke

# Specify URL
devtools-mcp smoke --url http://localhost:8000

# Live site
devtools-mcp smoke --url https://example.com
```

Launches Claude with prompt:
```
run smoke test on {url}
```

#### visual [url]
Run visual test (multi-viewport screenshots).

```bash
# Auto-detect URL
devtools-mcp visual

# Specify URL
devtools-mcp visual --url http://localhost:8000
```

Launches Claude with prompt:
```
screenshot {url} at mobile, tablet, and desktop sizes
```

#### debug [url]
Debug console errors and network issues.

```bash
# Current page
devtools-mcp debug

# Specific URL
devtools-mcp debug --url http://localhost:8000/contact/
```

Launches Claude with prompt:
```
check console errors on {url}
```

#### perf [url]
Run performance trace and measure Core Web Vitals.

```bash
# Homepage
devtools-mcp perf

# Specific page
devtools-mcp perf --url http://localhost:8000/products/
```

Launches Claude with prompt:
```
measure Core Web Vitals for {url}
```

#### a11y [url]
Run accessibility audit.

```bash
# Homepage
devtools-mcp a11y

# Specific page
devtools-mcp a11y --url http://localhost:8000/about/
```

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

## Options

### --url <url>
Override auto-detected URL.

```bash
devtools-mcp smoke --url http://localhost:3000
devtools-mcp perf --url https://example.com
```

### --pages <pages>
Comma-separated list of page paths to test.

```bash
devtools-mcp smoke --pages /,/about/,/contact/
devtools-mcp debug --pages /checkout/,/cart/
```

### --no-server
Don't attempt to start dev server (for live URLs).

```bash
devtools-mcp smoke --url https://example.com --no-server
```

### --verbose
Show detailed output.

```bash
devtools-mcp verify --verbose
devtools-mcp detect --verbose
```

---

## Examples

### Local Development

```bash
# Quick setup check
devtools-mcp verify

# See what will be tested
devtools-mcp detect

# Run smoke test
devtools-mcp smoke

# Debug console errors
devtools-mcp debug
```

### Live Site Testing

```bash
# Test production
devtools-mcp smoke --url https://www.example.com

# Performance check
devtools-mcp perf --url https://www.example.com

# Accessibility audit
devtools-mcp a11y --url https://www.example.com
```

### Multi-Page Testing

```bash
# Test specific pages
devtools-mcp smoke --pages /,/about/,/contact/,/products/

# Debug multiple pages
devtools-mcp debug --pages /checkout/,/cart/,/account/
```

### Development Workflow

```bash
# 1. Start dev server
pnpm dev

# 2. Verify MCP ready
devtools-mcp verify

# 3. Quick smoke test
devtools-mcp smoke

# 4. Visual check
devtools-mcp visual

# 5. Interactive debugging if issues found
devtools-mcp interactive
```

### CI/CD Integration

```bash
# In GitHub Actions or GitLab CI
- name: Smoke Test
  run: |
    pnpm build
    pnpm serve &
    sleep 5
    devtools-mcp smoke --url http://localhost:8008

- name: Performance Check
  run: |
    devtools-mcp perf --url http://localhost:8008
```

---

## Configuration

### Auto-Detection

CLI uses the skill's auto-detection system:

1. Reads `package.json`
2. Detects framework
3. Parses dev script for port
4. Builds localhost URL

### CLAUDE.md Override

Add to project's `CLAUDE.md`:

```markdown
## DevTools MCP
url: http://localhost:8000
pages:
  - /
  - /about/
  - /contact/
```

CLI will respect these overrides.

---

## Troubleshooting

### Command not found

```bash
# Ensure ~/.local/bin is in PATH
echo $PATH | grep -q "$HOME/.local/bin" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### MCP not ready

```bash
# Run verification
devtools-mcp verify

# Check MCP connection
claude mcp list

# Restart Claude Desktop if needed
```

### Auto-detection fails

```bash
# Check package.json exists
ls -la package.json

# Use --url to override
devtools-mcp smoke --url http://localhost:8000
```

### Node.js errors

```bash
# Check Node version (requires 18+)
node --version

# Update if needed
```

---

## Related Documentation

- **Main README:** `${PAI_DIR}/skills/devtools-mcp/README.md`
- **Setup Guide:** `${PAI_DIR}/skills/devtools-mcp/docs/setup.md`
- **Tools Reference:** `${PAI_DIR}/skills/devtools-mcp/docs/tools-reference.md`
- **Examples:** `${PAI_DIR}/skills/devtools-mcp/docs/examples.md`
- **Troubleshooting:** `${PAI_DIR}/skills/devtools-mcp/docs/troubleshooting.md`

---

**Last updated:** February 12, 2026
**CLI Version:** 0.1.0
