# Chrome DevTools MCP Tools Reference

Complete reference for all 26 tools available through the DevTools MCP skill.

**MCP Server Version:** 0.16.0
**Last Updated:** February 12, 2026

## Table of Contents

- [Input Automation](#input-automation) (8 tools)
- [Navigation Automation](#navigation-automation) (6 tools)
- [Emulation](#emulation) (2 tools)
- [Performance](#performance) (3 tools)
- [Network](#network) (2 tools)
- [Debugging](#debugging) (5 tools)
- [Workflow Best Practices](#workflow-best-practices)
- [Common Patterns](#common-patterns)

---

## Input Automation

### click
Click or double-click an element.

**Parameters:**
- `uid` (required) - Element UID from snapshot
- `dblClick` (optional) - Set `true` for double-click
- `includeSnapshot` (optional) - Return updated snapshot after action

**Example:**
```
Take a snapshot, then click the button with uid "123"
```

### drag
Drag one element onto another.

**Parameters:**
- `from_uid` (required) - Source element UID
- `to_uid` (required) - Target element UID
- `includeSnapshot` (optional) - Return updated snapshot

**Example:**
```
Drag element uid "file-1" onto uid "folder-2"
```

### fill
Type text into input/textarea or select dropdown option.

**Parameters:**
- `uid` (required) - Element UID
- `value` (required) - Text to type or option to select
- `includeSnapshot` (optional) - Return updated snapshot

**Example:**
```
Fill the email input (uid "email-input") with "user@example.com"
```

### fill_form
Fill multiple form fields at once (batch operation).

**Parameters:**
- `elements` (required) - Array of `{uid, value}` objects
- `includeSnapshot` (optional) - Return updated snapshot

**Example:**
```
Fill the login form:
- uid "username" with "john"
- uid "password" with "secret123"
```

### handle_dialog
Accept or dismiss browser dialogs (alert/confirm/prompt).

**Parameters:**
- `action` (required) - `"accept"` or `"dismiss"`
- `promptText` (optional) - Text to enter for prompt dialogs

**Example:**
```
Accept the confirmation dialog
```

### hover
Hover over an element to trigger tooltips/menus.

**Parameters:**
- `uid` (required) - Element UID
- `includeSnapshot` (optional) - Return updated snapshot

**Example:**
```
Hover over the help icon (uid "help-123") to show tooltip
```

### press_key
Press keyboard key or key combination.

**Parameters:**
- `key` (required) - Key name or combination (e.g., "Enter", "Control+A")
- `includeSnapshot` (optional) - Return updated snapshot

**Modifiers:** Control, Shift, Alt, Meta

**Examples:**
```
Press "Enter" to submit
Press "Control+A" to select all
Press "Control++" to zoom in
Press "Escape" to close dialog
```

### upload_file
Upload file through file input element.

**Parameters:**
- `uid` (required) - File input element UID
- `filePath` (required) - Local path to file
- `includeSnapshot` (optional) - Return updated snapshot

**Example:**
```
Upload "/tmp/document.pdf" to file input uid "file-upload"
```

---

## Navigation Automation

### close_page
Close browser tab/window by ID.

**Parameters:**
- `pageId` (required) - Page ID from `list_pages`

**Note:** Cannot close the last open page.

**Example:**
```
Close page with ID 2
```

### list_pages
List all open browser pages with IDs.

**Returns:**
- Array of pages with ID, URL, title

**Example:**
```
List all open pages
```

### navigate_page
Navigate to URL, browser history, or reload.

**Parameters:**
- `type` (optional) - `"url"`, `"back"`, `"forward"`, `"reload"` (default: url)
- `url` (optional) - Target URL (required if type=url)
- `ignoreCache` (optional) - Ignore cache on reload
- `timeout` (optional) - Max wait time in milliseconds
- `handleBeforeUnload` (optional) - `"accept"` or `"decline"` for beforeunload dialogs
- `initScript` (optional) - JavaScript to execute on each new document

**Examples:**
```
Navigate to http://localhost:8000
Navigate back in history
Reload the page ignoring cache
Navigate to /about/ with 30 second timeout
```

### new_page
Open new browser tab/window.

**Parameters:**
- `url` (required) - URL to load
- `background` (optional) - Open in background without focus
- `timeout` (optional) - Max wait time in milliseconds

**Example:**
```
Open https://example.com in a new tab
Open /dashboard/ in background tab
```

### select_page
Switch active page context for subsequent operations.

**Parameters:**
- `pageId` (required) - Page ID from `list_pages`
- `bringToFront` (optional) - Focus page and bring to top

**Example:**
```
Switch to page ID 2
Select page 1 and bring to front
```

### wait_for
Wait for specific text to appear on page.

**Parameters:**
- `text` (required) - Text to wait for
- `timeout` (optional) - Max wait time in milliseconds

**Example:**
```
Wait for "Loading complete" to appear
Wait for "Welcome" with 10 second timeout
```

---

## Emulation

### emulate
Device emulation, network throttling, CPU throttling, geolocation, user agent, color scheme.

**Parameters:**
- `viewport` (optional) - `{width, height, deviceScaleFactor, isMobile, hasTouch, isLandscape}` or `null` to reset
- `networkConditions` (optional) - `"No emulation"`, `"Offline"`, `"Slow 3G"`, `"Fast 3G"`, `"Slow 4G"`, `"Fast 4G"`
- `cpuThrottlingRate` (optional) - CPU slowdown factor (1-20, 1=no throttling)
- `geolocation` (optional) - `{latitude, longitude}` or `null` to clear
- `userAgent` (optional) - Custom user agent string or `null` to clear
- `colorScheme` (optional) - `"dark"`, `"light"`, or `"auto"` to reset

**Examples:**
```
Emulate iPhone 12 viewport: width=390, height=844, deviceScaleFactor=3, isMobile=true, hasTouch=true
Emulate Slow 3G network
Emulate dark mode
Set geolocation to San Francisco: latitude=37.7749, longitude=-122.4194
Set CPU throttling to 4x slowdown
```

### resize_page
Change window/viewport dimensions.

**Parameters:**
- `width` (required) - Page width in pixels
- `height` (required) - Page height in pixels

**Example:**
```
Resize page to 1280x720
Resize to mobile size: 375x812
```

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
