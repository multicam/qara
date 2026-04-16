---
name: enhance
context: same
description: |
  Improve specific design dimensions: layout (spacing, rhythm), motion (animation), responsive (breakpoints), performance (load, render).
  USE WHEN: "fix layout", "add animation", "make responsive", "optimize performance".
version: 1.0.0
user-invocable: true
argument-hint: "[layout|motion|responsive|performance] [target]"
---

Thin dispatcher for four enhancement dimensions. Each sub-mode is a procedure outline — doctrine lives in `impeccable/reference/*.md`. This skill dispatches procedure; it does not own rules.

**Source heritage:** Absorbs layout v2.1.1, animate v2.1.1, adapt v2.1.1, optimize v2.1.1. Upstream preserved at `skills-external/{layout,animate,adapt,optimize}/`.

## Workflow Routing (SYSTEM PROMPT)

Four modes. Select by argument or infer from phrasing.

- Argument `layout` OR phrasing "layout / spacing / rhythm / grid / visual hierarchy / composition" → `## Mode: layout`
- Argument `motion` OR phrasing "animation / motion / micro-interaction / transition / entrance / choreography" → `## Mode: motion`
- Argument `responsive` OR phrasing "responsive / mobile / breakpoint / tablet / adapt / cross-device" → `## Mode: responsive`
- Argument `performance` OR phrasing "performance / bundle size / jank / load time / Core Web Vitals / rendering" → `## Mode: performance`

If the user's intent is ambiguous, ask which dimension to enhance.

## MANDATORY PREPARATION

Design Context must be loaded (see CORE's Design Context Session Guard). If not loaded, run `/impeccable teach` first.

---

## Mode: layout

Improve spatial rhythm, visual hierarchy, and composition. Doctrine: `impeccable/reference/spatial-design.md`.

### Assess current layout

1. **Spacing** — is it consistent? Does it use a scale (4pt/8pt)?
2. **Visual hierarchy** — squint test: what stands out? Should it?
3. **Grid & structure** — is there a system? Flex vs Grid used appropriately?
4. **Rhythm & variety** — monotone spacing or intentional variation?
5. **Density** — too sparse? too cramped?

### Plan layout improvements

- Spacing system (semantic tokens, not magic numbers)
- Hierarchy strategy (scale contrast, weight contrast, color)
- Layout approach (Flex for 1D, Grid for 2D, container queries for components)
- Rhythm (tight grouping 8-12px, generous separation 48-96px)

### Implement

1. **Establish spacing system** — semantic tokens (xs/sm/md/lg/xl/2xl)
2. **Create visual rhythm** — alternating density zones
3. **Choose right layout tool** — Flex for 1D flow, Grid for 2D, auto-fit for responsive
4. **Break card monotony** — vary sizes, mix full-bleed with contained, add feature cards
5. **Strengthen visual hierarchy** — scale contrast (2-4× between levels), weight contrast, color anchors
6. **Manage depth & elevation** — shadow system, surface hierarchy, z-index strategy
7. **Optical adjustments** — icon centering, baseline alignment, visual weight compensation

### Verify

Squint test, rhythm consistency, hierarchy clarity, breathing room, responsive behavior.

---

## Mode: motion

Add purposeful animation and micro-interactions. Doctrine: `impeccable/reference/motion-design.md`.

### Assess animation opportunities

Identify static areas: missing feedback, jarring transitions, unclear relationships. Understand context: brand personality, performance budget, audience.

### Plan animation strategy

Four layers (one well-orchestrated experience beats scattered animations):
- **Hero moment** — ONE signature animation that defines the experience
- **Feedback layer** — button responses, form validation, toggle states
- **Transition layer** — show/hide, expand/collapse, page navigation
- **Delight layer** — empty states, completed actions, celebrations

### Implement

Six categories:
1. **Entrance** — staggered reveals (50-100ms stagger, 100-150ms duration)
2. **Micro-interactions** — button hover/click, form validation, toggles, sliders
3. **State transitions** — show/hide (height animation via grid-template-rows), expand/collapse, loading → success → error
4. **Navigation** — page transitions, tab switching, carousels, scroll-driven
5. **Feedback** — hover hints, drag & drop, focus flow, progress indicators
6. **Delight** — empty states, completed actions, subtle personality touches

### Technical implementation

- **Timing & easing** — ease-out-quart (0.25, 1, 0.5, 1), ease-out-quint, ease-out-expo. NEVER bounce/elastic.
- **GPU acceleration** — only animate `transform` and `opacity`. Never animate width/height/top/left directly.
- **Height animation** — use `grid-template-rows: 0fr → 1fr` trick.
- **Performance** — requestAnimationFrame for JS animations, debounce scroll handlers.
- **Accessibility** — respect `prefers-reduced-motion`. Provide instant alternatives.

### Verify

60fps, natural easing, appropriate timing, reduced motion works, doesn't block interaction.

---

## Mode: responsive

Adapt for different screen sizes and devices. Doctrine: `impeccable/reference/responsive-design.md`.

### Assess adaptation challenge

Identify source context (what's built for?). Understand target contexts: device, input method, screen size, connection speed, usage patterns.

### Plan adaptation strategy

Per-target approach:
- **Mobile** (320-767px) — single column, bottom nav, 44px touch targets, swipe gestures
- **Tablet** (768-1023px) — two-column, master-detail, sidebar navigation
- **Desktop** (1024+) — multi-column, hover states, keyboard shortcuts, dense layouts
- **Print** — page breaks, remove interactive, black & white, page numbers
- **Email** — 600px, table layout, inline CSS, no JavaScript

### Implement

1. **Breakpoints** — use established breakpoints, mobile-first media queries
2. **Layout adaptation** — Grid/Flexbox reflow, container queries for components, `clamp()` for fluid sizing
3. **Touch adaptation** — 44×44px targets, hover → active fallbacks, swipe support
4. **Content adaptation** — truncate/prioritize on mobile, progressive disclosure
5. **Navigation adaptation** — bottom nav (mobile), sidebar (tablet), top bar (desktop)

### Verify

Real devices, orientations, browsers, OS, input methods, edge cases, slow connections.

---

## Mode: performance

Diagnose and fix UI performance. No doctrine reference (optimize was standalone).

### Assess performance

Measure: Core Web Vitals (LCP, FID/INP, CLS), load time, bundle size, runtime perf, network requests. Identify bottlenecks.

### Optimize

Five areas:

**Loading:**
- Images: WebP/AVIF, lazy loading, srcset, responsive images
- JS: code splitting, tree shaking, dynamic imports
- CSS: critical inline, purge unused
- Fonts: font-display: swap, subset, preload
- Strategy: preload/prefetch, service worker, streaming SSR

**Rendering:**
- Avoid layout thrashing (batch reads/writes)
- CSS `contain` for isolation
- Minimize DOM depth
- Virtual scrolling for long lists
- GPU-accelerated animations only

**Animation:**
- requestAnimationFrame (not setTimeout)
- Debounce scroll handlers
- CSS animations over JS where possible
- will-change for known animated elements

**Framework:**
- React: memo/useMemo/useCallback, virtualize lists, code split routes
- State: minimize re-renders, use selectors, avoid prop drilling

**Network:**
- Combine files, SVG sprites, pagination over infinite scroll
- GraphQL field selection, CDN, adaptive loading

### Core Web Vitals targets

- LCP < 2.5s
- INP < 200ms
- CLS < 0.1

### Verify

Before/after metrics, real devices, slow connections (3G throttle), no regressions.

---

## Hand-off

After enhancement, recommend next steps:
- `/review` — verify the enhancement resolved the issues
- `/finish` — pre-ship quality pass (always run before shipping)

Doctrine source of truth is always `impeccable/reference/*.md`. This skill dispatches procedure; it does not own rules.
