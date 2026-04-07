/**
 * miner-sequence-lib — Skill auto-learning from tool usage sequences.
 *
 * Extracts repeated tool-call patterns across sessions to propose new
 * skills and keyword routes. Inspired by Meta's "Five Core Questions"
 * pattern for tribal knowledge mapping.
 *
 * Pure functions — no I/O.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolSequence {
    tools: string[];
    count: number;
    session_ids: string[];
    unique_days: number;
}

interface SequenceEntry {
    timestamp: string;
    tool: string;
    error: boolean;
    session_id: string;
    input_summary?: string;
}

interface CheckpointEntry {
    topic_hint?: string;
    session_id: string;
    day: string;
}

export interface KeywordCandidate {
    keyword: string;
    occurrences: number;
    sessions: number;
    matched_existing_route: boolean;
}

/** Meta's Five Core Questions template for skill candidates */
export interface SkillCandidate {
    workflow: string;
    modifications: string[];
    failure_modes: string[];
    dependencies: string[];
    tribal_knowledge: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTION_TOOLS = new Set(["Write", "Edit", "MultiEdit", "Bash"]);
const MIN_SESSIONS = 2;
const MIN_OCCURRENCES = 3;
const SKILL_SCORE_THRESHOLD = 8;

// ─── extractToolSequences ───────────────────────────────────────────────────

/**
 * Extract repeated tool-call sequences from usage entries.
 *
 * Uses a sliding window within each session, groups by tool-name sequence,
 * and returns sequences appearing in 2+ sessions with 3+ total occurrences.
 */
export function extractToolSequences(
    entries: SequenceEntry[],
    minLen = 3,
    maxLen = 8,
): ToolSequence[] {
    if (entries.length === 0) return [];

    // Group entries by session, sort by timestamp within each
    const bySession = new Map<string, SequenceEntry[]>();
    for (const e of entries) {
        const sid = e.session_id || "unknown";
        if (!bySession.has(sid)) bySession.set(sid, []);
        bySession.get(sid)!.push(e);
    }
    for (const arr of bySession.values()) {
        arr.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    // Sliding window: extract all subsequences of length minLen..maxLen
    const seqMap = new Map<string, { count: number; sessions: Set<string>; days: Set<string> }>();

    for (const [sessionId, sessionEntries] of bySession) {
        const tools = sessionEntries.map(e => e.tool);
        const day = sessionEntries[0]?.timestamp.slice(0, 10) || "";

        for (let len = minLen; len <= Math.min(maxLen, tools.length); len++) {
            const seen = new Set<string>(); // deduplicate within same session
            for (let i = 0; i <= tools.length - len; i++) {
                const key = tools.slice(i, i + len).join(",");
                if (seen.has(key)) continue;
                seen.add(key);

                if (!seqMap.has(key)) seqMap.set(key, { count: 0, sessions: new Set(), days: new Set() });
                const entry = seqMap.get(key)!;
                entry.count++;
                entry.sessions.add(sessionId);
                if (day) entry.days.add(day);
            }
        }
    }

    // Filter: 2+ sessions, 3+ total occurrences
    const results: ToolSequence[] = [];
    for (const [key, data] of seqMap) {
        if (data.sessions.size >= MIN_SESSIONS && data.count >= MIN_OCCURRENCES) {
            results.push({
                tools: key.split(","),
                count: data.count,
                session_ids: [...data.sessions],
                unique_days: data.days.size,
            });
        }
    }

    return results.sort((a, b) => b.count - a.count);
}

// ─── extractKeywordCandidates ───────────────────────────────────────────────

/**
 * Detect recurring topic_hints that don't match existing keyword routes.
 *
 * Scans checkpoint entries for repeated topic hints, filters out
 * those that match existing route names.
 */
export function extractKeywordCandidates(
    checkpoints: CheckpointEntry[],
    existingRoutes: string[],
): KeywordCandidate[] {
    if (checkpoints.length === 0) return [];

    const routeSet = new Set(existingRoutes.map(r => r.toLowerCase()));

    // Count topic_hint occurrences
    const hintMap = new Map<string, { count: number; sessions: Set<string> }>();
    for (const cp of checkpoints) {
        const hint = cp.topic_hint?.trim().toLowerCase();
        if (!hint) continue;
        if (!hintMap.has(hint)) hintMap.set(hint, { count: 0, sessions: new Set() });
        const entry = hintMap.get(hint)!;
        entry.count++;
        entry.sessions.add(cp.session_id);
    }

    const results: KeywordCandidate[] = [];
    for (const [keyword, data] of hintMap) {
        // Check if any existing route name appears in this keyword
        const matchesRoute = [...routeSet].some(r => keyword.includes(r));
        if (matchesRoute) continue;

        results.push({
            keyword,
            occurrences: data.count,
            sessions: data.sessions.size,
            matched_existing_route: false,
        });
    }

    return results.sort((a, b) => b.occurrences - a.occurrences);
}

// ─── scoreSequenceAsSkill ───────────────────────────────────────────────────

/**
 * Score a tool sequence's viability as a proposed skill.
 *
 * Formula: unique_days * 2 + count * 0.5 + (has_action_tool ? 3 : 0)
 * Threshold: >= 8 to propose as a skill candidate.
 */
export function scoreSequenceAsSkill(seq: ToolSequence): number {
    const hasAction = seq.tools.some(t => ACTION_TOOLS.has(t));
    return seq.unique_days * 2 + seq.count * 0.5 + (hasAction ? 3 : 0);
}

export { SKILL_SCORE_THRESHOLD };
