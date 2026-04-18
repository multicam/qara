/**
 * Feed: obsolescence (the new detector)
 *
 * Four sub-checks, all deterministic:
 *
 *   1. hook-removed-event — settings.json references a CC hook event name that
 *      is not in the current CC known-events allowlist
 *   2. mcp-server-unused — an MCP server in .mcp.json has zero tool calls in
 *      tool-usage.jsonl within the last 90 days
 *   3. feature-unused-long — a feature has been `[OK] [    ]` for ≥180 days
 *      (tracked via firstSeenUnused state map)
 *   4. claude-md-native-duplicate — CLAUDE.md contains a rule that duplicates
 *      a CC-native feature (small manually-maintained allowlist)
 */

import { existsSync, readFileSync } from 'fs';
import type { Finding, Severity, Tier } from '../types';

/**
 * Factory for an obsolescence Finding — keeps the common id-prefix +
 * feed + tier structure in one place so each sub-check only has to
 * declare what changes (subId, variant, message, data, severity, tier).
 */
interface ObsolescenceFindingInput {
    subId: string;          // e.g. 'hook-removed-event:SessionStart'
    source: string;
    variant?: string;
    message: string;
    severity: Severity;
    tier: Tier;
    data: Record<string, unknown>;
}

function obsolescenceFinding(input: ObsolescenceFindingInput): Finding {
    return {
        id: `obsolescence:${input.subId}`,
        feed: 'obsolescence',
        source: input.source,
        variant: input.variant,
        message: input.message,
        severity: input.severity,
        tier: input.tier,
        data: input.data,
    };
}

// ── Known events / rules — maintained in this file, grow as CC evolves ────

/**
 * CC hook events supported by the currently-targeted CC release line.
 * Hook events NOT in this set are candidates for removal.
 * Keep in sync with CC's public hook lifecycle docs.
 */
export const KNOWN_CC_HOOK_EVENTS: ReadonlySet<string> = new Set([
    'SessionStart',
    'SessionEnd',
    'Stop',
    'StopFailure',        // CC 2.1.x — fires when Stop hook fails
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure', // CC 2.1.x — tool-call failure hook
    'PreCompact',
    'PostCompact',        // CC 2.1.x — paired recovery with PreCompact
    'Notification',
    'UserPromptSubmit',
    'SubagentStart',
    'SubagentStop',
    'TaskCreated',        // CC 2.1.14 — subagent/task dispatch
    'ConfigChange',       // CC 2.1.x — settings.json sync
    'PermissionDenied',   // CC 2.1.x — permission-deny logging
]);

/**
 * CLAUDE.md rule fingerprints that duplicate CC-native features. Each entry
 * maps a substring to a short explanation the user will see in the prompt.
 * Intentionally small + manually maintained — every entry is a deliberate
 * obsolescence call the maintainer signed off on.
 */
export const CLAUDE_MD_NATIVE_DUPLICATES: ReadonlyArray<{
    pattern: string;
    native: string;
}> = [
    // seed entries — add as CC absorbs what used to live in CLAUDE.md
    { pattern: 'manual UFC', native: 'CC 2.1.x native context management' },
    { pattern: 'manual compact checkpoint', native: 'PreCompact hook (CC 2.1.105+)' },
];

// ── Thresholds ────────────────────────────────────────────────────────────

export const MCP_UNUSED_DAYS = 90;
export const FEATURE_UNUSED_DAYS = 180;

// ── Sub-check 1: hook-removed-event ───────────────────────────────────────

/** Parse settings.json and list hook event names present in the hooks map. */
export function extractHookEvents(settingsJson: string): string[] {
    try {
        const parsed = JSON.parse(settingsJson) as { hooks?: Record<string, unknown> };
        const hooksMap = parsed.hooks ?? {};
        return Object.keys(hooksMap);
    } catch {
        return [];
    }
}

/** Findings for hook events not in the known CC events allowlist. */
export function detectRemovedHookEvents(settingsJson: string): Finding[] {
    const findings: Finding[] = [];
    for (const event of extractHookEvents(settingsJson)) {
        if (KNOWN_CC_HOOK_EVENTS.has(event)) continue;
        findings.push(
            obsolescenceFinding({
                subId: `hook-removed-event:${event}`,
                source: `settings.json:hooks.${event}`,
                variant: event,
                message: `Hook event "${event}" is not in the current CC known-events set — may be removed or renamed`,
                severity: 'warning',
                tier: 'unsafe',
                data: { event },
            }),
        );
    }
    return findings;
}

// ── Sub-check 2: mcp-server-unused ────────────────────────────────────────

/** Parse .mcp.json for the list of configured server names. */
export function extractMcpServers(mcpJson: string): string[] {
    try {
        const parsed = JSON.parse(mcpJson) as { mcpServers?: Record<string, unknown> };
        const servers = parsed.mcpServers ?? {};
        return Object.keys(servers);
    } catch {
        return [];
    }
}

/**
 * Count tool calls per MCP server in the last `windowDays`.
 *
 * The tool-usage.jsonl is append-only. Each line is a JSON record with a
 * `tool` field. MCP tool calls are named `mcp__<server>__<tool>`.
 */
export function countMcpCalls(
    jsonlContent: string,
    windowDays: number,
    now: Date = new Date(),
): Record<string, number> {
    const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
    const counts: Record<string, number> = {};
    for (const line of jsonlContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let record: { tool?: string; timestamp?: string };
        try {
            record = JSON.parse(trimmed);
        } catch {
            continue;
        }
        const tool = record.tool;
        if (typeof tool !== 'string' || !tool.startsWith('mcp__')) continue;
        if (record.timestamp) {
            const ts = new Date(record.timestamp).getTime();
            if (!isNaN(ts) && ts < cutoff) continue;
        }
        const server = tool.split('__')[1];
        if (!server) continue;
        counts[server] = (counts[server] ?? 0) + 1;
    }
    return counts;
}

export function detectUnusedMcpServers(
    mcpJson: string,
    jsonlContent: string,
    windowDays: number = MCP_UNUSED_DAYS,
    now: Date = new Date(),
): Finding[] {
    const servers = extractMcpServers(mcpJson);
    const counts = countMcpCalls(jsonlContent, windowDays, now);
    const findings: Finding[] = [];
    for (const server of servers) {
        if ((counts[server] ?? 0) > 0) continue;
        findings.push(
            obsolescenceFinding({
                subId: `mcp-server-unused:${server}`,
                source: `.mcp.json:${server}`,
                variant: `0/${windowDays}d`,
                message: `MCP server "${server}" has 0 calls in the last ${windowDays} days — candidate for removal`,
                severity: 'info',
                tier: 'unsafe',
                data: { server, windowDays },
            }),
        );
    }
    return findings;
}

// ── Sub-check 3: feature-unused-long ───────────────────────────────────────

/**
 * Tracker data: per-feature first-seen-unused ISO date. Persisted alongside
 * inbox state by the review CLI; pure function here for testability.
 */
export type FirstSeenMap = Record<string, string>;

/**
 * Update the first-seen-unused tracker given the current feature-usage
 * snapshot. Features that are supported + not-in-use get their timestamp
 * recorded on first sighting; features now in-use are evicted.
 */
export function updateFirstSeenUnused(
    current: FirstSeenMap,
    featureUsage: Record<string, { supported: boolean; inUse: boolean }>,
    now: Date = new Date(),
): FirstSeenMap {
    const updated: FirstSeenMap = { ...current };
    const iso = now.toISOString();
    for (const [feature, status] of Object.entries(featureUsage)) {
        if (status.supported && !status.inUse) {
            if (!updated[feature]) updated[feature] = iso;
        } else {
            delete updated[feature];
        }
    }
    // Remove tracker entries for features that no longer exist.
    for (const key of Object.keys(updated)) {
        if (!(key in featureUsage)) delete updated[key];
    }
    return updated;
}

export function detectLongUnusedFeatures(
    firstSeen: FirstSeenMap,
    windowDays: number = FEATURE_UNUSED_DAYS,
    now: Date = new Date(),
): Finding[] {
    const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
    const findings: Finding[] = [];
    for (const [feature, isoDate] of Object.entries(firstSeen)) {
        const ts = new Date(isoDate).getTime();
        if (isNaN(ts) || ts > cutoff) continue;
        const daysUnused = Math.floor((now.getTime() - ts) / (24 * 60 * 60 * 1000));
        findings.push(
            obsolescenceFinding({
                subId: `feature-unused-long:${feature}`,
                source: `feature/${feature}`,
                variant: `${daysUnused}d`,
                message: `Feature "${feature}" has been supported-but-unused for ${daysUnused} days — consider adopting or silencing`,
                severity: 'info',
                tier: 'unsafe',
                data: { feature, firstSeenUnused: isoDate, daysUnused },
            }),
        );
    }
    return findings;
}

// ── Sub-check 4: claude-md-native-duplicate ────────────────────────────────

export function detectClaudeMdDuplicates(claudeMdContent: string, claudeMdPath: string): Finding[] {
    const findings: Finding[] = [];
    for (const rule of CLAUDE_MD_NATIVE_DUPLICATES) {
        if (!claudeMdContent.includes(rule.pattern)) continue;
        findings.push(
            obsolescenceFinding({
                subId: `claude-md-native-duplicate:${rule.pattern}`,
                source: claudeMdPath,
                variant: rule.pattern,
                message: `CLAUDE.md mentions "${rule.pattern}" which duplicates ${rule.native}`,
                severity: 'info',
                tier: 'unsafe',
                data: { pattern: rule.pattern, native: rule.native },
            }),
        );
    }
    return findings;
}

// ── Orchestrator ───────────────────────────────────────────────────────────

export interface ObsolescenceFeedInput {
    settingsJsonPath?: string;
    mcpJsonPath?: string;
    toolUsageJsonlPath?: string;
    claudeMdPath?: string;
    firstSeenUnused?: FirstSeenMap;
    now?: Date;
}

/**
 * Convenience orchestrator — reads the relevant files if paths are passed,
 * skips any sub-check whose inputs are missing. Sub-checks are exposed
 * individually so tests and callers can compose them freely.
 */
export function obsolescenceFeed(input: ObsolescenceFeedInput): Finding[] {
    const findings: Finding[] = [];
    const now = input.now ?? new Date();

    if (input.settingsJsonPath && existsSync(input.settingsJsonPath)) {
        findings.push(...detectRemovedHookEvents(readFileSync(input.settingsJsonPath, 'utf-8')));
    }

    if (
        input.mcpJsonPath &&
        input.toolUsageJsonlPath &&
        existsSync(input.mcpJsonPath) &&
        existsSync(input.toolUsageJsonlPath)
    ) {
        findings.push(
            ...detectUnusedMcpServers(
                readFileSync(input.mcpJsonPath, 'utf-8'),
                readFileSync(input.toolUsageJsonlPath, 'utf-8'),
                MCP_UNUSED_DAYS,
                now,
            ),
        );
    }

    if (input.firstSeenUnused) {
        findings.push(...detectLongUnusedFeatures(input.firstSeenUnused, FEATURE_UNUSED_DAYS, now));
    }

    if (input.claudeMdPath && existsSync(input.claudeMdPath)) {
        findings.push(
            ...detectClaudeMdDuplicates(readFileSync(input.claudeMdPath, 'utf-8'), input.claudeMdPath),
        );
    }

    return findings;
}
