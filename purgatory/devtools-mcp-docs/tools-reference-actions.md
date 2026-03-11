# Chrome DevTools MCP Tools Reference: Actions & Navigation

Part of DevTools MCP docs. See also: [tools-reference-analysis.md](tools-reference-analysis.md)

Reference for input automation, navigation automation, and emulation tools (16 of 26 total tools).

**MCP Server Version:** 0.16.0
**Last Updated:** February 12, 2026

## Table of Contents

- [Input Automation](#input-automation) (8 tools)
- [Navigation Automation](#navigation-automation) (6 tools)
- [Emulation](#emulation) (2 tools)

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

**Continue reading:**
- [tools-reference-analysis.md](tools-reference-analysis.md) — Performance, Network, Debugging tools + Workflow Best Practices, Common Patterns, Tips & Tricks

**Official Documentation:** [Chrome DevTools MCP GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
