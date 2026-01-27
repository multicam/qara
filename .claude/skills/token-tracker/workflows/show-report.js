#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.resolve(path.join(__dirname, '../state'));
const USAGE_FILE = path.join(STATE_DIR, 'usage-data.json');
const GRAPHS_DIR = path.join(STATE_DIR, 'graphs');
const REPORTS_DIR = path.join(STATE_DIR, 'reports');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[90m'
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

function calculateStats(usageData) {
  const totalTokens = usageData.reduce((sum, r) => sum + r.tokens_used, 0);
  const totalCost = usageData.reduce((sum, r) => sum + r.cost_estimate, 0);
  const totalRequests = usageData.length;

  const byService = {};
  const byModel = {};

  usageData.forEach(record => {
    if (!byService[record.service]) {
      byService[record.service] = { tokens: 0, cost: 0, records: 0 };
    }
    byService[record.service].tokens += record.tokens_used;
    byService[record.service].cost += record.cost_estimate;
    byService[record.service].records += 1;

    if (!byModel[record.model]) {
      byModel[record.model] = { tokens: 0, cost: 0, records: 0 };
    }
    byModel[record.model].tokens += record.tokens_used;
    byModel[record.model].cost += record.cost_estimate;
    byModel[record.model].records += 1;
  });

  const dailyUsage = {};
  usageData.forEach(record => {
    const date = record.timestamp.split('T')[0];
    if (!dailyUsage[date]) {
      dailyUsage[date] = { tokens: 0, records: 0 };
    }
    dailyUsage[date].tokens += record.tokens_used;
    dailyUsage[date].records += 1;
  });

  const dailyValues = Object.values(dailyUsage);
  const avgDailyTokens = dailyValues.length > 0 
    ? dailyValues.reduce((sum, d) => sum + d.tokens, 0) / dailyValues.length 
    : 0;

  const sortedDays = Object.entries(dailyUsage).sort((a, b) => a[0].localeCompare(b[0]));
  const peakDay = sortedDays.length > 0 
    ? sortedDays.reduce((max, day) => day[1].tokens > max[1].tokens ? day : max)
    : null;

  return {
    totalTokens,
    totalCost,
    totalRequests,
    avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
    avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
    avgDailyTokens,
    byService,
    byModel,
    dailyUsage,
    peakDay,
    dateRange: {
      first: usageData[0]?.timestamp || null,
      last: usageData[usageData.length - 1]?.timestamp || null
    }
  };
}

function formatTable(headers, rows, columnWidths) {
  const separator = '├' + columnWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const topBorder = '┌' + columnWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const bottomBorder = '└' + columnWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  let output = topBorder + '\n';
  
  output += '│';
  headers.forEach((header, i) => {
    output += ` ${header.padEnd(columnWidths[i])} │`;
  });
  output += '\n';

  output += separator + '\n';

  rows.forEach(row => {
    output += '│';
    row.forEach((cell, i) => {
      output += ` ${String(cell).padEnd(columnWidths[i])} │`;
    });
    output += '\n';
  });

  output += bottomBorder;
  return output;
}

function generateReport(usageData, stats) {
  const lines = [];

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('                  Token Usage Report');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`Generated: ${new Date().toISOString()}`);
  
  if (stats.dateRange.first && stats.dateRange.last) {
    const firstDate = new Date(stats.dateRange.first).toLocaleDateString();
    const lastDate = new Date(stats.dateRange.last).toLocaleDateString();
    lines.push(`Period: ${firstDate} to ${lastDate}`);
  }
  
  lines.push('');
  lines.push('');
  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Total Tokens:    ${stats.totalTokens.toLocaleString()}`);
  lines.push(`Total Cost:      $${stats.totalCost.toFixed(4)}`);
  lines.push(`Total Requests:   ${stats.totalRequests.toLocaleString()}`);
  lines.push(`Avg Tokens/Req:  ${stats.avgTokensPerRequest.toFixed(0)}`);
  lines.push(`Avg Cost/Req:    $${stats.avgCostPerRequest.toFixed(6)}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const serviceRows = Object.entries(stats.byService)
    .map(([service, data]) => {
      const share = ((data.tokens / stats.totalTokens) * 100).toFixed(1);
      return [service, data.tokens.toLocaleString(), `$${data.cost.toFixed(4)}`, `${share}%`];
    })
    .sort((a, b) => b[1] - a[1]);

  lines.push('USAGE BY SERVICE');
  lines.push('----------------');
  lines.push(formatTable(
    ['Service', 'Tokens', 'Cost ($)', 'Share (%)'],
    serviceRows,
    [15, 15, 12, 10]
  ));
  lines.push('');

  const modelRows = Object.entries(stats.byModel)
    .map(([model, data]) => [model, data.tokens.toLocaleString(), `$${data.cost.toFixed(4)}`])
    .sort((a, b) => b[1] - a[1]);

  lines.push('USAGE BY MODEL');
  lines.push('--------------');
  lines.push(formatTable(
    ['Model', 'Tokens', 'Cost ($)'],
    modelRows,
    [30, 15, 12]
  ));
  lines.push('');

  lines.push('TRENDS');
  lines.push('------');
  lines.push(`Daily Average (tokens):  ${stats.avgDailyTokens.toFixed(0)}`);
  
  if (stats.peakDay) {
    lines.push(`Peak Usage Day:          ${stats.peakDay[0]} (${stats.peakDay[1].tokens.toLocaleString()} tokens)`);
  }

  const lowestDay = Object.entries(stats.dailyUsage)
    .reduce((min, day) => day[1].tokens < min[1].tokens ? day : min);
  lines.push(`Lowest Usage Day:       ${lowestDay[0]} (${lowestDay[1].tokens.toLocaleString()} tokens)`);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const graphFiles = fs.existsSync(GRAPHS_DIR) ? fs.readdirSync(GRAPHS_DIR) : [];
  if (graphFiles.length > 0) {
    const latestGraph = graphFiles.sort().pop();
    lines.push('VISUALIZATIONS');
    lines.push('---------------');
    lines.push(`Latest Graph: ${latestGraph}`);
    lines.push(`Location:    ${GRAPHS_DIR}/${latestGraph}`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
  }

  return lines.join('\n');
}

function saveReport(reportContent) {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const filename = `report-${new Date().toISOString().split('T')[0]}.txt`;
  const filepath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filepath, reportContent);

  return filepath;
}

function main() {
  log('\n📋 Token Tracker - Usage Report', colors.cyan);
  log('=' .repeat(50), colors.cyan);

  const usageData = loadUsageData();
  
  log(`Loaded ${usageData.length} usage record(s)\n`, colors.cyan);

  const stats = calculateStats(usageData);
  const report = generateReport(usageData, stats);

  log(report, colors.reset);

  const reportFile = saveReport(report);
  log(`Report saved to: ${reportFile}`, colors.dim);

  process.exit(0);
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
