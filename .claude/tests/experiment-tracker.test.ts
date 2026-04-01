import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import {
    parseExperimentFile,
    listExperiments,
    computeMetricsForPeriod,
    compareMetrics,
    type Experiment,
    type PeriodMetrics,
    type Comparison,
    type DailyRunner,
} from '../skills/introspect/tools/experiment-tracker';
import type { DailyReport } from '../skills/introspect/tools/introspect-miner';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ---------------------------------------------------------------------------
// Stub DailyRunner — avoids spawning git/grep/miner I/O during tests
// ---------------------------------------------------------------------------

function makeStubReport(date: string, tools = 10, errors = 2, sessions = 3, recoveries = 1, failures = 0): DailyReport {
    const by_tool: Record<string, { count: number; errors: number; error_rate: number }> = {
        Read: { count: tools - errors, errors: 0, error_rate: 0 },
        Bash: { count: errors, errors, error_rate: errors > 0 ? 1 : 0 },
    };
    return {
        mode: 'daily',
        date,
        generated_at: new Date().toISOString(),
        tool_usage: {
            total: tools,
            by_tool,
            overall_error_rate: tools > 0 ? errors / tools : 0,
            anomalies: [],
        },
        sessions: {
            count: sessions,
            unique_sessions: Array.from({ length: sessions }, (_, i) => `session-${i + 1}`),
            stop_reasons: {},
        },
        security: { total: 0, by_decision: {}, new_risks: [] },
        corrections: [],
        git: { commits: 0, branches: [], commit_messages: [] },
        cc_version: null,
        baseline: null,
        session_traces: [],
        recovery_patterns: Array.from({ length: recoveries }, (_, i) => ({
            error_tool: 'Bash',
            error_input: `command: fail-${i}`,
            error_detail: 'test error',
            recovery_tool: 'Read',
            recovery_input: 'file: /tmp/fix.ts',
            gap: 1,
            timestamp: new Date().toISOString(),
        })),
        repeated_failures: Array.from({ length: failures }, (_, i) => ({
            tool: 'Bash',
            input_pattern: `command: fail-${i}`,
            count: 3,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            error_details: ['test error'],
        })),
        session_profiles: [],
    };
}

const stubRunner: DailyRunner = (date: string) => makeStubReport(date, 10, 2, 3, 1, 0);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPLETE_EXPERIMENT = `---
id: exp-20260301-001
title: Reduce bash error rate by adding input validation
status: completed
started: 2026-03-01
ended: 2026-03-15
duration_days: 14
hypothesis: Adding pre-validation reduces Bash errors by 20%
proposal: proposals-2026-03.md #1
---

## Change

Added input sanitisation in pre-tool-use-security.ts.

## Baseline Metrics (pre-change)

- Error rate: 12%
- Recovery rate: 45%

## Experiment Metrics (post-change)

- Error rate: 8%
- Recovery rate: 60%

**Result:** confirmed
**Decision:** keep
**Notes:** Error rate dropped by one third.
`;

const ACTIVE_EXPERIMENT = `---
id: exp-20260315-001
title: Test active experiment
status: active
started: 2026-03-15
duration_days: 7
hypothesis: Something will improve
---

## Change

Some change.
`;

const MINIMAL_EXPERIMENT = `---
id: exp-20260320-001
title: Minimal
status: proposed
started: 2026-03-20
duration_days: 0
hypothesis: Bare minimum fields
---
`;

const INVALID_NO_FRONTMATTER = `# Just a heading

No YAML frontmatter here.
`;

const INVALID_MISSING_REQUIRED = `---
title: Missing id and status
started: 2026-03-01
duration_days: 3
hypothesis: oops
---
`;

// ---------------------------------------------------------------------------
// parseExperimentFile
// ---------------------------------------------------------------------------

describe('parseExperimentFile', () => {
    test('parses complete experiment with all fields', () => {
        const result = parseExperimentFile(COMPLETE_EXPERIMENT);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('exp-20260301-001');
        expect(result!.title).toBe('Reduce bash error rate by adding input validation');
        expect(result!.status).toBe('completed');
        expect(result!.started).toBe('2026-03-01');
        expect(result!.ended).toBe('2026-03-15');
        expect(result!.duration_days).toBe(14);
        expect(result!.hypothesis).toBe('Adding pre-validation reduces Bash errors by 20%');
        expect(result!.proposal).toBe('proposals-2026-03.md #1');
    });

    test('parses active experiment without ended date', () => {
        const result = parseExperimentFile(ACTIVE_EXPERIMENT);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('exp-20260315-001');
        expect(result!.status).toBe('active');
        expect(result!.ended).toBeUndefined();
    });

    test('parses minimal experiment with only required fields', () => {
        const result = parseExperimentFile(MINIMAL_EXPERIMENT);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('exp-20260320-001');
        expect(result!.status).toBe('proposed');
        expect(result!.proposal).toBeUndefined();
    });

    test('returns null for content with no frontmatter delimiters', () => {
        expect(parseExperimentFile(INVALID_NO_FRONTMATTER)).toBeNull();
    });

    test('returns null when required field id is missing', () => {
        expect(parseExperimentFile(INVALID_MISSING_REQUIRED)).toBeNull();
    });

    test('returns null for empty string', () => {
        expect(parseExperimentFile('')).toBeNull();
    });

    test('casts duration_days to number', () => {
        const result = parseExperimentFile(COMPLETE_EXPERIMENT);
        expect(typeof result!.duration_days).toBe('number');
        expect(result!.duration_days).toBe(14);
    });
});

// ---------------------------------------------------------------------------
// listExperiments
// ---------------------------------------------------------------------------

describe('listExperiments', () => {
    const tmpDir = join(tmpdir(), 'exp-tracker-test-list-' + Date.now());

    beforeAll(() => {
        mkdirSync(tmpDir, { recursive: true });
        writeFileSync(join(tmpDir, 'exp-20260301-001.md'), COMPLETE_EXPERIMENT);
        writeFileSync(join(tmpDir, 'exp-20260315-001.md'), ACTIVE_EXPERIMENT);
        writeFileSync(join(tmpDir, 'exp-20260320-001.md'), MINIMAL_EXPERIMENT);
        writeFileSync(join(tmpDir, 'not-an-experiment.txt'), 'ignored');
        writeFileSync(join(tmpDir, 'README.md'), '# README — should be parsed but return null (no id)');
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns only parseable .md files', () => {
        const experiments = listExperiments(tmpDir);
        // 3 .md files with valid frontmatter (README.md has no id so returns null — filtered out)
        expect(experiments.length).toBe(3);
    });

    test('sorted by started date ascending', () => {
        const experiments = listExperiments(tmpDir);
        expect(experiments[0].started).toBe('2026-03-01');
        expect(experiments[1].started).toBe('2026-03-15');
        expect(experiments[2].started).toBe('2026-03-20');
    });

    test('returns empty array for non-existent directory', () => {
        expect(listExperiments('/nonexistent/path/that/does/not/exist')).toEqual([]);
    });

    test('returns empty array for empty directory', () => {
        const emptyDir = join(tmpdir(), 'exp-tracker-empty-' + Date.now());
        mkdirSync(emptyDir, { recursive: true });
        expect(listExperiments(emptyDir)).toEqual([]);
        rmSync(emptyDir, { recursive: true, force: true });
    });
});

// ---------------------------------------------------------------------------
// computeMetricsForPeriod
// ---------------------------------------------------------------------------

describe('computeMetricsForPeriod', () => {
    // Uses stubRunner to avoid spawning git/miner I/O.
    // Stub returns: 10 tools, 2 errors, 3 sessions, 1 recovery, 0 failures per day.

    test('returns PeriodMetrics with correct shape', () => {
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-03', stubRunner);
        expect(metrics).toHaveProperty('days');
        expect(metrics).toHaveProperty('total_tools');
        expect(metrics).toHaveProperty('total_errors');
        expect(metrics).toHaveProperty('error_rate');
        expect(metrics).toHaveProperty('session_count');
        expect(metrics).toHaveProperty('recovery_count');
        expect(metrics).toHaveProperty('repeated_failure_count');
    });

    test('days count matches date range', () => {
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-03', stubRunner);
        expect(metrics.days).toBe(3);
    });

    test('single-day range has days = 1', () => {
        const metrics = computeMetricsForPeriod('2026-01-05', '2026-01-05', stubRunner);
        expect(metrics.days).toBe(1);
    });

    test('aggregates tools across days correctly', () => {
        // 3 days * 10 tools each = 30 total
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-03', stubRunner);
        expect(metrics.total_tools).toBe(30);
        expect(metrics.total_errors).toBe(6);   // 3 days * 2 errors
        expect(metrics.session_count).toBe(9);  // 3 days * 3 sessions
        expect(metrics.recovery_count).toBe(3); // 3 days * 1 recovery
    });

    test('error_rate = total_errors / total_tools', () => {
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-03', stubRunner);
        expect(metrics.error_rate).toBeCloseTo(6 / 30);
    });

    test('error_rate is 0 when no tools are recorded', () => {
        const zeroRunner: DailyRunner = (d) => makeStubReport(d, 0, 0, 0, 0, 0);
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-02', zeroRunner);
        expect(metrics.error_rate).toBe(0);
    });

    test('all numeric fields are non-negative', () => {
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-07', stubRunner);
        expect(metrics.total_tools).toBeGreaterThanOrEqual(0);
        expect(metrics.total_errors).toBeGreaterThanOrEqual(0);
        expect(metrics.error_rate).toBeGreaterThanOrEqual(0);
        expect(metrics.session_count).toBeGreaterThanOrEqual(0);
        expect(metrics.recovery_count).toBeGreaterThanOrEqual(0);
        expect(metrics.repeated_failure_count).toBeGreaterThanOrEqual(0);
    });

    test('tolerates runner throwing for a day (skips that day)', () => {
        let callCount = 0;
        const flakyRunner: DailyRunner = (date: string) => {
            callCount++;
            if (callCount === 2) throw new Error('simulated failure');
            return makeStubReport(date, 10, 2, 3, 1, 0);
        };
        // 3 days, day 2 throws — should only count 2 days of data
        const metrics = computeMetricsForPeriod('2026-01-01', '2026-01-03', flakyRunner);
        expect(metrics.days).toBe(3);          // date range is still 3
        expect(metrics.total_tools).toBe(20);  // only 2 days * 10
    });
});

// ---------------------------------------------------------------------------
// compareMetrics
// ---------------------------------------------------------------------------

describe('compareMetrics', () => {
    const baseline: PeriodMetrics = {
        days: 7,
        total_tools: 200,
        total_errors: 20,
        error_rate: 0.1,
        session_count: 10,
        recovery_count: 5,
        repeated_failure_count: 3,
    };

    const experiment: PeriodMetrics = {
        days: 7,
        total_tools: 240,
        total_errors: 12,
        error_rate: 0.05,
        session_count: 12,
        recovery_count: 8,
        repeated_failure_count: 1,
    };

    test('returns Comparison with correct shape', () => {
        const result = compareMetrics(baseline, experiment);
        expect(result).toHaveProperty('baseline');
        expect(result).toHaveProperty('experiment');
        expect(result).toHaveProperty('deltas');
        expect(result).toHaveProperty('pct_changes');
    });

    test('baseline and experiment are preserved by reference', () => {
        const result = compareMetrics(baseline, experiment);
        expect(result.baseline).toBe(baseline);
        expect(result.experiment).toBe(experiment);
    });

    test('computes correct deltas (experiment - baseline)', () => {
        const result = compareMetrics(baseline, experiment);
        expect(result.deltas.total_tools).toBe(40);      // 240 - 200
        expect(result.deltas.total_errors).toBe(-8);     // 12 - 20
        expect(result.deltas.session_count).toBe(2);     // 12 - 10
        expect(result.deltas.recovery_count).toBe(3);    // 8 - 5
        expect(result.deltas.repeated_failure_count).toBe(-2); // 1 - 3
    });

    test('computes correct percentage changes ((delta/baseline)*100)', () => {
        const result = compareMetrics(baseline, experiment);
        expect(result.pct_changes.total_tools).toBeCloseTo(20);      // 40/200*100
        expect(result.pct_changes.total_errors).toBeCloseTo(-40);    // -8/20*100
        expect(result.pct_changes.session_count).toBeCloseTo(20);    // 2/10*100
        expect(result.pct_changes.error_rate).toBeCloseTo(-50);      // -0.05/0.1*100
    });

    test('pct_change is 0 when baseline value is 0 (no division by zero)', () => {
        const zeroBase: PeriodMetrics = { ...baseline, recovery_count: 0 };
        const expWithRecoveries: PeriodMetrics = { ...experiment, recovery_count: 5 };
        const result = compareMetrics(zeroBase, expWithRecoveries);
        expect(result.pct_changes.recovery_count).toBe(0);
    });

    test('delta keys match all numeric PeriodMetrics fields except days', () => {
        const result = compareMetrics(baseline, experiment);
        const expectedKeys = ['total_tools', 'total_errors', 'error_rate', 'session_count', 'recovery_count', 'repeated_failure_count'];
        for (const key of expectedKeys) {
            expect(result.deltas).toHaveProperty(key);
            expect(result.pct_changes).toHaveProperty(key);
        }
    });
});
