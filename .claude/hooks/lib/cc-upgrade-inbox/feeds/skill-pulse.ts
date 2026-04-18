/**
 * Feed: skill-outdated
 *
 * Wraps skill-pulse-lib's PulseReport. Emits a Finding per:
 *   - outdated external skill (installed tag < upstream tag)
 *   - stale external skill (no upstream commit in 90+ days)
 *
 * PAI-local skills (`maintenance: 'local'`) are skipped — they're
 * deliberately repo-tracked, not upstream-tracked.
 *
 * Safe-tier: accept handler runs `npx skills update <name>`.
 */

import type { PulseReport } from '../../../../skills/cc-upgrade/scripts/skill-pulse-lib';
import type { Finding } from '../types';

export interface SkillPulseFeedInput {
    pulseReport: PulseReport;
}

export function skillPulseFeed(input: SkillPulseFeedInput): Finding[] {
    const findings: Finding[] = [];

    for (const entry of input.pulseReport.entries) {
        // PAI-local skills are excluded from outdated/stale notifications —
        // they don't have upstream tags to compare against.
        if (entry.skill.maintenance === 'local') continue;

        const name = entry.skill.name;

        if (entry.isOutdated) {
            findings.push({
                id: `skill-outdated:${name}`,
                feed: 'skill-outdated',
                source: name,
                variant: `${entry.skill.installedVersion}→${entry.upstream.latestTag}`,
                message: `Skill ${name} is outdated: installed ${entry.skill.installedVersion} → upstream ${entry.upstream.latestTag}`,
                severity: 'info',
                tier: 'safe',
                data: {
                    installedVersion: entry.skill.installedVersion,
                    latestTag: entry.upstream.latestTag,
                    githubRepo: entry.skill.githubRepo,
                },
            });
        }

        if (entry.activityStatus === 'stale') {
            findings.push({
                id: `skill-stale:${name}`,
                feed: 'skill-outdated',
                source: name,
                variant: `stale-${entry.daysSinceUpstreamCommit}d`,
                message: `Skill ${name} is stale: ${entry.daysSinceUpstreamCommit} days since upstream commit`,
                severity: 'warning',
                tier: 'unsafe', // removal/replacement is a judgement call
                data: {
                    daysSinceUpstreamCommit: entry.daysSinceUpstreamCommit,
                    githubRepo: entry.skill.githubRepo,
                },
            });
        }
    }

    return findings;
}
