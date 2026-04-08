# Testing Guide

**PAI testing stack, TDD methodology, and design philosophy.**

---

## PAI Testing Stack

| Type | Tool | Command |
|------|------|---------|
| Unit/Integration | Bun test (Vitest-compatible) | `bun test` |
| E2E | Playwright | `bun playwright test` |
| Coverage | Bun built-in | `bun test --coverage` |

---

## Key Commands

```bash
# Unit tests
bun test                    # Run all
bun test --watch            # Watch mode
bun test path/to/file.test.ts  # Specific file

# E2E tests
bun playwright test         # Run all
bun playwright test --ui    # Interactive
bunx playwright show-report # View report
```

---

## File Naming

```
src/
├── utils.ts
├── utils.test.ts          # Co-located unit tests
tests/
├── e2e/
│   └── auth.spec.ts       # E2E tests use .spec.ts
```

---

## Test Structure (AAA Pattern)

```typescript
import { describe, it, expect } from 'bun:test';

describe('feature', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

---

## TDD Methodology

**Core principle:** Tests verify behavior through public interfaces, not implementation. Good tests survive refactors. Bad tests break when internals change but behavior doesn't.

**Vertical slices, not horizontal:** One test at a time. RED→GREEN→REFACTOR per scenario. Never write all tests first then all implementation.

For the full TDD workflow (activation, phase enforcement, mutation testing, escalation): invoke the `tdd-qa` skill or **READ** `tdd-qa/workflows/tdd-cycle.md`.

---

## Coverage Goals

- Unit: 90%+ (enforced via bunfig.toml)
- Integration: Cover critical paths
- E2E: Critical user journeys only (not 100%)

---

## PAI-Specific Rules

1. **Use `bun test`** — NOT jest, vitest CLI, or npm test
2. **TypeScript required** — All tests in `.test.ts` or `.spec.ts`
3. **CLI tools MUST have tests** — Per CLI-First architecture
4. **No skipped tests in commits** — Remove or fix `.skip()`

---

## Design Philosophy References

These shared references apply to testing, architecture, and code review:

- See `references/deep-modules.md` — small interface + deep implementation
- See `references/mocking-guidelines.md` — mock at boundaries only, dependency classification
- See `references/interface-design.md` — DI, functional returns, minimal surface area
- See `references/refactoring-signals.md` — when and what to refactor

## Attribution

TDD methodology and design philosophy adapted from [mattpocock/skills](https://github.com/mattpocock/skills).
