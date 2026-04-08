# Workflow: Mutation Check

Advisory mutation testing via StrykerJS. Reports mutation score but does NOT block merges.

**All nodes: DETERMINISTIC** — no LLM reasoning, just tool execution.

## Prerequisites

- Project has unit tests that pass
- Node.js available (StrykerJS runs via npx)

## Steps

### 1. Check StrykerJS Installation [DETERMINISTIC]

If `node_modules/.bin/stryker` exists → proceed.
Else → inform JM:

```
StrykerJS not installed. Run:
  bun add -d @stryker-mutator/core @stryker-mutator/typescript-checker
```

### 2. Initialize Config [DETERMINISTIC]

If `stryker.config.json` doesn't exist, create minimal config:

```json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker/master/packages/core/schema/stryker-core.json",
  "testRunner": "command",
  "commandRunner": { "command": "bun test" },
  "checkers": ["typescript"],
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
  "reporters": ["clear-text", "json"],
  "tempDirName": ".stryker-tmp"
}
```

Adjust `mutate` globs to match the project's source directory if not `src/`.

### 3. Run Mutation Testing [DETERMINISTIC]

```bash
npx stryker run --reporters clear-text,json
```

### 4. Report [DETERMINISTIC]

Parse StrykerJS output and report:

```
Mutation check complete:
  Mutants: {total} generated
  Killed: {n} ({pct}%)
  Survived: {n} ({pct}%)
  Timeout: {n}
  No coverage: {n}
  Mutation score: {score}%

  Advisory threshold: 70%
  Status: {ABOVE|BELOW} threshold (advisory only, does not block)
```

If score < 70%, list the top 5 surviving mutants with file:line references.

### 5. Targeted Mode [DETERMINISTIC] (optional)

When called with specific files:

```bash
npx stryker run --mutate "src/auth.ts"
```

Useful for checking mutation score on recently changed files only.

## Blueprint Summary

| Step | Node Type |
|------|-----------|
| Check installation | Deterministic |
| Init config | Deterministic |
| Run mutation | Deterministic |
| Report | Deterministic |

## Integration with TDD Cycle

This workflow can be invoked standalone OR as part of `tdd-cycle.md` step 8.5 (Mutation Bonus Round). When integrated into the TDD cycle, it runs automatically after all planned scenarios complete, targeting only files touched during that cycle. Surviving mutants become bonus RED→GREEN scenarios.

## When to Use

- After completing a tdd-cycle (check test effectiveness) — or automatically via step 8.5
- Before releasing (confidence in test quality)
- When coverage is high but you suspect weak assertions
- As optional top layer of the test pyramid
