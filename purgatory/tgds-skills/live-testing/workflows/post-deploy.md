# Post-Deploy Workflow

Comprehensive validation after deployment.

## When to Use

- Immediately after deploying to staging
- After deploying to production
- User requests "validate deployment"

## Steps

1. **Identify environment**
   - If user says "deployed to staging" → test staging
   - If user says "deployed to production" → test production
   - If unclear, ask

2. **Choose tier based on environment**
   - **Staging**: medium tier (faster feedback)
   - **Production**: secure tier (comprehensive)

3. **Run tests**
   ```bash
   # Staging
   pnpm test:live staging medium

   # Production
   pnpm test:live production secure
   ```

4. **Optional: Enable Slack notifications**
   ```bash
   pnpm test:live production secure --slack
   ```

5. **Review and report**
   - All passed → "Deployment successful, site is working"
   - Some failures → Identify issues, provide screenshots
   - Circuit breaker → "Site appears down, investigate deployment"

## Deployment Checklist

After running tests, verify:

✅ **Navigation**
   - All pages load
   - Header menu works
   - Footer links work

✅ **Content**
   - No 404 errors
   - No console errors
   - Images load

✅ **Forms** (medium+)
   - Contact form validation
   - Bot protection active

✅ **Critical Flows** (secure)
   - Enrolment journey
   - Payment page accessible
   - Security features present

## Example Interaction

**User**: "I just deployed to production"

**Assistant**:
```
I'll validate the production deployment with comprehensive tests.

[Runs: pnpm test:live production secure --slack]

✅ Deployment Validated

Navigation: 22/22 pages ✓
Forms: Contact form working ✓
Bot Protection: Active ✓
Enrolment Flow: Working ✓
Payment Page: Accessible ✓

Duration: 2m 18s

All systems operational. Slack notification sent.

Report: /tmp/live-testing/test-production-TIMESTAMP/report.json
```

## Circuit Breaker Alert

If tests stop early:

```
🚨 Deployment Issue Detected

Tests stopped after 3 consecutive failures.
Only 7/22 pages tested before circuit breaker tripped.

Failed pages:
  • About Us (404)
  • Privacy Policy (404)
  • FAQ (404)

Recommendation: Check deployment - site appears down or files missing.
```

## Slack Integration

When `--slack` flag is used:
- Sends summary to Slack
- Includes pass/fail counts
- Lists failed tests
- Links to full report
