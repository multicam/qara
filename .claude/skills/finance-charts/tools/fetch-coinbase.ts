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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// CLI interface
const productId = process.argv[2] || 'BTC-USD';
const granularity = parseInt(process.argv[3] || '86400');

const result = await fetchCoinbaseData(productId, granularity);
console.log(JSON.stringify(result, null, 2));
