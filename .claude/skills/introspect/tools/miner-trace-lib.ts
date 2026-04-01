/**
 * miner-trace-lib — Advanced trace analysis for the introspect-miner pipeline.
 *
 * Provides four pure analysis functions over ToolUsageEntry arrays:
 * - buildSessionTraces: Groups entries into per-session summaries
 * - detectRecoveryPatterns: Finds error→success recovery sequences
 * - detectRepeatedFailures: Identifies recurring failures on same inputs
 * - computeSessionProfile: Classifies a session's dominant activity
 *
 * All functions are pure (no I/O, no filesystem access).
 * Imports SESSION_GAP_MS and type ToolUsageEntry from ./miner-lib.
 */

import { SESSION_GAP_MS, type ToolUsageEntry } from './miner-lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionTrace {
    session_id: string;
    start: string;
    end: string;
    duration_ms: number;
    tool_count: number;
    error_count: number;
    tools_used: string[];
    input_summaries: string[];
}

interface RecoveryPattern {
    error_tool: string;
    error_input: string;
    error_detail: string;
    recovery_tool: string;
    recovery_input: string;
    gap: number;
    timestamp: string;
}

interface RepeatedFailure {
    tool: string;
    input_pattern: string;
    count: number;
    first_seen: string;
    last_seen: string;
    error_details: string[];
}

interface SessionProfile {
    session_id: string;
    duration_minutes: number;
    tool_diversity: number;
    error_rate: number;
    dominant_activity: 'reading' | 'writing' | 'testing' | 'searching' | 'mixed';
}

// ---------------------------------------------------------------------------
// Related tool pairs for recovery detection
// ---------------------------------------------------------------------------

// Each pair: [error_tool, recovery_tool]
const RECOVERY_TOOL_PAIRS: Array<[string, string]> = [
    ['Bash', 'Read'],
    ['Read', 'Bash'],
    ['Write', 'Edit'],
    ['Edit', 'Write'],
    ['Grep', 'Glob'],
    ['Glob', 'Grep'],
];

const MAX_INTERVENING_CALLS = 3;
const RECOVERY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SHARED_PREFIX_MIN_LEN = 20;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a file path from an input_summary string.
 * Handles "file: /path" directly and also "command: ... /path" by scanning
 * for an absolute path token in the command string.
 */
function extractFilePath(summary: string): string | null {
    const fileMatch = summary.match(/^file:\s+(\S+)/);
    if (fileMatch) return fileMatch[1];
    // For command summaries, look for an absolute path token
    const cmdMatch = summary.match(/^command:\s+.+?(\s)(\/\S+)/);
    if (cmdMatch) return cmdMatch[2];
    return null;
}

/**
 * Returns true if strings a and b share a common prefix of at least minLen
 * characters.
 */
function hasSharedPrefix(a: string, b: string, minLen: number): boolean {
    const maxLen = Math.min(a.length, b.length);
    if (maxLen < minLen) return false;
    for (let i = 0; i < maxLen; i++) {
        if (a[i] !== b[i]) return i >= minLen;
    }
    return maxLen >= minLen;
}

/**
 * Returns true if two input_summary strings share a target (file path or
 * pattern string of 20+ chars).
 *
 * Cross-type matching is supported: a Bash "command: cat /tmp/foo.ts" can
 * match a Read "file: /tmp/foo.ts" via shared file path extraction.
 */
function hasSimilarTarget(a: string, b: string): boolean {
    if (!a || !b) return false;

    // Try extracting file paths from both (handles cross-type: file: vs command:)
    const aPath = extractFilePath(a);
    const bPath = extractFilePath(b);
    if (aPath && bPath) return aPath === bPath;

    // Pattern matching: "pattern: X" vs "pattern: X"
    const patternRe = /^pattern:\s+(.+)$/;
    const aPattern = a.match(patternRe)?.[1]?.trim();
    const bPattern = b.match(patternRe)?.[1]?.trim();
    if (aPattern && bPattern) {
        if (aPattern === bPattern) return true;
        return hasSharedPrefix(aPattern, bPattern, SHARED_PREFIX_MIN_LEN);
    }

    // General command substring matching: extract content after "command: "
    const cmdRe = /^command:\s+(.+)$/;
    const aCmd = (a.match(cmdRe)?.[1] ?? a).trim();
    const bCmd = (b.match(cmdRe)?.[1] ?? b).trim();

    return hasSharedPrefix(aCmd, bCmd, SHARED_PREFIX_MIN_LEN);
}

/**
 * Check whether two entries form a valid recovery pair (related tools,
 * similar target, within time window).
 */
function isRecoveryPair(errorEntry: ToolUsageEntry, candidateEntry: ToolUsageEntry): boolean {
    const isPair = RECOVERY_TOOL_PAIRS.some(
        ([et, rt]) => et === errorEntry.tool && rt === candidateEntry.tool,
    );
    if (!isPair) return false;

    const gapMs = new Date(candidateEntry.timestamp).getTime()
        - new Date(errorEntry.timestamp).getTime();
    if (gapMs > RECOVERY_WINDOW_MS) return false;

    return hasSimilarTarget(errorEntry.input_summary ?? '', candidateEntry.input_summary ?? '');
}

/**
 * Checks whether two error entries have "similar" input_summaries:
 * - Same file path, OR
 * - Shared prefix of 20+ characters in the full input_summary string
 */
function hasSimilarFailureInput(a: string, b: string): boolean {
    if (!a || !b) return false;

    const aFile = extractFilePath(a);
    const bFile = extractFilePath(b);
    if (aFile && bFile) return aFile === bFile;

    // Full string prefix comparison (includes "command: " prefix)
    return hasSharedPrefix(a, b, SHARED_PREFIX_MIN_LEN);
}

// ---------------------------------------------------------------------------
// buildSessionTraces
// ---------------------------------------------------------------------------

/**
 * Groups ToolUsageEntry records into per-session SessionTrace summaries.
 *
 * Entries with session_id "unknown" are grouped using a 5-minute time-gap
 * heuristic (imported SESSION_GAP_MS). All other session_ids are grouped
 * directly.
 *
 * Returns [] for empty input or when no entries have input_summary (backward
 * compatibility with pre-enrichment data).
 */
function buildSessionTraces(entries: ToolUsageEntry[]): SessionTrace[] {
    if (entries.length === 0) return [];

    // Backward compat: skip if none have input_summary
    const hasEnrichment = entries.some(e => e.input_summary !== undefined);
    if (!hasEnrichment) return [];

    // Separate "unknown" entries from known-session entries
    const knownEntries = entries.filter(e => e.session_id !== 'unknown');
    const unknownEntries = entries.filter(e => e.session_id === 'unknown');

    // Group known entries by session_id
    const sessionMap = new Map<string, ToolUsageEntry[]>();
    for (const entry of knownEntries) {
        const group = sessionMap.get(entry.session_id) ?? [];
        group.push(entry);
        sessionMap.set(entry.session_id, group);
    }

    // Group unknown entries by time-gap heuristic
    if (unknownEntries.length > 0) {
        const sorted = [...unknownEntries].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        let groupIndex = 0;
        let lastTime = new Date(sorted[0].timestamp).getTime();

        for (const entry of sorted) {
            const currentTime = new Date(entry.timestamp).getTime();
            if (currentTime - lastTime > SESSION_GAP_MS) {
                groupIndex++;
            }
            const syntheticId = `unknown-${groupIndex}`;
            const group = sessionMap.get(syntheticId) ?? [];
            group.push(entry);
            sessionMap.set(syntheticId, group);
            lastTime = currentTime;
        }
    }

    const traces: SessionTrace[] = [];

    for (const [sessionId, sessionEntries] of sessionMap) {
        const sorted = [...sessionEntries].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        const start = sorted[0].timestamp;
        const end = sorted[sorted.length - 1].timestamp;
        const duration_ms = new Date(end).getTime() - new Date(start).getTime();

        let errorCount = 0;
        const seenTools: string[] = [];
        const seenToolSet = new Set<string>();
        const inputSummaries: string[] = [];

        for (const entry of sorted) {
            if (entry.error) errorCount++;
            if (!seenToolSet.has(entry.tool)) {
                seenTools.push(entry.tool);
                seenToolSet.add(entry.tool);
            }
            if (entry.input_summary) {
                inputSummaries.push(entry.input_summary);
            }
        }

        traces.push({
            session_id: sessionId,
            start,
            end,
            duration_ms,
            tool_count: sorted.length,
            error_count: errorCount,
            tools_used: seenTools,
            input_summaries: inputSummaries,
        });
    }

    // Sort by start time for deterministic output
    traces.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return traces;
}

// ---------------------------------------------------------------------------
// detectRecoveryPatterns
// ---------------------------------------------------------------------------

/**
 * Scans entry sequences for error→recovery patterns:
 * - Error on tool A followed by success on related tool B
 * - Within 3 intervening calls and 5-minute window
 * - With similar target (file path or command substring)
 *
 * Returns [] when no errors exist or entries lack input_summary.
 */
function detectRecoveryPatterns(entries: ToolUsageEntry[]): RecoveryPattern[] {
    if (entries.length === 0) return [];

    const hasEnrichment = entries.some(e => e.input_summary !== undefined);
    if (!hasEnrichment) return [];

    const hasErrors = entries.some(e => e.error);
    if (!hasErrors) return [];

    const sorted = [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const patterns: RecoveryPattern[] = [];

    for (let i = 0; i < sorted.length; i++) {
        const errorEntry = sorted[i];
        if (!errorEntry.error || !errorEntry.input_summary) continue;

        // Look ahead up to MAX_INTERVENING_CALLS + 1 positions
        const lookAheadLimit = Math.min(i + MAX_INTERVENING_CALLS + 1, sorted.length - 1);
        for (let j = i + 1; j <= lookAheadLimit; j++) {
            const candidate = sorted[j];
            if (candidate.error) continue;
            if (!candidate.input_summary) continue;

            if (isRecoveryPair(errorEntry, candidate)) {
                patterns.push({
                    error_tool: errorEntry.tool,
                    error_input: errorEntry.input_summary,
                    error_detail: errorEntry.error_detail ?? '',
                    recovery_tool: candidate.tool,
                    recovery_input: candidate.input_summary,
                    gap: new Date(candidate.timestamp).getTime() - new Date(errorEntry.timestamp).getTime(),
                    timestamp: errorEntry.timestamp,
                });
                break; // Only record first recovery per error
            }
        }
    }

    return patterns;
}

// ---------------------------------------------------------------------------
// detectRepeatedFailures
// ---------------------------------------------------------------------------

/**
 * Identifies tools that repeatedly fail with similar inputs (3+ occurrences).
 *
 * "Similar" means: same file path, OR shared prefix of 20+ characters in the
 * full input_summary string.
 *
 * Returns [] for clean sessions or pre-enrichment data.
 */
function detectRepeatedFailures(entries: ToolUsageEntry[]): RepeatedFailure[] {
    if (entries.length === 0) return [];

    const errorEntries = entries.filter(e => e.error && e.input_summary);
    if (errorEntries.length === 0) return [];

    // Cluster errors by tool + similar input
    interface Cluster {
        tool: string;
        representative: string;
        timestamps: string[];
        errorDetails: string[];
    }

    const clusters: Cluster[] = [];

    for (const entry of errorEntries) {
        const summary = entry.input_summary!;
        let matched = false;

        for (const cluster of clusters) {
            if (cluster.tool === entry.tool && hasSimilarFailureInput(cluster.representative, summary)) {
                cluster.timestamps.push(entry.timestamp);
                cluster.errorDetails.push(entry.error_detail ?? '');
                matched = true;
                break;
            }
        }

        if (!matched) {
            clusters.push({
                tool: entry.tool,
                representative: summary,
                timestamps: [entry.timestamp],
                errorDetails: [entry.error_detail ?? ''],
            });
        }
    }

    const failures: RepeatedFailure[] = [];

    for (const cluster of clusters) {
        if (cluster.timestamps.length < 3) continue;

        const sorted = [...cluster.timestamps].sort();
        failures.push({
            tool: cluster.tool,
            input_pattern: cluster.representative,
            count: cluster.timestamps.length,
            first_seen: sorted[0],
            last_seen: sorted[sorted.length - 1],
            error_details: cluster.errorDetails,
        });
    }

    return failures;
}

// ---------------------------------------------------------------------------
// computeSessionProfile
// ---------------------------------------------------------------------------

const WRITE_TOOLS = new Set(['Write', 'Edit']);
const READ_FAMILY_TOOLS = new Set(['Read', 'Grep', 'Glob']);

/**
 * Classifies a session's dominant activity based on tool usage and
 * input_summary contents.
 *
 * Classification logic (first match wins, ordered from most-specific to least):
 * 1. >30% of summaries are "command: ...test..." (Bash testing) → 'testing'
 * 2. >30% of summaries are "pattern: ..." (Grep/Glob searching) → 'searching'
 * 3. >50% read-type summaries (file: + pattern:) AND only Read-family tools (no Write/Edit) → 'reading'
 * 4. >50% file summaries AND only Write tools (no Read-family) → 'writing'
 * 5. else → 'mixed'
 *
 * Note: Since SessionTrace only records unique tools in tools_used (not per-call
 * counts), activity proportions are inferred from input_summaries content:
 * - "pattern: ..." uniquely identifies Grep/Glob calls
 * - "command: ...test..." identifies Bash testing
 * - "file: ..." is ambiguous (Read or Write) — tool presence disambiguates
 * - Mixed Read+Write presence falls through to 'mixed' unless testing/searching dominates
 */
function computeSessionProfile(trace: SessionTrace): SessionProfile {
    const total = trace.tool_count;
    const toolDiversity = total === 0 ? 0 : trace.tools_used.length / total;
    const errorRate = total === 0 ? 0 : trace.error_count / total;
    const durationMinutes = trace.duration_ms / 60000;

    let dominantActivity: SessionProfile['dominant_activity'] = 'mixed';

    if (total > 0) {
        const summaries = trace.input_summaries;
        const summaryCount = summaries.length;

        if (summaryCount > 0) {
            const hasWriteTools = trace.tools_used.some(t => WRITE_TOOLS.has(t));
            const hasReadFamilyTools = trace.tools_used.some(t => READ_FAMILY_TOOLS.has(t));
            const hasBash = trace.tools_used.includes('Bash');

            const patternCount = summaries.filter(s => s.startsWith('pattern:')).length;
            const fileSummaryCount = summaries.filter(s => s.startsWith('file:')).length;
            const testCommandCount = summaries.filter(
                s => s.startsWith('command:') && s.includes('test'),
            ).length;

            const testingRatio = testCommandCount / summaryCount;
            const searchingRatio = patternCount / summaryCount;
            // Read-type: file: + pattern: summaries (both are read-family outputs)
            const readTypeRatio = (fileSummaryCount + patternCount) / summaryCount;
            const fileRatio = fileSummaryCount / summaryCount;

            // Testing: Bash with >30% test commands (most specific — checked first)
            if (hasBash && testingRatio > 0.3) {
                dominantActivity = 'testing';
            // Searching: >30% pattern summaries (Grep/Glob specific — checked second)
            } else if (searchingRatio > 0.3) {
                dominantActivity = 'searching';
            // Reading: >50% read-type summaries AND no Write/Edit tools (pure read session)
            } else if (hasReadFamilyTools && !hasWriteTools && readTypeRatio > 0.5) {
                dominantActivity = 'reading';
            // Writing: >50% file summaries AND only Write tools, no Read-family tools
            } else if (hasWriteTools && !hasReadFamilyTools && fileRatio > 0.5) {
                dominantActivity = 'writing';
            }
            // else: mixed (includes sessions with both read and write tools)
        }
    }

    return {
        session_id: trace.session_id,
        duration_minutes: durationMinutes,
        tool_diversity: toolDiversity,
        error_rate: errorRate,
        dominant_activity: dominantActivity,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    buildSessionTraces,
    detectRecoveryPatterns,
    detectRepeatedFailures,
    computeSessionProfile,
    type SessionTrace,
    type RecoveryPattern,
    type RepeatedFailure,
    type SessionProfile,
};
