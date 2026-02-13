# CLI Framework Tier Comparison

Detailed comparison of the three CLI complexity tiers.

---

## Tier 1: llcli-Style (Manual Parsing)

### Overview
- Manual argument parsing using `process.argv`
- Zero framework dependencies
- Bun + TypeScript
- ~300-400 lines total
- **Default choice for 80% of CLIs**

### Strengths
- **Simplicity** - Easy to understand and modify
- **Zero Dependencies** - No framework to learn or update
- **Fast Development** - Quick to build and iterate
- **Transparent** - Clear control flow
- **Lightweight** - Minimal overhead

### Limitations
- Manual help text maintenance
- No auto-completion out of the box
- Subcommands require manual routing
- Option parsing is manual

### Best For
- API clients (GitHub, Notion, Slack, etc.)
- File processors (markdown, JSON, CSV)
- Simple automation scripts
- Data transformers
- 2-10 commands with simple arguments

### Example Structure
```typescript
#!/usr/bin/env bun

// Configuration
interface Config {
  apiKey: string;
  endpoint: string;
}

// Command interface
interface Command {
  name: string;
  args: string[];
  options: Record<string, string>;
}

// Main logic
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  showHelp();
  process.exit(1);
}

switch (command) {
  case 'list':
    await handleList(args.slice(1));
    break;
  case 'create':
    await handleCreate(args.slice(1));
    break;
  case 'delete':
    await handleDelete(args.slice(1));
    break;
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

### Real-World Example: llcli
- 327 lines total
- Handles 8 commands
- Complete error handling
- Type-safe throughout
- Zero dependencies
- Production-ready

---

## Tier 2: Commander.js (Framework-Based)

### Overview
- Commander.js for argument parsing
- Auto-generated help text
- Subcommand support
- Plugin-ready architecture
- **Escalation tier for 15% of CLIs**

### Strengths
- **Auto-help** - Generated from definitions
- **Subcommands** - Natural grouping
- **Validation** - Built-in option validation
- **Extensibility** - Plugin system ready
- **Standards** - Well-known patterns

### Limitations
- Framework dependency
- More complex codebase
- Slightly slower startup
- Learning curve for contributors

### Best For
- 10+ commands needing grouping
- Complex nested options
- Multiple output formats
- Plugin architecture
- Enterprise-grade tools

### Example Structure
```typescript
#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command();

program
  .name('mycli')
  .description('My CLI tool')
  .version('1.0.0');

// List command
program
  .command('list')
  .description('List items')
  .option('-f, --format <type>', 'Output format', 'json')
  .action(async (options) => {
    // Implementation
  });

// Create subcommand group
const create = program.command('create');

create
  .command('item <name>')
  .description('Create new item')
  .option('-t, --tags <tags...>', 'Tags')
  .action(async (name, options) => {
    // Implementation
  });

create
  .command('batch <file>')
  .description('Create multiple items')
  .action(async (file) => {
    // Implementation
  });

program.parse();
```

### When to Escalate from Tier 1
- Commands exceed 10 and need categorization
- Complex option combinations
- Need plugin system
- Multiple output format requirements
- Auto-completion is critical

---

## Tier 3: oclif (Enterprise Framework)

### Overview
- Full enterprise framework
- Plugin ecosystem
- Multi-command architecture
- Auto-documentation
- **Reference only - rarely needed**

### Strengths
- **Enterprise-Ready** - Battle-tested at scale
- **Plugin System** - Rich ecosystem
- **Auto-Docs** - Generated documentation
- **Testing** - Comprehensive test utilities
- **Standards** - Best practices baked in

### Limitations
- Heavy framework
- Complex setup
- Slower development
- Over-engineered for most needs

### Best For
- Heroku CLI scale projects
- Large plugin ecosystems
- Multi-tenant CLI systems
- 50+ commands
- Team of CLI developers

### Real-World Examples
- Heroku CLI
- Salesforce CLI
- Twilio CLI

### Why Reference Only
**95% of CLIs don't need this complexity.** Even complex tools work well with Commander.js.

Only consider oclif if:
- Building the next Heroku CLI
- Need plugin marketplace
- Managing 50+ commands
- Have dedicated CLI team

---

## Decision Matrix

| Factor | Tier 1 | Tier 2 | Tier 3 |
|--------|--------|--------|--------|
| Commands | 2-10 | 10-30 | 30+ |
| Complexity | Simple | Moderate | High |
| Subcommands | No | Yes | Yes |
| Plugins | No | Possible | Built-in |
| Help | Manual | Auto | Auto |
| Learning Curve | Low | Medium | High |
| Dev Speed | Fast | Medium | Slow |
| Dependencies | 0 | 1 | Many |
| Startup Time | Instant | Fast | Slower |

---

## Migration Paths

### Tier 1 → Tier 2

**When to migrate:**
- Commands exceed 10
- Need subcommand grouping
- Want auto-generated help
- Complex option combinations

**How to migrate:**
1. Install Commander: `bun add commander`
2. Create Command instance
3. Convert each switch case to `.command()`
4. Update option parsing to Commander syntax
5. Test all commands
6. Update documentation

**Effort:** 2-4 hours for typical CLI

### Tier 2 → Tier 3

**When to migrate:**
- Commands exceed 30
- Need plugin system
- Building marketplace
- Enterprise requirements

**How to migrate:**
1. Use oclif generator
2. Port commands to oclif structure
3. Setup plugin infrastructure
4. Comprehensive testing
5. Update all documentation

**Effort:** 1-2 weeks for typical CLI

**Note:** This migration is rarely justified. Commander.js scales to 50+ commands.

---

## Performance Comparison

### Startup Time (Empty CLI)
- Tier 1: ~10ms
- Tier 2: ~30ms
- Tier 3: ~100ms

### Memory Usage (Idle)
- Tier 1: ~15MB
- Tier 2: ~25MB
- Tier 3: ~50MB

### Cold Start (First Run)
- Tier 1: Instant
- Tier 2: <100ms
- Tier 3: ~200ms

**Verdict:** Performance differences are negligible for human interaction.

---

## Maintenance Comparison

### Adding a New Command

**Tier 1:**
```typescript
case 'newcmd':
  await handleNewCmd(args.slice(1));
  break;
```
Time: 5 minutes

**Tier 2:**
```typescript
program
  .command('newcmd <arg>')
  .description('New command')
  .action(handleNewCmd);
```
Time: 3 minutes (auto-help included)

**Tier 3:**
```bash
oclif generate command newcmd
```
Time: 10 minutes (template overhead)

---

## Testing Comparison

### Tier 1 Testing
```typescript
import { execSync } from 'child_process';

it('executes command', () => {
  const output = execSync('./cli.ts list').toString();
  expect(JSON.parse(output)).toHaveProperty('items');
});
```

### Tier 2 Testing
```typescript
import { Command } from 'commander';

it('executes command', async () => {
  const program = new Command();
  // Setup and test
});
```

### Tier 3 Testing
```typescript
import { test } from '@oclif/test';

describe('list command', () => {
  test
    .stdout()
    .command(['list'])
    .it('lists items', ctx => {
      expect(ctx.stdout).to.contain('items');
    });
});
```

**Verdict:** All tiers are testable. Tier 1 is simplest, Tier 3 has most utilities.

---

## Recommendation Algorithm

```typescript
function selectTier(requirements: {
  commandCount: number;
  needsSubcommands: boolean;
  needsPlugins: boolean;
  teamSize: number;
  complexity: 'low' | 'medium' | 'high';
}): 1 | 2 | 3 {
  // Check Tier 3
  if (
    requirements.commandCount > 30 ||
    requirements.needsPlugins ||
    requirements.teamSize > 3
  ) {
    return 3; // oclif
  }

  // Check Tier 2
  if (
    requirements.commandCount > 10 ||
    requirements.needsSubcommands ||
    requirements.complexity === 'high'
  ) {
    return 2; // Commander
  }

  // Default to Tier 1
  return 1; // llcli-style
}
```

---

## Summary

**Start with Tier 1** (llcli-style) for:
- Quick CLI needs
- Simple automation
- API clients
- File processors
- <10 commands

**Escalate to Tier 2** (Commander) when:
- Commands exceed 10
- Need subcommand groups
- Want auto-help
- Complex options

**Reference Tier 3** (oclif) only for:
- Enterprise scale
- Plugin marketplace
- 30+ commands
- Dedicated team

**Philosophy:** Start simple, escalate only when justified. The llcli pattern solves 80% of CLI needs with zero dependencies and maximum clarity.
