# Cross-Project Configuration

Portable templates for bootstrapping test infrastructure in any project.
Used by the `init-project` workflow. Each project owns its copy — no shared packages.

## TypeScript Projects

### bunfig.toml

```toml
[test]
coveragePathIgnorePatterns = ["node_modules/", "purgatory/", "tests/e2e/"]
```

### tsconfig.json Additions

```json
{
  "compilerOptions": {
    "strict": true,
    "types": ["bun-types"]
  }
}
```

## Python Projects

### pyproject.toml Additions

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
target-version = "py310"
line-length = 100

[tool.ruff.lint]
extend-select = ["I", "W"]
```

### Commands

```bash
uv sync              # Install deps
uv run pytest        # Run all tests
uv run pytest -x     # Stop on first failure
uv run pytest --cov=src  # With coverage
```

## .gitignore Additions

```
# tdd-qa baselines (machine-local, not committed)
.test-baseline.xml
.test-current.xml
.coverage-baseline/
.coverage-current/

# TypeScript E2E drafts (review before committing)
tests/e2e/*.draft.spec.ts

# Python
__pycache__/
.pytest_cache/
htmlcov/
.coverage
```

## Directory Structure

### TypeScript

```
project-root/
├── specs/                     # Scenario definitions (Given/When/Then)
├── tests/
│   └── e2e/                   # Playwright E2E tests (if UI project)
├── bunfig.toml                # Test runner config
└── .test-baseline.xml         # JUnit XML baseline (gitignored)
```

### Python

```
project-root/
├── specs/                     # Scenario definitions (Given/When/Then)
├── src/package/               # Source code
├── tests/
│   ├── conftest.py            # Shared fixtures
│   ├── test_module.py         # Unit/integration tests
│   └── ...
├── pyproject.toml             # Project config + test runner config
└── .test-baseline.xml         # JUnit XML baseline (gitignored)
```

## File Naming Conventions

| Pattern | Language | Layer | Location |
|---------|----------|-------|----------|
| `*.test.ts` | TypeScript | Unit | Co-located with source |
| `*.integration.test.ts` | TypeScript | Integration | Co-located with source |
| `*.spec.ts` | TypeScript | E2E (frozen) | `tests/e2e/` |
| `test_*.py` | Python | Unit/Integration | `tests/` |
| `conftest.py` | Python | Fixtures | `tests/` |

## Standards That Travel

These are conventions, not config — they work regardless of project setup:

- **AAA pattern** for all tests (Arrange/Act/Assert)
- **Mock at boundaries only** (see CORE/references/mocking-guidelines.md)
- **Test behavior, not implementation** (see CORE/testing-guide.md)
- **80%+ unit coverage** target (Qara targets 90%)
- **3-5 E2E scenarios max** per app
- **Priority levels** on all scenarios (critical/important/nice-to-have)
