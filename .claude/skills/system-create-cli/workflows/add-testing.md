---
workflow: add-testing
purpose: Generate comprehensive test suite for an existing CLI
---

# Add Testing Workflow

Add a `bun:test` suite to an existing CLI covering commands, errors, exit codes, and help text.

## When to Use

- "add tests to [CLI]", "test scaffolding for [CLI]"
- Before Tier upgrade (lock current behavior)
- Before publishing (distribution quality gate)

## Steps

### 1. Read the CLI

```bash
ls -la ${PAI_DIR}/bin/[cli-name]/
cat ${PAI_DIR}/bin/[cli-name]/[cli-name].ts
```

Extract: commands (from switch or Commander config), flags/options, output format, error conditions, env vars.

### 2. Create Test File

Place next to source: `bin/[cli-name]/[cli-name].test.ts`

### 3. Test Harness

```typescript
import { describe, it, expect } from 'bun:test';
import { join } from 'path';

const CLI = join(import.meta.dir, '[cli-name].ts');

async function run(
  args: string[],
  env?: Record<string, string>,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, ...env },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}
```

### 4. Test Categories

**Help & version:**
```typescript
describe('help and version', () => {
  it('--help exits 0 and shows usage', async () => {
    const { stdout, exitCode } = await run(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('USAGE');
  });

  it('--version prints version string', async () => {
    const { stdout, exitCode } = await run(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('no args shows help', async () => {
    const { stdout, exitCode } = await run([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('USAGE');
  });
});
```

**Command output:**
```typescript
describe('[command-name]', () => {
  it('returns valid JSON', async () => {
    const { stdout, exitCode } = await run(['command', 'arg']);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toBeDefined();
  });

  it('respects --limit flag', async () => {
    const { stdout } = await run(['command', 'arg', '--limit', '5']);
    expect(JSON.parse(stdout).length).toBeLessThanOrEqual(5);
  });
});
```

**Errors:**
```typescript
describe('error handling', () => {
  it('unknown command exits 1', async () => {
    const { stderr, exitCode } = await run(['nonexistent']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Unknown');
  });

  it('missing required arg exits 1', async () => {
    const { exitCode } = await run(['command']);
    expect(exitCode).toBe(1);
  });

  it('missing API key exits 1 with hint', async () => {
    const { stderr, exitCode } = await run(['command', 'arg'], { API_KEY: '' });
    expect(exitCode).toBe(1);
    expect(stderr).toContain('.env');
  });
});
```

**Output format:**
```typescript
describe('output format', () => {
  it('outputs to stdout, errors to stderr', async () => {
    const { stdout, stderr, exitCode } = await run(['command', 'arg']);
    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stderr).toBe('');
  });

  it('JSON is pipe-friendly', async () => {
    const { stdout } = await run(['command', 'arg']);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });
});
```

### 5. API-Dependent Tests

Option A — skip when unconfigured:
```typescript
const HAS_API_KEY = !!process.env.API_KEY;

describe('API commands', () => {
  it.skipIf(!HAS_API_KEY)('fetches data', async () => {
    const { exitCode } = await run(['fetch', 'test']);
    expect(exitCode).toBe(0);
  });
});
```

Option B — test error path only (always runnable):
```typescript
it('reports auth error without API key', async () => {
  const { exitCode } = await run(['fetch', 'test'], { API_KEY: '' });
  expect(exitCode).toBe(1);
});
```

### 6. Run

```bash
bun test bin/[cli-name]/[cli-name].test.ts
```

## Checklist

- [ ] Test file next to source
- [ ] `run()` helper captures stdout, stderr, exitCode
- [ ] `--help` and `--version` tested
- [ ] Every command has a happy-path test
- [ ] Unknown command + missing arg + missing config tested
- [ ] JSON output parsed cleanly
- [ ] API-dependent tests use `skipIf` or error-path only

## Related

- `create-cli.md` — generate CLI (tests not included by default)
- `upgrade-tier.md` — run tests before/after migration
- `setup-distribution.md` — tests gate distribution
