# Qara Project Configuration

## Planning (3 tiers — system suggests, you don't need to memorize)

| Complexity | Approach | When |
|-----------|----------|------|
| Simple | Direct execution | Single-file change, clear task |
| Medium | Plan mode → `cruise: implement {plan-path}` | Multi-file, clear scope |
| Complex | `/create_plan` → `cruise:` / `drive:` / `turbo:` | Multi-phase, unclear scope, needs research |

After plan approval: activate an execution mode (`cruise:` for phased, `drive:` for PRD-driven, `turbo:` for parallel). Modes provide phase tracking, TDD enforcement, and verification gates. Do NOT implement ad-hoc. See `.claude/context/execution-modes-quality.md` for mode selection.

## Delegation

When you identify 3+ independent subtasks, spawn Agent tools in parallel. Delegation should scale with session complexity.

## Guides

Guides load just-in-time via CORE's Documentation Index — not included here to save context tokens.
