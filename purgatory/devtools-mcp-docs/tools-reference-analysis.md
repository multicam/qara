# Chrome DevTools MCP Tools Reference: Analysis & Debugging

Part of DevTools MCP docs. See also: [tools-reference-actions.md](tools-reference-actions.md)

Reference for performance, network, and debugging tools, plus workflow best practices, common patterns, and tips & tricks (10 of 26 total tools).

**MCP Server Version:** 0.16.0
**Last Updated:** February 12, 2026

## Table of Contents

- [Performance](#performance) (3 tools)
- [Network](#network) (2 tools)
- [Debugging](#debugging) (5 tools)
- [Workflow Best Practices](#workflow-best-practices)
- [Common Patterns](#common-patterns)
- [Tips & Tricks](#tips--tricks)

---

## Performance

### performance_start_trace
Begin performance recording.

**Parameters:**
- `reload` (required) - Auto-reload page after starting trace
- `autoStop` (required) - Auto-stop trace after page load
- `filePath` (optional) - Save raw trace data to file (`.json` or `.json.gz`)

**Example:**
```
Start performance trace with reload=true and autoStop=true
Start trace and save to /tmp/trace.json.gz
```

### performance_stop_trace
End performance recording and get trace data.

**Parameters:**
- `filePath` (optional) - Save raw trace data to file

**Returns:**
- Performance insights, Core Web Vitals, trace data

**Example:**
```
Stop performance trace
Stop trace and save to /tmp/performance.json.gz
```

### performance_analyze_insight
Get detailed breakdown of specific performance insight.

**Parameters:**
- `insightSetId` (required) - Insight set ID from trace results
- `insightName` (required) - Insight name (e.g., "LCPBreakdown", "DocumentLatency")

**Common Insight Names:**
- `LCPBreakdown` - Largest Contentful Paint analysis
- `DocumentLatency` - Document loading phases
- `RenderBlocking` - Render-blocking resources
- `CLSCulprits` - Cumulative Layout Shift causes

**Example:**
```
Analyze LCPBreakdown for insight set "abc123"
Get DocumentLatency breakdown
```

---

## Network

### get_network_request
Get detailed request/response data.

**Parameters:**
- `reqid` (optional) - Request ID from `list_network_requests` (omit for currently selected request)
- `requestFilePath` (optional) - Save request body to file
- `responseFilePath` (optional) - Save response body to file

**Returns:**
- Request/response headers, body, timing, status, size

**Example:**
```
Get network request details for reqid 45
Get request 12 and save response to /tmp/response.json
```

### list_network_requests
List network requests with filtering and pagination.

**Parameters:**
- `resourceTypes` (optional) - Filter by type (see types below)
- `pageIdx` (optional) - Page number (0-based)
- `pageSize` (optional) - Max requests per page
- `includePreservedRequests` (optional) - Include requests from last 3 navigations

**Resource Types:**
- `document` - HTML pages
- `stylesheet` - CSS files
- `image` - Images (JPG, PNG, SVG, etc.)
- `media` - Audio/video
- `font` - Web fonts
- `script` - JavaScript
- `xhr` - XMLHttpRequest
- `fetch` - Fetch API
- `websocket` - WebSocket connections
- `other` - Other resources

**Examples:**
```
List all XHR and fetch requests
List network requests of type "image"
List requests page 2 with 50 items per page
List all network requests including preserved ones
```

---

## Debugging

### evaluate_script
Execute JavaScript in page context.

**Parameters:**
- `function` (required) - JavaScript function declaration
- `args` (optional) - Array of `{uid}` objects for element arguments

**Returns:**
- JSON-serializable result

**Examples:**
```javascript
// Get page info
() => {
  return {
    title: document.title,
    url: window.location.href,
    links: document.querySelectorAll('a').length
  };
}

// Get element text
(el) => { return el.innerText; }
// Pass args: [{uid: "element-123"}]

// Async function
async () => {
  const response = await fetch('/api/data');
  return await response.json();
}

// Check page state
() => {
  return {
    hasJQuery: typeof jQuery !== 'undefined',
    hasReact: typeof React !== 'undefined',
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}
```

### get_console_message
Get console message details by ID (with source maps).

**Parameters:**
- `msgid` (required) - Message ID from `list_console_messages`

**Returns:**
- Detailed message with stack traces, arguments, source location

**Example:**
```
Get console message details for msgid 5
Get full stack trace for error msgid 3
```

### list_console_messages
List console logs with filtering and pagination.

**Parameters:**
- `types` (optional) - Filter by message type (see types below)
- `pageIdx` (optional) - Page number (0-based)
- `pageSize` (optional) - Max messages per page
- `includePreservedMessages` (optional) - Include messages from last 3 navigations

**Message Types:**
- `log` - console.log
- `debug` - console.debug
- `info` - console.info
- `error` - console.error (JavaScript exceptions)
- `warn` - console.warn
- `dir` - console.dir
- `table` - console.table
- `trace` - console.trace
- `assert` - console.assert

**Examples:**
```
List all error and warn messages
List all console messages of type "error"
List messages page 1 with 20 items per page
```

### take_screenshot
Capture page, viewport, or element screenshot.

**Parameters:**
- `uid` (optional) - Element UID to screenshot (omit for full page/viewport)
- `fullPage` (optional) - Capture entire page (incompatible with uid)
- `format` (optional) - `"png"` (default), `"jpeg"`, `"webp"`
- `quality` (optional) - Compression quality 0-100 (JPEG/WebP only)
- `filePath` (optional) - Save to file instead of returning inline

**Examples:**
```
Take screenshot of the viewport
Take screenshot of the entire page (fullPage=true)
Take screenshot of element uid "hero-section"
Take JPEG screenshot with quality 85
Take screenshot and save to /tmp/page.png
```

### take_snapshot
Get text-based accessibility tree with UIDs for element targeting.

**Parameters:**
- `verbose` (optional) - Include all a11y tree information
- `filePath` (optional) - Save snapshot to file

**Returns:**
- Text-based element tree with UIDs
- Indicates currently selected element in DevTools
- Shows element roles, labels, states

**Example:**
```
Take a snapshot of the current page
Take verbose snapshot with all a11y info
Take snapshot and save to /tmp/snapshot.txt
```

**Note:** Always use `take_snapshot` before interacting with elements to get their UIDs.

---

## Workflow Best Practices

1. **take_snapshot first** - Get element UIDs before clicking/filling
2. **Prefer fill_form** - Use batch operation for multiple fields
3. **Wait for dynamic content** - Use `wait_for` after navigation
4. **Network monitoring** - List requests before navigating to capture all
5. **Performance traces** - Use `autoStop: true` for automatic capture
6. **Element targeting** - UIDs from snapshot are the most reliable selectors
7. **Screenshots for debugging** - Capture visual state when errors occur
8. **Console monitoring** - Check for errors before reporting success
9. **Error handling** - Use `handle_dialog` to manage unexpected popups
10. **Pagination** - Use `pageSize` and `pageIdx` for large result sets

## Common Patterns

### Form Submission
```
1. Navigate to page
2. Take snapshot
3. fill_form with all field values
4. Click submit button
5. wait_for confirmation message
6. Check console for errors
7. Take screenshot of result
```

### Performance Analysis
```
1. performance_start_trace with reload=true, autoStop=true
2. Wait for trace to complete
3. performance_analyze_insight for LCPBreakdown
4. Review Core Web Vitals
5. Save trace file for further analysis
```

### Debugging Errors
```
1. Navigate to page
2. list_console_messages with types: ["error", "warn"]
3. get_console_message for each error ID
4. take_screenshot of error state
5. list_network_requests to check for failures
6. evaluate_script to inspect page state
```

### Visual Testing
```
1. Navigate to page
2. resize_page to target viewport
3. Wait for layout to settle
4. take_screenshot
5. emulate colorScheme="dark"
6. take_screenshot
7. Reset with colorScheme="auto"
```

### Mobile Testing
```
1. emulate viewport with isMobile=true, hasTouch=true
2. emulate networkConditions="Slow 3G"
3. Navigate to page
4. Test interactions with touch events
5. Check layout with take_screenshot
```

## Tips & Tricks

### Getting Element UIDs
Always take a snapshot first:
```
Take a snapshot to see all interactive elements
```

The snapshot shows elements with their UIDs like:
```
[123] button "Submit"
[124] input "Email"
[125] link "Learn More"
```

### Checking Request Status
Filter network requests by status:
```
List all network requests
```

Then check status codes in results:
- 200-299: Success
- 300-399: Redirect
- 400-499: Client error
- 500-599: Server error

### Dark Mode Testing
```
Emulate dark mode, take screenshots of all pages
```

Then manually inspect screenshots for contrast issues.

### Slow Network Testing
```
Emulate Slow 3G, navigate to page, check load time
```

Helps identify performance issues on slow connections.

### Multi-Page Testing
```
Open multiple tabs, switch between them with select_page
```

Useful for testing multi-step flows or comparing pages.

---

**Official Documentation:** [Chrome DevTools MCP GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)

**Related Workflows:**
- `workflows/smoke-test.md` - Uses navigation + console + network tools
- `workflows/visual-test.md` - Uses emulate + resize + screenshot tools
- `workflows/debug-console.md` - Uses console + network debugging tools
- `workflows/performance.md` - Uses performance trace tools
- `workflows/interactive.md` - Natural language interface to all tools
