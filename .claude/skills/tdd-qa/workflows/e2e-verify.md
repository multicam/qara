# Workflow: E2E Verify

Execute E2E scenarios via devtools-mcp browser automation. Auto-drafts `.spec.ts` Playwright scripts.

## Prerequisites

- Scenario spec with Priority: critical E2E scenarios in `specs/`
- Dev server running (or URL provided by JM)
- devtools-mcp available (Brave with remote debugging)

> If devtools-mcp is not available, skip this workflow and inform JM. Browser automation requires Chrome DevTools Protocol — there is no meaningful fallback.

## Steps

### 1. Identify E2E Scenarios [DETERMINISTIC]

Read `specs/*.md` files. Select scenarios marked Priority: critical that involve user-visible behavior (page navigation, form submission, visual output).

Not every scenario is E2E — only those that require a real browser.

### 2. Start Dev Server [DETERMINISTIC]

If no URL provided, start the dev server using the project's dev command:

```bash
bun dev &
```

Wait for the server to be ready (check with `curl -s http://localhost:{port}`).

### 3. Execute Scenarios [AGENTIC — via devtools-mcp]

For each E2E scenario:

**a. Given (setup)**
- `navigate_page` to the relevant URL
- Execute any precondition setup (login, seed data)

**b. When (action)**
- Use devtools-mcp tools: `click`, `fill`, `press_key`, `hover`
- `take_snapshot` after every action (DOM refs go stale)

**c. Then (assert)**
- `take_snapshot` and verify expected content is present
- `evaluate_script` for programmatic assertions
- `list_console_messages types=["error"]` to check for JS errors
- `list_network_requests` to check for failed requests

**d. Record result**
- Pass: all assertions met, 0 JS errors, 0 failed network requests
- Fail: record which assertion failed and why

### 4. Auto-Draft .spec.ts [AGENTIC]

For each executed scenario, generate a Playwright `.spec.ts` draft:

```typescript
// Auto-drafted by tdd-qa e2e-verify — review before committing
import { test, expect } from '@playwright/test';

test('Scenario: successful login', async ({ page }) => {
  // Given the login page
  await page.goto('http://localhost:3000/login');

  // When user submits valid credentials
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'valid');
  await page.click('button[type="submit"]');

  // Then they see the dashboard
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

Save to `tests/e2e/{feature}.draft.spec.ts`. The `.draft` suffix signals it needs human review before freezing.

**To freeze:** JM renames `*.draft.spec.ts` → `*.spec.ts` (removes `.draft`). Frozen specs are CI-runnable and included in back-testing.

### 5. Stop Dev Server [DETERMINISTIC]

If we started the dev server in step 2, stop it.

### 6. Report [DETERMINISTIC]

```
E2E verification complete:
  Scenarios executed: {n}
  Passed: {n}
  Failed: {n}
  Drafts generated: tests/e2e/{feature}.draft.spec.ts

To freeze for CI: rename .draft.spec.ts → .spec.ts
```

## Blueprint Summary

| Step | Node Type |
|------|-----------|
| Identify scenarios | Deterministic |
| Start dev server | Deterministic |
| Execute scenarios | Agentic (devtools-mcp) |
| Auto-draft .spec.ts | Agentic |
| Stop dev server | Deterministic |
| Report | Deterministic |
