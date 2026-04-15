# CLI Framework Tier Comparison

Detailed comparison of the three CLI complexity tiers.

---

## Decision Matrix

| Factor | Tier 1 | Tier 2 |
|---|---|---|
| Commands | 2-10 | 10+ |
| Complexity | Simple | Moderate-High |
| Subcommands | No | Yes |
| Plugins | No | Possible |
| Help | Manual | Auto |
| Learning curve | Low | Medium |
| Dev speed | Fast | Medium |
| Dependencies | 0 | 1 |
| Startup time | ~10ms | ~30ms |
| Idle memory | ~15MB | ~25MB |

Performance differences are negligible for interactive CLIs.

---

## Tier 1: llcli-Style (Manual Parsing)

**Default choice — ~80% of CLIs.** Manual `process.argv` parsing, zero deps, Bun + TypeScript, ~300-400 lines.

**Strengths:** simple, zero deps, fast to build, transparent control flow, lightweight.
**Limits:** manual help text, no auto-completion, manual subcommand routing.
**Best for:** API clients, file processors, simple automation, data transformers, 2-10 commands.

```typescript
#!/usr/bin/env bun

interface Config { apiKey: string; endpoint: string; }

const args = process.argv.slice(2);
const command = args[0];

if (!command) { showHelp(); process.exit(1); }

switch (command) {
  case 'list':   await handleList(args.slice(1)); break;
  case 'create': await handleCreate(args.slice(1)); break;
  case 'delete': await handleDelete(args.slice(1)); break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}

function showHelp(): void {
  console.log(`
Usage: mycli <command> [options]

Commands:
  list              List items
  create <name>     Create new item
  delete <id>       Delete item

Options:
  --help            Show this help
  --version         Show version
  `);
}
```

**Real-world:** llcli — 327 lines, 8 commands, zero deps, production-ready.

---

## Tier 2: Commander.js

**Escalation tier — ~15% of CLIs.** Framework parsing, auto-help, subcommands, plugin-ready.

**Strengths:** auto-help from definitions, subcommand grouping, built-in validation, plugin system, well-known patterns.
**Limits:** framework dep, more complex, slightly slower startup, learning curve.
**Best for:** 10+ commands needing grouping, complex nested options, multiple output formats.

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command()
  .name('mycli')
  .description('My CLI tool')
  .version('1.0.0');

program
  .command('list')
  .description('List items')
  .option('-f, --format <type>', 'Output format', 'json')
  .action(async (options) => { /* ... */ });

const create = program.command('create');
create
  .command('item <name>')
  .description('Create new item')
  .option('-t, --tags <tags...>', 'Tags')
  .action(async (name, options) => { /* ... */ });

create
  .command('batch <file>')
  .description('Create multiple items')
  .action(async (file) => { /* ... */ });

program.parse();
```

**Escalate from Tier 1 when:** commands exceed 10 and need grouping, complex option combinations, plugin system needed, auto-completion critical.

---

**Enterprise-scale CLIs beyond Tier 2** (20+ commands, plugin marketplace, dedicated CLI team) → use `oclif` directly, outside this skill's scope.

---

## Migration Paths

### Tier 1 → Tier 2

**When:** commands exceed 10, need subcommand grouping, want auto-help, complex options.

**Steps:**
1. `bun add commander`
2. Create `Command` instance
3. Convert each switch case to `.command()`
4. Update option parsing to Commander syntax
5. Test all commands
6. Update documentation

**Effort:** 2-4 hours for typical CLI. See `../workflows/upgrade-tier.md`.

---

## Adding a New Command

**Tier 1** (~5 min):
```typescript
case 'newcmd':
  await handleNewCmd(args.slice(1));
  break;
```

**Tier 2** (~3 min, auto-help included):
```typescript
program
  .command('newcmd <arg>')
  .description('New command')
  .action(handleNewCmd);
```

---

## Testing

**Tier 1:**
```typescript
import { execSync } from 'child_process';
it('executes command', () => {
  const output = execSync('./cli.ts list').toString();
  expect(JSON.parse(output)).toHaveProperty('items');
});
```

**Tier 2:**
```typescript
import { Command } from 'commander';
it('executes command', async () => {
  const program = new Command();
  // setup and test
});
```

Both tiers are straightforward to test. Tier 1 is simplest — no framework overhead.

---

## Recommendation Algorithm

```typescript
function selectTier(req: {
  commandCount: number;
  needsSubcommands: boolean;
  needsPlugins: boolean;
  complexity: 'low' | 'medium' | 'high';
}): 'tier1-llcli' | 'tier2-commander' {
  // Enterprise-scale (20+ commands, plugin marketplace) → oclif directly, outside this skill's scope
  if (req.commandCount > 10 || req.needsSubcommands || req.complexity === 'high') {
    return 'tier2-commander';
  }
  return 'tier1-llcli';
}
```

---

## Summary

- **Tier 1 (llcli-style)** — quick CLIs, simple automation, API clients, file processors, <10 commands
- **Tier 2 (Commander)** — 10+ commands, subcommand groups, auto-help, complex options
- **oclif (out of scope)** — enterprise scale, plugin marketplace, 30+ commands, dedicated team

Start simple, escalate only when justified. The llcli pattern solves 80% of CLI needs.
