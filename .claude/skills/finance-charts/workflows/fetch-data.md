# Fetch Financial Data

**Purpose:** Retrieve OHLCV (Open, High, Low, Close, Volume) data from trusted financial data sources

**When to Use:**
- User requests market data for specific ticker/asset
- Need historical price data for charting
- Collecting data before visualization
- Refreshing stale cached data

**Prerequisites:**
- Internet connection
- API keys configured in ~/.claude/.env (optional, depends on source)
- Python with yfinance OR Node.js with data fetching library

---

## Workflow Steps

### Step 1: Determine Data Source

**Description:** Select appropriate data source based on asset type and availability

**Decision Logic:**
```typescript
if (asset is crypto) {
  // Use Coinbase API (free, no auth)
  source = "coinbase";
} else if (has_alpha_vantage_key && need_premium_data) {
  // Use Alpha Vantage (official, reliable)
  source = "alpha_vantage";
} else {
  // Use Yahoo Finance (free, unofficial but reliable)
  source = "yahoo_finance";
}
```

**Data Source Selection:**
- **Stocks/ETFs/Indices**: Yahoo Finance (yfinance) or Alpha Vantage
- **Crypto**: Coinbase API or Yahoo Finance (BTC-USD format)
- **Forex**: Alpha Vantage or Yahoo Finance
- **Commodities**: Yahoo Finance

**Expected Outcome:** Data source selected based on asset type

---

### Step 2: Build Data Fetcher Script

**Description:** Create TypeScript or Python script to fetch data

**Option A: TypeScript with Yahoo Finance (Recommended)**

Create: `~/.claude/skills/finance-charts/tools/fetch-yahoo.ts`

```typescript
#!/usr/bin/env bun

import yahooFinance from 'yahoo-finance2';

interface FetchOptions {
  ticker: string;
  period: string;  // '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'
  interval: string; // '1m', '5m', '15m', '1h', '1d', '1wk', '1mo'
}

async function fetchYahooData(options: FetchOptions) {
  try {
    const result = await yahooFinance.chart(options.ticker, {
      period1: getPeriodStart(options.period),
      interval: options.interval as any,
    });

    const data = result.quotes.map((quote: any) => ({
      time: formatTime(quote.date),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume || 0,
    }));

    return { success: true, data, ticker: options.ticker };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  const map: Record<string, number> = {
    '1d': 1, '5d': 5, '1mo': 30, '3mo': 90,
    '6mo': 180, '1y': 365, '2y': 730, '5y': 1825,
  };
  const days = map[period] || 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatTime(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// CLI interface
const ticker = process.argv[2] || 'AAPL';
const period = process.argv[3] || '1mo';
const interval = process.argv[4] || '1d';

const result = await fetchYahooData({ ticker, period, interval });
console.log(JSON.stringify(result, null, 2));
```

**Install dependencies:**
```bash
cd ~/.claude/skills/finance-charts/tools
bun add yahoo-finance2
```

**Option B: Python with yfinance**

Create: `~/.claude/skills/finance-charts/tools/fetch-yahoo.py`

```python
#!/usr/bin/env python3

import yfinance as yf
import json
import sys
from datetime import datetime

def fetch_yahoo_data(ticker, period='1mo', interval='1d'):
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, interval=interval)
        
        data = []
        for index, row in df.iterrows():
            data.append({
                'time': index.strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume'])
            })
        
        return {'success': True, 'data': data, 'ticker': ticker}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    ticker = sys.argv[1] if len(sys.argv) > 1 else 'AAPL'
    period = sys.argv[2] if len(sys.argv) > 2 else '1mo'
    interval = sys.argv[3] if len(sys.argv) > 3 else '1d'
    
    result = fetch_yahoo_data(ticker, period, interval)
    print(json.dumps(result, indent=2))
```

**Install dependencies:**
```bash
pip install yfinance
# OR with uv (preferred)
uv pip install yfinance
```

**Option C: Coinbase API for Crypto**

Create: `~/.claude/skills/finance-charts/tools/fetch-coinbase.ts`

```typescript
#!/usr/bin/env bun

interface CoinbaseCandle {
  time: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

async function fetchCoinbaseData(productId: string, granularity: number = 86400) {
  // granularity in seconds: 60, 300, 900, 3600, 21600, 86400
  const end = Math.floor(Date.now() / 1000);
  const start = end - (300 * granularity); // 300 candles

  const url = `https://api.exchange.coinbase.com/products/${productId}/candles?start=${start}&end=${end}&granularity=${granularity}`;
  
  try {
    const response = await fetch(url);
    const candles: number[][] = await response.json();
    
    const data = candles.map(([time, low, high, open, close, volume]) => ({
      time: new Date(time * 1000).toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    })).reverse(); // Coinbase returns newest first

    return { success: true, data, productId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// CLI interface
const productId = process.argv[2] || 'BTC-USD';
const granularity = parseInt(process.argv[3] || '86400');

const result = await fetchCoinbaseData(productId, granularity);
console.log(JSON.stringify(result, null, 2));
```

**Expected Outcome:** Data fetcher script created and executable

---

### Step 3: Execute Data Fetch

**Description:** Run the fetcher script with user-specified parameters

**Command:**
```bash
# TypeScript/Bun
cd ~/.claude/skills/finance-charts/tools
bun run fetch-yahoo.ts AAPL 3mo 1d

# Python
python3 fetch-yahoo.py AAPL 3mo 1d

# Coinbase (crypto)
bun run fetch-coinbase.ts BTC-USD 86400
```

**Parameters:**
- `ticker/productId`: Asset identifier (e.g., AAPL, BTC-USD, ^GSPC)
- `period`: Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max)
- `interval/granularity`: Data frequency (1m, 5m, 15m, 1h, 1d, 1wk, 1mo)

**Expected Outcome:** JSON data returned with OHLCV values

---

### Step 4: Validate and Cache Data

**Description:** Verify data integrity and save to cache for reuse

**Validation checks:**
```typescript
function validateOHLCVData(data: any[]): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;
  
  return data.every(candle => {
    return (
      candle.time &&
      typeof candle.open === 'number' &&
      typeof candle.high === 'number' &&
      typeof candle.low === 'number' &&
      typeof candle.close === 'number' &&
      candle.high >= candle.low &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.low <= candle.open &&
      candle.low <= candle.close
    );
  });
}
```

**Cache data:**
```bash
# Create cache directory
mkdir -p ~/.claude/skills/finance-charts/tools/data-cache

# Save data with timestamp
echo '{json_data}' > ~/.claude/skills/finance-charts/tools/data-cache/${ticker}_${period}_$(date +%Y%m%d).json
```

**Expected Outcome:** Valid data cached for future use

---

### Step 5: Return Data for Charting

**Description:** Prepare data in format ready for TradingView lightweight-charts

**Output format:**
```json
{
  "success": true,
  "ticker": "AAPL",
  "period": "3mo",
  "interval": "1d",
  "dataPoints": 63,
  "data": [
    { "time": "2024-08-19", "open": 225.77, "high": 227.30, "low": 223.27, "close": 226.50, "volume": 54844300 },
    { "time": "2024-08-20", "open": 226.30, "high": 227.03, "low": 223.52, "close": 224.72, "volume": 50743900 }
  ],
  "cachedAt": "2025-11-19T16:45:00Z"
}
```

**Pass to chart creation:**
- Data is now ready for `create-chart.md` workflow
- Can be stored in memory or temp file
- Format compatible with lightweight-charts

**Expected Outcome:** Data ready for visualization

---

## Outputs

**What this workflow produces:**
- **JSON data file**: OHLCV data in TradingView-compatible format
- **Cache entry**: Saved in `~/.claude/skills/finance-charts/tools/data-cache/`
- **Metadata**: Ticker, period, interval, fetch timestamp

**Where outputs are stored:**
- Cache: `~/.claude/skills/finance-charts/tools/data-cache/{ticker}_{period}_{date}.json`
- Temp: `~/.claude/scratchpad/finance-data-{ticker}.json` (if needed)

---

## Error Handling

**Common Errors:**

1. **Invalid Ticker**: "Ticker XYZ not found"
   - Solution: Verify ticker symbol, try with exchange suffix (e.g., AAPL.LON)

2. **Rate Limit**: "Too many requests"
   - Solution: Wait 1 minute, use cached data, or switch to different source

3. **No Data**: "No data available for period"
   - Solution: Adjust date range, ticker might be delisted or new

4. **API Key Missing**: "Alpha Vantage API key required"
   - Solution: Add API key to ~/.claude/.env or switch to Yahoo Finance

**Retry Logic:**
```typescript
async function fetchWithRetry(fetcher: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Related Workflows

- **create-chart.md** - Use fetched data to generate chart (next step)
- **update-data.md** - Refresh this data later
- **export-chart.md** - Export raw data to CSV/JSON

---

## Examples

**Example 1: Fetch Apple Stock (3 months, daily)**
```bash
$ bun run fetch-yahoo.ts AAPL 3mo 1d
{
  "success": true,
  "ticker": "AAPL",
  "dataPoints": 63,
  "data": [...]
}
```

**Example 2: Fetch Bitcoin (Coinbase, 1 month)**
```bash
$ bun run fetch-coinbase.ts BTC-USD 86400
{
  "success": true,
  "productId": "BTC-USD",
  "dataPoints": 30,
  "data": [...]
}
```

**Example 3: Fetch with Python**
```bash
$ python3 fetch-yahoo.py TSLA 1y 1wk
{
  "success": true,
  "ticker": "TSLA",
  "data": [...]
}
```

---

**Last Updated:** 2025-11-19
