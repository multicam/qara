# CLI Framework Tier Comparison

Detailed comparison of the three CLI complexity tiers.

---

## Decision Matrix

| Factor | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Commands | 2-10 | 10-30 | 30+ |
| Complexity | Simple | Moderate | High |
| Subcommands | No | Yes | Yes |
| Plugins | No | Possible | Built-in |
| Help | Manual | Auto | Auto |
| Learning curve | Low | Medium | High |
| Dev speed | Fast | Medium | Slow |
| Dependencies | 0 | 1 | Many |
| Startup time | ~10ms | ~30ms | ~100ms |
| Idle memory | ~15MB | ~25MB | ~50MB |

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

## Tier 3: oclif (Enterprise)

**Reference only — ~5% of CLIs.** Full enterprise framework with plugin ecosystem and auto-docs.

**Strengths:** enterprise-tested, rich plugin ecosystem, auto-generated docs, comprehensive test utilities.
**Limits:** heavy framework, complex setup, slow development, over-engineered for most.
**Best for:** Heroku CLI, Salesforce CLI, Twilio CLI scale projects.

**95% of CLIs don't need this.** Even complex tools work well with Commander.js. Only consider oclif if:
- Building the next Heroku CLI
- Need plugin marketplace
- Managing 50+ commands
- Have a dedicated CLI team

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

### Tier 2 → Tier 3

**When:** commands exceed 30, need plugin marketplace, enterprise requirements.

**Steps:** oclif generator → port commands → setup plugin infra → comprehensive testing → update docs.

**Effort:** 1-2 weeks. Rarely justified — Commander.js scales to 50+ commands.

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

**Tier 3** (~10 min, template overhead):
```bash
oclif generate command newcmd
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

**Tier 3:**
```typescript
import { test } from '@oclif/test';
describe('list command', () => {
  test.stdout().command(['list']).it('lists items', ctx => {
    expect(ctx.stdout).to.contain('items');
  });
});
```

All tiers testable. Tier 1 simplest, Tier 3 has most utilities.

---

## Recommendation Algorithm

```typescript
function selectTier(req: {
  commandCount: number;
  needsSubcommands: boolean;
  needsPlugins: boolean;
  teamSize: number;
  complexity: 'low' | 'medium' | 'high';
}): 1 | 2 | 3 {
  if (req.commandCount > 30 || req.needsPlugins || req.teamSize > 3) return 3;
  if (req.commandCount > 10 || req.needsSubcommands || req.complexity === 'high') return 2;
  return 1;
}
```

---

## Summary

- **Tier 1 (llcli-style)** — quick CLIs, simple automation, API clients, file processors, <10 commands
- **Tier 2 (Commander)** — 10+ commands, subcommand groups, auto-help, complex options
- **Tier 3 (oclif)** — enterprise scale, plugin marketplace, 30+ commands, dedicated team

Start simple, escalate only when justified. The llcli pattern solves 80% of CLI needs.
