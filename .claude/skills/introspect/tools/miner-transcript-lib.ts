/**
 * miner-transcript-lib — Correction detection, security noise filtering, and
 * transcript mining functions extracted from miner-lib.ts.
 */
import { readdirSync, statSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

import {
    readJsonlFile,
    isTimestampOnDate,
    getSydneyDate,
    getDateRange,
    getNextDay,
    DEFAULT_PROJECT_DIR,
    type TranscriptMessage,
    type CorrectionCandidate,
    type SecurityCheck,
} from './miner-lib';

// ---------------------------------------------------------------------------
// Correction detection patterns
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

function detectCorrectionPattern(text: string): string | null {
    if (!text || text.length > 200 || text.length < 2) return null;
    if (text.startsWith('<') || text.startsWith('/')) return null;
    for (const [regex, name] of ALL_CORRECTION_PATTERNS) {
        if (regex.test(text)) return name;
    }
    return null;
}

function isCorrection(text: string): boolean {
    return detectCorrectionPattern(text) !== null;
}

const IMPERATIVE_VERBS = /^(use|try|change|make|do|run|add|remove|delete|move|put|fix|update|set|check)\b/i;
const NEGATION_WORDS = /\b(not|don't|doesn't|isn't|won't|can't|shouldn't|instead|rather|actually|but)\b/i;

function assistantHadAction(assistantSnippet: string): boolean {
    // Require the assistant to have performed an action (tool use indicators),
    // not just mentioned code or paths. Reduces false positives from informational responses.
    return /\b(Edit|Write|Bash|created|updated|modified|wrote|deleted|fixed)\b/.test(assistantSnippet)
        || assistantSnippet.includes('```');
}

// ---------------------------------------------------------------------------
// Security noise filtering
// ---------------------------------------------------------------------------

function filterTestNoise(entries: SecurityCheck[]): SecurityCheck[] {
    // Preferred: explicit source="test" flag emitted by the security hook when
    // QARA_TEST_RUN=1 (set by pre-tool-use-security.test.ts).
    // Fallback: legacy rows without a source field fall back to the old
    // ≤3-BLOCK/sec burst heuristic for backward compat.
    const [tagged, legacy] = [[] as SecurityCheck[], [] as SecurityCheck[]];
    for (const e of entries) {
        if (e.source === 'test' || e.source === 'live') tagged.push(e);
        else legacy.push(e);
    }

    const taggedLive = tagged.filter(e => e.source === 'live');

    const bySecond = new Map<string, SecurityCheck[]>();
    for (const e of legacy) {
        const sec = e.timestamp.slice(0, 19);
        const group = bySecond.get(sec) || [];
        group.push(e);
        bySecond.set(sec, group);
    }
    const legacyLive = [...bySecond.values()]
        .filter(group => group.filter(e => e.decision === 'BLOCKED').length <= 3)
        .flat();

    return [...taggedLive, ...legacyLive];
}

// ---------------------------------------------------------------------------
// Transcript discovery and mining
// ---------------------------------------------------------------------------

function findTranscriptsForDate(targetDate: string, projectDir: string = DEFAULT_PROJECT_DIR): string[] {
    if (!existsSync(projectDir)) return [];
    return readdirSync(projectDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => join(projectDir, f))
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
            if (msg.type === 'assistant' && msg.message?.content) {
                const raw = msg.message.content;
                const text = typeof raw === 'string' ? raw
                    : Array.isArray(raw) ? raw.filter(b => b.type === 'text').map(b => b.text ?? '').join(' ').trim()
                    : '';
                lastAssistant = text.slice(0, 500);
            }

            if (msg.type === 'user' && msg.userType === 'external' && !msg.isMeta) {
                const content = typeof msg.message?.content === 'string'
                    ? msg.message.content : '';
                if (!content || !isTimestampOnDate(msg.timestamp, targetDate)) continue;

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
                    continue;
                }

                if (content.length >= 10 && assistantHadAction(lastAssistant)) {
                    const words = content.trim().split(/\s+/);
                    if (words.length >= 3 && words.length < 30) {
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
    // Try transcripts first (most recent session's version field)
    for (const filepath of [...transcripts].reverse()) {
        const messages = readJsonlFile<TranscriptMessage>(filepath);
        for (const msg of messages) {
            if (msg.version) return msg.version;
        }
    }
    // Fallback: ask the CLI directly (handles upgrades since last session)
    try {
        const output = execSync('claude --version 2>/dev/null', { encoding: 'utf-8', timeout: 5000 }).trim();
        const match = output.match(/(\d+\.\d+\.\d+)/);
        if (match) return match[1];
    } catch { /* claude not in PATH or timed out */ }
    return null;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export {
    // Correction detection
    isCorrection,
    detectCorrectionPattern,
    assistantHadAction,
    IMPERATIVE_VERBS,
    NEGATION_WORDS,
    // Security
    filterTestNoise,
    // Transcripts
    findTranscriptsForDate,
    extractCorrections,
    extractCCVersion,
};
