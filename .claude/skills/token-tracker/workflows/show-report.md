# Show Report

**Purpose:** Display comprehensive usage summaries, statistics, and dashboards

**When to Use:**
- User says "show report", "usage summary", "token statistics"
- When reviewing monthly/weekly consumption
- When preparing for budget meetings or cost analysis

**Prerequisites:**
- Historical usage data in usage-data.json
- At least one usage record
- Optionally: Generated graphs for enhanced reports

---

## Workflow Steps

### Step 1: Load Usage Data

**Description:** Read historical usage data for reporting

**Actions:**
```bash
# Check if data exists
if [ ! -f "${PAI_DIR}/state/token-tracker/usage-data.json" ]; then
  echo "❌ No usage data found. Run 'track-usage' first."
  exit 1
fi

# Load usage data
data=$(cat "${PAI_DIR}/state/token-tracker/usage-data.json")

# Parse basic info
record_count=$(echo "${data}" | jq 'length')
date_range_first=$(echo "${data}" | jq '.[0].timestamp' -r)
date_range_last=$(echo "${data}" | jq '.[-1].timestamp' -r)
```

**Expected Outcome:** Usage data loaded, basic metrics extracted

---

### Step 2: Determine Report Scope

**Description:** Identify what kind of report to generate based on user request

**Actions:**
- Parse user request for report type:
  - "summary" / "overview" → High-level totals and averages
  - "monthly" / "this month" → Current month breakdown
  - "weekly" / "this week" → Current week breakdown
  - "detailed" / "comprehensive" → Full breakdown by service and model
  - "costs" / "billing" → Cost-focused report

**Determine time range:**
- Default: All available data
- "this month" → Current calendar month
- "last 7 days" → Rolling 7 days
- "last 30 days" → Rolling 30 days

**Expected Outcome:** Report scope and time range determined

---

### Step 3: Calculate Aggregate Statistics

**Description:** Compute totals, averages, and trends from usage data

**Actions:**

**Total Metrics:**
```bash
# Total tokens across all sources
total_tokens=$(echo "${data}" | jq '[.[].tokens_used] | add')

# Total estimated cost
total_cost=$(echo "${data}" | jq '[.[].cost_estimate] | add')

# Total requests/sessions
total_requests=$(echo "${data}" | jq 'length')
```

**By Service:**
```bash
# Breakdown by service
by_service=$(echo "${data}" | jq 'group_by(.service) | map({service: .[0].service, tokens: ([.[].tokens_used] | add), cost: ([.[].cost_estimate] | add)})')
```

**By Model:**
```bash
# Breakdown by model
by_model=$(echo "${data}" | jq 'group_by(.model) | map({model: .[0].model, tokens: ([.[].tokens_used] | add), cost: ([.[].cost_estimate] | add)})')
```

**Time-Based Aggregates:**
```bash
# Daily averages
daily_tokens=$(echo "${data}" | jq 'group_by(.timestamp[0:10]) | map({date: .[0].timestamp[0:10], tokens: ([.[].tokens_used] | add)})')

# Growth rate (comparing recent to previous period)
growth_rate=$(calculate_trend "${data}")
```

**Expected Outcome:** Comprehensive statistics calculated

---

### Step 4: Generate Report Content

**Description:** Build formatted report with statistics and insights

**Actions:**

**Header Section:**
```
Token Usage Report
==================
Generated: $(date)
Date Range: ${date_range_first} to ${date_range_last}
Total Records: ${record_count}
```

**Summary Section:**
```
Summary
-------
Total Tokens: ${total_tokens}
Total Cost: $${total_cost}
Total Requests: ${total_requests}
Average Tokens/Request: $((${total_tokens} / ${total_requests}))
Average Cost/Request: $$(echo "${total_cost} / ${total_requests}" | bc)
```

**By Service:**
```
Usage by Service
----------------
${format_by_service_table "${by_service}"}
```

**By Model:**
```
Usage by Model
---------------
${format_by_model_table "${by_model}"}
```

**Trends:**
```
Usage Trends
------------
Daily Average: ${daily_avg_tokens}
Weekly Growth: ${growth_rate}%
Peak Usage Day: ${peak_day}
```

**Cost Breakdown:**
```
Cost Breakdown
---------------
${format_cost_table "${by_service}"}
```

**Expected Outcome:** Complete report text generated

---

### Step 5: Include Visualizations (Optional)

**Description:** Reference available graphs to enhance report

**Actions:**
```bash
# Check for existing graphs
graphs_dir="${PAI_DIR}/state/token-tracker/graphs"
if [ -d "${graphs_dir}" ] && [ "$(ls -A ${graphs_dir})" ]; then
  # Find most recent graphs
  latest_graph=$(ls -t "${graphs_dir}"/*.svg | head -1)
  latest_graph_name=$(basename "${latest_graph}")

  # Add to report
  echo ""
  echo "Visualizations"
  echo "---------------"
  echo "Latest Graph: ${latest_graph_name}"
  echo "Graph Location: ${graphs_dir}/${latest_graph_name}"
fi
```

**Expected Outcome:** Graph references added to report if available

---

### Step 6: Display Report

**Description:** Present report to user in formatted output

**Actions:**
- Print report with proper formatting
- Use tables, headers, and sections
- Include actionable insights

**Example Report:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  Token Usage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: 2026-01-23 16:28:04
Period: 2026-01-01 to 2026-01-23 (23 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
-------
Total Tokens:    45,230
Total Cost:      $15.27
Total Requests:  342
Avg Tokens/Req:  132
Avg Cost/Req:    $0.045

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE BY SERVICE
----------------
┌─────────────────┬──────────┬───────────┬────────────┐
│ Service         │ Tokens   │ Cost ($)  │ Share (%)  │
├─────────────────┼──────────┼───────────┼────────────┤
│ Anthropic       │ 20,350   │ $6.82     │ 45%        │
│ OpenAI          │ 15,880   │ $5.92     │ 35%        │
│ OpenCode        │ 9,000    │ $3.53     │ 20%        │
└─────────────────┴──────────┴───────────┴────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE BY MODEL
--------------
┌──────────────────────────────┬──────────┬───────────┐
│ Model                        │ Tokens   │ Cost ($)  │
├──────────────────────────────┼──────────┼───────────┤
│ claude-sonnet-4-20250514     │ 18,200   │ $6.10     │
│ gpt-4o                       │ 12,500   │ $4.65     │
│ claude-opus-4                 │ 2,150    │ $0.72     │
│ gpt-3.5-turbo                 │ 3,380    │ $1.27     │
└──────────────────────────────┴──────────┴───────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRENDS
------
Daily Average (tokens):  1,966
Weekly Growth:           +12.4% ↗
Peak Usage Day:         2026-01-18 (2,840 tokens)
Lowest Usage Day:       2026-01-08 (1,120 tokens)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSIGHTS
--------
• Anthropic usage increased 15% this week
• Cost per token is 0.03% below average
• You're on track for $20/month at current rate
• Consider consolidating OpenAI and Anthropic usage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUALIZATIONS
--------------
Latest Graph: usage-2026-01-23-line.svg
Location: ${PAI_DIR}/state/token-tracker/graphs/usage-2026-01-23-line.svg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Expected Outcome:** Report displayed with clear formatting

---

### Step 7: Export Report (Optional)

**Description:** Save report to file for record-keeping

**Actions:**
```bash
# Save report to file
report_file="${PAI_DIR}/state/token-tracker/reports/report-$(date +%Y-%m-%d).txt"
echo "${report_content}" > "${report_file}"

echo ""
echo "Report saved to: ${report_file}"
```

**Expected Outcome:** Report exported to file

---

## Outputs

**What this workflow produces:**
- Formatted text report with statistics
- Insights and trends analysis
- Reference to available visualizations
- Exported report file (optional)

**Where outputs are stored:**
- `${PAI_DIR}/state/token-tracker/reports/` - Saved reports
- Displayed to user in terminal

---

## Report Types

### Summary Report
- High-level totals and averages
- By-service breakdown
- Quick overview

### Monthly Report
- Current month data
- Week-by-week breakdown
- Month-over-month comparison

### Cost Report
- Cost-focused metrics
- Cost per token analysis
- Budget tracking

### Detailed Report
- By-model breakdown
- Time-series trends
- Comprehensive statistics

---

## Related Workflows

- **track-usage.md** - Collect data before reporting
- **generate-graph.md** - Create visualizations for reports

---

## Examples

**Example 1: Show Summary Report**

Input: "show my token report"

Process:
1. Load usage data (23 days, 342 records)
2. Calculate totals: 45,230 tokens, $15.27
3. Aggregate by service and model
4. Compute trends: +12.4% growth
5. Generate formatted report
6. Display to terminal

Output: Full report with summary, breakdowns, trends, and insights

**Example 2: Monthly Cost Report**

Input: "show monthly costs report"

Process:
1. Filter data to current month (2026-01)
2. Calculate cost by service and model
3. Compare to previous month if available
4. Generate cost-focused report
5. Highlight budget implications

Output: Cost report with monthly breakdown and budget insights

**Example 3: Week-by-Week Analysis**

Input: "weekly usage analysis"

Process:
1. Load usage data
2. Aggregate by week (7-day periods)
3. Calculate week-over-week growth
4. Identify usage patterns
5. Generate weekly trend report

Output: Weekly breakdown showing growth trends and patterns

---

## Error Handling

**Common Issues:**

**No Data:**
- Error: "No usage data found"
- Action: Direct user to `track-usage.md` first

**Corrupt Data:**
- Error: "Invalid JSON in usage-data.json"
- Action: Backup file, inform user, suggest re-tracking

**Date Range Empty:**
- Error: "No data in specified range"
- Action: Show available date ranges, suggest alternative

**Insufficient Data for Metrics:**
- Error: "Need at least 2 records to calculate averages"
- Action: Show basic counts, skip average calculations

---

## Report Export Formats

Supported export formats:
- **TXT** - Plain text (default, always saved)
- **CSV** - Spreadsheet compatible (on request)
- **JSON** - Machine readable (on request)
- **HTML** - Web displayable (on request)
- **Markdown** - Documentation ready (on request)

**Example: Export as CSV**
```bash
# Add flag to save as CSV
show-report --format=csv
# Creates: report-2026-01-23.csv
```

---

## Last Updated: 2026-01-23
