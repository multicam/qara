---
name: token-tracker
context: same
description: |
  Track and graph token usage data across all your subscriptions and API keys.
  Like toktop but simpler and extended to all accounts you use in opencode.

  USE WHEN user says "track tokens", "token usage", "check my API usage", "show token consumption",
  "graph my tokens", "track subscription costs", "monitor API usage", "token statistics",
  "usage report", "token dashboard", "API costs", "billing tracking", or any request related to token usage tracking and visualization.
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests tracking token usage:**
Examples: "track tokens", "check token usage", "monitor API consumption", "collect usage data", "fetch token stats", "get usage from [service]"
→ **READ:** ${PAI_DIR}/skills/token-tracker/workflows/track-usage.md
→ **EXECUTE:** Collect and store token usage data from configured API sources

**When user requests generating graphs or visualizations:**
Examples: "graph my tokens", "create usage graph", "visualize token data", "plot consumption", "generate charts", "create usage visualization", "graph [service] usage"
→ **READ:** ${PAI_DIR}/skills/token-tracker/workflows/generate-graph.md
→ **EXECUTE:** Generate visual graphs/charts from stored token usage data

**When user requests configuring API sources or keys:**
Examples: "add API key", "configure source", "setup token tracking", "add service", "update API key", "configure [service]", "new source"
→ **READ:** ${PAI_DIR}/skills/token-tracker/workflows/configure-source.md
→ **EXECUTE:** Add or update API keys and service configurations for tracking

**When user requests showing usage reports or summaries:**
Examples: "show report", "usage summary", "token statistics", "display usage", "show my costs", "token dashboard", "usage overview", "monthly report"
→ **READ:** ${PAI_DIR}/skills/token-tracker/workflows/show-report.md
→ **EXECUTE:** Display comprehensive usage summary with statistics

---

## When to Activate This Skill

### Direct Token Tracker Requests (Categories 1-4)
- "token tracker", "token tracking", "token usage tracker", "API usage tracker"
- "track tokens", "monitor usage", "track API consumption", "monitor token usage"
- "quick token check", "simple usage report", "full token analysis", "comprehensive usage tracking"
- "track tokens for [service]", "token usage for [service]", "monitor [service] API"

### Usage Monitoring & Analysis (Categories 5-7)
- "check my token usage", "how many tokens have I used", "show API consumption"
- "token statistics", "usage analytics", "API cost analysis"
- "find my usage data", "get token stats", "discover usage patterns"
- "track subscription costs", "monitor billing", "API cost tracking"

### Visualization & Reporting (Category 8)
- "graph my tokens", "create usage chart", "visualize consumption", "plot token data"
- "generate usage report", "token dashboard", "usage visualization"

### Configuration & Management (Additional Categories)
- "add API key to track", "configure token source", "setup tracking for [service]"
- "update tracking configuration", "manage API sources"

---

## Core Capabilities

**What this skill provides:**
- **Multi-Source Tracking**: Collect token usage from multiple API services (OpenAI, Anthropic, etc.)
- **Data Storage**: Maintain historical usage data in structured format
- **Visualization**: Generate graphs and charts for usage trends
- **Reporting**: Display summaries, statistics, and cost estimates
- **Configuration**: Manage API keys and service connections
- **Extensibility**: Easy to add new services and data sources

---

## Workflow Overview

**Data Collection**
- **track-usage.md** - Collect and store token usage from configured API sources

**Visualization**
- **generate-graph.md** - Create visual graphs and charts from usage data

**Configuration**
- **configure-source.md** - Add or update API keys and service configurations

**Reporting**
- **show-report.md** - Display usage summaries, statistics, and dashboards

---

## Extended Context

### Data Storage

Token usage data is stored locally in:
- `${PAI_DIR}/state/token-tracker/usage-data.json` - Historical usage records
- `${PAI_DIR}/state/token-tracker/config.json` - API keys and service configurations
- `${PAI_DIR}/state/token-tracker/graphs/` - Generated visualizations

### Supported Services

Out of the box support for:
- OpenAI API (GPT models)
- Anthropic API (Claude models)
- Additional services can be configured via `configure-source.md`

### Graph Output

Graphs are generated as:
- SVG format for web display
- PNG for embedding in documents
- JSON data for custom visualization tools

### Integration Points

- Uses OpenCode session data for local tracking
- Integrates with external API usage endpoints
- Compatible with standard JSON data formats
- Supports custom graph configurations via template files

---

## Configuration

### Initial Setup

Before tracking usage, configure at least one API source:

```
User: "configure token tracker for OpenAI"
→ Routes to configure-source.md
→ Prompts for API key and service details
→ Stores configuration in state/token-tracker/config.json
```

### Tracking Frequency

Usage can be tracked:
- On-demand via "track tokens" command
- Scheduled via cron (external automation)
- After each session (via hooks)

---

## Examples

**Example 1: Track Usage for All Configured Sources**

User: "track token usage"

Skill Response:
1. Routes to track-usage.md
2. Executes: Fetches usage from all configured API sources
3. Stores data in state/token-tracker/usage-data.json
4. Outcome: Usage data updated with latest statistics

**Example 2: Generate Usage Graph**

User: "graph my token consumption for the last 30 days"

Skill Response:
1. Routes to generate-graph.md
2. Executes: Reads historical data, generates SVG graph
3. Saves to state/token-tracker/graphs/usage-2026-01-23.svg
4. Outcome: Visual graph showing usage trends over time

**Example 3: Add New API Key**

User: "add Anthropic API key for tracking"

Skill Response:
1. Routes to configure-source.md
2. Prompts for API key and model details
3. Validates key with service
4. Stores in state/token-tracker/config.json
5. Outcome: New source configured and ready for tracking

**Example 4: Show Usage Summary**

User: "show my token report"

Skill Response:
1. Routes to show-report.md
2. Executes: Aggregates data from all sources
3. Calculates totals, averages, trends
4. Displays summary with key statistics
5. Outcome: Comprehensive usage dashboard displayed

---

## Related Documentation

- `${PAI_DIR}/skills/CORE/skill-structure.md` - Canonical structure guide
- `${PAI_DIR}/skills/token-tracker/workflows/track-usage.md` - Usage collection workflow
- `${PAI_DIR}/skills/token-tracker/workflows/generate-graph.md` - Graph generation workflow
- `${PAI_DIR}/skills/token-tracker/workflows/configure-source.md` - Configuration workflow
- `${PAI_DIR}/skills/token-tracker/workflows/show-report.md` - Reporting workflow

---

## Technical Notes

### Data Format

Usage records follow this structure:
```json
{
  "timestamp": "2026-01-23T16:28:04Z",
  "service": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "tokens_used": 1250,
  "cost_estimate": 0.005
}
```

### Graph Templates

Graph templates can be customized in:
- `${PAI_DIR}/skills/token-tracker/assets/graph-templates/` (optional)
- Default templates provided for common visualizations

### Cost Estimation

Costs are calculated based on:
- Service-specific pricing models
- Model tier pricing
- Real-time pricing data when available

---

**Last Updated:** 2026-01-23
