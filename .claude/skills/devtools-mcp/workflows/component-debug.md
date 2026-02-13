# Component Debug Workflow

Combined Chrome DevTools + react-grab workflow for debugging React components.

**Requires:** `--grab` flag (react-grab MCP must be active)

## When to Use

- "Which component renders this element?"
- "Debug this component"
- "Find the source for this button"
- Broken UI with unknown component source
- Console errors you need to trace to a specific component

## Architecture

```
Claude Code
├── DevTools MCP (brave-devtools)
│   ├── navigate_page, list_console_messages
│   ├── take_screenshot, evaluate_script
│   └── CDP protocol → Browser
│
└── react-grab MCP (react-grab-mcp)
    ├── get_element_context → component name + file:line
    └── HTTP /context → react-grab script in app
```

## Workflow Steps

### 1. Navigate to the Page

Use DevTools MCP to load the target page:

```
Tool: navigate_page
Args: { "url": "http://localhost:3000/contact" }
```

### 2. Collect Console Errors

Check for existing errors before investigating:

```
Tool: list_console_messages
Filter: errors and warnings
```

### 3. User Selects the Element

Prompt the user to select the broken/target element:

> **Action needed:** In the browser, Cmd+C (or Ctrl+C) on the element you want to debug.
> This copies the element selector for react-grab to identify.

If the user can't select interactively, use `evaluate_script` to query the react-grab API directly:

```
Tool: evaluate_script
Args: { "expression": "window.__REACT_GRAB__?.getContext(document.querySelector('.broken-button'))" }
```

### 4. Get Component Context

Use react-grab MCP to identify the React component:

```
Tool: get_element_context
```

This returns structured data like:

```json
{
  "component": "ContactForm",
  "file": "components/contact-form.tsx",
  "line": 46,
  "column": 19,
  "props": { "onSubmit": "[Function]", "initialData": "{...}" },
  "state": { "isSubmitting": false, "errors": {} }
}
```

### 5. Read Source and Propose Fix

With the file:line from react-grab:
1. Read the source file at the identified location
2. Cross-reference with console errors from step 2
3. Propose a fix based on the component's props, state, and source

### 6. Verify the Fix

After applying changes:
1. Reload the page via DevTools (`navigate_page` to same URL)
2. Re-check console for errors (`list_console_messages`)
3. Take a screenshot to confirm visual fix (`take_screenshot`)

## Context Staleness

react-grab context has a ~5 minute TTL. If the workflow takes longer:

> **Note:** react-grab context may be stale. Please re-select the element (Cmd+C) to refresh.

## Fallback: No react-grab

If `--grab` is not active but the user asks about components, fall back to:
1. Use `evaluate_script` to check for React DevTools globals (`__REACT_DEVTOOLS_GLOBAL_HOOK__`)
2. Inspect the DOM for `data-reactroot`, `__reactFiber$` properties
3. Search the codebase for the component by class/id from the DOM

## Example Session

```
User: "The submit button on /contact is broken, which component is it?"

1. navigate_page → http://localhost:3000/contact
2. list_console_messages → "TypeError: onSubmit is not a function"
3. User Cmd+C's the submit button
4. get_element_context → ContactForm at components/contact-form.tsx:46
5. Read components/contact-form.tsx:46
   → Found: <button onClick={props.onSubmit}>
   → Issue: Parent passes onSubmit as string, not function
6. Fix: Update parent component to pass function reference
7. Verify: Reload, no console errors, button works
```
