# CLI Generation Examples — Patterns, Testing & Documentation

Common implementation patterns, tier decision matrix, testing examples, and documentation templates for CLI generation.

For concrete CLI examples (Examples 1–6) see: `cli-examples-basic.md`

---

## Common Patterns Across Examples

### 1. Configuration Management
```typescript
function loadConfig(): Config {
  const envPath = path.join(process.env.HOME!, '.env');
  if (!existsSync(envPath)) {
    throw new Error('Config file not found. Run: cp .env.example ~/.env');
  }
  // Load and parse config
}
```

### 2. Error Handling
```typescript
try {
  await executeCommand();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
```

### 3. Help Text
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

### 4. JSON Output
```typescript
// Always output parseable JSON for composability
console.log(JSON.stringify(result, null, 2));
```

### 5. Type Safety
```typescript
// Define clear interfaces
interface CommandOptions {
  format?: 'json' | 'yaml';
  output?: string;
  verbose?: boolean;
}

// Type-safe argument parsing
function parseOptions(args: string[]): CommandOptions {
  const options: CommandOptions = {};
  // Parse and validate
  return options;
}
```

---

## Tier Decision Matrix

| Scenario | Workflows | Complexity | Tier | Why |
|----------|-----------|------------|------|-----|
| API Client | 5-8 commands | Simple args | 1 | llcli pattern works perfectly |
| File Processor | 3-5 commands | Basic options | 1 | No subcommands needed |
| Data Pipeline | 15+ commands | Nested options | 2 | Need grouping + auto-help |
| Automation | 2-4 commands | Simple flags | 1 | Lightweight is better |
| Database Tool | 10+ commands | Complex options | 2 | Categories needed |
| HTTP Client | 6-10 commands | Standard REST | 1 | llcli pattern proven |

**Default to Tier 1** unless you have clear evidence that Commander's features are needed.

---

## Testing Examples

### Example: Testing API Client

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';

describe('ghcli', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('lists repositories', () => {
    const output = execSync('ghcli repos --user multicam').toString();
    const result = JSON.parse(output);
    expect(result).toHaveProperty('repositories');
  });

  it('handles API errors gracefully', () => {
    expect(() => {
      execSync('ghcli repos --user invalid-user-12345');
    }).toThrow();
  });

  it('validates required arguments', () => {
    expect(() => {
      execSync('ghcli repos');
    }).toThrow(/missing required argument/i);
  });
});
```

---

## Documentation Examples

### Example README Structure

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

### Command 1
\`\`\`bash
mycli command1 --option value
\`\`\`

### Command 2
\`\`\`bash
mycli command2 <arg>
\`\`\`

## Examples

[Concrete examples with expected output]

## Composability

[How to pipe to jq, grep, etc.]

## Error Handling

[Common errors and solutions]
```

### Example QUICKSTART Structure

```markdown
# Quick Start

Most common use cases for [CLI Name].

## Common Tasks

### Task 1
\`\`\`bash
mycli task1
\`\`\`

### Task 2
\`\`\`bash
mycli task2 | jq '.data[]'
\`\`\`

### Task 3
\`\`\`bash
mycli task3 --format=yaml > output.yaml
\`\`\`

## Tips

- Tip 1
- Tip 2
- Tip 3

## Next Steps

[Link to full README for advanced usage]
```
