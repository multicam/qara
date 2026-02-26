# DevTools MCP Troubleshooting: Browser & Server Issues

Part of DevTools MCP docs. See also: [troubleshooting-setup.md](troubleshooting-setup.md) | [troubleshooting-runtime.md](troubleshooting-runtime.md)

Browser and server issues for the DevTools MCP skill.

## Table of Contents

- [Browser Issues](#browser-issues)
- [Server Issues](#server-issues)

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

**Continue reading:**
- [troubleshooting-setup.md](troubleshooting-setup.md) — Setup Issues + Connection Issues
- [troubleshooting-runtime.md](troubleshooting-runtime.md) — Performance, Tool-Specific, Platform Issues, Debug Commands, Getting Help

---

**Last updated:** February 12, 2026
