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

### Philosophy

**Core principle:** Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They read like specifications — "user can checkout with valid cart" tells you exactly what capability exists. They survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation: they mock internal collaborators, test private methods, or verify through external means. Warning sign: test breaks when you refactor, but behavior hasn't changed.

```typescript
// GOOD: Tests observable behavior through the interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});

// BAD: Bypasses interface, tests implementation
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});
```

### Vertical Slices, Not Horizontal

**DO NOT write all tests first, then all implementation.** That's horizontal slicing — it produces tests that verify imagined behavior, not actual behavior.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical — tracer bullets):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

Each cycle responds to what you learned from the previous one.

### TDD Workflow

1. **Plan** — Confirm interface shape and which behaviors to test. Design for depth (see references below). You can't test everything — prioritize critical paths.
2. **Tracer bullet** — ONE test proving ONE thing end-to-end. RED → GREEN.
3. **Incremental loop** — One test at a time. Only enough code to pass. Don't anticipate future tests.
4. **Refactor** — After all tests GREEN. Never refactor while RED.

### Checklist Per Cycle

- [ ] Test describes behavior, not implementation
- [ ] Test uses public interface only
- [ ] Test would survive internal refactor
- [ ] Code is minimal for this test
- [ ] No speculative features added

---

## Coverage Goals

- Unit: 80%+
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
