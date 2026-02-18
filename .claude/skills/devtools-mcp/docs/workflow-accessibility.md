# Accessibility

Run `bootstrap.md` first (2-3 tool calls max).

Then execute using DIRECT MCP tool calls (not `claude mcp call`):

## Step 1: A11y tree
Call `navigate_page` with url. Then call `take_snapshot` with verbose=true.
Check for: main, nav, header, footer landmarks.

## Step 2: Heading hierarchy
Call `evaluate_script` with:
```js
(() => { const h = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')); return h.map(e => ({ level: parseInt(e.tagName[1]), text: e.textContent.trim() })); })()
```
Rules: one h1, no skipped levels.

## Step 3: Keyboard navigation
Call `press_key` "Tab" → `take_snapshot` (repeat 5-10 times).
Check: all interactive elements reachable, focus visible, no traps.

## Step 4: Form labels
Call `evaluate_script` with:
```js
(() => { const i = Array.from(document.querySelectorAll('input,select,textarea')); return i.map(e => ({ id: e.id, labelled: !!(document.querySelector('label[for="'+e.id+'"]') || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')) })); })()
```

## Step 5: axe-core (optional)
Call `evaluate_script` with axe injection + `axe.run()`.

## Report
Landmarks, headings, keyboard, forms, axe violations — with specific fix recommendations.
