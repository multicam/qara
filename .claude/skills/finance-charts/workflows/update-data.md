# Update Chart Data

**Purpose:** Refresh financial data and synchronize chart with latest market information

**When to Use:**
- Chart data is stale (older than desired)
- User requests latest prices
- Need real-time or near-real-time updates
- Scheduled data refresh

**Prerequisites:**
- Existing chart created (via create-chart.md)
- Data source accessible
- Chart application running or data files available

---

## Workflow Steps

### Step 1: Determine Update Strategy

**Description:** Choose update approach based on use case

**Update Strategies:**

**A. Full Refresh (Replace All Data)**
- Use when: Complete data refresh needed
- Method: Re-fetch entire dataset
- Trade-off: More API calls, but ensures data consistency

**B. Incremental Update (Append New Data)**
- Use when: Adding recent candles only
- Method: Fetch data since last timestamp
- Trade-off: Efficient, but requires careful timestamp management

**C. Real-time Streaming (WebSocket)**
- Use when: Live updates needed
- Method: WebSocket connection to exchange
- Trade-off: More complex, best for actively watched charts

**Decision logic:**
```typescript
if (needRealTime) {
  strategy = "streaming";
} else if (lastUpdate > 1_hour_ago) {
  strategy = "incremental";
} else {
  strategy = "full_refresh";
}
```

**Expected Outcome:** Update strategy selected

---

### Step 2: Fetch Latest Data

**Description:** Retrieve new or updated market data

**For Full Refresh:**
```bash
# Re-run fetch workflow with same parameters
cd ~/.claude/skills/finance-charts/tools

# Fetch latest data
bun run fetch-yahoo.ts AAPL 3mo 1d > latest_data.json
```

**For Incremental Update:**
```typescript
// Get last candle timestamp from cache
const cachedData = await loadCachedData(ticker);
const lastTime = cachedData.data[cachedData.data.length - 1].time;

// Fetch only new candles since lastTime
const newData = await fetchDataSince(ticker, lastTime);

// Merge with cached data
const updatedData = [...cachedData.data, ...newData];
```

**For Real-time Updates (WebSocket example):**
```typescript
import WebSocket from 'ws';

function subscribeToRealTimeData(ticker: string, callback: (candle: any) => void) {
  // Example: Coinbase WebSocket
  const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
  
  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      product_ids: [ticker],
      channels: ['ticker']
    }));
  });
  
  ws.on('message', (data) => {
    const tick = JSON.parse(data.toString());
    if (tick.type === 'ticker') {
      callback(tick);
    }
  });
}
```

**Expected Outcome:** Latest data retrieved

---

### Step 3: Validate New Data

**Description:** Ensure new data is valid and consistent with existing data

**Validation checks:**
```typescript
function validateUpdate(oldData: CandlestickData[], newData: CandlestickData[]): boolean {
  // Check 1: New data not empty
  if (!newData || newData.length === 0) {
    console.error('No new data received');
    return false;
  }
  
  // Check 2: Timestamps are sequential
  if (oldData.length > 0) {
    const lastOldTime = new Date(oldData[oldData.length - 1].time).getTime();
    const firstNewTime = new Date(newData[0].time).getTime();
    
    if (firstNewTime <= lastOldTime) {
      console.error('New data timestamps overlap or go backwards');
      return false;
    }
  }
  
  // Check 3: OHLC integrity
  return newData.every(candle => (
    candle.high >= candle.low &&
    candle.high >= candle.open &&
    candle.high >= candle.close &&
    candle.low <= candle.open &&
    candle.low <= candle.close
  ));
}
```

**Handle validation failures:**
- Log error details
- Keep old data if new data invalid
- Retry fetch if transient error
- Alert user if persistent failure

**Expected Outcome:** Validated data ready for chart update

---

### Step 4: Update Chart Display

**Description:** Push new data to chart and refresh visualization

**Option A: Update via API (if chart is running)**

```typescript
// In chart application (main.ts)
export function updateChartData(newData: CandlestickData[]) {
  // Append to existing data
  const currentData = candlestickSeries.data();
  const updatedData = [...currentData, ...newData];
  
  // Update candlestick series
  candlestickSeries.setData(updatedData);
  
  // Update volume if present
  if (volumeSeries) {
    const volumeData = newData.map(candle => ({
      time: candle.time,
      value: candle.volume || 0,
      color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
    }));
    
    const currentVolume = volumeSeries.data();
    volumeSeries.setData([...currentVolume, ...volumeData]);
  }
  
  // Fit to show latest data
  chart.timeScale().scrollToRealTime();
}

// Call from external script or WebSocket handler
window.updateChartData = updateChartData;
```

**Option B: Reload Data File (simpler)**

```bash
# Replace data file
cp latest_data.json ~/.claude/skills/finance-charts/tools/chart-app/data.json

# Chart auto-reloads if using hot reload
# Or manually refresh browser
```

**Option C: Live Updates via Server-Sent Events**

Create: `~/.claude/skills/finance-charts/tools/chart-app/server.ts`

```typescript
import { serve } from 'bun';

const clients: Set<any> = new Set();

serve({
  port: 3001,
  
  fetch(req) {
    // SSE endpoint
    if (req.url.endsWith('/updates')) {
      const stream = new ReadableStream({
        start(controller) {
          clients.add(controller);
          
          // Keep connection alive
          const interval = setInterval(() => {
            controller.enqueue(': keepalive\n\n');
          }, 30000);
          
          return () => {
            clearInterval(interval);
            clients.delete(controller);
          };
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    return new Response('Not found', { status: 404 });
  },
});

// Broadcast update to all clients
export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.enqueue(message);
    } catch (e) {
      clients.delete(client);
    }
  });
}
```

**Client-side listener:**
```typescript
const eventSource = new EventSource('http://localhost:3001/updates');

eventSource.onmessage = (event) => {
  const newCandles = JSON.parse(event.data);
  updateChartData(newCandles);
};
```

**Expected Outcome:** Chart displays updated data

---

### Step 5: Update Cache

**Description:** Save updated data to cache for future use

**Update cache file:**
```typescript
async function updateCache(ticker: string, updatedData: ChartData) {
  const cachePath = `~/.claude/skills/finance-charts/tools/data-cache/${ticker}_latest.json`;
  
  const cacheData = {
    ...updatedData,
    lastUpdated: new Date().toISOString(),
    dataPoints: updatedData.data.length,
  };
  
  await Bun.write(cachePath, JSON.stringify(cacheData, null, 2));
  
  console.log(`✅ Cache updated: ${ticker} (${updatedData.data.length} candles)`);
}
```

**Cache management:**
- Keep latest version as `{ticker}_latest.json`
- Archive old versions with timestamp: `{ticker}_{YYYYMMDD_HHMMSS}.json`
- Purge cache older than 30 days (configurable)

**Expected Outcome:** Cache updated with latest data

---

### Step 6: Log Update Metadata

**Description:** Record update details for monitoring and debugging

**Create update log:**
```typescript
interface UpdateLog {
  timestamp: string;
  ticker: string;
  strategy: 'full_refresh' | 'incremental' | 'streaming';
  candlesAdded: number;
  totalCandles: number;
  success: boolean;
  error?: string;
}

async function logUpdate(log: UpdateLog) {
  const logPath = '~/.claude/skills/finance-charts/tools/update.log';
  const logLine = `${log.timestamp} | ${log.ticker} | ${log.strategy} | +${log.candlesAdded} | Total: ${log.totalCandles} | ${log.success ? 'SUCCESS' : 'FAILED'}\n`;
  
  await Bun.write(logPath, logLine, { append: true });
}
```

**Example log output:**
```
2025-11-19T17:30:00Z | AAPL | incremental | +5 | Total: 68 | SUCCESS
2025-11-19T17:45:00Z | BTC-USD | streaming | +1 | Total: 301 | SUCCESS
2025-11-19T18:00:00Z | TSLA | full_refresh | +63 | Total: 63 | SUCCESS
```

**Expected Outcome:** Update logged for audit trail

---

## Outputs

**What this workflow produces:**
- **Updated chart**: Chart displays latest data
- **Updated cache**: Latest data saved to cache
- **Update log**: Metadata logged for monitoring

**Where outputs are stored:**
- Chart data: `~/.claude/skills/finance-charts/tools/chart-app/data.json`
- Cache: `~/.claude/skills/finance-charts/tools/data-cache/{ticker}_latest.json`
- Logs: `~/.claude/skills/finance-charts/tools/update.log`

---

## Automation (Optional)

**Schedule Automatic Updates:**

**Using cron (Linux/macOS):**
```bash
# Edit crontab
crontab -e

# Add update job (every 15 minutes during market hours)
*/15 9-16 * * 1-5 cd ~/.claude/skills/finance-charts/tools && bun run update-chart.ts AAPL

# Or use system script
0 9,12,15,16 * * 1-5 ~/.claude/skills/finance-charts/tools/auto-update.sh
```

**Create auto-update script:**
```bash
#!/bin/bash
# ~/.claude/skills/finance-charts/tools/auto-update.sh

TICKERS=("AAPL" "TSLA" "BTC-USD")

for ticker in "${TICKERS[@]}"; do
  echo "Updating $ticker..."
  cd ~/.claude/skills/finance-charts/tools
  bun run fetch-yahoo.ts "$ticker" 1mo 1d > data-cache/${ticker}_latest.json
  echo "✅ $ticker updated"
done

echo "All charts updated at $(date)"
```

**Expected Outcome:** Charts update automatically on schedule

---

## Error Handling

**Common Errors:**

**1. Stale Data (No New Candles)**
- Cause: Market closed, data source delay
- Solution: Log warning, keep old data, retry later

**2. Connection Timeout**
- Cause: Network issue, API down
- Solution: Retry with exponential backoff, use cached data

**3. Data Gap (Missing Candles)**
- Cause: Data source outage, API rate limit
- Solution: Flag gap in chart, fetch missing data later

**4. WebSocket Disconnect**
- Cause: Network instability, server restart
- Solution: Auto-reconnect with backoff, show connection status

**Retry Strategy:**
```typescript
async function updateWithRetry(ticker: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fetchLatestData(ticker);
      await updateChart(data);
      return { success: true };
    } catch (error) {
      console.error(`Update attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        return { success: false, error: error.message };
      }
    }
  }
}
```

---

## Related Workflows

- **fetch-data.md** - Initial data fetch (prerequisite)
- **create-chart.md** - Chart creation (prerequisite)
- **export-chart.md** - Export updated data

---

## Examples

**Example 1: Manual Incremental Update**
```bash
# Fetch latest 5 candles for AAPL
bun run fetch-yahoo.ts AAPL 5d 1d > new_data.json

# Merge with existing data
bun run merge-data.ts existing.json new_data.json > updated.json

# Reload chart
cp updated.json chart-app/data.json
```

**Example 2: Real-time Bitcoin Updates**
```typescript
// Subscribe to Coinbase WebSocket
subscribeToRealTimeData('BTC-USD', (tick) => {
  // Update current candle or create new one
  updateChartData([{
    time: getCurrentCandleTime(),
    open: tick.open_24h,
    high: Math.max(currentCandle.high, tick.price),
    low: Math.min(currentCandle.low, tick.price),
    close: tick.price,
    volume: tick.volume_24h,
  }]);
});
```

**Example 3: Scheduled Daily Update**
```bash
# Run at market close (4:00 PM EST)
0 16 * * 1-5 bun run update-all-charts.ts
```

---

**Last Updated:** 2025-11-19
