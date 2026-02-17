# DevTools MCP Setup Guide

Complete installation and configuration guide for Chrome DevTools MCP integration.

## Prerequisites

- **Node.js** 18+ (for chrome-devtools-mcp)
- **Claude Desktop** with Claude CLI access
- **Browser** - Brave, Chrome, or Chromium
- **Operating System** - Linux, macOS, or Windows

## Installation Steps

### 1. Install Chrome DevTools MCP Server

```bash
bun install -g chrome-devtools-mcp
```

Verify installation:
```bash
which chrome-devtools-mcp
# Should output: /path/to/chrome-devtools-mcp
```

### 2. Install Browser

#### Linux (Ubuntu/Debian)

**Brave (Recommended):**
```bash
sudo snap install brave
```

**Chrome:**
```bash
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install google-chrome-stable
```

**Chromium:**
```bash
sudo apt install chromium-browser
```

#### macOS

**Brave:**
```bash
brew install --cask brave-browser
```

**Chrome:**
```bash
brew install --cask google-chrome
```

#### Windows

Download and install from:
- **Brave:** https://brave.com/download/
- **Chrome:** https://www.google.com/chrome/

### 3. Configure MCP Server

Create config directory:
```bash
mkdir -p ~/.config/claude-desktop
```

Copy template config:
```bash
cp ${PAI_DIR}/skills/devtools-mcp/templates/mcp-config.json \
   ~/.config/claude-desktop/claude_desktop_config.json
```

### 4. Update Browser Path

Edit the config file:
```bash
# Linux/macOS
nano ~/.config/claude-desktop/claude_desktop_config.json

# Windows
notepad %USERPROFILE%\.config\claude-desktop\claude_desktop_config.json
```

Find the `--executablePath` argument and update it:

#### Linux Examples

**Brave (Snap):**
```json
"--executablePath", "/snap/bin/brave"
```

**Chrome:**
```json
"--executablePath", "/usr/bin/google-chrome"
```

**Chromium:**
```json
"--executablePath", "/usr/bin/chromium-browser"
```

#### macOS Examples

**Brave:**
```json
"--executablePath", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
```

**Chrome:**
```json
"--executablePath", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

#### Windows Examples

**Brave:**
```json
"--executablePath", "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
```

**Chrome:**
```json
"--executablePath", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

### 5. Detect Browser Path (Helper)

Use the browser detector to find your browser:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/browser-detect.mjs
```

Output shows:
```
✅ Browser Detected

Name: Brave
Path: /snap/bin/brave
Version: Brave/1.62.165
Platform: linux
```

To see all available browsers:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/browser-detect.mjs all
```

### 6. Restart Claude Desktop

After updating the config:

**Linux:**
```bash
killall claude-desktop
claude-desktop &
```

**macOS:**
```bash
# Quit from menu bar, then reopen
open -a "Claude"
```

**Windows:**
```
# Right-click system tray icon → Quit
# Then reopen Claude from Start menu
```

### 7. Verify Setup

Run verification:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
```

Expected output:
```
# MCP Setup Verification

✅ All checks passed - MCP is ready

## Checks

✅ config exists
   → /home/user/.config/claude-desktop/claude_desktop_config.json
✅ server configured
   → Server: brave-devtools
✅ binary installed
   → /usr/local/bin/chrome-devtools-mcp
✅ browser available
   → /snap/bin/brave
   → Browser: Brave
✅ connection
```

If all checks pass, you're ready to use the skill!

## Verification with Claude CLI

Test MCP connection:
```bash
claude mcp list
```

Should show:
```
brave-devtools          Connected
```

## Configuration Options

### Complete MCP Config

```json
{
  "mcpServers": {
    "brave-devtools": {
      "command": "chrome-devtools-mcp",
      "args": [
        "--executablePath", "/snap/bin/brave",
        "--isolated",
        "--viewport", "1920x1080",
        "--acceptInsecureCerts",
        "--no-usage-statistics",
        "--logFile", "/tmp/chrome-devtools-mcp.log",
        "--channel", "stable"
      ],
      "env": {
        "DEBUG": "",
        "CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS": "1"
      }
    }
  }
}
```

### Configuration Options Explained

| Option | Description | Default |
|--------|-------------|---------|
| `--executablePath` | Path to browser binary | Auto-detect |
| `--isolated` | Use clean browser profile | false |
| `--viewport` | Default viewport size | 1280x720 |
| `--acceptInsecureCerts` | Allow self-signed certs | false |
| `--no-usage-statistics` | Disable telemetry | false |
| `--logFile` | Log file path | None |
| `--channel` | Browser channel | stable |

### Multiple Browser Configs

You can configure multiple browsers:

```json
{
  "mcpServers": {
    "brave-devtools": {
      "command": "chrome-devtools-mcp",
      "args": ["--executablePath", "/snap/bin/brave"]
    },
    "chrome-devtools": {
      "command": "chrome-devtools-mcp",
      "args": ["--executablePath", "/usr/bin/google-chrome"]
    }
  }
}
```

Then select which to use in your workflow.

## Project Configuration

### Auto-Detection (Default)

No configuration needed - skill reads `package.json`:
```json
{
  "scripts": {
    "dev": "gatsby develop -p 8000"
  }
}
```

Auto-detects:
- Framework: Gatsby
- Port: 8000
- URL: http://localhost:8000

### CLAUDE.md Override

Add to project's `CLAUDE.md`:
```markdown
## DevTools MCP
url: http://localhost:3000
pages:
  - /
  - /about/
  - /contact/
  - /blog/
selectors:
  main: main[role="main"]
  nav: header nav
  footer: footer
thresholds:
  console_errors: 0
  console_warnings: 5
  network_failures: 0
  lighthouse_score: 90
viewports:
  - name: mobile
    width: 375
    height: 812
  - name: tablet
    width: 768
    height: 1024
  - name: desktop
    width: 1920
    height: 1080
```

## Troubleshooting Setup

### Config file not found

**Error:**
```
❌ config exists
   Error: Config file not found
```

**Fix:**
```bash
mkdir -p ~/.config/claude-desktop
cp ${PAI_DIR}/skills/devtools-mcp/templates/mcp-config.json \
   ~/.config/claude-desktop/claude_desktop_config.json
```

### Binary not installed

**Error:**
```
❌ binary installed
   Error: chrome-devtools-mcp binary not found
```

**Fix:**
```bash
bun install -g chrome-devtools-mcp
```

### Browser not found

**Error:**
```
❌ browser available
   Error: No browser found
```

**Fix:**
Install a supported browser:
```bash
# Linux
sudo snap install brave

# macOS
brew install --cask brave-browser
```

Then update config with correct path.

### Connection failed

**Error:**
```
❌ connection
   Error: DevTools MCP server not connected
```

**Fix:**
1. Restart Claude Desktop
2. Wait 10 seconds
3. Check again: `claude mcp list`

If still failing:
```bash
# Check logs
tail -f /tmp/chrome-devtools-mcp.log

# Try launching manually
chrome-devtools-mcp --executablePath /snap/bin/brave
```

### Permission denied

**Error:**
```
Error: EACCES: permission denied
```

**Fix:**
```bash
# Check browser is executable
ls -la /snap/bin/brave

# If not, make it executable
chmod +x /snap/bin/brave
```

## Platform-Specific Notes

### Linux

- **Snap preferred** for Brave (automatic updates)
- **Permissions** - Snap apps may need permission for home directory
- **Wayland** - Use `--ozone-platform=wayland` if on Wayland

### macOS

- **Security** - First launch will ask for permissions
- **App path** - Must include full path to binary in app bundle
- **Rosetta** - Intel apps work on Apple Silicon via Rosetta

### Windows

- **Backslashes** - Use `\\` in JSON paths
- **Environment variables** - Can use `%LOCALAPPDATA%`
- **Spaces** - No need to escape spaces in JSON strings

## Next Steps

After setup is complete:

1. **Verify setup:**
   ```bash
   node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
   ```

2. **Test auto-detection:**
   ```bash
   cd /path/to/project
   node ${PAI_DIR}/skills/devtools-mcp/lib/auto-detect.mjs
   ```

3. **Run first test:**
   ```bash
   claude "run smoke test"
   ```

4. **Read workflows:**
   - `workflows/smoke-test.md`
   - `workflows/interactive.md`
   - `workflows/visual-test.md`

## Getting Help

**Verification failed?** See `troubleshooting.md`

**Need examples?** See `examples.md`

**Tool reference?** See `tools-reference.md`

---

**Last updated:** February 12, 2026
