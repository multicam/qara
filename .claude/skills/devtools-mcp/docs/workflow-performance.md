# Performance

Run `bootstrap.md` first (2-3 tool calls max).

Then execute using DIRECT MCP tool calls (not `claude mcp call`):

## Step 1
Call `performance_start_trace` with reload=true, autoStop=true.

## Step 2
Call `performance_analyze_insight` with insightName="LCPBreakdown".
Call `performance_analyze_insight` with insightName="RenderBlocking".
Call `performance_analyze_insight` with insightName="CLSCulprits".

## Step 3 (optional)
Call `performance_stop_trace` with filePath="/tmp/trace.json.gz" to save.

## Report
```
Core Web Vitals:
  ✅/❌ LCP: Xs (Good ≤2.5s / Poor >4s)
  ✅/❌ FID: Xms (Good ≤100ms / Poor >300ms)
  ✅/❌ CLS: X.XX (Good ≤0.1 / Poor >0.25)
Recommendations: [specific fixes from insights]
```
