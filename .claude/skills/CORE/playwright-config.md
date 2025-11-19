# Playwright Configuration & Best Practices

**Purpose**: Guide to configuring and using Playwright for end-to-end browser automation testing in Qara system.

**Last Updated**: 2025-11-19

---

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Configuration](#configuration)
3. [Writing E2E Tests](#writing-e2e-tests)
4. [Debugging](#debugging)
5. [Common Patterns](#common-patterns)
6. [Best Practices](#best-practices)
7. [CI/CD Integration](#cicd-integration)

---

## Installation & Setup

### Install Playwright

```bash
# Install Playwright with Bun
bun add -d @playwright/test

# Install browsers
bunx playwright install

# Install system dependencies (Linux)
bunx playwright install-deps
```

### Project Structure

```
project/
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── checkout.spec.ts
│   │   └── dashboard.spec.ts
│   └── fixtures/
│       └── test-users.ts
├── playwright.config.ts
└── package.json
```

---

## Configuration

### Basic playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Fail test after first failure
  fullyParallel: true,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: 'html',
  
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',
    
    // Collect trace when test fails
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile emulation
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Advanced Configuration Options

```typescript
export default defineConfig({
  use: {
    // Context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Emulate device
    userAgent: 'custom-user-agent',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Permissions
    permissions: ['geolocation'],
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    
    // Slow down actions (for debugging)
    slowMo: 100,
    
    // Set browser launch options
    launchOptions: {
      headless: process.env.CI ? true : false,
      slowMo: 0,
    },
  },
  
  // Global setup/teardown
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
});
```

---

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate before each test
    await page.goto('/');
  });

  test('user can log in', async ({ page }) => {
    // Navigate
    await page.goto('/login');
    
    // Fill form
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    
    // Submit
    await page.click('[data-testid="login-button"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard');
    
    // Assert
    await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrongpass');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error"]'))
      .toContainText('Invalid credentials');
  });
});
```

### Page Object Model

**pages/login-page.ts:**
```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.errorMessage = page.locator('[data-testid="error"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

**Using Page Object:**
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

test('user can log in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  
  await page.waitForURL('**/dashboard');
  await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
});
```

### Fixtures for Test Data

**fixtures/test-users.ts:**
```typescript
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
  },
  user: {
    email: 'user@example.com',
    password: 'User123!',
    role: 'user',
  },
};
```

**Using fixtures:**
```typescript
import { test } from '@playwright/test';
import { testUsers } from './fixtures/test-users';

test('admin can access admin panel', async ({ page }) => {
  const admin = testUsers.admin;
  
  await page.goto('/login');
  await page.fill('[data-testid="email"]', admin.email);
  await page.fill('[data-testid="password"]', admin.password);
  await page.click('[data-testid="login-button"]');
  
  await page.goto('/admin');
  await expect(page).toHaveURL('**/admin');
});
```

---

## Debugging

### Running Tests in Debug Mode

```bash
# Open Playwright Inspector
bunx playwright test --debug

# Debug specific test
bunx playwright test auth.spec.ts --debug

# Debug from specific line
bunx playwright test auth.spec.ts:10 --debug
```

### UI Mode (Interactive)

```bash
# Open UI mode
bunx playwright test --ui

# Features:
# - Watch tests run in real-time
# - Time travel through test steps
# - Inspect DOM at any point
# - View console logs and network requests
```

### Screenshots & Videos

```typescript
test('take screenshot on specific step', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Take screenshot
  await page.screenshot({ path: 'dashboard.png' });
  
  // Full page screenshot
  await page.screenshot({ 
    path: 'full-page.png', 
    fullPage: true 
  });
  
  // Screenshot of specific element
  const element = page.locator('[data-testid="chart"]');
  await element.screenshot({ path: 'chart.png' });
});
```

### Trace Viewer

```bash
# Generate trace
bunx playwright test --trace on

# View trace
bunx playwright show-trace trace.zip

# Trace shows:
# - DOM snapshots
# - Network activity
# - Console logs
# - Action timeline
```

### Console Logging

```typescript
test('debug with console', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log('Browser log:', msg.text()));
  
  // Listen to page errors
  page.on('pageerror', error => console.log('Page error:', error));
  
  await page.goto('/dashboard');
});
```

---

## Common Patterns

### Waiting for Elements

```typescript
// Wait for selector
await page.waitForSelector('[data-testid="results"]');

// Wait for URL
await page.waitForURL('**/dashboard');

// Wait for load state
await page.waitForLoadState('networkidle');
await page.waitForLoadState('domcontentloaded');

// Wait for custom condition
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 5;
});

// Auto-waiting (built into Playwright)
await page.click('button'); // Waits until button is clickable
```

### Form Handling

```typescript
// Fill inputs
await page.fill('[data-testid="email"]', 'user@example.com');

// Select from dropdown
await page.selectOption('select#country', 'US');

// Check checkbox
await page.check('[data-testid="terms"]');

// Upload file
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');

// Submit form
await page.click('button[type="submit"]');
```

### Navigation

```typescript
// Navigate to URL
await page.goto('https://example.com');

// Go back/forward
await page.goBack();
await page.goForward();

// Reload
await page.reload();

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a[href="/next-page"]'),
]);
```

### Network Interception

```typescript
// Mock API response
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ users: [] }),
  });
});

// Abort requests
await page.route('**/*.{png,jpg,jpeg}', route => route.abort());

// Monitor network activity
page.on('request', request => {
  console.log('Request:', request.url());
});

page.on('response', response => {
  console.log('Response:', response.status(), response.url());
});
```

### Multiple Pages/Tabs

```typescript
test('open link in new tab', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/');
  
  // Listen for new page
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.click('a[target="_blank"]'),
  ]);
  
  await newPage.waitForLoadState();
  expect(newPage.url()).toContain('/new-page');
});
```

### Authentication State

```typescript
// Save authentication state
test('save auth state', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login"]');
  
  await page.waitForURL('**/dashboard');
  
  // Save storage state
  await page.context().storageState({ path: 'auth.json' });
});

// Reuse authentication state
test.use({ storageState: 'auth.json' });

test('use saved auth', async ({ page }) => {
  await page.goto('/dashboard');
  // Already authenticated!
});
```

---

## Best Practices

### 1. Use Data Test IDs

```html
<!-- ✅ Good: Stable selector -->
<button data-testid="submit-button">Submit</button>

<!-- ❌ Bad: Fragile selectors -->
<button class="btn btn-primary submit">Submit</button>
```

```typescript
// ✅ Good: Test ID selector
await page.click('[data-testid="submit-button"]');

// ❌ Bad: CSS class selector (fragile)
await page.click('.btn.btn-primary.submit');
```

### 2. Test User Behavior, Not Implementation

```typescript
// ✅ Good: Tests what user does
test('user completes checkout', async ({ page }) => {
  await page.goto('/cart');
  await page.click('[data-testid="checkout-button"]');
  await page.fill('[data-testid="address"]', '123 Main St');
  await page.click('[data-testid="submit-order"]');
  await expect(page).toHaveURL('**/order-confirmation');
});

// ❌ Bad: Tests implementation details
test('checkout button calls API', async ({ page }) => {
  await page.route('**/api/checkout', route => {
    // Testing API internals
  });
});
```

### 3. Keep Tests Independent

```typescript
// ✅ Good: Each test is independent
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await loginAsUser(page);
});

test('test 1', async ({ page }) => {
  // Test has fresh state
});

test('test 2', async ({ page }) => {
  // Test has fresh state
});

// ❌ Bad: Tests depend on each other
test('test 1', async ({ page }) => {
  await createUser(); // Side effect
});

test('test 2', async ({ page }) => {
  // Depends on test 1 creating user
});
```

### 4. Use Assertions Wisely

```typescript
// ✅ Good: Clear assertions
await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
await expect(page).toHaveURL('**/dashboard');
await expect(page.locator('[data-testid="count"]')).toHaveText('5');

// ❌ Bad: No assertions
test('loads page', async ({ page }) => {
  await page.goto('/dashboard');
  // No verification!
});
```

### 5. Handle Flakiness

```typescript
// ✅ Good: Use auto-waiting
await page.click('button'); // Waits until clickable
await expect(page.locator('.results')).toBeVisible(); // Waits until visible

// ❌ Bad: Arbitrary timeouts
await page.waitForTimeout(5000); // Flaky!
```

---

## CI/CD Integration

### GitHub Actions

**.github/workflows/e2e.yml:**
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Install Playwright browsers
        run: bunx playwright install --with-deps
        
      - name: Run E2E tests
        run: bun playwright test
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Running in CI

```typescript
// playwright.config.ts
export default defineConfig({
  // CI-specific settings
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    // Screenshot and video only on failure in CI
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Headless mode in CI
    launchOptions: {
      headless: process.env.CI ? true : false,
    },
  },
});
```

---

## Quick Reference

### Common Commands

```bash
# Run all tests
bunx playwright test

# Run specific file
bunx playwright test auth.spec.ts

# Run tests in headed mode
bunx playwright test --headed

# Run with UI
bunx playwright test --ui

# Debug mode
bunx playwright test --debug

# Generate code
bunx playwright codegen http://localhost:3000

# View report
bunx playwright show-report
```

### Useful Selectors

```typescript
// By test ID
page.locator('[data-testid="submit"]')

// By text
page.locator('text=Sign in')

// By role
page.locator('role=button[name="Submit"]')

// By placeholder
page.locator('[placeholder="Email"]')

// Chaining
page.locator('.container').locator('button')
```

---

## Related Documentation

- **TESTING.md** - Overall testing philosophy and test pyramid
- **stack-preferences.md** - Playwright as E2E testing tool
- **CONSTITUTION.md** - Spec/Test/Evals First principle

---

**Key Takeaways:**
1. Use data-testid for stable selectors
2. Test user behavior, not implementation
3. Keep tests independent
4. Let Playwright auto-wait (avoid arbitrary timeouts)
5. Use Page Object Model for complex flows
6. Debug with UI mode and trace viewer
7. Run headless in CI with retries
