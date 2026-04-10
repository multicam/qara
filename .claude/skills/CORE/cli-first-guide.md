# CLI-First Implementation Guide

Patterns for building deterministic CLI tools that AI orchestrates.

**Read when**: building a new CLI tool, refactoring prompt logic into code, integrating an external API.

## Core Principle

> If the same logic shows up in prompts multiple times, it should be a CLI tool.

Deterministic code first. Prompts wrap code, not the other way around.

## When to Build a CLI

Build a CLI if ≥2 of:
- Runs more than 5 times
- Needs consistent results
- Others will use it
- Needs tests
- Manages non-trivial state

Otherwise: inline is fine.

## Three-Step Pattern

1. **Requirements** — document inputs, outputs, edge cases, error conditions, dependencies.
2. **Deterministic CLI** — build the tool. Testable, documented, idempotent.
3. **Prompting wrapper** — AI interprets intent, calls the CLI, handles results.

**Never skip step 2.** Ad-hoc bash in prompts is the failure mode.

## CLI Must-Haves

- Clear command structure (verb + noun hierarchy)
- Full `--help` (usage, options, examples, exit codes)
- Input validation (fail fast, clear errors to stderr)
- Exit codes: 0 success, 1 generic error, 2 invalid args, 3+ specific
- Human output by default, `--json` for scripting
- TypeScript with typed arg parsing
- `#!/usr/bin/env bun` shebang + `chmod +x`
- Located under `~/.claude/bin/{toolname}/` (or skill `tools/`)
- `README.md` with examples
- Composable (pipes to `jq`, `grep`, etc.)
- Independently testable (no AI dependency)

## Design Rules

### 1. Command Structure

Hierarchical, explicit verbs:
```bash
evals use-case create --name foo
blog post publish --file ./posts/my-post.md
tool command subcommand --flag value
```

Avoid generic verbs like `run` or `process` — prefer `publish`, `analyze`, `deploy`.

### 2. Idempotency

Same command = same result.
```bash
$ tool create --name foo
Created: foo
$ tool create --name foo
Already exists: foo (no changes)   # not an error, confirmation
```

Idempotent commands are safe to retry, scriptable, predictable.

### 3. Output Formats

- Human-readable default (prose + list form, no JSON noise)
- `--json` for scripting (stable schema)
- Everything composable: `tool list --json | jq '.items[].name'`

### 4. Progressive Disclosure

Simple common case, advanced options when needed:
```bash
$ tool run my-task                          # simplest
$ tool run my-task --verbose                # common option
$ tool run my-task --config custom.json \   # full control
  --retries 5 --timeout 30 --output results.json
```

### 5. Error Handling

Clear, actionable, self-repairing:
```
Error: Missing required argument: <task-name>
Usage: tool run <task-name> [options]
Examples:
  tool run my-task
Run 'tool --help' for more information
```

Never `Error: invalid input`. The user (or AI reader) needs to know what's wrong AND what to do.

### 6. Input Validation

Validate early, fail fast, report ALL errors at once:
```typescript
function validateArgs(args: Args): ValidationResult {
  const errors: string[] = [];
  if (!args.taskName) errors.push("Missing required argument: task-name");
  if (args.timeout && args.timeout < 0) errors.push("Timeout must be positive");
  if (args.config && !existsSync(args.config)) errors.push(`Config not found: ${args.config}`);
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
```

## Skeleton (Reference)

```typescript
#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync } from "fs";

function showHelp() {
  console.log(`Usage: tool <command> [options]
Commands:
  fetch      Fetch data
Options:
  --date <d>     YYYY-MM-DD
  --json         JSON output
  --help         Show this help
Exit: 0 success, 1 error`);
}

const args = parseArgs({
  options: { date: { type: "string" }, json: { type: "boolean" }, help: { type: "boolean" } },
  allowPositionals: true,
});

if (args.values.help) { showHelp(); process.exit(0); }
const cmd = args.positionals[0];
if (!cmd) { console.error("Error: missing command"); showHelp(); process.exit(1); }

// Validate, execute, catch errors → stderr + exit(1).
```

## CLI-First for API Calls (CRITICAL)

**Never write API calls directly in prompts or ad-hoc bash scripts.**

Wrong: embedded `curl` with API key interpolation inside a skill prompt. No validation, no error handling, no `--help`, not testable, not composable, code in prompts.

Right: a CLI tool in `~/.claude/bin/{tool}/` that:
- Reads API keys from env (`~/.claude/.env`)
- Validates every input (date format, required fields)
- Builds the URL with `URLSearchParams`
- Handles non-2xx with clear errors
- Outputs JSON to stdout for composition
- Has full `--help`

Any skill that needs the API calls the CLI. Never duplicates the logic.

## Prompting Layer — What It Does

- **Understand intent.** "publish my latest blog post" → identify target file + action.
- **Map intent to CLI.** `publish blog` → `blog-publish`.
- **Execute in correct order.** Wait for result, chain next command.
- **Handle errors.** Parse error message, explain, suggest retry.
- **Summarize results.** Live URL, verification status, timing.
- **Ask clarifying questions** when ambiguous (multiple drafts, unclear env).

## Prompting Layer — What It Does NOT

- **Never replicate CLI functionality.** Don't re-implement in ad-hoc bash.
- **Never generate ad-hoc API calls.** Use the existing CLI tool.
- **Never bypass the CLI for "simple" operations.** File moves, config updates, etc. go through tools.
- **Never duplicate logic across skills.** If two skills need the same thing, it's a CLI.

## Takeaways

1. Build tools that work without AI, then add AI for convenience.
2. Code is cheaper than prompts (write once, run forever).
3. Determinism = reliability. Same input → same output.
4. `--help` makes tools self-documenting for both AI and humans.
5. Compose with Unix tools (pipes, filters, jq, grep).
6. Version-controlled behavior (code changes are explicit).

## Related

- `CONSTITUTION.md` — CLI-First as a core operating principle
- `stack-preferences.md` — TypeScript > Python, Bun > npm
- `testing-guide.md` — how to test CLI tools
