/**
 * miner-lib — Types and utility functions for the introspect-miner.
 * Extracted from introspect-miner.ts to keep each module under 500 lines.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Path constants (inline to avoid import side-effects during testing)
// ---------------------------------------------------------------------------
const HOME = process.env.HOME || require('os').homedir();
const PAI_DIR = process.env.PAI_DIR || join(HOME, '.claude');
const STATE_DIR = join(PAI_DIR, 'state');
const ARCHIVE_DIR = join(STATE_DIR, 'archive');
let PROJECT_DIR = join(PAI_DIR, 'projects', '-home-jean-marc-qara');

function setProjectDir(projectName: string): void {
    PROJECT_DIR = join(PAI_DIR, 'projects', projectName);
}
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
    // Phase 1 enrichment (optional for backward compat with pre-enrichment data)
    input_summary?: string;
    output_len?: number;
    error_detail?: string | null;
}

interface SessionCheckpoint {
    timestamp: string;
    session_id: string;
    stop_reason: string;
    summary: string;
    // Phase 1 enrichment (optional for backward compat)
    message_len?: number;
    has_code_blocks?: boolean;
    topic_hint?: string;
}

interface SecurityCheck {
    timestamp: string;
    operation: string;
    pattern_matched: string;
    risk: string;
    decision: string;
    session_id: string;
}

type TranscriptContentBlock = { type: string; text?: string; [key: string]: unknown };

interface TranscriptMessage {
    type: string;
    message?: { role: string; content: string | TranscriptContentBlock[] };
    timestamp: string;
    sessionId?: string;
    version?: string;
    userType?: string;
    isMeta?: boolean;
}

interface CheckpointEvent {
    timestamp: string;
    session_id: string;
    event_type: string;
    error_count?: number;
    [key: string]: unknown;
}

interface CheckpointEventSummary {
    total: number;
    by_type: Record<string, number>;
}

interface CorrectionCandidate {
    timestamp: string;
    session_id: string;
    user_message: string;
    preceding_assistant: string;
    pattern?: string;
    confidence?: 'high' | 'low';
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
    checkpoint_events: CheckpointEventSummary;
    git: {
        commits: number;
        branches: string[];
        commit_messages: string[];
    };
    cc_version: string | null;
    baseline: Baseline | null;
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
    // Phase 3 harness evolution fields (optional for backward compat)
    error_hotspots?: Array<{ tool: string; input_pattern: string; count: number; error_rate: number }>;
    session_profile_distribution?: Record<string, number>;
    // RTK savings (optional — only present when rtk is installed)
    rtk_savings?: { total_commands: number; tokens_saved: string; efficiency_pct: number };
}

interface ObservationFrontmatter {
    date: string;
    sessions: number;
    tools_total: number;
    errors_total: number;
    corrections: number;
    is_bootstrap?: boolean;
}

interface Baseline {
    days_available: number;
    avg_tools: number;
    avg_errors: number;
    avg_sessions: number;
    avg_corrections: number;
    delta_tools: number;
    delta_errors: number;
    delta_sessions: number;
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

function getNextDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC to avoid DST edge cases
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
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
    const current = new Date(startStr + 'T00:00:00Z');
    const end = new Date(endStr + 'T00:00:00Z');
    while (current <= end) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// ---------------------------------------------------------------------------
// Correction detection
// ---------------------------------------------------------------------------
const NEGATION_PATTERNS: Array<[RegExp, string]> = [
    [/^no[,.\s!]/i, 'negation-no'],
    [/^nope/i, 'negation-nope'],
    [/^wrong/i, 'negation-wrong'],
    [/^that'?s wrong/i, 'negation-thats-wrong'],
    [/^that'?s not/i, 'negation-thats-not'],
    [/^not that\b/i, 'negation-not-that'],
    [/^not what i/i, 'negation-not-what-i'],
    [/^stop/i, 'negation-stop'],
    [/^don'?t/i, 'negation-dont'],
    [/^wait[,.\s!]/i, 'negation-wait'],
    [/^hold on/i, 'negation-hold-on'],
    [/^undo/i, 'negation-undo'],
    [/^go back/i, 'negation-go-back'],
    [/^start over/i, 'negation-start-over'],
    [/^try again/i, 'negation-try-again'],
    [/^revert/i, 'negation-revert'],
];

const REDIRECTION_PATTERNS: Array<[RegExp, string]> = [
    [/^actually[,\s]/i, 'redirect-actually'],
    [/^instead[,\s]/i, 'redirect-instead'],
    [/\bi meant\b/i, 'redirect-i-meant'],
    [/\bi wanted\b/i, 'redirect-i-wanted'],
    [/\bi said\b/i, 'redirect-i-said'],
    [/\bi asked\b/i, 'redirect-i-asked'],
    [/\bthe other\b/i, 'redirect-the-other'],
];

const FRUSTRATION_PATTERNS: Array<[RegExp, string]> = [
    [/\b(fuck|shit|damn|crap|wtf|ffs)\b/i, 'frustration'],
];

const ALL_CORRECTION_PATTERNS = [
    ...NEGATION_PATTERNS,
    ...REDIRECTION_PATTERNS,
    ...FRUSTRATION_PATTERNS,
];

/** Returns the pattern name if the text matches a known correction pattern, otherwise null. */
function detectCorrectionPattern(text: string): string | null {
    if (!text || text.length > 200 || text.length < 2) return null;
    if (text.startsWith('<') || text.startsWith('/')) return null;
    for (const [regex, name] of ALL_CORRECTION_PATTERNS) {
        if (regex.test(text)) return name;
    }
    return null;
}

/** Backward-compatible boolean check used by external callers. */
function isCorrection(text: string): boolean {
    return detectCorrectionPattern(text) !== null;
}

// Contextual heuristic: imperative verbs that commonly open short redirect messages
const IMPERATIVE_VERBS = /^(use|try|change|make|do|run|add|remove|delete|move|put|fix|update|set|check)\b/i;
// Negation words that signal disagreement mid-message
const NEGATION_WORDS = /\b(not|don't|doesn't|isn't|won't|can't|shouldn't|instead|rather|actually|but)\b/i;

/**
 * Returns true if the assistant message looks like it contained a code block or a file path —
 * i.e. the context in which a short follow-up is likely to be a redirect.
 */
function assistantHadCodeOrPath(assistantSnippet: string): boolean {
    return assistantSnippet.includes('```') || /[/\\][a-zA-Z0-9._-]/.test(assistantSnippet);
}

// ---------------------------------------------------------------------------
// Log collection with archive fallback
// ---------------------------------------------------------------------------
function collectToolUsage(targetDate: string): ToolUsageEntry[] {
    const current = readJsonlFile<ToolUsageEntry>(join(STATE_DIR, 'tool-usage.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    const archived = readArchivedJsonl<ToolUsageEntry>('tool-usage', targetDate);
    return [...current, ...archived];
}

function collectCheckpoints(targetDate: string): SessionCheckpoint[] {
    const current = readJsonlFile<SessionCheckpoint>(join(STATE_DIR, 'session-checkpoints.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    const archived = readArchivedJsonl<SessionCheckpoint>('session-checkpoints', targetDate);
    return [...current, ...archived];
}

function collectSecurity(targetDate: string): SecurityCheck[] {
    const current = readJsonlFile<SecurityCheck>(join(STATE_DIR, 'security-checks.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    const archived = readArchivedJsonl<SecurityCheck>('security-checks', targetDate);
    return filterTestNoise([...current, ...archived]);
}

function collectCheckpointEvents(targetDate: string): CheckpointEventSummary {
    const entries = readJsonlFile<CheckpointEvent>(join(STATE_DIR, 'checkpoint-events.jsonl'))
        .filter(e => isTimestampOnDate(e.timestamp, targetDate));
    const by_type: Record<string, number> = {};
    for (const e of entries) {
        by_type[e.event_type] = (by_type[e.event_type] || 0) + 1;
    }
    return { total: entries.length, by_type };
}

// Filter security test noise: >3 BLOCKED entries in the same second = test vectors
function filterTestNoise(entries: SecurityCheck[]): SecurityCheck[] {
    const bySecond = new Map<string, SecurityCheck[]>();
    for (const e of entries) {
        const sec = e.timestamp.slice(0, 19);
        const group = bySecond.get(sec) || [];
        group.push(e);
        bySecond.set(sec, group);
    }
    return [...bySecond.values()]
        .filter(group => group.filter(e => e.decision === 'BLOCKED').length <= 3)
        .flat();
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
                const nextDay = getNextDay(targetDate);
                return modDate === targetDate || modDate === nextDay;
            } catch { return false; }
        });
}

function extractCorrections(transcripts: string[], targetDate: string): CorrectionCandidate[] {
    const candidates: CorrectionCandidate[] = [];

    for (const filepath of transcripts) {
        const messages = readJsonlFile<TranscriptMessage>(filepath);
        let lastAssistant = '';

        for (const msg of messages) {
            // Track the most recent assistant message (store enough to detect code blocks / paths)
            if (msg.type === 'assistant' && msg.message?.content) {
                const raw = msg.message.content;
                const text = typeof raw === 'string' ? raw
                    : Array.isArray(raw) ? raw.filter(b => b.type === 'text').map(b => b.text ?? '').join(' ').trim()
                    : '';
                // Keep 500 chars so code-block fences (```) are reliably captured
                lastAssistant = text.slice(0, 500);
            }

            if (msg.type === 'user' && msg.userType === 'external' && !msg.isMeta) {
                const content = typeof msg.message?.content === 'string'
                    ? msg.message.content : '';
                if (!content || !isTimestampOnDate(msg.timestamp, targetDate)) continue;

                // --- Pass 1: high-confidence regex patterns ---
                const patternName = detectCorrectionPattern(content);
                if (patternName) {
                    candidates.push({
                        timestamp: msg.timestamp,
                        session_id: msg.sessionId || 'unknown',
                        user_message: content.slice(0, 200),
                        preceding_assistant: lastAssistant.slice(0, 200),
                        pattern: patternName,
                        confidence: 'high',
                    });
                    continue; // already captured — skip contextual pass for this message
                }

                // --- Pass 2: contextual redirect heuristic (low confidence) ---
                // Only fires when the assistant just produced code or a file path
                if (assistantHadCodeOrPath(lastAssistant)) {
                    const words = content.trim().split(/\s+/);
                    if (words.length < 30) {
                        const hasQuestion = content.includes('?');
                        const hasImperative = IMPERATIVE_VERBS.test(content.trimStart());
                        const hasNegationWord = NEGATION_WORDS.test(content);
                        if (hasQuestion || hasImperative || hasNegationWord) {
                            candidates.push({
                                timestamp: msg.timestamp,
                                session_id: msg.sessionId || 'unknown',
                                user_message: content.slice(0, 200),
                                preceding_assistant: lastAssistant.slice(0, 200),
                                pattern: 'contextual-redirect',
                                confidence: 'low',
                            });
                        }
                    }
                }
            }
        }
    }

    return candidates;
}

function extractCCVersion(transcripts: string[]): string | null {
    for (const filepath of [...transcripts].reverse()) {
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
            `cd "${QARA_DIR}" && git log --all --since="${targetDate}T00:00:00+11:00" --until="${targetDate}T23:59:59+11:00" --format="%h %s|||%D" 2>/dev/null`,
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
// Session detection via time-gap heuristic
// ---------------------------------------------------------------------------
const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes

function countSessionsByTimeGap(checkpoints: SessionCheckpoint[]): number {
    if (checkpoints.length === 0) return 0;
    const sorted = [...checkpoints].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let sessions = 1;
    for (let i = 1; i < sorted.length; i++) {
        const gap = new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime();
        if (gap > SESSION_GAP_MS) sessions++;
    }
    return sessions;
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
// Baseline computation from prior observation files
// ---------------------------------------------------------------------------
function parseObservationFrontmatter(filepath: string): ObservationFrontmatter | null {
    if (!existsSync(filepath)) return null;
    const content = readFileSync(filepath, 'utf-8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm: Record<string, unknown> = {};
    for (const line of fmMatch[1].split('\n')) {
        const [key, ...rest] = line.split(':');
        if (key && rest.length > 0) {
            const val = rest.join(':').trim().replace(/^"(.*)"$/, '$1');
            fm[key.trim()] = isNaN(Number(val)) ? val : Number(val);
        }
    }
    return fm as unknown as ObservationFrontmatter;
}

function computeBaseline(targetDate: string, lookbackDays: number = 7): Baseline | null {
    const obsDir = join(INTROSPECTION_DIR, 'observations');
    if (!existsSync(obsDir)) return null;

    const entries: ObservationFrontmatter[] = [];
    const d = new Date(targetDate + 'T00:00:00Z');
    for (let i = 1; i <= lookbackDays; i++) {
        const prev = new Date(d);
        prev.setDate(prev.getDate() - i);
        const dateStr = prev.toISOString().slice(0, 10);
        const fm = parseObservationFrontmatter(join(obsDir, `${dateStr}.md`));
        if (fm && !fm.is_bootstrap) entries.push(fm);
    }

    if (entries.length === 0) return null;

    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    return {
        days_available: entries.length,
        avg_tools: Math.round(avg(entries.map(e => e.tools_total))),
        avg_errors: Math.round(avg(entries.map(e => e.errors_total)) * 10) / 10,
        avg_sessions: Math.round(avg(entries.map(e => e.sessions)) * 10) / 10,
        avg_corrections: Math.round(avg(entries.map(e => e.corrections)) * 10) / 10,
        delta_tools: 0, // Filled by caller with today's actual
        delta_errors: 0,
        delta_sessions: 0,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export {
    // Constants
    STATE_DIR,
    ARCHIVE_DIR,
    PROJECT_DIR,
    setProjectDir,
    QARA_DIR,
    INTROSPECTION_DIR,
    SESSION_GAP_MS,
    // JSONL parsing
    readJsonlFile,
    readArchivedJsonl,
    // Date helpers
    getSydneyDate,
    isTimestampOnDate,
    isTimestampInRange,
    getDateRange,
    // Correction detection
    isCorrection,
    detectCorrectionPattern,
    assistantHadCodeOrPath,
    IMPERATIVE_VERBS,
    NEGATION_WORDS,
    // Log collection
    collectToolUsage,
    collectCheckpoints,
    collectSecurity,
    collectCheckpointEvents,
    // Transcript mining
    findTranscriptsForDate,
    extractCorrections,
    extractCCVersion,
    // Git
    getGitActivity,
    // Session detection
    countSessionsByTimeGap,
    // Anomaly detection
    detectAnomalies,
    // Baseline
    parseObservationFrontmatter,
    computeBaseline,
    // Types
    type ToolUsageEntry,
    type SessionCheckpoint,
    type SecurityCheck,
    type TranscriptMessage,
    type CorrectionCandidate,
    type CheckpointEvent,
    type CheckpointEventSummary,
    type DailyReport,
    type WeeklyReport,
    type MonthlyReport,
    type ObservationFrontmatter,
    type Baseline,
};
