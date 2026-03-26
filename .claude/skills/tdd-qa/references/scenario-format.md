# Scenario Definition Format

Lightweight Markdown specs for test scenarios. No Gherkin tooling — Claude Code IS the step-definition engine.

## Template

```markdown
# Feature: [Name]

## Context
[Why this feature exists, what problem it solves]

## Scenarios

### Scenario: [Happy path name]
- **Given** [precondition — state that must exist before the action]
- **When** [action — what the user or system does]
- **Then** [observable outcome — what should be true after]
- **Priority:** critical | important | nice-to-have

### Scenario: [Edge case name]
- **Given** [precondition]
- **When** [action]
- **Then** [observable outcome]
- **Priority:** important

## Out of Scope
[What this feature deliberately does NOT handle]

## Acceptance Criteria
- [ ] All critical scenarios pass
- [ ] No regressions in existing tests
- [ ] [Feature-specific criteria]
```

## Rules

1. **One file per feature** in `specs/` directory
2. **Given/When/Then are mandatory** — they map directly to Arrange/Act/Assert in tests
3. **Priority is mandatory** — drives test execution order and back-testing gates
4. **Observable outcomes only** — "Then" must describe something you can assert, not internal state
5. **No implementation details** — scenarios describe behavior, not code structure

## Mapping to Tests

Each scenario maps 1:1 to a test case:

```typescript
// From specs/user-auth.md → Scenario: successful login
describe('Feature: User Auth', () => {
  it('Scenario: successful login with valid credentials', async () => {
    // Given a registered user
    const user = await createUser({ email: 'test@example.com', password: 'valid' });

    // When they submit the login form
    const result = await login({ email: 'test@example.com', password: 'valid' });

    // Then they receive an auth token
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });
});
```

## Multi-step Scenarios

For complex flows, chain Given/When/Then with **And**:

```markdown
### Scenario: checkout with discount code
- **Given** a cart with 2 items totaling $50
- **And** a valid discount code "SAVE10" for 10% off
- **When** the user applies the discount code
- **And** completes checkout
- **Then** the total charged is $45
- **And** a confirmation email is sent
- **Priority:** critical
```

## File Naming

```
specs/
├── user-auth.md           # Feature: User Authentication
├── checkout-flow.md       # Feature: Checkout Flow
├── api-rate-limiting.md   # Feature: API Rate Limiting
└── README.md              # Explains format (created by init-project)
```
