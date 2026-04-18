/**
 * Feed: pai-audit
 *
 * Wraps analyse-pai's Report. Each module's recommendations (HIGH/MEDIUM/LOW)
 * becomes a Finding. Findings inherit the module name as the resource so
 * repeat recommendations across runs remain tracked.
 *
 * Unsafe-tier: PAI audit recommendations are judgement calls, not mechanical
 * edits — queued for JM's direct action.
 */

import type { Report } from '../../../../skills/cc-upgrade/scripts/shared';
import type { Finding } from '../types';
import { digest } from './hash';

export interface PaiAuditFeedInput {
    report: Report;
}

export function paiAuditFeed(input: PaiAuditFeedInput): Finding[] {
    const findings: Finding[] = [];
    for (const rec of input.report.recommendations) {
        findings.push({
            id: `pai-audit:${rec.module}:${digest(rec.recommendation)}`,
            feed: 'pai-audit',
            source: `pai-audit/${rec.module}`,
            variant: rec.recommendation,
            message: `[${rec.module}] ${rec.recommendation}`,
            severity: 'info',
            tier: 'unsafe',
            data: { module: rec.module, recommendation: rec.recommendation },
        });
    }
    return findings;
}
