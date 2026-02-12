---
workflow: debug-console
description: Debug console errors and network issues
tools: [navigate_page, list_console_messages, get_console_message, list_network_requests, get_network_request]
---

# Debug Console Workflow

Diagnose and debug console errors, warnings, and network issues in web applications.

## Purpose

Debugging assistance:
- ✅ Identify console errors and warnings
- ✅ Get detailed error messages with stack traces
- ✅ Detect network failures and slow requests
- ✅ Analyze request/response data
- ✅ Find root cause of client-side issues

## MCP Tools Used

1. **navigate_page** - Load pages
2. **list_console_messages** - Get all console messages
3. **get_console_message** - Get detailed error info
4. **list_network_requests** - Get network activity
5. **get_network_request** - Get request details

## Workflow Steps

### 1. Navigate to Problem Page

```
navigate_page to {url}
```

Let page fully load before checking console.

### 2. List Console Messages

```
list_console_messages with types=["error", "warn"]
```

This returns:
- Message type (error, warn, info, log)
- Message text
- Source file and line number
- Timestamp
- Message ID (for details)

### 3. Get Error Details

For each error found:
```
get_console_message with msgid={id}
```

This returns:
- Full error message
- Stack trace
- Arguments
- Source location
- Context

### 4. Check Network Requests

```
list_network_requests with resourceTypes=["xhr", "fetch", "document"]
```

Look for:
- Status >= 400 (client/server errors)
- Status = 0 (blocked/CORS issues)
- Slow requests (> 3s)
- Large responses (> 1MB)

### 5. Get Request Details

For failed/slow requests:
```
get_network_request with reqid={id}
```

This returns:
- Request URL, method, headers
- Response status, headers, body
- Timing information
- Size information

### 6. Report Findings

Return structured JSON with:
- All errors found
- Stack traces
- Network failures
- Recommendations

## Output Format

```json
{
  "passed": false,
  "url": "http://localhost:8000/contact/",
  "timestamp": "2026-02-12T10:00:00Z",
  "console": {
    "errorCount": 2,
    "warningCount": 3,
    "errors": [
      {
        "msgid": 1,
        "type": "error",
        "message": "TypeError: Cannot read property 'map' of undefined",
        "source": "contact.js:45:12",
        "stackTrace": [
          "at ContactForm.render (contact.js:45:12)",
          "at React.createElement (react.js:123:45)"
        ]
      }
    ],
    "warnings": [
      {
        "msgid": 3,
        "type": "warn",
        "message": "React Hook useEffect has missing dependency",
        "source": "contact.js:23:5"
      }
    ]
  },
  "network": {
    "totalRequests": 45,
    "failedRequests": 1,
    "slowRequests": 2,
    "failures": [
      {
        "reqid": 123,
        "url": "/api/contact",
        "method": "POST",
        "status": 500,
        "statusText": "Internal Server Error",
        "responseBody": "{\"error\": \"Database connection failed\"}"
      }
    ],
    "slow": [
      {
        "reqid": 456,
        "url": "/images/hero.jpg",
        "method": "GET",
        "status": 200,
        "duration": 4500,
        "size": 2100000
      }
    ]
  },
  "recommendations": [
    "Fix TypeError in contact.js:45 - check if data exists before mapping",
    "Add useEffect dependency: 'formData'",
    "Investigate 500 error from /api/contact endpoint",
    "Optimize hero.jpg - 2.1MB is too large (consider compression or WebP)"
  ]
}
```

## Common Use Cases

### Find All Errors
```bash
claude "Check console errors on /contact/"
```

Returns all errors with details.

### Debug Specific Error
```bash
claude "I'm seeing 'Cannot read property X' error on /about/, get the full stack trace"
```

### Check Network Failures
```bash
claude "List all failed network requests on /checkout/"
```

### Debug CORS Issues
```bash
claude "Check if there are any blocked requests on /api/data"
```

### Analyze Slow Requests
```bash
claude "Find all requests taking longer than 2 seconds on homepage"
```

### Review Warnings
```bash
claude "List all console warnings on /dashboard/"
```

## Message Types

### Errors (Critical)
- JavaScript exceptions
- Syntax errors
- Type errors
- Reference errors
- Network errors

### Warnings (Important)
- React/framework warnings
- Deprecation notices
- Performance warnings
- Security warnings

### Info (Informational)
- Debug logs
- API responses
- User actions
- State changes

### Log (Verbose)
- General logging
- Development info
- Trace data

## Network Issue Types

### Client Errors (4xx)
- **400 Bad Request** - Invalid request format
- **401 Unauthorized** - Auth required
- **403 Forbidden** - Permission denied
- **404 Not Found** - Resource missing
- **429 Too Many Requests** - Rate limited

### Server Errors (5xx)
- **500 Internal Server Error** - Server crashed
- **502 Bad Gateway** - Upstream server failed
- **503 Service Unavailable** - Server down
- **504 Gateway Timeout** - Request timeout

### Special Cases
- **0 (Blocked)** - CORS, CSP, or network blocked
- **-1 (Failed)** - Network error, DNS failure

## Filtering Options

### By Message Type
```
list_console_messages with types=["error"]          # Errors only
list_console_messages with types=["error", "warn"]  # Errors and warnings
```

### By Resource Type
```
list_network_requests with resourceTypes=["xhr", "fetch"]  # API calls
list_network_requests with resourceTypes=["script"]        # JavaScript
list_network_requests with resourceTypes=["image"]         # Images
```

### By Status Code
Manual filtering in results:
- Status >= 400: Errors
- Status >= 500: Server errors
- Status = 0: Blocked

## Advanced Debugging

### Get Request Body
```
get_network_request with reqid={id} and include requestBody
```

### Get Response Body
```
get_network_request with reqid={id} and include responseBody
```

### Check Request Headers
Look for:
- Authorization headers
- Content-Type
- CORS headers
- Custom headers

### Timing Breakdown
Analyze request phases:
- DNS lookup
- TCP connection
- TLS handshake
- Request send
- Wait (TTFB)
- Response download

## Troubleshooting Tips

### Uncaught Errors
**Symptom:** Error shows but no stack trace

**Fix:**
- Check source maps enabled
- Look at source file directly
- Add console.log before error line

### CORS Errors
**Symptom:** Blocked request, status = 0

**Fix:**
- Check server CORS headers
- Verify request origin matches allowed origins
- Check credentials mode

### Memory Leaks
**Symptom:** Page slow after time

**Check:**
- Console for warnings
- Network tab for growing requests
- Performance trace for memory growth

### Third-Party Errors
**Symptom:** Errors from external scripts

**Filter:**
- Ignore if from ads/analytics
- Check if affecting functionality
- Consider disabling if problematic

## Example Session

```bash
$ claude "Debug console errors on /contact/"

Claude: Navigating to /contact/...

[Checks console]

Found 2 errors and 1 warning:

❌ Error 1: TypeError: Cannot read property 'map' of undefined
   Source: contact.js:45:12
   Stack trace:
     at ContactForm.render (contact.js:45)
     at React.Component.render (react.js:123)

   Likely cause: Trying to map over undefined array.
   Fix: Add null check before mapping.

❌ Error 2: ReferenceError: initMap is not defined
   Source: contact.js:102:8
   Stack trace:
     at window.onload (contact.js:102)

   Likely cause: Google Maps script not loaded.
   Fix: Ensure Maps API script loads before initMap call.

⚠️  Warning: React Hook useEffect has missing dependency: 'formData'
   Source: contact.js:23:5

   Fix: Add 'formData' to dependency array.

[Checks network]

No failed network requests found.
All API calls returned 200 OK.

Summary:
- 2 critical errors found
- 1 warning (non-critical)
- Network is healthy
- Focus on fixing TypeError first
```

## Output Examples

### Clean Page
```
✅ No Issues Found

Console: 0 errors, 0 warnings
Network: 45 requests, all successful
Average load time: 1.2s
```

### With Errors
```
❌ Issues Found

Console Errors: 3
  1. TypeError in form.js:45
  2. ReferenceError in analytics.js:12
  3. Uncaught Promise rejection in api.js:67

Console Warnings: 5
  - React Hook warnings (3)
  - Deprecation notices (2)

Network Failures: 1
  - POST /api/submit → 500 Internal Server Error

Slow Requests: 2
  - GET /images/banner.jpg (4.2s, 3.1MB)
  - GET /fonts/custom.woff2 (2.8s, 1.5MB)

Priority Fixes:
1. Fix TypeError - blocking form submission
2. Fix 500 error - API endpoint broken
3. Optimize images - causing slow load
```

## Integration with Other Workflows

**After smoke test fails:**
- Use debug-console to find root cause
- Get detailed error messages
- Identify fix location

**Before visual test:**
- Check console is clean
- Fix errors that might affect rendering
- Verify network is stable

**During interactive testing:**
- Monitor console in real-time
- Check network after each action
- Debug issues as they appear

## Customization via CLAUDE.md

```markdown
## DevTools MCP
url: http://localhost:8000
debug:
  ignoreThirdParty: true
  ignoreWarnings: false
  minSlowRequestTime: 2000  # ms
  minLargeResponseSize: 1048576  # bytes
  includeSourceMaps: true
thresholds:
  console_errors: 0
  console_warnings: 5
  network_failures: 0
```

---

**Status:** Priority 3 - Additional Workflows
**Version:** 0.1.0
**Last updated:** February 12, 2026
