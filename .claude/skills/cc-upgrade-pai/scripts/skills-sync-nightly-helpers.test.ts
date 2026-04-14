/**
 * Smoke tests for skills-sync-nightly-helpers CLI adapter.
 *
 * The helper is a thin argv parser around skills-detect-lib. Full detection
 * logic is covered in skills-detect-lib.test.ts; this file verifies the CLI
 * contract: subcommand routing, required-flag errors, JSON output shape.
 */

import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'bun';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const HELPER = join(import.meta.dir, 'skills-sync-nightly-helpers.ts');

function run(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
    const proc = spawnSync(['bun', HELPER, ...args], { stdout: 'pipe', stderr: 'pipe' });
    return {
        stdout: new TextDecoder().decode(proc.stdout),
        stderr: new TextDecoder().decode(proc.stderr),
        exitCode: proc.exitCode ?? -1,
    };
}

function makeFixtureSkill(dir: string, name: string, description: string): string {
    const skillDir = join(dir, name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\nbody\n`);
    return skillDir;
}

describe('helpers CLI', () => {
    it('exits non-zero with an unknown subcommand', () => {
        const r = run('bogus');
        expect(r.exitCode).not.toBe(0);
        expect(r.stderr).toContain('Unknown subcommand');
    });

    it('detect requires --old and --new', () => {
        const r = run('detect');
        expect(r.exitCode).not.toBe(0);
        expect(r.stderr).toContain('Usage: detect');
    });

    it('detect returns valid JSON with flagged field', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'helper-test-'));
        try {
            const oldDir = makeFixtureSkill(tmp, 'foo-old', 'same purpose');
            const newDir = makeFixtureSkill(tmp, 'foo-new', 'same purpose');
            const r = run('detect', '--old', oldDir, '--new', newDir, '--skip-semantic');
            expect(r.exitCode).toBe(0);
            const parsed = JSON.parse(r.stdout);
            expect(parsed).toHaveProperty('flagged');
            expect(typeof parsed.flagged).toBe('boolean');
            expect(parsed).toHaveProperty('structuralChanges');
            expect(Array.isArray(parsed.structuralChanges)).toBe(true);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('render requires --name and --detect', () => {
        const r = run('render');
        expect(r.exitCode).not.toBe(0);
        expect(r.stderr).toContain('Usage: render');
    });

    it('render rejects invalid JSON in --detect', () => {
        const r = run('render', '--name', 'foo', '--detect', 'not-json');
        expect(r.exitCode).not.toBe(0);
        expect(r.stderr).toContain('Invalid --detect JSON');
    });

    it('render produces markdown with skill name and diff block', () => {
        const detect = JSON.stringify({
            flagged: true,
            reasons: ['frontmatter: description changed'],
            structuralChanges: [{ kind: 'frontmatter', detail: 'description: a → b' }],
            semanticChange: null,
        });
        const r = run('render', '--name', 'testskill', '--detect', detect, '--diff', '-a\n+b');
        expect(r.exitCode).toBe(0);
        expect(r.stdout).toContain('## testskill');
        expect(r.stdout).toContain('```diff');
        expect(r.stdout).toContain('-a');
    });
});
