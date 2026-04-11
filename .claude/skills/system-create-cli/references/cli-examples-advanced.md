# CLI Generation Examples — Patterns, Testing, Docs

Shared patterns, tier decision matrix, test examples, and documentation templates. Examples 1-6 live in the basic examples reference (same directory).

---

## Common Patterns

### Config loading
```typescript
function loadConfig(): Config {
  const envPath = path.join(process.env.HOME!, '.env');
  if (!existsSync(envPath)) {
    throw new Error('Config file not found. Run: cp .env.example ~/.env');
  }
  // parse and return
}
```

### Error handling
```typescript
try {
  await executeCommand();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
```

### Help text
```typescript
function showHelp(): void {
  console.log(`
Usage: mycli <command> [options]

Commands:
  action1 <arg>     Do action 1
  action2 --flag    Do action 2

Options:
  --help            Show this help
  --version         Show version
  `);
}
```

### JSON output
```typescript
// Always parseable JSON for composability
console.log(JSON.stringify(result, null, 2));
```

### Typed options
```typescript
interface CommandOptions {
  format?: 'json' | 'yaml';
  output?: string;
  verbose?: boolean;
}

function parseOptions(args: string[]): CommandOptions {
  const options: CommandOptions = {};
  // parse and validate
  return options;
}
```

---

## Tier Decision Matrix

| Scenario | Commands | Complexity | Tier | Why |
|---|---|---|---|---|
| API Client | 5-8 | Simple args | 1 | llcli pattern |
| File Processor | 3-5 | Basic options | 1 | No subcommands |
| Data Pipeline | 15+ | Nested options | 2 | Grouping + auto-help |
| Automation | 2-4 | Simple flags | 1 | Lightweight |
| Database Tool | 10+ | Complex options | 2 | Categories |
| HTTP Client | 6-10 | Standard REST | 1 | llcli pattern |

**Default to Tier 1** unless Commander features are clearly needed.

---

## Testing Example

```typescript
import { describe, it, expect } from 'bun:test';
import { execSync } from 'child_process';

describe('ghcli', () => {
  it('lists repositories', () => {
    const output = execSync('ghcli repos --user multicam').toString();
    expect(JSON.parse(output)).toHaveProperty('repositories');
  });

  it('handles API errors gracefully', () => {
    expect(() => execSync('ghcli repos --user invalid-user-12345')).toThrow();
  });

  it('validates required arguments', () => {
    expect(() => execSync('ghcli repos')).toThrow(/missing required argument/i);
  });
});
```

See `../workflows/add-testing.md` for the full `bun:test` harness using `Bun.spawn`.

---

## README Template

```markdown
# CLI Name

One-line description.

## Philosophy
Why this CLI exists and design principles.

## Installation
\`\`\`bash
cd ~/.claude/bin/mycli
bun install
chmod +x mycli.ts
\`\`\`

## Configuration
\`\`\`bash
cp .env.example ~/.env
# Edit ~/.env with your API keys
\`\`\`

## Usage
\`\`\`bash
mycli command1 --option value
mycli command2 <arg>
\`\`\`

## Examples
[Concrete examples with expected output]

## Composability
[How to pipe to jq, grep, etc.]

## Error Handling
[Common errors and solutions]
```

## QUICKSTART Template

```markdown
# Quick Start

Most common use cases for [CLI Name].

## Common Tasks

\`\`\`bash
mycli task1
mycli task2 | jq '.data[]'
mycli task3 --format=yaml > output.yaml
\`\`\`

## Tips
- Tip 1
- Tip 2

## Next Steps
[Link to full README]
```
