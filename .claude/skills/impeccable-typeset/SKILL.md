---
name: impeccable-typeset
context: same
description: Typography repair — fix font choices, hierarchy, sizing, weight, and readability so text feels intentional. Use when the user mentions fonts, type, typography, text hierarchy, readability, sizing feels off, or wants more polished, intentional type. Local wrapper that runs typography diagnosis per impeccable/reference/typography.md.
version: 1.0.0
user-invocable: true
argument-hint: "[target]"
---

Local procedural wrapper for typography work. Diagnoses and fixes type issues per impeccable's typography doctrine.

**Doctrine source of truth:** `impeccable/reference/typography.md`. This skill provides the procedure; doctrine lives in impeccable.

## Workflow Routing (SYSTEM PROMPT)

Single-workflow skill. Activation phrases: "typography off", "fonts look wrong", "hierarchy broken", "type is bad", "fix typography", "readability issues".

The procedure below runs in order: assess → plan → improve → verify.

## MANDATORY PREPARATION

Invoke `/impeccable` — it contains the **Context Gathering Protocol** and shared design doctrine. If `.impeccable.md` is missing and loaded instructions lack a Design Context section, you MUST run `/impeccable teach` first.

Additionally consult `impeccable/reference/typography.md` for: modular scale ratios, font pairing, `font-display` strategies, fluid vs fixed type (apps vs marketing), OpenType features, accessibility.

## Assess Current Typography

1. **Font choices** — invisible defaults (Inter/Roboto/Arial/system)? Brand match? Too many families (>2-3)?
2. **Hierarchy** — can you tell heading / body / caption at a glance? Sizes too close (14/15/16)? Weight contrasts strong enough?
3. **Sizing & scale** — consistent type scale? Body ≥ 16px? Fixed `rem` for app UIs vs fluid `clamp()` for marketing?
4. **Readability** — line lengths 45–75ch? Line-height appropriate for context? Contrast sufficient?
5. **Consistency** — same elements styled identically? Weights used consistently? Letter-spacing intentional?

**CRITICAL:** Goal is clarity and intention, not "fancier." Good typography is invisible.

## Plan Improvements

- **Font selection** — replace invisible defaults if needed; match brand personality
- **Type scale** — modular scale (1.25 / 1.333 / 1.5 ratio); 5 sizes cover most needs
- **Weight strategy** — clear roles per weight (Regular body, Semibold labels, Bold headings)
- **Spacing** — line-height per context; letter-spacing intentional

Consult `impeccable/reference/typography.md` for scale details and pairing options.

## Improve Systematically

| Dimension | Action | Doctrine |
|---|---|---|
| Font selection | Pick fonts matching brand; genuine contrast (serif+sans, geometric+humanist) or single family multiple weights; `font-display: swap`, metric-matched fallbacks | `typography.md` |
| Hierarchy | Build scale with 5 sizes, consistent ratio, combine size+weight+color+space; fixed `rem` for apps, `clamp()` for marketing | `typography.md` |
| Readability | `max-width: 65ch`; line-height 1.1–1.2 headings, 1.5–1.7 body; body ≥ 16px / 1rem | `typography.md` |
| Details | `tabular-nums` for data; `letter-spacing` intentional (open for small caps/uppercase, tight/default for large display); semantic tokens (`--text-body` not `--font-16`); `font-kerning: normal` + OpenType where appropriate | `typography.md` |
| Weight consistency | Clear role per weight; ≤3-4 weights loaded; load only weights actually used | `typography.md` |

## Anti-patterns

- More than 2-3 font families
- Arbitrary sizes (commit to a scale)
- Body text below 16px
- Decorative/display fonts for body
- `user-scalable=no` (accessibility violation)
- `px` for font sizes — use `rem` to respect user settings
- Defaulting to Inter/Roboto/Open Sans when personality matters
- Pairing similar-but-not-identical fonts (two geometric sans-serifs)

## Verify

- **Hierarchy** — can you identify heading vs body vs caption instantly?
- **Readability** — comfortable for long passages?
- **Consistency** — same-role elements styled identically?
- **Personality** — reflects brand?
- **Performance** — web fonts load without layout shift?
- **Accessibility** — WCAG contrast met; zoomable to 200%?

## Hand-off

After typography pass, recommend:
- `/layout` — if spatial rhythm also needs work
- `/critique` — UX review including type
- `/audit` — technical quality including a11y contrast and font performance
- `/polish` — pre-ship final pass

Doctrine source of truth: `impeccable/reference/typography.md`.
