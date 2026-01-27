/**
 * Tests for tab-titles.ts
 */

import { describe, it, expect } from 'bun:test';
import { generateTabTitle } from './tab-titles';

describe('Tab Titles', () => {
  describe('generateTabTitle', () => {
    describe('with completed line', () => {
      it('should extract words from completed line', () => {
        const title = generateTabTitle('do something', 'COMPLETED: Fixed authentication bug');

        expect(title).toContain('Fixed');
        expect(title).toContain('Authentication');
      });

      it('should strip COMPLETED prefix and emoji', () => {
        const title = generateTabTitle('test', '🎯 COMPLETED: Tests passing now');

        expect(title).not.toContain('🎯');
        expect(title).not.toContain('COMPLETED');
      });

      it('should handle markdown formatting in completed line', () => {
        const title = generateTabTitle('test', '**COMPLETED:** [task] Done with work');

        expect(title).not.toContain('**');
        expect(title).not.toContain('[');
      });

      it('should return exactly 4 words', () => {
        const title = generateTabTitle('test', 'COMPLETED: Fixed the bug');
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });

      it('should pad with Done if not enough words', () => {
        const title = generateTabTitle('test', 'COMPLETED: OK');
        const words = title.split(' ');

        expect(words.length).toBe(4);
        expect(words.some((w) => w === 'Done')).toBe(true);
      });
    });

    describe('with prompt only', () => {
      it('should convert action verbs to past tense', () => {
        expect(generateTabTitle('test the code')).toContain('Tested');
        expect(generateTabTitle('fix the bug')).toContain('Fixed');
        expect(generateTabTitle('write a function')).toContain('Wrote');
        expect(generateTabTitle('make a component')).toContain('Made');
        expect(generateTabTitle('send the email')).toContain('Sent');
      });

      it('should extract meaningful words from prompt', () => {
        const title = generateTabTitle('implement user authentication system');

        expect(title.toLowerCase()).toContain('implement');
        expect(title.toLowerCase()).toMatch(/user|authentication|system/);
      });

      it('should filter out stop words', () => {
        const title = generateTabTitle('the code and the bug for this');

        expect(title.toLowerCase()).not.toMatch(/\b(the|and|for|this)\b/);
      });

      it('should return exactly 4 words', () => {
        const title = generateTabTitle('do something');
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });

      it('should capitalize first letter of each word', () => {
        const title = generateTabTitle('update the readme file');
        const words = title.split(' ');

        words.forEach((word) => {
          expect(word[0]).toBe(word[0].toUpperCase());
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty prompt', () => {
        const title = generateTabTitle('');
        const words = title.split(' ');

        expect(words.length).toBe(4);
        expect(title).toContain('Completed');
      });

      it('should handle prompt with only stop words', () => {
        const title = generateTabTitle('the and but for');
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });

      it('should handle very short words', () => {
        const title = generateTabTitle('a b c d e f g');
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });

      it('should handle special characters in prompt', () => {
        const title = generateTabTitle('fix the bug!!! @#$% done');

        expect(title).not.toContain('!');
        expect(title).not.toContain('@');
        expect(title).not.toContain('#');
      });

      it('should handle prompt with numbers', () => {
        const title = generateTabTitle('fix bug 123 in module 456');
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });

      it('should handle undefined completed line', () => {
        const title = generateTabTitle('test something', undefined);
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });

      it('should handle empty completed line', () => {
        const title = generateTabTitle('test something', '');
        const words = title.split(' ');

        expect(words.length).toBe(4);
      });
    });

    describe('past tense conversion', () => {
      it('should handle verbs ending in e', () => {
        const titleCreate = generateTabTitle('create a file');
        expect(titleCreate).toContain('Created');

        const titleConfigure = generateTabTitle('configure settings');
        expect(titleConfigure).toContain('Configured');
      });

      it('should handle regular verbs', () => {
        const titleFix = generateTabTitle('fix the issue');
        expect(titleFix).toContain('Fixed');

        const titleCheck = generateTabTitle('check the status');
        expect(titleCheck).toContain('Checked');
      });

      it('should handle irregular verbs', () => {
        const titleWrite = generateTabTitle('write documentation');
        expect(titleWrite).toContain('Wrote');

        const titleMake = generateTabTitle('make changes');
        expect(titleMake).toContain('Made');

        const titleSend = generateTabTitle('send the report');
        expect(titleSend).toContain('Sent');
      });

      it('should not double-convert already past tense verbs', () => {
        const title = generateTabTitle('updated the code');
        const words = title.split(' ');

        // Should contain Updated (from the original verb), not Updateded
        const updateWords = words.filter((w) => w.toLowerCase().includes('updat'));
        expect(updateWords.length).toBeLessThanOrEqual(1);
      });
    });

    describe('default fallback words', () => {
      it('should use Completed for empty first word', () => {
        const title = generateTabTitle('');
        expect(title).toContain('Completed');
      });

      it('should use Task, Successfully, Done for padding', () => {
        // With minimal input, should get generic words
        const title = generateTabTitle('x');
        const words = title.split(' ');

        // Should have 4 words with some generic fallbacks
        expect(words.length).toBe(4);
      });
    });
  });
});
