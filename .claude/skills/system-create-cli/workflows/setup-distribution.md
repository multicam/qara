---
workflow: setup-distribution
purpose: Configure CLI for publishing or standalone binary distribution
---

# Setup Distribution Workflow

Make a CLI installable — PATH symlink, npm/bun package, or standalone binary.

## When to Use

- "publish CLI", "make CLI installable", "distribute CLI", "standalone binary"
- CLI is tested and production-ready

## Decision Tree

```
Just for this machine?   → Option 1: PATH symlink
Target has Bun?          → Option 2: npm/bun package
Must run without Bun?    → Option 3: standalone binary
```

---

## Option 1: PATH Symlink (personal)

```bash
chmod +x ${PAI_DIR}/bin/[cli-name]/[cli-name].ts
ln -sf ${PAI_DIR}/bin/[cli-name]/[cli-name].ts ~/.local/bin/[cli-name]
which [cli-name]
[cli-name] --version
```

Requires: `~/.local/bin` in PATH (already configured in Qara), shebang `#!/usr/bin/env bun`, `chmod +x`.

---

## Option 2: npm/bun Package

### 1. package.json

```json
{
  "name": "[cli-name]",
  "version": "1.0.0",
  "type": "module",
  "bin": { "[cli-name]": "./[cli-name].ts" },
  "files": ["[cli-name].ts", "README.md"],
  "engines": { "bun": ">=1.0.0" },
  "license": "MIT",
  "description": "[one-line description]"
}
```

### 2. Verify package contents

```bash
cd ${PAI_DIR}/bin/[cli-name]/
bun pm pack --dry-run
# NEVER include: .env, credentials, API keys
```

### 3. Test local install

```bash
bun link
[cli-name] --version
```

### 4. Publish

```bash
npm login         # first time only
npm publish
# users: bun add -g [cli-name]  OR  npm install -g [cli-name]
```

**SAFETY:** NEVER publish from `${PAI_DIR}/` (private). Only from `~/Projects/PAI/` or other public repos.

---

## Option 3: Standalone Binary

### 1. Build

```bash
cd ${PAI_DIR}/bin/[cli-name]/

bun build [cli-name].ts --compile --outfile [cli-name]

# Cross-compile
bun build [cli-name].ts --compile --target=bun-linux-x64 --outfile [cli-name]-linux
bun build [cli-name].ts --compile --target=bun-darwin-arm64 --outfile [cli-name]-macos
```

### 2. Test

```bash
./[cli-name] --version
./[cli-name] --help

# Verify runs without bun in PATH
env -i HOME=$HOME PATH=/usr/bin ./[cli-name] --version
```

### 3. Distribute

```bash
# Personal server
scp [cli-name]-linux user@server:/usr/local/bin/[cli-name]
ssh user@server "chmod +x /usr/local/bin/[cli-name]"

# GitHub release
gh release create v1.0.0 [cli-name]-linux [cli-name]-macos \
  --title "[cli-name] v1.0.0" --notes "Initial release"
```

### Binary Size

| Complexity | Size |
|---|---|
| Tier 1 (no deps) | ~45-55 MB |
| Tier 2 (Commander) | ~50-60 MB |
| With native deps | ~60-80 MB |

Bun runtime is embedded — size is mostly fixed overhead.

---

## Pre-Distribution Checklist

```bash
bun test bin/[cli-name]/                                # tests pass
./[cli-name].ts --help                                  # help complete
./[cli-name].ts --version                               # version set
grep -r 'API_KEY\|SECRET\|PASSWORD' [cli-name].ts       # no literals
cat .env.example                                        # config documented
head -30 README.md                                      # install instructions
```

- [ ] Distribution method chosen
- [ ] Tests pass
- [ ] No secrets in source
- [ ] `.env.example` exists
- [ ] README has install instructions
- [ ] `chmod +x` on entry
- [ ] If publishing: verified correct repo (not private)
- [ ] If binary: tested on target platform without Bun

## Related

- `add-testing.md` — prerequisite for distribution
- `create-cli.md` — initial generation
- `upgrade-tier.md` — consider complexity first
