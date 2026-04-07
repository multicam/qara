import { describe, test, expect } from 'bun:test';
import { isAvailable, chat, embed, DEFAULT_ENDPOINT, DEFAULT_MODEL } from './ollama-client';

describe('ollama-client', () => {
    test('exports default constants', () => {
        expect(DEFAULT_ENDPOINT).toBe('http://localhost:11434');
        expect(DEFAULT_MODEL).toBe('gemma4');
    });

    test('isAvailable returns boolean', async () => {
        const result = await isAvailable();
        expect(typeof result).toBe('boolean');
    });

    test('isAvailable returns false for bad endpoint', async () => {
        const result = await isAvailable('http://localhost:99999');
        expect(result).toBe(false);
    });

    // Integration tests — only run when Ollama is available
    test('chat returns string response when Ollama is running', async () => {
        if (!(await isAvailable())) return; // skip if Ollama not running
        const response = await chat({
            messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
            temperature: 0,
            timeout: 15_000,
        });
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
    });

    test('chat throws on bad endpoint', async () => {
        await expect(
            chat({
                messages: [{ role: 'user', content: 'test' }],
                endpoint: 'http://localhost:99999',
                timeout: 2000,
            })
        ).rejects.toThrow();
    });

    test('embed returns number array when Ollama is running', async () => {
        if (!(await isAvailable())) return;
        const result = await embed({ input: 'test embedding' });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(typeof result[0]).toBe('number');
    });
});
