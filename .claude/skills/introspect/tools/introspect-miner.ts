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
import { join, basename } from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Path constants (inline to avoid import side-effects during testing)
// ---------------------------------------------------------------------------
const HOME = process.env.HOME || require('os').homedir();
const PAI_DIR = process.env.PAI_DIR || join(HOME, '.claude');
const STATE_DIR = join(PAI_DIR, 'state');
const ARCHIVE_DIR = join(STATE_DIR, 'archive');
const PROJECT_DIR = join(PAI_DIR, 'projects', '-home-jean-marc-qara');
const QARA_DIR = join(HOME, 'qara');
const INTROSPECTION_DIR = join(QARA_DIR, 'thoughts', 'shared', 'introspection');
const TIMEZONE = 'Australia/Sydney';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ToolUsageEntry {
    timestamp: string;
    tool: string;
    error: boolean;
    session_id: string;
}

interface SessionCheckpoint {
    timestamp: string;
    session_id: string;
    stop_reason: string;
    summary: string;
}

interface SecurityCheck {
    timestamp: string;
    operation: string;
    pattern_matched: string;
    risk: string;
    decision: string;
    session_id: string;
}

interface TranscriptMessage {
    type: string;
    message?: { role: string; content: string };
    timestamp: string;
    sessionId?: string;
    version?: string;
    userType?: string;
    isMeta?: boolean;
}

interface CorrectionCandidate {
    timestamp: string;
    session_id: string;
    user_message: string;
    preceding_assistant: string;
}

interface DailyReport {
    mode: 'daily';
    date: string;
    generated_at: string;
    tool_usage: {
        total: number;
        by_tool: Record<string, { count: number; errors: number; error_rate: number }>;
        overall_error_rate: number;
        anomalies: string[];
    };
    sessions: {
        count: number;
        unique_sessions: string[];
        stop_reasons: Record<string, number>;
    };
    security: {
        total: number;
        by_decision: Record<string, number>;
        new_risks: string[];
    };
    corrections: CorrectionCandidate[];
    git: {
        commits: number;
        branches: string[];
        commit_messages: string[];
    };
    cc_version: string | null;
}

interface WeeklyReport {
    mode: 'weekly';
    date_range: { start: string; end: string };
    generated_at: string;
    daily_summaries: Array<{ date: string; tools_total: number; errors_total: number; sessions: number; corrections: number }>;
    aggregated_tools: Record<string, { count: number; errors: number; pct: number }>;
    observation_tags: Record<string, number>;
}

interface MonthlyReport {
    mode: 'monthly';
    generated_at: string;
    cc_version: string | null;
    cc_version_history: Array<{ date: string; version: string }>;
    pattern_summaries: Record<string, number>;
}

// ---------------------------------------------------------------------------
// JSONL parsing
// ---------------------------------------------------------------------------
function readJsonlFile<T>(filepath: string): T[] {
    if (!existsSync(filepath)) return [];
    const content = readFileSync(filepath, 'utf-8');
    const entries: T[] = [];
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            entries.push(JSON.parse(trimmed) as T);
        } catch { /* skip malformed lines */ }
    }
    return entries;
}

function readArchivedJsonl<T>(pattern: string, dateStr: string): T[] {
    if (!existsSync(ARCHIVE_DIR)) return [];
    const archiveFile = join(ARCHIVE_DIR, `${pattern}_${dateStr}.jsonl.gz`);
    if (!existsSync(archiveFile)) return [];
    try {
        const content = execSync(`gzip -dc "${archiveFile}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        const entries: T[] = [];
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try { entries.push(JSON.parse(trimmed) as T); } catch { /* skip */ }
        }
        return entries;
    } catch { return []; }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function getSydneyDate(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(date); // YYYY-MM-DD
}

function isTimestampOnDate(timestamp: string, targetDate: string): boolean {
    try {
        const d = new Date(timestamp);
        return getSydneyDate(d) === targetDate;
    } catch { return false; }
}

function isTimestampInRange(timestamp: string, start: string, end: string): boolean {
    try {
        const dateStr = getSydneyDate(new Date(timestamp));
        return dateStr >= start && dateStr <= end;
    } catch { return false; }
}

function getDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    const current = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    while (current <= end) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// ---------------------------------------------------------------------------
// Correction detection
// ---------------------------------------------------------------------------
const NEGATION_PATTERNS = [
    /^no[,.\s!]/i,
    /^nope/i,
    /^wrong/i,
    /^stop/i,
    /^that'?s not/i,
    /^not what i/i,
    /^don'?t/i,
];

const REDIRECTION_PATTERNS = [
    /^actually[,\s]/i,
    /^instead[,\s]/i,
    /\bi meant\b/i,
    /\bi said\b/i,
    /\bi asked\b/i,
];

const FRUSTRATION_PATTERNS = [
    /\b(fuck|shit|damn|crap|wtf|ffs)\b/i,
];

function isCorrection(text: string): boolean {
    if (!text || text.length > 200 || text.length < 2) return false;
    // Skip system/meta messages
    if (text.startsWith('<') || text.startsWith('/')) return false;
    return [...NEGATION_PATTERNS, ...REDIRECTION_PATTERNS, ...FRUSTRATION_PATTERNS].some(p => p.test(text));
}

// ---------------------------------------------------------------------------
// Log collection with archive fallback
// ---------------------------------------------------------------------------
function collectToolUsage(targetDate: string): ToolUsageEntry[] {
    // Try current log file first
    const current = readJsonlFile<ToolUsageEntry>(join(STATE_DIR, 'tool-usage.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    if (current.length > 0) return current;
    // Fall back to archive
    return readArchivedJsonl<ToolUsageEntry>('tool-usage', targetDate);
}

function collectCheckpoints(targetDate: string): SessionCheckpoint[] {
    const current = readJsonlFile<SessionCheckpoint>(join(STATE_DIR, 'session-checkpoints.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    if (current.length > 0) return current;
    return readArchivedJsonl<SessionCheckpoint>('session-checkpoints', targetDate);
}

function collectSecurity(targetDate: string): SecurityCheck[] {
    const current = readJsonlFile<SecurityCheck>(join(STATE_DIR, 'security-checks.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    if (current.length > 0) return current;
    return readArchivedJsonl<SecurityCheck>('security-checks', targetDate);
}

// ---------------------------------------------------------------------------
// Session transcript mining
// ---------------------------------------------------------------------------
function findTranscriptsForDate(targetDate: string): string[] {
    if (!existsSync(PROJECT_DIR)) return [];
    return readdirSync(PROJECT_DIR)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => join(PROJECT_DIR, f))
        .filter(f => {
            try {
                const stat = statSync(f);
                const modDate = getSydneyDate(stat.mtime);
                // Include if modified on or after the target date (session may span days)
                return modDate >= targetDate;
            } catch { return false; }
        });
}

function extractCorrections(transcripts: string[], targetDate: string): CorrectionCandidate[] {
    const candidates: CorrectionCandidate[] = [];
    for (const filepath of transcripts) {
        const messages = readJsonlFile<TranscriptMessage>(filepath);
        let lastAssistant = '';
        for (const msg of messages) {
            if (msg.type === 'assistant' && msg.message?.content) {
                const content = typeof msg.message.content === 'string'
                    ? msg.message.content
                    : JSON.stringify(msg.message.content);
                lastAssistant = content.slice(0, 200);
            }
            if (msg.type === 'user' && msg.userType === 'external' && !msg.isMeta) {
                const content = typeof msg.message?.content === 'string'
                    ? msg.message.content : '';
                if (isTimestampOnDate(msg.timestamp, targetDate) && isCorrection(content)) {
                    candidates.push({
                        timestamp: msg.timestamp,
                        session_id: msg.sessionId || 'unknown',
                        user_message: content.slice(0, 200),
                        preceding_assistant: lastAssistant,
                    });
                }
            }
        }
    }
    return candidates;
}

function extractCCVersion(transcripts: string[]): string | null {
    // Read most recent transcript, look for version field
    for (const filepath of transcripts.reverse()) {
        const messages = readJsonlFile<TranscriptMessage>(filepath);
        for (const msg of messages) {
            if (msg.version) return msg.version;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Git activity
// ---------------------------------------------------------------------------
function getGitActivity(targetDate: string): { commits: number; branches: string[]; commit_messages: string[] } {
    try {
        const log = execSync(
            `cd "${QARA_DIR}" && git log --all --since="${targetDate}" --until="${targetDate}T23:59:59" --format="%h %s|||%D" 2>/dev/null`,
            { encoding: 'utf-8' }
        ).trim();
        if (!log) return { commits: 0, branches: [], commit_messages: [] };
        const lines = log.split('\n').filter(Boolean);
        const messages = lines.map(l => l.split('|||')[0].trim());
        const branches = new Set<string>();
        for (const line of lines) {
            const refs = line.split('|||')[1]?.trim();
            if (refs) {
                for (const ref of refs.split(',')) {
                    const clean = ref.trim().replace(/^HEAD -> /, '').replace(/^origin\//, '');
                    if (clean && !clean.includes('HEAD')) branches.add(clean);
                }
            }
        }
        return { commits: lines.length, branches: [...branches], commit_messages: messages };
    } catch { return { commits: 0, branches: [], commit_messages: [] }; }
}

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------
function detectAnomalies(
    toolData: Record<string, { count: number; errors: number; error_rate: number }>,
    overallErrorRate: number,
): string[] {
    const anomalies: string[] = [];
    for (const [tool, data] of Object.entries(toolData)) {
        if (data.errors > 0 && data.error_rate > 0.05) {
            anomalies.push(`${tool} error rate ${(data.error_rate * 100).toFixed(1)}% (${data.errors}/${data.count})`);
        }
    }
    if (overallErrorRate > 0.03) {
        anomalies.push(`Overall error rate ${(overallErrorRate * 100).toFixed(1)}% exceeds 3% threshold`);
    }
    return anomalies;
}

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

    // Sessions
    const checkpoints = collectCheckpoints(targetDate);
    const uniqueSessions = [...new Set(checkpoints.map(c => c.session_id))];
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
    // Scan recent transcripts for CC version history
    const versionHistory: Array<{ date: string; version: string }> = [];
    const seenVersions = new Set<string>();
    if (existsSync(PROJECT_DIR)) {
        const transcripts = readdirSync(PROJECT_DIR)
            .filter(f => f.endsWith('.jsonl'))
            .map(f => join(PROJECT_DIR, f))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
            .slice(0, 20); // Last 20 transcripts
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
                    break; // One per transcript is enough
                }
            }
        }
    }
    versionHistory.sort((a, b) => a.date.localeCompare(b.date));

    // Count pattern entries
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
    const mode = args[args.indexOf('--mode') + 1] || 'daily';
    const today = getSydneyDate();

    let result: DailyReport | WeeklyReport | MonthlyReport;

    switch (mode) {
        case 'daily': {
            const dateIdx = args.indexOf('--date');
            const targetDate = dateIdx >= 0 ? args[dateIdx + 1] : today;
            result = runDaily(targetDate);
            break;
        }
        case 'weekly': {
            const rangeIdx = args.indexOf('--date-range');
            let start: string, end: string;
            if (rangeIdx >= 0) {
                [start, end] = args[rangeIdx + 1].split(':');
            } else {
                end = today;
                const d = new Date(today + 'T00:00:00');
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

// Export for testing
export {
    isCorrection,
    isTimestampOnDate,
    isTimestampInRange,
    getSydneyDate,
    getDateRange,
    readJsonlFile,
    detectAnomalies,
    runDaily,
    runWeekly,
    runMonthly,
    // Types
    type ToolUsageEntry,
    type SessionCheckpoint,
    type SecurityCheck,
    type CorrectionCandidate,
    type DailyReport,
    type WeeklyReport,
    type MonthlyReport,
};

// Run if executed directly
if (import.meta.main) {
    main();
}
