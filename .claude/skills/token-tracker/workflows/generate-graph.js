#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.resolve(path.join(__dirname, '../state'));
const USAGE_FILE = path.join(STATE_DIR, 'usage-data.json');
const GRAPHS_DIR = path.join(STATE_DIR, 'graphs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function loadUsageData() {
  if (!fs.existsSync(USAGE_FILE)) {
    error('No usage data found. Run track-usage first.');
    process.exit(1);
  }
  try {
    const data = fs.readFileSync(USAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    error(`Failed to load usage data: ${err.message}`);
    process.exit(1);
  }
}

function filterByDateRange(usageData, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return usageData.filter(record => {
    const recordDate = new Date(record.timestamp);
    return recordDate >= cutoff;
  });
}

function aggregateByDate(usageData) {
  const dailyData = {};

  usageData.forEach(record => {
    const date = record.timestamp.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { tokens: 0, cost: 0, byService: {} };
    }
    dailyData[date].tokens += record.tokens_used;
    dailyData[date].cost += record.cost_estimate;

    if (!dailyData[date].byService[record.service]) {
      dailyData[date].byService[record.service] = 0;
    }
    dailyData[date].byService[record.service] += record.tokens_used;
  });

  const sortedDates = Object.keys(dailyData).sort();
  return sortedDates.map(date => ({
    date,
    ...dailyData[date]
  }));
}

function aggregateByService(usageData) {
  const serviceData = {};

  usageData.forEach(record => {
    if (!serviceData[record.service]) {
      serviceData[record.service] = { tokens: 0, cost: 0, records: 0 };
    }
    serviceData[record.service].tokens += record.tokens_used;
    serviceData[record.service].cost += record.cost_estimate;
    serviceData[record.service].records += 1;
  });

  return Object.entries(serviceData).map(([service, data]) => ({
    service,
    ...data
  }));
}

function generateLineGraph(aggregatedData, title = 'Token Usage Over Time') {
  const maxTokens = Math.max(...aggregatedData.map(d => d.tokens));
  const height = 300;
  const width = 800;
  const padding = { top: 40, right: 20, bottom: 40, left: 60 };

  const plotHeight = height - padding.top - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const xStep = plotWidth / (aggregatedData.length - 1 || 1);
  const yScale = plotHeight / maxTokens;

  const points = aggregatedData.map((d, i) => {
    const x = padding.left + (i * xStep);
    const y = padding.top + plotHeight - (d.tokens * yScale);
    return `${x},${y}`;
  }).join(' ');

  const xLabels = aggregatedData.map((d, i) => {
    if (i % Math.ceil(aggregatedData.length / 10) === 0 || i === aggregatedData.length - 1) {
      const x = padding.left + (i * xStep);
      return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#666">${d.date.slice(5)}</text>`;
    }
    return '';
  }).join('');

  const yLabels = [];
  for (let i = 0; i <= 5; i++) {
    const value = Math.round((maxTokens / 5) * i);
    const y = padding.top + plotHeight - (value * yScale);
    yLabels.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${value.toLocaleString()}</text>`);
    yLabels.push(`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>
  ${yLabels.join('\n  ')}
  <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${aggregatedData.map((d, i) => {
    const x = padding.left + (i * xStep);
    const y = padding.top + plotHeight - (d.tokens * yScale);
    return `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6"/>`;
  }).join('\n  ')}
  <text x="${padding.left - 10}" y="${padding.top - 10}" text-anchor="end" font-size="10" fill="#666">Tokens</text>
  <text x="${width / 2}" y="${height - 5}" text-anchor="middle" font-size="10" fill="#666">Date</text>
  ${xLabels}
</svg>`;
}

function generateBarChart(aggregatedData, title = 'Token Usage by Service') {
  const maxTokens = Math.max(...aggregatedData.map(d => d.tokens));
  const height = 300;
  const width = 600;
  const padding = { top: 40, right: 20, bottom: 60, left: 100 };

  const plotHeight = height - padding.top - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const barWidth = plotWidth / aggregatedData.length * 0.7;
  const barGap = plotWidth / aggregatedData.length * 0.3;
  const yScale = plotHeight / maxTokens;

  const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const bars = aggregatedData.map((d, i) => {
    const x = padding.left + (i * (barWidth + barGap)) + (barGap / 2);
    const barHeight = d.tokens * yScale;
    const y = padding.top + plotHeight - barHeight;
    const color = barColors[i % barColors.length];

    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3"/>
  <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="10" fill="#333">${d.tokens.toLocaleString()}</text>
  <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#666">${d.service}</text>`;
  }).join('\n  ');

  const yLabels = [];
  for (let i = 0; i <= 5; i++) {
    const value = Math.round((maxTokens / 5) * i);
    const y = padding.top + plotHeight - (value * yScale);
    yLabels.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${value.toLocaleString()}</text>`);
    yLabels.push(`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>
  ${yLabels.join('\n  ')}
  ${bars}
  <text x="${padding.left - 10}" y="${padding.top - 10}" text-anchor="end" font-size="10" fill="#666">Tokens</text>
</svg>`;
}

function generatePieChart(aggregatedData, title = 'Token Distribution') {
  const totalTokens = aggregatedData.reduce((sum, d) => sum + d.tokens, 0);
  const cx = 300;
  const cy = 160;
  const radius = 100;

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  let startAngle = -90;
  const slices = aggregatedData.map((d, i) => {
    const percentage = (d.tokens / totalTokens) * 100;
    const angle = (percentage / 100) * 360;
    const endAngle = startAngle + angle;

    const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArc = angle > 180 ? 1 : 0;

    const slice = `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" 
        fill="${pieColors[i % pieColors.length]}" stroke="#ffffff" stroke-width="2"/>`;

    const labelAngle = startAngle + angle / 2;
    const labelRadius = radius + 30;
    const labelX = cx + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
    const labelY = cy + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

    const label = `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#333" font-weight="bold">
      ${d.service}: ${percentage.toFixed(1)}%
    </text>`;

    startAngle = endAngle;
    return slice + '\n  ' + label;
  }).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="320" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="320" fill="#ffffff"/>
  <text x="300" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>
  ${slices}
  <text x="300" y="300" text-anchor="middle" font-size="10" fill="#666">Total: ${totalTokens.toLocaleString()} tokens</text>
</svg>`;
}

function saveGraph(svgContent, filename) {
  if (!fs.existsSync(GRAPHS_DIR)) {
    fs.mkdirSync(GRAPHS_DIR, { recursive: true });
  }

  const filepath = path.join(GRAPHS_DIR, filename);
  fs.writeFileSync(filepath, svgContent);
  return filepath;
}

function main() {
  const graphType = process.argv[2] || 'line';
  const daysArg = process.argv[3];
  const days = daysArg ? parseInt(daysArg) : 30;

  log('\n📈 Token Tracker - Generate Graph', colors.cyan);
  log('=' .repeat(50), colors.cyan);

  const usageData = loadUsageData();
  log(`Loaded ${usageData.length} usage record(s)\n`, colors.cyan);

  const filteredData = filterByDateRange(usageData, days);
  log(`Filtering to last ${days} days: ${filteredData.length} records\n`, colors.cyan);

  let svgContent;
  let filename;
  let description;

  switch (graphType) {
    case 'line':
    case 'trend':
      const dailyData = aggregateByDate(filteredData);
      svgContent = generateLineGraph(dailyData, `Token Usage (${days} Days)`);
      filename = `usage-trend-${new Date().toISOString().split('T')[0]}.svg`;
      description = `Line graph showing token usage over ${days} days`;
      break;

    case 'bar':
    case 'comparison':
      const serviceData = aggregateByService(filteredData);
      svgContent = generateBarChart(serviceData, 'Token Usage by Service');
      filename = `usage-bar-${new Date().toISOString().split('T')[0]}.svg`;
      description = 'Bar chart comparing usage by service';
      break;

    case 'pie':
    case 'distribution':
      const pieData = aggregateByService(filteredData);
      svgContent = generatePieChart(pieData, 'Token Distribution');
      filename = `usage-pie-${new Date().toISOString().split('T')[0]}.svg`;
      description = 'Pie chart showing token distribution by service';
      break;

    default:
      error(`Unknown graph type: ${graphType}`);
      log('Available types: line, bar, pie', colors.cyan);
      process.exit(1);
  }

  const filepath = saveGraph(svgContent, filename);

  success(`Graph generated successfully!`);
  log(`\nType:    ${graphType}`);
  log(`File:     ${filename}`);
  log(`Path:     ${filepath}`);
  log(`Description: ${description}\n`);
  log(`View in browser: file://${filepath}\n`, colors.dim);

  process.exit(0);
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
