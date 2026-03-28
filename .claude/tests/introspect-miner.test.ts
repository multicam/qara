import { describe, test, expect } from 'bun:test';
import {
    isCorrection,
    isTimestampOnDate,
    isTimestampInRange,
    getSydneyDate,
    getDateRange,
    readJsonlFile,
    detectAnomalies,
    countSessionsByTimeGap,
} from '../skills/introspect/tools/introspect-miner';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ---------------------------------------------------------------------------
// isCorrection
// ---------------------------------------------------------------------------
describe('isCorrection', () => {
    test('detects negation patterns', () => {
        expect(isCorrection('no, not that')).toBe(true);
        expect(isCorrection('No!')).toBe(true);
        expect(isCorrection('nope, try again')).toBe(true);
        expect(isCorrection('wrong approach')).toBe(true);
        expect(isCorrection('stop doing that')).toBe(true);
        expect(isCorrection("that's not right")).toBe(true);
        expect(isCorrection("don't do that")).toBe(true);
    });

    test('detects redirection patterns', () => {
        expect(isCorrection('actually, use sonnet')).toBe(true);
        expect(isCorrection('instead, try this')).toBe(true);
        expect(isCorrection('I meant the other file')).toBe(true);
        expect(isCorrection('I said typescript not python')).toBe(true);
        expect(isCorrection("that's not what I asked")).toBe(true);
    });

    test('detects frustration patterns', () => {
        expect(isCorrection('fuck, not again')).toBe(true);
        expect(isCorrection('damn it')).toBe(true);
        expect(isCorrection('wtf is this')).toBe(true);
    });

    test('rejects non-corrections', () => {
        expect(isCorrection('yes, looks good')).toBe(false);
        expect(isCorrection('thanks!')).toBe(false);
        expect(isCorrection('can you refactor the auth module')).toBe(false);
        expect(isCorrection('the tests pass now')).toBe(false);
    });

    test('rejects system/meta messages', () => {
        expect(isCorrection('<local-command-stdout>no output</local-command-stdout>')).toBe(false);
        expect(isCorrection('/cc-upgrade-pai')).toBe(false);
    });

    test('rejects empty, too short, or too long messages', () => {
        expect(isCorrection('')).toBe(false);
        expect(isCorrection('n')).toBe(false);
        expect(isCorrection('no ' + 'x'.repeat(200))).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
describe('isTimestampOnDate', () => {
    test('matches UTC timestamp to Sydney date', () => {
        // 2026-03-28T01:00:00Z = 2026-03-28 12:00 AEDT (UTC+11)
        expect(isTimestampOnDate('2026-03-28T01:00:00.000Z', '2026-03-28')).toBe(true);
    });

    test('handles day boundary correctly', () => {
        // 2026-03-27T12:30:00Z = 2026-03-27 23:30 AEDT — still the 27th in Sydney
        expect(isTimestampOnDate('2026-03-27T12:30:00.000Z', '2026-03-27')).toBe(true);
        // 2026-03-27T13:30:00Z = 2026-03-28 00:30 AEDT — now the 28th in Sydney
        expect(isTimestampOnDate('2026-03-27T13:30:00.000Z', '2026-03-28')).toBe(true);
    });

    test('returns false for wrong date', () => {
        expect(isTimestampOnDate('2026-03-28T01:00:00.000Z', '2026-03-27')).toBe(false);
    });

    test('handles invalid timestamps', () => {
        expect(isTimestampOnDate('not-a-timestamp', '2026-03-28')).toBe(false);
    });
});

describe('isTimestampInRange', () => {
    test('inclusive range', () => {
        expect(isTimestampInRange('2026-03-25T05:00:00Z', '2026-03-22', '2026-03-28')).toBe(true);
        expect(isTimestampInRange('2026-03-22T05:00:00Z', '2026-03-22', '2026-03-28')).toBe(true);
        expect(isTimestampInRange('2026-03-28T05:00:00Z', '2026-03-22', '2026-03-28')).toBe(true);
    });

    test('outside range', () => {
        expect(isTimestampInRange('2026-03-21T05:00:00Z', '2026-03-22', '2026-03-28')).toBe(false);
    });
});

describe('getDateRange', () => {
    test('generates inclusive date array', () => {
        const range = getDateRange('2026-03-25', '2026-03-28');
        expect(range).toEqual(['2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28']);
    });

    test('single day range', () => {
        expect(getDateRange('2026-03-28', '2026-03-28')).toEqual(['2026-03-28']);
    });
});

describe('getSydneyDate', () => {
    test('returns YYYY-MM-DD format', () => {
        const result = getSydneyDate(new Date('2026-03-28T05:00:00Z'));
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

// ---------------------------------------------------------------------------
// readJsonlFile
// ---------------------------------------------------------------------------
describe('readJsonlFile', () => {
    const tmpDir = join(tmpdir(), 'introspect-miner-test-' + Date.now());

    test('reads valid JSONL', () => {
        mkdirSync(tmpDir, { recursive: true });
        const filepath = join(tmpDir, 'test.jsonl');
        writeFileSync(filepath, [
            '{"tool":"Read","error":false,"timestamp":"2026-03-28T01:00:00Z"}',
            '{"tool":"Bash","error":true,"timestamp":"2026-03-28T02:00:00Z"}',
            '', // empty line
        ].join('\n'));

        const entries = readJsonlFile<{ tool: string; error: boolean }>(filepath);
        expect(entries).toHaveLength(2);
        expect(entries[0].tool).toBe('Read');
        expect(entries[1].error).toBe(true);
    });

    test('skips malformed lines', () => {
        const filepath = join(tmpDir, 'bad.jsonl');
        writeFileSync(filepath, '{"valid":true}\nnot json\n{"also":true}\n');
        const entries = readJsonlFile<{ valid?: boolean }>(filepath);
        expect(entries).toHaveLength(2);
    });

    test('returns empty for missing file', () => {
        expect(readJsonlFile('/nonexistent/file.jsonl')).toEqual([]);
    });

    // Cleanup
    test('cleanup', () => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
});

// ---------------------------------------------------------------------------
// detectAnomalies
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// countSessionsByTimeGap
// ---------------------------------------------------------------------------
describe('countSessionsByTimeGap', () => {
    test('returns 0 for empty checkpoints', () => {
        expect(countSessionsByTimeGap([])).toBe(0);
    });

    test('single checkpoint = 1 session', () => {
        expect(countSessionsByTimeGap([
            { timestamp: '2026-03-28T01:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
        ])).toBe(1);
    });

    test('checkpoints within 5 min = 1 session', () => {
        expect(countSessionsByTimeGap([
            { timestamp: '2026-03-28T01:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T01:02:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T01:04:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
        ])).toBe(1);
    });

    test('gap > 5 min splits into 2 sessions', () => {
        expect(countSessionsByTimeGap([
            { timestamp: '2026-03-28T01:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T01:02:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T02:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
        ])).toBe(2);
    });

    test('multiple gaps = multiple sessions', () => {
        expect(countSessionsByTimeGap([
            { timestamp: '2026-03-28T01:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T03:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T06:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T06:01:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
        ])).toBe(3);
    });

    test('handles unsorted input', () => {
        expect(countSessionsByTimeGap([
            { timestamp: '2026-03-28T06:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T01:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
            { timestamp: '2026-03-28T03:00:00Z', session_id: 'x', stop_reason: 'end', summary: '' },
        ])).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// detectAnomalies
// ---------------------------------------------------------------------------
describe('detectAnomalies', () => {
    test('flags high error rate tools', () => {
        const toolData = {
            Bash: { count: 20, errors: 5, error_rate: 0.25 },
            Read: { count: 100, errors: 0, error_rate: 0 },
        };
        const anomalies = detectAnomalies(toolData, 0.04);
        expect(anomalies.length).toBeGreaterThanOrEqual(1);
        expect(anomalies.some(a => a.includes('Bash'))).toBe(true);
        expect(anomalies.some(a => a.includes('Overall error rate'))).toBe(true);
    });

    test('no anomalies for clean data', () => {
        const toolData = {
            Read: { count: 100, errors: 0, error_rate: 0 },
            Bash: { count: 50, errors: 1, error_rate: 0.02 },
        };
        const anomalies = detectAnomalies(toolData, 0.006);
        expect(anomalies).toEqual([]);
    });
});
