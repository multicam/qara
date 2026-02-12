---
workflow: interactive
description: Launch Claude with MCP for interactive browser testing
tools: [all MCP tools available]
---

# Interactive MCP Workflow

Launch Claude CLI with MCP server connected for exploratory testing and debugging.

## Purpose

Interactive mode gives you full control:
- ✅ Explore website with natural language
- ✅ Test forms, interactions, user flows
- ✅ Debug issues in real-time
- ✅ Take screenshots, check console, inspect network
- ✅ No predefined test script required

## Use Cases

### Exploratory Testing
"Navigate to /contact/, fill out the form, check for errors"

### Visual Debugging
"Take screenshots of /about/ at mobile, tablet, and desktop sizes"

### Form Testing
"Test the enrolment form - fill it out with test data and submit"

### Console Debugging
"Check console errors on the homepage, then navigate to /courses/"

### Network Debugging
"List all network requests on /checkout/, check for failures"

### Performance Analysis
"Start a performance trace, reload the homepage, stop and analyze"

## Workflow Steps

### 1. Verify MCP Connection

Before starting:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
```

Should show:
```
✅ All checks passed - MCP is ready
```

If not ready, see `docs/setup.md` for configuration.

### 2. Build Target URL

Determine what to test:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/url-builder.mjs
```

Output shows:
- URL (auto-detected or from CLAUDE.md)
- Type (localhost or live)
- Framework (if detected)
- Whether dev server is needed

### 3. Start Dev Server (if localhost)

If testing localhost:
```bash
# From project directory
pnpm dev

# Wait for server to be ready
curl http://localhost:8000
```

Or use the lifecycle helper:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/server-lifecycle.mjs start
```

### 4. Launch Claude Interactive

Start Claude CLI:
```bash
claude
```

You're now in interactive mode with MCP connected.

### 5. Available MCP Tools

**Navigation:**
- `navigate_page` - Load a URL
- `wait_for` - Wait for text/element
- `new_page` - Open new tab
- `select_page` - Switch tabs
- `list_pages` - See all open pages
- `close_page` - Close tab

**Input:**
- `click` - Click element
- `fill` - Fill form field
- `fill_form` - Fill multiple fields
- `press_key` - Press key/combination
- `hover` - Hover over element
- `drag` - Drag and drop
- `upload_file` - Upload file

**Inspection:**
- `take_snapshot` - Get a11y tree
- `take_screenshot` - Capture screenshot
- `list_console_messages` - Get console logs
- `get_console_message` - Get message details
- `list_network_requests` - Get network activity
- `get_network_request` - Get request details

**Emulation:**
- `emulate` - Dark mode, viewport, network
- `resize_page` - Change viewport size

**Performance:**
- `performance_start_trace` - Begin recording
- `performance_stop_trace` - End and save
- `performance_analyze_insight` - Get CWV

**Advanced:**
- `evaluate_script` - Run JavaScript
- `handle_dialog` - Handle alerts/confirms

### 6. Example Commands

**Basic navigation:**
```
Navigate to http://localhost:8000 and take a screenshot
```

**Console debugging:**
```
Navigate to /contact/, list console messages, and show me any errors
```

**Form testing:**
```
Fill out the contact form with test data:
- Name: Test User
- Email: test@example.com
- Message: Testing the form
Then submit and check for errors
```

**Multi-viewport screenshots:**
```
Take screenshots of the homepage at:
- 375px width (mobile)
- 768px width (tablet)
- 1920px width (desktop)
```

**Performance trace:**
```
Start a performance trace, navigate to /courses/, wait 5 seconds, stop the trace, and analyze Core Web Vitals
```

**Network analysis:**
```
Navigate to /checkout/, list all network requests, and show me any that failed
```

### 7. Exit Interactive Mode

When done:
```
exit
```

Or press `Ctrl+D`.

## Tips

### Start Simple
Begin with basic commands:
- "Navigate to URL"
- "Take screenshot"
- "Check console"

Then build complexity as needed.

### Use Natural Language
Claude understands conversational commands:
- ✅ "Go to the about page and take a screenshot"
- ✅ "Check if there are any console errors"
- ❌ "navigate_page('http://example.com')" (not necessary)

### Chain Actions
Combine multiple steps:
```
Navigate to /, wait for the hero section to load, take a screenshot,
then check console for errors
```

### Iterate Quickly
Make changes in your editor, then:
```
Reload the page and check if the error is fixed
```

### Save Screenshots
Request screenshots be saved:
```
Take screenshots of all pages at mobile size and save them to ./screenshots/
```

### Debug Specific Issues
Focus on the problem:
```
I'm seeing a JavaScript error on /contact/. Navigate there, list console
messages, and show me the error details with stack trace.
```

## Environment Variables

You can set these before launching Claude:

```bash
# Set default URL (overrides auto-detect)
export DEVTOOLS_MCP_URL=http://localhost:3000

# Set pages to test
export DEVTOOLS_MCP_PAGES="/,/about/,/contact/"

# Launch Claude
claude
```

## Integration with Other Workflows

**After interactive exploration:**
- Create automated smoke test based on findings
- Document issues found for bug fixes
- Add test cases to comprehensive test suite

**Before comprehensive testing:**
- Use interactive mode to understand the app
- Identify critical user flows to test
- Find edge cases to cover

## Troubleshooting

### MCP not connected
```
Error: MCP server not available
```

**Fix:**
1. Check MCP config exists
2. Restart Claude Desktop
3. Verify binary installed: `which chrome-devtools-mcp`

### Browser not launching
```
Error: Failed to launch browser
```

**Fix:**
1. Check browser path in config
2. Install Brave/Chrome if missing
3. Check permissions on browser binary

### Page not loading
```
Error: Navigation timeout
```

**Fix:**
1. Check dev server is running: `curl http://localhost:8000`
2. Check port is correct
3. Increase timeout: `navigate_page with timeout=60000`

### Screenshots not saving
**Fix:**
1. Provide explicit file path
2. Check directory exists
3. Check write permissions

## Advanced Usage

### Custom Scripts

Run custom JavaScript:
```
evaluate_script:
function: () => {
  return {
    title: document.title,
    links: document.querySelectorAll('a').length,
    images: document.querySelectorAll('img').length
  };
}
```

### Dark Mode Testing
```
Emulate dark mode, navigate to homepage, take screenshot
```

### Network Throttling
```
Emulate Slow 3G network, navigate to /courses/, check load time
```

### Mobile Testing
```
Resize page to 375x812, emulate mobile user agent, test the mobile menu
```

## Example Session

```bash
$ claude

Claude: How can I help you?

You: Navigate to http://localhost:8000

Claude: [navigates, shows page info]

You: Take a screenshot

Claude: [takes screenshot, shows it]

You: Check console for errors

Claude: [lists console messages]
Found 2 errors:
1. TypeError: Cannot read property 'map' of undefined (line 45)
2. ReferenceError: initMap is not defined (line 102)

You: Navigate to /contact/ and test the form

Claude: [navigates, shows form fields]
I can see the contact form with fields: name, email, message, submit button.
What would you like me to test?

You: Fill it with test data and submit

Claude: [fills form, submits]
Form submitted successfully. Checking console...
No errors found.

You: Great! Take a screenshot of the success message

Claude: [takes screenshot]

You: exit

$ # Back to terminal
```

---

**Status:** Priority 2 - Core Functionality (Complete)
**Version:** 0.1.0
**Last updated:** February 12, 2026
