# DevTools MCP Troubleshooting: Setup & Connection Issues

Part of DevTools MCP docs. See also: [troubleshooting-browser.md](troubleshooting-browser.md) | [troubleshooting-runtime.md](troubleshooting-runtime.md)

Common setup and connection issues for the DevTools MCP skill.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Connection Issues](#connection-issues)

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
bun install -g chrome-devtools-mcp

# Verify installation
which chrome-devtools-mcp
```

**If still not found:**
```bash
# Check bun global path
bun pm bin -g

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$HOME/.bun/bin"
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

**Continue reading:**
- [troubleshooting-browser.md](troubleshooting-browser.md) — Browser Issues + Server Issues
- [troubleshooting-runtime.md](troubleshooting-runtime.md) — Performance, Tool-Specific, Platform Issues, Debug Commands, Getting Help

---

**Last updated:** February 12, 2026
