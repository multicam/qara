# DevTools MCP Troubleshooting Guide

Common issues and solutions for the DevTools MCP skill.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Connection Issues](#connection-issues)
- [Browser Issues](#browser-issues)
- [Server Issues](#server-issues)
- [Performance Issues](#performance-issues)
- [Tool-Specific Issues](#tool-specific-issues)
- [Platform-Specific Issues](#platform-specific-issues)

---

## Setup Issues

### Config File Not Found

**Error:**
```
❌ config exists
   Error: Config file not found: ~/.config/claude-desktop/claude_desktop_config.json
```

**Solution:**
```bash
mkdir -p ~/.config/claude-desktop
cp ${PAI_DIR}/skills/devtools-mcp/templates/mcp-config.json \
   ~/.config/claude-desktop/claude_desktop_config.json

# Edit config to set browser path
nano ~/.config/claude-desktop/claude_desktop_config.json
```

### Binary Not Installed

**Error:**
```
❌ binary installed
   Error: chrome-devtools-mcp binary not found in PATH
```

**Solution:**
```bash
# Install globally
npm install -g chrome-devtools-mcp

# Verify installation
which chrome-devtools-mcp
```

**If still not found:**
```bash
# Check npm global path
npm config get prefix

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(npm config get prefix)/bin"
```

### Invalid JSON in Config

**Error:**
```
❌ server configured
   Error: Failed to read config: Unexpected token
```

**Solution:**
```bash
# Validate JSON
cat ~/.config/claude-desktop/claude_desktop_config.json | jq .

# If error, fix JSON syntax:
# - Check for missing commas
# - Check for trailing commas (not allowed)
# - Check for unescaped quotes
# - Check bracket/brace matching
```

---

## Connection Issues

### MCP Not Connected

**Error:**
```
❌ connection
   Error: DevTools MCP server not connected
```

**Solutions:**

1. **Restart Claude Desktop**
   ```bash
   # Linux
   killall claude-desktop && claude-desktop &

   # macOS - Quit from menu bar, then reopen

   # Windows - Right-click tray icon → Quit, then reopen
   ```

2. **Check MCP status**
   ```bash
   claude mcp list
   ```

   Should show:
   ```
   brave-devtools          Connected
   ```

3. **Check logs**
   ```bash
   # If log file configured
   tail -f /tmp/chrome-devtools-mcp.log
   ```

4. **Verify config**
   ```bash
   cat ~/.config/claude-desktop/claude_desktop_config.json | jq .mcpServers
   ```

### Connection Timeout

**Error:**
```
Error: MCP connection timeout
```

**Solutions:**

1. **Increase timeout** (in MCP config)
   ```json
   {
     "mcpServers": {
       "brave-devtools": {
         "args": ["--timeout", "30000"]
       }
     }
   }
   ```

2. **Check browser is accessible**
   ```bash
   /snap/bin/brave --version
   ```

3. **Disable firewall temporarily**
   ```bash
   sudo ufw disable
   # Test, then re-enable
   sudo ufw enable
   ```

### Multiple MCP Instances

**Error:**
```
Error: Port already in use
```

**Solution:**
```bash
# Find and kill existing processes
ps aux | grep chrome-devtools-mcp
kill -9 <PID>

# Or kill all
pkill -f chrome-devtools-mcp

# Restart Claude Desktop
```

---

## Browser Issues

### Browser Not Found

**Error:**
```
❌ browser available
   Error: No browser found (Brave, Chrome, or Chromium)
```

**Solutions:**

1. **Detect installed browsers**
   ```bash
   node ${PAI_DIR}/skills/devtools-mcp/lib/browser-detect.mjs all
   ```

2. **Install browser**
   ```bash
   # Linux - Brave
   sudo snap install brave

   # Linux - Chrome
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
   sudo apt update
   sudo apt install google-chrome-stable

   # macOS - Brave
   brew install --cask brave-browser

   # macOS - Chrome
   brew install --cask google-chrome
   ```

3. **Update config with correct path**
   ```json
   {
     "mcpServers": {
       "brave-devtools": {
         "args": [
           "--executablePath", "/snap/bin/brave"
         ]
       }
     }
   }
   ```

### Browser Launch Failed

**Error:**
```
Error: Failed to launch browser
```

**Solutions:**

1. **Check permissions**
   ```bash
   ls -la /snap/bin/brave
   chmod +x /snap/bin/brave  # If needed
   ```

2. **Try launching manually**
   ```bash
   /snap/bin/brave --version
   ```

3. **Check for crashed browser**
   ```bash
   # Remove lock files
   rm -rf ~/.config/BraveSoftware/Brave-Browser/SingletonLock
   ```

4. **Disable sandbox** (last resort, security risk)
   ```json
   {
     "args": ["--no-sandbox"]
   }
   ```

### Browser Crashes

**Error:**
```
Error: Browser process crashed
```

**Solutions:**

1. **Check available memory**
   ```bash
   free -h
   ```

2. **Disable GPU acceleration**
   ```json
   {
     "args": ["--disable-gpu"]
   }
   ```

3. **Reduce viewport size**
   ```json
   {
     "args": ["--viewport", "1280x720"]
   }
   ```

4. **Check system logs**
   ```bash
   journalctl -xe | grep brave
   ```

---

## Server Issues

### Dev Server Not Running

**Error:**
```
Error: Navigation failed: net::ERR_CONNECTION_REFUSED
```

**Solutions:**

1. **Check if server is running**
   ```bash
   curl http://localhost:8000
   ```

2. **Start dev server**
   ```bash
   pnpm dev
   ```

3. **Check port is correct**
   ```bash
   # List what's using port
   lsof -i :8000

   # Check package.json
   cat package.json | grep '"dev"'
   ```

### Port Conflict

**Error:**
```
Error: Port 8000 is already in use
```

**Solutions:**

1. **Kill process using port**
   ```bash
   lsof -ti :8000 | xargs kill -9
   ```

2. **Use different port**
   ```bash
   # In package.json
   "dev": "gatsby develop -p 8001"
   ```

3. **Update CLAUDE.md**
   ```markdown
   ## DevTools MCP
   url: http://localhost:8001
   ```

### Server Timeout

**Error:**
```
Error: Server health check timeout
```

**Solutions:**

1. **Increase timeout**
   ```bash
   # In server-lifecycle.mjs usage
   node lib/server-lifecycle.mjs start --timeout 120000
   ```

2. **Check server logs**
   ```bash
   tail -f .dev-server.log
   ```

3. **Manual start**
   ```bash
   # Start manually and wait for ready
   pnpm dev
   # Wait for "compiled successfully"
   # Then run tests
   ```

### Cannot Auto-Detect Framework

**Error:**
```
Error: Could not detect dev server config
```

**Solutions:**

1. **Check package.json exists**
   ```bash
   ls -la package.json
   ```

2. **Override in CLAUDE.md**
   ```markdown
   ## DevTools MCP
   url: http://localhost:8000
   ```

3. **Specify URL at runtime**
   ```bash
   claude "test http://localhost:8000"
   ```

---

## Performance Issues

### Slow Screenshots

**Issue:** Screenshots take > 10 seconds

**Solutions:**

1. **Use JPEG instead of PNG**
   ```
   take_screenshot with format="jpeg" quality=80
   ```

2. **Don't use fullPage**
   ```
   take_screenshot  # Viewport only
   ```

3. **Reduce viewport size**
   ```
   resize_page to 1280x720  # Instead of 4K
   ```

### Slow Page Load

**Issue:** Page takes > 30 seconds to load

**Solutions:**

1. **Increase navigation timeout**
   ```
   navigate_page to URL with timeout=60000
   ```

2. **Check network conditions**
   ```bash
   # Remove network throttling
   emulate networkConditions="No emulation"
   ```

3. **Check dev server performance**
   ```bash
   # Restart dev server
   killall node
   pnpm dev
   ```

### Memory Issues

**Issue:** Browser uses too much RAM

**Solutions:**

1. **Use isolated mode**
   ```json
   {
     "args": ["--isolated"]
   }
   ```

2. **Close unused tabs**
   ```
   list_pages
   close_page for unused IDs
   ```

3. **Restart browser** (restart Claude Desktop)

---

## Tool-Specific Issues

### Element UID Not Found

**Error:**
```
Error: Element with uid "123" not found
```

**Solutions:**

1. **Take fresh snapshot**
   ```
   take_snapshot
   # UIDs change on page updates
   ```

2. **Wait for dynamic content**
   ```
   wait_for "Loading complete"
   take_snapshot
   ```

3. **Check element still exists**
   ```
   evaluate_script: () => document.querySelector('.target-element')
   ```

### Screenshot Empty/Black

**Issue:** Screenshot is blank or all black

**Solutions:**

1. **Wait for content**
   ```
   navigate_page to URL
   wait_for "key content"
   take_screenshot
   ```

2. **Check viewport size**
   ```
   resize_page to 1920x1080
   ```

3. **Disable GPU** (MCP config)
   ```json
   {
     "args": ["--disable-gpu"]
   }
   ```

### Console Messages Missing

**Issue:** Known errors not appearing in list

**Solutions:**

1. **Check message types**
   ```
   list_console_messages with types=["error", "warn", "info"]
   ```

2. **Include preserved messages**
   ```
   list_console_messages with includePreservedMessages=true
   ```

3. **Check timing** (errors before navigation)
   ```
   # List messages AFTER page loads
   navigate_page to URL
   wait_for "content"
   list_console_messages
   ```

### Network Requests Missing

**Issue:** Known requests not in list

**Solutions:**

1. **Check resource types**
   ```
   list_network_requests with resourceTypes=["xhr", "fetch", "document"]
   ```

2. **Include preserved requests**
   ```
   list_network_requests with includePreservedRequests=true
   ```

3. **Check pagination**
   ```
   list_network_requests with pageSize=100
   ```

---

## Platform-Specific Issues

### Linux: Snap Permission

**Error:**
```
Error: Permission denied: /home/user/project
```

**Solution:**
```bash
# Grant snap access to home directory
snap connect brave:home

# Or use non-snap browser
sudo apt install chromium-browser
```

### Linux: Wayland Issues

**Error:**
```
Error: Failed to launch browser (Wayland)
```

**Solution:**
```json
{
  "args": [
    "--ozone-platform=wayland",
    "--enable-features=UseOzonePlatform"
  ]
}
```

### macOS: Security Permissions

**Error:**
```
Error: "Brave" cannot be opened because the developer cannot be verified
```

**Solution:**
```bash
# Allow in System Preferences → Security & Privacy
# Or remove quarantine attribute
xattr -d com.apple.quarantine "/Applications/Brave Browser.app"
```

### macOS: Rosetta (Apple Silicon)

**Issue:** Intel browser on M1/M2 Mac

**Solution:**
```bash
# Ensure native ARM build
brew install --cask brave-browser

# Or install Rosetta for Intel apps
softwareupdate --install-rosetta
```

### Windows: Path with Spaces

**Issue:** Path not recognized

**Solution:**
```json
{
  "args": [
    "--executablePath",
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  ]
}
```

Note: Backslashes must be escaped in JSON.

### Windows: Environment Variables

**Issue:** %LOCALAPPDATA% not expanded

**Solution:**
```json
{
  "args": [
    "--executablePath",
    "C:\\Users\\YourName\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  ]
}
```

Use full path instead of environment variables.

---

## Debug Commands

### Verify Everything

```bash
# 1. Check MCP setup
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs

# 2. Detect browser
node ${PAI_DIR}/skills/devtools-mcp/lib/browser-detect.mjs

# 3. Check auto-detection
node ${PAI_DIR}/skills/devtools-mcp/lib/auto-detect.mjs

# 4. Test URL builder
node ${PAI_DIR}/skills/devtools-mcp/lib/url-builder.mjs

# 5. Check MCP connection
claude mcp list
```

### Logs

```bash
# MCP server logs (if configured)
tail -f /tmp/chrome-devtools-mcp.log

# Dev server logs
tail -f .dev-server.log

# Claude Desktop logs
# Linux: ~/.config/claude-desktop/logs/
# macOS: ~/Library/Logs/Claude/
# Windows: %APPDATA%\Claude\logs\
```

### Network Debugging

```bash
# Check port connectivity
nc -zv localhost 8000

# Check DNS resolution
nslookup localhost

# Check firewall
sudo ufw status
```

---

## Getting Help

### Check Documentation

1. `README.md` - Quick start guide
2. `docs/setup.md` - Installation instructions
3. `docs/tools-reference.md` - MCP tool details
4. `docs/examples.md` - Usage examples

### Verify Setup

Run verification script:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
```

Should show all ✅ checks passed.

### Debug Mode

Enable debug logging in MCP config:
```json
{
  "env": {
    "DEBUG": "chrome-devtools-mcp:*"
  }
}
```

### Common Issues Checklist

- [ ] MCP server installed (`npm install -g chrome-devtools-mcp`)
- [ ] Browser installed (Brave, Chrome, or Chromium)
- [ ] Config file exists (`~/.config/claude-desktop/claude_desktop_config.json`)
- [ ] Browser path correct in config
- [ ] Claude Desktop restarted after config changes
- [ ] MCP shows "Connected" (`claude mcp list`)
- [ ] Dev server running (if testing localhost)
- [ ] Port not blocked by firewall

---

**Still having issues?**

Contact JM with:
1. Error message
2. Output of verification script
3. MCP config (with sensitive data removed)
4. Platform (Linux/macOS/Windows)
5. What you were trying to do

---

**Last updated:** February 12, 2026
