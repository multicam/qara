# Qara v2: Implementation Blueprint

**Date:** 2025-12-01  
**Status:** Design Specification  
**Purpose:** Detailed technical blueprint for Qara next-generation architecture

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Runtime Design](#core-runtime-design)
3. [Compiled Routing System](#compiled-routing-system)
4. [Skill Execution Engine](#skill-execution-engine)
5. [Context Management Layer](#context-management-layer)
6. [Plugin Architecture](#plugin-architecture)
7. [Migration Strategy](#migration-strategy)
8. [Performance Targets](#performance-targets)

---

## Architecture Overview

### The Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           User Interface Layer                  │
│  CLI • REPL • HTTP API • IDE Extension          │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│          Orchestration Layer                    │
│  Router • Executor • Context • History          │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│           Execution Layer                       │
│  Skills (TS) • LLM Adapters • Plugins           │
└─────────────────────────────────────────────────┘
```

### Design Principles

1. **Determinism First** - Code over prompts
2. **Zero Latency** - Compiled routing, streaming execution
3. **Perfect Context** - Graph queries, not file scanning
4. **Runtime Agnostic** - Abstract LLM interface
5. **Progressive Complexity** - Simple by default, powerful when needed

---

## Core Runtime Design

### Minimal Runtime (~500 lines)

```typescript
// packages/core/src/runtime.ts

import { Router } from './router';
import { Executor } from './executor';
import { ContextManager } from './context';
import { History } from './history';
import type { Skill, Context, Result, Config } from './types';

export class QaraRuntime {
  private router: Router;
  private executor: Executor;
  private context: ContextManager;
  private history: History;

  constructor(config: Config) {
    this.router = new Router(config.skills);
    this.executor = new Executor(config.llm);
    this.context = new ContextManager(config.contextStore);
    this.history = new History(config.historyPath);
  }

  /**
   * Execute a natural language request
   * This is the main entry point for all operations
   */
  async execute(input: string): Promise<Result> {
    // 1. Route to skill (deterministic, <1ms)
    const route = this.router.route(input);
    if (!route) {
      throw new Error('No matching skill found');
    }

    // 2. Load minimal context (graph query, <10ms)
    const ctx = await this.context.load(route.skill, input);

    // 3. Execute skill (streaming)
    const result = await this.executor.execute(
      route.skill,
      route.action,
      ctx
    );

    // 4. Log to history (async, non-blocking)
    this.history.log({ input, route, result }).catch(console.error);

    return result;
  }

  /**
   * Stream execution with real-time results
   */
  async *stream(input: string): AsyncIterableIterator<Result> {
    const route = this.router.route(input);
    if (!route) throw new Error('No skill found');

    const ctx = await this.context.load(route.skill, input);

    for await (const chunk of this.executor.stream(route.skill, route.action, ctx)) {
      yield chunk;
    }
  }
}
```

---

## Compiled Routing System

### The Problem with Current Routing

```typescript
// Current: AI matches natural language triggers
// Latency: 1-3 seconds
// Cost: 1,000-10,000 tokens per route
// Reliability: ~95% (can misroute)

async function routeCurrent(input: string, skills: Skill[]): Promise<Skill> {
  const prompt = `
    User said: "${input}"
    Available skills: ${skills.map(s => s.triggers).join(', ')}
    Which skill should handle this?
  `;
  const response = await llm.complete(prompt); // SLOW!
  return findSkill(response);
}
```

### The Solution: Compiled Trie

```typescript
// packages/core/src/router.ts

interface RouteNode {
  skills: Set<Skill>;
  children: Map<string, RouteNode>;
  isTerminal: boolean;
}

export class Router {
  private root: RouteNode;
  private skillMap: Map<string, Skill>;

  constructor(skills: Skill[]) {
    this.skillMap = new Map(skills.map(s => [s.id, s]));
    this.root = this.buildTrie(skills);
  }

  /**
   * Build a trie from all skill triggers at compile time
   * This is a one-time cost, happens during initialization
   */
  private buildTrie(skills: Skill[]): RouteNode {
    const root: RouteNode = { skills: new Set(), children: new Map(), isTerminal: false };

    for (const skill of skills) {
      for (const trigger of skill.triggers) {
        const tokens = this.tokenize(trigger);
        let node = root;

        for (const token of tokens) {
          if (!node.children.has(token)) {
            node.children.set(token, { 
              skills: new Set(), 
              children: new Map(), 
              isTerminal: false 
            });
          }
          node = node.children.get(token)!;
          node.skills.add(skill);
        }
        node.isTerminal = true;
      }
    }

    return root;
  }

  /**
   * Route in O(k) time where k = number of tokens in input
   * Typical: <1ms for any input
   */
  route(input: string): { skill: Skill; action: string; confidence: number } | null {
    const tokens = this.tokenize(input);
    let node = this.root;
    let bestMatch: Skill | null = null;
    let matchStrength = 0;

    // Walk the trie
    for (const token of tokens) {
      if (!node.children.has(token)) break;
      node = node.children.get(token)!;
      
      if (node.isTerminal && node.skills.size > 0) {
        // Found a match, update if stronger
        const strength = this.calculateStrength(node, tokens);
        if (strength > matchStrength) {
          bestMatch = Array.from(node.skills)[0]; // Pick highest priority
          matchStrength = strength;
        }
      }
    }

    if (!bestMatch) {
      // Fallback: fuzzy matching
      return this.fuzzyMatch(input);
    }

    return {
      skill: bestMatch,
      action: this.inferAction(bestMatch, input),
      confidence: matchStrength
    };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  private calculateStrength(node: RouteNode, tokens: string[]): number {
    // More matching tokens = stronger match
    return node.skills.size > 0 ? tokens.length / node.skills.size : 0;
  }

  private fuzzyMatch(input: string): { skill: Skill; action: string; confidence: number } | null {
    // Semantic similarity as fallback (using embeddings if available)
    // For now, simple keyword overlap
    let bestSkill: Skill | null = null;
    let bestScore = 0;

    const inputTokens = new Set(this.tokenize(input));

    for (const skill of this.skillMap.values()) {
      for (const trigger of skill.triggers) {
        const triggerTokens = new Set(this.tokenize(trigger));
        const overlap = [...inputTokens].filter(t => triggerTokens.has(t)).length;
        const score = overlap / Math.max(inputTokens.size, triggerTokens.size);

        if (score > bestScore) {
          bestScore = score;
          bestSkill = skill;
        }
      }
    }

    return bestSkill && bestScore > 0.3
      ? { skill: bestSkill, action: 'default', confidence: bestScore }
      : null;
  }

  private inferAction(skill: Skill, input: string): string {
    // Simple heuristic: match action names to input
    const tokens = this.tokenize(input);
    const actions = Object.keys(skill.actions);

    for (const action of actions) {
      if (tokens.includes(action.toLowerCase())) {
        return action;
      }
    }

    return 'default';
  }
}
```

### Performance Characteristics

```
Routing latency:
- Best case: O(1) - direct hash match
- Average case: O(k) where k = input tokens (~5-10)
- Worst case: O(n*m) fuzzy match where n = skills, m = triggers

Typical performance:
- Direct match: <1ms
- Fuzzy match: <5ms

Compare to current:
- AI matching: 1,000-3,000ms

Improvement: 200-3000x faster
```

---

## Skill Execution Engine

### Skills as TypeScript Modules

```typescript
// packages/sdk/src/skill.ts

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: Record<string, SkillAction>;
  requiredTools?: string[];
  dependencies?: string[];
}

export type SkillAction = (ctx: SkillContext) => Promise<SkillResult>;

export interface SkillContext {
  input: string;
  params: Record<string, any>;
  history: Event[];
  tools: ToolRegistry;
  llm: LLMAdapter;
}

export interface SkillResult {
  success: boolean;
  output: string;
  artifacts?: Record<string, any>;
  nextActions?: string[];
}

/**
 * Base class for all skills
 */
export abstract class Skill implements SkillDefinition {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract triggers: string[];
  abstract actions: Record<string, SkillAction>;

  /**
   * Validate context before execution
   */
  async validate(ctx: SkillContext): Promise<void> {
    if (this.requiredTools) {
      for (const tool of this.requiredTools) {
        if (!ctx.tools.has(tool)) {
          throw new Error(`Required tool not available: ${tool}`);
        }
      }
    }
  }

  /**
   * Execute a specific action
   */
  async execute(action: string, ctx: SkillContext): Promise<SkillResult> {
    await this.validate(ctx);

    const handler = this.actions[action];
    if (!handler) {
      throw new Error(`Action not found: ${action}`);
    }

    return handler.call(this, ctx);
  }
}
```

### Example: Blog Skill Implementation

```typescript
// skills/blog/skill.ts

import { Skill, SkillContext, SkillResult } from '@qara/sdk';
import { generateSlug, loadTemplate, formatMarkdown } from './utils';

export default class BlogSkill extends Skill {
  id = 'blog';
  name = 'Blog Management';
  description = 'Write, edit, and publish blog posts';
  triggers = [
    'write blog',
    'create post',
    'publish blog',
    'edit post',
    'draft article'
  ];

  actions = {
    write: this.writeBlog.bind(this),
    publish: this.publishBlog.bind(this),
    edit: this.editBlog.bind(this),
  };

  requiredTools = ['git', 'file'];

  /**
   * Write a new blog post
   */
  async writeBlog(ctx: SkillContext): Promise<SkillResult> {
    const { input, llm, tools } = ctx;

    // Extract topic from input
    const topic = this.extractTopic(input);
    if (!topic) {
      return {
        success: false,
        output: 'Please specify a topic for the blog post'
      };
    }

    // Generate draft using LLM
    const draft = await llm.complete({
      system: 'You are a skilled technical writer.',
      prompt: `Write a comprehensive blog post about: ${topic}`,
      maxTokens: 2000
    });

    // Apply template and formatting
    const template = await loadTemplate('blog-post.md');
    const formatted = formatMarkdown(draft, template);

    // Save draft
    const slug = generateSlug(topic);
    const path = `drafts/${slug}.md`;
    await tools.get('file').write(path, formatted);

    return {
      success: true,
      output: `Draft created: ${path}`,
      artifacts: { path, content: formatted },
      nextActions: ['edit', 'publish']
    };
  }

  /**
   * Publish blog post to production
   */
  async publishBlog(ctx: SkillContext): Promise<SkillResult> {
    const { tools } = ctx;

    // Get latest draft
    const drafts = await tools.get('file').list('drafts/');
    if (drafts.length === 0) {
      return {
        success: false,
        output: 'No drafts found. Write a blog post first.'
      };
    }

    const latestDraft = drafts[0]; // Most recent
    const content = await tools.get('file').read(latestDraft);

    // Move to published
    const publishPath = latestDraft.replace('drafts/', 'published/');
    await tools.get('file').move(latestDraft, publishPath);

    // Commit and push
    const git = tools.get('git');
    await git.add(publishPath);
    await git.commit(`Published: ${publishPath}`);
    await git.push();

    return {
      success: true,
      output: `Published to ${publishPath}`,
      artifacts: { url: this.getBlogUrl(publishPath) }
    };
  }

  /**
   * Edit an existing blog post
   */
  async editBlog(ctx: SkillContext): Promise<SkillResult> {
    const { input, llm, tools } = ctx;

    // Find post to edit
    const postPath = this.extractPath(input);
    if (!postPath) {
      return {
        success: false,
        output: 'Please specify which post to edit'
      };
    }

    // Read current content
    const current = await tools.get('file').read(postPath);

    // Get edit instructions
    const instructions = this.extractEditInstructions(input);

    // Apply edits using LLM
    const edited = await llm.complete({
      system: 'You are editing a blog post.',
      prompt: `
        Current content:
        ${current}
        
        Edit instructions:
        ${instructions}
        
        Return the edited content.
      `,
      maxTokens: 2000
    });

    // Save
    await tools.get('file').write(postPath, edited);

    return {
      success: true,
      output: `Updated: ${postPath}`,
      artifacts: { path: postPath, content: edited }
    };
  }

  // Helper methods
  private extractTopic(input: string): string | null {
    const match = input.match(/(?:about|on|regarding)\s+(.+)/i);
    return match ? match[1].trim() : null;
  }

  private extractPath(input: string): string | null {
    const match = input.match(/(?:post|file)\s+(.+\.md)/i);
    return match ? match[1].trim() : null;
  }

  private extractEditInstructions(input: string): string {
    const match = input.match(/(?:edit|change|update)\s+(.+)/i);
    return match ? match[1].trim() : input;
  }

  private getBlogUrl(path: string): string {
    const slug = path.replace(/^published\//, '').replace(/\.md$/, '');
    return `https://yourblog.com/posts/${slug}`;
  }
}
```

### Unit Testing Skills

```typescript
// skills/blog/skill.test.ts

import { describe, test, expect, mock } from 'bun:test';
import BlogSkill from './skill';

describe('BlogSkill', () => {
  const mockLLM = {
    complete: mock(async () => 'Generated blog content...')
  };

  const mockTools = {
    get: mock((tool) => {
      if (tool === 'file') {
        return {
          write: mock(async () => {}),
          read: mock(async () => 'Existing content'),
          list: mock(async () => ['drafts/test.md']),
          move: mock(async () => {})
        };
      }
      if (tool === 'git') {
        return {
          add: mock(async () => {}),
          commit: mock(async () => {}),
          push: mock(async () => {})
        };
      }
    }),
    has: mock(() => true)
  };

  test('writeBlog creates a draft', async () => {
    const skill = new BlogSkill();
    const result = await skill.writeBlog({
      input: 'write blog about AI safety',
      params: {},
      history: [],
      tools: mockTools,
      llm: mockLLM
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Draft created');
    expect(mockLLM.complete).toHaveBeenCalled();
  });

  test('publishBlog moves draft to published', async () => {
    const skill = new BlogSkill();
    const result = await skill.publishBlog({
      input: 'publish blog',
      params: {},
      history: [],
      tools: mockTools,
      llm: mockLLM
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Published');
    expect(mockTools.get('git').push).toHaveBeenCalled();
  });
});
```

---

## Context Management Layer

### From Files to Graphs

```typescript
// packages/core/src/context.ts

import type { Skill } from './types';

interface ContextNode {
  id: string;
  type: 'skill' | 'doc' | 'example' | 'tool';
  content: string;
  embedding?: Float32Array;
  edges: ContextEdge[];
}

interface ContextEdge {
  to: string;
  type: 'requires' | 'references' | 'similar' | 'uses';
  weight: number;
}

export class ContextGraph {
  private nodes: Map<string, ContextNode>;
  private embeddings: EmbeddingStore;

  constructor() {
    this.nodes = new Map();
    this.embeddings = new EmbeddingStore();
  }

  /**
   * Add a skill to the graph
   */
  async addSkill(skill: Skill): Promise<void> {
    const node: ContextNode = {
      id: skill.id,
      type: 'skill',
      content: JSON.stringify(skill),
      edges: []
    };

    // Embed skill content
    node.embedding = await this.embeddings.embed(node.content);

    // Add edges for dependencies
    if (skill.dependencies) {
      for (const dep of skill.dependencies) {
        node.edges.push({ to: dep, type: 'requires', weight: 1.0 });
      }
    }

    this.nodes.set(skill.id, node);
  }

  /**
   * Query for relevant context
   * Returns minimal set of nodes needed for execution
   */
  async query(opts: {
    skill: Skill;
    input: string;
    maxTokens: number;
    relevanceThreshold: number;
  }): Promise<ContextNode[]> {
    const { skill, input, maxTokens, relevanceThreshold } = opts;

    // 1. Start with skill node
    const result: ContextNode[] = [this.nodes.get(skill.id)!];
    let tokenCount = this.estimateTokens(result[0].content);

    // 2. Embed input query
    const queryEmbedding = await this.embeddings.embed(input);

    // 3. Find similar nodes via vector search
    const candidates = await this.embeddings.search(queryEmbedding, {
      topK: 20,
      threshold: relevanceThreshold
    });

    // 4. Add nodes until token budget exhausted
    for (const candidate of candidates) {
      const node = this.nodes.get(candidate.id);
      if (!node) continue;

      const nodeTokens = this.estimateTokens(node.content);
      if (tokenCount + nodeTokens > maxTokens) break;

      result.push(node);
      tokenCount += nodeTokens;
    }

    // 5. Add required dependencies (even if over budget)
    const deps = this.getRequiredDependencies(skill);
    for (const dep of deps) {
      if (!result.find(n => n.id === dep.id)) {
        result.push(dep);
      }
    }

    return result;
  }

  private getRequiredDependencies(skill: Skill): ContextNode[] {
    const deps: ContextNode[] = [];
    const visited = new Set<string>();
    const queue = [skill.id];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;

      for (const edge of node.edges) {
        if (edge.type === 'requires') {
          const depNode = this.nodes.get(edge.to);
          if (depNode) {
            deps.push(depNode);
            queue.push(edge.to);
          }
        }
      }
    }

    return deps;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 4 chars = 1 token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Simple in-memory embedding store
 * In production, use a vector database (Chroma, Pinecone, etc.)
 */
class EmbeddingStore {
  private embeddings: Map<string, { id: string; vector: Float32Array }>;

  constructor() {
    this.embeddings = new Map();
  }

  async embed(text: string): Promise<Float32Array> {
    // In production, use OpenAI embeddings or similar
    // For now, simple hash-based vector
    const hash = this.simpleHash(text);
    return new Float32Array([hash % 1000 / 1000]);
  }

  async search(query: Float32Array, opts: { topK: number; threshold: number }) {
    const results: Array<{ id: string; score: number }> = [];

    for (const [id, emb] of this.embeddings) {
      const score = this.cosineSimilarity(query, emb.vector);
      if (score >= opts.threshold) {
        results.push({ id, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.topK);
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}
```

---

## Plugin Architecture

### Plugins for Optional Features

```typescript
// packages/core/src/plugin.ts

export interface Plugin {
  name: string;
  version: string;
  init(runtime: QaraRuntime): Promise<void>;
  shutdown?(): Promise<void>;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`);
    }
    
    this.plugins.set(plugin.name, plugin);
  }

  async initAll(runtime: QaraRuntime): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.init(runtime);
    }
  }

  async shutdownAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.shutdown) {
        await plugin.shutdown();
      }
    }
  }
}
```

### Example: Streaming Plugin

```typescript
// plugins/streaming/index.ts

import type { Plugin, QaraRuntime } from '@qara/core';

export class StreamingPlugin implements Plugin {
  name = 'streaming';
  version = '1.0.0';

  async init(runtime: QaraRuntime): Promise<void> {
    // Monkey-patch executor to support streaming
    const originalExecute = runtime.executor.execute.bind(runtime.executor);

    runtime.executor.execute = async function(skill, action, ctx) {
      const stream = this.stream(skill, action, ctx);
      
      let result;
      for await (const chunk of stream) {
        // Print chunk immediately
        console.log(chunk);
        result = chunk;
      }
      
      return result;
    };
  }
}

// Usage
import { Qara } from '@qara/core';
import { StreamingPlugin } from '@qara/plugin-streaming';

const qara = new Qara();
await qara.plugins.register(new StreamingPlugin());
await qara.execute("write blog about AI"); // Streams output
```

### Example: Caching Plugin

```typescript
// plugins/caching/index.ts

import type { Plugin, QaraRuntime } from '@qara/core';
import { LRU } from 'lru-cache';

export class CachingPlugin implements Plugin {
  name = 'caching';
  version = '1.0.0';
  private cache: LRU<string, any>;

  constructor(opts = { max: 1000 }) {
    this.cache = new LRU(opts);
  }

  async init(runtime: QaraRuntime): Promise<void> {
    const originalExecute = runtime.executor.execute.bind(runtime.executor);

    runtime.executor.execute = async (skill, action, ctx) => {
      const key = this.cacheKey(skill, action, ctx);
      const cached = this.cache.get(key);
      
      if (cached) {
        console.log('[cache] HIT');
        return cached;
      }

      console.log('[cache] MISS');
      const result = await originalExecute(skill, action, ctx);
      
      if (this.isCacheable(result)) {
        this.cache.set(key, result);
      }

      return result;
    };
  }

  private cacheKey(skill: any, action: string, ctx: any): string {
    return `${skill.id}:${action}:${JSON.stringify(ctx.params)}`;
  }

  private isCacheable(result: any): boolean {
    // Don't cache errors or non-deterministic results
    return result.success && !result.metadata?.noncacheable;
  }
}
```

---

## Migration Strategy

### Phase 1: Parallel Runtime (Week 1-4)

```typescript
// Run both v1 (current) and v2 (new) side-by-side

import { QaraV1 } from './v1';
import { QaraV2 } from './v2';

const v1 = new QaraV1();
const v2 = new QaraV2();

async function execute(input: string) {
  // Run both
  const [result1, result2] = await Promise.all([
    v1.execute(input),
    v2.execute(input)
  ]);

  // Compare
  if (JSON.stringify(result1) !== JSON.stringify(result2)) {
    console.error('DIVERGENCE:', { input, result1, result2 });
  }

  // Return v1 result (safe)
  return result1;
}
```

### Phase 2: Gradual Cutover (Week 5-8)

```typescript
// Gradually increase v2 traffic

const V2_TRAFFIC_PERCENTAGE = 10; // Start at 10%

async function execute(input: string) {
  const useV2 = Math.random() * 100 < V2_TRAFFIC_PERCENTAGE;

  if (useV2) {
    try {
      return await v2.execute(input);
    } catch (err) {
      console.error('V2 failed, falling back to V1:', err);
      return await v1.execute(input);
    }
  }

  return await v1.execute(input);
}

// Gradually increase percentage: 10% → 25% → 50% → 75% → 100%
```

### Phase 3: Deprecation (Week 9-12)

```typescript
// v2 is default, v1 is fallback only

async function execute(input: string) {
  try {
    return await v2.execute(input);
  } catch (err) {
    console.warn('V2 failed, using V1:', err);
    return await v1.execute(input);
  }
}

// After 4 weeks with no V1 usage, remove completely
```

---

## Performance Targets

### Latency Targets

| Operation | Current | Target | Improvement |
|-----------|---------|--------|-------------|
| Route | 1-3s | <10ms | 100-300x |
| Context load | 0.5-2s | <50ms | 10-40x |
| Execute (deterministic) | varies | <100ms | - |
| Execute (LLM) | 2-10s | 2-10s | (unchanged) |
| **Total (simple task)** | **3-15s** | **<200ms** | **15-75x** |

### Token Usage Targets

| Operation | Current | Target | Reduction |
|-----------|---------|--------|-----------|
| Routing | 1K-10K | 0 | 100% |
| Context | 1K-5K | 200-500 | 80-90% |
| Execution | varies | varies | - |
| **Total** | **2K-15K** | **200-500** | **85-97%** |

### Reliability Targets

| Metric | Current | Target |
|--------|---------|--------|
| Routing accuracy | ~95% | 100% |
| Context relevance | ~80% | ~95% |
| Execution success | ~90% | ~95% |
| **Overall reliability** | **~68%** | **~90%** |

---

## Success Criteria

### Must Have (MVP)

- ✅ Compiled routing <10ms
- ✅ Skills as TypeScript
- ✅ Unit testable
- ✅ Backward compatible (can run v1 skills)
- ✅ 10x faster routing

### Should Have (v2.1)

- ✅ Streaming execution
- ✅ Result caching
- ✅ Vector-based context
- ✅ Plugin architecture
- ✅ 10x faster overall

### Nice to Have (v2.2+)

- ⚠️ Multi-model ensemble
- ⚠️ Visual programming interface
- ⚠️ Auto-generated skills
- ⚠️ Distributed execution

---

## Next Steps

1. **Week 1:** Build POC router + 1 skill
2. **Week 2-3:** Complete runtime + 5 skills
3. **Week 4:** Add streaming + caching plugins
4. **Week 5-8:** Parallel run + validation
5. **Week 9-12:** Cutover + deprecation

**Timeline: 12 weeks to production**

---

**End Blueprint**
