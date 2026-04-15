# Workflow: Create a Claude Agent SDK CLI

Scaffold a CLI that uses `@anthropic-ai/claude-agent-sdk` to orchestrate Claude. Follow these steps in order.

---

## Step 1: Confirm tier

Ask: does the CLI need subcommands (Commander, Tier 2) or is it a single-purpose wrapper (Tier 1)?

- Single focus (summarize, review, generate) → Tier 1, continue here.
- Multiple commands with grouping → scaffold Tier 2 first (`workflows/create-cli.md`), then integrate SDK.

---

## Step 2: Create project directory

```bash
mkdir -p "${PAI_DIR}/bin/<name>"
cd "${PAI_DIR}/bin/<name>"
```

Replace `<name>` with a kebab-case name (`url-summarizer`, `pr-reviewer`).

---

## Step 3: Initialize and install SDK

```bash
bun init -y
bun add @anthropic-ai/claude-agent-sdk
```

---

## Step 4: Draft `cli.ts` from Section A pattern

Copy the minimal example from `references/ai-cli-patterns.md` Section A.

Set these constants at the top:

```typescript
const CLI_NAME = "<name>";
const VERSION = "1.0.0";
const DEFAULT_MODEL = "claude-sonnet-4-6";
```

---

## Step 5: Add standard flags

Extend `main()` to handle these before the SDK call:

```typescript
const args = process.argv.slice(2);
if (!args.length || args[0] === "--help") { showHelp(); process.exit(0); }
if (args[0] === "--version") { console.log(`${CLI_NAME} v${VERSION}`); process.exit(0); }
const model = args.includes("--model") ? args[args.indexOf("--model") + 1] : DEFAULT_MODEL;
```

---

## Step 6: Add cost controls

```typescript
const maxTurns = args.includes("--max-turns")
  ? parseInt(args[args.indexOf("--max-turns") + 1], 10)
  : 10;
const dryRun = args.includes("--dry-run");

if (dryRun) {
  console.log(JSON.stringify({ prompt, model, maxTurns, dryRun: true }));
  process.exit(0);
}
```

Pass `maxTurns` to `query()` options when SDK supports it.

---

## Step 7: Gemma 4 local fallback

For cost-sensitive or offline use, route to Ollama when `--local` is set:

```typescript
import { chat } from "${PAI_DIR}/hooks/lib/ollama-client.ts";

if (args.includes("--local")) {
  const reply = await chat("gemma4:latest", prompt);
  process.stdout.write(reply + "\n");
  process.exit(0);
}
// else: Claude SDK path
```

---

## Step 8: Error handling

Wrap the SDK call in `CLIError` per `patterns.md` Pattern 3:

```typescript
try {
  for await (const msg of query({ prompt, options: { model } })) {
    if (msg.type === "text") process.stdout.write(msg.text);
  }
} catch (e) {
  throw new CLIError(
    e instanceof Error ? e.message : "SDK error",
    "ERR_SDK",
    "Check your ANTHROPIC_API_KEY in ${PAI_DIR}/.env"
  );
}
```

---

## Step 9: Add direct-run guard

Per `patterns.md` Pattern 11 — at the bottom of the file:

```typescript
const isDirectRun = import.meta.path === Bun.main
  || process.argv[1]?.endsWith("<name>.ts");

if (isDirectRun) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

---

## Step 10: Verify

```bash
bun run cli.ts --help      # exit 0, prints usage
bun run cli.ts --version   # exit 0, prints version
bun run cli.ts --dry-run "hello"  # exit 0, prints JSON preview
bun run cli.ts badarg      # exits 1 on invalid usage
```

Generate README and QUICKSTART per the main workflow (`create-cli.md` Steps 8-10).
