# Smoke Test

Run `bootstrap.md` first (2-3 tool calls max).

Then execute these steps using DIRECT MCP tool calls (not `claude mcp call`):

## Step 1: Navigate
Call `navigate_page` with url from bootstrap.

## Step 2: Console errors
Call `list_console_messages` with types=["error", "warn"].

## Step 3: Network failures
Call `list_network_requests` with resourceTypes=["xhr", "fetch", "document"].

## Step 4: A11y snapshot
Call `take_snapshot`. Check for main, nav, heading hierarchy.

## Step 5: Report
```
✅/❌ Smoke Test
Console: N errors, N warnings
Network: N failures
A11y: landmarks present/missing
```

For multi-page: repeat steps 1-4 per page. Default: just `/`.

**Critical failures:** JS errors, requests >= 400, missing main landmark.
**Non-critical:** warnings, slow loads.
