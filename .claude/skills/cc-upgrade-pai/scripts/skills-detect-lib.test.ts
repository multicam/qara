/**
 * Tests for skills-detect-lib — external skill change detection.
 *
 * Covers: structural diff (frontmatter, workflows/, references/),
 * semantic diff via Gemma (mocked), combined signal, review artifact format.
 */

import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    detectChanges,
    renderReviewEntry,
    type DetectInput,
    type DetectOutput,
} from './skills-detect-lib';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let tmpRoot: string;

beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'skills-detect-test-'));
});

afterEach(() => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

function makeSkill(
    dir: string,
    name: string,
    frontmatter: Record<string, string>,
    opts: { workflows?: string[]; references?: string[]; body?: string } = {},
): string {
    const skillDir = join(dir, name);
    mkdirSync(skillDir, { recursive: true });
    const fm = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join('\n');
    const body = opts.body ?? '# Skill body\n';
    writeFileSync(join(skillDir, 'SKILL.md'), `---\n${fm}\n---\n\n${body}`);
    if (opts.workflows?.length) {
        mkdirSync(join(skillDir, 'workflows'), { recursive: true });
        for (const w of opts.workflows) {
            writeFileSync(join(skillDir, 'workflows', w), '# workflow\n');
        }
    }
    if (opts.references?.length) {
        mkdirSync(join(skillDir, 'references'), { recursive: true });
        for (const r of opts.references) {
            writeFileSync(join(skillDir, 'references', r), '# reference\n');
        }
    }
    return skillDir;
}

type SkillSpec = { fm: Record<string, string>; opts?: Parameters<typeof makeSkill>[3] };

let pairCounter = 0;
async function detectPair(
    oldSpec: SkillSpec,
    newSpec: SkillSpec,
    extra: Partial<DetectInput> = {},
): Promise<DetectOutput> {
    const idx = pairCounter++;
    const oldDir = makeSkill(tmpRoot, `p${idx}-old`, oldSpec.fm, oldSpec.opts);
    const newDir = makeSkill(tmpRoot, `p${idx}-new`, newSpec.fm, newSpec.opts);
    return detectChanges({ oldSkillDir: oldDir, newSkillDir: newDir, ...extra });
}

// ─── Structural diff ─────────────────────────────────────────────────────────

describe('structural diff', () => {
    it('flags when description changes', async () => {
        const out = await detectPair(
            { fm: { name: 'foo', description: 'old purpose' } },
            { fm: { name: 'foo', description: 'NEW purpose' } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(true);
        expect(out.structuralChanges.some(c => c.kind === 'frontmatter' && c.detail.includes('description'))).toBe(true);
    });

    it('flags when version changes', async () => {
        const out = await detectPair(
            { fm: { name: 'foo', version: '1.0.0' } },
            { fm: { name: 'foo', version: '2.0.0' } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(true);
        expect(out.structuralChanges.some(c => c.detail.includes('version'))).toBe(true);
    });

    it('flags when a workflow is added', async () => {
        const out = await detectPair(
            { fm: { name: 'foo' }, opts: { workflows: ['w1.md'] } },
            { fm: { name: 'foo' }, opts: { workflows: ['w1.md', 'w2.md'] } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(true);
        expect(out.structuralChanges.some(c => c.kind === 'workflow-added' && c.detail === 'w2.md')).toBe(true);
    });

    it('flags when a workflow is removed', async () => {
        const out = await detectPair(
            { fm: { name: 'foo' }, opts: { workflows: ['w1.md', 'w2.md'] } },
            { fm: { name: 'foo' }, opts: { workflows: ['w1.md'] } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(true);
        expect(out.structuralChanges.some(c => c.kind === 'workflow-removed' && c.detail === 'w2.md')).toBe(true);
    });

    it('flags when a reference is added', async () => {
        const out = await detectPair(
            { fm: { name: 'foo' }, opts: { references: ['r1.md'] } },
            { fm: { name: 'foo' }, opts: { references: ['r1.md', 'r2.md'] } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(true);
        expect(out.structuralChanges.some(c => c.kind === 'reference-added' && c.detail === 'r2.md')).toBe(true);
    });

    it('does NOT flag when only body prose changes (same structure)', async () => {
        const out = await detectPair(
            { fm: { name: 'foo', description: 'same' }, opts: { body: '# Body v1\nstuff\n' } },
            { fm: { name: 'foo', description: 'same' }, opts: { body: '# Body v2\ntweaked stuff\n' } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(false);
        expect(out.structuralChanges.length).toBe(0);
    });

    it('does NOT flag whitespace-only change', async () => {
        const out = await detectPair(
            { fm: { name: 'foo', description: 'same' }, opts: { body: '# Body\nline\n' } },
            { fm: { name: 'foo', description: 'same' }, opts: { body: '# Body\n  line  \n\n' } },
            { skipSemantic: true },
        );
        expect(out.flagged).toBe(false);
    });
});

// ─── Initial sync (no old dir) ──────────────────────────────────────────────

describe('initial sync', () => {
    it('does NOT flag when oldSkillDir does not exist', async () => {
        const newDir = makeSkill(tmpRoot, 'init', { name: 'foo', description: 'new skill' });
        const out = await detectChanges({
            oldSkillDir: join(tmpRoot, 'does-not-exist'),
            newSkillDir: newDir,
            skipSemantic: true,
        });
        expect(out.flagged).toBe(false);
        expect(out.structuralChanges.length).toBe(0);
    });
});

// ─── Semantic diff (Gemma) ───────────────────────────────────────────────────

describe('semantic diff', () => {
    it('flags when Gemma says purpose changed', async () => {
        const fakeGemma = mock(async () => 'CHANGED: the skill now also handles deployment orchestration.');
        const out = await detectPair(
            { fm: { name: 'foo', description: 'does A' } },
            { fm: { name: 'foo', description: 'does A and B' } },
            { ollamaChat: fakeGemma },
        );
        expect(out.flagged).toBe(true);
        expect(out.semanticChange?.changed).toBe(true);
        expect(fakeGemma).toHaveBeenCalledTimes(1);
    });

    it('does NOT flag when Gemma says purpose unchanged', async () => {
        const fakeGemma = mock(async () => 'SAME: wording tweak, purpose identical.');
        const out = await detectPair(
            { fm: { name: 'foo', description: 'does A' } },
            { fm: { name: 'foo', description: 'does A (clarified)' } },
            { ollamaChat: fakeGemma },
        );
        // structural still changed (description field diff) so flagged=true from structural;
        // but semantic alone should report unchanged.
        expect(out.semanticChange?.changed).toBe(false);
    });

    it('treats Gemma error as non-flag (fail-open for detection)', async () => {
        const fakeGemma = mock(async () => { throw new Error('Ollama down'); });
        const out = await detectPair(
            { fm: { name: 'foo', description: 'same' } },
            { fm: { name: 'foo', description: 'same' } },
            { ollamaChat: fakeGemma },
        );
        expect(out.flagged).toBe(false);
        expect(out.semanticChange).toBe(null);
    });
});

// ─── Combined signal ────────────────────────────────────────────────────────

describe('combined signal', () => {
    it('flags when structural OR semantic detects change', async () => {
        const fakeGemma = mock(async () => 'SAME');
        const out = await detectPair(
            { fm: { name: 'foo', description: 'same' }, opts: { workflows: ['a.md'] } },
            { fm: { name: 'foo', description: 'same' }, opts: { workflows: ['a.md', 'b.md'] } },
            { ollamaChat: fakeGemma },
        );
        expect(out.flagged).toBe(true); // structural win
    });

    it('not flagged when both say no change', async () => {
        const fakeGemma = mock(async () => 'SAME');
        const out = await detectPair(
            { fm: { name: 'foo', description: 'same' }, opts: { body: '# A\n' } },
            { fm: { name: 'foo', description: 'same' }, opts: { body: '# A\n\n' } },
            { ollamaChat: fakeGemma },
        );
        expect(out.flagged).toBe(false);
    });
});

// ─── Review artifact format ─────────────────────────────────────────────────

describe('renderReviewEntry', () => {
    it('produces a markdown block with skill name, reasons, and diff', () => {
        const fakeOutput: DetectOutput = {
            flagged: true,
            reasons: ['frontmatter.description changed', 'new workflow: b.md'],
            structuralChanges: [
                { kind: 'frontmatter', detail: 'description: old → new' },
                { kind: 'workflow-added', detail: 'b.md' },
            ],
            semanticChange: { changed: false, explanation: 'SAME' },
        };
        const diff = '--- old\n+++ new\n@@ -1 +1 @@\n-description: old\n+description: new\n';
        const entry = renderReviewEntry('impeccable', fakeOutput, diff);
        expect(entry).toContain('## impeccable');
        expect(entry).toContain('frontmatter.description changed');
        expect(entry).toContain('new workflow: b.md');
        expect(entry).toContain('```diff');
        expect(entry).toContain('-description: old');
    });

    it('includes timestamp for traceability', () => {
        const fakeOutput: DetectOutput = {
            flagged: true,
            reasons: ['test'],
            structuralChanges: [],
            semanticChange: null,
        };
        const entry = renderReviewEntry('foo', fakeOutput, '');
        expect(entry).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
});
