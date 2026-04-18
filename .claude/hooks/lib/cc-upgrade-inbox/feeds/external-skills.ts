/**
 * Feed: external-skills
 *
 * Wraps analyse-external-skills' Report. Same shape as pai-audit (module-keyed
 * recommendations), kept as a separate feed because the actions JM takes
 * differ — external-skills recommendations are usually "install X" or
 * "remove Y" rather than "refactor Z".
 */

import type { Report } from '../../../../skills/cc-upgrade/scripts/shared';
import type { Finding } from '../types';
import { digest } from './hash';

export interface ExternalSkillsFeedInput {
    report: Report;
}

export function externalSkillsFeed(input: ExternalSkillsFeedInput): Finding[] {
    const findings: Finding[] = [];
    for (const rec of input.report.recommendations) {
        findings.push({
            id: `external-skills:${rec.module}:${digest(rec.recommendation)}`,
            feed: 'external-skills',
            source: `external-skills/${rec.module}`,
            variant: rec.recommendation,
            message: `[external-skills/${rec.module}] ${rec.recommendation}`,
            severity: 'info',
            tier: 'unsafe',
            data: { module: rec.module, recommendation: rec.recommendation },
        });
    }
    return findings;
}
