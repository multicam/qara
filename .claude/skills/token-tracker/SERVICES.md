# Token Tracker - Service Configuration

## Auto-Detected Services from .env

The token-tracker automatically detects these API keys from your `.env`:

| .env Variable | Service | Status | Notes |
|----------------|----------|---------|--------|
| ANTHROPIC_API_KEY | Anthropic | ✅ Working | Tracks Claude usage |
| OPENAI_API_KEY | OpenAI | ⚠️ Limited | API requires billing permissions |
| ZAI_API_KEY | z.ai | 🔧 Custom | Endpoint may vary |
| GEMINI_API_KEY | Gemini (via antigravity.ai) | 🔧 Custom | Endpoint may vary |

## Manual Configuration

For services not auto-detected or requiring custom endpoints:

### z.ai

```bash
cd .claude/skills/token-tracker
bun run configure

# Options:
1. Add new source
2. Select: 4 (Custom service)
3. Service name: zai
4. Display name: z.ai
5. API key: [your z.ai API key]
6. Endpoint: https://api.z.ai/v1/usage
```

### Gemini via antigravity.ai

```bash
cd .claude/skills/token-tracker
bun run configure

# Options:
1. Add new source
2. Select: 4 (Custom service)
3. Service name: gemini
4. Display name: Gemini (antigravity)
5. API key: [your Gemini API key]
6. Endpoint: https://api.antigravity.ai/v1/gemini/usage
```

## API Notes

### Anthropic
- **Status:** Auto-detected and working
- **Endpoint:** https://api.anthropic.com/v1/messages
- **Cost Model:** $0.003/1K input + $0.015/1K output

### OpenAI
- **Status:** Auto-detected (limited)
- **Issue:** Usage endpoint requires specific billing permissions
- **Fallback:** Tracks session-based usage
- **Cost Model:** Varies by model ($0.00001-$0.00015/token)

### z.ai
- **Status:** Requires manual config
- **Issue:** Endpoint may be different (404 error)
- **Action:** Verify correct endpoint from z.ai documentation
- **Custom Config Recommended:** Yes

### Gemini (antigravity.ai)
- **Status:** Requires manual config
- **Issue:** Connection failed (DNS or network)
- **Action:** Verify service availability and endpoint
- **Custom Config Recommended:** Yes

## Troubleshooting

### "Failed to fetch usage"

1. **Check API Key:**
   ```bash
   cat ~/.claude/.env | grep YOUR_SERVICE_API_KEY
   ```

2. **Verify Endpoint:**
   - Check service documentation
   - Some services require OAuth tokens vs API keys
   - Some use different base URLs

3. **Test Endpoint Directly:**
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" https://api.service.com/v1/usage
   ```

### "404 Not Found" (z.ai)

The z.ai endpoint may have changed:
1. Check z.ai API documentation
2. Update endpoint in manual config
3. Common alternatives:
   - https://api.z.ai/v1/usage
   - https://api.z.ai/v1/analytics
   - https://api.z.ai/v1/tokens

### "Unable to connect" (Gemini via antigravity)

1. **Check service status:** https://status.antigravity.ai
2. **Verify DNS:** `nslookup api.antigravity.ai`
3. **Alternative:** Use Google's official Gemini API directly
   - Endpoint: https://generativelanguage.googleapis.com/v1beta/models
   - Requires GOOGLE_API_KEY

## Session-Based Fallback

When API endpoints are unavailable or restricted, token-tracker falls back to tracking **session-based usage**:

✅ Tracks every API request
✅ Counts tokens from responses
✅ Works without usage endpoints
✅ Calculates costs based on model pricing

### Services with Session Tracking

| Service | Session Source | Model Detection |
|---------|----------------|-----------------|
| Anthropic | .sessions/*.json | claude-* models |
| OpenAI | .sessions/*.json | gpt-* models |
| OpenCode | .sessions/*.json | claude-* models |
| z.ai | Not available | Requires config |
| Gemini | Not available | Requires config |

## Cost Estimation

When exact API costs aren't available, token-tracker estimates based on:

### Anthropic Claude
- claude-sonnet-4: $0.003/1K input + $0.015/1K output
- claude-opus-4: $0.015/1K input + $0.075/1K output
- claude-haiku-4: $0.00025/1K input + $0.00125/1K output

### OpenAI GPT
- gpt-4o: ~$0.000005/token
- gpt-4o-mini: ~$0.00000015/token
- gpt-4-turbo: ~$0.00001/token
- gpt-3.5-turbo: ~$0.0000005/token

### Gemini
- gemini-1.5-pro: ~$0.0000035/token
- gemini-1.5-flash: ~$0.000000075/token

## Getting Real API Keys

### Where to Get Keys

1. **z.ai:**
   - Visit: https://console.z.ai
   - Create account
   - Generate API key
   - Check documentation for correct endpoint

2. **Gemini:**
   - Visit: https://aistudio.google.com/app/apikey
   - Create project
   - Generate API key
   - Use Google's official API or antigravity.ai proxy

3. **Anthropic:**
   - Visit: https://console.anthropic.com/settings/keys
   - Already in your .env if working

4. **OpenAI:**
   - Visit: https://platform.openai.com/api-keys
   - Already in your .env if working

## Support

If you encounter issues with specific services:

1. **Check service status pages**
2. **Review API documentation** (endpoints change frequently)
3. **Update token-tracker** for new endpoints
4. **Use session-based tracking** as fallback

The token-tracker will continue tracking even when API endpoints fail, using session data as a reliable fallback.
