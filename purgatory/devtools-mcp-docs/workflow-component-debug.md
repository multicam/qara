# Component Debug

Requires `--grab` flag (react-grab MCP active).

Run `bootstrap.md` first (2-3 tool calls max).

Then execute using DIRECT MCP tool calls (not `claude mcp call`):

## Step 1
Call `navigate_page` with url.

## Step 2
Call `list_console_messages` with types=["error", "warn"].

## Step 3
Ask user to Cmd+C / Ctrl+C the target element in browser.
Or call `evaluate_script`: `window.__REACT_GRAB__?.getContext(document.querySelector('.selector'))`

## Step 4
Call `get_element_context`. Returns: component name, file:line, props, state.

## Step 5
Read the identified source file:line. Cross-reference with console errors. Propose fix.

## Step 6
After fix: reload via `navigate_page`, re-check `list_console_messages`, `take_screenshot`.

**Fallback (no react-grab):** Use evaluate_script to check `__REACT_DEVTOOLS_GLOBAL_HOOK__` or search codebase by class/id.
