# Track Usage

**Purpose:** Collect and store token usage data from configured API sources

**When to Use:**
- User says "track tokens", "check usage", "monitor consumption"
- When scheduled tracking needs to run
- When updating usage data for reports or graphs

**Prerequisites:**
- At least one API source configured in config.json
- Valid API keys with read/usage permissions
- Network access to API endpoints

---

## Workflow Steps

### Step 1: Load Configuration

**Description:** Read configured API sources and credentials

**Actions:**
```bash
# Check if config exists
if [ ! -f "${PAI_DIR}/state/token-tracker/config.json" ]; then
  echo "❌ No configuration found. Run 'configure-source' first."
  exit 1
fi

# Load configuration
cat "${PAI_DIR}/state/token-tracker/config.json"
```

**Expected Outcome:** Configured API sources loaded with valid keys

---

### Step 2: Fetch Usage Data from Each Source

**Description:** Query each configured API for current usage statistics

**Actions:**
- For each service in config.json:
  - Build appropriate API request
  - Include authentication headers
  - Request usage data from service endpoint
  - Parse response for token counts and costs

**Service-Specific Endpoints:**

**Anthropic API:**
```bash
curl https://api.anthropic.com/v1/usage \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01"
```

**OpenAI API:**
```bash
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer ${OPENAI_API_KEY}"
```

**OpenCode Session Data:**
```bash
# Read session logs from ${PAI_DIR}/.sessions/
# Parse token usage from session metadata
# Aggregate by service and model
```

**Expected Outcome:** Usage data retrieved from all configured sources

---

### Step 3: Parse and Normalize Data

**Description:** Convert API responses into consistent internal format

**Actions:**
- Parse JSON responses
- Normalize field names (tokens_used, cost, timestamp, service, model)
- Calculate derived metrics (cost per token, rate)
- Validate data integrity

**Output Format:**
```json
{
  "timestamp": "2026-01-23T16:28:04Z",
  "service": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "tokens_used": 1250,
  "cost_estimate": 0.005,
  "metadata": {
    "request_type": "completion",
    "session_id": "ses_abc123"
  }
}
```

**Expected Outcome:** All usage data normalized to standard format

---

### Step 4: Store Usage Data

**Description:** Append new usage records to historical data file

**Actions:**
```bash
# Ensure state directory exists
mkdir -p "${PAI_DIR}/state/token-tracker"

# Load existing data or create new array
if [ -f "${PAI_DIR}/state/token-tracker/usage-data.json" ]; then
  # Append to existing
else
  # Create new with header
fi

# Save updated data
cat "${PAI_DIR}/state/token-tracker/usage-data.json"
```

**Expected Outcome:** New usage data saved to usage-data.json

---

### Step 5: Verify Data Integrity

**Description:** Confirm data was stored correctly

**Verification:**
- Check file exists and is valid JSON
- Verify record count increased
- Sample recent record for accuracy
- Check for duplicate timestamps

**Expected Outcome:** Data integrity verified, no duplicates found

---

## Outputs

**What this workflow produces:**
- Updated usage-data.json with latest records
- Timestamp of last successful collection
- Summary statistics (total tokens, cost estimate)

**Where outputs are stored:**
- `${PAI_DIR}/state/token-tracker/usage-data.json` - Historical usage data

---

## Related Workflows

- **generate-graph.md** - Create visualizations from collected data
- **show-report.md** - Display usage summary
- **configure-source.md** - Add new tracking sources

---

## Examples

**Example 1: Track All Configured Sources**

Input: "track tokens"

Process:
1. Load config with 3 sources (Anthropic, OpenAI, OpenCode)
2. Query each API for usage
3. Normalize all responses
4. Append 3 new records to usage-data.json
5. Verify data integrity

Output: "Collected usage from 3 sources. Total tokens: 15,420. Cost: $0.52"

**Example 2: Track Specific Service**

Input: "track tokens for Anthropic"

Process:
1. Load config, filter for Anthropic source
2. Query Anthropic API only
3. Parse and normalize response
4. Append record to usage-data.json
5. Verify record

Output: "Collected Anthropic usage. Tokens: 5,230. Cost: $0.18"

---

## Error Handling

**Common Issues:**

**Invalid API Key:**
- Error: "401 Unauthorized"
- Action: Prompt user to reconfigure via `configure-source.md`

**Service Outage:**
- Error: "503 Service Unavailable"
- Action: Log error, continue with other sources, notify user

**Rate Limit:**
- Error: "429 Too Many Requests"
- Action: Wait and retry, use exponential backoff

**No Configured Sources:**
- Error: "No configuration found"
- Action: Direct user to `configure-source.md`

---

## Last Updated: 2026-01-23
