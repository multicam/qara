---
name: tokens
context: same
description: |
  Design tokens and design-system extraction. Thin alias for /impeccable extract.
  USE WHEN: "design tokens", "design system", "hardcoded colors", "extract palette".
version: 1.0.0
user-invocable: true
argument-hint: "[target]"
---

Thin alias skill. All substantive work lives in `/impeccable extract`. This skill exists for phrase routing — "tokens" and "design system" are phrase-distant from the word "extract."

## Workflow Routing (SYSTEM PROMPT)

Single action: delegate to `/impeccable extract`.

When invoked, do this:

1. Invoke `/impeccable` to load Context Gathering Protocol + design doctrine.
2. Run the full `extract` mode procedure from `impeccable/reference/extract.md` (6 steps: discover → identify patterns → plan → extract & enrich → migrate → document).
3. Do NOT restate extract.md content here. The procedure is canonical there.

## Why this alias exists vs. calling `/impeccable extract` directly

Either works. The alias surfaces the workflow under phrases that wouldn't trigger `/impeccable extract` directly:
- "extract the design tokens from this codebase"
- "build a design system"
- "these colors are hardcoded everywhere"
- "find repeated patterns"
- "theme variables"

If you already know to use `/impeccable extract`, call it directly. If the user's phrasing is token/system-focused, this alias routes you there.

## Hand-off

After extract completes:
- `/polish` — ensure the design system is applied consistently
- `/audit` — technical check on token coverage and hardcoded-value leakage

Doctrine source of truth: `impeccable/reference/extract.md`.
