# macOS Fixes & Platform-Specific Issues

**Purpose**: Document macOS-specific issues and workarounds for Qara system.

**Platform Note**: This system appears to be running on Linux. This file documents macOS-specific fixes if Qara is used on macOS in the future.

**Last Updated**: 2026-02-25

---

## macOS Setup

Qara runs on both Linux and macOS. The repo is cloned to `~/qara` on both platforms.

### Machine-Specific Settings

`settings.json` contains hardcoded paths (`PAI_DIR`, `PATH`). Each machine needs its own copy:

1. **Copy the template** for your platform:
   - Linux: `settings.json` is the canonical file
   - macOS: copy `settings-mac.json` to `settings.json` and update username

2. **Create `settings.local.json`** for machine-specific permission overrides (WebFetch domains, etc.)

3. **Symlink**: `~/.claude/settings.json` → `~/qara/.claude/settings.json`

The `settings-mac.json` template includes:
- macOS-specific `PAI_DIR` (`/Users/<username>/.claude`)
- Homebrew paths (`/opt/homebrew/bin`, `/opt/homebrew/sbin`)
- `~/.bun/bin` for bun shebang resolution
- `diskutil` deny rules instead of Linux `dd`/`mkfs` rules

---

## Platform Differences Handled

### Shebangs (fixed)
All shell scripts use `#!/usr/bin/env bash` (portable). On macOS this picks up Homebrew bash 5.x instead of the system bash 3.2.

### Shell Output (fixed)
All colored output uses `printf '%b'` instead of `echo -e` (macOS `/bin/echo` doesn't interpret `-e`).

### Notifications (handled in code)
`notification-hook.ts` detects platform:
- Linux: `notify-send`
- macOS: `osascript` (display notification)

### Service Control (handled in security hook)
`pre-tool-use-security.ts` covers both:
- Linux: `systemctl stop|restart|disable`
- macOS: `launchctl unload|bootout|disable|remove`

### Browser Paths (handled)
`browser-detect.mjs` probes platform-specific paths:
- Linux: `/snap/bin/brave`, `/usr/bin/brave-browser`, etc.
- macOS: `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`

The `mcp-config.json` template uses `${BRAVE_PATH}` — replace with your detected path.

---

## macOS-Specific Setup Steps

### 1. Xcode Command Line Tools
```bash
xcode-select --install
```

### 2. Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Homebrew PATH (Apple Silicon)
Add to `~/.zshrc`:
```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 4. CLI Tools
```bash
brew install oven-sh/bun/bun fd ripgrep ast-grep bat gh
```

### 5. Full Disk Access
System Settings → Privacy & Security → Full Disk Access → add Terminal/IDE

---

## Cross-Platform Rules

| Do | Don't |
|---|---|
| `#!/usr/bin/env bash` | `#!/bin/bash` |
| `printf '%b\n'` for colored output | `echo -e` |
| `import { join } from 'path'` | Hardcoded `/` separators |
| `process.platform` checks for OS-specific code | Assume Linux |
| `~/.zshrc` in docs (default on macOS) | `~/.bashrc` only |

---

## Related Documentation

- **stack-preferences.md** - Tool choices
- **INSTALL.md** - Full installation guide with platform matrix
- **TOOLS.md** - CLI tool preference matrix
