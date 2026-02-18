# Functional Test Workflow

Test forms, interactions, and key functionality.

## When to Use

- Before major release
- After significant changes to forms/interactions
- Monthly validation checks

## Steps

1. **Understand scope**
   - Which environment?
   - Which tier? (medium or secure)

2. **Run functional tests**
   ```bash
   # Medium tier: forms + links
   pnpm test:live <environment> medium

   # Secure tier: + enrolment + payment
   pnpm test:live <environment> secure
   ```

3. **Analyze failures**
   - Form validation issues
   - Bot protection missing
   - Links broken
   - Critical flow failures

4. **Provide detailed report**
   - What failed
   - Why it failed
   - Screenshots showing the issue
   - Recommended fixes

## Medium Tier Coverage

✅ Navigation smoke tests
✅ Contact form validation
✅ Internal links work
✅ Bot protection present (reCAPTCHA, honeypot)

## Secure Tier Coverage

✅ Medium tier +
✅ Enrolment flow (course → form → validation)
✅ Payment page validation
✅ Security-critical paths

## Form Testing Notes

**Current**: Validation-only
- Fills form fields
- Triggers validation
- Verifies no errors
- Does NOT submit

**Future**: When backend adds `?test=true`
- Full submission test
- Verify success message
- Check backend received test data

## Example Interaction

**User**: "Run full tests on production before we announce the launch"

**Assistant**:
```
I'll run the secure tier tests on production (includes all functionality).

[Runs: pnpm test:live production secure]

Results:
✅ Navigation: All 22 pages load correctly
✅ Forms: Contact form validation works
✅ Bot Protection: reCAPTCHA and honeypot present
⚠️  Enrolment: Flow works but payment page slow to load (2.4s)

Duration: 2m 31s

Everything is functional. The payment page is slightly slow but within
acceptable limits. Safe to announce the launch.

Full report: /tmp/live-testing/test-production-TIMESTAMP/report.json
```
