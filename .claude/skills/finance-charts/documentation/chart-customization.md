# Chart Customization Guide

**Comprehensive guide for styling and customizing TradingView lightweight-charts**

---

## Overview

This guide covers all customization options for TradingView lightweight-charts, including themes, colors, layouts, and advanced features.

---

## Chart Configuration

### Basic Chart Options

```typescript
import { createChart, ColorType } from 'lightweight-charts';

const chart = createChart(container, {
  width: 800,
  height: 600,
  
  // Layout options
  layout: {
    background: {
      type: ColorType.Solid,
      color: '#ffffff',
    },
    textColor: '#333333',
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  
  // Grid options
  grid: {
    vertLines: {
      color: '#e1e1e1',
      style: 0, // 0=solid, 1=dotted, 2=dashed, 3=large dashed, 4=sparse dotted
      visible: true,
    },
    horzLines: {
      color: '#e1e1e1',
      style: 0,
      visible: true,
    },
  },
  
  // Crosshair options
  crosshair: {
    mode: 0, // 0=normal, 1=magnet
    vertLine: {
      color: '#758696',
      width: 1,
      style: 3,
      visible: true,
      labelVisible: true,
      labelBackgroundColor: '#4c525e',
    },
    horzLine: {
      color: '#758696',
      width: 1,
      style: 3,
      visible: true,
      labelVisible: true,
      labelBackgroundColor: '#4c525e',
    },
  },
  
  // Price scale options
  rightPriceScale: {
    visible: true,
    borderColor: '#d1d4dc',
    scaleMargins: {
      top: 0.1,
      bottom: 0.2,
    },
    mode: 0, // 0=normal, 1=logarithmic, 2=percentage, 3=index100
  },
  
  // Time scale options
  timeScale: {
    rightOffset: 5,
    barSpacing: 6,
    minBarSpacing: 0.5,
    fixLeftEdge: false,
    fixRightEdge: false,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: true,
    borderVisible: true,
    borderColor: '#d1d4dc',
    visible: true,
    timeVisible: true,
    secondsVisible: false,
  },
  
  // Handle options
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  
  handleScale: {
    axisPressedMouseMove: true,
    axisDoubleClickReset: true,
    mouseWheel: true,
    pinch: true,
  },
});
```

---

## Theme Presets

### Light Theme (Default)

```typescript
const lightTheme = {
  layout: {
    background: { type: ColorType.Solid, color: '#ffffff' },
    textColor: '#333333',
  },
  grid: {
    vertLines: { color: '#e1e1e1' },
    horzLines: { color: '#e1e1e1' },
  },
  rightPriceScale: {
    borderColor: '#d1d4dc',
  },
  timeScale: {
    borderColor: '#d1d4dc',
  },
};
```

### Dark Theme

```typescript
const darkTheme = {
  layout: {
    background: { type: ColorType.Solid, color: '#1e1e1e' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#2a2e39' },
    horzLines: { color: '#2a2e39' },
  },
  rightPriceScale: {
    borderColor: '#2a2e39',
  },
  timeScale: {
    borderColor: '#2a2e39',
  },
};
```

### Minimal Theme (No Grid)

```typescript
const minimalTheme = {
  layout: {
    background: { type: ColorType.Solid, color: '#fafafa' },
    textColor: '#333333',
  },
  grid: {
    vertLines: { visible: false },
    horzLines: { visible: false },
  },
  rightPriceScale: {
    borderVisible: false,
  },
  timeScale: {
    borderVisible: false,
  },
};
```

### Professional Theme

```typescript
const professionalTheme = {
  layout: {
    background: { type: ColorType.Solid, color: '#131722' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#363c4e', style: 1 },
    horzLines: { color: '#363c4e', style: 1 },
  },
  crosshair: {
    mode: 1, // Magnet mode
  },
};
```

---

## Series Customization

### Candlestick Series

```typescript
const candlestickSeries = chart.addCandlestickSeries({
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  
  // Alternative: visible borders
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  borderVisible: true,
  
  // Wick styles
  wickVisible: true,
  
  // Price line
  priceLineVisible: true,
  priceLineWidth: 1,
  priceLineColor: '',
  priceLineStyle: 2, // 0=solid, 1=dotted, 2=dashed, 3=large dashed, 4=sparse dotted
  
  // Last value label
  lastValueVisible: true,
  
  // Price format
  priceFormat: {
    type: 'price',
    precision: 2,
    minMove: 0.01,
  },
});
```

**Custom Colors (Bull/Bear):**
```typescript
// Traditional colors
const traditional = {
  upColor: '#00ff00',    // Green
  downColor: '#ff0000',  // Red
  wickUpColor: '#00ff00',
  wickDownColor: '#ff0000',
};

// Modern teal/red
const modern = {
  upColor: '#26a69a',    // Teal
  downColor: '#ef5350',  // Red
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
};

// Blue/orange
const alternative = {
  upColor: '#2962FF',    // Blue
  downColor: '#FF6D00',  // Orange
  wickUpColor: '#2962FF',
  wickDownColor: '#FF6D00',
};
```

### Line Series

```typescript
const lineSeries = chart.addLineSeries({
  color: '#2962FF',
  lineWidth: 2,
  lineStyle: 0, // 0=solid, 1=dotted, 2=dashed, 3=large dashed, 4=sparse dotted
  lineType: 0, // 0=simple, 1=step, 2=curved
  
  // Crosshair marker
  crosshairMarkerVisible: true,
  crosshairMarkerRadius: 4,
  crosshairMarkerBorderColor: '#2962FF',
  crosshairMarkerBackgroundColor: '#ffffff',
  
  // Price line
  priceLineVisible: true,
  priceLineWidth: 1,
  priceLineColor: '#2962FF',
  priceLineStyle: 2,
  
  // Last value
  lastValueVisible: true,
  
  // Title (for legend)
  title: 'Close Price',
});
```

### Area Series

```typescript
const areaSeries = chart.addAreaSeries({
  topColor: 'rgba(41, 98, 255, 0.56)',
  bottomColor: 'rgba(41, 98, 255, 0.04)',
  lineColor: 'rgba(41, 98, 255, 1)',
  lineWidth: 2,
  
  // Same options as line series
  crosshairMarkerVisible: true,
  lastValueVisible: true,
  priceLineVisible: true,
});
```

### Histogram Series (Volume)

```typescript
const volumeSeries = chart.addHistogramSeries({
  color: '#26a69a',
  priceFormat: {
    type: 'volume',
  },
  priceScaleId: 'volume', // Separate price scale
  
  // Base line
  base: 0,
});

// Configure volume scale
chart.priceScale('volume').applyOptions({
  scaleMargins: {
    top: 0.8,  // Volume takes bottom 20%
    bottom: 0,
  },
});
```

### Baseline Series

```typescript
const baselineSeries = chart.addBaselineSeries({
  topFillColor1: 'rgba(38, 166, 154, 0.28)',
  topFillColor2: 'rgba(38, 166, 154, 0.05)',
  topLineColor: 'rgba(38, 166, 154, 1)',
  
  bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
  bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
  bottomLineColor: 'rgba(239, 83, 80, 1)',
  
  baseValue: { type: 'price', price: 0 },
  lineWidth: 2,
});
```

---

## Markers and Annotations

### Price Markers

```typescript
candlestickSeries.setMarkers([
  {
    time: '2024-10-15',
    position: 'aboveBar',
    color: '#2196F3',
    shape: 'arrowDown',
    text: 'Buy Signal',
    size: 1,
  },
  {
    time: '2024-10-20',
    position: 'belowBar',
    color: '#e91e63',
    shape: 'arrowUp',
    text: 'Sell Signal',
    size: 1,
  },
]);
```

**Marker Shapes:**
- `circle`
- `square`
- `arrowUp`
- `arrowDown`

**Marker Positions:**
- `aboveBar`
- `belowBar`
- `inBar`

### Price Lines

```typescript
// Add horizontal price line
const priceLine = candlestickSeries.createPriceLine({
  price: 150.00,
  color: '#f44336',
  lineWidth: 2,
  lineStyle: 2, // Dashed
  axisLabelVisible: true,
  title: 'Stop Loss',
});

// Remove price line later
candlestickSeries.removePriceLine(priceLine);
```

---

## Advanced Features

### Multiple Price Scales

```typescript
// Main price scale (right)
const candlestickSeries = chart.addCandlestickSeries({
  priceScaleId: 'right',
});

// Volume on separate scale
const volumeSeries = chart.addHistogramSeries({
  priceScaleId: 'volume',
  priceFormat: { type: 'volume' },
});

chart.priceScale('volume').applyOptions({
  scaleMargins: { top: 0.8, bottom: 0 },
});

// Indicator on left scale
const rsiSeries = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#FF6D00',
});

chart.priceScale('left').applyOptions({
  scaleMargins: { top: 0.1, bottom: 0.1 },
});
```

### Logarithmic Scale

```typescript
chart.priceScale('right').applyOptions({
  mode: 1, // Logarithmic
});

// Or percentage mode
chart.priceScale('right').applyOptions({
  mode: 2, // Percentage
});
```

### Time Scale Customization

```typescript
chart.timeScale().applyOptions({
  // Visible range
  rightOffset: 10,
  
  // Bar spacing
  barSpacing: 10,
  minBarSpacing: 0.5,
  
  // Lock edges
  fixLeftEdge: false,
  fixRightEdge: false,
  
  // Time format
  timeVisible: true,
  secondsVisible: false,
  
  // Tick marks
  tickMarkFormatter: (time, tickMarkType, locale) => {
    const date = new Date(time * 1000);
    
    switch (tickMarkType) {
      case 0: // Year
        return date.getFullYear();
      case 1: // Month
        return date.toLocaleDateString(locale, { month: 'short' });
      case 2: // DayOfMonth
        return date.getDate();
      case 3: // Time
        return date.toLocaleTimeString(locale);
      default:
        return '';
    }
  },
});
```

---

## Responsive Design

### Window Resize Handler

```typescript
window.addEventListener('resize', () => {
  chart.applyOptions({
    width: container.clientWidth,
  });
});

// Or use ResizeObserver
const resizeObserver = new ResizeObserver(entries => {
  const { width, height } = entries[0].contentRect;
  chart.applyOptions({ width, height });
});

resizeObserver.observe(container);
```

### Mobile Optimization

```typescript
const isMobile = window.innerWidth < 768;

chart.applyOptions({
  layout: {
    fontSize: isMobile ? 10 : 12,
  },
  timeScale: {
    barSpacing: isMobile ? 3 : 6,
  },
  crosshair: {
    mode: isMobile ? 1 : 0, // Magnet on mobile
  },
});
```

---

## Performance Optimization

### Limit Visible Range

```typescript
// Auto-fit on data load
chart.timeScale().fitContent();

// Or set specific visible range
chart.timeScale().setVisibleRange({
  from: (new Date('2024-01-01').getTime() / 1000) as Time,
  to: (new Date('2024-12-31').getTime() / 1000) as Time,
});
```

### Reduce Data Points

```typescript
// Sample data for overview (use every Nth point)
function sampleData(data: CandlestickData[], sampleRate: number): CandlestickData[] {
  return data.filter((_, index) => index % sampleRate === 0);
}

// Use sampled data for initial render
const sampled = sampleData(fullData, 5);
candlestickSeries.setData(sampled);

// Load full data on zoom
chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
  // Load more granular data when zoomed in
});
```

---

## Example: Complete Custom Theme

```typescript
function createCustomChart(container: HTMLElement) {
  const chart = createChart(container, {
    width: container.clientWidth,
    height: 600,
    
    layout: {
      background: { type: ColorType.VerticalGradient, topColor: '#1e222d', bottomColor: '#181c27' },
      textColor: '#d1d4dc',
      fontSize: 12,
    },
    
    grid: {
      vertLines: { color: 'rgba(42, 46, 57, 0.5)', style: 1 },
      horzLines: { color: 'rgba(42, 46, 57, 0.5)', style: 1 },
    },
    
    crosshair: {
      mode: 1, // Magnet
      vertLine: {
        color: 'rgba(224, 227, 235, 0.1)',
        labelBackgroundColor: '#2962FF',
      },
      horzLine: {
        color: 'rgba(224, 227, 235, 0.1)',
        labelBackgroundColor: '#2962FF',
      },
    },
    
    rightPriceScale: {
      borderColor: 'rgba(197, 203, 206, 0.4)',
    },
    
    timeScale: {
      borderColor: 'rgba(197, 203, 206, 0.4)',
      timeVisible: true,
      secondsVisible: false,
    },
  });
  
  const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#089981',
    downColor: '#f23645',
    borderVisible: false,
    wickUpColor: '#089981',
    wickDownColor: '#f23645',
  });
  
  return { chart, candlestickSeries };
}
```

---

## Related Documentation

- TradingView Docs: https://tradingview.github.io/lightweight-charts/
- `~/.claude/skills/finance-charts/workflows/create-chart.md` - Chart creation workflow
- `~/.claude/skills/finance-charts/SKILL.md` - Main skill documentation

---

**Last Updated:** 2025-11-19
