/**
 * Feed: feature-unused
 *
 * Wraps cc-version-check's CompatibilityReport. Emits a Finding per
 * `[OK] [    ]` entry — a feature supported by the installed CC but not
 * detected in use in the repo.
 *
 * Unsafe-tier: adopting a feature typically means meaningful work
 * (migrating a hook, writing a skill), not an auto-apply edit. Queues for
 * JM review.
 *
 * Respects `detectable: false` — environment/CLI-only features (like
 * bedrock, LSP) never emit findings since absence isn't evidence.
 */

import type { Finding } from '../types';

/** Minimal shape of a feature status — mirrors cc-version-check's CompatibilityReport. */
export interface FeatureStatus {
    description: string;
    minVersion: string;
    supported: boolean;
    inUse: boolean;
}

export interface FeatureUnusedFeedInput {
    featureStatus: Record<string, FeatureStatus>;
    /** Optional registry of detectable flags — keyed by feature name. */
    detectable?: Record<string, boolean>;
}

export function featureUnusedFeed(input: FeatureUnusedFeedInput): Finding[] {
    const findings: Finding[] = [];
    for (const [feature, status] of Object.entries(input.featureStatus)) {
        if (!status.supported) continue;
        if (status.inUse) continue;
        // Skip features flagged as non-detectable: absence of evidence
        // doesn't mean absence of adoption for environment/CLI-only flags.
        if (input.detectable && input.detectable[feature] === false) continue;

        findings.push({
            id: `feature-unused:${feature}`,
            feed: 'feature-unused',
            source: `feature/${feature}`,
            variant: status.minVersion,
            message: `Feature "${feature}" is supported (v${status.minVersion}+) but not utilized: ${status.description}`,
            severity: 'info',
            tier: 'unsafe',
            data: { feature, minVersion: status.minVersion, description: status.description },
        });
    }
    return findings;
}
