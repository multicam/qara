/**
 * miner-mode-lib — Mode and TDD metrics for the introspect-miner pipeline.
 *
 * Extracted from miner-trace-lib.ts to keep modules under 500 lines.
 * Pure functions, no I/O.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModeChangeEntry {
    timestamp: string;
    event: 'activated' | 'continuation' | 'deactivated';
    mode: string;
    reason?: string;
    iterations?: number;
    task_context?: string;
    session_id?: string;
    tokensUsed?: number;
    iteration?: number;
}

interface ModeSession {
    mode: string;
    started_at: string;
    ended_at: string | null;
    duration_ms: number;
    iterations: number;
    completed: boolean;
    deactivation_reason: string | null;
    session_id: string;
}

interface ModeMetrics {
    total_sessions: number;
    by_mode: Record<string, {
        count: number;
        avg_iterations: number;
        avg_duration_minutes: number;
        completion_rate: number;
    }>;
}

interface TDDEnforcementEntry {
    timestamp: string;
    file_path: string;
    phase: 'RED' | 'GREEN' | 'REFACTOR';
    is_test_file: boolean;
    decision: 'allow' | 'deny';
    reason: string;
    session_id: string;
}

interface TDDMetrics {
    total_entries: number;
    denied_in_red: number;
    phases: Record<string, number>;
    green_first_pass_rate: number;
    cycle_count: number;
}

// ---------------------------------------------------------------------------
// parseModeChanges
// ---------------------------------------------------------------------------

function parseModeChanges(entries: ModeChangeEntry[]): ModeSession[] {
    if (entries.length === 0) return [];

    const sorted = [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const sessions: ModeSession[] = [];
    let current: {
        mode: string;
        started_at: string;
        maxIteration: number;
        session_id: string;
    } | null = null;

    for (const entry of sorted) {
        if (entry.event === 'activated') {
            if (current) {
                sessions.push({
                    mode: current.mode,
                    started_at: current.started_at,
                    ended_at: null,
                    duration_ms: 0,
                    iterations: current.maxIteration,
                    completed: false,
                    deactivation_reason: null,
                    session_id: current.session_id,
                });
            }
            current = {
                mode: entry.mode,
                started_at: entry.timestamp,
                maxIteration: 0,
                session_id: entry.session_id || 'unknown',
            };
        } else if (entry.event === 'continuation' && current) {
            const iter = entry.iteration ?? 0;
            if (iter > current.maxIteration) current.maxIteration = iter;
        } else if (entry.event === 'deactivated') {
            const startedAt = current?.started_at ?? entry.timestamp;
            const iterations = entry.iterations ?? current?.maxIteration ?? 0;
            sessions.push({
                mode: entry.mode,
                started_at: startedAt,
                ended_at: entry.timestamp,
                duration_ms: new Date(entry.timestamp).getTime() - new Date(startedAt).getTime(),
                iterations,
                completed: entry.reason === 'complete',
                deactivation_reason: entry.reason || null,
                session_id: current?.session_id || entry.session_id || 'unknown',
            });
            current = null;
        }
    }

    if (current) {
        sessions.push({
            mode: current.mode,
            started_at: current.started_at,
            ended_at: null,
            duration_ms: 0,
            iterations: current.maxIteration,
            completed: false,
            deactivation_reason: null,
            session_id: current.session_id,
        });
    }

    return sessions;
}

// ---------------------------------------------------------------------------
// computeModeMetrics
// ---------------------------------------------------------------------------

function computeModeMetrics(sessions: ModeSession[]): ModeMetrics {
    if (sessions.length === 0) {
        return { total_sessions: 0, by_mode: {} };
    }

    const byMode = new Map<string, ModeSession[]>();
    for (const s of sessions) {
        const group = byMode.get(s.mode) ?? [];
        group.push(s);
        byMode.set(s.mode, group);
    }

    const result: ModeMetrics['by_mode'] = {};
    for (const [mode, group] of byMode) {
        const completedCount = group.filter(s => s.completed).length;
        const totalIter = group.reduce((sum, s) => sum + s.iterations, 0);
        const totalDur = group.reduce((sum, s) => sum + s.duration_ms, 0);
        result[mode] = {
            count: group.length,
            avg_iterations: group.length > 0 ? Math.round((totalIter / group.length) * 10) / 10 : 0,
            avg_duration_minutes: group.length > 0 ? Math.round((totalDur / group.length / 60000) * 10) / 10 : 0,
            completion_rate: group.length > 0 ? Math.round((completedCount / group.length) * 1000) / 10 : 0,
        };
    }

    return { total_sessions: sessions.length, by_mode: result };
}

// ---------------------------------------------------------------------------
// parseTDDEnforcement
// ---------------------------------------------------------------------------

function parseTDDEnforcement(entries: TDDEnforcementEntry[]): TDDEnforcementEntry[] {
    return [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

// ---------------------------------------------------------------------------
// computeTDDMetrics
// ---------------------------------------------------------------------------

function computeTDDMetrics(entries: TDDEnforcementEntry[]): TDDMetrics {
    if (entries.length === 0) {
        return { total_entries: 0, denied_in_red: 0, phases: {}, green_first_pass_rate: 0, cycle_count: 0 };
    }

    const sorted = parseTDDEnforcement(entries);

    let deniedInRed = 0;
    const phases: Record<string, number> = {};
    let greenSourceTotal = 0;
    let greenSourceAllowed = 0;

    for (const entry of sorted) {
        phases[entry.phase] = (phases[entry.phase] || 0) + 1;
        if (entry.phase === 'RED' && entry.decision === 'deny') deniedInRed++;
        if (entry.phase === 'GREEN' && !entry.is_test_file) {
            greenSourceTotal++;
            if (entry.decision === 'allow') greenSourceAllowed++;
        }
    }

    let cycleCount = 0;
    let lastPhase = '';
    let seenGreenAfterRed = false;

    for (const entry of sorted) {
        if (entry.phase === 'RED' && lastPhase !== 'RED') {
            seenGreenAfterRed = false;
        } else if (entry.phase === 'GREEN' && lastPhase === 'RED') {
            seenGreenAfterRed = true;
        } else if (entry.phase === 'REFACTOR' && seenGreenAfterRed) {
            cycleCount++;
            seenGreenAfterRed = false;
        }
        lastPhase = entry.phase;
    }

    return {
        total_entries: sorted.length,
        denied_in_red: deniedInRed,
        phases,
        green_first_pass_rate: greenSourceTotal > 0
            ? Math.round((greenSourceAllowed / greenSourceTotal) * 1000) / 10
            : 0,
        cycle_count: cycleCount,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    parseModeChanges,
    computeModeMetrics,
    parseTDDEnforcement,
    computeTDDMetrics,
    type ModeChangeEntry,
    type ModeSession,
    type ModeMetrics,
    type TDDEnforcementEntry,
    type TDDMetrics,
};
