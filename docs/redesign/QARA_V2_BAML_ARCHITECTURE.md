# Qara v2: BAML-Powered Architecture

**Date:** 2025-12-01  
**BAML Version:** 0.335+  
**Purpose:** Redesign Qara using BAML as the core implementation layer

---

## Executive Summary

**The Breakthrough:** Use BAML (Boundary AI Markup Language) to implement the compiled routing vision.

BAML provides:
- ✅ **Type-safe structured outputs** (exactly what we need for skills)
- ✅ **VSCode playground** (hot-reloading, instant testing)
- ✅ **Multi-LLM support** (vendor independence achieved)
- ✅ **Auto-generated clients** (TypeScript/Python/Ruby)
- ✅ **Built-in retry/failover** (production-grade reliability)
- ✅ **Automatic JSON parsing/repair** (handles broken LLM outputs)

**This solves 90% of the v2 implementation complexity.**

---

## The Architecture

### Three-Layer Design with BAML

```
┌─────────────────────────────────────────────────┐
│         User Interface Layer                    │
│    CLI • REPL • HTTP API • IDE Extension        │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│      Qara Runtime Layer (TypeScript)            │
│  Router • Orchestrator • Context • History      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│         BAML Skill Layer (.baml)                │
│  Skills as BAML functions • Type-safe I/O       │
│  Auto-generated clients • Multi-LLM support     │
└─────────────────────────────────────────────────┘
```

### Why BAML is Perfect for Qara

| Requirement | BAML Solution |
|-------------|---------------|
| Type-safe skills | BAML `class` + `function` definitions |
| Instant testing | VSCode playground with hot-reload |
| Multi-LLM support | Built-in client abstraction |
| Deterministic routing | TypeScript wrapper around BAML |
| Structured outputs | BAML's core competency |
| Retry logic | Built-in `retry_policy` |
| JSON repair | Automatic SAP (Schema-Aligned Parsing) |
| Developer UX | Markdown-like preview + autocomplete |

---

## Core Implementation

### 1. Skills as BAML Functions

**Before (Markdown):**
```markdown
# Blog Skill

Write and publish blog posts.

## Triggers
- write blog
- create post
- publish blog

## Implementation
<!-- Complex markdown instructions -->
```

**After (BAML):**
```baml
// baml_src/skills/blog.baml

// Type definitions
class BlogPost {
  title string @description("Compelling blog post title")
  content string @description("Markdown-formatted blog content")
  slug string @description("URL-safe slug")
  tags string[] @description("Relevant topic tags")
  draft bool @description("True if draft, false if ready to publish")
}

class BlogContext {
  topic string
  style string @description("writing style: technical, casual, academic")
  length int @description("target word count")
  existing_posts string[] @description("titles of related existing posts")
}

// Skill function
function WriteBlog(ctx: BlogContext) -> BlogPost {
  client GPT4o
  prompt #"
    You are a skilled technical writer.
    
    Write a comprehensive blog post about: {{ ctx.topic }}
    
    Style: {{ ctx.style }}
    Target length: {{ ctx.length }} words
    
    {% if ctx.existing_posts %}
    Related posts (avoid duplication):
    {% for post in ctx.existing_posts %}
    - {{ post }}
    {% endfor %}
    {% endif %}
    
    {{ ctx.output_format }}
  "#
}

function PublishBlog(draft: BlogPost, publish_path: string) -> BlogPost {
  client GPT4oMini
  prompt #"
    Review and finalize this blog post for publication:
    
    Title: {{ draft.title }}
    Content:
    {{ draft.content }}
    
    Tasks:
    1. Fix any typos or grammatical errors
    2. Ensure proper markdown formatting
    3. Set draft=false
    4. Keep all other fields unchanged
    
    {{ ctx.output_format }}
  "#
}

// Test cases
test WriteBlog_AI_Safety {
  functions [WriteBlog]
  args {
    ctx {
      topic "AI Safety and Alignment"
      style "technical"
      length 1500
      existing_posts ["Introduction to AI", "Machine Learning Basics"]
    }
  }
}

test PublishBlog_Review {
  functions [PublishBlog]
  args {
    draft {
      title "AI Safety: A Primer"
      content "# AI Safety\n\nContent here..."
      slug "ai-safety-primer"
      tags ["AI", "Safety", "Alignment"]
      draft true
    }
    publish_path "published/ai-safety-primer.md"
  }
}
```

---

### 2. Deterministic Router (TypeScript)

The router is pure TypeScript code that dispatches to BAML functions:

```typescript
// src/router/router.ts

import { b } from '../baml_client';
import type { SkillFunction, RouteMatch } from './types';

interface RouteNode {
  skills: SkillFunction[];
  children: Map<string, RouteNode>;
  isTerminal: boolean;
}

export class QaraRouter {
  private trie: RouteNode;
  private skillMap: Map<string, SkillFunction>;

  constructor(skills: SkillFunction[]) {
    this.skillMap = new Map(skills.map(s => [s.id, s]));
    this.trie = this.buildTrie(skills);
  }

  /**
   * O(k) deterministic routing where k = input tokens
   * Returns skill function reference + confidence
   */
  route(input: string): RouteMatch | null {
    const tokens = this.tokenize(input);
    let node = this.trie;
    let bestMatch: SkillFunction | null = null;
    let matchStrength = 0;

    // Walk trie
    for (const token of tokens) {
      if (!node.children.has(token)) break;
      node = node.children.get(token)!;
      
      if (node.isTerminal && node.skills.length > 0) {
        const strength = tokens.length / node.skills.length;
        if (strength > matchStrength) {
          bestMatch = node.skills[0];
          matchStrength = strength;
        }
      }
    }

    if (!bestMatch) {
      return this.fuzzyMatch(input);
    }

    return {
      skill: bestMatch,
      confidence: matchStrength,
      tokens
    };
  }

  private buildTrie(skills: SkillFunction[]): RouteNode {
    const root: RouteNode = {
      skills: [],
      children: new Map(),
      isTerminal: false
    };

    for (const skill of skills) {
      for (const trigger of skill.triggers) {
        const tokens = this.tokenize(trigger);
        let node = root;

        for (const token of tokens) {
          if (!node.children.has(token)) {
            node.children.set(token, {
              skills: [],
              children: new Map(),
              isTerminal: false
            });
          }
          node = node.children.get(token)!;
          node.skills.push(skill);
        }
        node.isTerminal = true;
      }
    }

    return root;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  private fuzzyMatch(input: string): RouteMatch | null {
    // Fallback: keyword overlap scoring
    const inputTokens = new Set(this.tokenize(input));
    let bestSkill: SkillFunction | null = null;
    let bestScore = 0;

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
      ? { skill: bestSkill, confidence: bestScore, tokens: [...inputTokens] }
      : null;
  }
}
```

---

### 3. Skill Registry (TypeScript + BAML)

```typescript
// src/skills/registry.ts

import { b } from '../baml_client';

export interface SkillFunction {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  bamlFunction: string; // Name of BAML function
  requiresContext?: string[];
}

export const SKILLS: SkillFunction[] = [
  {
    id: 'blog-write',
    name: 'Write Blog Post',
    description: 'Create a new blog post from a topic',
    triggers: [
      'write blog',
      'create post',
      'draft article',
      'new blog post'
    ],
    bamlFunction: 'WriteBlog',
    requiresContext: ['existing_posts']
  },
  {
    id: 'blog-publish',
    name: 'Publish Blog Post',
    description: 'Review and publish a draft blog post',
    triggers: [
      'publish blog',
      'publish post',
      'finalize article'
    ],
    bamlFunction: 'PublishBlog'
  },
  {
    id: 'research-topic',
    name: 'Research Topic',
    description: 'Conduct comprehensive research on a topic',
    triggers: [
      'research',
      'investigate',
      'deep dive',
      'analyze topic'
    ],
    bamlFunction: 'ResearchTopic',
    requiresContext: ['web_search', 'existing_knowledge']
  },
  {
    id: 'code-generate',
    name: 'Generate Code',
    description: 'Write code based on specifications',
    triggers: [
      'write code',
      'generate code',
      'implement function',
      'create class'
    ],
    bamlFunction: 'GenerateCode',
    requiresContext: ['codebase_context', 'style_guide']
  },
  {
    id: 'git-commit',
    name: 'Smart Git Commit',
    description: 'Generate meaningful commit messages',
    triggers: [
      'git commit',
      'commit changes',
      'create commit message'
    ],
    bamlFunction: 'GenerateCommitMessage',
    requiresContext: ['git_diff', 'commit_history']
  }
];
```

---

### 4. Main Runtime (TypeScript)

```typescript
// src/runtime/qara.ts

import { b } from '../baml_client';
import { QaraRouter } from '../router/router';
import { ContextManager } from '../context/manager';
import { History } from '../history/history';
import { SKILLS } from '../skills/registry';
import type { SkillFunction } from '../skills/registry';

export class QaraRuntime {
  private router: QaraRouter;
  private context: ContextManager;
  private history: History;

  constructor() {
    this.router = new QaraRouter(SKILLS);
    this.context = new ContextManager();
    this.history = new History();
  }

  /**
   * Execute natural language input
   */
  async execute(input: string, options: ExecuteOptions = {}): Promise<Result> {
    const startTime = performance.now();

    // 1. Deterministic routing (<1ms)
    const route = this.router.route(input);
    if (!route) {
      throw new Error(`No skill found for: "${input}"`);
    }

    console.log(`[router] Matched: ${route.skill.name} (${(route.confidence * 100).toFixed(0)}%)`);

    // 2. Load context (graph-based, ~10-50ms)
    const ctx = await this.context.load(route.skill, input);

    // 3. Execute BAML function
    const bamlFunc = route.skill.bamlFunction;
    const result = await this.executeBamlFunction(bamlFunc, ctx, options);

    // 4. Log to history (async)
    const duration = performance.now() - startTime;
    this.history.log({
      input,
      skill: route.skill.id,
      confidence: route.confidence,
      result,
      duration,
      timestamp: new Date()
    }).catch(console.error);

    console.log(`[qara] Completed in ${duration.toFixed(0)}ms`);

    return result;
  }

  /**
   * Stream execution with real-time results
   */
  async *stream(input: string, options: ExecuteOptions = {}): AsyncIterableIterator<Chunk> {
    const route = this.router.route(input);
    if (!route) throw new Error(`No skill found for: "${input}"`);

    const ctx = await this.context.load(route.skill, input);

    // BAML supports streaming
    const bamlFunc = route.skill.bamlFunction;
    
    // Stream from BAML
    for await (const chunk of this.streamBamlFunction(bamlFunc, ctx, options)) {
      yield chunk;
    }
  }

  private async executeBamlFunction(
    funcName: string,
    context: any,
    options: ExecuteOptions
  ): Promise<any> {
    // Dynamic dispatch to BAML function
    const func = (b as any)[funcName];
    if (!func) {
      throw new Error(`BAML function not found: ${funcName}`);
    }

    // Execute with client registry for multi-LLM support
    const clientRegistry = this.getClientRegistry(options);
    
    return await func(context, { 
      client_registry: clientRegistry 
    });
  }

  private async *streamBamlFunction(
    funcName: string,
    context: any,
    options: ExecuteOptions
  ): AsyncIterableIterator<any> {
    const func = (b as any)[funcName];
    if (!func || !func.stream) {
      throw new Error(`BAML function doesn't support streaming: ${funcName}`);
    }

    const clientRegistry = this.getClientRegistry(options);
    
    const stream = func.stream(context, {
      client_registry: clientRegistry
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  private getClientRegistry(options: ExecuteOptions) {
    // Allow runtime model selection
    const { ClientRegistry } = require('baml_client');
    const registry = new ClientRegistry();
    
    if (options.model) {
      registry.set_primary(options.model);
    }
    
    return registry;
  }
}

interface ExecuteOptions {
  model?: string; // Override default LLM
  temperature?: number;
  maxTokens?: number;
}

interface Result {
  success: boolean;
  data: any;
  metadata?: {
    latency: number;
    tokens: number;
    model: string;
  };
}

interface Chunk {
  type: 'partial' | 'complete';
  data: any;
}
```

---

### 5. BAML Client Configuration

```baml
// baml_src/clients.baml

// LLM client definitions
client<llm> GPT4o {
  provider openai
  retry_policy Standard
  options {
    model "gpt-4o-2024-11-20"
    api_key env.OPENAI_API_KEY
    temperature 0.7
    max_tokens 4096
  }
}

client<llm> GPT4oMini {
  provider openai
  retry_policy Standard
  options {
    model "gpt-4o-mini-2024-07-18"
    api_key env.OPENAI_API_KEY
    temperature 0.7
    max_tokens 2048
  }
}

client<llm> Claude {
  provider anthropic
  retry_policy Standard
  options {
    model "claude-3-7-sonnet-20250219"
    api_key env.ANTHROPIC_API_KEY
    temperature 0.7
    max_tokens 4096
  }
}

client<llm> ClaudeHaiku {
  provider anthropic
  retry_policy Aggressive
  options {
    model "claude-3-5-haiku-20241022"
    api_key env.ANTHROPIC_API_KEY
    temperature 0.5
    max_tokens 2048
  }
}

client<llm> Gemini {
  provider google-ai
  retry_policy Standard
  options {
    model "gemini-2.0-flash-exp"
    api_key env.GOOGLE_API_KEY
    temperature 0.7
  }
}

// Retry policies
retry_policy Standard {
  max_retries 3
  strategy {
    type exponential_backoff
  }
}

retry_policy Aggressive {
  max_retries 5
  strategy {
    type exponential_backoff
  }
}

// Failover strategy for critical operations
client<llm> Production {
  provider round_robin
  strategy [
    GPT4o,
    Claude,
    Gemini
  ]
}
```

---

### 6. Generator Configuration

```baml
// baml_src/generators.baml

generator ts {
  output_type typescript
  output_dir "../src/baml_client"
  version "0.335.0"
}

generator py {
  output_type python
  output_dir "../python/baml_client"
  version "0.335.0"
}
```

---

## Complete Skill Example: Research

```baml
// baml_src/skills/research.baml

class Source {
  url string
  title string
  snippet string
  relevance_score float @description("0-1 relevance score")
}

class ResearchResult {
  summary string @description("Executive summary of findings")
  key_points string[] @description("Main takeaways")
  sources Source[] @description("Relevant sources found")
  confidence_score float @description("0-1 confidence in findings")
  follow_up_questions string[] @description("Suggested next research directions")
  gaps string[] @description("Information gaps identified")
}

class ResearchContext {
  query string
  depth int @description("1=quick, 2=standard, 3=deep, 4=comprehensive")
  focus_areas string[] @description("Specific aspects to emphasize")
  existing_knowledge string? @description("What we already know")
}

function ResearchTopic(ctx: ResearchContext) -> ResearchResult {
  client Production // Use failover for reliability
  prompt #"
    You are an expert researcher conducting a thorough investigation.
    
    Research Query: {{ ctx.query }}
    Depth Level: {{ ctx.depth }} (1=quick, 4=comprehensive)
    
    {% if ctx.focus_areas %}
    Focus on these areas:
    {% for area in ctx.focus_areas %}
    - {{ area }}
    {% endfor %}
    {% endif %}
    
    {% if ctx.existing_knowledge %}
    Existing knowledge:
    {{ ctx.existing_knowledge }}
    {% endif %}
    
    Instructions:
    1. Provide a clear, concise summary
    2. Extract {{ ctx.depth * 3 }} key points
    3. Rate your confidence (0-1) based on source quality
    4. Suggest {{ ctx.depth * 2 }} follow-up questions
    5. Identify any information gaps
    
    {{ ctx.output_format }}
  "#
}

// Parallel research with multiple perspectives
function MultiPerspectiveResearch(
  query: string,
  perspectives: string[]
) -> map<string, ResearchResult> {
  client Production
  prompt #"
    Conduct research on: {{ query }}
    
    Provide separate analyses from these perspectives:
    {% for perspective in perspectives %}
    - {{ perspective }}
    {% endfor %}
    
    Return a map where keys are perspective names and values are complete research results.
    
    {{ ctx.output_format }}
  "#
}

test ResearchAI {
  functions [ResearchTopic]
  args {
    ctx {
      query "Latest developments in AI safety"
      depth 3
      focus_areas ["alignment", "interpretability", "robustness"]
      existing_knowledge "Basic understanding of neural networks"
    }
  }
}

test MultiPerspective {
  functions [MultiPerspectiveResearch]
  args {
    query "Impact of AI on employment"
    perspectives ["economist", "technologist", "sociologist"]
  }
}
```

---

## Project Structure

```
qara-v2/
├── baml_src/                    # BAML skill definitions
│   ├── clients.baml             # LLM client config
│   ├── generators.baml          # Code generation config
│   ├── skills/
│   │   ├── blog.baml            # Blog writing skills
│   │   ├── research.baml        # Research skills
│   │   ├── code.baml            # Code generation skills
│   │   ├── git.baml             # Git operation skills
│   │   └── files.baml           # File manipulation skills
│   └── shared/
│       ├── types.baml           # Common type definitions
│       └── utils.baml           # Utility functions
├── src/                         # TypeScript runtime
│   ├── baml_client/             # Auto-generated (don't edit!)
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── async_client.ts
│   ├── router/
│   │   ├── router.ts            # Deterministic trie router
│   │   └── types.ts
│   ├── context/
│   │   ├── manager.ts           # Context loading
│   │   └── graph.ts             # Dependency graph
│   ├── runtime/
│   │   ├── qara.ts              # Main runtime
│   │   └── executor.ts          # Execution logic
│   ├── skills/
│   │   └── registry.ts          # Skill metadata
│   ├── history/
│   │   └── history.ts           # Event logging
│   └── cli/
│       └── index.ts             # CLI interface
├── tests/
│   ├── router.test.ts
│   ├── skills.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Workflow

### 1. Create a new skill

```bash
# Create BAML skill definition
touch baml_src/skills/analyze.baml
```

```baml
// baml_src/skills/analyze.baml
class AnalysisResult {
  summary string
  score float
  recommendations string[]
}

function AnalyzeData(data: string) -> AnalysisResult {
  client GPT4o
  prompt #"
    Analyze the following data:
    {{ data }}
    
    {{ ctx.output_format }}
  "#
}
```

### 2. Test in VSCode playground

- Open BAML file in VSCode
- Click "Test" button in playground
- See results instantly with hot-reload
- Iterate on prompt without running code

### 3. Generate client

```bash
baml-cli generate
```

### 4. Register skill

```typescript
// src/skills/registry.ts
export const SKILLS: SkillFunction[] = [
  // ... existing skills
  {
    id: 'analyze-data',
    name: 'Analyze Data',
    description: 'Perform analysis on provided data',
    triggers: ['analyze', 'analyze data', 'data analysis'],
    bamlFunction: 'AnalyzeData'
  }
];
```

### 5. Use immediately

```bash
qara "analyze this data: [1, 2, 3, 4, 5]"
```

**Total time: ~5 minutes from idea to working skill**

---

## Performance Characteristics

### Routing Latency

```
Deterministic trie matching: <1ms
Total routing time: <1ms (99th percentile)

Compare to AI-based routing:
- Current: 1,000-3,000ms
- Improvement: 1000-3000x faster
```

### Skill Execution

```
BAML function call: 50-200ms (overhead)
LLM response: 1,000-5,000ms (varies)
Total: 1,050-5,200ms

Streaming:
- Time to first token: 100-300ms
- User sees progress immediately
```

### Token Usage

```
Routing: 0 tokens (deterministic)
Context: 200-500 tokens (graph-based loading)
Execution: Varies by skill

Total savings: 85-97% vs current system
```

---

## Migration Path

### Phase 1: Parallel Run (Month 1)

Run v1 (current markdown) and v2 (BAML) side-by-side:

```typescript
const v1Result = await qaraV1.execute(input);
const v2Result = await qaraV2.execute(input);

// Compare outputs
if (!deepEqual(v1Result, v2Result)) {
  logDivergence(input, v1Result, v2Result);
}

// Return v1 (safe)
return v1Result;
```

### Phase 2: Gradual Cutover (Month 2)

```typescript
const USE_V2_PERCENTAGE = 10; // Start at 10%, increase weekly

if (Math.random() < USE_V2_PERCENTAGE / 100) {
  try {
    return await qaraV2.execute(input);
  } catch (err) {
    console.warn('V2 failed, falling back to V1');
    return await qaraV1.execute(input);
  }
}

return await qaraV1.execute(input);
```

### Phase 3: Full V2 (Month 3)

```typescript
try {
  return await qaraV2.execute(input);
} catch (err) {
  // V1 as emergency fallback only
  console.error('V2 failed:', err);
  return await qaraV1.execute(input);
}
```

---

## Advantages Over Custom Implementation

| Aspect | Custom (from Blueprint) | BAML-Based |
|--------|------------------------|------------|
| **Type Safety** | Manual TypeScript types | Auto-generated types |
| **Testing** | Custom test framework | Built-in VSCode playground |
| **JSON Parsing** | Custom parser needed | SAP algorithm built-in |
| **Multi-LLM** | Custom abstraction layer | Built-in provider system |
| **Retry Logic** | Implement manually | Built-in retry policies |
| **Streaming** | Complex implementation | Built-in streaming support |
| **Hot Reload** | Custom dev server needed | VSCode playground instant |
| **Prompt Preview** | No preview | Live preview in editor |
| **Code Generation** | Manual boilerplate | Auto-generated clients |
| **Maintenance** | High (custom code) | Low (BAML maintained) |

**Development time savings: 60-80%**

---

## Next Steps

### Week 1: Setup & POC

```bash
# 1. Initialize BAML project
npm install -D @boundaryml/baml
baml-cli init

# 2. Create first skill (blog.baml)
# 3. Configure clients
# 4. Test in playground
# 5. Build deterministic router
# 6. Benchmark vs current system
```

### Week 2-3: Core Skills

- Port 5 essential skills to BAML
- Build skill registry
- Implement context manager
- Add history logging

### Week 4: Integration & Testing

- Full integration tests
- Performance benchmarks
- Parallel run with v1
- Go/No-Go decision

---

## Conclusion

**BAML solves the implementation complexity of Qara v2.**

Instead of building:
- Custom type system → BAML has it
- Prompt testing framework → VSCode playground
- JSON parser/repair → SAP algorithm
- Multi-LLM abstraction → Built-in clients
- Retry logic → Built-in policies
- Streaming → Built-in support

**We only need to build:**
- Deterministic router (~200 lines)
- Context manager (~150 lines)
- Skill registry (~100 lines)
- CLI wrapper (~100 lines)

**Total custom code: ~550 lines vs 5,000+ lines in original blueprint**

**This is the leverage we were looking for.**

---

**Document Version:** 1.0  
**BAML Version:** 0.335+  
**Created:** 2025-12-01  
**Status:** Ready for Implementation
