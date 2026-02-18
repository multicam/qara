---
name: devtools-mcp
context: fork
model: sonnet
description: |
  Browser automation via Chrome DevTools MCP. Direct tool access.
---

# DevTools MCP

You have DIRECT access to MCP tools. Call them immediately. No setup needed.

## Rules (CRITICAL — violating these wastes minutes)

1. **NO exploration.** Never read project source, configs, package.json, framework files, or files in this skill's lib/ or docs/ directories.
2. **NO verification.** Never run `claude mcp list`, `ps aux`, `lsof`, `curl`, or check processes. If an MCP tool fails, report the error and stop.
3. **NO bash for MCP work.** Never shell out to `claude mcp call`. Call MCP tools directly.
4. **Snapshot after every action.** DOM refs go stale after any click/type/navigate. Re-snapshot.
5. **Prefer take_snapshot over take_screenshot.** Text costs fewer tokens than images.
6. **3 tool calls max before doing real work.** If you've made 3 calls and haven't started the actual task, you're off track.

## URL

Priority: 1) URL the user provided → 2) Project's CLAUDE.md `## DevTools MCP` url field → 3) Ask the user.
DO NOT auto-detect from package.json or guess ports.

## MCP Tools

**Navigate:** navigate_page, wait_for, new_page, select_page, list_pages, close_page
**Input:** click, fill, fill_form, press_key, hover, drag, upload_file, handle_dialog
**Inspect:** take_snapshot, take_screenshot, list_console_messages, get_console_message, list_network_requests, get_network_request, evaluate_script
**Emulate:** emulate, resize_page
**Performance:** performance_start_trace, performance_stop_trace, performance_analyze_insight

## Recipes

### Smoke Test
1. navigate_page → 2. list_console_messages types=["error","warn"] → 3. list_network_requests resourceTypes=["xhr","fetch","document"] → 4. take_snapshot (check main, nav, headings)
**Pass:** 0 JS errors, 0 failed requests (status >=400), main landmark present.

### Debug Console
1. navigate_page → 2. list_console_messages types=["error","warn"] → 3. get_console_message per error (stack traces) → 4. list_network_requests → 5. get_network_request per failure

### Visual Test
Per viewport (mobile 375x812, tablet 768x1024, desktop 1920x1080):
navigate_page → resize_page → take_screenshot
Dark mode: emulate colorScheme="dark" → screenshot → emulate colorScheme="light"

### Performance
1. performance_start_trace reload=true autoStop=true → 2. performance_analyze_insight "LCPBreakdown" → 3. Report: LCP (good <=2.5s), FID (good <=100ms), CLS (good <=0.1)

### Accessibility
1. navigate_page → 2. take_snapshot verbose=true (check landmarks) → 3. evaluate_script (heading hierarchy check) → 4. press_key Tab x5-10 + take_snapshot (keyboard nav)

### Interactive
Follow user instructions using the tools above. No predefined sequence.

### Component Debug (requires --grab / react-grab MCP)
1. navigate_page → 2. list_console_messages → 3. User selects element → 4. get_element_context → 5. Read source file:line → 6. Propose fix

### Live Test
Same as any recipe above, but with a live URL (staging/production) instead of localhost. No special handling needed — just use the URL the user provides.
