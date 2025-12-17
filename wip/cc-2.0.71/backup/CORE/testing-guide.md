# Testing Guide

**Purpose**: Practical guide to testing standards, tools, and patterns for Qara system - from unit tests to E2E automation.

**When to read**: Writing tests, setting up test infrastructure, or implementing TDD workflow.

---

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Test-Driven Development (TDD)](#test-driven-development-tdd)
3. [Testing Tools](#testing-tools)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing with Playwright](#end-to-end-testing-with-playwright)
7. [CLI Tool Testing](#cli-tool-testing)
8. [Best Practices](#best-practices)

---

## Testing Philosophy

From CONSTITUTION.md:
> **If it can be tested, it must be tested.**

### The Test Pyramid

```
        /\
       /E2E\      ← 10% (slow, expensive, brittle)
      /------\
     /  Integ \   ← 20% (medium speed, medium cost)
    /----------\
   /    Unit    \ ← 70% (fast, cheap, reliable)
  /--------------\
```

**Distribution:**
- **Unit Tests: 70%** - Fast (milliseconds), isolated, abundant
- **Integration Tests: 20%** - Medium speed (seconds), test component interactions
- **E2E Tests: 10%** - Slow (seconds to minutes), cover critical user journeys only

**Why this shape?** Fast tests run more often → Faster bug detection → Better quality

### Core Principles

**1. Tests Enable Confidence**
- Change code without fear
- Refactor safely
- Deploy with certainty
- Detect regressions immediately

**2. Tests Are Documentation**
- Show how code should be used
- Demonstrate expected behavior
- Provide working examples
- Stay up-to-date with code

**3. Tests Enable Velocity**
- Catch bugs early (cheaper to fix)
- Reduce debugging time
- Enable parallel development
- Support continuous deployment

---

## Test-Driven Development (TDD)

### The Red-Green-Refactor Cycle

```
1. 🔴 Red: Write a failing test (defines what code should do)
2. 🟢 Green: Write minimal code to pass (make test pass)
3. 🔵 Refactor: Improve code quality (tests still pass)
```

### When to Use TDD

**✅ Use TDD for:**
- Complex business logic
- Critical system functions
- Bug fixes (write test that reproduces bug first)
- Public APIs and interfaces
- Algorithm implementations
- CLI tools and data transformations

**❌ TDD Less Valuable for:**
- UI layout and styling
- Simple CRUD operations
- Exploratory prototyping
- One-off scripts

### TDD Example

**Step 1 - Write Test (Red):**
```typescript
import { describe, it, expect } from 'vitest';
import { parseEmail } from './email-parser';

describe('parseEmail', () => {
  it('extracts username from email', () => {
    const result = parseEmail('user@example.com');
    expect(result.username).toBe('user');
  });
});
```

**Result**: Test fails (parseEmail doesn't exist) ✅

**Step 2 - Write Code (Green):**
```typescript
export function parseEmail(email: string) {
  const [username] = email.split('@');
  return { username };
}
```

**Result**: Test passes! ✅

**Step 3 - Refactor (Blue):**
```typescript
export interface ParsedEmail {
  username: string;
  domain: string;
  isValid: boolean;
}

export function parseEmail(email: string): ParsedEmail {
  if (!email.includes('@')) {
    return { username: '', domain: '', isValid: false };
  }
  
  const [username, domain] = email.split('@');
  return {
    username,
    domain,
    isValid: username.length > 0 && domain.length > 0,
  };
}
```

**Result**: Tests still pass, code is better ✅

---

## Testing Tools

### Vitest (Unit & Integration)

**Why Vitest:**
- ⚡ Fast (Vite-powered)
- 🎯 Jest-compatible API
- 📦 Zero config for TypeScript
- 🔥 Hot module reload
- 💚 Native ESM support

**Setup:**
```bash
# Install
bun add -d vitest

# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

**Basic Test:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Calculator', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  it('adds two numbers', () => {
    expect(calc.add(2, 3)).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(calc.add(-5, 3)).toBe(-2);
  });
});
```

### Playwright (E2E & Browser Testing)

**Why Playwright:**
- 🎭 Cross-browser (Chromium, Firefox, WebKit)
- 🎯 Modern API with auto-wait
- 📸 Screenshots and videos
- 🔍 Powerful debugging tools
- 🚀 Fast and reliable

**Setup:**
```bash
# Install
bun add -d @playwright/test

# Install browsers
bunx playwright install

# Run E2E tests
bun playwright test

# Open test report
bunx playwright show-report
```

---

## Unit Testing

### What to Unit Test

**✅ Test:**
- Pure functions (same input → same output)
- Business logic
- Data transformations
- Utility functions
- Edge cases and error conditions

**❌ Don't Unit Test:**
- Framework internals (trust the framework)
- Simple getters/setters
- Configuration files

### Unit Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Component/Function Name', () => {
  // Group related tests
  describe('specific behavior', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data
      const input = 'test';
      
      // Act: Execute the code
      const result = functionUnderTest(input);
      
      // Assert: Verify result
      expect(result).toBe('expected');
    });
  });
});
```

### Testing Async Code

```typescript
describe('Async Operations', () => {
  it('fetches user data', async () => {
    const user = await fetchUser(1);
    expect(user.id).toBe(1);
  });

  it('handles errors', async () => {
    await expect(fetchUser(999)).rejects.toThrow('User not found');
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

describe('API Service', () => {
  it('calls external API', async () => {
    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ data: 'test' })
    });
    global.fetch = mockFetch;

    const result = await apiService.getData();
    
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data');
    expect(result.data).toBe('test');
  });
});
```

---

## Integration Testing

### What to Integration Test

**✅ Test:**
- Component interactions
- Database operations
- File system access
- API endpoints
- External service integration

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Database } from './database';

describe('User Repository', () => {
  let db: Database;

  beforeAll(async () => {
    db = await Database.connect(':memory:');
    await db.migrate();
  });

  afterAll(async () => {
    await db.close();
  });

  it('creates and retrieves user', async () => {
    // Create user
    const user = await db.users.create({
      email: 'test@example.com',
      name: 'Test User'
    });

    // Retrieve user
    const retrieved = await db.users.findById(user.id);
    
    expect(retrieved.email).toBe('test@example.com');
    expect(retrieved.name).toBe('Test User');
  });
});
```

---

## End-to-End Testing with Playwright

### Playwright Configuration

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Writing E2E Tests

**Basic Test:**
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill in form
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');

  // Verify user is logged in
  await expect(page.locator('text=Welcome back')).toBeVisible();
});
```

### Page Object Pattern

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return this.page.locator('.error-message').textContent();
  }
}

// tests/auth.spec.ts
test('login with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('invalid@example.com', 'wrong');
  
  expect(await loginPage.getErrorMessage()).toBe('Invalid credentials');
});
```

### Common Playwright Patterns

**Waiting for Elements:**
```typescript
// Wait for element to be visible
await page.waitForSelector('.loaded');

// Wait for navigation
await page.waitForURL('/dashboard');

// Wait for network request
await page.waitForResponse('**/api/users');
```

**Screenshots:**
```typescript
// Full page screenshot
await page.screenshot({ path: 'screenshot.png', fullPage: true });

// Element screenshot
await page.locator('.component').screenshot({ path: 'component.png' });
```

**Testing Forms:**
```typescript
test('form validation', async ({ page }) => {
  await page.goto('/signup');
  
  // Submit empty form
  await page.click('button[type="submit"]');
  
  // Check validation errors
  await expect(page.locator('.error')).toContainText('Email is required');
  
  // Fill valid data
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'StrongPass123!');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verify success
  await expect(page).toHaveURL('/welcome');
});
```

---

## CLI Tool Testing

### Why CLI Tools Are Easy to Test

**Because of CLI-First architecture:**
- ✅ Tools run independently of AI
- ✅ Tests are deterministic (no prompt variations)
- ✅ Fast feedback (no model calls needed)
- ✅ Comprehensive coverage (test every command)

### CLI Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('blog-publish CLI', () => {
  it('shows help when no arguments', async () => {
    const { stdout } = await execAsync('./blog-publish.ts --help');
    expect(stdout).toContain('Usage: blog-publish <file>');
  });

  it('validates file exists', async () => {
    try {
      await execAsync('./blog-publish.ts nonexistent.md');
    } catch (error) {
      expect(error.stderr).toContain('File not found');
    }
  });

  it('publishes valid post', async () => {
    const { stdout } = await execAsync('./blog-publish.ts test.md');
    expect(stdout).toContain('Published successfully');
  });
});
```

### Testing CLI Output

```typescript
describe('CLI Output', () => {
  it('outputs JSON when --json flag used', async () => {
    const { stdout } = await execAsync('./tool.ts list --json');
    const data = JSON.parse(stdout);
    
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('exits with code 0 on success', async () => {
    const { code } = await execAsync('./tool.ts run task1');
    expect(code).toBe(0);
  });

  it('exits with code 1 on error', async () => {
    try {
      await execAsync('./tool.ts invalid-command');
    } catch (error) {
      expect(error.code).toBe(1);
    }
  });
});
```

---

## Best Practices

### ✅ Do

**Write Descriptive Test Names:**
```typescript
// ✅ Good
it('returns 404 when user not found', () => {});
it('validates email format before creating user', () => {});

// ❌ Bad
it('works', () => {});
it('test user creation', () => {});
```

**Test Behavior, Not Implementation:**
```typescript
// ✅ Good: Tests behavior
it('allows user to login with valid credentials', async () => {
  await login('user@example.com', 'password');
  expect(isLoggedIn()).toBe(true);
});

// ❌ Bad: Tests implementation details
it('calls setToken and updateState', () => {
  // Don't test internal method calls
});
```

**Keep Tests Independent:**
```typescript
// ✅ Good: Each test is independent
describe('User API', () => {
  beforeEach(async () => {
    await db.clear(); // Clean slate for each test
  });

  it('creates user', async () => {
    const user = await createUser({ email: 'test@example.com' });
    expect(user.id).toBeDefined();
  });
});

// ❌ Bad: Tests depend on each other
let userId;
it('creates user', () => { userId = ... });
it('updates user', () => { updateUser(userId) }); // Depends on previous test
```

**Use Fixtures and Factories:**
```typescript
// test/fixtures/users.ts
export const createTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  ...overrides
});

// tests/user.test.ts
it('creates admin user', () => {
  const admin = createTestUser({ role: 'admin' });
  expect(admin.role).toBe('admin');
});
```

### ❌ Don't

**Don't Test Framework Code:**
```typescript
// ❌ Bad: Testing React's useState
it('updates state when setState is called', () => {
  // Don't test framework internals
});
```

**Don't Have Giant Test Files:**
```typescript
// ❌ Bad: 2000 line test file
describe('Everything', () => {
  // ... 500 tests
});

// ✅ Good: Organized by feature
// tests/auth.test.ts
// tests/users.test.ts
// tests/posts.test.ts
```

**Don't Skip Cleanup:**
```typescript
// ❌ Bad: Leaves test data
it('creates user', async () => {
  await db.users.create({ email: 'test@example.com' });
  // No cleanup!
});

// ✅ Good: Cleans up
afterEach(async () => {
  await db.users.clear();
});
```

---

## Quick Reference

### Running Tests

```bash
# Unit & Integration (Vitest)
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test user.test.ts       # Specific file
bun test --coverage         # With coverage

# E2E (Playwright)
bun playwright test         # Run all E2E tests
bun playwright test --ui    # Interactive mode
bun playwright test --debug # Debug mode
bunx playwright show-report # Show test report
```

### Test Structure Reminder

```typescript
// Arrange - Set up test data
const input = 'test data';

// Act - Execute the function
const result = functionUnderTest(input);

// Assert - Verify the result
expect(result).toBe('expected output');
```

### Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** Cover all critical paths
- **E2E Tests:** Cover critical user journeys only (not 100%)

---

## Related Documentation

- **CONSTITUTION.md** - Core testing principle and quality gates
- **cli-first-guide.md** - Building testable CLI tools
- **stack-preferences.md** - Bun runtime and TypeScript preferences

---

**Key Takeaways:**
1. Write tests before implementation (TDD)
2. Follow test pyramid (70% unit, 20% integration, 10% E2E)
3. Test behavior, not implementation
4. Keep tests fast and independent
5. Use Vitest for unit/integration, Playwright for E2E
6. CLI tools are easiest to test (independent of AI)
