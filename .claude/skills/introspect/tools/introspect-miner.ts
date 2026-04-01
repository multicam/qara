#!/usr/bin/env bun
/**
 * introspect-miner — Deterministic log parser for Qara's introspection pipeline.
 *
 * Reads JSONL session logs, computes aggregates, detects anomalies,
 * and outputs structured JSON for skill workflows to interpret.
 *
 * Usage:
 *   bun introspect-miner.ts --mode daily  [--date YYYY-MM-DD]
 *   bun introspect-miner.ts --mode weekly [--date-range YYYY-MM-DD:YYYY-MM-DD]
 *   bun introspect-miner.ts --mode monthly
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

import {
    // Constants
    INTROSPECTION_DIR,
    PROJECT_DIR,
    // JSONL / dates
    readJsonlFile,
    getSydneyDate,
    getDateRange,
    // Collection
    collectToolUsage,
    collectCheckpoints,
    collectSecurity,
    // Transcript mining
    findTranscriptsForDate,
    extractCorrections,
    extractCCVersion,
    // Analysis
    getGitActivity,
    countSessionsByTimeGap,
    detectAnomalies,
    computeBaseline,
    // Re-export types for consumers
    type ToolUsageEntry,
    type SessionCheckpoint,
    type TranscriptMessage,
    type CorrectionCandidate,
    type DailyReport as DailyReportBase,
    type WeeklyReport,
    type MonthlyReport,
} from './miner-lib';

import {
    buildSessionTraces,
    detectRecoveryPatterns,
    detectRepeatedFailures,
    computeSessionProfile,
    type SessionTrace,
    type RecoveryPattern,
    type RepeatedFailure,
    type SessionProfile,
} from './miner-trace-lib';

// Extend the base DailyReport with trace-lib fields
type DailyReport = DailyReportBase & {
    session_traces: SessionTrace[];
    recovery_patterns: RecoveryPattern[];
    repeated_failures: RepeatedFailure[];
    session_profiles: SessionProfile[];
};

// ---------------------------------------------------------------------------
// Mode: Daily
// ---------------------------------------------------------------------------
function runDaily(targetDate: string): DailyReport {
    // Tool usage
    const tools = collectToolUsage(targetDate);
    const byTool: Record<string, { count: number; errors: number; error_rate: number }> = {};
    for (const entry of tools) {
        if (!byTool[entry.tool]) byTool[entry.tool] = { count: 0, errors: 0, error_rate: 0 };
        byTool[entry.tool].count++;
        if (entry.error) byTool[entry.tool].errors++;
    }
    for (const data of Object.values(byTool)) {
        data.error_rate = data.count > 0 ? data.errors / data.count : 0;
    }
    const totalErrors = tools.filter(t => t.error).length;
    const overallErrorRate = tools.length > 0 ? totalErrors / tools.length : 0;
    const anomalies = detectAnomalies(byTool, overallErrorRate);

    // Sessions (time-gap heuristic: >5 min gap = new session)
    const checkpoints = collectCheckpoints(targetDate);
    const sessionCount = countSessionsByTimeGap(checkpoints);
    const uniqueSessions = Array.from({ length: sessionCount }, (_, i) => `session-${i + 1}`);
    const stopReasons: Record<string, number> = {};
    for (const cp of checkpoints) {
        stopReasons[cp.stop_reason] = (stopReasons[cp.stop_reason] || 0) + 1;
    }

    // Security
    const security = collectSecurity(targetDate);
    const byDecision: Record<string, number> = {};
    const riskValues = new Set<string>();
    for (const sc of security) {
        byDecision[sc.decision] = (byDecision[sc.decision] || 0) + 1;
        if (sc.risk !== 'none') riskValues.add(sc.risk);
    }

    // Corrections from transcripts
    const transcripts = findTranscriptsForDate(targetDate);
    const corrections = extractCorrections(transcripts, targetDate);
    const ccVersion = extractCCVersion(transcripts);

    // Git
    const git = getGitActivity(targetDate);

    // Baseline comparison
    const baseline = computeBaseline(targetDate);
    if (baseline) {
        baseline.delta_tools = tools.length - baseline.avg_tools;
        baseline.delta_errors = totalErrors - baseline.avg_errors;
        baseline.delta_sessions = sessionCount - baseline.avg_sessions;
    }

    // Trace analysis
    const session_traces = buildSessionTraces(tools);
    const recovery_patterns = detectRecoveryPatterns(tools);
    const repeated_failures = detectRepeatedFailures(tools);
    const session_profiles = session_traces.map(trace => computeSessionProfile(trace));

    return {
        mode: 'daily',
        date: targetDate,
        generated_at: new Date().toISOString(),
        tool_usage: {
            total: tools.length,
            by_tool: byTool,
            overall_error_rate: overallErrorRate,
            anomalies,
        },
        sessions: {
            count: uniqueSessions.length,
            unique_sessions: uniqueSessions,
            stop_reasons: stopReasons,
        },
        security: {
            total: security.length,
            by_decision: byDecision,
            new_risks: [...riskValues],
        },
        corrections,
        git,
        cc_version: ccVersion,
        baseline,
        session_traces,
        recovery_patterns,
        repeated_failures,
        session_profiles,
    };
}

// ---------------------------------------------------------------------------
// Mode: Weekly
// ---------------------------------------------------------------------------
function runWeekly(start: string, end: string): WeeklyReport {
    const dates = getDateRange(start, end);
    const dailySummaries: WeeklyReport['daily_summaries'] = [];
    const aggregated: Record<string, { count: number; errors: number }> = {};
    const tagCounts: Record<string, number> = {};

    for (const date of dates) {
        const daily = runDaily(date);
        dailySummaries.push({
            date,
            tools_total: daily.tool_usage.total,
            errors_total: Object.values(daily.tool_usage.by_tool).reduce((s, t) => s + t.errors, 0),
            sessions: daily.sessions.count,
            corrections: daily.corrections.length,
        });
        for (const [tool, data] of Object.entries(daily.tool_usage.by_tool)) {
            if (!aggregated[tool]) aggregated[tool] = { count: 0, errors: 0 };
            aggregated[tool].count += data.count;
            aggregated[tool].errors += data.errors;
        }
        // Count existing observation tags if observation file exists
        const obsFile = join(INTROSPECTION_DIR, 'observations', `${date}.md`);
        if (existsSync(obsFile)) {
            const content = readFileSync(obsFile, 'utf-8');
            const tagRegex = /\[([a-z-]+)\]/g;
            let match;
            while ((match = tagRegex.exec(content)) !== null) {
                tagCounts[match[1]] = (tagCounts[match[1]] || 0) + 1;
            }
        }
    }

    const totalTools = Object.values(aggregated).reduce((s, t) => s + t.count, 0);
    const withPct: Record<string, { count: number; errors: number; pct: number }> = {};
    for (const [tool, data] of Object.entries(aggregated)) {
        withPct[tool] = { ...data, pct: totalTools > 0 ? data.count / totalTools : 0 };
    }

    return {
        mode: 'weekly',
        date_range: { start, end },
        generated_at: new Date().toISOString(),
        daily_summaries: dailySummaries,
        aggregated_tools: withPct,
        observation_tags: tagCounts,
    };
}

// ---------------------------------------------------------------------------
// Mode: Monthly
// ---------------------------------------------------------------------------
function runMonthly(): MonthlyReport {
    const versionHistory: Array<{ date: string; version: string }> = [];
    const seenVersions = new Set<string>();
    if (existsSync(PROJECT_DIR)) {
        const transcripts = readdirSync(PROJECT_DIR)
            .filter(f => f.endsWith('.jsonl'))
            .map(f => join(PROJECT_DIR, f))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
            .slice(0, 20);
        for (const filepath of transcripts) {
            const messages = readJsonlFile<TranscriptMessage>(filepath);
            for (const msg of messages) {
                if (msg.version && msg.timestamp) {
                    const date = getSydneyDate(new Date(msg.timestamp));
                    const key = `${date}-${msg.version}`;
                    if (!seenVersions.has(key)) {
                        seenVersions.add(key);
                        versionHistory.push({ date, version: msg.version });
                    }
                    break;
                }
            }
        }
    }
    versionHistory.sort((a, b) => a.date.localeCompare(b.date));

    const patternDir = join(INTROSPECTION_DIR, 'patterns');
    const patternSummaries: Record<string, number> = {};
    if (existsSync(patternDir)) {
        for (const file of readdirSync(patternDir).filter(f => f.endsWith('.md'))) {
            const content = readFileSync(join(patternDir, file), 'utf-8');
            const patternCount = (content.match(/^## /gm) || []).length;
            patternSummaries[file.replace('.md', '')] = patternCount;
        }
    }

    return {
        mode: 'monthly',
        generated_at: new Date().toISOString(),
        cc_version: versionHistory.length > 0 ? versionHistory[versionHistory.length - 1].version : null,
        cc_version_history: versionHistory,
        pattern_summaries: patternSummaries,
    };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
    const args = process.argv.slice(2);
    const modeIdx = args.indexOf('--mode');
    const mode = modeIdx >= 0 ? (args[modeIdx + 1] || 'daily') : 'daily';
    const today = getSydneyDate();

    let result: DailyReport | WeeklyReport | MonthlyReport;

    switch (mode) {
        case 'daily': {
            const dateIdx = args.indexOf('--date');
            const targetDate = (dateIdx >= 0 && args[dateIdx + 1]) ? args[dateIdx + 1] : today;
            result = runDaily(targetDate);
            break;
        }
        case 'weekly': {
            const rangeIdx = args.indexOf('--date-range');
            let start: string, end: string;
            if (rangeIdx >= 0 && args[rangeIdx + 1]) {
                [start, end] = args[rangeIdx + 1].split(':');
            } else {
                end = today;
                const d = new Date(today + 'T00:00:00Z');
                d.setDate(d.getDate() - 6);
                start = d.toISOString().slice(0, 10);
            }
            result = runWeekly(start, end);
            break;
        }
        case 'monthly': {
            result = runMonthly();
            break;
        }
        default:
            console.error(`Unknown mode: ${mode}. Use daily, weekly, or monthly.`);
            process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));
}

// Re-export everything from miner-lib for backward compatibility
export {
    isCorrection,
    isTimestampOnDate,
    isTimestampInRange,
    getSydneyDate,
    getDateRange,
    readJsonlFile,
    detectAnomalies,
    countSessionsByTimeGap,
    SESSION_GAP_MS,
    computeBaseline,
    parseObservationFrontmatter,
} from './miner-lib';

export {
    buildSessionTraces,
    detectRecoveryPatterns,
    detectRepeatedFailures,
    computeSessionProfile,
} from './miner-trace-lib';

export {
    runDaily,
    runWeekly,
    runMonthly,
    type DailyReport,
    type WeeklyReport,
    type MonthlyReport,
    type ToolUsageEntry,
    type SessionCheckpoint,
    type CorrectionCandidate,
    type SessionTrace,
    type RecoveryPattern,
    type RepeatedFailure,
    type SessionProfile,
};

// Run if executed directly
if (import.meta.main) {
    main();
}
