import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    analyzeStructure,
    analyzeSkills,
    analyzeHooks,
    analyzeContext,
    analyzeAgents,
    analyzeTddCompliance,
    BASE_MODULES,
} from './analyse-claude-folder.ts';

function makeTmpDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-folder-test-'));
}

/** Create a minimal .claude/ structure */
function makeClaudeDir(base: string, dirs: string[] = []): string {
    const claudeDir = join(base, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    for (const d of dirs) {
        mkdirSync(join(claudeDir, d), { recursive: true });
    }
    return claudeDir;
}

describe('analyzeStructure', () => {
    test('scores 0 when no .claude/ dir', () => {
        const tmp = makeTmpDir();
        const result = analyzeStructure(tmp);
        expect(result.score).toBe(0);
        expect(result.findings.some(f => f.includes('not found'))).toBe(true);
        rmSync(tmp, { recursive: true });
    });

    test('scores full when all dirs present', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp, ['context', 'skills', 'agents', 'commands', 'hooks']);
        writeFileSync(join(claudeDir, 'settings.json'), '{}');

        const result = analyzeStructure(tmp);
        expect(result.score).toBe(result.maxScore);
        rmSync(tmp, { recursive: true });
    });

    test('partial score for some dirs', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['context', 'skills']);

        const result = analyzeStructure(tmp);
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThan(result.maxScore);
        rmSync(tmp, { recursive: true });
    });
});

describe('analyzeSkills', () => {
    test('returns empty findings when no skills dir', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);

        const result = analyzeSkills(tmp);
        expect(result.score).toBe(0);
        rmSync(tmp, { recursive: true });
    });

    test('detects well-formed skills', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['skills/my-skill']);
        writeFileSync(
            join(tmp, '.claude', 'skills', 'my-skill', 'SKILL.md'),
            '---\nname: my-skill\ncontext: fork\n---\n# My Skill'
        );

        const result = analyzeSkills(tmp);
        expect(result.score).toBeGreaterThan(0);
        expect(result.findings.some(f => f.includes('fork context'))).toBe(true);
        rmSync(tmp, { recursive: true });
    });

    test('warns on missing SKILL.md', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['skills/broken-skill']);

        const result = analyzeSkills(tmp);
        expect(result.findings.some(f => f.includes('missing SKILL.md'))).toBe(true);
        rmSync(tmp, { recursive: true });
    });
});

describe('analyzeHooks', () => {
    test('returns 0 when no settings.json', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);

        const result = analyzeHooks(tmp);
        expect(result.score).toBe(0);
        rmSync(tmp, { recursive: true });
    });

    test('scores for hooks configuration', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
            hooks: {
                PreToolUse: [{ command: 'echo test' }],
                PostToolUse: [{ command: 'echo test' }],
                SessionStart: [{ command: 'echo test' }],
                UserPromptSubmit: [{ command: 'echo test' }],
                Stop: [{ command: 'echo test' }],
            },
        }));

        const result = analyzeHooks(tmp);
        expect(result.score).toBe(15); // 10 for hooks + 5 for all core events
        rmSync(tmp, { recursive: true });
    });

    test('notes missing core events', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp);
        writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
            hooks: { SessionStart: [{ command: 'echo test' }] },
        }));

        const result = analyzeHooks(tmp);
        expect(result.findings.some(f => f.includes('Missing'))).toBe(true);
        rmSync(tmp, { recursive: true });
    });
});

describe('analyzeContext', () => {
    test('returns 0 when no context dir', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);

        const result = analyzeContext(tmp);
        expect(result.score).toBe(0);
        rmSync(tmp, { recursive: true });
    });

    test('warns on oversized context files', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['context']);
        const bigContent = Array(600).fill('line').join('\n');
        writeFileSync(join(tmp, '.claude', 'context', 'big.md'), bigContent);

        const result = analyzeContext(tmp);
        expect(result.recommendations.some(r => r.includes('oversized'))).toBe(true);
        rmSync(tmp, { recursive: true });
    });

    test('scores full for good context structure', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['context', 'context/references']);
        writeFileSync(join(tmp, '.claude', 'context', 'guide.md'), 'Short file\nwith few lines');

        const result = analyzeContext(tmp);
        expect(result.score).toBe(result.maxScore);
        rmSync(tmp, { recursive: true });
    });
});

describe('analyzeAgents', () => {
    test('returns 0 when no agents dir', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);

        const result = analyzeAgents(tmp);
        expect(result.score).toBe(0);
        rmSync(tmp, { recursive: true });
    });

    test('scores for specialized agents', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp, ['agents']);
        writeFileSync(join(tmp, '.claude', 'agents', 'researcher.md'), '# Researcher');
        writeFileSync(join(tmp, '.claude', 'agents', 'reviewer.md'), '# Reviewer');

        const result = analyzeAgents(tmp);
        expect(result.score).toBe(result.maxScore);
        expect(result.findings.some(f => f.includes('specialized'))).toBe(true);
        rmSync(tmp, { recursive: true });
    });
});

describe('analyzeTddCompliance', () => {
    test('scores 0 when no .claude/ dir', () => {
        const tmp = makeTmpDir();
        const result = analyzeTddCompliance(tmp);
        expect(result.score).toBe(0);
        expect(result.findings.join(' ')).toContain('not found');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects test files in .claude/', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp, ['hooks']);
        writeFileSync(join(claudeDir, 'hooks', 'my-hook.ts'), 'export const x = 1;');
        writeFileSync(join(claudeDir, 'hooks', 'my-hook.test.ts'), 'test("x", () => {});');
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('1 test file');
        expect(result.score).toBeGreaterThan(0);
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects test runner in package.json', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);
        writeFileSync(join(tmp, 'package.json'), JSON.stringify({ scripts: { test: 'bun test' } }));
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('Test runner configured');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects test runner in bunfig.toml', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);
        writeFileSync(join(tmp, 'bunfig.toml'), '[test]\ncoverage = true');
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('Test runner configured');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects co-located hook tests', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp, ['hooks']);
        writeFileSync(join(claudeDir, 'hooks', 'security.ts'), 'export const x = 1;');
        writeFileSync(join(claudeDir, 'hooks', 'security.test.ts'), 'test("x", () => {});');
        writeFileSync(join(claudeDir, 'hooks', 'logger.ts'), 'export const y = 1;');
        // logger has NO test
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('1/2 hooks have co-located tests');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects scenario specs with Given/When/Then', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);
        mkdirSync(join(tmp, 'specs'), { recursive: true });
        writeFileSync(join(tmp, 'specs', 'auth.md'), '# Feature: Auth\n\n### Scenario: Login\n- **Given** a user\n- **When** they login\n- **Then** they see dashboard');
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('1 scenario file');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects coverage config', () => {
        const tmp = makeTmpDir();
        makeClaudeDir(tmp);
        writeFileSync(join(tmp, 'bunfig.toml'), '[test]\ncoverageThreshold = 0.80');
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('Coverage configuration');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('detects skipped tests', () => {
        const tmp = makeTmpDir();
        const claudeDir = makeClaudeDir(tmp, ['hooks']);
        writeFileSync(join(claudeDir, 'hooks', 'a.test.ts'), 'it.skip("broken", () => {});');
        const result = analyzeTddCompliance(tmp);
        expect(result.findings.join(' ')).toContain('skipped/todo');
        rmSync(tmp, { recursive: true, force: true });
    });

    test('scores high on qara itself', () => {
        const qara = join(import.meta.dir, '..', '..', '..', '..');
        const result = analyzeTddCompliance(qara);
        // Qara has tests, runner, specs, coverage config — should score well
        expect(result.score).toBeGreaterThanOrEqual(14);
    });
});

describe('BASE_MODULES', () => {
    test('has all 6 expected modules', () => {
        expect(Object.keys(BASE_MODULES)).toEqual(['structure', 'skills', 'hooks', 'tddCompliance', 'context', 'agents']);
    });
});
