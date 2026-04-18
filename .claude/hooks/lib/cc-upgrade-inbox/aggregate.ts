/**
 * cc-upgrade-inbox/aggregate.ts
 *
 * Combines per-feed findings into a single de-duplicated, grouped,
 * state-aware collection the review CLI can consume.
 *
 *   - suppression via isSuppressed() (ignore / grandfather)
 *   - grouping by feed for paginated AskUserQuestion prompts
 *   - bulk threshold signalling (≥5 same-feed findings → bulk prompt)
 *
 * Feed runners live in ./feeds/*.ts. This module sits above them.
 */

import { isSuppressed } from './state';
import type { Finding, FeedType, InboxState } from './types';

export const BULK_THRESHOLD = 5;

export interface FindingGroup {
    feed: FeedType;
    findings: Finding[];
    /** True when bulk prompt should be offered (count ≥ BULK_THRESHOLD). */
    bulkEligible: boolean;
}

export interface AggregateResult {
    allFindings: Finding[];
    groups: FindingGroup[];
    suppressed: Finding[];
}

/**
 * Aggregate findings from every feed: suppress ones the user has already
 * silenced, dedupe by `id`, sort within each group by severity then message,
 * and compute bulk-eligibility per group.
 */
export function aggregateFindings(
    rawFindings: Finding[],
    state: InboxState,
): AggregateResult {
    const seen = new Set<string>();
    const allFindings: Finding[] = [];
    const suppressed: Finding[] = [];

    for (const f of rawFindings) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        if (isSuppressed(f, state)) {
            suppressed.push(f);
            continue;
        }
        allFindings.push(f);
    }

    const byFeed = new Map<FeedType, Finding[]>();
    for (const f of allFindings) {
        const arr = byFeed.get(f.feed) ?? [];
        arr.push(f);
        byFeed.set(f.feed, arr);
    }

    const severityRank: Record<Finding['severity'], number> = {
        error: 0,
        warning: 1,
        info: 2,
    };

    const groups: FindingGroup[] = [];
    for (const [feed, findings] of byFeed) {
        findings.sort((a, b) => {
            const s = severityRank[a.severity] - severityRank[b.severity];
            return s !== 0 ? s : a.message.localeCompare(b.message);
        });
        groups.push({
            feed,
            findings,
            bulkEligible: findings.length >= BULK_THRESHOLD,
        });
    }

    // Stable group order matching the canonical feed ordering.
    const feedOrder: FeedType[] = [
        'obsolescence',
        'cc-feature',
        'cross-skill-unprefixed',
        'advisory-table-ref',
        'orphan',
        'skill-outdated',
        'feature-unused',
        'pai-audit',
        'external-skills',
        'orphaned-ignore',
    ];
    groups.sort((a, b) => feedOrder.indexOf(a.feed) - feedOrder.indexOf(b.feed));

    return { allFindings, groups, suppressed };
}
