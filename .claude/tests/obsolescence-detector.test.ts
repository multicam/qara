/**
 * Obsolescence detector — unit tests.
 *
 * Each sub-check is tested in isolation with synthetic fixtures:
 *   - settings.json referencing removed vs. known hook events
 *   - .mcp.json + tool-usage.jsonl for call-count windowing
 *   - firstSeenUnused map for feature-unused-long
 *   - CLAUDE.md fixture for native duplicates
 */

import { describe, it, expect } from 'bun:test';

import {
    KNOWN_CC_HOOK_EVENTS,
    extractHookEvents,
    detectRemovedHookEvents,
    extractMcpServers,
    countMcpCalls,
    detectUnusedMcpServers,
    updateFirstSeenUnused,
    detectLongUnusedFeatures,
    detectClaudeMdDuplicates,
    MCP_UNUSED_DAYS,
    FEATURE_UNUSED_DAYS,
} from '../hooks/lib/cc-upgrade-inbox/feeds/obsolescence';

// ── Fixture helpers ────────────────────────────────────────────────────────

function settingsWithHooks(events: string[]): string {
    const hooks: Record<string, unknown> = {};
    for (const e of events) hooks[e] = [{ matcher: '*', hooks: [] }];
    return JSON.stringify({ hooks });
}

function mcpConfigWith(servers: string[]): string {
    const mcpServers: Record<string, unknown> = {};
    for (const s of servers) mcpServers[s] = { command: 'echo' };
    return JSON.stringify({ mcpServers });
}

function jsonlLine(tool: string, timestamp: string): string {
    return JSON.stringify({ tool, timestamp });
}

// ── hook-removed-event ─────────────────────────────────────────────────────

describe('extractHookEvents', () => {
    it('returns the keys of the hooks map', () => {
        const json = settingsWithHooks(['SessionStart', 'PreToolUse']);
        expect(extractHookEvents(json).sort()).toEqual(['PreToolUse', 'SessionStart']);
    });

    it('returns empty on malformed JSON', () => {
        expect(extractHookEvents('{not json')).toEqual([]);
    });

    it('returns empty when hooks is absent', () => {
        expect(extractHookEvents('{}')).toEqual([]);
    });
});

describe('detectRemovedHookEvents', () => {
    it('flags events not in the known allowlist', () => {
        const json = settingsWithHooks(['SessionStart', 'MythicalEvent']);
        const findings = detectRemovedHookEvents(json);
        expect(findings.length).toBe(1);
        expect(findings[0].variant).toBe('MythicalEvent');
        expect(findings[0].tier).toBe('unsafe');
    });

    it('emits nothing when every event is known', () => {
        const known = [...KNOWN_CC_HOOK_EVENTS].slice(0, 3);
        const json = settingsWithHooks(known);
        expect(detectRemovedHookEvents(json)).toEqual([]);
    });
});

// ── mcp-server-unused ──────────────────────────────────────────────────────

describe('extractMcpServers', () => {
    it('returns the keys of mcpServers', () => {
        expect(extractMcpServers(mcpConfigWith(['a', 'b'])).sort()).toEqual(['a', 'b']);
    });

    it('returns empty on malformed JSON', () => {
        expect(extractMcpServers('{not json')).toEqual([]);
    });
});

describe('countMcpCalls', () => {
    const now = new Date('2026-04-18T00:00:00Z');
    const recentIso = '2026-04-15T00:00:00Z'; // 3 days ago
    const oldIso = '2025-01-01T00:00:00Z';    // >90 days ago

    it('counts MCP calls within the window', () => {
        const jsonl = [
            jsonlLine('mcp__context7__get', recentIso),
            jsonlLine('mcp__context7__search', recentIso),
            jsonlLine('mcp__devtools__run', recentIso),
        ].join('\n');
        const counts = countMcpCalls(jsonl, 90, now);
        expect(counts.context7).toBe(2);
        expect(counts.devtools).toBe(1);
    });

    it('excludes calls older than the window', () => {
        const jsonl = [
            jsonlLine('mcp__context7__get', oldIso),
            jsonlLine('mcp__context7__search', recentIso),
        ].join('\n');
        const counts = countMcpCalls(jsonl, 90, now);
        expect(counts.context7).toBe(1);
    });

    it('ignores non-MCP tool records', () => {
        const jsonl = [
            jsonlLine('Read', recentIso),
            jsonlLine('Bash', recentIso),
            jsonlLine('mcp__x__y', recentIso),
        ].join('\n');
        const counts = countMcpCalls(jsonl, 90, now);
        expect(counts.x).toBe(1);
        expect(Object.keys(counts).length).toBe(1);
    });

    it('is robust to malformed lines', () => {
        const jsonl = ['{', 'not json', jsonlLine('mcp__a__b', recentIso), ''].join('\n');
        expect(countMcpCalls(jsonl, 90, now)).toEqual({ a: 1 });
    });
});

describe('detectUnusedMcpServers', () => {
    const now = new Date('2026-04-18T00:00:00Z');
    const recentIso = '2026-04-15T00:00:00Z';

    it('flags servers with zero calls in the window', () => {
        const mcp = mcpConfigWith(['context7', 'devtools']);
        const jsonl = jsonlLine('mcp__context7__get', recentIso);
        const findings = detectUnusedMcpServers(mcp, jsonl, MCP_UNUSED_DAYS, now);
        expect(findings.length).toBe(1);
        expect(findings[0].data?.server).toBe('devtools');
    });

    it('emits nothing when every server has recent calls', () => {
        const mcp = mcpConfigWith(['context7']);
        const jsonl = jsonlLine('mcp__context7__get', recentIso);
        expect(detectUnusedMcpServers(mcp, jsonl, MCP_UNUSED_DAYS, now)).toEqual([]);
    });
});

// ── feature-unused-long ────────────────────────────────────────────────────

describe('updateFirstSeenUnused', () => {
    const now = new Date('2026-04-18T00:00:00Z');

    it('records timestamp for newly-unused features', () => {
        const updated = updateFirstSeenUnused(
            {},
            {
                askUserQuestion: { supported: true, inUse: false },
                webSearch: { supported: true, inUse: true },
            },
            now,
        );
        expect(updated.askUserQuestion).toBe(now.toISOString());
        expect(updated.webSearch).toBeUndefined();
    });

    it('preserves the original first-seen timestamp on repeat sightings', () => {
        const initial = { askUserQuestion: '2026-01-01T00:00:00Z' };
        const updated = updateFirstSeenUnused(
            initial,
            { askUserQuestion: { supported: true, inUse: false } },
            now,
        );
        expect(updated.askUserQuestion).toBe('2026-01-01T00:00:00Z');
    });

    it('evicts features that are now in use', () => {
        const initial = { askUserQuestion: '2026-01-01T00:00:00Z' };
        const updated = updateFirstSeenUnused(
            initial,
            { askUserQuestion: { supported: true, inUse: true } },
            now,
        );
        expect(updated.askUserQuestion).toBeUndefined();
    });

    it('evicts features that disappear from the feature set', () => {
        const initial = { obsoleteFlag: '2026-01-01T00:00:00Z' };
        const updated = updateFirstSeenUnused(initial, {}, now);
        expect(updated.obsoleteFlag).toBeUndefined();
    });
});

describe('detectLongUnusedFeatures', () => {
    const now = new Date('2026-04-18T00:00:00Z');

    it('flags features unused for ≥ windowDays', () => {
        const oldIso = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString();
        const findings = detectLongUnusedFeatures(
            { askUserQuestion: oldIso },
            FEATURE_UNUSED_DAYS,
            now,
        );
        expect(findings.length).toBe(1);
        expect(findings[0].data?.feature).toBe('askUserQuestion');
    });

    it('does not flag recently-observed features', () => {
        const recentIso = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
        const findings = detectLongUnusedFeatures(
            { askUserQuestion: recentIso },
            FEATURE_UNUSED_DAYS,
            now,
        );
        expect(findings).toEqual([]);
    });
});

// ── claude-md-native-duplicate ────────────────────────────────────────────

describe('detectClaudeMdDuplicates', () => {
    it('flags an allowlisted pattern when present', () => {
        const content = '# CLAUDE.md\n\nRule X: manual UFC loop required.\n';
        const findings = detectClaudeMdDuplicates(content, '/repo/CLAUDE.md');
        expect(findings.length).toBe(1);
        expect(findings[0].variant).toBe('manual UFC');
        expect(findings[0].source).toBe('/repo/CLAUDE.md');
    });

    it('emits nothing when no patterns match', () => {
        expect(detectClaudeMdDuplicates('# Nothing interesting here', '/x')).toEqual([]);
    });
});
