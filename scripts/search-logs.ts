#!/usr/bin/env bun
/**
 * search-logs.ts — Session transcript search CLI.
 *
 * Searches tool-usage.jsonl (and archives) with filters for keyword,
 * session, tool, date range, and error state.
 *
 * Usage:
 *   bun scripts/search-logs.ts -q "git add" --from 2026-04-07
 *   bun scripts/search-logs.ts -t Bash --errors --from 2026-04-01 --to 2026-04-07
 *   bun scripts/search-logs.ts -s "session-id" --format json
 *   bun scripts/search-logs.ts --count --from 2026-04-07
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// ─── Resolve STATE_DIR from PAI_DIR env ─────────────────────────────────────

const PAI_DIR = process.env.PAI_DIR || join(
  process.env.HOME || require("os").homedir(),
  ".claude"
);
const STATE_DIR = join(PAI_DIR, "state");

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToolUsageEntry {
  timestamp: string;
  tool: string;
  error: boolean;
  session_id: string;
  input_summary?: string;
  output_len?: number;
  error_detail?: string | null;
}

// ─── JSONL reading (self-contained to avoid import path issues) ─────────────

function readJsonlFile(path: string): ToolUsageEntry[] {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(line => line.trim())
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean) as ToolUsageEntry[];
  } catch { return []; }
}

function isOnDate(timestamp: string, date: string): boolean {
  return timestamp.startsWith(date);
}

function collectForDate(targetDate: string): ToolUsageEntry[] {
  return readJsonlFile(join(STATE_DIR, "tool-usage.jsonl"))
    .filter(e => isOnDate(e.timestamp, targetDate));
}

// ─── CLI argument parsing ───────────────────────────────────────────────────

interface SearchOptions {
  query?: string;
  session?: string;
  tool?: string;
  from: string;
  to: string;
  errors: boolean;
  format: "table" | "json" | "jsonl";
  limit: number;
  count: boolean;
  help: boolean;
}

const USAGE = `Usage: bun scripts/search-logs.ts [options]

Options:
  -q, --query <text>         Keyword search in input_summary (case-insensitive)
  -s, --session <id>         Filter by session_id
  -t, --tool <name>          Filter by tool name (case-insensitive)
  --from <YYYY-MM-DD>        Start date (default: today)
  --to <YYYY-MM-DD>          End date (default: same as --from)
  --errors                   Show only error entries
  --format <table|json|jsonl> Output format (default: table)
  -n, --limit <N>            Max results (default: 50)
  --count                    Show count only
  -h, --help                 Show this help`;

function parseArgs(argv: string[]): SearchOptions {
  const today = new Date().toISOString().slice(0, 10);
  const opts: SearchOptions = {
    from: today, to: "", errors: false,
    format: "table", limit: 50, count: false, help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if ((arg === "-q" || arg === "--query") && next) opts.query = argv[++i];
    else if ((arg === "-s" || arg === "--session") && next) opts.session = argv[++i];
    else if ((arg === "-t" || arg === "--tool") && next) opts.tool = argv[++i];
    else if (arg === "--from" && next) opts.from = argv[++i]!;
    else if (arg === "--to" && next) opts.to = argv[++i]!;
    else if (arg === "--errors") opts.errors = true;
    else if (arg === "--format" && next) opts.format = argv[++i] as any;
    else if ((arg === "-n" || arg === "--limit") && next) opts.limit = parseInt(argv[++i]!, 10) || 50;
    else if (arg === "--count") opts.count = true;
  }

  if (!opts.to) opts.to = opts.from;
  return opts;
}

// ─── Date range iteration ───────────────────────────────────────────────────

function getDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// ─── Filtering ──────────────────────────────────────────────────────────────

function applyFilters(entries: ToolUsageEntry[], opts: SearchOptions): ToolUsageEntry[] {
  let results = entries;
  if (opts.query) {
    const q = opts.query.toLowerCase();
    results = results.filter(e => e.input_summary?.toLowerCase().includes(q));
  }
  if (opts.session) {
    results = results.filter(e => e.session_id === opts.session);
  }
  if (opts.tool) {
    const t = opts.tool.toLowerCase();
    results = results.filter(e => e.tool.toLowerCase() === t);
  }
  if (opts.errors) {
    results = results.filter(e => e.error);
  }
  return results;
}

// ─── Output formatting ─────────────────────────────────────────────────────

function formatTable(entries: ToolUsageEntry[]): string {
  const header = "TIMESTAMP                     TOOL         SESSION    INPUT_SUMMARY                              ERR";
  const sep = "-".repeat(header.length);
  const rows = entries.map(e => {
    const ts = e.timestamp.padEnd(30);
    const tool = e.tool.padEnd(13);
    const sid = (e.session_id || "").slice(0, 10).padEnd(11);
    const summary = (e.input_summary || "").slice(0, 42).padEnd(43);
    const err = e.error ? "Y" : "";
    return `${ts}${tool}${sid}${summary}${err}`;
  });
  return [header, sep, ...rows].join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(USAGE);
    process.exit(0);
  }

  // Collect entries across date range
  const dates = getDateRange(opts.from, opts.to);
  let entries: ToolUsageEntry[] = [];
  for (const date of dates) {
    entries.push(...collectForDate(date));
  }

  // Sort by timestamp
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Apply filters
  entries = applyFilters(entries, opts);

  // Count mode
  if (opts.count) {
    console.log(String(entries.length));
    process.exit(0);
  }

  // Apply limit
  entries = entries.slice(0, opts.limit);

  // Output
  if (opts.format === "json") {
    console.log(JSON.stringify(entries, null, 2));
  } else if (opts.format === "jsonl") {
    for (const e of entries) console.log(JSON.stringify(e));
  } else {
    if (entries.length === 0) {
      console.log("No results found.");
    } else {
      console.log(formatTable(entries));
    }
  }
}

main();
