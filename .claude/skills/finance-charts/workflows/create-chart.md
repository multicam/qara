# Create Chart

**Purpose:** Generate interactive TradingView lightweight-charts visualization from financial data

**When to Use:**
- After fetching financial data
- User requests chart visualization
- Need interactive, web-based chart display
- Creating shareable chart HTML

**Prerequisites:**
- OHLCV data available (from fetch-data.md or cached)
- Node.js/Bun installed
- lightweight-charts library installed

---

## Workflow Steps

### Step 1: Set Up Chart Application (First Time Only)

**Description:** Initialize chart application with TradingView lightweight-charts

**Create project structure:**
```bash
mkdir -p ~/.claude/skills/finance-charts/tools/chart-app
cd ~/.claude/skills/finance-charts/tools/chart-app
```

**Initialize package.json:**
```json
{
  "name": "finance-charts-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/main.ts",
    "build": "bun build src/main.ts --outdir=dist --target=browser",
    "serve": "bun run server.ts"
  },
  "dependencies": {
    "lightweight-charts": "^4.1.3"
  },
  "devDependencies": {
    "@types/node": "^20.10.0"
  }
}
```

**Install dependencies:**
```bash
bun install
```

**Expected Outcome:** Chart application scaffolding ready

---

### Step 2: Create Chart Rendering Module

**Description:** Build TypeScript module to render TradingView charts

**Create: `~/.claude/skills/finance-charts/tools/chart-app/src/chart.ts`**

```typescript
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';

export interface ChartConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

export interface ChartData {
  ticker: string;
  data: CandlestickData[];
  volumeData?: { time: string; value: number; color?: string }[];
}

export class FinanceChart {
  private chart: IChartApi;
  private candlestickSeries: ISeriesApi<"Candlestick">;
  private volumeSeries?: ISeriesApi<"Histogram">;

  constructor(config: ChartConfig) {
    const theme = config.theme || 'light';
    
    this.chart = createChart(config.container, {
      width: config.width || config.container.clientWidth,
      height: config.height || 600,
      layout: {
        background: { type: ColorType.Solid, color: theme === 'dark' ? '#1e1e1e' : '#ffffff' },
        textColor: theme === 'dark' ? '#d1d4dc' : '#333333',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? '#2a2e39' : '#e1e1e1' },
        horzLines: { color: theme === 'dark' ? '#2a2e39' : '#e1e1e1' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? '#2a2e39' : '#d1d4dc',
      },
      timeScale: {
        borderColor: theme === 'dark' ? '#2a2e39' : '#d1d4dc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.chart.applyOptions({ 
        width: config.container.clientWidth 
      });
    });
  }

  setData(chartData: ChartData) {
    // Set candlestick data
    this.candlestickSeries.setData(chartData.data);

    // Add volume if available
    if (chartData.volumeData) {
      this.volumeSeries = this.chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      this.chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      this.volumeSeries.setData(chartData.volumeData);
    }

    // Fit content
    this.chart.timeScale().fitContent();
  }

  addMovingAverage(period: number, data: LineData[], color: string = '#2962FF') {
    const maSeries = this.chart.addLineSeries({
      color,
      lineWidth: 2,
      title: `MA(${period})`,
    });
    maSeries.setData(data);
  }

  destroy() {
    this.chart.remove();
  }
}

// Calculate moving average
export function calculateMA(data: CandlestickData[], period: number): LineData[] {
  const ma: LineData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1)
      .reduce((acc, val) => acc + val.close, 0);
    
    ma.push({
      time: data[i].time,
      value: sum / period,
    });
  }
  
  return ma;
}
```

**Expected Outcome:** Chart rendering module with full functionality

---

### Step 3: Create HTML Display Page

**Description:** Build HTML page to host the chart

**Create: `~/.claude/skills/finance-charts/tools/chart-app/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finance Charts</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .header {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
    }

    .ticker-info {
      margin-top: 8px;
      font-size: 14px;
      opacity: 0.9;
    }

    .controls {
      padding: 16px 20px;
      background: #fafafa;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .controls button {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .controls button:hover {
      background: #5568d3;
    }

    .controls select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    #chart {
      padding: 20px;
    }

    .loading {
      text-align: center;
      padding: 60px;
      color: #666;
    }

    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Finance Charts</h1>
      <div class="ticker-info" id="ticker-info">Loading...</div>
    </div>
    
    <div class="controls">
      <button id="btn-candlestick">Candlestick</button>
      <button id="btn-line">Line</button>
      <button id="btn-area">Area</button>
      <select id="theme-select">
        <option value="light">Light Theme</option>
        <option value="dark">Dark Theme</option>
      </select>
      <button id="btn-ma">Add MA(20)</button>
      <button id="btn-export">Export Data</button>
    </div>
    
    <div id="chart">
      <div class="loading">
        <div class="spinner"></div>
        <div>Loading chart data...</div>
      </div>
    </div>
  </div>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Expected Outcome:** Interactive HTML page with controls

---

### Step 4: Create Main Application Logic

**Description:** Wire up chart rendering with data loading

**Create: `~/.claude/skills/finance-charts/tools/chart-app/src/main.ts`**

```typescript
import { FinanceChart, calculateMA, ChartData } from './chart';
import { CandlestickData } from 'lightweight-charts';

// Load chart data (from URL parameter or embedded)
async function loadChartData(): Promise<ChartData> {
  const urlParams = new URLSearchParams(window.location.search);
  const dataFile = urlParams.get('data') || 'data.json';
  
  const response = await fetch(dataFile);
  const result = await response.json();
  
  // Prepare volume data
  const volumeData = result.data.map((candle: any) => ({
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
  }));
  
  return {
    ticker: result.ticker,
    data: result.data,
    volumeData,
  };
}

// Initialize chart
let chart: FinanceChart;
let chartData: ChartData;

async function init() {
  try {
    // Load data
    chartData = await loadChartData();
    
    // Update ticker info
    const tickerInfo = document.getElementById('ticker-info')!;
    tickerInfo.textContent = `${chartData.ticker} • ${chartData.data.length} data points`;
    
    // Create chart
    const container = document.getElementById('chart')!;
    container.innerHTML = ''; // Clear loading
    
    chart = new FinanceChart({ container, theme: 'light' });
    chart.setData(chartData);
    
    // Setup controls
    setupControls();
    
  } catch (error) {
    console.error('Failed to load chart:', error);
    const container = document.getElementById('chart')!;
    container.innerHTML = '<div class="loading">❌ Failed to load chart data</div>';
  }
}

function setupControls() {
  // Theme toggle
  document.getElementById('theme-select')!.addEventListener('change', (e) => {
    const theme = (e.target as HTMLSelectElement).value as 'light' | 'dark';
    chart.destroy();
    const container = document.getElementById('chart')!;
    chart = new FinanceChart({ container, theme });
    chart.setData(chartData);
  });
  
  // Add MA(20)
  document.getElementById('btn-ma')!.addEventListener('click', () => {
    const ma20 = calculateMA(chartData.data, 20);
    chart.addMovingAverage(20, ma20, '#2962FF');
  });
  
  // Export data
  document.getElementById('btn-export')!.addEventListener('click', () => {
    const dataStr = JSON.stringify(chartData.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartData.ticker}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Start application
init();
```

**Expected Outcome:** Fully functional chart application

---

### Step 5: Generate Chart with Data

**Description:** Run chart application with fetched financial data

**Create data file:**
```bash
# Copy fetched data to chart app
cp ~/.claude/skills/finance-charts/tools/data-cache/AAPL_3mo_*.json \
   ~/.claude/skills/finance-charts/tools/chart-app/data.json
```

**Start development server:**
```bash
cd ~/.claude/skills/finance-charts/tools/chart-app
bun run dev
```

**Access chart:**
- Open browser: `http://localhost:3000`
- Chart renders automatically with data
- Interactive controls available

**Alternative: Generate static HTML:**
```bash
# Build standalone HTML
bun run build

# Create self-contained HTML file
cat > ~/.claude/skills/finance-charts/tools/charts/AAPL_chart.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>AAPL Chart</title>
  <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
</head>
<body>
  <div id="chart" style="width: 100%; height: 600px;"></div>
  <script>
    const chart = LightweightCharts.createChart(document.getElementById('chart'));
    const candlestickSeries = chart.addCandlestickSeries();
    
    // Embed data directly
    const data = $(cat data.json);
    candlestickSeries.setData(data);
  </script>
</body>
</html>
EOF
```

**Expected Outcome:** Interactive chart visible in browser

---

### Step 6: Add Chart Enhancements (Optional)

**Description:** Add moving averages, indicators, or custom styling

**Common enhancements:**

1. **Moving Averages:**
```typescript
const ma20 = calculateMA(data, 20);
const ma50 = calculateMA(data, 50);
chart.addMovingAverage(20, ma20, '#2962FF');
chart.addMovingAverage(50, ma50, '#FF6D00');
```

2. **Bollinger Bands:**
```typescript
function calculateBollingerBands(data: CandlestickData[], period: number, stdDev: number) {
  const ma = calculateMA(data, period);
  // Calculate standard deviation and bands
  // ... implementation
}
```

3. **Custom Markers:**
```typescript
candlestickSeries.setMarkers([
  { time: '2024-10-15', position: 'aboveBar', color: '#2196F3', shape: 'arrowDown', text: 'Buy Signal' },
]);
```

**Expected Outcome:** Enhanced chart with technical indicators

---

## Outputs

**What this workflow produces:**
- **Interactive chart**: Live web application with TradingView chart
- **Static HTML**: Standalone chart file (optional)
- **Chart screenshot**: PNG/SVG export (if configured)

**Where outputs are stored:**
- Dev server: `http://localhost:3000`
- Static charts: `~/.claude/skills/finance-charts/tools/charts/{ticker}_chart.html`
- Project charts: `~/.claude/context/projects/finance-charts/{name}.html`

---

## Chart Types Supported

**1. Candlestick (Default)**
- Shows OHLC data
- Color-coded (green up, red down)
- Most common for financial data

**2. Line Chart**
- Close prices only
- Simple and clean
- Good for trend visualization

**3. Area Chart**
- Filled line chart
- Emphasizes magnitude
- Good for portfolio value

**4. Histogram (Volume)**
- Bar chart for volume
- Usually shown below price
- Color matches price direction

**5. Baseline Chart**
- Line with filled area
- Shows position relative to baseline
- Good for profit/loss visualization

---

## Related Workflows

- **fetch-data.md** - Get data before creating chart (prerequisite)
- **update-data.md** - Refresh chart with new data
- **export-chart.md** - Export chart or save as image

---

## Examples

**Example 1: Create Bitcoin Chart**
```bash
# Fetch data
bun run fetch-coinbase.ts BTC-USD 86400 > data.json

# Start chart
cd chart-app && bun run dev
# Opens http://localhost:3000 with BTC chart
```

**Example 2: Apple Stock with Moving Averages**
```bash
# Fetch AAPL data
bun run fetch-yahoo.ts AAPL 1y 1d > data.json

# Create chart with MAs embedded
# Chart renders with MA(20) and MA(50) overlays
```

**Example 3: Dark Theme Chart**
```bash
# Create chart with dark theme
# User selects "Dark Theme" from dropdown
# Chart updates styling automatically
```

---

**Last Updated:** 2025-11-19
