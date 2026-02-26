# DevTools MCP Troubleshooting: Performance, Tools & Platform Issues

Part of DevTools MCP docs. See also: [troubleshooting-setup.md](troubleshooting-setup.md) | [troubleshooting-browser.md](troubleshooting-browser.md)

Performance, tool-specific, platform-specific issues, debug commands, and getting help.

## Table of Contents

- [Performance Issues](#performance-issues)
- [Tool-Specific Issues](#tool-specific-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Debug Commands](#debug-commands)
- [Getting Help](#getting-help)

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
2. `docs/setup-install.md` - Installation instructions
3. `docs/tools-reference-actions.md` and `docs/tools-reference-analysis.md` - MCP tool details
4. `docs/examples-testing.md` and `docs/examples-advanced.md` - Usage examples

### Verify Setup

Run verification script:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
```

Should show all checks passed.

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

- [ ] MCP server installed (`bun install -g chrome-devtools-mcp`)
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
