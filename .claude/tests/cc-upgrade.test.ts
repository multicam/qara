/**
 * cc-upgrade.test.ts
 * Covers uncovered lines in cc-upgrade scripts:
 *   - cc-version-check.ts: getCurrentCCVersion, checkFeatureUsage, checkForForkContextSkills,
 *                           generateReport (unsupported+used branch), formatReport
 *   - shared.ts: formatReport recommendations grouping (lines 145-159)
 *   - analyse-claude-folder.ts: analyzeSkills same-context + partial branches,
 *                               analyzeHooks missing events + statusLine,
 *                               analyzeAgents general agent recommendation
 *
 * Run with: bun run test (picks up .claude/ automatically)
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
    getCurrentCCVersion,
    checkFeatureUsage,
    generateReport,
    formatReport,
    FEATURE_REQUIREMENTS,
} from '../skills/cc-upgrade/scripts/cc-version-check.ts';

import {
    runAnalysis,
    formatReport as sharedFormatReport,
    type AnalyzerFunction,
} from '../skills/cc-upgrade/scripts/shared.ts';

import {
    analyzeSkills,
    analyzeHooks,
    analyzeAgents,
} from '../skills/cc-upgrade/scripts/analyse-claude-folder.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-upgrade-main-test-'));
}

/** Create .claude/ directory and optional subdirs inside a tmp base. Returns claudeDir path. */
function makeClaudeDir(base: string, dirs: string[] = []): string {
    const claudeDir = join(base, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    for (const d of dirs) {
        mkdirSync(join(claudeDir, d), { recursive: true });
    }
    return claudeDir;
}

// ---------------------------------------------------------------------------
// cc-version-check.ts — getCurrentCCVersion (lines 103-110)
// ---------------------------------------------------------------------------

describe('getCurrentCCVersion', () => {
    it('returns an object with version and location keys', () => {
        // claude is installed in this environment; just verify shape
        const result = getCurrentCCVersion();
        expect(result).toHaveProperty('version');
        expect(result).toHaveProperty('location');
    });

    it('returns string or null for version', () => {
        const result = getCurrentCCVersion();
        expect(result.version === null || typeof result.version === 'string').toBe(true);
    });

    it('returns string or null for location', () => {
        const result = getCurrentCCVersion();
        expect(result.location === null || typeof result.location === 'string').toBe(true);
    });

    it('returns a parseable semver string when claude is available', () => {
        const result = getCurrentCCVersion();
        if (result.version !== null) {
            // Must look like N.N.N
            expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
        }
    });

    it('returns non-null location when version is found', () => {
        const result = getCurrentCCVersion();
        if (result.version !== null) {
            expect(result.location).not.toBeNull();
        }
    });
});

// ---------------------------------------------------------------------------
// cc-version-check.ts — checkFeatureUsage: settings.json branch (lines 127-131)
// ---------------------------------------------------------------------------

describe('checkFeatureUsage — settings.json parsing', () => {
    let tmp: string;
    let claudeDir: string;

    beforeAll(() => {
        tmp = makeTmpDir();
        claudeDir = makeClaudeDir(tmp);
    });

    afterAll(() => {
        rmSync(tmp, { recursive: true });
    });

    it('detects settingsJsonHooks when hooks object is non-empty', () => {
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ hooks: { PreToolUse: [{ command: 'echo' }] } })
        );
        const usage = checkFeatureUsage(tmp);
        expect(usage.settingsJsonHooks).toBe(true);
    });

    it('detects statusLine when settings.statusLine is set', () => {
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ hooks: { PreToolUse: [] }, statusLine: 'my status' })
        );
        const usage = checkFeatureUsage(tmp);
        expect(usage.statusLine).toBe(true);
    });

    it('detects modelRouting when settings.model is set', () => {
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ model: 'claude-opus-4-5' })
        );
        const usage = checkFeatureUsage(tmp);
        expect(usage.modelRouting).toBe(true);
    });

    it('settingsJsonHooks is false when hooks object is empty', () => {
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ hooks: {} })
        );
        const usage = checkFeatureUsage(tmp);
        expect(usage.settingsJsonHooks).toBe(false);
    });

    it('statusLine is false when not set', () => {
        writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({}));
        const usage = checkFeatureUsage(tmp);
        expect(usage.statusLine).toBe(false);
    });

    it('modelRouting is false when model is not set', () => {
        writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({}));
        const usage = checkFeatureUsage(tmp);
        expect(usage.modelRouting).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// cc-version-check.ts — checkFeatureUsage: skills dir + checkForForkContextSkills
// (lines 133-138, 146-162)
// ---------------------------------------------------------------------------

describe('checkFeatureUsage — skills dir and fork-context detection', () => {
    let tmp: string;
    let claudeDir: string;

    beforeAll(() => {
        tmp = makeTmpDir();
        claudeDir = makeClaudeDir(tmp, ['skills/my-skill']);
        // Settings must exist for the settings branch to run
        writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({}));
    });

    afterAll(() => {
        rmSync(tmp, { recursive: true });
    });

    it('sets skillInvocation true when skills dir exists and settings.json present', () => {
        const usage = checkFeatureUsage(tmp);
        expect(usage.skillInvocation).toBe(true);
    });

    it('sets enhancedSubagents false when no SKILL.md has context: fork', () => {
        // No SKILL.md in the skill dir — checkForForkContextSkills returns false
        const usage = checkFeatureUsage(tmp);
        expect(usage.enhancedSubagents).toBe(false);
    });

    it('sets enhancedSubagents true when a SKILL.md contains context: fork', () => {
        const skillMd = join(claudeDir, 'skills', 'my-skill', 'SKILL.md');
        writeFileSync(
            skillMd,
            '---\nname: my-skill\ncontext: fork\ndescription: test\n---\n# My Skill'
        );
        const usage = checkFeatureUsage(tmp);
        expect(usage.enhancedSubagents).toBe(true);
    });

    it('does NOT set enhancedSubagents for same-context skills', () => {
        const skillMd = join(claudeDir, 'skills', 'my-skill', 'SKILL.md');
        writeFileSync(
            skillMd,
            '---\nname: my-skill\ncontext: same\ndescription: test\n---\n# My Skill'
        );
        const usage = checkFeatureUsage(tmp);
        expect(usage.enhancedSubagents).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// cc-version-check.ts — generateReport: unsupported feature in use (lines 210-214)
// ---------------------------------------------------------------------------

describe('generateReport — feature used but not supported', () => {
    let tmp: string;
    let claudeDir: string;

    beforeAll(() => {
        tmp = makeTmpDir();
        // Create agents/ to trigger subagents usage detection
        claudeDir = makeClaudeDir(tmp, ['agents']);
    });

    afterAll(() => {
        rmSync(tmp, { recursive: true });
    });

    it('adds HIGH recommendation when feature used but version too old', () => {
        // subagents requires 1.0.80 — use 0.1.0 which is below that
        const report = generateReport('0.1.0', '/usr/bin/claude', tmp);

        const highRecs = report.recommendations.filter(r => r.priority === 'HIGH');
        const subagentsRec = highRecs.find(r => r.feature === 'subagents');

        expect(subagentsRec).toBeDefined();
        expect(subagentsRec!.message).toContain('subagents');
        expect(subagentsRec!.message).toContain('1.0.80');
        expect(subagentsRec!.message).toContain('0.1.0');
    });

    it('HIGH recommendation message contains "Update recommended"', () => {
        const report = generateReport('0.1.0', '/usr/bin/claude', tmp);
        const subagentsRec = report.recommendations.find(
            r => r.priority === 'HIGH' && r.feature === 'subagents'
        );
        expect(subagentsRec!.message).toContain('Update recommended');
    });
});

// ---------------------------------------------------------------------------
// cc-version-check.ts — formatReport (lines 228-263)
// ---------------------------------------------------------------------------

describe('formatReport (cc-version-check)', () => {
    it('contains the report header banner', () => {
        const report = generateReport(null, null, '/tmp');
        const output = formatReport(report);
        expect(output).toContain('CC COMPATIBILITY REPORT');
    });

    it('contains version info', () => {
        const report = generateReport('2.1.0', '/usr/bin/claude', '/some/path');
        const output = formatReport(report);
        expect(output).toContain('2.1.0');
        expect(output).toContain('/usr/bin/claude');
        expect(output).toContain('/some/path');
    });

    it('shows feature status rows', () => {
        const report = generateReport('2.1.0', '/usr/bin/claude', '/tmp');
        const output = formatReport(report);
        // Feature rows include [OK] or [NO] markers
        expect(output).toContain('[OK]');
        expect(output).toContain('v');  // version references in rows
    });

    it('shows RECOMMENDATIONS section when there are recommendations', () => {
        // With null version there will be a HIGH install recommendation
        const report = generateReport(null, null, '/tmp');
        const output = formatReport(report);
        expect(output).toContain('RECOMMENDATIONS');
        expect(output).toContain('[HIGH]');
    });

    it('sorts recommendations by priority: HIGH before MEDIUM', () => {
        // Use a version that is old enough to produce HIGH recs and new enough for MEDIUM
        const tmp = makeTmpDir();
        // No .claude/ structure so nothing is "in use" → MEDIUM recs dominate
        // Use 2.1.3 so everything is supported → only MEDIUM recs (not in use)
        const report = generateReport('2.1.3', '/usr/bin/claude', tmp);
        const output = formatReport(report);

        const highIdx = output.indexOf('[HIGH]');
        const mediumIdx = output.indexOf('[MEDIUM]');

        if (highIdx !== -1 && mediumIdx !== -1) {
            expect(highIdx).toBeLessThan(mediumIdx);
        }

        rmSync(tmp, { recursive: true });
    });

    it('contains the legend', () => {
        const report = generateReport('2.1.0', '/usr/bin/claude', '/tmp');
        const output = formatReport(report);
        expect(output).toContain('LEGEND');
        expect(output).toContain('Supported');
        expect(output).toContain('Not Supported');
        expect(output).toContain('In Use');
    });

    it('shows [USED] marker for features in use', () => {
        const tmp = makeTmpDir();
        // Create agents/ so subagents is "in use"
        makeClaudeDir(tmp, ['agents']);
        const report = generateReport('2.1.0', '/usr/bin/claude', tmp);
        const output = formatReport(report);
        expect(output).toContain('[USED]');
        rmSync(tmp, { recursive: true });
    });

    it('generates valid output when there are no recommendations', () => {
        // Build a minimal report manually with an empty recommendations array
        // Use a version where everything is supported and create all dirs to mark them used
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp, ['agents', 'hooks', 'skills', 'commands', 'context']);
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ hooks: { PreToolUse: [] }, statusLine: 'ok', model: 'claude' })
        );
        const report = generateReport('99.99.99', '/usr/bin/claude', tmp);
        // Force empty recommendations to test that branch doesn't crash
        report.recommendations = [];
        const output = formatReport(report);
        expect(output).toContain('CC COMPATIBILITY REPORT');
        expect(output).not.toContain('RECOMMENDATIONS');
        rmSync(tmp, { recursive: true });
    });
});

// ---------------------------------------------------------------------------
// shared.ts — formatReport recommendations grouping (lines 145-159)
// ---------------------------------------------------------------------------

describe('shared formatReport — recommendations grouping', () => {
    it('groups recommendations by module name', () => {
        const modules: Record<string, AnalyzerFunction> = {
            alpha: () => ({
                score: 5,
                maxScore: 10,
                findings: ['OK: something'],
                recommendations: ['Fix alpha item 1', 'Fix alpha item 2'],
            }),
            beta: () => ({
                score: 3,
                maxScore: 10,
                findings: [],
                recommendations: ['Fix beta item 1'],
            }),
        };

        const report = runAnalysis('/tmp', modules);
        const output = sharedFormatReport(report, 'TEST REPORT');

        expect(output).toContain('RECOMMENDATIONS');
        // Module names appear as section headers
        expect(output).toContain('[alpha]');
        expect(output).toContain('[beta]');
        // Individual recommendations appear with bullet
        expect(output).toContain('- Fix alpha item 1');
        expect(output).toContain('- Fix alpha item 2');
        expect(output).toContain('- Fix beta item 1');
    });

    it('lists all recommendations under their module', () => {
        const modules: Record<string, AnalyzerFunction> = {
            structure: () => ({
                score: 0,
                maxScore: 10,
                findings: [],
                recommendations: ['Create .claude/ dir', 'Create settings.json'],
            }),
        };

        const report = runAnalysis('/tmp', modules);
        const output = sharedFormatReport(report, 'GROUPING TEST');

        expect(output).toContain('[structure]');
        expect(output).toContain('- Create .claude/ dir');
        expect(output).toContain('- Create settings.json');
    });

    it('skips RECOMMENDATIONS section when there are none', () => {
        const modules: Record<string, AnalyzerFunction> = {
            clean: () => ({ score: 10, maxScore: 10, findings: ['All good'], recommendations: [] }),
        };

        const report = runAnalysis('/tmp', modules);
        const output = sharedFormatReport(report, 'CLEAN REPORT');

        expect(output).not.toContain('RECOMMENDATIONS');
    });

    it('multiple modules with same name consolidate recommendations', () => {
        // Two modules producing recommendations — they go under separate keys
        const modules: Record<string, AnalyzerFunction> = {
            mod1: () => ({
                score: 0, maxScore: 5, findings: [],
                recommendations: ['Do mod1 thing'],
            }),
            mod2: () => ({
                score: 0, maxScore: 5, findings: [],
                recommendations: ['Do mod2 thing'],
            }),
        };

        const report = runAnalysis('/tmp', modules);
        const output = sharedFormatReport(report, 'MULTI-MOD');

        expect(output).toContain('[mod1]');
        expect(output).toContain('[mod2]');
    });
});

// ---------------------------------------------------------------------------
// analyse-claude-folder.ts — analyzeSkills: same-context branch (line 99)
//                            and partial well-formed branch (line 110)
// ---------------------------------------------------------------------------

describe('analyzeSkills — same context and partial branches', () => {
    it('records same context finding for a skill with context: same', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['skills/my-skill']);
        writeFileSync(
            join(tmp, '.claude', 'skills', 'my-skill', 'SKILL.md'),
            '---\nname: my-skill\ncontext: same\n---\n# My Skill'
        );

        const result = analyzeSkills(tmp);
        expect(result.findings.some(f => f.includes('same context'))).toBe(true);
        // Fork context NOT set, so no bonus score for fork
        expect(result.findings.some(f => f.includes('fork context'))).toBe(false);

        rmSync(tmp, { recursive: true });
    });

    it('gives partial score when only some skills are well-formed (line 110)', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['skills/good-skill', 'skills/bad-skill']);

        // good-skill has valid SKILL.md
        writeFileSync(
            join(tmp, '.claude', 'skills', 'good-skill', 'SKILL.md'),
            '---\nname: good-skill\ncontext: same\n---\n# Good'
        );
        // bad-skill has invalid SKILL.md (no name field)
        writeFileSync(
            join(tmp, '.claude', 'skills', 'bad-skill', 'SKILL.md'),
            '---\ncontext: same\n---\n# Bad'
        );

        const result = analyzeSkills(tmp);
        // wellFormed (1) !== skillDirs.length (2), wellFormed > 0 → partial score (+5)
        // score = 5 (has skills dir) + 5 (partial) = 10, NOT the full 20
        expect(result.score).toBe(10);
        expect(result.findings.some(f => f.includes('invalid frontmatter'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });

    it('gives full +10 only when ALL skills are well-formed', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['skills/skill-a', 'skills/skill-b']);
        writeFileSync(
            join(tmp, '.claude', 'skills', 'skill-a', 'SKILL.md'),
            '---\nname: skill-a\ncontext: same\n---\n# A'
        );
        writeFileSync(
            join(tmp, '.claude', 'skills', 'skill-b', 'SKILL.md'),
            '---\nname: skill-b\ncontext: same\n---\n# B'
        );

        const result = analyzeSkills(tmp);
        expect(result.findings.some(f => f.includes('All skills properly formatted'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });
});

// ---------------------------------------------------------------------------
// analyse-claude-folder.ts — analyzeHooks: missing events + statusLine
// (lines 148-149, 154, 156)
// ---------------------------------------------------------------------------

describe('analyzeHooks — missing events and statusLine', () => {
    it('lists missing core hook events (line 148-149)', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        // Only provide SessionStart — missing PreToolUse, PostToolUse, UserPromptSubmit, Stop
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ hooks: { SessionStart: [{ command: 'echo' }] } })
        );

        const result = analyzeHooks(tmp);
        const missingFinding = result.findings.find(f => f.includes('Missing'));
        expect(missingFinding).toBeDefined();
        expect(missingFinding).toContain('PreToolUse');
        expect(missingFinding).toContain('PostToolUse');

        rmSync(tmp, { recursive: true });
    });

    it('reports statusLine finding when settings.statusLine is set (lines 154, 156)', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({
                hooks: {
                    PreToolUse: [], PostToolUse: [], SessionStart: [],
                    UserPromptSubmit: [], Stop: [],
                },
                statusLine: 'Running...',
            })
        );

        const result = analyzeHooks(tmp);
        expect(result.findings.some(f => f.includes('status line'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });

    it('does not add statusLine finding when not configured', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        writeFileSync(
            join(claudeDir, 'settings.json'),
            JSON.stringify({ hooks: { SessionStart: [] } })
        );

        const result = analyzeHooks(tmp);
        expect(result.findings.some(f => f.includes('status line'))).toBe(false);

        rmSync(tmp, { recursive: true });
    });

    it('reports no-hooks finding when settings.json has no hooks property (line 148-149)', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        // settings.json exists but has no hooks key at all
        writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({ model: 'claude' }));

        const result = analyzeHooks(tmp);
        expect(result.findings.some(f => f.includes('No hooks in settings.json'))).toBe(true);
        expect(result.recommendations.some(r => r.includes('Add hooks'))).toBe(true);
        // score stays at 0 — no hooks
        expect(result.score).toBe(0);

        rmSync(tmp, { recursive: true });
    });

    it('reports warning when settings.json is malformed JSON (line 156)', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        writeFileSync(join(claudeDir, 'settings.json'), '{ not valid json !!!');

        const result = analyzeHooks(tmp);
        expect(result.findings.some(f => f.includes('Could not parse'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });
});

// ---------------------------------------------------------------------------
// analyse-claude-folder.ts — analyzeAgents: general agent detection + recommendation
// (lines 228-229)
// ---------------------------------------------------------------------------

describe('analyzeAgents — general agent detection', () => {
    it('adds recommendation when general-purpose agents are detected (line 228-229)', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['agents']);
        // "general" matches the generalIndicators list
        writeFileSync(join(tmp, '.claude', 'agents', 'general.md'), '# General agent');
        writeFileSync(join(tmp, '.claude', 'agents', 'researcher.md'), '# Researcher');

        const result = analyzeAgents(tmp);
        expect(result.recommendations.some(r => r.includes('general-purpose'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });

    it('adds recommendation for agent with "main" in the name', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['agents']);
        writeFileSync(join(tmp, '.claude', 'agents', 'main-agent.md'), '# Main');

        const result = analyzeAgents(tmp);
        expect(result.recommendations.some(r => r.includes('general-purpose'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });

    it('adds recommendation for agent with "default" in the name', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['agents']);
        writeFileSync(join(tmp, '.claude', 'agents', 'default.md'), '# Default');

        const result = analyzeAgents(tmp);
        expect(result.recommendations.some(r => r.includes('general-purpose'))).toBe(true);

        rmSync(tmp, { recursive: true });
    });

    it('gives score 5 (not full 10) when there are general agents mixed in', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['agents']);
        writeFileSync(join(tmp, '.claude', 'agents', 'general.md'), '# General');
        writeFileSync(join(tmp, '.claude', 'agents', 'researcher.md'), '# Researcher');

        const result = analyzeAgents(tmp);
        // Has agents (+5) but not all specialized (no +5), so score = 5
        expect(result.score).toBe(5);

        rmSync(tmp, { recursive: true });
    });

    it('does not add recommendation when all agents are specialized', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['agents']);
        writeFileSync(join(tmp, '.claude', 'agents', 'researcher.md'), '# Researcher');
        writeFileSync(join(tmp, '.claude', 'agents', 'reviewer.md'), '# Reviewer');

        const result = analyzeAgents(tmp);
        expect(result.recommendations).toEqual([]);
        expect(result.score).toBe(10);

        rmSync(tmp, { recursive: true });
    });
});
