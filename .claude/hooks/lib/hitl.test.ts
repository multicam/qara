/**
 * Tests for hitl.ts (Human-in-the-loop)
 *
 * Tests the HITL request class and helper functions without making actual network requests.
 */

import { describe, it, expect } from 'bun:test';
import { HITLRequest } from './hitl';

describe('HITL (Human-in-the-loop)', () => {
  describe('HITLRequest class', () => {
    it('should construct with required options', () => {
      const request = new HITLRequest({
        question: 'Do you want to proceed?',
      });

      expect(request).toBeDefined();
    });

    it('should construct with all options', () => {
      const request = new HITLRequest({
        question: 'Choose an option:',
        type: 'choice',
        choices: ['Option A', 'Option B', 'Option C'],
        timeout: 600,
        observabilityUrl: 'http://localhost:5000',
      });

      expect(request).toBeDefined();
    });

    it('should default to question type', () => {
      const request = new HITLRequest({
        question: 'What is your name?',
      });

      const hitlData = request.getHITLData();
      expect(hitlData.type).toBe('question');
    });

    it('should default timeout to 300 seconds', () => {
      const request = new HITLRequest({
        question: 'Test question',
      });

      const hitlData = request.getHITLData();
      expect(hitlData.timeout).toBe(300);
    });
  });

  describe('getHITLData', () => {
    it('should return correct structure for question type', () => {
      const request = new HITLRequest({
        question: 'What should I do next?',
        type: 'question',
      });

      const data = request.getHITLData();

      expect(data.question).toBe('What should I do next?');
      expect(data.type).toBe('question');
      expect(data.requiresResponse).toBe(true);
      expect(data.responseWebSocketUrl).toMatch(/^ws:\/\/localhost:\d+$/);
    });

    it('should return correct structure for permission type', () => {
      const request = new HITLRequest({
        question: 'Allow file deletion?',
        type: 'permission',
      });

      const data = request.getHITLData();

      expect(data.question).toBe('Allow file deletion?');
      expect(data.type).toBe('permission');
    });

    it('should return correct structure for choice type', () => {
      const choices = ['Option 1', 'Option 2', 'Option 3'];
      const request = new HITLRequest({
        question: 'Select an option:',
        type: 'choice',
        choices,
      });

      const data = request.getHITLData();

      expect(data.question).toBe('Select an option:');
      expect(data.type).toBe('choice');
      expect(data.choices).toEqual(choices);
    });

    it('should include custom timeout', () => {
      const request = new HITLRequest({
        question: 'Quick question',
        timeout: 60,
      });

      const data = request.getHITLData();
      expect(data.timeout).toBe(60);
    });
  });

  describe('Module exports', () => {
    it('should export HITLRequest class', async () => {
      const mod = await import('./hitl');
      expect(mod.HITLRequest).toBeDefined();
    });

    it('should export askQuestion function', async () => {
      const mod = await import('./hitl');
      expect(typeof mod.askQuestion).toBe('function');
    });

    it('should export askPermission function', async () => {
      const mod = await import('./hitl');
      expect(typeof mod.askPermission).toBe('function');
    });

    it('should export askChoice function', async () => {
      const mod = await import('./hitl');
      expect(typeof mod.askChoice).toBe('function');
    });
  });

  describe('Helper function signatures', () => {
    it('askQuestion should accept question, sessionData, and optional timeout', async () => {
      const mod = await import('./hitl');
      // question, sessionData, timeout=300
      expect(mod.askQuestion.length).toBeLessThanOrEqual(3);
    });

    it('askPermission should accept question, sessionData, and optional timeout', async () => {
      const mod = await import('./hitl');
      expect(mod.askPermission.length).toBeLessThanOrEqual(3);
    });

    it('askChoice should accept question, choices, sessionData, and optional timeout', async () => {
      const mod = await import('./hitl');
      expect(mod.askChoice.length).toBeLessThanOrEqual(4);
    });
  });

  describe('HITL data validation', () => {
    it('should always require response', () => {
      const request = new HITLRequest({
        question: 'Test',
      });

      const data = request.getHITLData();
      expect(data.requiresResponse).toBe(true);
    });

    it('should have valid WebSocket URL format', () => {
      const request = new HITLRequest({
        question: 'Test',
      });

      const data = request.getHITLData();
      // Port will be 0 until sendAndWait is called
      expect(data.responseWebSocketUrl).toMatch(/^ws:\/\/localhost:\d+$/);
    });

    it('should handle empty choices array for choice type', () => {
      const request = new HITLRequest({
        question: 'Choose:',
        type: 'choice',
        choices: [],
      });

      const data = request.getHITLData();
      expect(data.choices).toEqual([]);
    });

    it('should handle undefined choices for non-choice types', () => {
      const request = new HITLRequest({
        question: 'Yes or no?',
        type: 'permission',
      });

      const data = request.getHITLData();
      expect(data.choices).toBeUndefined();
    });
  });
});
