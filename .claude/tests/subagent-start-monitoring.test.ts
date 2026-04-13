import { describe, test, expect } from 'bun:test';
import { join } from 'path';
import { runHook } from '../hooks/lib/test-macros';

const HOOK = join(import.meta.dir, '..', 'hooks', 'subagent-start.ts');

describe('subagent-start untyped spawn monitoring', () => {
    test('logs stderr warning for general-purpose agent type', async () => {
        const result = await runHook(HOOK, {
            session_id: 'test-monitor',
            agent_id: 'test-agent-1',
            agent_type: 'general-purpose',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toContain('WARN');
        expect(result.stderr).toContain('untyped');
    });

    test('logs stderr warning for unknown agent type', async () => {
        const result = await runHook(HOOK, {
            session_id: 'test-monitor',
            agent_id: 'test-agent-2',
            agent_type: 'unknown',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toContain('WARN');
    });

    test('no stderr warning for typed agent (codebase-analyzer)', async () => {
        const result = await runHook(HOOK, {
            session_id: 'test-monitor',
            agent_id: 'test-agent-3',
            agent_type: 'codebase-analyzer',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('WARN');
    });

    test('no stderr warning for Explore agent type', async () => {
        const result = await runHook(HOOK, {
            session_id: 'test-monitor',
            agent_id: 'test-agent-4',
            agent_type: 'Explore',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('WARN');
    });

    test('no stdout advisory (monitoring only, not enforcement)', async () => {
        const result = await runHook(HOOK, {
            session_id: 'test-monitor',
            agent_id: 'test-agent-5',
            agent_type: 'general-purpose',
        });
        expect(result.stdout).toBe('');
    });
});
