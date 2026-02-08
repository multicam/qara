---
workflow: create-cli
purpose: Generate complete, production-ready TypeScript CLI from requirements
---

# Create CLI Workflow

**Generate production-quality TypeScript CLIs following llcli pattern and PAI's CLI-First Architecture.**

---

## Tier Decision Tree

```
Does it need 10+ commands with grouping? ─ YES → Tier 2 (Commander.js)
Does it need plugin architecture?        ─ YES → Tier 2
Does it need subcommands (git-style)?    ─ YES → Tier 2
Otherwise → Tier 1 (llcli-style) ← DEFAULT (80% of CLIs)
```

**Tier 1:** 2-10 commands, API wrappers, file processors, JSON output, zero deps
**Tier 2:** 10+ commands, subcommand grouping, Commander.js (~100KB)

---

## Workflow Steps

### Step 1: Gather Requirements

Extract from user request:
- CLI name (kebab-case)
- Purpose (one sentence)
- Commands needed (list with arguments)
- API/service being wrapped
- Authentication method
- Environment variables
- Output format (usually JSON)

Ask if unclear: "What API?", "What commands?", "How should it authenticate?"

---

### Step 2: Determine Tier

Apply decision tree above. Default to Tier 1.

---

### Step 3: Generate Code

**Use patterns from `patterns.md` for each section:**

1. **Interfaces** — Define Config, API response types, command option types
2. **Configuration** — `loadConfig()` from `${PAI_DIR}/.env` (pattern 1)
3. **API Client** — Typed fetch wrapper with error handling (pattern 2)
4. **Commands** — One async function per command with input validation
5. **Error Handling** — CLIError class with code + hint (pattern 3)
6. **Help Text** — USAGE, COMMANDS, OPTIONS, EXAMPLES, CONFIGURATION (pattern 5)
7. **Main Entry** — Arg parsing, routing, top-level catch (pattern 4)

**For Tier 2, add:**
```typescript
import { Command } from 'commander';
const program = new Command();
program.name('mycli').description('...').version('1.0.0');
program.command('action <arg>').option('-o, --output <path>').action(handler);
program.parse();
```

---

### Step 4: Generate Documentation

**README.md:** Overview, philosophy (CLI-First Architecture), installation, usage, examples (with jq piping), configuration, troubleshooting.

**QUICKSTART.md:** 30-second guide — install, 3-5 most common commands, jq tips.

---

### Step 5: Generate Supporting Files

- `package.json` — name, version, type: "module", bin entry
- `tsconfig.json` — target ES2022, strict, bundler resolution
- `.env.example` — required environment variables

---

### Step 6: Validate & Report

**Quality gates:**
1. TypeScript compiles without errors
2. `--help` displays correctly
3. `--version` works
4. All commands implemented
5. File permissions set (`chmod +x`)

**Report to user:**
```
✅ CLI Created: ${PAI_DIR}/bin/[name]/

Files: [name].ts, package.json, tsconfig.json, .env.example, README.md, QUICKSTART.md

Next:
1. Configure: Add [ENV_VAR] to ${PAI_DIR}/.env
2. Test: ./[name].ts --help
3. Use: ./[name].ts [example command]
```

---

## Best Practices

1. **Default to Tier 1** — start simple, escalate when proven
2. **Type safety first** — strict mode, interfaces, no `any`
3. **Deterministic output** — JSON to stdout, errors to stderr
4. **Actionable errors** — explain what failed + how to fix
5. **Examples in help** — real usage, not just flag descriptions
6. **Follow llcli pattern** — reference `${PAI_DIR}/bin/llcli/`
7. **Test immediately** — run `--help` and version before reporting

---

## Related Workflows

- **add-command.md** — Add commands to existing CLI
- **upgrade-tier.md** — Migrate Tier 1 → Tier 2
