# DevTools MCP Setup Guide — Configuration & Troubleshooting

Configuration Options, Project Configuration, Troubleshooting, Platform-Specific Notes, and Next Steps for the DevTools MCP integration.

For Prerequisites and Installation Steps 1–7 see: `setup-install.md`

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

**Verification failed?** See `troubleshooting-setup.md`

**Need examples?** See `examples-testing.md`

**Tool reference?** See `tools-reference-actions.md`

---

**Last updated:** February 12, 2026
