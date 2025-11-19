# Export Chart

**Purpose:** Export chart data or visualization to various formats for analysis, sharing, or archiving

**When to Use:**
- User wants chart data in CSV/JSON for spreadsheet analysis
- Need to share chart visualization
- Creating reports or presentations
- Archiving historical chart states

**Prerequisites:**
- Chart data available (from fetch-data.md or chart state)
- Chart created (for image exports)
- Export destination determined

---

## Workflow Steps

### Step 1: Determine Export Format

**Description:** Choose export format based on use case

**Available Formats:**

**Data Exports:**
- **JSON**: Machine-readable, preserves all data structure
- **CSV**: Spreadsheet-compatible, easy to analyze in Excel/Sheets
- **TSV**: Tab-separated, alternative to CSV

**Visual Exports:**
- **PNG**: Static image, good for reports and presentations
- **SVG**: Vector graphic, scalable and editable
- **HTML**: Interactive chart, shareable via web

**Decision Matrix:**
```
Use Case                  → Recommended Format
─────────────────────────────────────────────
Spreadsheet analysis     → CSV
Programming/API          → JSON
Report/Presentation      → PNG or SVG
Share interactive chart  → HTML
Archive with metadata    → JSON
Import to other tools    → CSV or JSON
```

**Expected Outcome:** Export format selected

---

### Step 2: Export Data to JSON

**Description:** Export chart data to JSON format

**Simple JSON export:**
```typescript
// In chart application or CLI tool
function exportToJSON(chartData: ChartData, outputPath: string) {
  const exportData = {
    ticker: chartData.ticker,
    exported: new Date().toISOString(),
    dataPoints: chartData.data.length,
    timeframe: {
      start: chartData.data[0].time,
      end: chartData.data[chartData.data.length - 1].time,
    },
    data: chartData.data,
  };
  
  Bun.write(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`✅ Exported to JSON: ${outputPath}`);
}

// Usage
exportToJSON(chartData, '~/.claude/scratchpad/AAPL_export.json');
```

**CLI command:**
```bash
# Export current chart data
cd ~/.claude/skills/finance-charts/tools
bun run export.ts --ticker AAPL --format json --output ~/Downloads/aapl_data.json
```

**Expected Outcome:** JSON file created with chart data

---

### Step 3: Export Data to CSV

**Description:** Convert data to CSV format for spreadsheet analysis

**CSV export implementation:**
```typescript
function exportToCSV(chartData: ChartData, outputPath: string) {
  // CSV header
  const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
  const csvLines = [headers.join(',')];
  
  // Data rows
  chartData.data.forEach(candle => {
    const row = [
      candle.time,
      candle.open.toFixed(2),
      candle.high.toFixed(2),
      candle.low.toFixed(2),
      candle.close.toFixed(2),
      candle.volume || 0,
    ];
    csvLines.push(row.join(','));
  });
  
  const csvContent = csvLines.join('\n');
  Bun.write(outputPath, csvContent);
  
  console.log(`✅ Exported to CSV: ${outputPath}`);
  console.log(`   Rows: ${chartData.data.length + 1} (including header)`);
}

// Usage
exportToCSV(chartData, '~/.claude/scratchpad/AAPL_export.csv');
```

**Example CSV output:**
```csv
Date,Open,High,Low,Close,Volume
2024-08-19,225.77,227.30,223.27,226.50,54844300
2024-08-20,226.30,227.03,223.52,224.72,50743900
2024-08-21,224.50,226.45,223.89,226.40,46311900
```

**CLI command:**
```bash
# Export to CSV
bun run export.ts --ticker AAPL --format csv --output ~/Desktop/aapl.csv
```

**Expected Outcome:** CSV file ready for Excel/Google Sheets

---

### Step 4: Export Chart as Image (PNG/SVG)

**Description:** Capture chart visualization as static image

**Option A: Browser Screenshot (PNG)**

Using Playwright for automated screenshots:

```typescript
import { chromium } from 'playwright';

async function exportChartToPNG(chartUrl: string, outputPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Load chart
  await page.goto(chartUrl);
  await page.waitForSelector('#chart canvas', { timeout: 5000 });
  
  // Wait for chart to fully render
  await page.waitForTimeout(1000);
  
  // Screenshot chart area
  const chartElement = await page.$('#chart');
  await chartElement!.screenshot({ path: outputPath });
  
  await browser.close();
  
  console.log(`✅ Exported chart to PNG: ${outputPath}`);
}

// Usage
await exportChartToPNG(
  'http://localhost:3000',
  '~/.claude/scratchpad/AAPL_chart.png'
);
```

**Install Playwright:**
```bash
cd ~/.claude/skills/finance-charts/tools
bun add -D playwright
bunx playwright install chromium
```

**Option B: Canvas to Image (Client-side)**

```typescript
// In chart application
function exportCanvasToPNG() {
  const canvas = document.querySelector('#chart canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Chart canvas not found');
    return;
  }
  
  // Convert canvas to blob
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    // Download as file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartData.ticker}_chart_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ Chart downloaded as PNG');
  });
}

// Add to export button
document.getElementById('btn-export-png')!.addEventListener('click', exportCanvasToPNG);
```

**Option C: SVG Export (Vector Graphics)**

TradingView lightweight-charts renders on Canvas, not SVG. For SVG export, use alternative approach:

```typescript
// Use canvas-to-svg converter or server-side rendering
import { createCanvas } from 'canvas';

// ... render chart to canvas, then convert to SVG
// Or use D3.js / Vega for native SVG charts
```

**Expected Outcome:** Image file (PNG/SVG) of chart

---

### Step 5: Export as Standalone HTML

**Description:** Create self-contained HTML file with embedded chart

**Generate standalone HTML:**
```typescript
async function exportToHTML(chartData: ChartData, outputPath: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${chartData.ticker} Chart</title>
  <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    #chart {
      width: 100%;
      height: 600px;
      background: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📈 ${chartData.ticker}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  <div id="chart"></div>
  
  <script>
    const chart = LightweightCharts.createChart(document.getElementById('chart'), {
      width: window.innerWidth,
      height: 600,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
    });
    
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    
    const data = ${JSON.stringify(chartData.data, null, 2)};
    candlestickSeries.setData(data);
    
    chart.timeScale().fitContent();
    
    window.addEventListener('resize', () => {
      chart.applyOptions({ width: window.innerWidth });
    });
  </script>
</body>
</html>`;

  await Bun.write(outputPath, html);
  console.log(`✅ Exported to HTML: ${outputPath}`);
  console.log(`   Open in browser: file://${outputPath}`);
}

// Usage
await exportToHTML(chartData, '~/.claude/scratchpad/AAPL_chart.html');
```

**CLI command:**
```bash
# Generate standalone HTML
bun run export.ts --ticker AAPL --format html --output ~/Desktop/aapl_chart.html

# Open in browser
open ~/Desktop/aapl_chart.html  # macOS
xdg-open ~/Desktop/aapl_chart.html  # Linux
```

**Expected Outcome:** Shareable HTML file with interactive chart

---

### Step 6: Archive Export with Metadata

**Description:** Save export with complete metadata for future reference

**Create archive package:**
```typescript
interface ChartArchive {
  metadata: {
    ticker: string;
    exported: string;
    exporter: string;
    timeframe: {
      start: string;
      end: string;
      interval: string;
    };
    dataPoints: number;
    source: string;
  };
  data: CandlestickData[];
  indicators?: {
    ma20?: LineData[];
    ma50?: LineData[];
  };
  notes?: string;
}

async function createArchive(chartData: ChartData, outputPath: string) {
  const archive: ChartArchive = {
    metadata: {
      ticker: chartData.ticker,
      exported: new Date().toISOString(),
      exporter: 'finance-charts-skill',
      timeframe: {
        start: chartData.data[0].time,
        end: chartData.data[chartData.data.length - 1].time,
        interval: detectInterval(chartData.data),
      },
      dataPoints: chartData.data.length,
      source: 'Yahoo Finance',
    },
    data: chartData.data,
    indicators: {},
    notes: 'Exported via Qara finance-charts skill',
  };
  
  await Bun.write(outputPath, JSON.stringify(archive, null, 2));
  console.log(`✅ Archive created: ${outputPath}`);
}

function detectInterval(data: CandlestickData[]): string {
  if (data.length < 2) return 'unknown';
  
  const diff = new Date(data[1].time).getTime() - new Date(data[0].time).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  
  if (days >= 7) return '1wk';
  if (days >= 1) return '1d';
  if (days >= 1/24) return '1h';
  return '1m';
}
```

**Expected Outcome:** Complete archive with metadata

---

## Outputs

**What this workflow produces:**
- **JSON file**: Complete data with metadata
- **CSV file**: Spreadsheet-compatible data
- **PNG/SVG**: Static chart image
- **HTML file**: Interactive standalone chart
- **Archive**: Complete package with metadata

**Where outputs are stored:**
- Default: `~/.claude/scratchpad/`
- Custom: User-specified path
- Archives: `~/.claude/context/projects/finance-charts/archives/`

---

## Export Locations

**Temporary Exports (Default):**
```
~/.claude/scratchpad/
├── AAPL_export.json
├── AAPL_export.csv
├── AAPL_chart.png
└── AAPL_chart.html
```

**Project Archives:**
```
~/.claude/context/projects/finance-charts/archives/
├── 2025-11-19_AAPL_archive.json
├── 2025-11-19_BTC_archive.json
└── monthly/
    └── 2025-11_portfolio.json
```

**User-specified:**
```bash
# Export to specific location
bun run export.ts --ticker AAPL --format csv --output ~/Documents/Trading/aapl_data.csv
```

---

## Export Formats Reference

**JSON Format:**
```json
{
  "ticker": "AAPL",
  "exported": "2025-11-19T17:00:00Z",
  "dataPoints": 63,
  "data": [
    {
      "time": "2024-08-19",
      "open": 225.77,
      "high": 227.30,
      "low": 223.27,
      "close": 226.50,
      "volume": 54844300
    }
  ]
}
```

**CSV Format:**
```csv
Date,Open,High,Low,Close,Volume
2024-08-19,225.77,227.30,223.27,226.50,54844300
```

**HTML Format:**
- Self-contained with CDN-loaded lightweight-charts
- Embedded data in JavaScript
- Responsive and interactive
- No external dependencies except CDN

---

## Batch Export (Multiple Tickers)

**Export multiple charts:**
```typescript
async function batchExport(tickers: string[], format: 'json' | 'csv' | 'html') {
  for (const ticker of tickers) {
    const data = await loadChartData(ticker);
    const filename = `${ticker}_export.${format}`;
    const outputPath = `~/.claude/scratchpad/${filename}`;
    
    switch (format) {
      case 'json':
        await exportToJSON(data, outputPath);
        break;
      case 'csv':
        await exportToCSV(data, outputPath);
        break;
      case 'html':
        await exportToHTML(data, outputPath);
        break;
    }
  }
  
  console.log(`✅ Batch export complete: ${tickers.length} charts`);
}

// Usage
await batchExport(['AAPL', 'TSLA', 'GOOGL'], 'csv');
```

---

## Related Workflows

- **fetch-data.md** - Source of data to export
- **create-chart.md** - Chart to export as image
- **update-data.md** - Export updated data

---

## Examples

**Example 1: Export to CSV for Excel**
```bash
$ bun run export.ts --ticker AAPL --format csv
✅ Exported to CSV: ~/.claude/scratchpad/AAPL_export.csv
   Rows: 64 (including header)

# Open in Excel
$ open ~/.claude/scratchpad/AAPL_export.csv
```

**Example 2: Create Shareable Chart**
```bash
$ bun run export.ts --ticker BTC-USD --format html --output ~/Desktop/bitcoin.html
✅ Exported to HTML: ~/Desktop/bitcoin.html
   Open in browser: file:///Users/jm/Desktop/bitcoin.html

# Share via email or cloud storage
```

**Example 3: Archive Portfolio**
```typescript
// Export all watchlist tickers
const watchlist = ['AAPL', 'TSLA', 'NVDA', 'BTC-USD'];
await batchExport(watchlist, 'json');

// Create combined archive
const archivePath = `~/.claude/context/projects/finance-charts/archives/${date}_portfolio.json`;
await createPortfolioArchive(watchlist, archivePath);
```

**Example 4: Screenshot for Report**
```bash
# Generate chart screenshot
$ bun run screenshot.ts --url http://localhost:3000 --output ~/Documents/report_chart.png
✅ Chart screenshot saved: ~/Documents/report_chart.png

# Insert into PowerPoint/Keynote
```

---

**Last Updated:** 2025-11-19
