import { describe, test, expect } from 'bun:test';
import { join } from 'path';
import { runHook, parseHookOutput } from '../hooks/lib/test-macros';

const HOOK = join(import.meta.dir, '..', 'hooks', 'pre-compact.ts');

describe('pre-compact delegation advice', () => {
    test('emits delegation advice even with no mode state', async () => {
        const result = await runHook(HOOK, { session_id: 'test-delegation' });
        // Should always emit delegation advice on compaction
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('delegate');
    });

    test('delegation advice mentions typed subagents', async () => {
        const result = await runHook(HOOK, { session_id: 'test-delegation-2' });
        expect(result.stdout).toContain('subagent_type');
    });

    test('delegation advice mentions Explore model override', async () => {
        const result = await runHook(HOOK, { session_id: 'test-delegation-3' });
        expect(result.stdout).toContain('sonnet');
    });

    test('output is valid JSON with result field', async () => {
        const result = await runHook(HOOK, { session_id: 'test-delegation-4' });
        if (result.stdout.trim()) {
            const parsed = JSON.parse(result.stdout);
            expect(parsed).toHaveProperty('result');
            expect(typeof parsed.result).toBe('string');
        }
    });
});
