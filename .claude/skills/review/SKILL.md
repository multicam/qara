---
name: review
context: same
description: |
  Evaluate design quality: UX review (heuristics, personas, AI slop) + technical audit (a11y, performance, theming).
  USE WHEN: "review", "critique", "audit", "is this shippable", "design review".
version: 1.0.0
user-invocable: true
argument-hint: "[ux|technical|full] [area]"
---

Combined design review. Two assessment lenses: UX (visual hierarchy, cognitive load, emotional resonance, heuristics, personas, AI slop detection) and technical (a11y, performance, theming, responsive, anti-patterns). Runs both by default; select one for focused review.

**Source heritage:** Absorbs critique v2.1.1 + audit v2.1.1. Upstream preserved at `skills-external/{critique,audit}/`.

## Workflow Routing (SYSTEM PROMPT)

Three modes. Select by argument or infer from phrasing.

- Argument `ux` OR phrasing "critique / UX review / design review / how does this look / what's wrong with the design" → `## Mode: ux`
- Argument `technical` OR phrasing "audit / technical review / a11y check / performance audit" → `## Mode: technical`
- No argument OR `full` OR phrasing "review / is this shippable / review everything" → `## Mode: full` (default)

## MANDATORY PREPARATION

Design Context must be loaded (see CORE's Design Context Session Guard). If not loaded, run `/impeccable teach` first.

Additionally gather: what the interface is trying to accomplish, quality bar (MVP vs flagship).

---

## Mode: ux

Full dual-assessment UX review. Two sequential assessment lenses — run the LLM review first, then the automated detection. The automated scan catches patterns the LLM may normalize; the LLM catches nuances the scanner can't. Delegate each to a separate sub-agent via Task tool when true independence is needed (e.g., high-stakes reviews).

### Assessment A: LLM Design Review

Read source files (HTML, CSS, JS/TS). If browser automation is available, visually inspect in a **new tab** (never reuse existing tabs). Label it: `document.title = '[LLM] ' + document.title;`

Evaluate:

**AI Slop Detection (CRITICAL):** Does this look like every other AI-generated interface? Check against ALL DON'T guidelines in impeccable. AI color palette, gradient text, dark glows, glassmorphism, hero metric layouts, identical card grids, generic fonts. **The test:** If someone said "AI made this," would you believe them immediately?

**Holistic Design Review:** Visual hierarchy (eye flow, primary action clarity), information architecture (structure, grouping, cognitive load), emotional resonance (brand/audience match), discoverability (interactive elements obvious?), composition (balance, whitespace, rhythm), typography (hierarchy, readability, font choices), color (purposeful, cohesive, accessible), states & edge cases (empty, loading, error, success), microcopy (clarity, tone, helpfulness).

**Cognitive Load** (consult `impeccable/reference/cognitive-load.md`):
- Run the 8-item checklist. 0-1 failures = low (good), 2-3 = moderate, 4+ = critical.
- Count visible options at each decision point. Flag if >4.
- Check progressive disclosure: is complexity revealed only when needed?

**Emotional Journey:**
- What emotion does this evoke? Intentional?
- Peak-end rule: most intense moment positive? Experience ends well?
- Emotional valleys: anxiety spikes at high-stakes moments (payment, delete). Design interventions present?

**Nielsen's Heuristics** (consult `impeccable/reference/heuristics-scoring.md`):
Score each of the 10 heuristics 0-4.

### Assessment B: Automated Detection

Run the bundled deterministic detector (25 patterns: AI slop tells + design quality).

**CLI scan:**
```bash
npx impeccable --json [--fast] [target]
```
- Pass HTML/JSX/TSX/Vue/Svelte files or directories. Not CSS-only.
- For URLs, skip CLI (requires Puppeteer), use browser visualization.
- For 200+ files, use `--fast`. For 500+, narrow scope.
- Exit 0 = clean, 2 = findings.

**Browser visualization** (when browser automation available AND target is viewable):
1. Start live detection: `npx impeccable live &` — note port.
2. Open **new tab**, navigate, label: `document.title = '[Human] ' + document.title;`
3. Scroll to top, inject: `const s = document.createElement('script'); s.src = 'http://localhost:PORT/detect.js'; document.head.appendChild(s);`
4. Wait 2-3s, read console with pattern `impeccable`. Do NOT screenshot overlays.
5. Cleanup: `npx impeccable live stop`

For multi-view targets, inject on 3-5 representative pages.

### UX Report

Synthesize both assessments. Do NOT concatenate — weave findings, noting agreement, detector catches missed by LLM, and false positives.

**Design Health Score** (Nielsen's 10 heuristics, /40 total):

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | ? | |
| 2 | Match System / Real World | ? | |
| 3 | User Control and Freedom | ? | |
| 4 | Consistency and Standards | ? | |
| 5 | Error Prevention | ? | |
| 6 | Recognition Rather Than Recall | ? | |
| 7 | Flexibility and Efficiency | ? | |
| 8 | Aesthetic and Minimalist Design | ? | |
| 9 | Error Recovery | ? | |
| 10 | Help and Documentation | ? | |
| **Total** | | **??/40** | |

Be honest. A 4 means genuinely excellent. Most real interfaces score 20-32.

**Anti-Patterns Verdict:** Does this look AI-generated? LLM assessment + deterministic scan summary. If browser used, tell user overlays are visible in **[Human]** tab.

**Overall Impression:** Brief gut reaction — what works, what doesn't, single biggest opportunity.

**What's Working:** 2-3 specific things done well.

**Priority Issues (P0-P3):** 3-5 most impactful problems. For each:
- [P?] What — name the problem
- Why it matters — impact on users
- Fix — concrete suggestion
- Suggested command — from new names: `/enhance layout`, `/enhance motion`, `/enhance responsive`, `/enhance performance`, `/finish polish`, `/finish copy`, `/tune bolder`, `/tune quieter`, `/tune colorize`, `/harden`, `/impeccable-typeset`

**Persona Red Flags** (consult `impeccable/reference/personas.md`):
Auto-select 2-3 relevant personas. Walk through primary action, list specific red flags. Be specific — name exact elements and interactions.

**Minor Observations:** Quick notes on smaller issues.

**Questions to Consider:** 2-3 provocative questions that unlock better solutions.

---

## Mode: technical

Systematic technical quality audit. Code-level, not design critique. Document issues for other commands to address.

### Diagnostic Scan

Score 5 dimensions 0-4 each (total /20).

**1. Accessibility (A11y)**
Check: contrast ratios (<4.5:1 text, <3:1 UI), missing ARIA, keyboard navigation (focus indicators, tab order, traps), semantic HTML (heading hierarchy, landmarks, buttons vs divs), alt text, form labels.
Score: 0=Inaccessible, 1=Major gaps, 2=Partial, 3=Good (WCAG AA mostly), 4=Excellent (approaches AAA)

**2. Performance**
Check: layout thrashing, expensive animations (width/height instead of transform/opacity), missing optimization (lazy loading, will-change), bundle size, unnecessary re-renders.
Score: 0=Severe, 1=Major problems, 2=Partial, 3=Good, 4=Excellent

**3. Theming**
Check: hard-coded colors (not tokens), broken dark mode, inconsistent tokens, theme switching issues.
Score: 0=No theming, 1=Minimal tokens, 2=Partial, 3=Good, 4=Excellent

**4. Responsive Design**
Check: fixed widths, touch targets (<44px), horizontal scroll, text scaling breakage, missing breakpoints.
Score: 0=Desktop-only, 1=Major issues, 2=Partial, 3=Good, 4=Excellent

**5. Anti-Patterns (CRITICAL)**
Check against ALL DON'T guidelines in impeccable. AI slop tells + general anti-patterns.
Score: 0=AI slop gallery (5+), 1=Heavy (3-4), 2=Some (1-2), 3=Mostly clean, 4=No tells

### Technical Report

**Audit Health Score (/20):**

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | ? | |
| 2 | Performance | ? | |
| 3 | Responsive Design | ? | |
| 4 | Theming | ? | |
| 5 | Anti-Patterns | ? | |
| **Total** | | **??/20** | |

Rating bands: 18-20 Excellent, 14-17 Good, 10-13 Acceptable, 6-9 Poor, 0-5 Critical.

**Anti-Patterns Verdict:** AI-generated? Specific tells. Be brutally honest.

**Executive Summary:** Score, issue count by severity, top 3-5 critical issues, next steps.

**Detailed Findings (P0-P3):** Every issue tagged with severity, location, category, impact, WCAG/standard, recommendation, suggested command (new names only).

**Patterns & Systemic Issues:** Recurring problems indicating systemic gaps.

**Positive Findings:** What's working well.

---

## Mode: full (default)

Runs both UX and technical assessments in parallel (delegate to sub-agents for independence). Produces a combined report with:

- Design Health Score (/40) + Audit Health Score (/20) = **Total /60**
- Combined anti-patterns verdict
- Unified priority issues (P0-P3) from both lenses
- Persona red flags
- Single recommended action list

### Ask the User

After presenting findings, ask 2-4 targeted questions (every question references specific findings):

1. **Priority direction** — which category matters most? Offer top 2-3 issue categories.
2. **Design intent** — if tonal mismatch found, was it intentional?
3. **Scope** — everything, top 3, or critical only?
4. **Constraints** (optional) — anything off-limits?

### Recommended Actions

Prioritized action list using new skill names only:

- `/enhance layout` — fix spatial rhythm / hierarchy issues
- `/enhance motion` — add purposeful animation
- `/enhance responsive` — fix cross-device issues
- `/enhance performance` — optimize load/render
- `/finish` — pre-ship quality pass
- `/finish copy` — UX writing clarity
- `/tune bolder|quieter|colorize` — intensity adjustment
- `/harden` — resilience (a11y, i18n, edge cases)
- `/impeccable-typeset` — typography repair
- `/design-system enforce` — token compliance

End with `/finish` as the final step if any fixes were recommended.

> You can run these one at a time, all at once, or in any order.
> Re-run `/review` after fixes to see your score improve.

**Rules:** Be direct. Be specific. Say what's wrong AND why it matters. Give concrete suggestions. Prioritize ruthlessly. Don't soften criticism.

**Diagrams:** For full reviews with 10+ findings, use `/visual-explainer` to produce a visual audit report (scored dimensions, severity breakdown, architecture diagram of the review scope).

**Doctrine:** `impeccable/reference/{cognitive-load, heuristics-scoring, personas}.md`
