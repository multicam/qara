# Mocking Guidelines

When and how to use mocks in tests. Applies to all test types (unit, integration, E2E).

## The Rule

**Mock at system boundaries only.** Everything else uses real code.

### Mock These (System Boundaries)

- External APIs (payment, email, SMS, third-party services)
- Databases (sometimes — prefer test DB or PGLite)
- Time / randomness
- File system (sometimes)
- Network requests to services you don't control

### Never Mock These

- Your own classes or modules
- Internal collaborators within your codebase
- Anything you control and can run in tests

If you're mocking your own code, it's a design smell — the interface is too coupled.

## Designing for Mockability

### 1. Dependency Injection

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock — dependency is injected
function processPayment(order: Order, paymentClient: PaymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock — dependency is created internally
function processPayment(order: Order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

### 2. SDK-style Interfaces Over Generic Fetchers

Create specific functions for each external operation:

```typescript
// GOOD: Each function independently mockable, type-safe per endpoint
const api = {
  getUser: (id: string) => fetch(`/users/${id}`),
  getOrders: (userId: string) => fetch(`/users/${userId}/orders`),
  createOrder: (data: OrderData) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint: string, options?: RequestInit) => fetch(endpoint, options),
};
```

## Dependency Classification

Use this to decide your mocking strategy:

| Type | Example | Strategy |
|------|---------|----------|
| **In-process** | Pure computation, in-memory state | Never mock — always run real code |
| **Local-substitutable** | Database, file system | Use test doubles (PGLite, in-memory FS) |
| **Remote but owned** | Internal microservices | Introduce port interface, inject transport |
| **True external** | Stripe, Twilio, SendGrid | Mock at boundary, verify contract |

## Attribution

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills). Dependency classification from `improve-codebase-architecture` REFERENCE.md.
