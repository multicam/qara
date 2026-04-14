/**
 * Tests for screenshot-analyze.ts — the Gemma 4 vision CLI.
 *
 * Mocks Ollama via `spyOn(globalThis, 'fetch')`; exercises pure helpers,
 * vision callers, and all three CLI modes (single-file, --dir, --compare).
 *
 * Lives in the centralized `.claude/tests/` directory to match the devtools-mcp
 * convention (devtools-mcp.test.ts is also here).
 */

import { describe, expect, test, beforeEach, afterEach, spyOn } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    parseIssues,
    findImages,
    analyzeSingle,
    compareImages,
    main,
} from '../skills/devtools-mcp/tools/screenshot-analyze.ts';

// ───── Shared fixture helpers — eliminate per-describe copy/paste ─────

/** Build a mock Ollama /api/chat response with the given assistant content. */
function mockOllamaResponse(content: string, status = 200): Response {
    return new Response(
        JSON.stringify({ message: { content } }),
        { status },
    );
}

interface Ctx {
    dir: string;
    fetchSpy: ReturnType<typeof spyOn>;
    restoreArgv: () => void;
}

function makeCtx(prefix: string): Ctx {
    const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
    const fetchSpy = spyOn(globalThis, 'fetch');
    const originalArgv = process.argv;
    return {
        dir,
        fetchSpy,
        restoreArgv: () => { process.argv = originalArgv; },
    };
}

function teardownCtx(ctx: Ctx): void {
    rmSync(ctx.dir, { recursive: true, force: true });
    ctx.fetchSpy.mockRestore();
    ctx.restoreArgv();
}

/** Write a fake image file and return its absolute path. */
function fakeImage(dir: string, name: string): string {
    const path = join(dir, name);
    writeFileSync(path, 'fake-png-bytes');
    return path;
}

// ───── Tests ─────

describe('parseIssues', () => {
    test('extracts bullet-list issues from response', () => {
        const response = '* Text overlap in header\n* Broken image top-right\n- Button contrast too low';
        const { issues, passed } = parseIssues(response, 'no visual issues');
        expect(issues).toEqual([
            'Text overlap in header',
            'Broken image top-right',
            'Button contrast too low',
        ]);
        expect(passed).toBe(false);
    });

    test('pass-phrase overrides issue list', () => {
        const { passed, issues } = parseIssues('No visual issues. Everything looks fine.', 'no visual issues');
        expect(passed).toBe(true);
        expect(issues).toEqual([]);
    });

    test('empty response passes', () => {
        const { passed, issues } = parseIssues('', 'no visual issues');
        expect(passed).toBe(true);
        expect(issues).toEqual([]);
    });
});

describe('findImages', () => {
    let dir: string;
    beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'screenshot-test-')); });
    afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

    test('returns all image extensions, skips non-images', () => {
        ['a.png', 'b.jpg', 'c.webp', 'd.txt'].forEach(n => writeFileSync(join(dir, n), 'fake'));
        const result = findImages(dir);
        expect(result.length).toBe(3);
        expect(result.every(p => /\.(png|jpg|webp)$/.test(p))).toBe(true);
    });

    test('walks subdirectories', () => {
        const sub = join(dir, 'sub');
        mkdirSync(sub);
        writeFileSync(join(dir, 'a.png'), 'fake');
        writeFileSync(join(sub, 'b.png'), 'fake');
        expect(findImages(dir).length).toBe(2);
    });

    test('returns empty array for nonexistent dir', () => {
        expect(findImages(join(dir, 'nonexistent'))).toEqual([]);
    });
});

describe('analyzeSingle with mocked Ollama', () => {
    let ctx: Ctx;
    beforeEach(() => { ctx = makeCtx('analyze'); });
    afterEach(() => { teardownCtx(ctx); });

    test('pass case: Ollama says no issues', async () => {
        ctx.fetchSpy.mockResolvedValue(mockOllamaResponse('No visual issues. All elements render correctly.'));
        const result = await analyzeSingle(fakeImage(ctx.dir, 'test.png'), 'gemma4:latest');
        expect(result.passed).toBe(true);
        expect(result.issues).toEqual([]);
        expect(result.model).toBe('gemma4:latest');
    });

    test('fail case: Ollama returns bullet issues', async () => {
        ctx.fetchSpy.mockResolvedValue(mockOllamaResponse('* Header overlaps logo\n* Button text too small'));
        const result = await analyzeSingle(fakeImage(ctx.dir, 'test.png'), 'gemma4:latest');
        expect(result.passed).toBe(false);
        expect(result.issues).toEqual(['Header overlaps logo', 'Button text too small']);
    });

    test('Ollama 500: error propagates', async () => {
        ctx.fetchSpy.mockResolvedValue(new Response('Internal error', { status: 500 }));
        await expect(analyzeSingle(fakeImage(ctx.dir, 'test.png'), 'gemma4:latest'))
            .rejects.toThrow(/Ollama vision error: 500/);
    });
});

describe('compareImages with mocked Ollama', () => {
    let ctx: Ctx;
    beforeEach(() => { ctx = makeCtx('compare'); });
    afterEach(() => { teardownCtx(ctx); });

    // Both tests compare a fresh base/current pair — factor out the setup so
    // each test is just the mocked-response + expectation.
    const compareFakePair = () => compareImages(
        fakeImage(ctx.dir, 'base.png'),
        fakeImage(ctx.dir, 'curr.png'),
        'gemma4:latest',
    );

    test('identical screenshots: passes', async () => {
        ctx.fetchSpy.mockResolvedValue(mockOllamaResponse('No changes detected. Screenshots are visually identical.'));
        const result = await compareFakePair();
        expect(result.passed).toBe(true);
    });

    test('visual drift: fails with diff description', async () => {
        ctx.fetchSpy.mockResolvedValue(mockOllamaResponse('* Header color changed from blue to red\n* Button moved 20px left'));
        const result = await compareFakePair();
        expect(result.passed).toBe(false);
        expect(result.issues.length).toBe(2);
    });
});

describe('main CLI dispatch', () => {
    let ctx: Ctx;
    let logSpy: ReturnType<typeof spyOn>;
    let errSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        ctx = makeCtx('cli');
        logSpy = spyOn(console, 'log').mockImplementation(() => {});
        errSpy = spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        teardownCtx(ctx);
        logSpy.mockRestore();
        errSpy.mockRestore();
    });

    const runWith = (...args: string[]) => {
        process.argv = ['bun', 'screenshot-analyze.ts', ...args];
        return main();
    };
    // Use mockImplementation (not mockResolvedValue) so each call gets a FRESH
    // Response object. Reusing one Response across calls fails with
    // ERR_BODY_ALREADY_USED because `res.json()` consumes the body.
    const mockPass = () =>
        ctx.fetchSpy.mockImplementation(async () => mockOllamaResponse('No visual issues'));
    const mockNoChanges = () =>
        ctx.fetchSpy.mockImplementation(async () => mockOllamaResponse('No changes detected'));

    test('--help prints usage and returns without fetch', async () => {
        await runWith('--help');
        expect(ctx.fetchSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalled();
    });

    test('single-file mode: one Ollama call', async () => {
        mockPass();
        await runWith(fakeImage(ctx.dir, 'test.png'), '--json');
        expect(ctx.fetchSpy).toHaveBeenCalledTimes(1);
    });

    test('--dir mode analyzes every image in directory', async () => {
        mockPass();
        ['a.png', 'b.jpg'].forEach(n => fakeImage(ctx.dir, n));
        await runWith('--dir', ctx.dir, '--json');
        expect(ctx.fetchSpy).toHaveBeenCalledTimes(2);
    });

    test('--compare mode walks current dir against baseline', async () => {
        mockNoChanges();
        const base = join(ctx.dir, 'baseline');
        const curr = join(ctx.dir, 'current');
        mkdirSync(base); mkdirSync(curr);
        writeFileSync(join(base, 'a.png'), 'fake');
        writeFileSync(join(curr, 'a.png'), 'fake');
        await runWith('--compare', '--baseline', base, '--current', curr, '--json');
        expect(ctx.fetchSpy).toHaveBeenCalledTimes(1);
    });

    test('--compare with missing baseline: fallback path, no fetch', async () => {
        mockNoChanges(); // should remain uncalled
        const base = join(ctx.dir, 'baseline');
        const curr = join(ctx.dir, 'current');
        mkdirSync(base); mkdirSync(curr);
        writeFileSync(join(curr, 'new-file.png'), 'fake');
        await runWith('--compare', '--baseline', base, '--current', curr, '--json');
        expect(ctx.fetchSpy).not.toHaveBeenCalled();
    });
});
