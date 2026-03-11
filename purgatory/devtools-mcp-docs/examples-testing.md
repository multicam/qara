# DevTools MCP Examples: Testing & Debugging

Part of DevTools MCP docs. See also: [examples-advanced.md](examples-advanced.md)

Practical examples for quick start, local development testing, live site testing, console debugging, visual testing, and form testing.

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Local Development](#testing-local-development)
- [Testing Live Sites](#testing-live-sites)
- [Debugging Console Errors](#debugging-console-errors)
- [Visual Testing](#visual-testing)
- [Form Testing](#form-testing)

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

**Continue reading:**
- [examples-advanced.md](examples-advanced.md) — Performance Analysis, Mobile Testing, Network Debugging, Accessibility Testing, Real-World Scenarios, CLAUDE.md Integration, Interactive Mode, Tips & Tricks

**See also:**
- `workflows/` for detailed workflow guides
- `docs/tools-reference-actions.md` and `docs/tools-reference-analysis.md` for complete MCP tool documentation
- `docs/troubleshooting-setup.md` for common issues

---

**Last updated:** February 12, 2026
