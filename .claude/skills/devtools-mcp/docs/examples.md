# DevTools MCP Usage Examples

Practical examples for common testing and debugging scenarios.

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Local Development](#testing-local-development)
- [Testing Live Sites](#testing-live-sites)
- [Debugging Console Errors](#debugging-console-errors)
- [Visual Testing](#visual-testing)
- [Form Testing](#form-testing)
- [Performance Analysis](#performance-analysis)
- [Mobile Testing](#mobile-testing)
- [Network Debugging](#network-debugging)
- [Accessibility Testing](#accessibility-testing)

---

## Quick Start

### Verify Your Setup

```bash
# Check MCP connection
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs

# Should show all checks passed
```

### Test Auto-Detection

```bash
# From your project directory
cd /path/to/project

# Detect dev server config
node ${PAI_DIR}/skills/devtools-mcp/lib/auto-detect.mjs

# Should show framework, port, URL
```

### First Smoke Test

```bash
# Start dev server
pnpm dev

# In another terminal
claude "run smoke test"
```

---

## Testing Local Development

### Gatsby Project

```bash
# Project structure
cd /path/to/gatsby-site

# Auto-detected config
{
  "framework": "gatsby",
  "port": 8000,
  "url": "http://localhost:8000"
}

# Run tests
claude "smoke test on http://localhost:8000"
claude "screenshot homepage at mobile and desktop sizes"
claude "check console errors on /about/"
```

### Next.js Project

```bash
cd /path/to/nextjs-app

# Auto-detected config
{
  "framework": "next",
  "port": 3000,
  "url": "http://localhost:3000"
}

# Run tests
claude "test this site"  # Uses auto-detected URL
claude "check if /api/users endpoint returns data"
```

### Vite Project

```bash
cd /path/to/vite-app

# Auto-detected config
{
  "framework": "vite",
  "port": 5173,
  "url": "http://localhost:5173"
}

# Quick health check
claude "navigate to localhost:5173 and check for console errors"
```

### Custom Port

If your dev server uses a non-standard port:

```bash
# Add to CLAUDE.md
## DevTools MCP
url: http://localhost:4000
```

Or specify at runtime:
```bash
claude "test http://localhost:4000"
```

---

## Testing Live Sites

### Production Site

```bash
# No dev server needed
claude "smoke test https://www.example.com"
```

Output:
```
✅ Smoke Test Passed

Tested 1 page:
  ✅ / - OK

0 console errors
0 network failures
All a11y landmarks present
```

### Staging Environment

```bash
# Test staging before production deploy
claude "test https://staging.example.com pages: /, /about/, /contact/"
```

### Compare Production vs Staging

```bash
# Production
claude "screenshot https://www.example.com at 1920px"

# Staging
claude "screenshot https://staging.example.com at 1920px"

# Compare visually
```

---

## Debugging Console Errors

### Find All Errors

```bash
claude "check console errors on http://localhost:8000"
```

Output:
```
❌ Issues Found

Console Errors: 2
  1. TypeError: Cannot read property 'map' of undefined
     at ContactForm.render (contact.js:45:12)

  2. ReferenceError: initMap is not defined
     at window.onload (contact.js:102:8)

Recommendations:
1. Fix TypeError in contact.js:45 - check if data exists before mapping
2. Ensure Google Maps script loads before initMap is called
```

### Debug Specific Page

```bash
claude "I'm seeing errors on /checkout/, get the full stack traces"
```

### Interactive Debugging

```bash
claude

> Navigate to /dashboard/
> List console messages
> Get message details for msgid 3
> Take screenshot of error state
```

---

## Visual Testing

### Responsive Breakpoints

```bash
claude "screenshot homepage at 375px, 768px, 1920px widths"
```

Creates:
```
screenshots/
├── home-375px.png
├── home-768px.png
└── home-1920px.png
```

### Dark Mode

```bash
claude "screenshot /about/ in light and dark mode at 1920px"
```

### Full Page Screenshots

```bash
claude "take full-page screenshot of /blog/ at desktop size"
```

### Multi-Page Visual Test

```bash
claude "screenshot all pages (/, /about/, /contact/) at mobile size"
```

### Before/After Comparison

```bash
# Before changes
claude "screenshot homepage at 1920px and save to baseline.png"

# Make changes in code

# After changes
claude "screenshot homepage at 1920px and save to current.png"

# Compare manually or with image diff tool
```

---

## Form Testing

### Contact Form

```bash
claude "test the contact form at /contact/"
```

Claude will:
1. Navigate to page
2. Take snapshot to find form fields
3. Fill with test data
4. Submit
5. Check for errors
6. Report results

### Login Form

```bash
claude "fill login form with username 'test@example.com' and password 'test123', then submit"
```

### Multi-Step Form

```bash
claude

> Navigate to /checkout/
> Fill shipping form with test data
> Click "Next"
> Fill payment form
> Check for validation errors
```

### File Upload

```bash
claude "upload /tmp/test-document.pdf to the file upload form at /upload/"
```

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

**Next Steps:**
- See `workflows/` for detailed workflow guides
- See `tools-reference.md` for complete MCP tool documentation
- See `troubleshooting.md` for common issues

---

**Last updated:** February 12, 2026
