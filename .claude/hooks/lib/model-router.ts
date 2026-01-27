/**
 * model-router.ts
 *
 * Dynamic model selection based on task complexity.
 * Routes tasks to the most appropriate model (haiku, sonnet, opus)
 * based on complexity indicators.
 *
 * Part of PAI's cost-optimization and performance strategy.
 *
 * @module model-router
 */

/**
 * Complexity indicators for model selection
 */
export interface Complexity {
  /** Estimated token count for the task */
  tokens: number;
  /** Whether deep analysis/reasoning is needed */
  analysis: boolean;
  /** Whether creative generation is needed */
  creativity: boolean;
  /** Task urgency level */
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Model options (Anthropic models)
 */
export type ModelChoice = 'haiku' | 'sonnet' | 'opus';

/**
 * Provider options
 */
export type Provider = 'anthropic' | 'openai' | 'zai';

/**
 * Model characteristics for routing decisions
 */
const MODEL_CHARACTERISTICS = {
  // Anthropic models
  haiku: {
    maxTokens: 1500,
    goodFor: ['file lookup', 'simple search', 'quick validation', 'status check'],
    costMultiplier: 1, // baseline
    provider: 'anthropic' as Provider,
  },
  sonnet: {
    maxTokens: 8000,
    goodFor: ['code implementation', 'documentation', 'moderate analysis', 'testing'],
    costMultiplier: 5,
    provider: 'anthropic' as Provider,
  },
  opus: {
    maxTokens: 32000,
    goodFor: ['architecture design', 'complex reasoning', 'deep analysis', 'creative writing'],
    costMultiplier: 15,
    provider: 'anthropic' as Provider,
  },
  // ZAI GLM-4.7 Family (Dec 2025 - Coding/Agentic optimized)
  'glm-4.7': {
    maxTokens: 128000,
    contextWindow: 200000,
    goodFor: [
      'agentic coding',
      'multi-step reasoning',
      'tool invocation',
      'complex debugging',
      'multi-file refactoring',
    ],
    costMultiplier: 8, // $3/mo Coding Plan - premium tier
    provider: 'zai' as Provider,
    thinkingModes: ['interleaved', 'retention-based', 'round-level'],
  },
  'glm-4.7-flashx': {
    maxTokens: 128000,
    contextWindow: 200000,
    goodFor: ['fast code generation', 'rapid prototyping', 'algorithm implementation'],
    costMultiplier: 4, // Mid-tier pricing
    provider: 'zai' as Provider,
  },
  'glm-4.7-flash': {
    maxTokens: 128000,
    contextWindow: 200000,
    goodFor: ['general-purpose', 'Chinese writing', 'translation', 'long-form text'],
    costMultiplier: 0, // Free tier
    provider: 'zai' as Provider,
  },
  // ZAI GLM-4 Foundation (Research optimized)
  'glm-4-32b-0414-128k': {
    maxTokens: 16000,
    contextWindow: 128000,
    goodFor: [
      'Q&A services',
      'information extraction',
      'financial analysis',
      'research synthesis',
      'trend detection',
      'data cleansing',
    ],
    costMultiplier: 1, // $0.1/M tokens - most cost-effective
    provider: 'zai' as Provider,
    webSearch: true,
    functionCalling: true,
  },
  'glm-4.6v': {
    maxTokens: 4000,
    contextWindow: 8000,
    goodFor: ['vision tasks', 'image analysis', 'multimodal'],
    costMultiplier: 3,
    provider: 'zai' as Provider,
  },
} as const;

/**
 * Select the appropriate model based on task complexity
 *
 * Routing logic:
 * - haiku: Quick lookups, file location, simple search (<1000 tokens, no analysis)
 * - opus: Complex architecture, deep analysis, low urgency
 * - sonnet: Default for balanced tasks
 *
 * @param complexity - Task complexity indicators
 * @returns The recommended model choice
 */
export function selectModel(complexity: Complexity): ModelChoice {
  const { tokens, analysis, creativity, urgency } = complexity;

  // Haiku: Quick, simple tasks
  // - Low token count
  // - No deep analysis needed
  // - No creativity needed
  // - Any urgency (fast is always good)
  if (tokens < 1000 && !analysis && !creativity) {
    return 'haiku';
  }

  // Opus: Complex, deep tasks with time available
  // - High token count OR
  // - Needs deep analysis OR
  // - Needs creativity
  // - Low urgency (time to think deeply)
  if (
    (tokens > 5000 || analysis || creativity) &&
    urgency === 'low'
  ) {
    return 'opus';
  }

  // Sonnet: Default balanced choice
  // - Medium complexity
  // - Medium urgency
  // - Good balance of capability and speed
  return 'sonnet';
}

/**
 * Task type to complexity mapping
 *
 * Provides default complexity estimates for common task types
 */
export const TASK_TYPE_COMPLEXITY: Record<string, Complexity> = {
  // Haiku tasks (quick, simple)
  'file-lookup': { tokens: 200, analysis: false, creativity: false, urgency: 'high' },
  'status-check': { tokens: 100, analysis: false, creativity: false, urgency: 'high' },
  'simple-search': { tokens: 500, analysis: false, creativity: false, urgency: 'high' },
  'validation': { tokens: 300, analysis: false, creativity: false, urgency: 'high' },

  // Sonnet tasks (balanced)
  'code-implementation': { tokens: 3000, analysis: true, creativity: false, urgency: 'medium' },
  'documentation': { tokens: 2000, analysis: false, creativity: true, urgency: 'medium' },
  'testing': { tokens: 2500, analysis: true, creativity: false, urgency: 'medium' },
  'debugging': { tokens: 4000, analysis: true, creativity: false, urgency: 'medium' },
  'refactoring': { tokens: 3500, analysis: true, creativity: false, urgency: 'medium' },

  // Opus tasks (deep, complex)
  'architecture-design': { tokens: 8000, analysis: true, creativity: true, urgency: 'low' },
  'prd-creation': { tokens: 10000, analysis: true, creativity: true, urgency: 'low' },
  'deep-analysis': { tokens: 6000, analysis: true, creativity: false, urgency: 'low' },
  'creative-writing': { tokens: 5000, analysis: false, creativity: true, urgency: 'low' },
  'research-synthesis': { tokens: 7000, analysis: true, creativity: true, urgency: 'low' },

  // ZAI-optimized tasks (code generation, rapid prototyping)
  'code-generation': { tokens: 3000, analysis: false, creativity: false, urgency: 'medium' },
  'rapid-prototyping': { tokens: 2500, analysis: false, creativity: true, urgency: 'high' },
  'code-snippet': { tokens: 1000, analysis: false, creativity: false, urgency: 'high' },
  'algorithm-implementation': { tokens: 2000, analysis: true, creativity: false, urgency: 'medium' },
};

/**
 * Get recommended model for a task type
 *
 * @param taskType - The type of task
 * @returns The recommended model or 'sonnet' if unknown task type
 */
export function selectModelForTaskType(taskType: string): ModelChoice {
  const complexity = TASK_TYPE_COMPLEXITY[taskType];

  if (!complexity) {
    // Default to sonnet for unknown task types
    return 'sonnet';
  }

  return selectModel(complexity);
}

/**
 * Agent type to recommended model mapping
 *
 * Based on typical agent workloads
 */
export const AGENT_MODEL_MAP: Record<string, ModelChoice> = {
  // Quick lookup agents → haiku
  'codebase-locator': 'haiku',
  'thoughts-locator': 'haiku',
  'Explore': 'haiku',

  // Analysis agents → sonnet
  'codebase-analyzer': 'sonnet',
  'thoughts-analyzer': 'sonnet',
  'codebase-pattern-finder': 'sonnet',
  'spotcheck': 'sonnet',

  // Heavy-duty agents → opus (when time allows) or sonnet
  'architect': 'sonnet', // Could upgrade to opus for complex PRDs
  'engineer': 'sonnet',
  'designer': 'sonnet',
  'Plan': 'sonnet', // Could upgrade to opus for complex plans

  // Research agents → varies by depth
  'researcher': 'sonnet',
  'perplexity-researcher': 'sonnet',
  'claude-researcher': 'sonnet',
  'gemini-researcher': 'sonnet',
  'web-search-researcher': 'sonnet',
  'zai-researcher': 'sonnet',

  // ZAI agents
  'zai-coder': 'sonnet',
};

/**
 * Get recommended model for an agent type
 *
 * @param agentType - The agent type
 * @returns The recommended model
 */
export function selectModelForAgent(agentType: string): ModelChoice {
  return AGENT_MODEL_MAP[agentType] || 'sonnet';
}

/**
 * Explain model selection rationale
 *
 * @param model - The selected model
 * @param complexity - The complexity indicators
 * @returns Human-readable explanation
 */
export function explainModelSelection(
  model: ModelChoice,
  complexity: Complexity
): string {
  const reasons: string[] = [];

  switch (model) {
    case 'haiku':
      reasons.push('Low token requirement (<1000)');
      if (!complexity.analysis) reasons.push('No deep analysis needed');
      if (!complexity.creativity) reasons.push('No creative generation');
      break;
    case 'opus':
      if (complexity.tokens > 5000) reasons.push('High token requirement');
      if (complexity.analysis) reasons.push('Deep analysis required');
      if (complexity.creativity) reasons.push('Creative generation needed');
      if (complexity.urgency === 'low') reasons.push('Time available for thorough work');
      break;
    case 'sonnet':
      reasons.push('Balanced task suitable for default model');
      if (complexity.urgency !== 'low') reasons.push('Time constraints favor speed');
      break;
  }

  return `Model: ${model} - ${reasons.join(', ')}`;
}

/**
 * Task types that should prefer ZAI provider
 */
const ZAI_PREFERRED_TASKS = [
  // GLM-4.7 (Flagship) - Agentic coding
  'agentic-coding',
  'multi-step-debugging',
  'complex-refactoring',
  'tool-chain-orchestration',
  // GLM-4.7-FlashX - Fast coding
  'code-generation',
  'rapid-prototyping',
  'code-snippet',
  'algorithm-implementation',
  // GLM-4-32B - Research
  'technical-research',
  'qa-service',
  'information-extraction',
  'financial-analysis',
  'trend-detection',
];

/**
 * ZAI model selection based on task type
 */
export type ZaiModelChoice =
  | 'glm-4.7'
  | 'glm-4.7-flashx'
  | 'glm-4.7-flash'
  | 'glm-4-32b-0414-128k'
  | 'glm-4.6v';

const ZAI_TASK_MODEL_MAP: Record<string, ZaiModelChoice> = {
  // GLM-4.7 (Flagship) - Complex agentic tasks
  'agentic-coding': 'glm-4.7',
  'multi-step-debugging': 'glm-4.7',
  'complex-refactoring': 'glm-4.7',
  'tool-chain-orchestration': 'glm-4.7',
  'architecture-implementation': 'glm-4.7',

  // GLM-4.7-FlashX - Fast coding tasks
  'code-generation': 'glm-4.7-flashx',
  'rapid-prototyping': 'glm-4.7-flashx',
  'code-snippet': 'glm-4.7-flashx',
  'algorithm-implementation': 'glm-4.7-flashx',

  // GLM-4.7-Flash - General purpose (free)
  'general-qa': 'glm-4.7-flash',
  'translation': 'glm-4.7-flash',
  'summarization': 'glm-4.7-flash',
  'chinese-content': 'glm-4.7-flash',

  // GLM-4-32B - Research (cost-effective)
  'technical-research': 'glm-4-32b-0414-128k',
  'qa-service': 'glm-4-32b-0414-128k',
  'information-extraction': 'glm-4-32b-0414-128k',
  'financial-analysis': 'glm-4-32b-0414-128k',
  'trend-detection': 'glm-4-32b-0414-128k',
  'research-synthesis': 'glm-4-32b-0414-128k',

  // GLM-4.6v - Vision tasks
  'image-analysis': 'glm-4.6v',
  'multimodal': 'glm-4.6v',
};

/**
 * Select the best ZAI model for a task type
 *
 * @param taskType - The type of task
 * @returns The recommended ZAI model
 */
export function selectZaiModel(taskType: string): ZaiModelChoice {
  return ZAI_TASK_MODEL_MAP[taskType] || 'glm-4.7-flashx'; // Default to fast coder
}

/**
 * Select the appropriate provider based on task type
 *
 * @param taskType - The type of task
 * @returns The recommended provider
 */
export function selectProvider(taskType: string): Provider {
  // Check if ZAI is configured
  const zaiConfigured = !!process.env.ZAI_API_KEY;

  // ZAI preferred tasks route to ZAI when available
  if (zaiConfigured && ZAI_PREFERRED_TASKS.includes(taskType)) {
    return 'zai';
  }

  // Default to Anthropic
  return 'anthropic';
}

/**
 * Get provider for a specific model
 *
 * @param model - The model name
 * @returns The provider for that model
 */
export function getProviderForModel(model: string): Provider {
  if (model.startsWith('glm-')) {
    return 'zai';
  }
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) {
    return 'openai';
  }
  return 'anthropic';
}
