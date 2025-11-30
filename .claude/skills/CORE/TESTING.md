# Testing Standards & Philosophy

**Purpose**: Comprehensive guide to testing standards, test-driven development, and quality assurance practices in Qara system.

**Last Updated**: 2025-11-19

---

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [The Test Pyramid](#the-test-pyramid)
3. [Test-Driven Development (TDD)](#test-driven-development-tdd)
4. [Testing Tools & Frameworks](#testing-tools--frameworks)
5. [Unit Testing Guidelines](#unit-testing-guidelines)
6. [Integration Testing](#integration-testing)
7. [End-to-End Testing](#end-to-end-testing)
8. [CLI Tool Testing](#cli-tool-testing)
9. [AI Evaluations (Evals)](#ai-evaluations-evals)
10. [Coverage Expectations](#coverage-expectations)
11. [Testing Anti-Patterns](#testing-anti-patterns)

---

## Testing Philosophy

From CONSTITUTION.md Principle #6:
> **Spec/Test/Evals First**: Define expected behavior before writing implementation.

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

**4. If You Can't Test It, You Can't Trust It**
- Untested code will break
- Manual testing doesn't scale
- Bugs hide in untested paths
- Quality requires verification

### The Fundamental Process

```
1. Write Specification (what should it do?)
2. Write Test (how to verify?)
3. Run Test → Should FAIL (red)
4. Write Implementation (make it work)
5. Run Test → Should PASS (green)
6. Refactor (make it better)
7. Run Test → Still PASS (green)
```

**Never skip steps 1-3.** Writing tests after implementation leads to:
- Tests that match implementation bugs
- Missing edge case coverage
- False sense of security

---

## The Test Pyramid

### The Shape: Many Fast Tests, Few Slow Tests

```
        /\
       /E2E\      ← Few (slow, expensive, brittle)
      /------\
     /  Integ \   ← Some (medium speed, medium cost)
    /----------\
   /    Unit    \ ← Many (fast, cheap, reliable)
  /--------------\
```

### Distribution Guidelines

**Unit Tests: 70%**
- Fast (milliseconds)
- Isolated (no external dependencies)
- Abundant (hundreds to thousands)
- Test single functions/classes

**Integration Tests: 20%**
- Medium speed (seconds)
- Test component interactions
- Database, file system, APIs
- Verify integration points work

**E2E Tests: 10%**
- Slow (seconds to minutes)
- Full system from user perspective
- Browser automation, full stack
- Cover critical user journeys only

### Why This Shape?

**Bottom-Heavy (Correct):**
```
✅ 1000 unit tests (run in 2 seconds)
✅  200 integration tests (run in 30 seconds)
✅   20 E2E tests (run in 5 minutes)

Total: Fast feedback, high confidence
```

**Top-Heavy (Wrong):**
```
❌   50 unit tests
❌  100 integration tests
❌  500 E2E tests (run in 4 hours!)

Total: Slow feedback, brittle tests, painful
```

**Key Insight**: Fast tests run more often → Faster bug detection → Better quality

---

## Test-Driven Development (TDD)

### What Is TDD?

**The Red-Green-Refactor Cycle:**

1. **🔴 Red**: Write a failing test
   - Defines what code should do
   - Test fails because code doesn't exist yet
   
2. **🟢 Green**: Write minimal code to pass
   - Make test pass as simply as possible
   - Don't worry about perfect code yet
   
3. **🔵 Refactor**: Improve code quality
   - Tests still pass (safety net)
   - Make code clean, efficient, maintainable

### When to Use TDD

**✅ Use TDD for:**
- Complex business logic
- Critical system functions
- Bug fixes (write test that reproduces bug first)
- Public APIs and interfaces
- Algorithm implementations
- Data transformations

**❌ TDD Less Valuable for:**
- UI layout and styling
- Simple CRUD operations
- Exploratory prototyping
- One-off scripts
- Configuration files

### TDD Example: String Parser

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

**Result**: Test fails (parseEmail doesn't exist)

**Step 2 - Write Code (Green):**
```typescript
// email-parser.ts
export function parseEmail(email: string) {
  const [username] = email.split('@');
  return { username };
}
```

**Result**: Test passes!

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

**Result**: Tests still pass, code is better

**Step 4 - Add More Tests:**
```typescript
describe('parseEmail', () => {
  it('extracts username from email', () => {
    const result = parseEmail('user@example.com');
    expect(result.username).toBe('user');
  });

  it('extracts domain from email', () => {
    const result = parseEmail('user@example.com');
    expect(result.domain).toBe('example.com');
  });

  it('handles invalid email without @', () => {
    const result = parseEmail('notanemail');
    expect(result.isValid).toBe(false);
  });

  it('handles empty email', () => {
    const result = parseEmail('');
    expect(result.isValid).toBe(false);
  });
});
```

### TDD Benefits

**Design Benefits:**
- Forces you to think about API first
- Creates testable code (loose coupling)
- Reveals complexity early
- Documents requirements

**Quality Benefits:**
- 100% test coverage by definition
- Tests written when requirements fresh
- Edge cases caught immediately
- Regression protection built-in

**Workflow Benefits:**
- Clear next step (make test pass)
- Small, incremental progress
- Confidence to refactor
- Less debugging (tests catch issues)

---

## Testing Tools & Frameworks

### Recommended Stack

**Unit & Integration: Vitest**
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

**Why Vitest:**
- ⚡ Fast (Vite-powered)
- 🎯 Jest-compatible API (familiar)
- 📦 Zero config for TypeScript
- 🔥 Hot module reload
- 💚 Native ESM support

**E2E & Browser: Playwright**
```bash
# Install
bun add -d @playwright/test

# Run E2E tests
bun playwright test

# UI mode
bun playwright test --ui

# Debug mode
bun playwright test --debug
```

**Why Playwright:**
- 🌐 Multi-browser (Chrome, Firefox, Safari)
- 🎭 Reliable (auto-wait, retry)
- 📸 Screenshots & videos
- 🐛 Excellent debugging
- 🚀 Fast execution
- 📱 Mobile emulation

### Test File Organization

**Colocated Tests (Recommended):**
```
src/
├── utils/
│   ├── email-parser.ts
│   └── email-parser.test.ts     # Next to implementation
├── lib/
│   ├── database.ts
│   └── database.test.ts
└── api/
    ├── routes.ts
    └── routes.test.ts
```

**Benefits:**
- Easy to find related tests
- Tests move with code
- Clear what's tested vs untested
- Import paths simpler

**Separate Test Directory (Alternative):**
```
src/
├── utils/
│   └── email-parser.ts
└── lib/
    └── database.ts

tests/
├── unit/
│   ├── email-parser.test.ts
│   └── database.test.ts
├── integration/
└── e2e/
```

**Benefits:**
- Clean separation
- Test infrastructure isolated
- Easier to run test subsets

**Choose based on project size:**
- Small/Medium projects → Colocated
- Large projects → Separate directory

---

## Unit Testing Guidelines

### What to Test

**✅ Test These:**
- Pure functions (input → output)
- Business logic and calculations
- Data transformations
- Validation functions
- Error handling
- Edge cases and boundaries
- Public API methods

**❌ Don't Test These:**
- Third-party library internals
- Language features (TypeScript's type system)
- Trivial getters/setters
- Auto-generated code

### Unit Test Structure (AAA Pattern)

**Arrange-Act-Assert:**
```typescript
describe('calculateDiscount', () => {
  it('applies 10% discount for orders over $100', () => {
    // Arrange - Set up test data
    const orderAmount = 150;
    const customerType = 'regular';
    
    // Act - Execute the function
    const result = calculateDiscount(orderAmount, customerType);
    
    // Assert - Verify the result
    expect(result).toBe(15); // 10% of 150
  });
});
```

### Writing Good Unit Tests

**1. Test One Thing Per Test**
```typescript
// ❌ Bad: Tests multiple behaviors
it('processes user data', () => {
  expect(validateEmail(email)).toBe(true);
  expect(hashPassword(password)).toBeDefined();
  expect(createUser(data)).resolves.toBeDefined();
});

// ✅ Good: One assertion per test
it('validates correct email format', () => {
  expect(validateEmail('user@example.com')).toBe(true);
});

it('hashes password securely', () => {
  const hashed = hashPassword('password123');
  expect(hashed).not.toBe('password123');
  expect(hashed.length).toBeGreaterThan(20);
});
```

**2. Descriptive Test Names**
```typescript
// ❌ Bad: Vague names
it('works', () => { ... });
it('test1', () => { ... });

// ✅ Good: Describes behavior
it('returns null when email is invalid', () => { ... });
it('throws error when file not found', () => { ... });
```

**3. Test Edge Cases**
```typescript
describe('divide', () => {
  it('divides positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  it('handles negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
  
  it('handles division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
  
  it('handles decimal results', () => {
    expect(divide(5, 2)).toBe(2.5);
  });
});
```

**4. Use Test Fixtures**
```typescript
// Test fixtures - Reusable test data
const validUser = {
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'Test User',
};

const invalidEmails = [
  'notanemail',
  '@example.com',
  'user@',
  '',
];

describe('User validation', () => {
  it('accepts valid user data', () => {
    expect(validateUser(validUser)).toBe(true);
  });
  
  it('rejects invalid emails', () => {
    invalidEmails.forEach(email => {
      expect(validateUser({ ...validUser, email })).toBe(false);
    });
  });
});
```

**5. Mock External Dependencies**
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock external API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchUserData', () => {
  it('fetches user from API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'User' }),
    });
    
    const user = await fetchUserData(1);
    expect(user.id).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/1');
  });
});
```

---

## Integration Testing

### What Are Integration Tests?

**Integration tests verify multiple components work together:**
- Database operations
- File system interactions
- API endpoint responses
- External service calls
- Module interactions

### Integration Test Examples

**Example 1: Database Integration**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './test-helpers';
import { UserRepository } from './user-repository';

describe('UserRepository (integration)', () => {
  let db;
  let userRepo;

  beforeEach(async () => {
    db = await setupTestDatabase();
    userRepo = new UserRepository(db);
  });

  afterEach(async () => {
    await teardownTestDatabase(db);
  });

  it('creates and retrieves user from database', async () => {
    const user = await userRepo.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(user.id).toBeDefined();

    const retrieved = await userRepo.findById(user.id);
    expect(retrieved.email).toBe('test@example.com');
  });
});
```

**Example 2: File System Integration**
```typescript
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { FileStore } from './file-store';

describe('FileStore (integration)', () => {
  let tempDir;
  let fileStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(os.tmpdir(), 'test-'));
    fileStore = new FileStore(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('saves and loads file', async () => {
    await fileStore.save('test.txt', 'content');
    const loaded = await fileStore.load('test.txt');
    expect(loaded).toBe('content');
  });
});
```

### Integration Test Best Practices

**1. Use Test Databases**
- Never test against production
- Use in-memory database (SQLite) or Docker containers
- Reset database state between tests

**2. Clean Up After Tests**
```typescript
afterEach(async () => {
  await db.clear(); // Clear all data
  await fs.rm(tempDir, { recursive: true }); // Delete temp files
});
```

**3. Keep Tests Independent**
- Each test should work alone
- Don't depend on test execution order
- Clean state between tests

---

## End-to-End Testing

### What Are E2E Tests?

**E2E tests verify entire system from user's perspective:**
- Full browser automation
- Real database and services
- Complete user workflows
- Critical business paths

### Playwright E2E Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('**/dashboard');

    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid credentials');
  });
});
```

### E2E Best Practices

**1. Test Critical Paths Only**
```
✅ Critical paths:
- User registration
- Login/logout
- Checkout process
- Payment flow

❌ Don't E2E test:
- Every button click
- CSS styling
- Trivial interactions
```

**2. Use Data Test IDs**
```typescript
// ✅ Good: Stable selector
await page.click('[data-testid="submit-button"]');

// ❌ Bad: Fragile selectors
await page.click('.btn.btn-primary.submit');
```

**3. Wait for Elements Properly**
```typescript
// ✅ Good: Explicit waits
await page.waitForSelector('[data-testid="results"]');
await page.waitForURL('**/success');

// ❌ Bad: Arbitrary timeouts
await page.waitForTimeout(5000); // Flaky!
```

---

## CLI Tool Testing

### Testing CLI Tools

CLI tools should be tested independently per CLI-First architecture.

**Example: Testing API CLI Tool**
```typescript
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('api-tool CLI', () => {
  it('shows help with --help flag', async () => {
    const { stdout } = await execAsync('./api-tool.ts --help');
    
    expect(stdout).toContain('Usage: api-tool');
    expect(stdout).toContain('Commands:');
  });

  it('validates date format', async () => {
    try {
      await execAsync('./api-tool.ts fetch --date invalid');
      throw new Error('Should have failed');
    } catch (error) {
      expect(error.stderr).toContain('Invalid date format');
      expect(error.code).toBe(1);
    }
  });

  it('fetches data with valid arguments', async () => {
    const { stdout } = await execAsync('./api-tool.ts fetch --date 2025-11-19');
    const data = JSON.parse(stdout);
    expect(data).toBeDefined();
  });
});
```

### CLI Testing Checklist

- [ ] --help displays usage
- [ ] Invalid args return exit code 1
- [ ] Valid args return exit code 0
- [ ] Errors go to stderr
- [ ] Data goes to stdout
- [ ] JSON output is valid
- [ ] Validates input formats

---

## AI Evaluations (Evals)

### What Are Evals?

**Evaluations test AI system outputs:**
- LLM response quality
- Prompt consistency
- Model comparison
- Regression detection

### Eval Structure

**1. Define Use Case**
```markdown
Use Case: Newsletter Summarization
- Input: Long-form content
- Expected: 3-sentence summary
- Quality metrics: Accuracy, brevity
```

**2. Run Evaluations**
```bash
evals run --use-case newsletter-summary --model claude-3-5-sonnet
evals compare --use-case summary --models claude,gpt-4
```

**3. Measure Quality**
```typescript
interface EvalResult {
  testCaseId: string;
  model: string;
  output: string;
  score: number; // 0-100
  passedCriteria: string[];
  latencyMs: number;
}
```

---

## Coverage Expectations

### Coverage Targets

**Overall Coverage:**
- **Minimum**: 70% code coverage
- **Target**: 80-90% code coverage
- **Critical paths**: 100% code coverage

**By Test Type:**
```
Unit Tests:    70-90% coverage
Integration:   50-70% coverage
E2E:           20-30% coverage (critical paths)
```

### What to Cover 100%

**Critical Code:**
- Authentication & authorization
- Payment processing
- Data validation
- Security functions
- API public interfaces

### Coverage Tools

**Vitest Coverage:**
```bash
# Generate coverage
bun test --coverage

# View in browser
bun test --coverage --coverage.reporter=html
open coverage/index.html

# Enforce minimum
bun test --coverage --coverage.lines=80
```

**Key Insight**: 100% coverage with bad tests is worse than 70% with good tests.

---

## Testing Anti-Patterns

### ❌ Anti-Pattern 1: Testing Implementation Details

**Bad:**
```typescript
it('calls internal method', () => {
  const spy = vi.spyOn(service as any, '_internal');
  service.createUser(data);
  expect(spy).toHaveBeenCalled(); // Testing implementation!
});
```

**Good:**
```typescript
it('creates user with valid data', async () => {
  const user = await service.createUser(data);
  expect(user.id).toBeDefined(); // Testing behavior!
});
```

### ❌ Anti-Pattern 2: Flaky Tests

**Bad:**
```typescript
it('loads data', async () => {
  loadAsync();
  await new Promise(r => setTimeout(r, 1000)); // Flaky!
  expect(data).toBeDefined();
});
```

**Good:**
```typescript
it('loads data', async () => {
  const data = await loadAsync(); // Wait properly
  expect(data).toBeDefined();
});
```

### ❌ Anti-Pattern 3: No Assertions

**Bad:**
```typescript
it('processes data', async () => {
  await processData(data);
  // No assertions - always passes!
});
```

**Good:**
```typescript
it('processes data successfully', async () => {
  const result = await processData(data);
  expect(result.status).toBe('success');
});
```

---

## Quick Reference

### Test Writing Checklist

- [ ] Test has descriptive name
- [ ] Follows AAA pattern (Arrange-Act-Assert)
- [ ] Tests one behavior
- [ ] Has clear assertions
- [ ] Handles edge cases
- [ ] Independent of other tests
- [ ] Fast execution (unit < 100ms)

### Commands

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage

# E2E tests
bun playwright test

# Specific test file
bun test user.test.ts
```

---

## Related Documentation

- **cli-first-guide.md** - Building and testing CLI tools independently
- **playwright-config.md** - Playwright setup and configuration
- **CONSTITUTION.md** - Principle #6 (Spec/Test/Evals First)
- **stack-preferences.md** - Vitest and Playwright preferences

---

**Key Takeaways:**
1. Write tests before implementation (TDD)
2. Follow test pyramid (70% unit, 20% integration, 10% E2E)
3. Test behavior, not implementation
4. Keep tests fast and independent
5. Aim for 80%+ coverage on critical code
6. Use Vitest for unit/integration, Playwright for E2E
