import { describe, test, expect } from 'bun:test';
import { computeHintCompliance, readActiveHints } from '../skills/introspect/tools/miner-hint-lib';

// ---------------------------------------------------------------------------
// computeHintCompliance
// ---------------------------------------------------------------------------

describe('computeHintCompliance', () => {
    test('bash_pct: 35 Bash + 65 other → 35.0', () => {
        const entries = [
            ...Array(35).fill(null).map((_, i) => ({ tool: 'Bash', error: false, timestamp: `2026-04-01T10:${String(i).padStart(2, '0')}:00Z` })),
            ...Array(30).fill(null).map((_, i) => ({ tool: 'Read', error: false, timestamp: `2026-04-01T11:${String(i).padStart(2, '0')}:00Z` })),
            ...Array(20).fill(null).map((_, i) => ({ tool: 'Glob', error: false, timestamp: `2026-04-01T12:${String(i).padStart(2, '0')}:00Z` })),
            ...Array(15).fill(null).map((_, i) => ({ tool: 'Grep', error: false, timestamp: `2026-04-01T13:${String(i).padStart(2, '0')}:00Z` })),
        ];
        const result = computeHintCompliance(entries);
        expect(result.bash_pct).toBe(35.0);
    });

    test('agent_delegation_pct: 3 Agent out of 100 → 3.0', () => {
        const entries = [
            ...Array(3).fill(null).map((_, i) => ({ tool: 'Agent', error: false, timestamp: `2026-04-01T10:${String(i).padStart(2, '0')}:00Z` })),
            ...Array(97).fill(null).map((_, i) => ({ tool: 'Read', error: false, timestamp: `2026-04-01T11:${String(i).padStart(2, '0')}:00Z` })),
        ];
        const result = computeHintCompliance(entries);
        expect(result.agent_delegation_pct).toBe(3.0);
    });

    test('bash_retry_rate: consecutive error→Bash pairs', () => {
        // Sequence: Bash(err), Bash, Read, Bash(err), Bash
        // 2 retry pairs out of 4 Bash calls (excluding the one that's purely a follow-up)
        // But total Bash calls = 4, retry pairs = 2
        const entries = [
            { tool: 'Bash', error: true, timestamp: '2026-04-01T10:00:00Z' },
            { tool: 'Bash', error: false, timestamp: '2026-04-01T10:01:00Z' },
            { tool: 'Read', error: false, timestamp: '2026-04-01T10:02:00Z' },
            { tool: 'Bash', error: true, timestamp: '2026-04-01T10:03:00Z' },
            { tool: 'Bash', error: false, timestamp: '2026-04-01T10:04:00Z' },
        ];
        const result = computeHintCompliance(entries);
        // 2 retry pairs / 4 Bash calls = 0.5
        // (the non-error Bash calls that follow errors are the retries)
        expect(result.bash_retry_rate).toBeCloseTo(0.5, 1);
    });

    test('empty entries → zeroes', () => {
        const result = computeHintCompliance([]);
        expect(result.bash_pct).toBe(0);
        expect(result.agent_delegation_pct).toBe(0);
        expect(result.bash_retry_rate).toBe(0);
    });

    test('no Bash calls → bash_retry_rate is 0', () => {
        const entries = [
            { tool: 'Read', error: false, timestamp: '2026-04-01T10:00:00Z' },
            { tool: 'Glob', error: false, timestamp: '2026-04-01T10:01:00Z' },
        ];
        const result = computeHintCompliance(entries);
        expect(result.bash_pct).toBe(0);
        expect(result.bash_retry_rate).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// readActiveHints
// ---------------------------------------------------------------------------

describe('readActiveHints', () => {
    test('parses hints from session-hints.md', () => {
        const content = `# Session Hints

Auto-generated from confirmed introspection patterns.
Last updated: 2026-04-02

## Active Hints

- Agent delegation is at ~2% of tool calls. Consider delegating more.
- Bash dominates tool mix at ~35%. For file searches, prefer Glob/Grep.
- Recovery patterns show Bash→Bash retries are common.

## How This File Works

The weekly-synthesize workflow updates this file.`;

        const hints = readActiveHints(content);
        expect(hints).toHaveLength(3);
        expect(hints[0]).toContain('Agent delegation');
        expect(hints[1]).toContain('Bash dominates');
        expect(hints[2]).toContain('Recovery patterns');
    });

    test('empty file → empty array', () => {
        const hints = readActiveHints('');
        expect(hints).toHaveLength(0);
    });

    test('no Active Hints section → empty array', () => {
        const hints = readActiveHints('# Some other content\n\nNo hints here.');
        expect(hints).toHaveLength(0);
    });
});
