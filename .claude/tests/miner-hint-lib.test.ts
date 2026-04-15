import { describe, test, expect } from 'bun:test';
import {
    computeHintCompliance,
    readActiveHints,
    computeQualityMetrics,
    computeAgentBreakdown,
    resolveSubagentType,
} from '../skills/introspect/tools/miner-hint-lib';
import type { ToolEntryWithSummary } from '../skills/introspect/tools/miner-hint-lib';

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

// ---------------------------------------------------------------------------
// computeQualityMetrics (#42796 defense)
// ---------------------------------------------------------------------------

function entry(tool: string, summary: string, session = 's1', ts = '2026-04-01T10:00:00Z'): ToolEntryWithSummary {
    return { tool, error: false, timestamp: ts, input_summary: summary, session_id: session };
}

describe('computeQualityMetrics', () => {
    test('healthy session: read before every edit → ratio high, 0% blind edits', () => {
        const entries: ToolEntryWithSummary[] = [
            entry('Read', 'file: /src/a.ts', 's1', '2026-04-01T10:00:00Z'),
            entry('Read', 'file: /src/b.ts', 's1', '2026-04-01T10:01:00Z'),
            entry('Edit', 'file: /src/a.ts', 's1', '2026-04-01T10:02:00Z'),
            entry('Read', 'file: /src/c.ts', 's1', '2026-04-01T10:03:00Z'),
            entry('Write', 'file: /src/b.ts', 's1', '2026-04-01T10:04:00Z'),
            entry('Edit', 'file: /src/c.ts', 's1', '2026-04-01T10:05:00Z'),
        ];
        const m = computeQualityMetrics(entries);
        expect(m.read_edit_ratio).toBe(1); // 3 reads / 3 edits = 1.0
        expect(m.edits_without_read_pct).toBe(0); // all files were read first
    });

    test('degraded session: edits without reads → high blind edit %', () => {
        const entries: ToolEntryWithSummary[] = [
            entry('Read', 'file: /src/a.ts', 's1', '2026-04-01T10:00:00Z'),
            entry('Edit', 'file: /src/a.ts', 's1', '2026-04-01T10:01:00Z'),
            entry('Edit', 'file: /src/b.ts', 's1', '2026-04-01T10:02:00Z'), // blind
            entry('Write', 'file: /src/c.ts', 's1', '2026-04-01T10:03:00Z'), // blind
        ];
        const m = computeQualityMetrics(entries);
        expect(m.read_edit_ratio).toBeCloseTo(0.3, 1); // 1 read / 3 edits
        // 2 out of 3 edits were blind
        expect(m.edits_without_read_pct).toBeCloseTo(66.7, 0);
    });

    test('empty entries → zeroes', () => {
        const m = computeQualityMetrics([]);
        expect(m.read_edit_ratio).toBe(0);
        expect(m.edits_without_read_pct).toBe(0);
    });

    test('read-only session (no edits) → ratio 0, 0% blind', () => {
        const entries: ToolEntryWithSummary[] = [
            entry('Read', 'file: /src/a.ts'),
            entry('Read', 'file: /src/b.ts'),
            entry('Grep', 'pattern: foo'),
        ];
        const m = computeQualityMetrics(entries);
        expect(m.read_edit_ratio).toBe(0); // no edits = 0 ratio (avoid div by zero)
        expect(m.edits_without_read_pct).toBe(0);
    });

    test('multi-session: tracks read sets independently per session', () => {
        const entries: ToolEntryWithSummary[] = [
            // Session 1: reads a.ts, edits a.ts — ok
            entry('Read', 'file: /src/a.ts', 's1', '2026-04-01T10:00:00Z'),
            entry('Edit', 'file: /src/a.ts', 's1', '2026-04-01T10:01:00Z'),
            // Session 2: edits a.ts WITHOUT reading it — blind
            entry('Edit', 'file: /src/a.ts', 's2', '2026-04-01T11:00:00Z'),
        ];
        const m = computeQualityMetrics(entries);
        // 1 read / 2 edits = 0.5
        expect(m.read_edit_ratio).toBe(0.5);
        // 1 out of 2 edits was blind (s2's edit)
        expect(m.edits_without_read_pct).toBe(50);
    });

    test('non-file tools are ignored for read:edit tracking', () => {
        const entries: ToolEntryWithSummary[] = [
            entry('Bash', 'command: ls', 's1', '2026-04-01T10:00:00Z'),
            entry('Grep', 'pattern: foo', 's1', '2026-04-01T10:01:00Z'),
            entry('Glob', 'pattern: *.ts', 's1', '2026-04-01T10:02:00Z'),
        ];
        const m = computeQualityMetrics(entries);
        expect(m.read_edit_ratio).toBe(0);
        expect(m.edits_without_read_pct).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// resolveSubagentType + computeAgentBreakdown
// cruise--audit-fixes-v1 P0.2 — forward-clean + legacy fallback
// ---------------------------------------------------------------------------

describe('resolveSubagentType', () => {
    const mk = (overrides: Partial<ToolEntryWithSummary>): ToolEntryWithSummary => ({
        tool: 'Agent',
        error: false,
        timestamp: '2026-04-15T00:00:00Z',
        ...overrides,
    });

    test('prefers first-class subagent_type field when present', () => {
        const row = mk({ subagent_type: 'critic', input_summary: 'type: verifier something' });
        expect(resolveSubagentType(row)).toBe('critic'); // first-class wins over summary
    });

    test('falls back to input_summary for legacy Agent row', () => {
        const row = mk({ subagent_type: null, input_summary: 'type: critic review plan phase 1' });
        expect(resolveSubagentType(row)).toBe('critic');
    });

    test('falls back for Task tool too', () => {
        const row = mk({ tool: 'Task', subagent_type: undefined, input_summary: 'type: engineer-low fix typo' });
        expect(resolveSubagentType(row)).toBe('engineer-low');
    });

    test('returns null for non-Agent/Task tools even if input_summary contains "type:"', () => {
        const row = mk({ tool: 'Bash', subagent_type: null, input_summary: 'command: grep "type: foo" file.txt' });
        expect(resolveSubagentType(row)).toBeNull();
    });

    test('regex is anchored to start — rejects mid-description "type:" in descriptions', () => {
        // Agent row where description happened to contain "type:" mid-prose.
        // trace-utils emits "type: <name>" at START only, so an anchored regex
        // matches real data and rejects this spoofed prose.
        const row = mk({ subagent_type: null, input_summary: 'Analyze font-type: serif usage in design' });
        expect(resolveSubagentType(row)).toBeNull();
    });

    test('returns null when subagent_type missing and no input_summary', () => {
        const row = mk({ subagent_type: null, input_summary: undefined });
        expect(resolveSubagentType(row)).toBeNull();
    });

    test('empty subagent_type falls through to summary', () => {
        const row = mk({ subagent_type: '', input_summary: 'type: architect design review' });
        expect(resolveSubagentType(row)).toBe('architect');
    });
});

describe('computeAgentBreakdown', () => {
    const mk = (tool: string, subagent_type: string | null | undefined, input_summary?: string, ts = '2026-04-15T00:00:00Z'): ToolEntryWithSummary => ({
        tool,
        error: false,
        timestamp: ts,
        subagent_type: subagent_type ?? undefined,
        input_summary,
    });

    test('counts by resolved subagent_type across mixed new + legacy rows', () => {
        const entries: ToolEntryWithSummary[] = [
            mk('Agent', 'critic'),                                // new field
            mk('Agent', 'critic'),
            mk('Agent', null, 'type: verifier something'),        // legacy fallback
            mk('Task',  null, 'type: engineer fix bug'),          // legacy Task
            mk('Agent', null, 'type: critic review'),             // legacy critic
            mk('Read',  null, 'file: /tmp/x'),                    // ignored (not Agent/Task)
            mk('Bash',  null, 'command: ls'),                     // ignored
        ];
        const counts = computeAgentBreakdown(entries);
        expect(counts).toEqual({ critic: 3, verifier: 1, engineer: 1 });
    });

    test('unresolvable Agent rows land in "unknown" bucket', () => {
        const entries: ToolEntryWithSummary[] = [
            mk('Agent', null, undefined),           // no fallback possible
            mk('Agent', null, 'description: blah'),  // no "type:" prefix
            mk('Agent', 'critic'),                  // resolves
        ];
        const counts = computeAgentBreakdown(entries);
        expect(counts).toEqual({ unknown: 2, critic: 1 });
    });

    test('empty entries yields empty breakdown', () => {
        expect(computeAgentBreakdown([])).toEqual({});
    });
});
