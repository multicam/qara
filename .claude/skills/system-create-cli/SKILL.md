---
name: system-create-cli
context: fork
description: Generate production-quality TypeScript CLIs with full documentation, error handling, and best practices. Creates deterministic, type-safe command-line tools following PAI's CLI-First Architecture. USE WHEN user says "create a CLI", "build a command-line tool", "make a CLI for X", or requests CLI generation. (user)
---

# system-create-cli

Generate production-ready TypeScript CLIs (Bun + strict TS) following the llcli pattern.

## Workflow Routing

| Trigger | Workflow |
|---|---|
| "create CLI", "build command-line tool", "make CLI for X", "generate CLI" | `workflows/create-cli.md` |
| "add command to CLI", "extend CLI with" | `workflows/add-command.md` |
| "upgrade CLI", "migrate to Commander" | `workflows/upgrade-tier.md` |
| "add tests to CLI", "test scaffolding" | `workflows/add-testing.md` |
| "publish CLI", "distribute CLI", "standalone binary" | `workflows/setup-distribution.md` |

Also activate on context clues: user describes repetitive API calls, complex bash scripts, or missing official CLIs.

## Three-Tier Template System

**Tier 1 — llcli-style (DEFAULT, ~80%)**
- Manual `process.argv` parsing, zero deps, ~300-400 lines
- Use for: 2-10 commands, simple flags, JSON output, no subcommands

**Tier 2 — Commander.js (escalation, ~15%)**
- Framework parsing, subcommands, auto-help
- Use for: 10+ commands needing grouping, complex nested options, plugin architecture

**Tier 3 — oclif (reference only, ~5%)**
- Enterprise scale (Heroku, Salesforce CLI level). Documentation only, no templates.

See `references/tier-comparison.md` for detailed comparison and migration paths.

## What Every Generated CLI Includes

- TypeScript source (strict mode, full type safety)
- All commands functional with error handling + exit codes
- Generated docs: readme (philosophy/usage/examples), quickstart, `--help` text
- `package.json` (Bun), `tsconfig.json` (strict), `.env.example`
- Deterministic JSON output, composable with `jq`/`grep`
- `chmod +x` on entry file

## Qara Integration

**Stack:** Bun runtime, TypeScript, Bun package manager, `bun test`, JSON output.

**Repository placement:**
- `${PAI_DIR}/bin/[cli-name]/` — personal CLIs (llcli-style)
- `~/Projects/[project-name]/` — project-specific
- `~/Projects/PAI/examples/clis/` — public examples

**SAFETY:** Verify repo location before git ops. Never publish private repos to npm.

## Extended Context

- `workflows/create-cli.md` — main 10-step generation workflow
- `workflows/add-command.md` — extend existing CLI
- `workflows/upgrade-tier.md` — Tier 1 → 2 migration
- `workflows/add-testing.md` — `bun:test` suite generation
- `workflows/setup-distribution.md` — publish / binary / symlink
- `references/tier-comparison.md` — detailed tier comparison + decision algorithm
- `references/cli-examples-basic.md` + `cli-examples-advanced.md` — 6 worked examples, patterns, testing, docs templates
- `patterns.md` — reusable TypeScript CLI patterns (config, error handling, signals, Zod)

## Quality Gates

Every generated CLI must pass:

1. **Compile:** zero TS errors, strict mode, no unjustified `any`
2. **Functional:** all commands work, exit codes correct (0 success, 1 error)
3. **Docs:** README, QUICKSTART, `--help` text, all flags documented
4. **Code:** type-safe, actionable error messages, externalized config
5. **Integration:** Bun + TS, deterministic JSON, composable

## Design Principles

1. Start simple (Tier 1)
2. Escalate only when justified
3. Ship production-ready, not scaffolds
4. Document the *why*, not just the *how*
5. Strict TypeScript, always
