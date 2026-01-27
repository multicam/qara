# Configure Source

**Purpose:** Add or update API keys and service configurations for token tracking

**When to Use:**
- User says "add API key", "configure source", "setup tracking"
- When adding a new service to track
- When updating existing API keys or endpoints

**Prerequisites:**
- Valid API key for the service being configured
- Knowledge of service name and required endpoints
- Write access to config.json

---

## Workflow Steps

### Step 1: Initialize Configuration

**Description:** Ensure config file and directory structure exist

**Actions:**
```bash
# Create state directory
mkdir -p "${PAI_DIR}/state/token-tracker"

# Create config file if it doesn't exist
if [ ! -f "${PAI_DIR}/state/token-tracker/config.json" ]; then
  echo '{"sources": []}' > "${PAI_DIR}/state/token-tracker/config.json"
fi
```

**Expected Outcome:** Config directory and file initialized

---

### Step 2: Collect Service Information

**Description:** Gather details from user about the API source to configure

**Actions:**
- Prompt user for:
  - **Service Name**: Which service to track? (anthropic, openai, custom)
  - **API Key**: Authentication credential
  - **Endpoint**: Usage endpoint URL (optional, has defaults)
  - **Display Name**: Human-readable name for reports (optional)
  - **Model Filter**: Track specific models or all (optional)
  - **Custom Headers**: Additional headers for API requests (optional)

**Prompt Template:**
```
Configuring new token tracking source:

1. Service Name: [anthropic/openai/custom]
2. API Key: [paste key]
3. Endpoint URL: [optional, uses default if empty]
4. Display Name: [optional, uses service name if empty]
5. Track Specific Models? [y/n, empty = all models]
```

**Expected Outcome:** Service details collected from user

---

### Step 3: Validate API Key (Optional)

**Description:** Test API key before saving configuration

**Actions:**
- Make a test request to service endpoint
- Check for valid response (200 OK)
- Verify key has usage/read permissions
- Return validation result

**Validation Commands:**

**Anthropic:**
```bash
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":1,"messages":[{"role":"user","content":"test"}]}'
```

**OpenAI:**
```bash
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer ${API_KEY}"
```

**Expected Outcome:** API key validated or error returned

---

### Step 4: Build Configuration Entry

**Description:** Create structured configuration object for the source

**Actions:**
- Create configuration object with collected details
- Include metadata (created_at, last_updated)
- Apply default values for optional fields
- Generate unique source ID

**Configuration Structure:**
```json
{
  "id": "src_abc123",
  "service": "anthropic",
  "display_name": "Anthropic Production",
  "api_key": "sk-ant-...",
  "endpoint": "https://api.anthropic.com/v1/usage",
  "models": ["claude-sonnet-4-20250514", "claude-opus-4"],
  "headers": {
    "x-api-key": "${API_KEY}",
    "anthropic-version": "2023-06-01"
  },
  "created_at": "2026-01-23T16:28:04Z",
  "last_updated": "2026-01-23T16:28:04Z",
  "enabled": true
}
```

**Expected Outcome:** Configuration object created

---

### Step 5: Update Configuration File

**Description:** Add or update source in config.json

**Actions:**
```bash
# Load existing config
config=$(cat "${PAI_DIR}/state/token-tracker/config.json")

# Check if source already exists by ID or service
# If exists: update the entry
# If new: append to sources array

# Save updated config
echo "${config}" > "${PAI_DIR}/state/token-tracker/config.json"

# Output confirmation
echo "✅ Source configured: ${service_name}"
```

**Expected Outcome:** Configuration file updated with new/modified source

---

### Step 6: Verify Configuration

**Description:** Confirm configuration is valid and usable

**Verification:**
- Parse config.json as valid JSON
- Verify source appears in sources array
- Check all required fields present
- Test API key if validation enabled

**Expected Outcome:** Configuration verified, ready for tracking

---

### Step 7: List All Configured Sources (Optional)

**Description:** Show user all currently configured sources

**Actions:**
```bash
# Parse and display sources from config
echo "Configured sources:"
for source in $(jq -r '.sources[] | "\(.display_name) (\(.service))"' config.json); do
  echo "  - ${source}"
done
```

**Expected Outcome:** User sees all active tracking sources

---

## Outputs

**What this workflow produces:**
- Updated config.json with new/modified source
- Confirmation message with source details
- List of all configured sources

**Where outputs are stored:**
- `${PAI_DIR}/state/token-tracker/config.json` - API source configurations

---

## Supported Services

### Anthropic (Claude)
- Default endpoint: `https://api.anthropic.com/v1/usage`
- Required header: `x-api-key`
- Optional: Model filter list

### OpenAI (GPT)
- Default endpoint: `https://api.openai.com/v1/usage`
- Required header: `Authorization: Bearer ${key}`
- Optional: Model filter list

### OpenCode (Local Sessions)
- No API key required
- Source: Local session logs
- Automatic token counting from sessions

### Custom Services
- User-provided endpoint
- User-provided headers
- Custom response parsing (JSON path)

---

## Related Workflows

- **track-usage.md** - Track usage from configured sources
- **show-report.md** - Include source info in reports

---

## Examples

**Example 1: Add Anthropic API Key**

Input: "configure token tracker for Anthropic"

Process:
1. Initialize config file
2. Prompt: Service name? → "anthropic"
3. Prompt: API key? → "sk-ant-..."
4. Validate key with test request
5. Build configuration entry
6. Append to sources array
7. Save config.json
8. Verify and list sources

Output: "✅ Anthropic configured with ID src_abc123. Ready to track."

**Example 2: Add OpenAI with Custom Name**

Input: "add OpenAI API key as 'OpenAI Dev Account'"

Process:
1. Load existing config
2. Prompt: Service? → "openai"
3. Prompt: API key? → "sk-..."
4. Prompt: Display name? → "OpenAI Dev Account"
5. Validate key
6. Build configuration with custom name
7. Append to sources
8. Save and verify

Output: "✅ OpenAI Dev Account (openai) configured. ID: src_def456"

**Example 3: Add OpenCode Session Tracking**

Input: "track OpenCode sessions"

Process:
1. Initialize config
2. Prompt: Service name? → "opencode"
3. Prompt: API key? → [skip, not needed]
4. Build configuration for local sessions
5. Set endpoint to local path
6. Append to sources
7. Save and verify

Output: "✅ OpenCode session tracking configured. Local logs will be parsed."

**Example 4: Update Existing Source**

Input: "update Anthropic API key"

Process:
1. Load config
2. Find existing Anthropic source by ID or service
3. Prompt: New API key? → "sk-ant-NEW..."
4. Validate new key
5. Update existing entry (preserve other settings)
6. Save config
7. Verify

Output: "✅ Anthropic API key updated. Old key replaced."

---

## Error Handling

**Common Issues:**

**Invalid API Key:**
- Error: "401 Unauthorized" or "403 Forbidden"
- Action: Prompt user to verify key and try again

**Config File Corrupt:**
- Error: "Invalid JSON in config.json"
- Action: Backup corrupt file, create new config with empty sources

**Duplicate Source:**
- Error: "Source with this service already exists"
- Action: Ask user to update existing or use different display name

**Missing Required Fields:**
- Error: "Service name and API key are required"
- Action: Reprompt for missing information

**Write Permission Denied:**
- Error: "Cannot write to config file"
- Action: Check file permissions and directory ownership

---

## Security Notes

**Best Practices:**
- API keys are stored in plain text in config.json
- Ensure config.json has restricted file permissions (600)
- Never commit config.json to version control
- Add config.json to .gitignore
- Consider environment variables for production deployments

**File Permissions:**
```bash
chmod 600 "${PAI_DIR}/state/token-tracker/config.json"
```

**Gitignore:**
```
# Add to .gitignore
.claude/state/token-tracker/config.json
```

---

## Last Updated: 2026-01-23
