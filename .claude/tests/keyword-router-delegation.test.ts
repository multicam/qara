import { describe, test, expect } from 'bun:test';
import {
    countDistinctImperatives,
    shouldNudgeDelegation,
} from '../hooks/keyword-router';

describe('countDistinctImperatives', () => {
    test('single verb returns 1', () => {
        expect(countDistinctImperatives('fix the typo')).toBe(1);
    });

    test('same verb repeated counts once', () => {
        expect(countDistinctImperatives('look at A, look at B, look at C')).toBe(1);
    });

    test('three distinct verbs returns 3', () => {
        expect(countDistinctImperatives('read file A, check file B, verify file C')).toBe(3);
    });

    test('case-insensitive', () => {
        expect(countDistinctImperatives('Read X, Check Y, Verify Z')).toBe(3);
    });

    test('no imperative verbs returns 0', () => {
        expect(countDistinctImperatives('hello world')).toBe(0);
    });
});

describe('shouldNudgeDelegation', () => {
    test('three distinct imperatives → true', () => {
        expect(shouldNudgeDelegation('read the hook, check the miner, verify the tests')).toBe(true);
    });

    test('single imperative → false', () => {
        expect(shouldNudgeDelegation('fix the typo in README.md')).toBe(false);
    });

    test('multi-line bullet list with 3+ items → true', () => {
        const prompt = `please:
- fix the bug
- update the tests
- check the linter`;
        expect(shouldNudgeDelegation(prompt)).toBe(true);
    });

    test('numbered list with 3 items → true', () => {
        const prompt = '1. audit the hooks\n2. refactor the miner\n3. update docs';
        expect(shouldNudgeDelegation(prompt)).toBe(true);
    });

    test('explicit enumeration cue "three files" → true', () => {
        expect(shouldNudgeDelegation('please look at these three files')).toBe(true);
    });

    test('JM real prompt: fix all + improve delegation + assess sonnet → true', () => {
        const p = "fix all -- also we need to improve the agent delegation, ultrathink -- also we need to assess whether more sonnet sub-agents would be beneficial";
        expect(shouldNudgeDelegation(p)).toBe(true);
    });

    test('short conversational prompt → false', () => {
        expect(shouldNudgeDelegation('hello')).toBe(false);
    });

    test('two imperatives only → false', () => {
        expect(shouldNudgeDelegation('fix the bug and update the test')).toBe(false);
    });

    test('question with explain only → false', () => {
        expect(shouldNudgeDelegation('explain how the router works')).toBe(false);
    });
});
