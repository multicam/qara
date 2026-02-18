# Smoke Test Workflow

Quick validation that the deployed site is working.

## When to Use

- After deployment to staging/production
- Before announcing site is live
- Quick health check

## Steps

1. **Understand the request**
   - Which environment? (staging or production)
   - Any specific pages to focus on?

2. **Run smoke tests**
   ```bash
   pnpm test:live <environment> quick
   ```

3. **Review results**
   - Check console output for failures
   - Review screenshots if any failures
   - Check report JSON for details

4. **Report to user**
   - Summary: X/Y tests passed
   - Failed pages (if any)
   - Screenshot paths
   - Report location

5. **If failures detected**
   - Identify pattern (all pages? specific section?)
   - Check if circuit breaker tripped (site down)
   - Suggest investigation of failed pages

## Example Interaction

**User**: "Test staging"

**Assistant**:
```
I'll run smoke tests on staging.

[Runs: pnpm test:live staging quick]

Results:
✅ 21/22 tests passed (95.5%)
❌ 1 failure: "Meet the Tutors" page (navigation issue)

Duration: 14.4s

The site is mostly working, but the "Meet the Tutors" page has a redirect
or navigation issue. Screenshot saved at:
/tmp/live-testing/test-staging-TIMESTAMP/meet-the-tutors-TIMESTAMP.png

Full report: /tmp/live-testing/test-staging-TIMESTAMP/report.json
```

## Success Criteria

- All pages return 200 OK
- No console errors
- All navigation links work
- Header and footer menus functional

## Circuit Breaker

If 3 consecutive failures:
- Site is likely down or broken
- Stop testing immediately
- Alert user to check deployment
