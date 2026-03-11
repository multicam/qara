# Live Website Testing

Run `bootstrap.md` first (2-3 tool calls max).

**Safety:** Read-only. No form submissions, no mutations, no auth pages.

Then execute using DIRECT MCP tool calls (not `claude mcp call`):

## Step 1: Navigate
Call `navigate_page` with url. Note status and redirects.

## Step 2: Console
Call `list_console_messages` with types=["error", "warn"].

## Step 3: Network
Call `list_network_requests`. Flag: 4xx, 5xx, mixed content, CORS, slow (>3s).

## Step 4: Screenshots
For Mobile (375x812), Tablet (768x1024), Desktop (1440x900):
Call `resize_page` + `take_screenshot`.

## Step 5: A11y quick check
Call `evaluate_script`:
```js
document.querySelectorAll('[role="main"],main,[role="navigation"],nav,header,footer').length
```

## Multi-page
If `--pages` specified, repeat for each page.

## Report
Per page: status, errors, failures, screenshots. Summary: total passed/failed.
