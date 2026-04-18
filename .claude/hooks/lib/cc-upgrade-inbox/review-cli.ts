#!/usr/bin/env bun
/**
 * cc-upgrade-inbox/review-cli.ts
 *
 * Entry point invoked by the `/cc-upgrade-review` command (and by
 * `analyse-pai` for auto-append). Gathers findings from every feed,
 * applies suppression state, groups them, and emits either:
 *
 *   - interactive plan (default) — JSON plan the invoking agent feeds into
 *     AskUserQuestion
 *   - dry-run plan  — prints the plan but applies nothing
 *   - accept-safe   — auto-applies every safe-tier finding and records it
 *   - queue-unsafe  — writes every unsafe-tier finding to the action queue
 *
 * Usage:
 *   bun review-cli.ts [--dry-run] [--accept-safe] [--queue-unsafe] \
 *                     [--state <path>] [--state-dir <dir>] [--changelog <path>]
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { PAI_DIR, SKILLS_DIR, STATE_DIR } from '../pai-paths';
import {
    loadInboxState,
    saveInboxState,
    detectOrphanedIgnores,
    recordDecision,
    clearGrandfathered,
} from './state';
import { aggregateFindings, BULK_THRESHOLD, type FindingGroup } from './aggregate';
import type { Finding, InboxState, ReviewedKey } from './types';

import { ccFeatureFeed } from './feeds/cc-feature';
import { orphansFeed } from './feeds/orphans';
import { advisoryRefsFeed } from './feeds/advisory-refs';
import { crossSkillRefsFeed } from './feeds/cross-skill-refs';
import { skillPulseFeed } from './feeds/skill-pulse';
import { paiAuditFeed } from './feeds/pai-audit';
import { externalSkillsFeed } from './feeds/external-skills';
import { featureUnusedFeed } from './feeds/feature-unused';
import { obsolescenceFeed, updateFirstSeenUnused, type FirstSeenMap } from './feeds/obsolescence';
import { applySafeFinding, type DiffReport } from './actions/safe';
import { queueUnsafeFinding } from './actions/unsafe';

import { buildGraph, findOrphans } from '../context-graph/graph';

// ── Paths ──────────────────────────────────────────────────────────────────

export const INBOX_STATE_PATH = join(STATE_DIR, 'cc-upgrade-inbox.json');
export const ACTION_QUEUE_PATH = join(STATE_DIR, 'cc-upgrade-action-queue.md');
export const FIRST_SEEN_PATH = join(STATE_DIR, 'cc-upgrade-first-seen.json');

// ── Feed gathering ────────────────────────────────────────────────────────

export interface GatherOptions {
    paiDir?: string;
    skillsDir?: string;
    changelogPath?: string;
    /** Pre-computed reports if callers want to inject fixtures (tests). */
    injected?: {
        rawFindings?: Finding[];
    };
}

export interface GatherResult {
    findings: Finding[];
    warnings: string[];
}

/**
 * Run every feed that can run without network I/O. Feeds requiring
 * network (cc-feature needs the changelog) are gated on `--changelog` /
 * a bundled fixture file.
 */
export async function gatherAllFindings(
    state: InboxState,
    opts: GatherOptions = {},
): Promise<GatherResult> {
    if (opts.injected?.rawFindings) {
        return { findings: opts.injected.rawFindings, warnings: [] };
    }

    const paiDir = opts.paiDir ?? PAI_DIR;
    const skillsDir = opts.skillsDir ?? SKILLS_DIR;
    const findings: Finding[] = [];
    const warnings: string[] = [];

    // Context-graph driven feeds.
    try {
        const graph = buildGraph(paiDir);
        const orphanReport = findOrphans(graph);
        findings.push(...orphansFeed({ orphanReport, skillsDir }));
        findings.push(...advisoryRefsFeed({ orphanReport, skillsDir }));
    } catch (err) {
        warnings.push(`context-graph feed failed: ${errString(err)}`);
    }

    // Cross-skill refs.
    try {
        findings.push(...crossSkillRefsFeed({ skillsDir }));
    } catch (err) {
        warnings.push(`cross-skill-refs feed failed: ${errString(err)}`);
    }

    // Optional: cc-feature from changelog file (network-free).
    if (opts.changelogPath && existsSync(opts.changelogPath)) {
        try {
            const changelogContent = readFileSync(opts.changelogPath, 'utf-8');
            findings.push(...ccFeatureFeed({ changelogContent, state }));
        } catch (err) {
            warnings.push(`cc-feature feed failed: ${errString(err)}`);
        }
    }

    // Obsolescence — reads settings.json, .mcp.json, tool-usage.jsonl.
    try {
        const firstSeen = readFirstSeen();
        findings.push(
            ...obsolescenceFeed({
                settingsJsonPath: join(paiDir, 'settings.json'),
                mcpJsonPath: join(paiDir, '..', '.mcp.json'),
                toolUsageJsonlPath: join(paiDir, 'state', 'tool-usage.jsonl'),
                claudeMdPath: join(paiDir, 'CLAUDE.md'),
                firstSeenUnused: firstSeen,
            }),
        );
    } catch (err) {
        warnings.push(`obsolescence feed failed: ${errString(err)}`);
    }

    // Meta: orphaned-ignore.
    try {
        findings.push(...detectOrphanedIgnores(state, skillsDir));
    } catch (err) {
        warnings.push(`orphaned-ignore detector failed: ${errString(err)}`);
    }

    return { findings, warnings };
}

/** Silence the lint for unused imports we export for agent composition. */
export { paiAuditFeed, externalSkillsFeed, skillPulseFeed, featureUnusedFeed };

// ── First-seen persistence ────────────────────────────────────────────────

export function readFirstSeen(filePath: string = FIRST_SEEN_PATH): FirstSeenMap {
    if (!existsSync(filePath)) return {};
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8')) as FirstSeenMap;
    } catch {
        return {};
    }
}

// ── Plan building ─────────────────────────────────────────────────────────

export interface ReviewPlan {
    timestamp: string;
    totalFindings: number;
    grandfatheredCount: number;
    warnings: string[];
    groups: PlanGroup[];
}

export interface PlanGroup {
    feed: string;
    count: number;
    bulkEligible: boolean;
    bulkThreshold: number;
    findings: Finding[];
}

export function buildPlan(groups: FindingGroup[], warnings: string[]): ReviewPlan {
    return {
        timestamp: new Date().toISOString(),
        totalFindings: groups.reduce((sum, g) => sum + g.findings.length, 0),
        grandfatheredCount: 0,
        warnings,
        groups: groups.map(g => ({
            feed: g.feed,
            count: g.findings.length,
            bulkEligible: g.bulkEligible,
            bulkThreshold: BULK_THRESHOLD,
            findings: g.findings,
        })),
    };
}

// ── Decision application ──────────────────────────────────────────────────

export type BulkAction = 'accept-all' | 'ignore-all-variants' | 'ignore-all-type' | 'review-each';

/** Apply a bulk decision across every finding in a group. */
export function applyBulkDecision(
    group: FindingGroup,
    action: BulkAction,
    state: InboxState,
    queuePath: string,
    now: Date = new Date(),
): { state: InboxState; applied: DiffReport[] } {
    let current = state;
    const applied: DiffReport[] = [];
    const timestamp = now.toISOString();

    for (const finding of group.findings) {
        if (action === 'review-each') continue;
        const key = bulkDecisionToKey(action, finding, timestamp);
        current = recordDecision(current, key);
        if (action === 'accept-all') {
            applied.push(applyAccept(finding, queuePath));
        }
    }
    return { state: current, applied };
}

function bulkDecisionToKey(action: BulkAction, finding: Finding, timestamp: string): ReviewedKey {
    switch (action) {
        case 'accept-all':
            return { id: finding.id, decision: 'accepted', timestamp, variant: finding.variant };
        case 'ignore-all-variants':
            return { id: finding.id, decision: 'ignore-variant', timestamp, variant: finding.variant };
        case 'ignore-all-type':
            return {
                id: `type-lock:${finding.feed}:${finding.source}`,
                decision: 'ignore-type-for-resource',
                timestamp,
                feed: finding.feed,
                source: finding.source,
            };
        case 'review-each':
            // Handled by caller — should never reach here.
            throw new Error('review-each is not a bulk auto-decision');
    }
}

/**
 * Accept one finding — safe-tier applies in place, unsafe-tier queues.
 * Returns a DiffReport either way.
 */
export function applyAccept(finding: Finding, queuePath: string, now: Date = new Date()): DiffReport {
    if (finding.tier === 'safe') {
        return applySafeFinding(finding);
    }
    const queueResult = queueUnsafeFinding(finding, { queuePath, now });
    return { finding, applied: true, file: queueResult.queuePath };
}

// ── CLI entry ─────────────────────────────────────────────────────────────

interface CliOptions {
    dryRun: boolean;
    acceptSafe: boolean;
    queueUnsafe: boolean;
    statePath: string;
    queuePath: string;
    changelogPath?: string;
}

function parseArgs(argv: string[]): CliOptions {
    const opts: CliOptions = {
        dryRun: argv.includes('--dry-run'),
        acceptSafe: argv.includes('--accept-safe'),
        queueUnsafe: argv.includes('--queue-unsafe'),
        statePath: INBOX_STATE_PATH,
        queuePath: ACTION_QUEUE_PATH,
    };

    const stateIdx = argv.indexOf('--state');
    if (stateIdx >= 0 && argv[stateIdx + 1]) opts.statePath = argv[stateIdx + 1];

    const dirIdx = argv.indexOf('--state-dir');
    if (dirIdx >= 0 && argv[dirIdx + 1]) {
        const dir = argv[dirIdx + 1];
        opts.statePath = join(dir, 'cc-upgrade-inbox.json');
        opts.queuePath = join(dir, 'cc-upgrade-action-queue.md');
    }

    const chIdx = argv.indexOf('--changelog');
    if (chIdx >= 0 && argv[chIdx + 1]) opts.changelogPath = argv[chIdx + 1];

    return opts;
}

async function main(): Promise<void> {
    const opts = parseArgs(process.argv.slice(2));

    let state = loadInboxState(opts.statePath);
    const gather = await gatherAllFindings(state, { changelogPath: opts.changelogPath });
    let agg = aggregateFindings(gather.findings, state);

    // Phase 6 — grandfather logic: on the first ever invocation, defer every
    // non-obsolescence finding. Track completion with `firstRunCompleted`
    // rather than emptiness, so a user who cleared their state can opt in
    // to re-grandfathering by deleting the state file.
    const isFirstRun = !state.firstRunCompleted;
    if (isFirstRun) {
        const toGrandfather = agg.allFindings.filter(f => f.feed !== 'obsolescence').map(f => f.id);
        state = {
            ...state,
            grandfathered: [...state.grandfathered, ...toGrandfather],
            firstRunCompleted: true,
        };
        if (!opts.dryRun) saveInboxState(opts.statePath, state);
        // Re-aggregate so the returned plan reflects the grandfather pass.
        agg = aggregateFindings(gather.findings, state);
    } else if (state.grandfathered.length > 0) {
        state = clearGrandfathered(state);
        if (!opts.dryRun) saveInboxState(opts.statePath, state);
    }

    const plan = buildPlan(agg.groups, gather.warnings);
    plan.grandfatheredCount = state.grandfathered.length;

    if (opts.dryRun) {
        console.log(JSON.stringify(plan, null, 2));
        return;
    }

    if (opts.acceptSafe) {
        const applied: DiffReport[] = [];
        for (const group of agg.groups) {
            for (const f of group.findings) {
                if (f.tier !== 'safe') continue;
                const report = applySafeFinding(f);
                applied.push(report);
                if (report.applied) {
                    state = recordDecision(state, {
                        id: f.id,
                        decision: 'accepted',
                        timestamp: new Date().toISOString(),
                        variant: f.variant,
                    });
                }
            }
        }
        saveInboxState(opts.statePath, state);
        console.log(JSON.stringify({ ...plan, appliedCount: applied.length, applied }, null, 2));
        return;
    }

    if (opts.queueUnsafe) {
        const queued: Finding[] = [];
        for (const group of agg.groups) {
            for (const f of group.findings) {
                if (f.tier !== 'unsafe') continue;
                queueUnsafeFinding(f, { queuePath: opts.queuePath });
                queued.push(f);
            }
        }
        console.log(JSON.stringify({ ...plan, queuedCount: queued.length }, null, 2));
        return;
    }

    // Default: emit plan for the invoking agent to drive AskUserQuestion with.
    console.log(JSON.stringify(plan, null, 2));
}

// ── Helpers ───────────────────────────────────────────────────────────────

function errString(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

// Keep type imports touched so downstream consumers don't lose them.
export type { Finding, InboxState, ReviewedKey, FirstSeenMap };
export { updateFirstSeenUnused };

// Direct execution guard
const isDirectExecution =
    import.meta.path === Bun.main || process.argv[1]?.endsWith('review-cli.ts');
if (isDirectExecution && !process.env.CC_UPGRADE_REVIEW_NO_CLI) {
    main().catch(err => {
        console.error('[fatal]', errString(err));
        process.exit(1);
    });
}
