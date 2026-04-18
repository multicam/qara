/**
 * Feed: advisory-table-ref
 *
 * Wraps the advisory broken-table-ref output from context-graph's OrphanReport.
 * These are "ref first segment matches a sibling skill but target does not
 * exist" findings — i.e. missing `../` prefix for cross-skill table-cell refs.
 *
 * Safe-tier: the review CLI auto-rewrites the ref by prepending `../`.
 */

import type { OrphanReport } from '../../context-graph/types';
import type { Finding } from '../types';
import { canonicalizeSource } from '../state';

export interface AdvisoryRefsFeedInput {
    orphanReport: OrphanReport;
    skillsDir: string;
}

export function advisoryRefsFeed(input: AdvisoryRefsFeedInput): Finding[] {
    const findings: Finding[] = [];
    for (const adv of input.orphanReport.advisoryBrokenReferences) {
        const canonical = canonicalizeSource(adv.source, input.skillsDir);
        findings.push({
            id: `advisory-table-ref:${canonical}:${adv.ref}`,
            feed: 'advisory-table-ref',
            source: adv.source,
            variant: adv.ref,
            message: `Advisory: table-cell ref \`${adv.ref}\` at ${adv.source}:${adv.lineNumber} may need \`../\` prefix`,
            severity: 'warning',
            tier: 'safe',
            data: { ref: adv.ref, lineNumber: adv.lineNumber },
        });
    }
    return findings;
}
