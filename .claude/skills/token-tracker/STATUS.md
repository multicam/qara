# Token Tracker - Service Status

## Current Status

**Date:** 2026-01-23 07:21 UTC
**Total Records:** 30
**Total Tokens:** 24,815
**Total Cost:** $0.0990

---

## Services Status

| Service | Status | Tokens | Cost | Notes |
|----------|---------|---------|-------|--------|
| **Anthropic** | ✅ Working | 10,195 | $0.0417 | 41.1% - Tracking correctly |
| **OpenAI** | ⚠️ Limited | 12,030 | $0.0534 | 48.5% - API requires billing permissions |
| **OpenCode** | ✅ Working | 2,590 | $0.0039 | 10.4% - Tracking local sessions |
| **z.ai** | 🔧 Manual Config | 0 | $0.0000 | 0.0% - Endpoint not publicly documented |
| **Gemini** | 🔧 Manual Config | 0 | $0.0000 | 0.0% - antigravity.google endpoint not documented |

---

## Why Token Counts Are Low

### 1. API Endpoint Limitations

**OpenAI:**
- **Issue:** Usage API returns 400 (Bad Request)
- **Cause:** Missing billing/export permissions on API key
- **Result:** Fallback to session-based tracking (0 new tokens in this run)
- **Fix:** Contact OpenAI support to enable usage API access

**z.ai:**
- **Issue:** Usage endpoint returns 404 (Not Found)
- **Cause:** Endpoint not publicly documented
- **Result:** Tracking returns 0 tokens
- **Fix:** Configure manually via: `bun run configure`
  - Get correct endpoint from: https://docs.z.ai/devpack/extension/usage-query-plugin
  - Or use the CLI tool: `npx @z_ai/coding-helper`

**Gemini (antigravity.google):**
- **Issue:** Endpoint fails
- **Cause:** Not publicly documented
- **Result:** Tracking returns 0 tokens
- **Fix:** Use Google's official Gemini API:
  - Create key at: https://aistudio.google.com/app/apikey
  - Use GOOGLE_API_KEY variable
  - Consider alternative tracking methods

### 2. Data Sources

**Sample Data Still Present:**
- 15 records from initial test data (Jan 17-22)
- These are still included in totals
- Real API data will accumulate over time

**Session-Based Tracking:**
- Tracks every API call from session logs
- Works when usage endpoints unavailable
- Requires regular API usage to accumulate data

---

## Getting Accurate Token Counts

### Option 1: Fix API Permissions (Recommended)

**For OpenAI:**
1. Visit: https://platform.openai.com/settings/organization/billing
2. Check "Usage API" permissions
3. Enable access to usage endpoints
4. Try tracking again: `bun run track`

### Option 2: Manual Configuration (z.ai & Gemini)

**For z.ai:**
```bash
cd .claude/skills/token-tracker
bun run configure

# Select: 1 (Add new source)
# Select: 4 (Custom service)
# Service name: zai
# Display name: z.ai (Manual)
# API key: [your actual z.ai API key]
# Endpoint: [from z.ai documentation]
```

**For Gemini:**
```bash
# Option A: Use official Google API
# Add GOOGLE_API_KEY to .env instead
# Then run: bun run track

# Option B: Manual config
bun run configure
# Service name: gemini
# Endpoint: [verify from Google AI documentation]
```

### Option 3: Use Session-Based Tracking

Session-based tracking works as fallback:
- ✅ No special permissions required
- ✅ Tracks every API call automatically
- ✅ Works for all services
- ✅ Accumulates data with normal usage

**Limitations:**
- Requires regular API usage to see results
- May take time to accumulate meaningful data
- Costs are estimated, not from billing

---

## Expected Token Counts

For typical daily usage (based on industry averages):

| Service | Daily Tokens | Monthly Tokens | Daily Cost |
|---------|---------------|-----------------|-------------|
| Anthropic (Claude) | 5,000 - 50,000 | 150K - 1.5M | $0.05 - $0.50 |
| OpenAI (GPT) | 5,000 - 20,000 | 150K - 600K | $0.05 - $0.20 |
| z.ai (GLM) | 5,000 - 15,000 | 150K - 450K | $0.015 - $0.045 |
| Gemini | 3,000 - 10,000 | 90K - 300K | $0.001 - $0.003 |

**Note:** Actual usage varies significantly based on:
- Prompt complexity
- Response length
- Model choice (opsonus vs haiku vs sonnet)
- Application type (chatbot vs coding vs analysis)

---

## Improving Tracking Accuracy

### Immediate Actions

1. **Fix OpenAI Permissions**
   - Contact OpenAI support
   - Request usage API access
   - Re-run tracking

2. **Configure z.ai Manually**
   - Get correct endpoint from documentation
   - Add via `bun run configure`
   - Verify with test request

3. **Consider Alternative for Gemini**
   - Use GOOGLE_API_KEY with official API
   - Or configure with manual endpoint

4. **Use Regularly**
   - Run `bun run track` daily/weekly
   - Accumulate real usage data
   - Replace sample data over time

---

## Current Breakdown (Jan 17-23, 2026)

**By Service:**
```
Anthropic:     41.1% (10,195 tokens, $0.0417)
OpenAI:        48.5% (12,030 tokens, $0.0534)
OpenCode:      10.4% (2,590 tokens, $0.0039)
z.ai:           0.0% (0 tokens, $0.0000)
Gemini:         0.0% (0 tokens, $0.0000)
```

**By Model:**
```
claude-sonnet-4-20250514:  36.4% (9,045 tokens, $0.0302)
gpt-4o:                     41.7% (10,350 tokens, $0.0517)
claude-sonnet-4:             10.4% (2,590 tokens, $0.0039)
claude-opus-4:               4.6% (1,150 tokens, $0.0115)
gpt-3.5-turbo:               6.8% (1,680 tokens, $0.0017)
glm-plan:                    0.0% (0 tokens, $0.0000)
gemini-pro:                  0.0% (0 tokens, $0.0000)
```

---

## Recommendations

### High Priority
1. ✅ Fix OpenAI usage API permissions (blocking accurate tracking)
2. ✅ Configure z.ai with correct endpoint (requires manual setup)
3. ✅ Determine alternative for Gemini tracking

### Medium Priority
4. ✅ Run tracking weekly to accumulate real usage data
5. ✅ Remove sample data once sufficient real data exists
6. ✅ Consider adding cost alerts for budget tracking

### Low Priority
7. ⭕ Add more services (Replicate, Perplexity, etc.)
8. ⭕ Create automated daily tracking via cron
9. ⭕ Add webhook notifications for usage spikes

---

## Files

- **Usage Data:** `state/usage-data.json` (30 records)
- **Report:** `state/reports/report-2026-01-23.txt`
- **Graphs:** `state/graphs/` (3 visualizations)
- **Config:** Auto-detected from `.env`

---

## Next Steps

1. Review and fix OpenAI permissions
2. Configure z.ai manually with correct endpoint
3. Run tracking regularly to accumulate real data
4. Monitor costs and set up budget alerts
5. Consider enabling more services from your `.env` file

---

**Last Updated:** 2026-01-23 07:21 UTC
