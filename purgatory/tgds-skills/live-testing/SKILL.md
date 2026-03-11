---
name: live-testing
context: fork
description: |
  Live website testing for deployed TGDS sites.
  Automated Playwright smoke tests + functional tests + E2E flows.
  Tests staging and production environments with circuit breaker protection.

USE WHEN: "test production", "test staging", "smoke test", "test the live site",
"run live tests", "check if site is working", "validate deployment",
"test enrolment flow", "test contact form", "verify production"
---

# Live Testing

Automated testing framework for deployed TGDS websites using Playwright.

## Quick Commands

```bash
# Smoke tests (quick)
pnpm test:live production
pnpm test:live staging

# Functional tests (medium)
pnpm test:live production medium

# Full E2E tests (secure)
pnpm test:live production secure

# With options
pnpm test:live production --headed --slack
```

## Test Tiers

| Tier | Duration | Coverage |
|------|----------|----------|
| **quick** | ~30-45s | All navigation links (header + footer), page loads, no console errors |
| **medium** | ~60-90s | Quick + form validation + internal links + bot protection |
| **secure** | ~2-3min | Medium + enrolment flow + payment validation |

## How It Works

1. **Circuit Breaker**: Stops after 3 consecutive failures (site clearly down)
2. **Screenshots**: Captured automatically on failure
3. **Reports**: JSON report + console summary
4. **Slack**: Optional notifications on completion

## Workflows

- **smoke-test.md** — Quick validation after deployment
- **functional-test.md** — Forms, links, interactions
- **post-deploy.md** — Comprehensive post-deployment validation

## When to Use

✅ **After deployment** — Verify staging/production works
✅ **Before release** — Full validation before going live
✅ **Debugging** — Identify broken pages or flows
✅ **Monitoring** — Scheduled checks via cron

## Integration

Located in: `install/live-testing/`

CLI: `install/live-testing/cli.mjs`

Reports: `/tmp/live-testing/test-<env>-<timestamp>/`

## Architecture

```
install/live-testing/
├── cli.mjs                   # CLI entry point
├── lib/
│   ├── config.mjs            # Test configuration
│   ├── runner.mjs            # Playwright test runner
│   ├── reporter.mjs          # Console + Slack reporting
│   └── circuit-breaker.mjs   # Failure detection
└── suites/                   # Playwright test files
```

## Form Testing

Currently uses **validation-only** (no test endpoint).

When backend adds `?test=true`, upgrade to full submission testing.

## See Also

- **system-create-cli** — For creating new CLI tools
- **prompting** — For test assertion prompts
