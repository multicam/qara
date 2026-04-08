# Test Runner Detection

Deterministic heuristic for detecting which test runner a project uses.

## Detection Order

1. If `pyproject.toml` exists AND has `[tool.pytest]` or `pytest` in dependencies → **pytest** (via `uv run pytest`)
2. If `vitest.config.ts` or `vitest.config.js` exists → **Vitest**
3. If `bunfig.toml` has `[test]` section → **Bun**
4. Check `package.json` `scripts.test` for hints → fall back to **Bun** (`bun test`)

## Commands by Runner

| Runner | Run tests | Run single file | Run with coverage |
|--------|-----------|-----------------|-------------------|
| **pytest** | `uv run pytest` | `uv run pytest tests/test_foo.py` | `uv run pytest --cov=src` |
| **Bun** | `bun test` | `bun test path/to/file.test.ts` | `bun test --coverage --coverage-reporter=lcov --coverage-dir=<dir>` |
| **Vitest** | `vitest run` | `vitest run path/to/file.test.ts` | `vitest run --coverage --coverage.reporter=lcov` |

## Test File Conventions

| Runner | Test file pattern | Test directory |
|--------|------------------|----------------|
| **pytest** | `test_*.py`, `*_test.py`, `conftest.py` | `tests/` |
| **Bun/Vitest** | `*.test.ts`, `*.spec.ts` | Co-located or `tests/` |

## Python-Specific Notes

- Always use `uv run pytest` (not bare `pytest`) to ensure correct venv
- Check `pyproject.toml` `[tool.pytest.ini_options]` for test configuration
- `conftest.py` files contain shared fixtures — treat as test infrastructure
