# Cross-Project Configuration

Portable templates for bootstrapping test infrastructure in any project.
Used by the `init-project` workflow. Each project owns its copy — no shared packages.

## bunfig.toml

```toml
[test]
coveragePathIgnorePatterns = ["node_modules/", "purgatory/", "tests/e2e/"]
```

Add project-specific exclusions as needed (e.g., `"generated/"`, `"dist/"`).

## tsconfig.json Additions

Ensure strict mode for better static analysis:

```json
{
  "compilerOptions": {
    "strict": true,
    "types": ["bun-types"]
  }
}
```

## .gitignore Additions

```
# tdd-qa baselines (machine-local, not committed)
.test-baseline.xml
.test-current.xml
.coverage-baseline/
.coverage-current/

# E2E drafts (review before committing)
tests/e2e/*.draft.spec.ts
```

## Directory Structure

```
project-root/
├── specs/                     # Scenario definitions (Given/When/Then)
│   └── README.md              # Format reference
├── tests/
│   └── e2e/                   # Playwright E2E tests (if UI project)
│       ├── *.draft.spec.ts    # Auto-drafted, gitignored until frozen
│       └── *.spec.ts          # Frozen, CI-runnable
├── bunfig.toml                # Test runner config
├── .test-baseline.xml         # JUnit XML baseline (gitignored)
└── .coverage-baseline/        # lcov baseline (gitignored)
```

## File Naming Conventions

| Pattern | Layer | Location |
|---------|-------|----------|
| `*.test.ts` | Unit | Co-located with source |
| `*.integration.test.ts` | Integration | Co-located with source |
| `*.spec.ts` | E2E (frozen) | `tests/e2e/` |
| `*.draft.spec.ts` | E2E (auto-drafted) | `tests/e2e/` (gitignored) |

## Standards That Travel

These are conventions, not config — they work regardless of project setup:

- **AAA pattern** for all tests (Arrange/Act/Assert)
- **Mock at boundaries only** (see CORE/references/mocking-guidelines.md)
- **Test behavior, not implementation** (see CORE/testing-guide.md)
- **80%+ unit coverage** target
- **3-5 E2E scenarios max** per app
- **Priority levels** on all scenarios (critical/important/nice-to-have)
