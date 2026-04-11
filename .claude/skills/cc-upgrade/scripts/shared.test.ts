import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    emptyResult,
    findFiles,
    getSkillDirs,
    isToolCovered,
    parseSkillFrontmatter,
    runAnalysis,
    formatReport,
    type AnalyzerFunction,
} from './shared.ts';

function makeTmpDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-upgrade-test-'));
}

describe('emptyResult', () => {
    test('creates result with given maxScore', () => {
        const result = emptyResult(42);
        expect(result.score).toBe(0);
        expect(result.maxScore).toBe(42);
        expect(result.findings).toEqual([]);
        expect(result.recommendations).toEqual([]);
    });
});

describe('findFiles', () => {
    test('finds files by extension recursively', () => {
        const tmp = makeTmpDir();
        mkdirSync(join(tmp, 'sub'), { recursive: true });
        writeFileSync(join(tmp, 'a.md'), 'hello');
        writeFileSync(join(tmp, 'b.ts'), 'world');
        writeFileSync(join(tmp, 'sub', 'c.md'), 'nested');

        const mdFiles = findFiles(tmp, '.md');
        expect(mdFiles).toHaveLength(2);
        expect(mdFiles.some(f => f.endsWith('a.md'))).toBe(true);
        expect(mdFiles.some(f => f.endsWith('c.md'))).toBe(true);

        const tsFiles = findFiles(tmp, '.ts');
        expect(tsFiles).toHaveLength(1);

        rmSync(tmp, { recursive: true });
    });

    test('returns empty array for nonexistent dir', () => {
        expect(findFiles('/nonexistent-dir-12345', '.md')).toEqual([]);
    });
});

describe('getSkillDirs', () => {
    test('returns directory names', () => {
        const tmp = makeTmpDir();
        mkdirSync(join(tmp, 'skill-a'));
        mkdirSync(join(tmp, 'skill-b'));
        writeFileSync(join(tmp, 'not-a-dir.txt'), '');

        const dirs = getSkillDirs(tmp);
        expect(dirs).toHaveLength(2);
        expect(dirs).toContain('skill-a');
        expect(dirs).toContain('skill-b');

        rmSync(tmp, { recursive: true });
    });

    test('returns empty for nonexistent path', () => {
        expect(getSkillDirs('/nonexistent-12345')).toEqual([]);
    });
});

describe('parseSkillFrontmatter', () => {
    test('parses valid SKILL.md with fork context', () => {
        const tmp = makeTmpDir();
        const skillMd = join(tmp, 'SKILL.md');
        writeFileSync(skillMd, '---\nname: test-skill\ncontext: fork\ndescription: A test\n---\n# Test');

        const parsed = parseSkillFrontmatter(skillMd);
        expect(parsed.valid).toBe(true);
        expect(parsed.name).toBe('test-skill');
        expect(parsed.context).toBe('fork');

        rmSync(tmp, { recursive: true });
    });

    test('parses valid SKILL.md with same context', () => {
        const tmp = makeTmpDir();
        const skillMd = join(tmp, 'SKILL.md');
        writeFileSync(skillMd, '---\nname: core\ncontext: same\n---\n# Core');

        const parsed = parseSkillFrontmatter(skillMd);
        expect(parsed.valid).toBe(true);
        expect(parsed.name).toBe('core');
        expect(parsed.context).toBe('same');

        rmSync(tmp, { recursive: true });
    });

    test('returns invalid for missing frontmatter', () => {
        const tmp = makeTmpDir();
        const skillMd = join(tmp, 'SKILL.md');
        writeFileSync(skillMd, '# No frontmatter here');

        const parsed = parseSkillFrontmatter(skillMd);
        expect(parsed.valid).toBe(false);

        rmSync(tmp, { recursive: true });
    });

    test('returns invalid for missing name', () => {
        const tmp = makeTmpDir();
        const skillMd = join(tmp, 'SKILL.md');
        writeFileSync(skillMd, '---\ncontext: fork\n---\n# No name');

        const parsed = parseSkillFrontmatter(skillMd);
        expect(parsed.valid).toBe(false);

        rmSync(tmp, { recursive: true });
    });

    test('returns invalid for nonexistent file', () => {
        const parsed = parseSkillFrontmatter('/nonexistent/SKILL.md');
        expect(parsed.valid).toBe(false);
        expect(parsed.content).toBe('');
    });
});

describe('runAnalysis', () => {
    test('aggregates scores from modules', () => {
        const modules: Record<string, AnalyzerFunction> = {
            modA: () => ({ score: 5, maxScore: 10, findings: ['found A'], recommendations: [] }),
            modB: () => ({ score: 8, maxScore: 10, findings: [], recommendations: ['fix B'] }),
        };

        const report = runAnalysis('/tmp', modules);
        expect(report.totalScore).toBe(13);
        expect(report.maxScore).toBe(20);
        expect(report.compliancePercentage).toBe(65);
        expect(report.recommendations).toHaveLength(1);
        expect(report.recommendations[0].module).toBe('modB');
    });

    test('handles zero maxScore', () => {
        const modules: Record<string, AnalyzerFunction> = {
            empty: () => ({ score: 0, maxScore: 0, findings: [], recommendations: [] }),
        };

        const report = runAnalysis('/tmp', modules);
        expect(report.compliancePercentage).toBe(0);
    });
});

describe('formatReport', () => {
    test('includes title and score', () => {
        const report = runAnalysis('/tmp', {
            test: () => ({ score: 7, maxScore: 10, findings: ['OK: test'], recommendations: [] }),
        });

        const output = formatReport(report, 'MY REPORT');
        expect(output).toContain('MY REPORT');
        expect(output).toContain('7/10');
        expect(output).toContain('70%');
        expect(output).toContain('OK: test');
    });
});

describe('isToolCovered', () => {
    let root: string;
    let toolsDir: string;
    let centralTestsDir: string;

    // Fixture helpers — keep tests declarative, eliminate repeated filesystem scaffolding
    const tool = (name: string, content = 'export {};') =>
        writeFileSync(join(toolsDir, name), content);
    const importsLib = (lib: string) => `import './${lib}';\nexport {};`;
    const colocatedTest = (stem: string) =>
        writeFileSync(join(toolsDir, `${stem}.test.ts`), 'test("", () => {});');
    const centralTest = (stem: string) =>
        writeFileSync(join(centralTestsDir, `${stem}.test.ts`), 'test("", () => {});');
    const covered = (stem: string) =>
        isToolCovered(join(toolsDir, `${stem}.ts`), centralTestsDir);

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'cov-'));
        toolsDir = join(root, 'skill-x', 'tools');
        centralTestsDir = join(root, 'tests');
        mkdirSync(toolsDir, { recursive: true });
        mkdirSync(centralTestsDir, { recursive: true });
    });

    afterEach(() => { rmSync(root, { recursive: true, force: true }); });

    test('Rule A: same-directory .test.ts', () => {
        tool('foo.ts');
        colocatedTest('foo');
        expect(covered('foo')).toBe(true);
    });

    test('Rule B: centralized test location', () => {
        tool('bar.ts');
        centralTest('bar');
        expect(covered('bar')).toBe(true);
    });

    test('Rule C: -lib.ts whose stem.ts companion is covered', () => {
        tool('baz.ts', importsLib('baz-lib'));
        tool('baz-lib.ts');
        centralTest('baz');
        expect(covered('baz-lib')).toBe(true);
    });

    test('Rule D: -lib.ts imported by covered sibling with different name', () => {
        // miner-lib.ts ← imported by introspect-miner.ts ← centrally tested
        tool('miner-lib.ts');
        tool('introspect-miner.ts', importsLib('miner-lib'));
        centralTest('introspect-miner');
        expect(covered('miner-lib')).toBe(true);
    });

    test('Rule D: explicit .ts extension in import string', () => {
        // analyse-pai.ts uses `from './analyse-pai-lib.ts'` style
        tool('dep-lib.ts');
        tool('importer.ts', `import { x } from './dep-lib.ts';\nexport {};`);
        colocatedTest('importer');
        expect(covered('dep-lib')).toBe(true);
    });

    test('Rule D transitive: two-hop import chain to a covered CLI', () => {
        // Real-world analogue: miner-mode-lib ← miner-trace-lib ← introspect-miner.
        // Synthetic fixture uses generic names to mirror the graph shape.
        tool('leaf-lib.ts');
        tool('middle-lib.ts', importsLib('leaf-lib'));
        tool('root-cli.ts', importsLib('middle-lib'));
        centralTest('root-cli');
        expect(covered('leaf-lib')).toBe(true);
    });

    test('uncovered source returns false', () => {
        tool('lonely.ts');
        expect(covered('lonely')).toBe(false);
    });

    test('non-lib file gets no transitive credit', () => {
        // screenshot-analyze.ts case: not *-lib.ts, so Rules C/D do not apply
        tool('screenshot-analyze.ts');
        tool('other.ts', importsLib('screenshot-analyze'));
        centralTest('other');
        expect(covered('screenshot-analyze')).toBe(false);
    });

    test('cycle-safe: mutual imports terminate', () => {
        tool('a-lib.ts', importsLib('b-lib'));
        tool('b-lib.ts', importsLib('a-lib'));
        expect(covered('a-lib')).toBe(false);
    });
});
