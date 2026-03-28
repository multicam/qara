# Test Runner Detection

Deterministic heuristic for detecting which test runner a project uses.

## Detection Order

1. If `vitest.config.ts` or `vitest.config.js` exists → **Vitest**
2. If `bunfig.toml` has `[test]` section → **Bun**
3. Check `package.json` `scripts.test` for hints → fall back to **Bun** (`bun test`)

## Commands by Runner

| Runner | Run tests | Run with JUnit | Run with coverage |
|--------|-----------|----------------|-------------------|
| **Bun** | `bun test` | `bun test --reporter=junit --reporter-outfile=<path>` | `bun test --coverage --coverage-reporter=lcov --coverage-dir=<dir>` |
| **Vitest** | `vitest run` | `vitest run --reporter=junit --outputFile=<path>` | `vitest run --coverage --coverage.reporter=lcov` |
