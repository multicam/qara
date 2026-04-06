import { describe, test, expect } from 'bun:test';
import {
    extractInputSummary,
    classifyTopic,
    extractErrorDetail,
    classifySessionPhase,
} from './trace-utils';

// ---------------------------------------------------------------------------
// extractInputSummary
// ---------------------------------------------------------------------------
describe('extractInputSummary', () => {
    test('Bash: extracts command field', () => {
        expect(extractInputSummary('Bash', { command: 'git status' })).toBe('command: git status');
    });

    test('Bash: truncates long commands to 200 chars', () => {
        const longCmd = 'echo ' + 'x'.repeat(300);
        const result = extractInputSummary('Bash', { command: longCmd });
        expect(result.startsWith('command: echo ')).toBe(true);
        expect(result.length).toBeLessThanOrEqual(209); // "command: " (9) + 200
    });

    test('Bash: handles missing command field', () => {
        expect(extractInputSummary('Bash', {})).toBe('');
    });

    test('Read: extracts file_path', () => {
        expect(extractInputSummary('Read', { file_path: '/home/user/foo.ts' }))
            .toBe('file: /home/user/foo.ts');
    });

    test('Write: extracts file_path only, never content', () => {
        const result = extractInputSummary('Write', {
            file_path: '/tmp/secret.ts',
            content: 'super secret API key = sk-12345',
        });
        expect(result).toBe('file: /tmp/secret.ts');
        expect(result).not.toContain('secret API');
        expect(result).not.toContain('sk-12345');
    });

    test('Edit: extracts file_path only, never old_string/new_string', () => {
        const result = extractInputSummary('Edit', {
            file_path: '/tmp/foo.ts',
            old_string: 'old code here',
            new_string: 'new code here',
        });
        expect(result).toBe('file: /tmp/foo.ts');
        expect(result).not.toContain('old code');
    });

    test('MultiEdit: extracts file_path only', () => {
        const result = extractInputSummary('MultiEdit', {
            file_path: '/tmp/bar.ts',
            edits: [{ old_string: 'a', new_string: 'b' }],
        });
        expect(result).toBe('file: /tmp/bar.ts');
    });

    test('Grep: extracts pattern + path + glob', () => {
        const result = extractInputSummary('Grep', {
            pattern: 'TODO',
            path: '/home/user/src',
            glob: '*.ts',
        });
        expect(result).toBe('pattern: TODO path: /home/user/src glob: *.ts');
    });

    test('Grep: handles partial fields', () => {
        expect(extractInputSummary('Grep', { pattern: 'foo' })).toBe('pattern: foo');
    });

    test('Glob: extracts pattern + path', () => {
        expect(extractInputSummary('Glob', { pattern: '**/*.ts', path: '/src' }))
            .toBe('pattern: **/*.ts path: /src');
    });

    test('Glob: pattern only', () => {
        expect(extractInputSummary('Glob', { pattern: '*.md' })).toBe('pattern: *.md');
    });

    test('WebFetch: extracts url, truncated', () => {
        const result = extractInputSummary('WebFetch', { url: 'https://example.com/very/long/path' });
        expect(result).toContain('url: https://example.com');
    });

    test('WebSearch: extracts query', () => {
        expect(extractInputSummary('WebSearch', { query: 'rust token killer' }))
            .toBe('query: rust token killer');
    });

    test('Agent: extracts description and subagent_type', () => {
        const result = extractInputSummary('Agent', {
            description: 'research topic',
            subagent_type: 'claude-researcher',
        });
        expect(result).toContain('research topic');
        expect(result).toContain('claude-researcher');
    });

    test('Skill: extracts skill name', () => {
        expect(extractInputSummary('Skill', { skill: 'tdd-qa' })).toBe('skill: tdd-qa');
    });

    test('TaskCreate: extracts subject', () => {
        expect(extractInputSummary('TaskCreate', { subject: 'Fix auth bug' }))
            .toBe('subject: Fix auth bug');
    });

    test('Default: JSON.stringify truncated to 200 chars', () => {
        const input = { weird_field: 'x'.repeat(300) };
        const result = extractInputSummary('UnknownTool', input);
        expect(result.length).toBeLessThanOrEqual(200);
    });

    test('Default: handles empty input', () => {
        expect(extractInputSummary('UnknownTool', {})).toBe('{}');
    });
});

// ---------------------------------------------------------------------------
// classifyTopic
// ---------------------------------------------------------------------------
describe('classifyTopic', () => {
    test('detects test-related messages', () => {
        expect(classifyTopic('Running bun test suite')).toBe('test');
        expect(classifyTopic('All 1120 tests pass')).toBe('test');
    });

    test('detects commit-related messages', () => {
        expect(classifyTopic('Created commit abc123')).toBe('commit');
        expect(classifyTopic('git commit -m "fix bug"')).toBe('commit');
    });

    test('detects refactor-related messages', () => {
        expect(classifyTopic('Refactored the miner into two modules')).toBe('refactor');
    });

    test('detects debug-related messages', () => {
        expect(classifyTopic('Debugging the hook failure')).toBe('debug');
        expect(classifyTopic('Found the error in line 42')).toBe('debug');
    });

    test('detects deploy-related messages', () => {
        expect(classifyTopic('Pushed to production')).toBe('deploy');
        expect(classifyTopic('git push origin master')).toBe('deploy');
    });

    test('detects review-related messages', () => {
        expect(classifyTopic('Code review complete')).toBe('review');
        expect(classifyTopic('PR looks good')).toBe('review');
    });

    test('detects research-related messages', () => {
        expect(classifyTopic('Researching Meta-Harness paper')).toBe('research');
        expect(classifyTopic('Exploring the codebase')).toBe('research');
    });

    test('returns general for unclassified messages', () => {
        expect(classifyTopic('hello world')).toBe('general');
        expect(classifyTopic('')).toBe('general');
    });

    test('is case insensitive', () => {
        expect(classifyTopic('RUNNING TESTS')).toBe('test');
    });
});

// ---------------------------------------------------------------------------
// extractErrorDetail
// ---------------------------------------------------------------------------
describe('extractErrorDetail', () => {
    test('returns null when no error', () => {
        expect(extractErrorDetail(undefined)).toBeNull();
        expect(extractErrorDetail('')).toBeNull();
    });

    test('extracts error text', () => {
        expect(extractErrorDetail('Error: file not found')).toBe('Error: file not found');
    });

    test('truncates long errors to 300 chars', () => {
        const longError = 'Error: ' + 'x'.repeat(400);
        const result = extractErrorDetail(longError);
        expect(result).not.toBeNull();
        expect(result!.length).toBeLessThanOrEqual(300);
    });

    test('respects custom maxLen', () => {
        const result = extractErrorDetail('Error: something broke badly', 15);
        expect(result).not.toBeNull();
        expect(result!.length).toBeLessThanOrEqual(15);
    });

    test('redacts API tokens (sk-, ghp_, Bearer)', () => {
        expect(extractErrorDetail('Error: auth failed sk-1234567890abcdef'))
            .toBe('Error: auth failed sk-[REDACTED]');
        expect(extractErrorDetail('Error: ghp_abcdef123456 invalid'))
            .toBe('Error: ghp_[REDACTED] invalid');
        expect(extractErrorDetail('Error: Bearer eyJhbGciOiJIUzI1NiJ9 expired'))
            .toBe('Error: Bearer [REDACTED] expired');
    });

    test('redacts URL credentials', () => {
        expect(extractErrorDetail('Error: failed https://user:pass123@github.com/repo'))
            .toBe('Error: failed https://[REDACTED]@github.com/repo');
    });

    test('redacts long base64-like keys', () => {
        const key = 'A'.repeat(44);
        const result = extractErrorDetail(`Error: key=${key} invalid`);
        expect(result).not.toContain(key);
        expect(result).toContain('[REDACTED_KEY]');
    });
});

// ---------------------------------------------------------------------------
// classifySessionPhase
// ---------------------------------------------------------------------------

describe('classifySessionPhase', () => {
    test('exploring: Read-heavy, WebSearch present, minimal Edit', () => {
        expect(classifySessionPhase({
            Read: 500, WebSearch: 40, Grep: 50, Bash: 100, Edit: 10, Write: 5,
        })).toBe('exploring');
    });

    test('implementing: Edit/Write-heavy with substantial Bash', () => {
        expect(classifySessionPhase({
            Bash: 400, Edit: 80, Write: 50, Read: 200, Grep: 20,
        })).toBe('implementing');
    });

    test('testing: Bash-dominant with test-related summaries', () => {
        const summaries = [
            'command: bun test .claude/',
            'command: bun test --timeout 10000',
            'command: bun test specific.test.ts',
            'file: /tmp/results.json',
        ];
        expect(classifySessionPhase(
            { Bash: 600, Read: 100, Edit: 20, Write: 10 },
            summaries,
        )).toBe('testing');
    });

    test('mixed: no dominant pattern', () => {
        expect(classifySessionPhase({
            Read: 100, Edit: 50, Bash: 100, Write: 50, Grep: 50,
        })).toBe('mixed');
    });

    test('empty tool counts return mixed', () => {
        expect(classifySessionPhase({})).toBe('mixed');
    });

    test('testing requires summaries to confirm', () => {
        // Bash-heavy but no summaries → not classified as testing
        expect(classifySessionPhase({ Bash: 600, Read: 100 })).not.toBe('testing');
    });
});

