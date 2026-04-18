---
name: finish
context: same
description: |
  Pre-ship quality pass: polish (alignment, states, consistency) + copy clarity (UX writing, error messages).
  USE WHEN: "polish", "pre-ship", "final pass", "ship-ready", "clarify copy".
version: 1.0.0
user-invocable: true
argument-hint: "[polish|copy] [target]"
---

Pre-ship quality pass. Two sub-modes: polish (12-dimension systematic pass + 20-item checklist) and copy (UX writing clarity across 9 areas). Default runs both. Argument selects one.

**Source heritage:** Absorbs polish v2.1.1, clarify v2.1.1. Upstream preserved at `skills-external/{polish,clarify}/`.

## Workflow Routing (SYSTEM PROMPT)

Two modes, defaulting to both. Select by argument or infer from phrasing.

- Argument `polish` OR phrasing "polish / final pass / pre-ship / ship-ready / final quality / something looks off" → run polish only
- Argument `copy` OR phrasing "clarify / UX copy / error messages / labels / microcopy / confusing text" → run copy only
- No argument OR phrasing "finish / ready to ship / wrap this up" → run both (default)

## MANDATORY PREPARATION

Design Context must be loaded (see CORE's Design Context Session Guard). If not loaded, run `/impeccable teach` first.

Additionally gather: quality bar (MVP vs flagship), ship deadline.

---

## Design System Discovery

Before any finish work, understand the system you're finishing toward:

1. **Find the design system** — search for design system docs, component libraries, token definitions. Study core patterns.
2. **Note conventions** — imports, spacing scale, typography styles, color tokens, motion patterns.
3. **Identify drift** — hardcoded values, custom components duplicating shared ones, spacing off-scale.

If a design system exists, finish aligns with it. If none exists, finish against visible codebase conventions.

---

## Mode: polish

Meticulous final pass to catch details that separate good from great.

### Pre-Polish Assessment

1. **Review completeness** — functionally complete? Known issues to preserve (TODOs)? Quality bar? Ship deadline?
2. **Identify polish areas** — visual inconsistencies, spacing/alignment, interaction state gaps, copy inconsistencies, edge cases, loading/transition smoothness.

**CRITICAL:** Polish is the last step, not the first. Don't polish work that isn't functionally complete.

### 12-Dimension Systematic Pass

**1. Visual Alignment & Spacing**
- Pixel-perfect grid alignment
- Consistent spacing scale (no random 13px gaps)
- Optical alignment (icons, visual weight compensation)
- Responsive consistency

**2. Typography Refinement**
- Hierarchy consistency (same elements, same sizes/weights)
- Line length 45-75ch for body
- Widows & orphans (no single words on last line)
- Hyphenation, kerning adjustments
- Font loading (no FOUT/FOIT)

**3. Color & Contrast**
- WCAG contrast ratios
- All colors from design tokens (no hardcoded values)
- All theme variants work
- Consistent color meaning
- Tinted neutrals (no pure gray — add 0.01 chroma)
- Never gray text on colored backgrounds (use shade of that color)

**4. Interaction States** (every interactive element needs all 8)
- Default, Hover, Focus (never remove without replacement), Active, Disabled, Loading, Error, Success

**5. Micro-interactions & Transitions**
- Smooth state changes (150-300ms)
- Consistent easing (ease-out-quart/quint/expo, NEVER bounce/elastic)
- 60fps, only transform + opacity
- Purposeful motion
- Respects `prefers-reduced-motion`

**6. Content & Copy** (if running both modes, skip here — covered in copy mode)
- Consistent terminology, capitalization
- Grammar & spelling
- Appropriate length
- Punctuation consistency

**7. Icons & Images**
- Consistent style family
- Consistent sizing, proper optical alignment
- Alt text on all images
- No layout shift (proper aspect ratios)
- Retina support (2x assets)

**8. Forms & Inputs**
- All inputs labeled
- Required indicators clear and consistent
- Error messages helpful and consistent
- Logical tab order
- Validation timing consistent (on blur vs on submit)

**9. Edge Cases & Error States**
- Loading states for all async actions
- Helpful empty states (not blank space)
- Clear error messages with recovery paths
- Success confirmations
- Long content handled (very long names, descriptions)
- Missing data handled gracefully
- Offline handling (if applicable)

**10. Responsiveness**
- All breakpoints tested
- Touch targets 44×44px minimum
- No text below 14px on mobile
- No horizontal scroll
- Logical content reflow

**11. Performance**
- Fast initial load
- No layout shift (CLS)
- Smooth interactions (no jank)
- Optimized images
- Lazy loading for off-screen content

**12. Code Quality**
- No console logs in production
- No commented-out code
- No unused imports
- Consistent naming conventions
- No TypeScript `any` or ignored errors
- Proper ARIA labels and semantic HTML

### Polish Checklist (20 items)

- [ ] Visual alignment perfect at all breakpoints
- [ ] Spacing uses design tokens consistently
- [ ] Typography hierarchy consistent
- [ ] All interactive states implemented
- [ ] All transitions smooth (60fps)
- [ ] Copy consistent and polished
- [ ] Icons consistent and properly sized
- [ ] All forms labeled and validated
- [ ] Error states helpful
- [ ] Loading states clear
- [ ] Empty states welcoming
- [ ] Touch targets 44×44px minimum
- [ ] Contrast ratios meet WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] No console errors or warnings
- [ ] No layout shift on load
- [ ] Works in all supported browsers
- [ ] Respects reduced motion preference
- [ ] Code clean (no TODOs, console.logs, commented code)

---

## Mode: copy

Improve UX writing clarity across 9 areas.

### Assess current copy

Find clarity problems: jargon, ambiguity, passive voice, excessive length, assumptions, missing context, tone mismatch.

Understand context: audience technical level, users' mental state (stressed during error, confident during success), desired action, constraints (character limits, space).

### Improve across 9 areas

**1. Error Messages**
- Bad: "Error 403: Forbidden"
- Good: "You don't have permission to view this page. Contact your admin for access."
- Principles: explain in plain language, suggest fix, don't blame user, include examples

**2. Form Labels & Instructions**
- Bad: "DOB (MM/DD/YYYY)"
- Good: "Date of birth" (placeholder shows format)
- Principles: clear specific labels, show format, explain why asking, instructions before field

**3. Button & CTA Text**
- Bad: "Submit" | "OK"
- Good: "Save changes" | "Create account"
- Principles: describe action specifically, active voice (verb + noun), match user's mental model

**4. Help Text & Tooltips**
- Add value (don't repeat label), answer implicit question, keep brief, link to docs if needed

**5. Empty States**
- Bad: "No items"
- Good: "No projects yet. Create your first project to get started."
- Principles: explain why empty, show next action, make welcoming

**6. Success Messages**
- Confirm what happened, explain what happens next, match emotional moment

**7. Loading States**
- Set expectations (how long?), explain what's happening, show progress, offer escape hatch

**8. Confirmation Dialogs**
- State specific action, explain consequences (especially destructive), clear button labels, don't overuse

**9. Navigation & Wayfinding**
- Specific descriptive labels (not "Items"/"Stuff"), user vocabulary (not internal jargon), clear hierarchy

### 6 Clarity Principles

1. **Be specific** — "Enter email" not "Enter value"
2. **Be concise** — cut unnecessary words without sacrificing clarity
3. **Be active** — "Save changes" not "Changes will be saved"
4. **Be human** — "Oops, something went wrong" not "System error encountered"
5. **Be helpful** — tell users what to do, not just what happened
6. **Be consistent** — same terms throughout, pick one and stick with it

---

## Final Verification

After running polish and/or copy:
- **Use it yourself** — actually interact with the feature
- **Test on real devices** — not just browser DevTools
- **Check all states** — don't just test happy path
- **Compare to design** — match intended design

## Clean Up

- Replace custom implementations with design system equivalents
- Remove orphaned code (unused styles, components, files)
- Consolidate tokens (new values → should they be tokens?)
- Verify DRYness (no polishing-introduced duplication)

## Hand-off

After finish, the feature is ready for:
- `/review technical` — quick scan to confirm no regressions from the polish/copy changes. This is a lightweight gate, not a full review.
- Ship if the technical scan returns clean.

Doctrine: `../impeccable/reference/{ux-writing, interaction-design}.md`
