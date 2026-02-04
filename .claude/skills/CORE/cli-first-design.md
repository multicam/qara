# CLI-First: Design Best Practices

**Extracted from:** cli-first-guide.md

This document covers best practices for designing CLI tools that are discoverable, testable, and composable.

---

## CLI Design Best Practices

### 1. Command Structure

**Hierarchical, Clear Verbs:**
```bash
# Good: Clear command hierarchy
tool command subcommand --flag value

# Examples:
evals use-case create --name foo
evals test-case add --use-case foo --file test.json
evals run --use-case foo --model claude-3-5-sonnet

blog post create --title "My Post"
blog post publish --file ./posts/my-post.md
blog site build --env prod
```

**Avoid Ambiguous Commands:**
```bash
# Bad: What does "run" do?
tool run file.txt

# Good: Explicit action
tool process file.txt
tool analyze file.txt
```

### 2. Comprehensive --help

**Every Command Needs --help:**
```bash
$ tool --help
Usage: tool <command> [options]

Commands:
  create    Create new resource
  list      List all resources
  update    Update existing resource
  delete    Delete resource

Options:
  --help    Show this help
  --json    Output as JSON
  --verbose Enable verbose logging

Examples:
  tool create --name foo
  tool list --json
  tool update foo --name bar

For command-specific help:
  tool <command> --help
```

### 3. Idempotency

**Same Command = Same Result:**
```bash
# Create command is idempotent
$ tool create --name foo
Created: foo

$ tool create --name foo
Already exists: foo (no changes)

# Not an error - just confirmation
```

**Why Idempotency Matters:**
- Safe to retry on failure
- Scripts can be re-run
- No accidental duplicates
- Predictable behavior

### 4. Output Formats

**Human-Readable by Default:**
```bash
$ tool list
Resources:
  - foo (created: 2025-11-19)
  - bar (created: 2025-11-18)

Total: 2 resources
```

**JSON for Scripting:**
```bash
$ tool list --json
{
  "resources": [
    {"name": "foo", "created": "2025-11-19"},
    {"name": "bar", "created": "2025-11-18"}
  ],
  "total": 2
}
```

**Composable with Unix Tools:**
```bash
# Pipes to jq for filtering
$ tool list --json | jq '.resources[].name'
"foo"
"bar"

# Pipes to grep
$ tool list | grep foo
```

### 5. Progressive Disclosure

**Simple for Common Cases:**
```bash
# Simplest form
$ tool run my-task

# With common option
$ tool run my-task --verbose
```

**Advanced Options Available:**
```bash
# Full control when needed
$ tool run my-task \
  --config custom.json \
  --retries 5 \
  --timeout 30 \
  --output results.json \
  --verbose
```

### 6. Error Handling

**Clear, Actionable Error Messages:**
```bash
# Bad
$ tool run
Error: invalid input

# Good
$ tool run
Error: Missing required argument: <task-name>

Usage: tool run <task-name> [options]

Examples:
  tool run my-task
  tool run my-task --verbose

Run 'tool --help' for more information
```

**Exit Codes:**
```bash
0    Success
1    Generic error
2    Invalid arguments
3    File not found
4    Permission denied
# etc.
```

### 7. Input Validation

**Validate Early, Fail Fast:**
```typescript
// Validate all inputs before execution
function validateArgs(args: Args): ValidationResult {
  const errors: string[] = [];

  if (!args.taskName) {
    errors.push("Missing required argument: task-name");
  }

  if (args.timeout && args.timeout < 0) {
    errors.push("Timeout must be positive number");
  }

  if (args.config && !existsSync(args.config)) {
    errors.push(`Config file not found: ${args.config}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
```

---

**Related Documentation:**
- cli-first-guide.md - Overview and quick reference
- cli-first-patterns.md - The Three-Step Pattern
- cli-first-api.md - CLI-First for API Calls
- cli-first-prompting.md - Prompting Layer Responsibilities
