---
workflow: upgrade-tier
purpose: Migrate CLI from Tier 1 (manual) to Tier 2 (Commander.js)
---

# Upgrade Tier Workflow

Migrate a Tier 1 (manual `process.argv`) CLI to Tier 2 (Commander.js).

## When to Upgrade

- 15+ commands (switch statement unwieldy)
- Need subcommands (git-style: `cli convert json csv`)
- Plugin architecture needed
- Complex nested options / multiple output formats

**Don't upgrade prematurely.** Tier 1 handles 10-15 commands fine. Most CLIs never need this.

## Steps

### 1. Install

```bash
cd ${PAI_DIR}/bin/[cli-name]/
bun add commander
```

### 2. Commander Skeleton

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command();

program
  .name('[cli-name]')
  .description('[description from old CLI]')
  .version('2.0.0'); // bump major
```

### 3. Convert Commands

Before (Tier 1):
```typescript
switch (command) {
  case 'fetch':
    await fetchData(args[1], limit);
    break;
}
```

After (Tier 2):
```typescript
program
  .command('fetch <arg>')
  .description('Fetch data')
  .option('-l, --limit <number>', 'limit results', '20')
  .action(async (arg: string, options) => {
    await fetchData(arg, parseInt(options.limit, 10));
  });
```

### 4. Preserve Help Quality

Don't let auto-generated help be worse than the old manual help.

```typescript
program
  .command('fetch <query>')
  .description('Search and fetch data')
  .option('-l, --limit <n>', 'max results', '20')
  .addHelpText('after', `
Examples:
  $ ${program.name()} fetch "keyword" --limit 50

Output: JSON to stdout
`);
```

### 5. Test

```bash
./cli.ts --help
./cli.ts fetch test
# ... exercise every command
```

### 6. Update Docs

```markdown
# Breaking Changes (v2.0.0)

Now uses Commander.js for better command organization.
- All commands work the same
- Help text improved
- Added subcommand support
```

## Checklist

- [ ] Commander.js installed
- [ ] All commands converted
- [ ] Help text quality maintained (use `addHelpText`)
- [ ] All tests pass
- [ ] README updated with breaking changes
- [ ] Version bumped to 2.0.0
- [ ] Published users notified
