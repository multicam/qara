import { describe, test, expect } from 'bun:test';
import { filterTestNoise } from '../skills/introspect/tools/miner-transcript-lib';
import type { SecurityCheck } from '../skills/introspect/tools/miner-lib';

function mk(
    n: number,
    overrides: Partial<SecurityCheck> & { second?: string } = {},
): SecurityCheck[] {
    return Array.from({ length: n }, (_, i) => ({
        timestamp: `2026-04-12T${overrides.second || '00:00:00'}.${String(i).padStart(3, '0')}Z`,
        operation: `op ${i}`,
        pattern_matched: 'pat',
        risk: overrides.risk || 'recursive delete',
        decision: overrides.decision || 'BLOCKED',
        session_id: 'unknown',
        ...overrides,
    }));
}

describe('filterTestNoise — source-tagged rows', () => {
    test('source=test entries are dropped; source=live retained', () => {
        const events: SecurityCheck[] = [
            ...mk(7, { source: 'test' }),
            ...mk(3, { source: 'live' }),
        ];
        const out = filterTestNoise(events);
        expect(out.length).toBe(3);
        expect(out.every(e => e.source === 'live')).toBe(true);
    });

    test('live-source APPROVED rows are retained alongside BLOCKED', () => {
        const events: SecurityCheck[] = [
            ...mk(2, { source: 'live', decision: 'APPROVED' }),
            ...mk(1, { source: 'live', decision: 'BLOCKED' }),
            ...mk(5, { source: 'test', decision: 'BLOCKED' }),
        ];
        const out = filterTestNoise(events);
        expect(out.length).toBe(3);
        expect(out.filter(e => e.decision === 'BLOCKED').length).toBe(1);
        expect(out.filter(e => e.decision === 'APPROVED').length).toBe(2);
    });
});

describe('filterTestNoise — legacy rows without source field', () => {
    test('≤3 BLOCKED in same second are kept (not test-noise)', () => {
        const events: SecurityCheck[] = mk(3, { second: '00:00:00' });
        const out = filterTestNoise(events);
        expect(out.length).toBe(3);
    });

    test('>3 BLOCKED in same second are dropped as burst-test-noise', () => {
        const events: SecurityCheck[] = mk(6, { second: '00:00:00' });
        const out = filterTestNoise(events);
        expect(out.length).toBe(0);
    });

    test('legacy APPROVED in a burst group is dropped alongside BLOCKED', () => {
        // Burst of 5 BLOCKED in same second → whole group dropped
        const events: SecurityCheck[] = [
            ...mk(5, { second: '00:00:00' }),
        ];
        const out = filterTestNoise(events);
        expect(out.length).toBe(0);
    });
});

describe('filterTestNoise — mixed tagged + legacy', () => {
    test('tagged and legacy are filtered independently', () => {
        const events: SecurityCheck[] = [
            ...mk(3, { source: 'test', second: '00:00:01' }),
            ...mk(2, { source: 'live', second: '00:00:02' }),
            ...mk(2, { second: '00:00:03' }), // legacy, within burst threshold
            ...mk(5, { second: '00:00:04' }), // legacy, burst → dropped
        ];
        const out = filterTestNoise(events);
        // 0 test + 2 live + 2 legacy-ok + 0 legacy-burst = 4
        expect(out.length).toBe(4);
    });

    test('real-world shape: Apr 12 profile (many test + few live)', () => {
        // Simulate today's problem: 54 test-vector BLOCKED + 3 real BLOCKED
        const events: SecurityCheck[] = [
            ...mk(54, { source: 'test' }),
            ...mk(3, { source: 'live' }),
        ];
        const out = filterTestNoise(events);
        expect(out.length).toBe(3);
        // BLOCKED rate in new_risks should drop from 57 to 3
    });
});
