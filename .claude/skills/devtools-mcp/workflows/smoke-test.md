---
workflow: smoke-test
description: Quick health check for websites (console, network, a11y)
tools: [navigate_page, wait_for, list_console_messages, list_network_requests, take_snapshot]
---

# Smoke Test Workflow

Quick health check that validates core functionality of a website without deep testing.

## Purpose

Detect critical issues fast:
- ✅ Pages load successfully
- ✅ No console errors
- ✅ No network failures
- ✅ Basic accessibility landmarks present

## MCP Tools Used

1. **navigate_page** - Load pages
2. **wait_for** - Wait for content to appear
3. **list_console_messages** - Check for console errors
4. **list_network_requests** - Check for failed requests
5. **take_snapshot** - Verify a11y tree structure

## Workflow Steps

### 1. Verify MCP Connection

Before starting, ensure MCP is connected:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
```

### 2. Build Target URL

Determine what to test:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/url-builder.mjs [project-path] [optional-url]
```

### 3. Start Server (if localhost)

If testing localhost, start dev server:
```bash
# Check if server is needed
if url.startsWith('http://localhost'); then
  # Start dev server
  pnpm dev &

  # Wait for server to be ready
  while ! curl -s http://localhost:8000 > /dev/null; do
    sleep 1
  done
fi
```

### 4. Run Smoke Test

For each page to test:

#### A. Navigate to page
```
navigate_page to {url}{path}
```

#### B. Wait for core content
```
wait_for text="[key content indicator]"
```

#### C. Check console for errors
```
list_console_messages with types=["error", "warn"]
```

**Pass criteria:**
- 0 console errors (critical)
- < 3 warnings (acceptable)

#### D. Check network requests
```
list_network_requests with resourceTypes=["xhr", "fetch", "document"]
```

**Pass criteria:**
- 0 failed requests (status >= 400)
- 0 blocked requests

#### E. Verify accessibility
```
take_snapshot
```

**Pass criteria:**
- Has `<main>` landmark
- Has navigation (`<nav>`)
- Has proper heading hierarchy

### 5. Report Results

Return structured JSON:

```json
{
  "passed": boolean,
  "totalPages": number,
  "passedPages": number,
  "failedPages": number,
  "results": [
    {
      "url": string,
      "passed": boolean,
      "checks": {
        "navigation": { "passed": boolean, "error": string },
        "console": { "passed": boolean, "errorCount": number, "errors": [] },
        "network": { "passed": boolean, "failureCount": number, "failures": [] },
        "accessibility": { "passed": boolean, "issues": [] }
      },
      "screenshot": string  // If failed
    }
  ],
  "summary": {
    "totalErrors": number,
    "criticalIssues": number,
    "timestamp": string
  }
}
```

## Default Page List

If no pages specified:
- `/` (homepage)

If project has CLAUDE.md with pages:
- Use pages from config

## Example Usage

### Test local dev server (auto-detected)
```bash
cd /path/to/project
claude "run smoke test"
```

### Test live production
```bash
claude "smoke test https://example.com"
```

### Test specific pages
```bash
claude "smoke test on / and /about/ and /contact/"
```

### Test with custom thresholds
```bash
claude "smoke test with 0 console errors allowed"
```

## Critical vs Non-Critical

**Critical failures (fail immediately):**
- Page doesn't load (network error, 404, 500)
- JavaScript errors in console
- Failed API requests (xhr/fetch with status >= 400)
- Missing main landmark

**Non-critical issues (warn only):**
- Console warnings (not errors)
- Slow load times (> 3s)
- Minor a11y issues (missing alt text on decorative images)

## Output

### On Success
```
✅ Smoke Test Passed

Tested 3 pages:
  ✅ / - OK
  ✅ /about/ - OK
  ✅ /contact/ - OK

0 console errors
0 network failures
All a11y landmarks present
```

### On Failure
```
❌ Smoke Test Failed

Tested 3 pages:
  ✅ / - OK
  ❌ /about/ - FAILED
  ✅ /contact/ - OK

Issues found on /about/:
  ❌ Console errors: 2
     - TypeError: Cannot read property 'map' of undefined (line 45)
     - ReferenceError: initMap is not defined (line 102)
  ✅ Network: OK (0 failures)
  ⚠️  A11y: Missing navigation landmark

Screenshots attached for failed pages.
```

## Integration with Other Workflows

**Smoke test is the first step** before:
- Visual testing (no point if pages don't load)
- Performance testing (fix errors first)
- Full test suite (smoke test is the gate)

**After smoke test passes:**
- Run `visual-test.md` for screenshot validation
- Run `performance.md` for Core Web Vitals
- Run full test suite for comprehensive coverage

## Customization via CLAUDE.md

```markdown
## DevTools MCP
url: http://localhost:8000
pages:
  - /
  - /courses/
  - /contact/
  - /handbook/
selectors:
  main: main[role="main"]
  nav: header nav
  footer: footer
thresholds:
  console_errors: 0
  console_warnings: 5
  network_failures: 0
```

## Troubleshooting

### Page doesn't load
- Check dev server is running: `curl http://localhost:8000`
- Check port is correct: `lsof -i :8000`
- Check URL is correct: `echo $TARGET_URL`

### False positive console errors
- Filter out third-party errors (ads, analytics)
- Check error origin (same-origin vs cross-origin)
- Add thresholds in CLAUDE.md if acceptable

### Network failures from CDN
- Check CDN is reachable: `curl https://cdn.example.com/file.js`
- May need to allow external domains
- Check if localhost can reach external resources

### MCP timeout
- Increase timeout in navigate_page: `timeout: 60000`
- Check network is stable
- Try on simpler page first

---

**Status:** Priority 1 - Foundation (Complete)
**Version:** 0.1.0
**Last updated:** February 12, 2026
