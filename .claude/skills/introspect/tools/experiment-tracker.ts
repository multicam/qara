#!/usr/bin/env bun
/**
 * experiment-tracker — CLI tool for Qara's introspection experiment pipeline.
 *
 * Parses experiment markdown files, lists them, and computes before/after
 * metrics by delegating to the introspect-miner's runDaily().
 *
 * Usage:
 *   bun experiment-tracker.ts --check
 *   bun experiment-tracker.ts --compare <exp-id>
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { runDaily, getDateRange } from './introspect-miner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Experiment {
    id: string;
    title: string;
    status: 'proposed' | 'active' | 'completed' | 'abandoned';
    started: string;
    ended?: string;
    duration_days: number;
    hypothesis: string;
    proposal?: string;
}

export interface PeriodMetrics {
    days: number;
    total_tools: number;
    total_errors: number;
    error_rate: number;
    session_count: number;
    recovery_count: number;
    repeated_failure_count: number;
    correction_count: number;
    avg_session_duration_ms: number;
}

export interface Comparison {
    baseline: PeriodMetrics;
    experiment: PeriodMetrics;
    deltas: Record<string, number>;
    pct_changes: Record<string, number>;
}

// ---------------------------------------------------------------------------
// YAML frontmatter parser (no external deps)
// ---------------------------------------------------------------------------

/**
 * Parses a YAML frontmatter block between `---` delimiters.
 * Handles scalar strings, numbers, and unquoted values. Returns null
 * if the frontmatter is missing or required fields are absent.
 */
export function parseExperimentFile(content: string): Experiment | null {
    if (!content) return null;

    // Extract frontmatter between first two `---` delimiters
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return null;

    const fm = fmMatch[1];
    const raw: Record<string, string> = {};
    for (const line of fm.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx < 0) continue;
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key) raw[key] = value;
    }

    // Required fields
    const VALID_STATUSES = new Set(['proposed', 'active', 'completed', 'abandoned']);
    if (!raw.id || !raw.status || !VALID_STATUSES.has(raw.status)) return null;

    const experiment: Experiment = {
        id: raw.id,
        title: raw.title || '',
        status: raw.status as Experiment['status'],
        started: raw.started || '',
        duration_days: Number(raw.duration_days) || 0,
        hypothesis: raw.hypothesis || '',
    };

    if (raw.ended) experiment.ended = raw.ended;
    if (raw.proposal) experiment.proposal = raw.proposal;

    return experiment;
}

// ---------------------------------------------------------------------------
// Directory listing
// ---------------------------------------------------------------------------

/**
 * Reads all .md files from dir, parses each as an Experiment, filters nulls,
 * and returns sorted by started date ascending. Returns [] if dir missing.
 */
export function listExperiments(dir: string): Experiment[] {
    if (!existsSync(dir)) return [];

    let files: string[];
    try {
        files = readdirSync(dir).filter(f => f.endsWith('.md'));
    } catch {
        return [];
    }

    const experiments: Experiment[] = [];
    for (const file of files) {
        try {
            const content = readFileSync(join(dir, file), 'utf-8');
            const exp = parseExperimentFile(content);
            if (exp) experiments.push(exp);
        } catch {
            // Skip unreadable files
        }
    }

    return experiments.sort((a, b) => a.started.localeCompare(b.started));
}

// ---------------------------------------------------------------------------
// Metrics aggregation
// ---------------------------------------------------------------------------

// Injectable daily runner type — real default is runDaily from miner
export type DailyRunner = typeof runDaily;

/**
 * Calls runDaily() for each date in [startDate, endDate] and aggregates
 * tool counts, errors, sessions, recoveries, and repeated failures.
 * Accepts an optional `runner` for dependency injection in tests.
 */
export function computeMetricsForPeriod(
    startDate: string,
    endDate: string,
    runner: DailyRunner = runDaily,
): PeriodMetrics {
    const dates = getDateRange(startDate, endDate);
    let total_tools = 0;
    let total_errors = 0;
    let session_count = 0;
    let recovery_count = 0;
    let repeated_failure_count = 0;
    let correction_count = 0;
    let total_session_duration_ms = 0;
    let session_trace_count = 0;

    for (const date of dates) {
        try {
            const report = runner(date);
            total_tools += report.tool_usage.total;
            total_errors += Object.values(report.tool_usage.by_tool)
                .reduce((sum, t) => sum + t.errors, 0);
            session_count += report.sessions.count;
            recovery_count += report.recovery_patterns.length;
            repeated_failure_count += report.repeated_failures.length;
            correction_count += report.corrections.length;
            for (const trace of report.session_traces) {
                total_session_duration_ms += trace.duration_ms;
                session_trace_count++;
            }
        } catch {
            // Skip days that fail (e.g. missing log files)
        }
    }

    const error_rate = total_tools > 0 ? total_errors / total_tools : 0;
    const avg_session_duration_ms = session_trace_count > 0
        ? total_session_duration_ms / session_trace_count
        : 0;

    return {
        days: dates.length,
        total_tools,
        total_errors,
        error_rate,
        session_count,
        recovery_count,
        repeated_failure_count,
        correction_count,
        avg_session_duration_ms,
    };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

const METRIC_KEYS: Array<keyof Omit<PeriodMetrics, 'days'>> = [
    'total_tools',
    'total_errors',
    'error_rate',
    'session_count',
    'recovery_count',
    'repeated_failure_count',
    'correction_count',
    'avg_session_duration_ms',
];

/**
 * Computes deltas (experiment - baseline) and pct_changes ((delta/baseline)*100)
 * for each numeric metric. Percentage is 0 when baseline value is 0.
 */
export function compareMetrics(baseline: PeriodMetrics, experiment: PeriodMetrics): Comparison {
    const deltas: Record<string, number> = {};
    const pct_changes: Record<string, number> = {};

    for (const key of METRIC_KEYS) {
        const delta = experiment[key] - baseline[key];
        deltas[key] = delta;
        pct_changes[key] = baseline[key] !== 0 ? (delta / baseline[key]) * 100 : 0;
    }

    return { baseline, experiment, deltas, pct_changes };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HOME = process.env.HOME || require('os').homedir();
const EXPERIMENTS_DIR = join(HOME, 'qara', 'thoughts', 'shared', 'introspection', 'experiments');

function cmdCheck() {
    const experiments = listExperiments(EXPERIMENTS_DIR);
    if (experiments.length === 0) {
        console.log('No experiments found.');
        return;
    }

    const statusEmoji: Record<string, string> = {
        proposed: '[ ]',
        active:   '[~]',
        completed: '[x]',
        abandoned: '[/]',
    };

    console.log(`\nExperiments (${experiments.length}):\n`);
    for (const exp of experiments) {
        const badge = statusEmoji[exp.status] || '[ ]';
        const duration = exp.ended
            ? `${exp.started} -> ${exp.ended} (${exp.duration_days}d)`
            : `${exp.started} -> ongoing (${exp.duration_days}d target)`;
        console.log(`  ${badge} ${exp.id}  ${exp.title}`);
        console.log(`       ${duration}`);
        console.log(`       ${exp.hypothesis}`);
        console.log();
    }
}

function cmdCompare(expId: string) {
    const experiments = listExperiments(EXPERIMENTS_DIR);
    const exp = experiments.find(e => e.id === expId);
    if (!exp) {
        console.error(`Experiment not found: ${expId}`);
        process.exit(1);
    }
    if (!exp.started) {
        console.error(`Experiment ${expId} has no started date.`);
        process.exit(1);
    }

    // Baseline: duration_days before started
    const d = new Date(exp.started + 'T00:00:00Z');
    const baselineEndDate = new Date(d);
    baselineEndDate.setDate(d.getDate() - 1);
    const baselineDays = exp.duration_days || 7;
    const baselineStartDate = new Date(baselineEndDate);
    baselineStartDate.setDate(baselineEndDate.getDate() - (baselineDays - 1));

    const baselineStart = baselineStartDate.toISOString().slice(0, 10);
    const baselineEnd = baselineEndDate.toISOString().slice(0, 10);
    const expEnd = exp.ended || new Date().toISOString().slice(0, 10);

    console.log(`\nComparing experiment: ${expId}`);
    console.log(`  Baseline:   ${baselineStart} -> ${baselineEnd}`);
    console.log(`  Experiment: ${exp.started} -> ${expEnd}\n`);

    const baselineMetrics = computeMetricsForPeriod(baselineStart, baselineEnd);
    const expMetrics = computeMetricsForPeriod(exp.started, expEnd);
    const comparison = compareMetrics(baselineMetrics, expMetrics);

    console.log('Metric              Baseline  Experiment  Delta     Change');
    console.log('------------------  --------  ----------  --------  ------');
    for (const key of METRIC_KEYS) {
        const b = comparison.baseline[key];
        const e = comparison.experiment[key];
        const delta = comparison.deltas[key];
        const pct = comparison.pct_changes[key];
        const sign = delta >= 0 ? '+' : '';
        console.log(
            `${key.padEnd(18)}  ${String(b.toFixed(3)).padStart(8)}  ${String(e.toFixed(3)).padStart(10)}  ${(sign + delta.toFixed(3)).padStart(8)}  ${(sign + pct.toFixed(1) + '%').padStart(6)}`
        );
    }
    console.log();
}

if (import.meta.main) {
    const args = process.argv.slice(2);
    if (args.includes('--check')) {
        cmdCheck();
    } else if (args.includes('--compare')) {
        const idx = args.indexOf('--compare');
        const expId = args[idx + 1];
        if (!expId) {
            console.error('Usage: bun experiment-tracker.ts --compare <exp-id>');
            process.exit(1);
        }
        cmdCompare(expId);
    } else {
        console.log('Usage:');
        console.log('  bun experiment-tracker.ts --check');
        console.log('  bun experiment-tracker.ts --compare <exp-id>');
        process.exit(1);
    }
}
