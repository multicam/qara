#!/usr/bin/env bun
/**
 * introspect-miner — Deterministic log parser for Qara's introspection pipeline.
 *
 * Reads JSONL session logs, computes aggregates, detects anomalies,
 * and outputs structured JSON for skill workflows to interpret.
 *
 * Usage:
 *   bun introspect-miner.ts --mode daily  [--date YYYY-MM-DD] [--project NAME]
 *   bun introspect-miner.ts --mode weekly [--date-range YYYY-MM-DD:YYYY-MM-DD] [--project NAME]
 *   bun introspect-miner.ts --mode monthly [--project NAME]
 */

import { readFileSync, readdirSync, statSync, existsSync, lstatSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

import {
    // Constants
    STATE_DIR,
    INTROSPECTION_DIR,
    DEFAULT_DEFAULT_PROJECT_DIR,
    // JSONL / dates
    readJsonlFile,
    getSydneyDate,
    getDateRange,
    isTimestampOnDate,
    // Collection
    collectToolUsage,
    collectCheckpoints,
    collectSecurity,
    collectCheckpointEvents,
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
    computeHintCompliance,
    readActiveHintsFromFile,
    type HintCompliance,
} from './miner-hint-lib';

import {
    buildSessionTraces,
    detectRecoveryPatterns,
    detectRepeatedFailures,
    computeSessionProfile,
    parseModeChanges,
    computeModeMetrics,
    parseTDDEnforcement,
    computeTDDMetrics,
    type SessionTrace,
    type RecoveryPattern,
    type RepeatedFailure,
    type SessionProfile,
    type ModeChangeEntry,
    type ModeSession,
    type ModeMetrics,
    type TDDEnforcementEntry,
    type TDDMetrics,
} from './miner-trace-lib';

// Infrastructure drift detection — compares filesystem to known baselines
interface InfrastructureDrift {
    hooks: { expected: number; actual: number; drifted: boolean };
    libs: { expected: number; actual: number; drifted: boolean };
    agents: { expected: number; actual: number; drifted: boolean };
    skills: { expected: number; actual: number; drifted: boolean };
    drifted: boolean;
}

function detectInfrastructureDrift(paiDir: string): InfrastructureDrift {
    // Known baselines (updated when Qara evolves — this IS the canary)
    const EXPECTED = { hooks: 14, libs: 13, agents: 13, skills: 50 };

    const hooksDir = join(paiDir, 'hooks');
    const libDir = join(hooksDir, 'lib');
    const agentsDir = join(paiDir, 'agents');
    const skillsDir = join(paiDir, 'skills');

    const isTestFile = (f: string) => f.includes('.test.') || f.includes('-test-helper.');

    const countFiles = (dir: string, ext: string[], excludeTests = false) => {
        if (!existsSync(dir)) return 0;
        return readdirSync(dir).filter(f => {
            if (excludeTests && isTestFile(f)) return false;
            const full = join(dir, f);
            if (!lstatSync(full).isFile() && !lstatSync(full).isSymbolicLink()) return false;
            return ext.some(e => f.endsWith(e));
        }).length;
    };

    const countDirs = (dir: string) => {
        if (!existsSync(dir)) return 0;
        return readdirSync(dir).filter(f => {
            const full = join(dir, f);
            try { return statSync(full).isDirectory(); } catch { return false; }
        }).length;
    };

    const actualHooks = countFiles(hooksDir, ['.ts', '.sh'], true);
    const actualLibs = countFiles(libDir, ['.ts', '.json'], true);
    const actualAgents = countFiles(agentsDir, ['.md']);
    const actualSkills = countDirs(skillsDir);

    const hooks = { expected: EXPECTED.hooks, actual: actualHooks, drifted: actualHooks !== EXPECTED.hooks };
    const libs = { expected: EXPECTED.libs, actual: actualLibs, drifted: actualLibs !== EXPECTED.libs };
    const agents = { expected: EXPECTED.agents, actual: actualAgents, drifted: actualAgents !== EXPECTED.agents };
    const skills = { expected: EXPECTED.skills, actual: actualSkills, drifted: actualSkills !== EXPECTED.skills };

    return { hooks, libs, agents, skills, drifted: hooks.drifted || libs.drifted || agents.drifted || skills.drifted };
}

// Extend the base DailyReport with trace-lib and hint-lib fields
type DailyReport = DailyReportBase & {
    session_traces: SessionTrace[];
    recovery_patterns: RecoveryPattern[];
    repeated_failures: RepeatedFailure[];
    session_profiles: SessionProfile[];
    hint_compliance: HintCompliance;
    hints_loaded: string[];
    mode_sessions: ModeSession[];
    mode_metrics: ModeMetrics;
    tdd_metrics: TDDMetrics;
    infrastructure_drift: InfrastructureDrift;
};

// ---------------------------------------------------------------------------
// Mode: Daily
// ---------------------------------------------------------------------------
function runDaily(targetDate: string, projectDir?: string): DailyReport {
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
    const transcripts = findTranscriptsForDate(targetDate, projectDir);
    const corrections = extractCorrections(transcripts, targetDate);
    const ccVersion = extractCCVersion(transcripts);

    // Checkpoint events
    const checkpoint_events = collectCheckpointEvents(targetDate);

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

    // Hint compliance
    const hint_compliance = computeHintCompliance(tools);
    const hints_loaded = readActiveHintsFromFile(INTROSPECTION_DIR);

    // Mode sessions (from mode-changes.jsonl)
    const allModeEntries = readJsonlFile<ModeChangeEntry>(join(STATE_DIR, 'mode-changes.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    const mode_sessions = parseModeChanges(allModeEntries);
    const mode_metrics = computeModeMetrics(mode_sessions);

    // TDD enforcement (from tdd-enforcement.jsonl)
    const allTDDEntries = readJsonlFile<TDDEnforcementEntry>(join(STATE_DIR, 'tdd-enforcement.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    const tdd_metrics = computeTDDMetrics(allTDDEntries);

    // Infrastructure drift (compares filesystem to hardcoded baselines)
    const paiDir = join(STATE_DIR, '..');  // STATE_DIR is ~/.claude/state, PAI_DIR is ~/.claude
    const infrastructure_drift = detectInfrastructureDrift(paiDir);

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
        checkpoint_events,
        git,
        cc_version: ccVersion,
        baseline,
        session_traces,
        recovery_patterns,
        repeated_failures,
        session_profiles,
        hint_compliance,
        hints_loaded,
        mode_sessions,
        mode_metrics,
        tdd_metrics,
        infrastructure_drift,
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
    const today = getSydneyDate();
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // --- CC version history ---
    const versionHistory: Array<{ date: string; version: string }> = [];
    const seenVersions = new Set<string>();
    if (existsSync(DEFAULT_PROJECT_DIR)) {
        const transcripts = readdirSync(DEFAULT_PROJECT_DIR)
            .filter(f => f.endsWith('.jsonl'))
            .map(f => join(DEFAULT_PROJECT_DIR, f))
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

    // --- Pattern summaries ---
    const patternDir = join(INTROSPECTION_DIR, 'patterns');
    const patternSummaries: Record<string, number> = {};
    if (existsSync(patternDir)) {
        for (const file of readdirSync(patternDir).filter(f => f.endsWith('.md'))) {
            const content = readFileSync(join(patternDir, file), 'utf-8');
            const patternCount = (content.match(/^## /gm) || []).length;
            patternSummaries[file.replace('.md', '')] = patternCount;
        }
    }

    // --- Error hotspots: aggregate errors by tool + first 50 chars of input_summary ---
    // Read tool-usage.jsonl and filter to the current month
    const allToolUsage = readJsonlFile<ToolUsageEntry>(join(STATE_DIR, 'tool-usage.jsonl'))
        .filter(e => {
            try {
                return getSydneyDate(new Date(e.timestamp)).slice(0, 7) === currentMonth;
            } catch { return false; }
        });

    type HotspotAccum = { count: number; errors: number };
    const hotspotMap = new Map<string, HotspotAccum>();
    for (const entry of allToolUsage) {
        const inputPrefix = (entry.input_summary || '').slice(0, 50);
        const key = `${entry.tool}\x00${inputPrefix}`;
        const existing = hotspotMap.get(key);
        if (existing) {
            existing.count++;
            if (entry.error) existing.errors++;
        } else {
            hotspotMap.set(key, { count: 1, errors: entry.error ? 1 : 0 });
        }
    }

    const error_hotspots: MonthlyReport['error_hotspots'] = [];
    for (const [key, { count, errors }] of hotspotMap) {
        if (count >= 3 && errors > 0) {
            const sepIdx = key.indexOf('\x00');
            const tool = key.slice(0, sepIdx);
            const input_pattern = key.slice(sepIdx + 1);
            error_hotspots.push({
                tool,
                input_pattern,
                count,
                error_rate: errors / count,
            });
        }
    }
    // Sort by error_rate descending, then count descending
    error_hotspots.sort((a, b) => b.error_rate - a.error_rate || b.count - a.count);

    // --- Session profile distribution: run daily reports for last 7 days ---
    const session_profile_distribution: Record<string, number> = {};
    const d = new Date(today + 'T00:00:00Z');
    for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(d);
        dayDate.setDate(dayDate.getDate() - i);
        const dateStr = dayDate.toISOString().slice(0, 10);
        try {
            const daily = runDaily(dateStr);
            for (const profile of daily.session_profiles) {
                const activity = profile.dominant_activity;
                session_profile_distribution[activity] = (session_profile_distribution[activity] || 0) + 1;
            }
        } catch { /* skip days that fail */ }
    }

    // --- RTK savings (if rtk is installed) ---
    let rtk_savings: MonthlyReport['rtk_savings'] = undefined;
    try {
        const rtkOutput = execSync('rtk gain 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
        const cmdMatch = rtkOutput.match(/Total commands:\s+(\d+)/);
        const savedMatch = rtkOutput.match(/Tokens saved:\s+([\d.]+[KMB]?)\s+\(([\d.]+)%\)/);
        if (cmdMatch && savedMatch) {
            rtk_savings = {
                total_commands: parseInt(cmdMatch[1]),
                tokens_saved: savedMatch[1],
                efficiency_pct: parseFloat(savedMatch[2]),
            };
        }
    } catch { /* rtk not installed or failed — skip */ }

    return {
        mode: 'monthly',
        generated_at: new Date().toISOString(),
        cc_version: versionHistory.length > 0 ? versionHistory[versionHistory.length - 1].version : null,
        cc_version_history: versionHistory,
        pattern_summaries: patternSummaries,
        error_hotspots,
        session_profile_distribution,
        rtk_savings,
    };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
    const args = process.argv.slice(2);
    const modeIdx = args.indexOf('--mode');
    const mode = modeIdx >= 0 ? (args[modeIdx + 1] || 'daily') : 'daily';
    const projectIdx = args.indexOf('--project');
    const projectDir = projectIdx >= 0 && args[projectIdx + 1]
        ? join(STATE_DIR, '..', 'projects', args[projectIdx + 1])
        : undefined;
    const today = getSydneyDate();

    let result: DailyReport | WeeklyReport | MonthlyReport;

    switch (mode) {
        case 'daily': {
            const dateIdx = args.indexOf('--date');
            const targetDate = (dateIdx >= 0 && args[dateIdx + 1]) ? args[dateIdx + 1] : today;
            result = runDaily(targetDate, projectDir);
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
    parseModeChanges,
    computeModeMetrics,
    parseTDDEnforcement,
    computeTDDMetrics,
} from './miner-trace-lib';

export {
    computeHintCompliance,
    readActiveHints,
    readActiveHintsFromFile,
    type HintCompliance,
} from './miner-hint-lib';

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
    type ModeChangeEntry,
    type ModeSession,
    type ModeMetrics,
    type TDDEnforcementEntry,
    type TDDMetrics,
};

// Run if executed directly
if (import.meta.main) {
    main();
}
