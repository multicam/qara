/**
 * Unit tests for ollama-client.
 *
 * Deterministic: mocks `globalThis.fetch` so tests run identically on any
 * machine regardless of whether Ollama is installed, which models are pulled,
 * or whether VRAM is available. The previous version called live endpoints
 * and flaked when model loading failed (e.g. gemma4:26b holding VRAM while
 * nomic-embed-text tried to load — resource contention, not a code bug).
 *
 * Live integration is already exercised in production by the introspect
 * daily-reflect script and screenshot-analyze CLI — a unit test adds no
 * signal there, only flakes.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import {
    isAvailable,
    chat,
    embed,
    DEFAULT_ENDPOINT,
    DEFAULT_MODEL,
} from './ollama-client';

let fetchSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch');
});

afterEach(() => {
    fetchSpy.mockRestore();
});

/**
 * Install a fetch mock that (a) captures the request body and (b) returns the
 * given response payload. Returns a getter for the captured body so tests can
 * assert on request shape without repeating the boilerplate.
 */
function captureRequest(responseBody: unknown): { body: () => any } {
    let captured: string | undefined;
    fetchSpy.mockImplementation(async (_url, init) => {
        captured = init?.body as string;
        return new Response(JSON.stringify(responseBody), { status: 200 });
    });
    return { body: () => JSON.parse(captured!) };
}

// ───── Constants ─────

describe('defaults', () => {
    test('exports expected endpoint and model', () => {
        expect(DEFAULT_ENDPOINT).toBe('http://localhost:11434');
        expect(DEFAULT_MODEL).toBe('gemma4:latest');
    });
});

// ───── isAvailable ─────

describe('isAvailable', () => {
    test('returns true when /api/tags responds ok', async () => {
        fetchSpy.mockImplementation(async () => new Response('{"models":[]}', { status: 200 }));
        expect(await isAvailable()).toBe(true);
    });

    test('returns false when server returns non-ok', async () => {
        fetchSpy.mockImplementation(async () => new Response('err', { status: 503 }));
        expect(await isAvailable()).toBe(false);
    });

    test('returns false when fetch throws (no server)', async () => {
        fetchSpy.mockImplementation(async () => { throw new Error('ECONNREFUSED'); });
        expect(await isAvailable()).toBe(false);
    });

    test('returns false for bad endpoint (integration-light)', async () => {
        // No mock — exercises real AbortSignal.timeout for the rejection path
        fetchSpy.mockRestore();
        const result = await isAvailable('http://localhost:99999');
        expect(result).toBe(false);
        // Re-install spy for afterEach cleanup
        fetchSpy = spyOn(globalThis, 'fetch');
    });
});

// ───── chat ─────

describe('chat', () => {
    test('parses message.content from response', async () => {
        fetchSpy.mockImplementation(async () => new Response(
            JSON.stringify({ message: { role: 'assistant', content: 'hello' } }),
            { status: 200 },
        ));
        const result = await chat({ messages: [{ role: 'user', content: 'hi' }] });
        expect(result).toBe('hello');
    });

    test('sends configured model, messages, and temperature', async () => {
        const req = captureRequest({ message: { content: 'ok' } });
        await chat({
            model: 'custom-model',
            temperature: 0.7,
            messages: [{ role: 'user', content: 'hi' }],
        });
        const body = req.body();
        expect(body.model).toBe('custom-model');
        expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
        expect(body.options.temperature).toBe(0.7);
        expect(body.stream).toBe(false);
    });

    test('defaults to DEFAULT_MODEL when not specified', async () => {
        const req = captureRequest({ message: { content: 'ok' } });
        await chat({ messages: [{ role: 'user', content: 'hi' }] });
        expect(req.body().model).toBe(DEFAULT_MODEL);
    });

    test('throws with status code on 500 (model load failure)', async () => {
        fetchSpy.mockImplementation(async () => new Response('server err', { status: 500 }));
        await expect(
            chat({ messages: [{ role: 'user', content: 'x' }] })
        ).rejects.toThrow(/Ollama chat failed: 500/);
    });

    test('throws on bad endpoint (fetch-level error)', async () => {
        fetchSpy.mockImplementation(async () => { throw new TypeError('fetch failed'); });
        await expect(
            chat({ messages: [{ role: 'user', content: 'x' }], endpoint: 'http://localhost:99999', timeout: 2000 })
        ).rejects.toThrow();
    });
});

// ───── embed ─────

describe('embed', () => {
    test('returns first embedding vector', async () => {
        fetchSpy.mockImplementation(async () => new Response(
            JSON.stringify({ embeddings: [[0.1, 0.2, 0.3]] }),
            { status: 200 },
        ));
        const result = await embed({ input: 'test' });
        expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    test('throws with status code on 500 (the exact flake scenario)', async () => {
        // Live failure mode: model pulled but load failed due to VRAM contention.
        // This replaces the old live test that depended on resource state.
        fetchSpy.mockImplementation(async () => new Response(
            JSON.stringify({ error: 'model failed to load, this may be due to resource limitations' }),
            { status: 500 },
        ));
        await expect(
            embed({ input: 'test' })
        ).rejects.toThrow(/Ollama embed failed: 500/);
    });

    test('uses custom model when provided', async () => {
        const req = captureRequest({ embeddings: [[1, 2]] });
        await embed({ model: 'mxbai-embed-large', input: 'test' });
        expect(req.body().model).toBe('mxbai-embed-large');
    });

    test('defaults to nomic-embed-text when no model specified', async () => {
        const req = captureRequest({ embeddings: [[0]] });
        await embed({ input: 'test' });
        expect(req.body().model).toBe('nomic-embed-text');
    });
});
