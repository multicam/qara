import { describe, test, expect } from 'bun:test';
import {
    computeTDDMetrics,
    type TDDEnforcementEntry,
} from '../skills/introspect/tools/miner-mode-lib';

function entry(
    phase: 'RED' | 'GREEN' | 'REFACTOR',
    offsetSec: number,
    overrides: Partial<TDDEnforcementEntry> = {},
): TDDEnforcementEntry {
    const base = new Date('2026-04-12T00:00:00.000Z').getTime();
    return {
        timestamp: new Date(base + offsetSec * 1000).toISOString(),
        phase,
        is_test_file: false,
        decision: 'allow',
        ...overrides,
    } as TDDEnforcementEntry;
}

describe('computeTDDMetrics', () => {
    test('empty input returns zero metrics', () => {
        const m = computeTDDMetrics([]);
        expect(m.total_entries).toBe(0);
        expect(m.cycle_count).toBe(0);
        expect(m.denied_in_red).toBe(0);
        expect(m.green_first_pass_rate).toBe(0);
    });

    test('single RED→GREEN transition = 1 cycle', () => {
        const m = computeTDDMetrics([
            entry('RED', 0, { is_test_file: true }),
            entry('GREEN', 1),
        ]);
        expect(m.cycle_count).toBe(1);
        expect(m.total_entries).toBe(2);
        expect(m.phases.RED).toBe(1);
        expect(m.phases.GREEN).toBe(1);
    });

    test('two RED→GREEN transitions = 2 cycles', () => {
        const m = computeTDDMetrics([
            entry('RED', 0, { is_test_file: true }),
            entry('GREEN', 1),
            entry('RED', 2, { is_test_file: true }),
            entry('GREEN', 3),
        ]);
        expect(m.cycle_count).toBe(2);
    });

    test('consecutive GREEN without preceding RED does not increment', () => {
        const m = computeTDDMetrics([
            entry('GREEN', 0),
            entry('GREEN', 1),
            entry('GREEN', 2),
        ]);
        expect(m.cycle_count).toBe(0);
    });

    test('RED with no following GREEN yields 0 cycles', () => {
        const m = computeTDDMetrics([
            entry('RED', 0),
            entry('RED', 1),
            entry('RED', 2),
        ]);
        expect(m.cycle_count).toBe(0);
    });

    test('mixed ordering: RED, RED, GREEN = 1 cycle (first RED→GREEN pair)', () => {
        const m = computeTDDMetrics([
            entry('RED', 0),
            entry('RED', 1),
            entry('GREEN', 2),
        ]);
        expect(m.cycle_count).toBe(1);
    });

    test('out-of-order timestamps are sorted before counting', () => {
        const m = computeTDDMetrics([
            entry('GREEN', 3),
            entry('RED', 0),
            entry('GREEN', 1),
            entry('RED', 2),
        ]);
        // Sorted: RED(0), GREEN(1), RED(2), GREEN(3) → 2 cycles
        expect(m.cycle_count).toBe(2);
    });

    test('denied_in_red counts RED entries with decision=deny', () => {
        const m = computeTDDMetrics([
            entry('RED', 0, { decision: 'deny' }),
            entry('RED', 1, { decision: 'deny' }),
            entry('GREEN', 2),
        ]);
        expect(m.denied_in_red).toBe(2);
        expect(m.cycle_count).toBe(1);
    });

    test('green_first_pass_rate counts source GREEN allow/total', () => {
        const m = computeTDDMetrics([
            entry('GREEN', 0, { is_test_file: false, decision: 'allow' }),
            entry('GREEN', 1, { is_test_file: false, decision: 'allow' }),
            entry('GREEN', 2, { is_test_file: false, decision: 'deny' }),
            entry('GREEN', 3, { is_test_file: true, decision: 'allow' }), // excluded (test file)
        ]);
        // 2 allowed / 3 total source GREENs = 66.7%
        expect(m.green_first_pass_rate).toBe(66.7);
    });

    test("real Apr 12 shape: 4 RED + 41 GREEN with interleaved transitions", () => {
        const entries: TDDEnforcementEntry[] = [];
        // 4 RED→GREEN cycles, each followed by several GREEN-only edits
        for (let c = 0; c < 4; c++) {
            const base = c * 100;
            entries.push(entry('RED', base, { is_test_file: true }));
            entries.push(entry('GREEN', base + 1));
            for (let g = 0; g < 9; g++) {
                entries.push(entry('GREEN', base + 2 + g));
            }
        }
        // Add 1 trailing GREEN edit (no new RED) → 4×10 + 1 = 41 GREEN total
        entries.push(entry('GREEN', 400));
        const m = computeTDDMetrics(entries);
        expect(m.total_entries).toBe(45);
        expect(m.phases.RED).toBe(4);
        expect(m.phases.GREEN).toBe(41);
        expect(m.cycle_count).toBe(4);
    });
});
