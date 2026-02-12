---
workflow: performance
description: Performance tracing and Core Web Vitals analysis
tools: [navigate_page, performance_start_trace, performance_stop_trace, performance_analyze_insight]
---

# Performance Workflow

Measure page performance, capture traces, and analyze Core Web Vitals.

## Purpose

Performance optimization:
- ✅ Measure Core Web Vitals (LCP, FID, CLS)
- ✅ Identify performance bottlenecks
- ✅ Capture detailed performance traces
- ✅ Analyze render-blocking resources
- ✅ Track loading phases and timing

## MCP Tools Used

1. **navigate_page** - Load pages (can be combined with trace start)
2. **performance_start_trace** - Begin performance recording
3. **performance_stop_trace** - End recording, get trace data
4. **performance_analyze_insight** - Get detailed breakdowns

## Core Web Vitals

### Largest Contentful Paint (LCP)
**Measures:** Loading performance
**Good:** ≤ 2.5s
**Needs Improvement:** 2.5s - 4.0s
**Poor:** > 4.0s

### First Input Delay (FID)
**Measures:** Interactivity
**Good:** ≤ 100ms
**Needs Improvement:** 100ms - 300ms
**Poor:** > 300ms

### Cumulative Layout Shift (CLS)
**Measures:** Visual stability
**Good:** ≤ 0.1
**Needs Improvement:** 0.1 - 0.25
**Poor:** > 0.25

## Workflow Steps

### 1. Basic Performance Trace

```
Navigate to page with performance trace enabled
```

This automatically:
1. Starts performance recording
2. Navigates to page (or reloads)
3. Waits for page load
4. Stops recording
5. Returns performance insights

**Example:**
```
performance_start_trace with reload=true, autoStop=true
```

### 2. Manual Trace Control

For more control:

```
1. performance_start_trace with reload=false, autoStop=false
2. navigate_page to URL
3. Wait for specific action to complete
4. performance_stop_trace
```

**Use case:** Measure specific user interactions or SPA navigations.

### 3. Get Trace Data

Stop trace and save to file:
```
performance_stop_trace with filePath="/tmp/trace.json.gz"
```

File formats:
- `.json` - Raw JSON (large)
- `.json.gz` - Compressed (recommended)

### 4. Analyze Specific Insights

After trace completes:
```
performance_analyze_insight with insightSetId="xyz", insightName="LCPBreakdown"
```

**Available Insights:**
- `LCPBreakdown` - LCP timing phases
- `DocumentLatency` - Document loading phases
- `RenderBlocking` - Blocking resources
- `CLSCulprits` - Layout shift causes
- `InteractionToNextPaint` - INP analysis

## Output Format

```json
{
  "passed": true,
  "url": "http://localhost:8000",
  "timestamp": "2026-02-12T10:00:00Z",
  "coreWebVitals": {
    "lcp": {
      "value": 2.1,
      "rating": "good",
      "unit": "seconds"
    },
    "fid": {
      "value": 45,
      "rating": "good",
      "unit": "milliseconds"
    },
    "cls": {
      "value": 0.08,
      "rating": "needs-improvement",
      "unit": "score"
    }
  },
  "timing": {
    "domContentLoaded": 1.2,
    "loadComplete": 2.5,
    "firstPaint": 0.8,
    "firstContentfulPaint": 1.1
  },
  "insights": [
    {
      "name": "LCPBreakdown",
      "description": "LCP element loaded in 2.1s",
      "phases": {
        "timeToFirstByte": 0.3,
        "resourceLoadDelay": 0.2,
        "resourceLoadTime": 1.1,
        "elementRenderDelay": 0.5
      }
    }
  ],
  "recommendations": [
    "Reduce CLS by reserving space for dynamic content",
    "LCP is good but could be improved by optimizing image loading",
    "Consider preloading critical resources"
  ]
}
```

## Common Use Cases

### Quick Core Web Vitals Check

```bash
claude "measure Core Web Vitals for homepage"
```

Returns LCP, FID, CLS scores with ratings.

### Full Performance Audit

```bash
claude "run performance trace on /products/ and analyze all insights"
```

Captures complete trace with all available insights.

### Specific Page Analysis

```bash
claude "analyze LCP breakdown for /blog/article-1/"
```

Gets detailed LCP timing phases.

### Performance Comparison

```bash
# Baseline
claude "trace homepage and save to baseline-trace.json.gz"

# After optimization
claude "trace homepage and save to optimized-trace.json.gz"

# Compare files with Chrome DevTools
```

### Mobile Performance

```bash
claude "emulate Slow 3G, trace homepage, analyze performance"
```

Tests performance on slow network.

### Performance Budget

```bash
claude "trace homepage, check if LCP is under 2.5s"
```

Validate against performance budgets.

## Detailed Analysis

### LCP Breakdown

```
performance_analyze_insight with insightName="LCPBreakdown"
```

Returns:
```json
{
  "lcpElement": "img.hero-image",
  "lcpValue": 2.1,
  "phases": {
    "ttfb": 0.3,
    "resourceLoadDelay": 0.2,
    "resourceLoadTime": 1.1,
    "elementRenderDelay": 0.5
  },
  "recommendations": [
    "Reduce TTFB by optimizing server response",
    "Preload hero image",
    "Optimize image size (currently 2.5MB)"
  ]
}
```

**Phases explained:**
- **TTFB** (Time to First Byte) - Server response time
- **Resource Load Delay** - Time from TTFB to resource request start
- **Resource Load Time** - Time to download resource
- **Element Render Delay** - Time from resource load to render

### Document Latency

```
performance_analyze_insight with insightName="DocumentLatency"
```

Returns:
```json
{
  "phases": {
    "unloadEvent": 0.01,
    "redirect": 0.0,
    "appCache": 0.0,
    "dns": 0.02,
    "tcp": 0.05,
    "request": 0.1,
    "response": 0.2,
    "processing": 0.8,
    "onload": 0.05
  }
}
```

### Render Blocking

```
performance_analyze_insight with insightName="RenderBlocking"
```

Returns:
```json
{
  "blockingResources": [
    {
      "url": "/css/main.css",
      "blockingTime": 0.4,
      "size": 250000
    },
    {
      "url": "/js/vendor.js",
      "blockingTime": 0.6,
      "size": 500000
    }
  ],
  "recommendations": [
    "Inline critical CSS",
    "Defer non-critical JavaScript",
    "Use async/defer for third-party scripts"
  ]
}
```

### CLS Culprits

```
performance_analyze_insight with insightName="CLSCulprits"
```

Returns:
```json
{
  "shifts": [
    {
      "element": "div.banner",
      "score": 0.05,
      "cause": "Image loaded without dimensions"
    },
    {
      "element": "div.ad",
      "score": 0.03,
      "cause": "Ad slot loaded after content"
    }
  ],
  "totalCLS": 0.08,
  "recommendations": [
    "Add width/height to images",
    "Reserve space for ads",
    "Use CSS aspect-ratio"
  ]
}
```

## Optimization Strategies

### Improve LCP

**If TTFB is high (> 600ms):**
- Optimize server response
- Use CDN
- Enable server-side caching
- Reduce server processing time

**If Resource Load Time is high:**
- Optimize image size
- Use WebP/AVIF formats
- Enable compression
- Use responsive images

**If Resource Load Delay is high:**
- Preload critical resources
- Use `<link rel="preload">`
- Prioritize critical resources

### Improve FID

**If high (> 100ms):**
- Split long tasks
- Use web workers
- Defer non-critical JavaScript
- Optimize JavaScript execution
- Remove unused JavaScript

### Improve CLS

**If high (> 0.1):**
- Add dimensions to images/videos
- Reserve space for ads
- Use CSS `aspect-ratio`
- Avoid inserting content above existing content
- Use transform instead of layout-shifting properties

## Performance Budgets

### Set Thresholds

In CLAUDE.md:
```markdown
## DevTools MCP
performance:
  lcp_max: 2.5  # seconds
  fid_max: 100  # milliseconds
  cls_max: 0.1  # score
  loadTime_max: 3.0  # seconds
```

### Budget Validation

```bash
claude "test performance budget on homepage"
```

Output:
```
✅ Performance Budget: PASSED

Core Web Vitals:
  ✅ LCP: 2.1s (budget: 2.5s)
  ✅ FID: 45ms (budget: 100ms)
  ⚠️  CLS: 0.12 (budget: 0.1) - OVER BUDGET

Load Time:
  ✅ 2.8s (budget: 3.0s)

1 metric over budget - needs improvement
```

## Network Throttling

### Simulate Slow Network

```bash
claude "emulate Slow 3G, trace homepage"
```

Network profiles:
- **Slow 3G** - 400ms RTT, 400kbps down, 400kbps up
- **Fast 3G** - 562.5ms RTT, 1.6Mbps down, 750kbps up
- **Slow 4G** - 150ms RTT, 4Mbps down, 3Mbps up
- **Fast 4G** - 20ms RTT, 10Mbps down, 10Mbps up

### CPU Throttling

```bash
claude "emulate 4x CPU throttling, trace homepage"
```

Simulates slower devices.

## Trace File Analysis

### Save Trace

```
performance_stop_trace with filePath="/tmp/trace.json.gz"
```

### Open in Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click "Load profile"
4. Select `trace.json.gz` file
5. Analyze detailed timeline

### Tools That Accept Traces

- **Chrome DevTools** - Built-in profiler
- **Lighthouse CI** - Automated audits
- **WebPageTest** - Online testing
- **Speedcurve** - Performance monitoring

## Integration with Other Workflows

**After smoke test:**
- Smoke test validates functionality
- Performance test measures speed

**Before deployment:**
- Run performance traces
- Validate against budgets
- Compare with previous version

**During development:**
- Profile after major changes
- Monitor Core Web Vitals
- Catch regressions early

## Automation

### CI/CD Integration

```bash
# In GitHub Actions
- name: Performance Test
  run: |
    pnpm dev &
    sleep 10
    claude "trace homepage, fail if LCP > 3s"
```

### Scheduled Monitoring

```bash
# Cron job
0 */6 * * * claude "trace https://example.com, save to /logs/perf-$(date +\%Y\%m\%d-\%H).json.gz"
```

## Example Session

```bash
$ claude "measure performance of homepage"

Claude: Starting performance trace...

[Navigates to homepage]
[Captures trace]
[Analyzes Core Web Vitals]

Performance Results:

Core Web Vitals:
  ✅ LCP: 2.1s (Good)
  ✅ FID: 45ms (Good)
  ⚠️  CLS: 0.12 (Needs Improvement)

Timing:
  DOM Content Loaded: 1.2s
  Load Complete: 2.5s
  First Paint: 0.8s

Issues Found:
  1. CLS caused by banner image (no dimensions)
  2. Render-blocking CSS (250KB)

Recommendations:
  1. Add width/height to banner image
  2. Inline critical CSS
  3. Preload hero image

Would you like detailed LCP breakdown?
```

## Troubleshooting

### Trace Not Capturing

**Issue:** Empty trace or missing data

**Fix:**
- Use `reload=true` for full page load
- Wait for page to fully load
- Check `autoStop=true` is set

### Inconsistent Results

**Issue:** Different scores each run

**Fix:**
- Run multiple times, average results
- Clear cache between runs
- Disable browser extensions
- Use isolated browser mode

### High TTFB in Dev

**Issue:** TTFB > 1s on localhost

**Fix:**
- Normal for dev servers (HMR overhead)
- Test on production build
- Use `pnpm build && pnpm serve`

---

**Status:** Priority 5 - Remaining Workflows
**Version:** 0.1.0
**Last updated:** February 12, 2026
