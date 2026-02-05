/**
 * Tests for model-router.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  selectModel,
  selectModelForTaskType,
  selectModelForAgent,
  explainModelSelection,
  selectProvider,
  getProviderForModel,
  TASK_TYPE_COMPLEXITY,
  AGENT_MODEL_MAP,
  type Complexity,
  type ModelChoice,
  type Provider,
} from './model-router';

describe('Model Router', () => {
  describe('selectModel', () => {
    describe('haiku selection', () => {
      it('should select haiku for low token, no analysis, no creativity tasks', () => {
        const complexity: Complexity = {
          tokens: 500,
          analysis: false,
          creativity: false,
          urgency: 'high',
        };
        expect(selectModel(complexity)).toBe('haiku');
      });

      it('should select haiku for very low token tasks even with low urgency', () => {
        const lowUrgency: Complexity = {
          tokens: 100,
          analysis: false,
          creativity: false,
          urgency: 'low',
        };
        // Haiku check happens first in the logic chain
        // Low tokens + no analysis + no creativity = haiku regardless of urgency
        expect(selectModel(lowUrgency)).toBe('haiku');
      });

      it('should not select haiku if analysis is needed', () => {
        const complexity: Complexity = {
          tokens: 500,
          analysis: true,
          creativity: false,
          urgency: 'high',
        };
        expect(selectModel(complexity)).not.toBe('haiku');
      });

      it('should not select haiku if creativity is needed', () => {
        const complexity: Complexity = {
          tokens: 500,
          analysis: false,
          creativity: true,
          urgency: 'high',
        };
        expect(selectModel(complexity)).not.toBe('haiku');
      });

      it('should not select haiku for high token count', () => {
        const complexity: Complexity = {
          tokens: 2000,
          analysis: false,
          creativity: false,
          urgency: 'high',
        };
        expect(selectModel(complexity)).toBe('sonnet');
      });
    });

    describe('opus selection', () => {
      it('should select opus for high tokens and low urgency', () => {
        const complexity: Complexity = {
          tokens: 6000,
          analysis: false,
          creativity: false,
          urgency: 'low',
        };
        expect(selectModel(complexity)).toBe('opus');
      });

      it('should select opus for analysis tasks with low urgency', () => {
        const complexity: Complexity = {
          tokens: 2000,
          analysis: true,
          creativity: false,
          urgency: 'low',
        };
        expect(selectModel(complexity)).toBe('opus');
      });

      it('should select opus for creative tasks with low urgency', () => {
        const complexity: Complexity = {
          tokens: 2000,
          analysis: false,
          creativity: true,
          urgency: 'low',
        };
        expect(selectModel(complexity)).toBe('opus');
      });

      it('should not select opus for high urgency even with analysis', () => {
        const complexity: Complexity = {
          tokens: 6000,
          analysis: true,
          creativity: true,
          urgency: 'high',
        };
        expect(selectModel(complexity)).toBe('sonnet');
      });

      it('should not select opus for medium urgency', () => {
        const complexity: Complexity = {
          tokens: 6000,
          analysis: true,
          creativity: true,
          urgency: 'medium',
        };
        expect(selectModel(complexity)).toBe('sonnet');
      });
    });

    describe('sonnet selection (default)', () => {
      it('should select sonnet for medium complexity tasks', () => {
        const complexity: Complexity = {
          tokens: 3000,
          analysis: true,
          creativity: false,
          urgency: 'medium',
        };
        expect(selectModel(complexity)).toBe('sonnet');
      });

      it('should select sonnet for high urgency complex tasks', () => {
        const complexity: Complexity = {
          tokens: 5000,
          analysis: true,
          creativity: true,
          urgency: 'high',
        };
        expect(selectModel(complexity)).toBe('sonnet');
      });

      it('should default to sonnet for edge cases', () => {
        const complexity: Complexity = {
          tokens: 1500,
          analysis: false,
          creativity: false,
          urgency: 'medium',
        };
        expect(selectModel(complexity)).toBe('sonnet');
      });
    });
  });

  describe('TASK_TYPE_COMPLEXITY', () => {
    it('should have haiku-appropriate tasks', () => {
      expect(TASK_TYPE_COMPLEXITY['file-lookup'].tokens).toBeLessThan(1000);
      expect(TASK_TYPE_COMPLEXITY['status-check'].tokens).toBeLessThan(1000);
      expect(TASK_TYPE_COMPLEXITY['simple-search'].tokens).toBeLessThan(1000);
    });

    it('should have opus-appropriate tasks', () => {
      expect(TASK_TYPE_COMPLEXITY['architecture-design'].tokens).toBeGreaterThan(5000);
      expect(TASK_TYPE_COMPLEXITY['architecture-design'].urgency).toBe('low');
      expect(TASK_TYPE_COMPLEXITY['prd-creation'].analysis).toBe(true);
      expect(TASK_TYPE_COMPLEXITY['prd-creation'].creativity).toBe(true);
    });

    it('should have ZAI-optimized tasks', () => {
      expect(TASK_TYPE_COMPLEXITY['code-generation']).toBeDefined();
      expect(TASK_TYPE_COMPLEXITY['rapid-prototyping']).toBeDefined();
      expect(TASK_TYPE_COMPLEXITY['code-snippet']).toBeDefined();
      expect(TASK_TYPE_COMPLEXITY['algorithm-implementation']).toBeDefined();
    });
  });

  describe('selectModelForTaskType', () => {
    it('should return haiku for file-lookup', () => {
      expect(selectModelForTaskType('file-lookup')).toBe('haiku');
    });

    it('should return sonnet for code-implementation', () => {
      expect(selectModelForTaskType('code-implementation')).toBe('sonnet');
    });

    it('should return opus for architecture-design', () => {
      expect(selectModelForTaskType('architecture-design')).toBe('opus');
    });

    it('should return sonnet for unknown task types', () => {
      expect(selectModelForTaskType('unknown-task')).toBe('sonnet');
      expect(selectModelForTaskType('')).toBe('sonnet');
    });

    it('should return sonnet for ZAI-optimized tasks (model selection)', () => {
      // Note: These return sonnet because selectModel routes based on complexity
      // Provider selection is separate from model selection
      expect(selectModelForTaskType('code-generation')).toBe('sonnet');
      expect(selectModelForTaskType('rapid-prototyping')).toBe('sonnet');
    });
  });

  describe('AGENT_MODEL_MAP', () => {
    it('should map quick lookup agents to haiku', () => {
      expect(AGENT_MODEL_MAP['codebase-locator']).toBe('haiku');
      expect(AGENT_MODEL_MAP['thoughts-locator']).toBe('haiku');
      expect(AGENT_MODEL_MAP['Explore']).toBe('haiku');
    });

    it('should map analysis agents to sonnet', () => {
      expect(AGENT_MODEL_MAP['codebase-analyzer']).toBe('sonnet');
      expect(AGENT_MODEL_MAP['thoughts-analyzer']).toBe('sonnet');
      expect(AGENT_MODEL_MAP['spotcheck']).toBe('sonnet');
    });

    it('should map research agents to sonnet', () => {
      expect(AGENT_MODEL_MAP['researcher']).toBe('sonnet');
      expect(AGENT_MODEL_MAP['perplexity-researcher']).toBe('sonnet');
      expect(AGENT_MODEL_MAP['claude-researcher']).toBe('sonnet');
      expect(AGENT_MODEL_MAP['gemini-researcher']).toBe('sonnet');
    });
  });

  describe('selectModelForAgent', () => {
    it('should return correct model for known agents', () => {
      expect(selectModelForAgent('codebase-locator')).toBe('haiku');
      expect(selectModelForAgent('engineer')).toBe('sonnet');
    });

    it('should return sonnet for unknown agents', () => {
      expect(selectModelForAgent('unknown-agent')).toBe('sonnet');
      expect(selectModelForAgent('')).toBe('sonnet');
    });
  });

  describe('explainModelSelection', () => {
    it('should explain haiku selection', () => {
      const complexity: Complexity = {
        tokens: 500,
        analysis: false,
        creativity: false,
        urgency: 'high',
      };
      const explanation = explainModelSelection('haiku', complexity);
      expect(explanation).toContain('haiku');
      expect(explanation).toContain('Low token requirement');
      expect(explanation).toContain('No deep analysis needed');
      expect(explanation).toContain('No creative generation');
    });

    it('should explain opus selection', () => {
      const complexity: Complexity = {
        tokens: 8000,
        analysis: true,
        creativity: true,
        urgency: 'low',
      };
      const explanation = explainModelSelection('opus', complexity);
      expect(explanation).toContain('opus');
      expect(explanation).toContain('High token requirement');
      expect(explanation).toContain('Deep analysis required');
      expect(explanation).toContain('Creative generation needed');
      expect(explanation).toContain('Time available');
    });

    it('should explain sonnet selection', () => {
      const complexity: Complexity = {
        tokens: 3000,
        analysis: true,
        creativity: false,
        urgency: 'medium',
      };
      const explanation = explainModelSelection('sonnet', complexity);
      expect(explanation).toContain('sonnet');
      expect(explanation).toContain('Balanced task');
      expect(explanation).toContain('Time constraints');
    });
  });

  describe('getProviderForModel', () => {
    it('should return openai for GPT models', () => {
      expect(getProviderForModel('gpt-4')).toBe('openai');
      expect(getProviderForModel('gpt-4o')).toBe('openai');
      expect(getProviderForModel('gpt-4o-mini')).toBe('openai');
      expect(getProviderForModel('gpt-3.5-turbo')).toBe('openai');
    });

    it('should return openai for o1/o3 models', () => {
      expect(getProviderForModel('o1')).toBe('openai');
      expect(getProviderForModel('o1-mini')).toBe('openai');
      expect(getProviderForModel('o1-preview')).toBe('openai');
      expect(getProviderForModel('o3')).toBe('openai');
      expect(getProviderForModel('o3-mini')).toBe('openai');
    });

    it('should return anthropic for Claude models', () => {
      expect(getProviderForModel('claude-3-opus')).toBe('anthropic');
      expect(getProviderForModel('claude-3-sonnet')).toBe('anthropic');
      expect(getProviderForModel('claude-3-haiku')).toBe('anthropic');
      expect(getProviderForModel('sonnet')).toBe('anthropic');
      expect(getProviderForModel('opus')).toBe('anthropic');
      expect(getProviderForModel('haiku')).toBe('anthropic');
    });

    it('should return anthropic for unknown models', () => {
      expect(getProviderForModel('unknown-model')).toBe('anthropic');
      expect(getProviderForModel('')).toBe('anthropic');
    });
  });
});
