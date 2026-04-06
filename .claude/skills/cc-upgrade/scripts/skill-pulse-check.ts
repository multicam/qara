#!/usr/bin/env bun
/**
 * skill-pulse-check.ts
 * CLI orchestration for the skill ecosystem pulse report.
 * All types + library functions live in skill-pulse-lib.ts.
 *
 * Usage: bun skill-pulse-check.ts [--verbose] [--json]
 *
 * Reads symlinked skills in .claude/skills/, queries GitHub API for:
 *   - Latest commit date
 *   - Star count
 *   - Latest release tag
 * Compares installed versions (from .claude-plugin/plugin.json or SKILL.md)
 * against upstream and outputs a structured ecosystem pulse report.
 */

import {
    readLockFile,
    findSymlinkedSkills,
    fetchUpstream,
    getGithubToken,
    isOutdated,
    daysSince,
    activityStatus,
    formatReport,
    log,
    type SkillPulseEntry,
    type UpstreamData,
    type PulseReport,
} from './skill-pulse-lib';

import { join } from 'path';

// Re-export everything for backward compat (tests import from this file)
export * from './skill-pulse-lib';

// --- Main ---

async function main(): Promise<void> {
    const skillsPath = join(process.cwd(), '.claude', 'skills');

    console.log(`Scanning skills in: ${skillsPath}\n`);

    const lockFile = readLockFile();
    log(`Lock file: ${lockFile ? `v${lockFile.version}, ${Object.keys(lockFile.skills).length} skills` : 'not found'}`);

    const skills = findSymlinkedSkills(skillsPath, lockFile);

    if (skills.length === 0) {
        console.log('No symlinked external skills found in .claude/skills/');
        console.log('Install skills with: npx skills@latest add owner/repo');
        process.exit(0);
    }

    console.log(`Found ${skills.length} symlinked skill(s). Querying GitHub API...\n`);

    const token = getGithubToken();
    if (token) {
        log('GitHub token found — using authenticated API calls');
    } else {
        log('No GitHub token — using unauthenticated API (60 req/hr limit)');
    }

    // Fetch upstream data for skills with known repos (with a small concurrency limit)
    const CONCURRENCY = 3;
    const entries: SkillPulseEntry[] = [];

    for (let i = 0; i < skills.length; i += CONCURRENCY) {
        const batch = skills.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(async (skill) => {
            let upstream: UpstreamData;

            if (skill.githubRepo) {
                upstream = await fetchUpstream(skill.githubRepo, token);
            } else {
                upstream = {
                    latestTag: null,
                    latestCommitDate: null,
                    stars: null,
                    openIssues: null,
                    defaultBranch: null,
                    fetchError: 'No GitHub repository identified',
                };
            }

            const days = upstream.latestCommitDate
                ? daysSince(upstream.latestCommitDate)
                : null;

            return {
                skill,
                upstream,
                isOutdated: isOutdated(skill.installedVersion, upstream.latestTag),
                daysSinceUpstreamCommit: days,
                activityStatus: activityStatus(days),
            } satisfies SkillPulseEntry;
        }));

        entries.push(...results);

        // Brief pause between batches to be a good citizen with the GitHub API
        if (i + CONCURRENCY < skills.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    const report: PulseReport = {
        timestamp: new Date().toISOString(),
        skillsPath,
        total: skills.length,
        withGithubRepo: skills.filter(s => s.githubRepo !== null).length,
        outdated: entries.filter(e => e.isOutdated).length,
        stale: entries.filter(e => e.activityStatus === 'stale').length,
        entries,
        lockFilePresent: lockFile !== null,
    };

    console.log(formatReport(report));

    if (process.argv.includes('--json')) {
        console.log('\n--- JSON OUTPUT ---\n');
        console.log(JSON.stringify(report, null, 2));
    }
}

// Direct execution guard
const isDirectExecution =
    import.meta.path === Bun.main || process.argv[1]?.endsWith('skill-pulse-check.ts');
if (isDirectExecution && !process.env.SKILL_PULSE_NO_CLI) {
    main().catch(err => {
        console.error('[fatal]', err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
}
