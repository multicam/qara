/**
 * Feed: cc-feature
 *
 * Wraps cc-feature-sync's `findNewCandidates` / `filterSinceBaseline` pipeline
 * and emits a Finding per untracked feature candidate since the baseline CC
 * version recorded in inbox state.
 *
 * Accept semantics — the CLI's safe-tier handler will append the accepted
 * candidate to FEATURE_REQUIREMENTS in cc-version-check.ts.
 */

import {
    parseChangelog,
    findNewCandidates,
    filterSinceBaseline,
    type NewFeatureCandidate,
} from '../../../../skills/cc-upgrade/scripts/cc-feature-sync';
import type { Finding, InboxState } from '../types';

/** Inputs accepted by the cc-feature feed — decoupled from network I/O. */
export interface CcFeatureFeedInput {
    changelogContent: string;
    state: InboxState;
}

/**
 * Emit findings for candidates not yet tracked in FEATURE_REQUIREMENTS and
 * newer than the `cc-feature` baseline watermark in state.
 *
 * Returns an empty array when the changelog can't be parsed.
 */
export function ccFeatureFeed(input: CcFeatureFeedInput): Finding[] {
    const baseline = input.state.lastReviewedVersion['cc-feature'] ?? null;
    const allEntries = parseChangelog(input.changelogContent);
    const entries = filterSinceBaseline(allEntries, baseline);
    const candidates = findNewCandidates(entries);
    return candidates.map(toFinding);
}

function toFinding(c: NewFeatureCandidate): Finding {
    return {
        id: `cc-feature:${c.suggestedKey}`,
        feed: 'cc-feature',
        source: `FEATURE_REQUIREMENTS.${c.suggestedKey}`,
        variant: c.description,
        message: `v${c.version}: ${c.description}`,
        severity: 'info',
        tier: 'safe',
        data: {
            version: c.version,
            suggestedKey: c.suggestedKey,
            description: c.description,
        },
    };
}
