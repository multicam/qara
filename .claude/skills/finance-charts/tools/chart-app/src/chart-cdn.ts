// Use the CDN version of lightweight-charts via global window object
declare const LightweightCharts: any;

export interface ChartConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

export interface ChartData {
  ticker: string;
  data: any[];
  volumeData?: { time: string; value: number; color?: string }[];
}

export class FinanceChart {
  private chart: any;
  private candlestickSeries: any;
  private volumeSeries?: any;

  constructor(config: ChartConfig) {
    const theme = config.theme || 'light';

    this.chart = LightweightCharts.createChart(config.container, {
      width: config.width || config.container.clientWidth,
      height: config.height || 600,
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: theme === 'dark' ? '#1e1e1e' : '#ffffff' },
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

  addMovingAverage(period: number, data: any[], color: string = '#2962FF') {
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
export function calculateMA(data: any[], period: number): any[] {
  const ma: any[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1)
      .reduce((acc: number, val: any) => acc + val.close, 0);

    ma.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  return ma;
}
