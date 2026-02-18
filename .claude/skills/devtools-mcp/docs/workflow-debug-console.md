# Debug Console

Run `bootstrap.md` first (2-3 tool calls max).

Then execute using DIRECT MCP tool calls (not `claude mcp call`):

## Step 1
Call `navigate_page` with url from bootstrap.

## Step 2
Call `list_console_messages` with types=["error", "warn"].

## Step 3
For each error, call `get_console_message` with its msgid. Returns stack trace and source location.

## Step 4
Call `list_network_requests` with resourceTypes=["xhr", "fetch", "document"]. Flag status >= 400 or status 0.

## Step 5
For failed requests, call `get_network_request` with reqid. Returns URL, headers, response body.

## Step 6: Report
For each issue: error message, source file:line, stack trace, recommended fix.
