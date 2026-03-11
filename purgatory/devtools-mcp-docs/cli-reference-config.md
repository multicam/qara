# DevTools MCP CLI Reference — Options, Examples & Configuration

Options, Examples, Configuration, Troubleshooting, and Related Documentation for the DevTools MCP CLI.

For Installation, Usage, and all Commands see: `cli-reference-commands.md`

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

# Start dev server
devtools-mcp dev

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
devtools-mcp dev
# or manually: pnpm dev

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
# Ensure ~/.local/bin is in PATH (add to ~/.zshrc on macOS, ~/.bashrc on Linux)
SHELL_RC="${ZDOTDIR:-$HOME}/.$(basename "$SHELL")rc"
echo $PATH | grep -q "$HOME/.local/bin" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
source "$SHELL_RC"
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
- **Setup Guide:** `${PAI_DIR}/skills/devtools-mcp/docs/setup-install.md`
- **Setup Config:** `${PAI_DIR}/skills/devtools-mcp/docs/setup-config.md`
- **Tools Reference:** `${PAI_DIR}/skills/devtools-mcp/docs/tools-reference-actions.md` / `tools-reference-analysis.md`
- **Examples:** `${PAI_DIR}/skills/devtools-mcp/docs/examples-testing.md` / `examples-advanced.md`
- **Troubleshooting:** `${PAI_DIR}/skills/devtools-mcp/docs/troubleshooting-setup.md` / `troubleshooting-browser.md` / `troubleshooting-runtime.md`

---

**Last updated:** February 12, 2026
**CLI Version:** 0.1.0
