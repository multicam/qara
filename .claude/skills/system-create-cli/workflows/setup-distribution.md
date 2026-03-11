---
workflow: setup-distribution
purpose: Configure CLI for publishing or standalone binary distribution
---

# Setup Distribution Workflow

**Make a CLI installable — via standalone binary, npm package, or PATH symlink.**

---

## 🎯 PURPOSE

Take a working CLI from "runs locally" to "installable by others" — or just make it globally available on the current machine.

---

## 📍 WHEN TO USE

- User requests: "publish CLI", "make CLI installable", "distribute CLI"
- "make standalone binary", "make it work without bun"
- CLI is tested and production-ready
- Sharing with others or deploying to servers

---

## 📋 DISTRIBUTION OPTIONS

### Decision Tree

```
Is this just for JM's machine?  ─ YES → Option 1: PATH Symlink
Does the target have Bun?       ─ YES → Option 2: npm/bun Package
Need it to run without Bun?     ─ YES → Option 3: Standalone Binary
```

---

## Option 1: PATH Symlink (Personal Use)

The simplest option — just make it globally available.

### Steps

```bash
# 1. Ensure CLI is executable
chmod +x ${PAI_DIR}/bin/[cli-name]/[cli-name].ts

# 2. Symlink to a PATH directory
ln -sf ${PAI_DIR}/bin/[cli-name]/[cli-name].ts ~/.local/bin/[cli-name]

# 3. Verify
which [cli-name]
[cli-name] --version
```

### Requirements
- `~/.local/bin` in PATH (already configured in Qara)
- Shebang line: `#!/usr/bin/env bun`
- File has +x permission

---

## Option 2: npm/bun Package

For sharing with others who have Bun or Node.js.

### Steps

#### 1. Prepare package.json

```json
{
  "name": "[cli-name]",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "[cli-name]": "./[cli-name].ts"
  },
  "files": [
    "[cli-name].ts",
    "README.md"
  ],
  "engines": {
    "bun": ">=1.0.0"
  },
  "license": "MIT",
  "description": "[one-line description]"
}
```

#### 2. Verify Package Contents

```bash
cd ${PAI_DIR}/bin/[cli-name]/

# Check what would be published
bun pm pack --dry-run

# Verify no secrets included
# NEVER include: .env, credentials, API keys
```

#### 3. Test Local Install

```bash
# Install globally from local path
bun link

# Verify
[cli-name] --version
[cli-name] --help
```

#### 4. Publish (if public)

```bash
# Login (first time only)
npm login

# Publish
npm publish

# Users install with:
# bun add -g [cli-name]
# or: npm install -g [cli-name]
```

**SAFETY:** Double-check repository — NEVER publish from `${PAI_DIR}/` to public npm. Only from `~/Projects/PAI/` or other public repos.

---

## Option 3: Standalone Binary

For distribution to machines without Bun. Creates a single executable.

### Steps

#### 1. Build Binary

```bash
cd ${PAI_DIR}/bin/[cli-name]/

# Compile to standalone binary
bun build [cli-name].ts --compile --outfile [cli-name]

# Cross-compile for other platforms
bun build [cli-name].ts --compile --target=bun-linux-x64 --outfile [cli-name]-linux
bun build [cli-name].ts --compile --target=bun-darwin-arm64 --outfile [cli-name]-macos
```

#### 2. Test Binary

```bash
# Run the compiled binary (no bun needed)
./[cli-name] --version
./[cli-name] --help
./[cli-name] [test-command]

# Verify it works without bun in PATH
env -i HOME=$HOME PATH=/usr/bin ./[cli-name] --version
```

#### 3. Distribute

**For personal servers:**
```bash
scp [cli-name]-linux user@server:/usr/local/bin/[cli-name]
ssh user@server "chmod +x /usr/local/bin/[cli-name]"
```

**For GitHub releases:**
```bash
# Create release with binaries
gh release create v1.0.0 \
  [cli-name]-linux \
  [cli-name]-macos \
  --title "[cli-name] v1.0.0" \
  --notes "Initial release"
```

### Binary Size Expectations

| CLI Complexity | Approximate Size |
|---------------|-----------------|
| Simple (Tier 1, no deps) | ~45-55 MB |
| Medium (Tier 2, Commander) | ~50-60 MB |
| Complex (with native deps) | ~60-80 MB |

Bun includes its runtime in the binary — the size is mostly fixed overhead.

---

## 📋 PRE-DISTRIBUTION CHECKLIST

Run these before any distribution option:

```bash
# 1. Tests pass
bun test bin/[cli-name]/

# 2. Help text is complete
./[cli-name].ts --help

# 3. Version is set
./[cli-name].ts --version

# 4. No secrets in source
grep -r 'API_KEY\|SECRET\|PASSWORD' [cli-name].ts  # Should use env vars, not literals

# 5. .env.example exists (documents required config)
cat .env.example

# 6. README has install instructions
head -30 README.md
```

---

## ✅ QUALITY CHECKLIST

- [ ] Distribution method chosen (symlink / package / binary)
- [ ] Tests pass before distribution
- [ ] No secrets in source code
- [ ] .env.example documents required configuration
- [ ] README has installation instructions
- [ ] `--help` and `--version` work
- [ ] File permissions correct (chmod +x)
- [ ] **If publishing:** verified correct repository (not private PAI repo)
- [ ] **If binary:** tested on target platform without Bun

---

## Related Workflows

- **add-testing.md** — Tests are a prerequisite for distribution
- **create-cli.md** — Start here to generate the CLI
- **upgrade-tier.md** — Consider complexity before distributing
