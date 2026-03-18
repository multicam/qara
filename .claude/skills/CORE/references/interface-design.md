# Interface Design for Testability

Design interfaces that are naturally testable without requiring complex test infrastructure.

## Three Principles

### 1. Accept Dependencies, Don't Create Them

```typescript
// Testable — inject the dependency
function processOrder(order: Order, paymentGateway: PaymentGateway) {}

// Hard to test — creates its own dependency
function processOrder(order: Order) {
  const gateway = new StripeGateway();
}
```

### 2. Return Results, Don't Produce Side Effects

```typescript
// Testable — pure computation, assert on return value
function calculateDiscount(cart: Cart): Discount {}

// Hard to test — mutates input, must inspect side effects
function applyDiscount(cart: Cart): void {
  cart.total -= discount;
}
```

### 3. Minimize Surface Area

- Fewer methods = fewer test paths
- Fewer params = simpler test setup
- Smaller interface = easier to understand, harder to misuse

See `deep-modules.md` for the underlying principle.

## Attribution

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills).
