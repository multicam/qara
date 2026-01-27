# Generate Graph

**Purpose:** Create visual graphs and charts from stored token usage data

**When to Use:**
- User says "graph my tokens", "create usage graph", "visualize consumption"
- When preparing reports or presentations
- When analyzing usage trends over time

**Prerequisites:**
- Historical usage data in usage-data.json
- At least one record with timestamp and usage values
- Graph generation tools (SVG, charting libraries, etc.)

---

## Workflow Steps

### Step 1: Load Usage Data

**Description:** Read historical usage data for visualization

**Actions:**
```bash
# Load usage data
cat "${PAI_DIR}/state/token-tracker/usage-data.json"

# Check if data exists
if [ ! -f "${PAI_DIR}/state/token-tracker/usage-data.json" ]; then
  echo "❌ No usage data found. Run 'track-usage' first."
  exit 1
fi
```

**Expected Outcome:** Usage data loaded, filtered by date range if specified

---

### Step 2: Determine Graph Type and Parameters

**Description:** Identify what kind of graph to generate based on user request

**Actions:**
- Parse user request for graph type:
  - "line graph" / "trend" → Time series line chart
  - "bar chart" / "comparison" → Bar chart by service/model
  - "pie chart" / "distribution" → Pie chart of token share
  - "heatmap" / "timeline" → Heatmap of usage patterns
- Determine date range:
  - "last 7 days" / "this week" → 7 days
  - "last 30 days" / "this month" → 30 days
  - "all time" / "historical" → All data
- Determine grouping:
  - By service (Anthropic, OpenAI)
  - By model (claude-sonnet, gpt-4)
  - By day/week/month
  - Total aggregate

**Expected Outcome:** Graph type, date range, and grouping determined

---

### Step 3: Aggregate and Prepare Data

**Description:** Transform raw usage data into graph-ready format

**Actions:**
- Filter data by date range
- Group by specified dimension (service, model, time)
- Calculate aggregates (sum, average, max, min)
- Sort data for proper visualization

**Example aggregation (by service, by day):**
```json
{
  "2026-01-17": {
    "anthropic": 1500,
    "openai": 2300,
    "total": 3800
  },
  "2026-01-18": {
    "anthropic": 1800,
    "openai": 2100,
    "total": 3900
  }
}
```

**Expected Outcome:** Data aggregated and formatted for graphing

---

### Step 4: Generate Graph

**Description:** Create visualization from aggregated data

**Actions:**

**Option A: SVG Generation (Default)**
- Generate SVG markup directly
- Include axis labels, legends, titles
- Apply styling (colors, fonts, sizes)
- Add tooltips for interactivity

**Option B: Using Graphing Library**
- Use chart.js, plotly, or similar
- Pass aggregated data to library
- Configure chart options
- Render to SVG/PNG

**Template-based SVG Generation:**
```bash
# Load template from assets/graph-templates/line-chart.svg.template
# Replace placeholders with data values
# Generate final SVG file
```

**Expected Outcome:** Visual graph file generated

---

### Step 5: Save and Display Graph

**Description:** Store graph file and present to user

**Actions:**
```bash
# Create graphs directory
mkdir -p "${PAI_DIR}/state/token-tracker/graphs"

# Save with timestamp
filename="usage-$(date +%Y-%m-%d-%H%M%S).svg"
cat > "${PAI_DIR}/state/token-tracker/graphs/${filename}"

# Display file path and preview
echo "✅ Graph saved to: ${PAI_DIR}/state/token-tracker/graphs/${filename}"
```

**Expected Outcome:** Graph saved, file path displayed, preview shown

---

### Step 6: Optional - Generate Alternative Formats

**Description:** Create additional formats for different use cases

**Actions:**
- PNG for documents/presentations
- HTML for web display with interactivity
- JSON for custom visualizations
- CSV for spreadsheet import

**Expected Outcome:** Additional formats generated (if requested)

---

## Outputs

**What this workflow produces:**
- SVG graph file with visualization
- File path and metadata
- Optional: PNG, HTML, JSON, CSV variants

**Where outputs are stored:**
- `${PAI_DIR}/state/token-tracker/graphs/` - Generated visualizations

---

## Graph Types

### Line Graph (Trend)
- Shows usage over time
- Best for: Historical trends, growth patterns
- X-axis: Time (days, weeks, months)
- Y-axis: Tokens or cost

### Bar Chart (Comparison)
- Shows comparison between categories
- Best for: Service comparison, model breakdown
- X-axis: Services, models, or time periods
- Y-axis: Tokens or cost

### Pie Chart (Distribution)
- Shows percentage breakdown
- Best for: Share of total usage by service
- Slices: Services or models
- Values: Percentage of total

### Heatmap (Pattern)
- Shows usage intensity over time
- Best for: Identifying usage patterns
- X-axis: Time (days of week, hours)
- Y-axis: Services or models
- Color intensity: Token count

---

## Related Workflows

- **track-usage.md** - Collect data before graphing
- **show-report.md** - Include graphs in reports

---

## Examples

**Example 1: Generate 30-Day Trend**

Input: "graph my token consumption for the last 30 days"

Process:
1. Load all usage data
2. Filter to last 30 days
3. Aggregate by date (sum all services)
4. Generate line graph SVG
5. Save to graphs/usage-2026-01-23-line.svg

Output: "✅ Trend graph created showing 45,230 tokens over 30 days"

**Example 2: Bar Chart by Service**

Input: "create bar chart comparing my API usage by service"

Process:
1. Load usage data
2. Group by service (sum all time)
3. Aggregate totals per service
4. Generate bar chart SVG
5. Save to graphs/usage-2026-01-23-bar.svg

Output: "✅ Bar chart: Anthropic 45%, OpenAI 35%, Other 20%"

**Example 3: Pie Chart Distribution**

Input: "show me pie chart of token distribution"

Process:
1. Load usage data
2. Group by service
3. Calculate percentages
4. Generate pie chart SVG
5. Save to graphs/usage-2026-01-23-pie.svg

Output: "✅ Pie chart shows Anthropic (45%), OpenAI (35%), OpenCode (20%)"

---

## Error Handling

**Common Issues:**

**No Data:**
- Error: "No usage data found"
- Action: Direct user to `track-usage.md` first

**Date Range Invalid:**
- Error: "No data in specified range"
- Action: Suggest available date range or show all-time graph

**Template Missing:**
- Error: "Graph template not found"
- Action: Use default template or generate inline

**Data Too Sparse:**
- Error: "Insufficient data points for graph type"
- Action: Use alternative graph type or aggregate differently

---

## Last Updated: 2026-01-23
