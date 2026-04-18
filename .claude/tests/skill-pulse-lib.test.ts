/**
 * Tests for skill-pulse-lib.ts — PAI-local maintenance classification.
 *
 * Adds a `maintenance: 'upstream' | 'local'` field to InstalledSkill so skills
 * deliberately not upstream-tracked (per DECISIONS.md 2026-04-15) are correctly
 * reported as locally maintained instead of flagged as "no repository URL found".
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    readMaintenance,
    findSymlinkedSkills,
    formatReport,
    type InstalledSkill,
    type PulseReport,
    type SkillPulseEntry,
} from '../skills/cc-upgrade/scripts/skill-pulse-lib.ts';

let tmpRoot: string;
let skillsExternalDir: string;
let skillsDir: string;

beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'pulse-lib-'));
    skillsExternalDir = join(tmpRoot, 'skills-external');
    skillsDir = join(tmpRoot, 'skills');
    mkdirSync(skillsExternalDir, { recursive: true });
    mkdirSync(skillsDir, { recursive: true });
});

afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
});

function makeExternalSkill(name: string, pluginJson?: Record<string, unknown>): string {
    const skillDir = join(skillsExternalDir, name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---\nname: ${name}\n---\n\nbody\n`);
    if (pluginJson) {
        mkdirSync(join(skillDir, '.claude-plugin'), { recursive: true });
        writeFileSync(
            join(skillDir, '.claude-plugin', 'plugin.json'),
            JSON.stringify(pluginJson, null, 2),
        );
    }
    symlinkSync(skillDir, join(skillsDir, name));
    return skillDir;
}

describe('readMaintenance', () => {
    test('returns "local" when plugin.json has maintenance: "local"', () => {
        const skillDir = makeExternalSkill('harden', { maintenance: 'local' });
        expect(readMaintenance(skillDir)).toBe('local');
    });

    test('returns "upstream" when plugin.json has no maintenance field (default)', () => {
        const skillDir = makeExternalSkill('visual-explainer', { version: '1.0.0' });
        expect(readMaintenance(skillDir)).toBe('upstream');
    });

    test('returns "upstream" when no plugin.json present', () => {
        const skillDir = makeExternalSkill('plain');
        expect(readMaintenance(skillDir)).toBe('upstream');
    });

    test('returns "upstream" for unknown maintenance values', () => {
        const skillDir = makeExternalSkill('weird', { maintenance: 'something-else' });
        expect(readMaintenance(skillDir)).toBe('upstream');
    });
});

describe('findSymlinkedSkills — maintenance field', () => {
    test('sets maintenance: "local" for skills with plugin.json flag', () => {
        makeExternalSkill('harden', { maintenance: 'local' });
        const skills = findSymlinkedSkills(skillsDir, null);
        const harden = skills.find(s => s.name === 'harden');
        expect(harden).toBeDefined();
        expect(harden!.maintenance).toBe('local');
    });

    test('sets maintenance: "upstream" when no flag present', () => {
        makeExternalSkill('visual-explainer', { version: '1.0.0' });
        const skills = findSymlinkedSkills(skillsDir, null);
        const ve = skills.find(s => s.name === 'visual-explainer');
        expect(ve).toBeDefined();
        expect(ve!.maintenance).toBe('upstream');
    });
});

describe('formatReport — PAI-local skills', () => {
    function makeEntry(overrides: Partial<InstalledSkill>): SkillPulseEntry {
        return {
            skill: {
                name: 'harden',
                symlinkTarget: '../skills-external/harden',
                installedVersion: null,
                githubRepo: null,
                installedAt: null,
                updatedAt: null,
                maintenance: 'local',
                ...overrides,
            },
            upstream: {
                latestTag: null, latestCommitDate: null, stars: null,
                openIssues: null, defaultBranch: null, fetchError: null,
            },
            isOutdated: false,
            daysSinceUpstreamCommit: null,
            activityStatus: 'unknown',
        };
    }

    function makeReport(entries: SkillPulseEntry[]): PulseReport {
        return {
            timestamp: '2026-04-18T00:00:00Z',
            skillsPath: '/tmp/skills',
            total: entries.length,
            withGithubRepo: entries.filter(e => e.skill.githubRepo !== null).length,
            outdated: 0,
            stale: 0,
            entries,
            lockFilePresent: false,
        };
    }

    test('local skill renders with [LOCAL ] label, not [?     ]', () => {
        const report = makeReport([makeEntry({ maintenance: 'local' })]);
        const output = formatReport(report);
        expect(output).toContain('[LOCAL ]');
        expect(output).not.toContain('[?     ] harden');
    });

    test('local skill does NOT appear under "SKILLS WITHOUT GITHUB TRACKING"', () => {
        const report = makeReport([makeEntry({ maintenance: 'local' })]);
        const output = formatReport(report);
        // Extract only the "SKILLS WITHOUT GITHUB TRACKING" section if present
        const section = output.split('--- SKILLS WITHOUT GITHUB TRACKING ---')[1] ?? '';
        expect(section).not.toContain('harden');
    });

    test('upstream skill without repo still appears under "SKILLS WITHOUT GITHUB TRACKING"', () => {
        const report = makeReport([makeEntry({ name: 'other', maintenance: 'upstream' })]);
        const output = formatReport(report);
        expect(output).toContain('--- SKILLS WITHOUT GITHUB TRACKING ---');
        expect(output).toContain('other: no repository URL found');
    });
});
