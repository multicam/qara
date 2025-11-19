# Financial Data Sources

**Comprehensive reference for trusted financial data APIs and sources**

---

## Overview

This document provides detailed information about financial data sources integrated with the finance-charts skill, including setup, usage, rate limits, and best practices.

---

## 1. Yahoo Finance (yfinance)

**Status**: Primary data source (Free, No API Key)

### Overview
- **Type**: Unofficial API (scrapes Yahoo Finance)
- **Cost**: Free, unlimited
- **Coverage**: Stocks, ETFs, indices, forex, commodities, crypto
- **Historical Data**: Up to max available history
- **Real-time**: 15-minute delayed quotes

### Python Library (yfinance)

**Installation:**
```bash
pip install yfinance
# OR with uv (preferred)
uv pip install yfinance
```

**Basic Usage:**
```python
import yfinance as yf

# Single ticker
ticker = yf.Ticker("AAPL")
data = ticker.history(period="1mo", interval="1d")

# Multiple tickers
data = yf.download("AAPL MSFT GOOGL", period="1y", interval="1d")
```

**Intervals:** 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

**Periods:** 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max

### Node.js Library (yahoo-finance2)

**Installation:**
```bash
bun add yahoo-finance2
```

**Basic Usage:**
```typescript
import yahooFinance from 'yahoo-finance2';

const result = await yahooFinance.chart('AAPL', {
  period1: '2024-01-01',
  interval: '1d',
});
```

### Limitations
- Unofficial API (may break if Yahoo changes structure)
- Rate limiting possible (usually generous)
- No official support
- 15-minute delay for real-time data

### Best For
- Quick prototyping
- Personal projects
- Historical data analysis
- Multi-asset support without API keys

---

## 2. Alpha Vantage

**Status**: Official API (Free Tier + Premium)

### Overview
- **Type**: Official REST API
- **Cost**: Free (5 calls/min, 500 calls/day) + Premium tiers
- **Coverage**: Stocks, forex, crypto, commodities, technical indicators
- **Historical Data**: 20+ years for stocks
- **Real-time**: Yes (premium)

### Setup

**Get API Key:**
1. Visit: https://www.alphavantage.co/support/#api-key
2. Sign up for free key
3. Add to ~/.claude/.env:
```bash
ALPHA_VANTAGE_API_KEY=your_key_here
```

### API Endpoints

**Stock Time Series:**
```bash
# Daily data
https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=YOUR_KEY

# Intraday data
https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=5min&apikey=YOUR_KEY
```

**TypeScript Usage:**
```typescript
async function fetchAlphaVantage(ticker: string, interval: string = 'daily') {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const func = interval === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY';
  
  const url = `https://www.alphavantage.co/query?function=${func}&symbol=${ticker}&apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Parse data...
  return parseAlphaVantageData(data);
}
```

### Rate Limits
- **Free**: 5 API requests per minute, 500 per day
- **Premium**: Higher limits based on tier
- **Strategy**: Cache aggressively, batch requests

### Advantages
- Official, reliable API
- Comprehensive technical indicators
- Good documentation
- Long historical data

### Limitations
- Strict rate limits on free tier
- Requires API key management
- May be overkill for simple use cases

### Best For
- Production applications
- Technical analysis with indicators
- Applications requiring reliability
- Forex and crypto data

---

## 3. Coinbase API

**Status**: Crypto Specialist (Free, No Auth for Public Data)

### Overview
- **Type**: Official exchange API
- **Cost**: Free for public market data
- **Coverage**: Cryptocurrencies only (BTC, ETH, etc.)
- **Historical Data**: Limited history (typically 300 candles)
- **Real-time**: Yes (WebSocket available)

### REST API

**Candles Endpoint:**
```bash
GET https://api.exchange.coinbase.com/products/{product-id}/candles
```

**Parameters:**
- `start`: Start time (ISO 8601 or Unix timestamp)
- `end`: End time
- `granularity`: Candle size in seconds (60, 300, 900, 3600, 21600, 86400)

**TypeScript Usage:**
```typescript
async function fetchCoinbaseData(productId: string = 'BTC-USD', granularity: number = 86400) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - (300 * granularity); // 300 candles
  
  const url = `https://api.exchange.coinbase.com/products/${productId}/candles?start=${start}&end=${end}&granularity=${granularity}`;
  
  const response = await fetch(url);
  const candles: number[][] = await response.json();
  
  return candles.map(([time, low, high, open, close, volume]) => ({
    time: new Date(time * 1000).toISOString().split('T')[0],
    open,
    high,
    low,
    close,
    volume,
  })).reverse();
}
```

### WebSocket (Real-time)

**Subscribe to ticker:**
```typescript
const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    product_ids: ['BTC-USD', 'ETH-USD'],
    channels: ['ticker']
  }));
});

ws.on('message', (data) => {
  const tick = JSON.parse(data);
  console.log(`${tick.product_id}: $${tick.price}`);
});
```

### Advantages
- Free, no authentication for public data
- Official exchange API
- Real-time WebSocket support
- Reliable crypto data

### Limitations
- Cryptocurrency only
- Limited historical data (300 candles max per request)
- No stocks, forex, commodities

### Best For
- Cryptocurrency charting
- Real-time crypto price tracking
- Bitcoin, Ethereum, and other crypto assets
- WebSocket-based live updates

---

## 4. Polygon.io

**Status**: Premium Service (Free Tier Available)

### Overview
- **Type**: Official financial data platform
- **Cost**: Free tier (5 API calls/min) + Premium
- **Coverage**: Stocks, options, forex, crypto
- **Historical Data**: Extensive, high quality
- **Real-time**: Yes (premium)

### Setup

**Get API Key:**
1. Visit: https://polygon.io/
2. Sign up for free or paid tier
3. Add to ~/.claude/.env:
```bash
POLYGON_API_KEY=your_key_here
```

### API Usage

**Aggregates (Bars):**
```bash
GET https://api.polygon.io/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}?apiKey=YOUR_KEY
```

**TypeScript Example:**
```typescript
async function fetchPolygonData(ticker: string, from: string, to: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?apiKey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.results.map((bar: any) => ({
    time: new Date(bar.t).toISOString().split('T')[0],
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}
```

### Advantages
- High-quality, official data
- Comprehensive coverage
- Good free tier for testing
- Excellent documentation

### Limitations
- Requires API key
- Free tier has rate limits
- Premium features require paid subscription

### Best For
- Production applications with budget
- High-frequency data needs
- Applications requiring data quality guarantees

---

## Data Source Comparison

| Feature | Yahoo Finance | Alpha Vantage | Coinbase | Polygon.io |
|---------|--------------|---------------|----------|------------|
| **Cost** | Free | Free + Paid | Free | Free + Paid |
| **API Key** | No | Yes | No (public) | Yes |
| **Rate Limit** | Generous | 5/min (free) | Generous | 5/min (free) |
| **Stocks** | ✅ | ✅ | ❌ | ✅ |
| **Crypto** | ✅ | ✅ | ✅ | ✅ |
| **Forex** | ✅ | ✅ | ❌ | ✅ |
| **Real-time** | 15-min delay | Premium | ✅ | Premium |
| **Historical** | Max | 20+ years | Limited | Extensive |
| **Reliability** | Good | Excellent | Excellent | Excellent |

---

## Best Practices

### 1. Data Caching
```typescript
// Always cache API responses
const cacheKey = `${ticker}_${interval}_${date}`;
const cachedData = await loadFromCache(cacheKey);

if (cachedData && !isStale(cachedData)) {
  return cachedData;
}

const freshData = await fetchFromAPI(ticker);
await saveToCache(cacheKey, freshData);
return freshData;
```

### 2. Rate Limiting
```typescript
// Implement rate limiting
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent requests

const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
const results = await Promise.all(
  tickers.map(ticker => limit(() => fetchData(ticker)))
);
```

### 3. Fallback Strategy
```typescript
// Use multiple sources with fallback
async function fetchDataWithFallback(ticker: string) {
  try {
    return await fetchAlphaVantage(ticker);
  } catch (error) {
    console.warn('Alpha Vantage failed, falling back to Yahoo');
    return await fetchYahooFinance(ticker);
  }
}
```

### 4. Error Handling
```typescript
// Handle API errors gracefully
async function safeFetch(fetcher: () => Promise<any>) {
  try {
    return await fetcher();
  } catch (error) {
    if (error.status === 429) {
      // Rate limited - wait and retry
      await sleep(60000);
      return await fetcher();
    }
    throw error;
  }
}
```

---

## Recommended Setup

**For Personal Use (Free):**
- Primary: Yahoo Finance (yfinance)
- Crypto: Coinbase API
- Backup: Alpha Vantage (free tier)

**For Production (Reliable):**
- Primary: Alpha Vantage or Polygon.io (paid)
- Crypto: Coinbase API
- Cache: Redis or file-based

**For Crypto Focus:**
- Primary: Coinbase API
- Alternative: Yahoo Finance (BTC-USD format)
- Real-time: Coinbase WebSocket

---

## Related Documentation

- `~/.claude/skills/finance-charts/SKILL.md` - Main skill documentation
- `~/.claude/skills/finance-charts/workflows/fetch-data.md` - Data fetching workflow
- `~/.claude/skills/CORE/stack-preferences.md` - TypeScript preferences

---

**Last Updated:** 2025-11-19
