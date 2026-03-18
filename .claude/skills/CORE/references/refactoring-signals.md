# Refactoring Signals

When to refactor, what to look for, and when to stop. Use after tests are green — never refactor while RED.

## Candidates

| Signal | What It Looks Like | Action |
|--------|-------------------|--------|
| **Duplication** | Same logic in 2+ places | Extract function or module |
| **Long methods** | Method doing too many things | Break into private helpers (keep tests on public interface) |
| **Shallow modules** | Many methods, thin implementation | Combine into deeper modules |
| **Feature envy** | Logic that mostly uses another module's data | Move logic to where the data lives |
| **Primitive obsession** | Raw strings/numbers carrying domain meaning | Introduce value objects |
| **Revealed problems** | New code exposes existing code as problematic | Address while the context is fresh |

## Rules

- **Never refactor while RED.** Get to GREEN first — tests are your safety net.
- **Run tests after each refactor step.** Small moves, verified continuously.
- **Refactoring is a phase, not concurrent with implementation.** Write code to pass the test, then clean up.
- **New code reveals old problems.** The best time to fix surrounding code is right after you've understood it deeply enough to add to it.

## Attribution

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills).
