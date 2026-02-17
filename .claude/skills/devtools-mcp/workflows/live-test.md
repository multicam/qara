---
workflow: live-test
description: Test live staging/production websites without dev server management
tools: [navigate_page, list_console_messages, take_screenshot, list_network_requests, evaluate_script, emulate, resize_page]
---

# Live Website Testing Workflow

Test staging and production URLs directly — no dev server, no package.json needed.

## When to Use

- Testing a staging deployment before merge
- Verifying production after deploy
- Auditing a third-party website
- Cross-environment comparison (staging vs production)

## Safety Rules

- **Read-only by default** — no form submissions, no data mutations
- **No authentication** — only test publicly accessible pages
- **No destructive actions** — never click "delete", "remove", or admin actions
- **Screenshot everything** — capture evidence before and after

## Quick Commands

```bash
# Full site audit (smoke + visual + a11y)
devtools-mcp live --url https://staging.example.com

# Smoke test only
devtools-mcp smoke --url https://staging.example.com --no-server

# Visual regression across viewports
devtools-mcp visual --url https://production.example.com --no-server

# Accessibility audit
devtools-mcp a11y --url https://staging.example.com --no-server

# Performance check
devtools-mcp perf --url https://production.example.com --no-server

# Debug console errors on specific pages
devtools-mcp debug --url https://staging.example.com --pages /,/about,/contact --no-server
```

## Workflow Steps

### 1. Verify Target is Reachable

```
Tool: navigate_page
Args: { "url": "<target-url>" }
Expected: Page loads without connection error
```

Report HTTP status. If redirect, note the chain.

### 2. Console Error Scan

```
Tool: list_console_messages
Filter: errors and warnings
```

Categorize:
- **Critical**: JavaScript errors, uncaught exceptions
- **Warning**: Deprecations, missing resources
- **Info**: Skip unless debugging

### 3. Network Health Check

```
Tool: list_network_requests
```

Flag:
- Failed requests (4xx, 5xx)
- Mixed content (HTTP on HTTPS page)
- Slow requests (>3s)
- Missing resources (404s)
- CORS errors

### 4. Multi-Viewport Screenshots

Capture at standard breakpoints:

| Viewport | Width | Height |
|----------|-------|--------|
| Mobile | 375 | 812 |
| Tablet | 768 | 1024 |
| Desktop | 1440 | 900 |

```
Tool: resize_page + take_screenshot (for each viewport)
```

### 5. Accessibility Quick Check

```
Tool: evaluate_script
Args: { "expression": "document.querySelectorAll('[role=\"main\"], main, [role=\"navigation\"], nav, [role=\"banner\"], header').length" }
```

Verify:
- Landmark elements present
- Heading hierarchy (h1 → h2 → h3, no skips)
- Images have alt text
- Interactive elements are keyboard-accessible

### 6. Performance Snapshot

```
Tool: evaluate_script
Args: { "expression": "JSON.stringify(performance.getEntriesByType('navigation')[0])" }
```

Report:
- DOM Content Loaded time
- Full page load time
- Transfer size

## Multi-Page Testing

For sites with multiple pages, iterate through each:

```bash
devtools-mcp live --url https://example.com --pages /,/about,/pricing,/contact,/blog
```

Each page gets the full workflow (console + network + screenshot + a11y).

## Staging vs Production Comparison

Run the same test against both environments:

```bash
# Test staging
devtools-mcp live --url https://staging.example.com --pages /,/about

# Test production
devtools-mcp live --url https://www.example.com --pages /,/about
```

Compare:
- Console error differences
- Visual differences (screenshot comparison)
- Performance differences
- Missing/broken resources

## Output Format

```json
{
  "url": "https://staging.example.com",
  "timestamp": "2026-02-16T10:00:00Z",
  "pages": [
    {
      "path": "/",
      "status": 200,
      "consoleErrors": 0,
      "networkFailures": 0,
      "screenshots": ["desktop.png", "mobile.png"],
      "passed": true
    }
  ],
  "summary": {
    "totalPages": 5,
    "passed": 4,
    "failed": 1,
    "issues": ["404 on /old-page"]
  }
}
```
