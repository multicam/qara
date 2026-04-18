/**
 * Feed: cross-skill-unprefixed
 *
 * Wraps `validateCrossSkillRefs` from skill-validator-lib. For each skill's
 * body + workflows, we emit a Finding per unprefixed cross-skill ref.
 *
 * Safe-tier: the review CLI rewrites the ref to use `../` prefix.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { validateCrossSkillRefs } from '../../skill-validator-lib';
import type { Finding } from '../types';
import { canonicalizeSource } from '../state';

export interface CrossSkillRefsFeedInput {
    skillsDir: string;
}

/**
 * Collect cross-skill unprefixed refs across every skill directory under
 * `skillsDir`. Returns one Finding per unique (skill, ref) pair.
 */
export function crossSkillRefsFeed(input: CrossSkillRefsFeedInput): Finding[] {
    const findings: Finding[] = [];
    if (!existsSync(input.skillsDir)) return findings;

    for (const skillName of readdirSync(input.skillsDir)) {
        const skillDir = join(input.skillsDir, skillName);
        let isDir: boolean;
        try {
            isDir = statSync(skillDir).isDirectory();
        } catch {
            continue;
        }
        if (!isDir) continue;

        const skillMdPath = join(skillDir, 'SKILL.md');
        if (!existsSync(skillMdPath)) continue;

        const body = readBody(skillMdPath);
        const violations = validateCrossSkillRefs(skillDir, input.skillsDir, body);

        for (const v of violations) {
            // Extract the ref from the detail line — the validator already
            // formatted it as `…\`<ref>\` must use \`../\` prefix…`.
            const refMatch = v.detail.match(/`([^`]+)`/);
            const refPath = refMatch?.[1] ?? v.detail;
            const canonical = canonicalizeSource(skillMdPath, input.skillsDir);
            findings.push({
                id: `cross-skill-unprefixed:${canonical}:${refPath}`,
                feed: 'cross-skill-unprefixed',
                source: skillMdPath,
                skillName,
                variant: refPath,
                message: v.detail,
                severity: 'warning',
                tier: 'safe',
                data: { ref: refPath },
            });
        }
    }
    return findings;
}

function readBody(skillMdPath: string): string {
    try {
        const content = readFileSync(skillMdPath, 'utf-8');
        // Strip frontmatter to match validateCrossSkillRefs' contract.
        const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
        return match ? match[1] : content;
    } catch {
        return '';
    }
}
