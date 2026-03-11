# DevTools MCP Examples: Advanced Scenarios

Part of DevTools MCP docs. See also: [examples-testing.md](examples-testing.md)

Performance analysis, mobile testing, network debugging, accessibility testing, real-world scenarios, CLAUDE.md integration, interactive mode, and tips & tricks.

## Table of Contents

- [Performance Analysis](#performance-analysis)
- [Mobile Testing](#mobile-testing)
- [Network Debugging](#network-debugging)
- [Accessibility Testing](#accessibility-testing)
- [Real-World Scenarios](#real-world-scenarios)
- [CLAUDE.md Integration](#claudemd-integration)
- [Interactive Mode Examples](#interactive-mode-examples)
- [Tips & Tricks](#tips--tricks)

---

## Performance Analysis

### Core Web Vitals

```bash
claude "measure Core Web Vitals for homepage"
```

Output:
```
Performance Metrics:
  LCP: 2.1s (Good)
  FID: 45ms (Good)
  CLS: 0.08 (Needs Improvement)

Recommendations:
- Reduce CLS by reserving space for dynamic content
- LCP is within good range
- FID is excellent
```

### Page Load Time

```bash
claude "measure load time for /products/"
```

### Slow 3G Test

```bash
claude "test /checkout/ on Slow 3G network"
```

### Trace Analysis

```bash
claude "start performance trace, reload homepage, stop trace, and analyze LCP"
```

---

## Mobile Testing

### iPhone 13 Pro

```bash
claude "test homepage on iPhone 13 Pro (390x844)"
```

### Touch Interactions

```bash
claude "emulate iPhone, test mobile menu at /navigation/"
```

### Mobile Network

```bash
claude "emulate iPhone on Slow 3G, test /products/"
```

### Landscape Mode

```bash
claude "test homepage at 812x375 (landscape)"
```

---

## Network Debugging

### Find Failed Requests

```bash
claude "list failed network requests on /dashboard/"
```

Output:
```
Failed Requests: 2
  1. POST /api/user → 401 Unauthorized
  2. GET /images/hero.jpg → 404 Not Found

Recommendations:
- Check authentication for /api/user
- Fix broken image link
```

### API Response

```bash
claude "get response body for /api/products request"
```

### Slow Requests

```bash
claude "find requests taking longer than 2 seconds on /shop/"
```

### CORS Issues

```bash
claude "check for blocked requests on /api/external/"
```

---

## Accessibility Testing

### Landmark Check

```bash
claude "check accessibility landmarks on homepage"
```

Output:
```
✅ Accessibility Check

Landmarks found:
  ✅ <main> - Main content
  ✅ <nav> - Navigation
  ✅ <header> - Page header
  ✅ <footer> - Page footer

Heading structure:
  ✅ h1 present
  ✅ Proper hierarchy (h1 → h2 → h3)
```

### Keyboard Navigation

```bash
claude "test keyboard navigation on /menu/"
```

Claude will:
1. Navigate to page
2. Press Tab to move through focusable elements
3. Check focus indicators
4. Report tab order

### Screen Reader Test

```bash
claude "take a11y snapshot of /article/ and check for proper labels"
```

---

## Real-World Scenarios

### Pre-Deploy Checklist

```bash
# 1. Smoke test all pages
claude "smoke test on /, /about/, /contact/, /products/"

# 2. Check mobile
claude "screenshot all pages at mobile size"

# 3. Performance
claude "measure Core Web Vitals for homepage"

# 4. Accessibility
claude "check a11y on all pages"
```

### Bug Investigation

```bash
# User reports: "Contact form doesn't work"

# 1. Navigate and check console
claude "check console errors on /contact/"

# 2. Test form
claude "test contact form with test data"

# 3. Check network
claude "list failed requests on /contact/"

# 4. Screenshot error state
claude "take screenshot of /contact/ after form submission"
```

### PR Review

```bash
# 1. Test feature branch
git checkout feature/new-checkout

# 2. Start dev server
pnpm dev

# 3. Visual regression
claude "screenshot /checkout/ at all viewports"

# 4. Functional test
claude "test checkout form end-to-end"

# 5. Performance check
claude "measure load time for /checkout/"
```

### Cross-Browser Baseline

```bash
# Brave
claude "screenshot all pages at desktop size using Brave"

# Chrome (update MCP config)
claude "screenshot all pages at desktop size using Chrome"

# Compare results
```

---

## CLAUDE.md Integration

### Basic Override

```markdown
## DevTools MCP
url: http://localhost:8000
pages:
  - /
  - /courses/
  - /contact/
```

Then:
```bash
claude "run smoke test"  # Uses pages from CLAUDE.md
```

### Custom Thresholds

```markdown
## DevTools MCP
url: http://localhost:8000
thresholds:
  console_errors: 0
  console_warnings: 10
  network_failures: 0
```

### Selectors

```markdown
## DevTools MCP
selectors:
  main: main[role="main"]
  nav: header nav
  footer: footer
```

---

## Interactive Mode Examples

### Exploratory Testing

```bash
claude

> Navigate to http://localhost:8000
> Take a snapshot
> Click the "Sign Up" button (uid "signup-123")
> Fill the email field with "test@example.com"
> Check console for errors
> Take screenshot
```

### Debugging Session

```bash
claude

> Navigate to /dashboard/
> List console messages
> Get error details for msgid 5
> Evaluate script: () => ({ isLoggedIn: !!window.user })
> List network requests
> Get request details for reqid 23
```

### Multi-Tab Testing

```bash
claude

> Open /products/ in new tab
> Open /cart/ in new tab
> List all pages
> Switch to page 2
> Take screenshot
> Switch to page 3
> Take screenshot
```

---

## Tips & Tricks

### Batch Operations

```bash
# Test multiple pages at once
claude "test pages: /, /about/, /contact/, /blog/ on http://localhost:8000"
```

### Save Screenshots

```bash
# Specify output directory
claude "screenshot all pages and save to ./screenshots/"
```

### Quick Console Check

```bash
# Just check for errors, no full test
claude "navigate to /page/ and check console"
```

### Performance Budget

```bash
# Set expectations
claude "measure LCP for homepage, should be under 2.5s"
```

### Network Filter

```bash
# Only check API calls
claude "list XHR and fetch requests on /api/"
```

---

**See also:**
- [examples-testing.md](examples-testing.md) — Quick Start, Testing Local Development, Testing Live Sites, Console Debugging, Visual Testing, Form Testing
- `workflows/` for detailed workflow guides
- `docs/tools-reference-actions.md` and `docs/tools-reference-analysis.md` for complete MCP tool documentation
- `docs/troubleshooting-setup.md` for common issues

---

**Last updated:** February 12, 2026
