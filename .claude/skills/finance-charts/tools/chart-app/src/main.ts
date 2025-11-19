import { FinanceChart, calculateMA } from './chart-cdn';
import type { ChartData } from './chart-cdn';

// Load chart data
async function loadChartData(): Promise<ChartData> {
  const response = await fetch('/data.json');
  const result = await response.json();

  // Prepare volume data
  const volumeData = result.data.map((candle: any) => ({
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
  }));

  return {
    ticker: result.productId || result.ticker || 'BTC-USD',
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
init().catch(console.error);
