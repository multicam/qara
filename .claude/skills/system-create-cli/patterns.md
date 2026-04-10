# CLI Patterns Reference

Reusable TypeScript CLI patterns. Sources: tsx, Vite, Turbo, Bun, pnpm, Shopify CLI, llcli.

---

## 1. Configuration Loading

```typescript
const DEFAULTS = {
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  limit: 20,
} as const;

function loadConfig(): Config {
  const envPath = join(homedir(), '.claude', '.env');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const apiKey = envContent
      .split('\n')
      .find(line => line.startsWith('API_KEY='))
      ?.split('=')[1]?.trim();

    if (!apiKey) {
      console.error('Error: API_KEY not found in ${PAI_DIR}/.env');
      process.exit(1);
    }
    return { apiKey, baseUrl: DEFAULTS.baseUrl };
  } catch {
    console.error('Error: Cannot read ${PAI_DIR}/.env');
    process.exit(1);
  }
}
```

---

## 2. API Client

```typescript
async function apiRequest<T>(
  config: Config, endpoint: string, params: Record<string, string> = {}
): Promise<T> {
  const url = `${config.baseUrl}/${endpoint}?${new URLSearchParams(params)}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.apiKey}` },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json() as T;
}
```

---

## 3. Error Handling

```typescript
class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly hint?: string,
    public readonly exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (error.hint) console.error(`Hint: ${error.hint}`);
    process.exit(error.exitCode);
  }
  console.error('Fatal:', error instanceof Error ? error.message : error);
  process.exit(1);
}
```

---

## 4. Main Entry & Routing

```typescript
async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help') { showHelp(); return; }
  if (args[0] === '--version') { console.log(`${CLI_NAME} v${VERSION}`); return; }

  switch (args[0]) {
    case 'command1': await command1(args[1]); break;
    case 'command2': await command2(args.slice(1)); break;
    default:
      throw new CLIError(`Unknown: ${args[0]}`, 'ERR_UNKNOWN_CMD', `Run "${CLI_NAME} --help"`);
  }
}

main().catch(handleError);
```

---

## 5. Help Text

```typescript
function showHelp(): void {
  console.log(`
${CLI_NAME} - ${DESCRIPTION}

USAGE:  ${CLI_NAME} <command> [options]

COMMANDS:
  command1 <arg>        Description
  help, --help          Show this help

OPTIONS:
  --limit <n>           Max results (default: 20)

EXAMPLES:
  $ ${CLI_NAME} command1 value
  $ ${CLI_NAME} command1 value | jq '.data[]'

OUTPUT: JSON to stdout, errors to stderr. Exit 0=success, 1=error.
`);
}
```

---

## 6. Modern TypeScript Patterns

```typescript
// satisfies for exhaustive switches
type LogLevel = 'info' | 'warn' | 'error';
function handle(level: LogLevel) {
  switch (level) {
    case 'info': break;
    case 'warn': break;
    case 'error': break;
    default: level satisfies never;
  }
}

// Template literal types
type ViteScope = `vite:${string}`;
function createDebugger(ns: ViteScope) { /* ... */ }

// Const type parameters (TS 5.0) — infers literals, not widened types
function defineFlags<const T extends Record<string, string | boolean>>(flags: T): T {
  return flags;
}
```

---

## 7. Result Type (Shopify pattern)

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

async function loadConfig(): Promise<Result<Config, string>> {
  try {
    return ok(JSON.parse(await readFile('config.json', 'utf-8')));
  } catch { return err('Failed to load config'); }
}
```

---

## 8. Signal Handling

```typescript
const relaySignal = (signal: NodeJS.Signals) => {
  childProcess.kill(signal);
  setTimeout(() => childProcess.kill('SIGKILL'), 5000); // grace period
};
process.on('SIGINT', relaySignal);
process.on('SIGTERM', relaySignal);

childProcess.on('close', (code, signal) => {
  process.exit(code ?? (signal ? 128 + os.constants.signals[signal] : 1));
});
```

---

## 9. Zod Config Validation

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  root: z.string().default('.'),
  mode: z.enum(['dev', 'prod']).default('dev'),
  targets: z.array(z.string()).nonempty(),
}).transform(cfg => ({ ...cfg, root: path.resolve(cfg.root), isProd: cfg.mode === 'prod' }));

type Config = z.infer<typeof ConfigSchema>;
```

---

## 10. File I/O with Typed Errors

```typescript
async function readJsonFile<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new CLIError(
      code === 'ENOENT' ? `Not found: ${path}` : `Cannot read: ${path}`,
      code === 'ENOENT' ? 'ERR_NOT_FOUND' : 'ERR_READ'
    );
  }
}
```

---

## Checklist

- **Type safety:** strict mode, no `any`, discriminated unions, `as const satisfies`
- **Errors:** `CLIError` with code+hint, exit codes (0=ok, 1=error, 2=bug), top-level catch, signals
- **Async:** top-level await or `void main().catch()`, `Promise.allSettled` for best-effort, cleanup in finally
- **Output:** JSON to stdout, errors to stderr, deterministic, pipeable to jq/grep
