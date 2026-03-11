---
workflow: add-testing
purpose: Generate comprehensive test suite for an existing CLI
---

# Add Testing Workflow

**Add a production-quality test suite to an existing CLI using bun:test.**

---

## 🎯 PURPOSE

Generate tests that verify command output, error handling, exit codes, and help text for an existing CLI — regardless of tier.

---

## 📍 WHEN TO USE

- User requests: "add tests to [CLI]", "test scaffolding for [CLI]"
- CLI exists and works but has no tests
- Before a Tier upgrade (lock in current behavior)
- Before publishing (distribution quality gate)

---

## 📋 STEPS

### 1. Read the CLI

Locate the CLI and understand its structure:

```bash
# Find the CLI
ls -la ${PAI_DIR}/bin/[cli-name]/
cat ${PAI_DIR}/bin/[cli-name]/[cli-name].ts
```

Extract:
- All commands (from switch statement or Commander config)
- All flags/options per command
- Expected output format (JSON, plain text)
- Error conditions and exit codes
- Environment variables needed

### 2. Create Test File

Place tests next to the CLI source:

```
bin/[cli-name]/
├── [cli-name].ts
├── [cli-name].test.ts    ← create this
├── package.json
└── README.md
```

### 3. Generate Test Structure

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { join } from 'path';

const CLI = join(import.meta.dir, '[cli-name].ts');

// Helper: run CLI command and capture output
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

### 4. Write Tests by Category

#### Help & Version

```typescript
describe('help and version', () => {
  it('--help exits 0 and shows usage', async () => {
    const { stdout, exitCode } = await run(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('USAGE');
    expect(stdout).toContain('COMMANDS');
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

#### Command Output

```typescript
describe('[command-name]', () => {
  it('returns valid JSON', async () => {
    const { stdout, exitCode } = await run(['command', 'arg']);
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);
    expect(data).toBeDefined();
  });

  it('respects --limit flag', async () => {
    const { stdout } = await run(['command', 'arg', '--limit', '5']);
    const data = JSON.parse(stdout);
    expect(data.length).toBeLessThanOrEqual(5);
  });
});
```

#### Error Handling

```typescript
describe('error handling', () => {
  it('unknown command exits 1', async () => {
    const { stderr, exitCode } = await run(['nonexistent']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Unknown');
  });

  it('missing required arg exits 1', async () => {
    const { stderr, exitCode } = await run(['command']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('required');
  });

  it('missing API key exits 1 with hint', async () => {
    const { stderr, exitCode } = await run(['command', 'arg'], {
      API_KEY: '',  // override
    });
    expect(exitCode).toBe(1);
    expect(stderr).toContain('.env');
  });
});
```

#### Output Format

```typescript
describe('output format', () => {
  it('outputs to stdout, errors to stderr', async () => {
    const { stdout, stderr, exitCode } = await run(['command', 'arg']);
    expect(exitCode).toBe(0);
    // stdout has data
    expect(stdout.length).toBeGreaterThan(0);
    // stderr is clean (no debug noise)
    expect(stderr).toBe('');
  });

  it('JSON is pipe-friendly (no trailing garbage)', async () => {
    const { stdout } = await run(['command', 'arg']);
    // Should parse cleanly — no ANSI codes or extra output
    expect(() => JSON.parse(stdout)).not.toThrow();
  });
});
```

### 5. Handle API-dependent Tests

For CLIs that call external APIs, use one of these strategies:

**Option A: Skip if no API key (pragmatic)**
```typescript
const HAS_API_KEY = !!process.env.API_KEY;

describe('API commands', () => {
  it.skipIf(!HAS_API_KEY)('fetches data', async () => {
    const { stdout, exitCode } = await run(['fetch', 'test']);
    expect(exitCode).toBe(0);
  });
});
```

**Option B: Test error path only (always runnable)**
```typescript
it('reports auth error without API key', async () => {
  const { stderr, exitCode } = await run(['fetch', 'test'], { API_KEY: '' });
  expect(exitCode).toBe(1);
});
```

### 6. Run & Verify

```bash
bun test bin/[cli-name]/[cli-name].test.ts
```

### 7. Report

```
✅ Test suite added: bin/[cli-name]/[cli-name].test.ts

Tests: X passing
Coverage: help, version, commands, errors, output format

Run: bun test bin/[cli-name]/[cli-name].test.ts
```

---

## ✅ QUALITY CHECKLIST

- [ ] Test file created next to CLI source
- [ ] `run()` helper captures stdout, stderr, exitCode
- [ ] `--help` and `--version` tested
- [ ] Every command has at least one happy-path test
- [ ] Unknown command error tested
- [ ] Missing argument error tested
- [ ] Missing config/API key error tested
- [ ] JSON output parsed (no garbage in stdout)
- [ ] All tests pass with `bun test`
- [ ] API-dependent tests use `skipIf` or test error path only

---

## Related Workflows

- **create-cli.md** — Generate new CLI (doesn't include tests by default)
- **upgrade-tier.md** — Run tests before and after tier migration
- **setup-distribution.md** — Tests are a quality gate before publishing
