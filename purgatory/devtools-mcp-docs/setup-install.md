# DevTools MCP Setup Guide — Installation

Complete installation guide for Chrome DevTools MCP integration. This file covers Prerequisites and Installation Steps 1–7 through Verification with Claude CLI.

For Configuration Options, Project Configuration, Troubleshooting, Platform Notes, and Next Steps see: `setup-config.md`

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

---

**Continued in:** `setup-config.md` (Configuration Options, Project Configuration, Troubleshooting, Platform-Specific Notes, Next Steps)

**Last updated:** February 12, 2026
