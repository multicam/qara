# Qara v2: BAML Implementation Guide

**BAML Version:** 0.335+  
**Timeline:** 4 weeks to production-ready POC  
**Effort:** 1 FTE

---

## Week 1: Foundation & POC

### Day 1: Setup BAML Environment

```bash
# Create project structure
mkdir -p qara-v2/{baml_src/skills,src/{router,runtime,skills,context,history,cli},tests}
cd qara-v2

# Initialize Node project
bun init -y

# Install BAML
bun add -D @boundaryml/baml

# Initialize BAML
bunx baml-cli init

# Install VSCode extension
code --install-extension Boundary.baml-extension
```

**Expected file structure after init:**
```
qara-v2/
├── baml_src/
│   ├── clients.baml
│   └── generators.baml
├── package.json
└── .baml/
```

---

### Day 2: Configure BAML Clients

```baml
// baml_src/clients.baml

// Primary clients for production
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

// Fallback client with round-robin
client<llm> Production {
  provider round_robin
  strategy [GPT4o, Claude]
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
```

**Update generators:**

```baml
// baml_src/generators.baml

generator ts {
  output_type typescript
  output_dir "../src/baml_client"
  version "0.335.0"
  on_generate {
    // Run prettier after generation
    run "bunx prettier --write ../src/baml_client/**/*.ts"
  }
}
```

**Generate client:**

```bash
bunx baml-cli generate
```

---

### Day 3: Create First Skill (Blog)

```baml
// baml_src/skills/blog.baml

class BlogPost {
  title string @description("Compelling, SEO-friendly title")
  content string @description("Markdown-formatted content")
  slug string @description("URL-safe slug derived from title")
  tags string[] @description("3-5 relevant topic tags")
  excerpt string @description("2-sentence summary for preview")
  draft bool @description("True if draft, false if ready to publish")
  estimated_read_time int @description("Reading time in minutes")
}

class BlogContext {
  topic string @description("Main topic or subject")
  style string @description("Writing style: technical, casual, academic, storytelling")
  target_length int @description("Target word count (500-3000)")
  audience string @description("Target audience: beginners, intermediate, experts")
  existing_posts string[]? @description("Titles of related existing posts to avoid duplication")
}

function WriteBlog(ctx: BlogContext) -> BlogPost {
  client GPT4o
  prompt #"
    You are an expert technical writer with a gift for making complex topics accessible.
    
    Task: Write a comprehensive blog post
    Topic: {{ ctx.topic }}
    Style: {{ ctx.style }}
    Target length: {{ ctx.target_length }} words
    Audience: {{ ctx.audience }}
    
    {% if ctx.existing_posts %}
    Related existing posts (avoid duplication):
    {% for post in ctx.existing_posts %}
    - {{ post }}
    {% endfor %}
    {% endif %}
    
    Requirements:
    1. Create an engaging, SEO-optimized title
    2. Write clear, well-structured markdown content
    3. Include code examples if relevant
    4. Add 3-5 relevant tags
    5. Generate URL-safe slug
    6. Write 2-sentence excerpt
    7. Estimate reading time
    8. Set draft=true for review
    
    Writing guidelines:
    - Use active voice
    - Short paragraphs (3-4 sentences max)
    - Include practical examples
    - Add visual breaks with headers
    - End with actionable takeaways
    
    {{ ctx.output_format }}
  "#
}

function EditBlog(
  original: BlogPost,
  edit_instructions: string
) -> BlogPost {
  client GPT4oMini
  prompt #"
    Edit this blog post according to the instructions.
    
    Original post:
    Title: {{ original.title }}
    Content:
    {{ original.content }}
    
    Edit instructions:
    {{ edit_instructions }}
    
    Keep all other fields (tags, slug, etc.) unless explicitly asked to change them.
    
    {{ ctx.output_format }}
  "#
}

function PublishBlog(draft: BlogPost) -> BlogPost {
  client GPT4oMini
  prompt #"
    Finalize this blog post for publication.
    
    Title: {{ draft.title }}
    Content:
    {{ draft.content }}
    
    Tasks:
    1. Fix any typos or grammatical errors
    2. Ensure proper markdown formatting
    3. Verify code blocks have language tags
    4. Check that links are properly formatted
    5. Set draft=false
    6. Keep all other fields unchanged
    
    {{ ctx.output_format }}
  "#
}

// Test cases
test WriteBlog_AI_Safety {
  functions [WriteBlog]
  args {
    ctx {
      topic "AI Safety and Alignment: Why It Matters"
      style "technical"
      target_length 1500
      audience "intermediate"
      existing_posts [
        "Introduction to Machine Learning",
        "Neural Networks Explained"
      ]
    }
  }
}

test WriteBlog_Quick {
  functions [WriteBlog]
  args {
    ctx {
      topic "5 TypeScript Tips for Better Code"
      style "casual"
      target_length 800
      audience "intermediate"
    }
  }
}

test EditBlog_Shorten {
  functions [EditBlog]
  args {
    original {
      title "Understanding Async/Await"
      content "# Understanding Async/Await\n\nAsync/await is a modern JavaScript feature..."
      slug "understanding-async-await"
      tags ["javascript", "async", "programming"]
      excerpt "Learn how async/await simplifies asynchronous code."
      draft true
      estimated_read_time 5
    }
    edit_instructions "Shorten to 500 words and make it more beginner-friendly"
  }
}

test PublishBlog_Final {
  functions [PublishBlog]
  args {
    draft {
      title "Getting Started with BAML"
      content "# Getting Started with BAML\n\nBAML is amazing..."
      slug "getting-started-with-baml"
      tags ["baml", "llm", "tutorial"]
      excerpt "Learn the basics of BAML for LLM development."
      draft true
      estimated_read_time 7
    }
  }
}
```

**Test in VSCode:**
1. Open `baml_src/skills/blog.baml`
2. Click "Run Test" on any test
3. See results instantly
4. Iterate on prompt

---

### Day 4: Build Deterministic Router

```typescript
// src/router/types.ts

export interface SkillFunction {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  bamlFunction: string;
  requiresContext?: string[];
}

export interface RouteMatch {
  skill: SkillFunction;
  confidence: number;
  tokens: string[];
  matchType: 'exact' | 'fuzzy';
}

export interface RouteNode {
  skills: SkillFunction[];
  children: Map<string, RouteNode>;
  isTerminal: boolean;
}
```

```typescript
// src/router/router.ts

import type { SkillFunction, RouteMatch, RouteNode } from './types';

export class QaraRouter {
  private trie: RouteNode;
  private skillMap: Map<string, SkillFunction>;
  private stats = {
    totalRoutes: 0,
    exactMatches: 0,
    fuzzyMatches: 0,
    failures: 0
  };

  constructor(skills: SkillFunction[]) {
    this.skillMap = new Map(skills.map(s => [s.id, s]));
    this.trie = this.buildTrie(skills);
    console.log(`[router] Initialized with ${skills.length} skills`);
  }

  /**
   * Route input to skill in <1ms
   */
  route(input: string): RouteMatch | null {
    const startTime = performance.now();
    this.stats.totalRoutes++;

    const tokens = this.tokenize(input);
    let node = this.trie;
    let bestMatch: SkillFunction | null = null;
    let matchStrength = 0;

    // Walk trie for exact match
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

    const duration = performance.now() - startTime;

    if (bestMatch) {
      this.stats.exactMatches++;
      console.log(`[router] Exact match in ${duration.toFixed(2)}ms: ${bestMatch.name}`);
      return {
        skill: bestMatch,
        confidence: matchStrength,
        tokens,
        matchType: 'exact'
      };
    }

    // Fallback to fuzzy matching
    const fuzzyMatch = this.fuzzyMatch(input, tokens);
    if (fuzzyMatch) {
      this.stats.fuzzyMatches++;
      console.log(`[router] Fuzzy match in ${duration.toFixed(2)}ms: ${fuzzyMatch.skill.name}`);
      return fuzzyMatch;
    }

    this.stats.failures++;
    console.warn(`[router] No match found for: "${input}"`);
    return null;
  }

  /**
   * Build trie from skill triggers
   */
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

  /**
   * Tokenize input for matching
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * Fuzzy matching fallback
   */
  private fuzzyMatch(input: string, tokens: string[]): RouteMatch | null {
    const inputTokens = new Set(tokens);
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

    const threshold = 0.3; // 30% token overlap minimum
    
    return bestSkill && bestScore > threshold
      ? {
          skill: bestSkill,
          confidence: bestScore,
          tokens: [...inputTokens],
          matchType: 'fuzzy'
        }
      : null;
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      ...this.stats,
      exactMatchRate: (this.stats.exactMatches / this.stats.totalRoutes * 100).toFixed(1) + '%',
      fuzzyMatchRate: (this.stats.fuzzyMatches / this.stats.totalRoutes * 100).toFixed(1) + '%',
      failureRate: (this.stats.failures / this.stats.totalRoutes * 100).toFixed(1) + '%'
    };
  }
}
```

---

### Day 5: Create Skill Registry

```typescript
// src/skills/registry.ts

import type { SkillFunction } from '../router/types';

export const SKILLS: SkillFunction[] = [
  {
    id: 'blog-write',
    name: 'Write Blog Post',
    description: 'Create a new blog post from a topic and context',
    triggers: [
      'write blog',
      'write blog post',
      'create post',
      'create blog',
      'draft article',
      'draft blog',
      'new blog post',
      'new post'
    ],
    bamlFunction: 'WriteBlog',
    requiresContext: ['existing_posts']
  },
  {
    id: 'blog-edit',
    name: 'Edit Blog Post',
    description: 'Edit an existing blog post based on instructions',
    triggers: [
      'edit blog',
      'edit post',
      'modify blog',
      'update blog',
      'revise post'
    ],
    bamlFunction: 'EditBlog'
  },
  {
    id: 'blog-publish',
    name: 'Publish Blog Post',
    description: 'Finalize and publish a draft blog post',
    triggers: [
      'publish blog',
      'publish post',
      'finalize blog',
      'finalize post',
      'release post'
    ],
    bamlFunction: 'PublishBlog'
  }
];
```

---

### Day 6: Build Minimal Runtime

```typescript
// src/runtime/qara.ts

import { b } from '../baml_client';
import { QaraRouter } from '../router/router';
import { SKILLS } from '../skills/registry';
import type { RouteMatch } from '../router/types';

export class QaraRuntime {
  private router: QaraRouter;

  constructor() {
    this.router = new QaraRouter(SKILLS);
    console.log('[qara] Runtime initialized');
  }

  /**
   * Execute natural language input
   */
  async execute(input: string, options: ExecuteOptions = {}): Promise<any> {
    const startTime = performance.now();
    console.log(`[qara] Executing: "${input}"`);

    // 1. Route to skill (<1ms)
    const route = this.router.route(input);
    if (!route) {
      throw new Error(`No skill found for: "${input}"\n\nTry: ${this.getSuggestions()}`);
    }

    console.log(`[qara] Matched: ${route.skill.name} (${(route.confidence * 100).toFixed(0)}% confidence)`);

    // 2. Extract parameters from input
    const params = this.extractParameters(input, route);

    // 3. Execute BAML function
    const result = await this.executeBamlFunction(
      route.skill.bamlFunction,
      params,
      options
    );

    const duration = performance.now() - startTime;
    console.log(`[qara] Completed in ${duration.toFixed(0)}ms`);

    return result;
  }

  /**
   * Execute BAML function dynamically
   */
  private async executeBamlFunction(
    funcName: string,
    params: any,
    options: ExecuteOptions
  ): Promise<any> {
    const func = (b as any)[funcName];
    if (!func) {
      throw new Error(`BAML function not found: ${funcName}`);
    }

    // Build BAML options
    const bamlOptions: any = {};
    
    if (options.model) {
      const { ClientRegistry } = await import('baml_client');
      const registry = new ClientRegistry();
      registry.set_primary(options.model);
      bamlOptions.client_registry = registry;
    }

    // Execute
    try {
      const result = await func(params, bamlOptions);
      return result;
    } catch (error: any) {
      console.error(`[qara] BAML execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * Extract parameters from input (simple version)
   */
  private extractParameters(input: string, route: RouteMatch): any {
    // For POC, use simple heuristics
    // In production, use more sophisticated parsing or another BAML function
    
    const skillId = route.skill.id;

    if (skillId === 'blog-write') {
      // Extract topic from "write blog about X"
      const match = input.match(/(?:write|create|draft)\s+(?:blog|post|article)(?:\s+about)?\s+(.+)/i);
      const topic = match ? match[1].trim() : input;

      return {
        ctx: {
          topic,
          style: 'technical',
          target_length: 1000,
          audience: 'intermediate'
        }
      };
    }

    // Default: pass input as-is
    return { input };
  }

  /**
   * Get suggestions when no skill matches
   */
  private getSuggestions(): string {
    const suggestions = SKILLS
      .slice(0, 3)
      .map(s => `- ${s.triggers[0]}`)
      .join('\n');
    
    return `Available commands:\n${suggestions}`;
  }

  /**
   * Get router statistics
   */
  getStats() {
    return this.router.getStats();
  }
}

export interface ExecuteOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

---

### Day 7: Create CLI & Test

```typescript
// src/cli/index.ts

import { QaraRuntime } from '../runtime/qara';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: qara <command>');
    console.log('\nExamples:');
    console.log('  qara "write blog about AI safety"');
    console.log('  qara "publish blog"');
    process.exit(1);
  }

  const input = args.join(' ');
  const qara = new QaraRuntime();

  try {
    const result = await qara.execute(input);
    
    console.log('\n=== Result ===');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== Stats ===');
    console.log(qara.getStats());
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
```

**Package.json:**

```json
{
  "name": "qara-v2",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/cli/index.ts",
    "build": "bun build src/cli/index.ts --outdir dist --target bun",
    "generate": "bunx baml-cli generate",
    "test": "bun test"
  },
  "dependencies": {
    "@boundaryml/baml": "^0.335.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "prettier": "^3.0.0"
  }
}
```

**Test it:**

```bash
# Generate BAML client
bun run generate

# Test routing (should be <1ms)
bun run dev "write blog about TypeScript best practices"

# Should output:
# [router] Exact match in 0.23ms: Write Blog Post
# [qara] Matched: Write Blog Post (100% confidence)
# [qara] Executing BAML function: WriteBlog
# ...
# [qara] Completed in 2,347ms
```

---

## Week 2: Add More Skills

### Research Skill

```baml
// baml_src/skills/research.baml

class Source {
  url string @description("Source URL")
  title string @description("Page or article title")
  snippet string @description("Relevant excerpt")
  relevance float @description("Relevance score 0-1")
}

class ResearchResult {
  summary string @description("Executive summary of findings")
  key_points string[] @description("Main takeaways (5-10 points)")
  sources Source[] @description("Top relevant sources")
  confidence float @description("Confidence in findings (0-1)")
  gaps string[] @description("Information gaps identified")
  follow_up_questions string[] @description("Suggested next research steps")
}

function ResearchTopic(
  query: string,
  depth: int,
  focus_areas: string[]?
) -> ResearchResult {
  client Production
  prompt #"
    You are an expert researcher conducting thorough investigation.
    
    Research Query: {{ query }}
    Depth: {{ depth }} (1=quick, 2=standard, 3=deep, 4=comprehensive)
    
    {% if focus_areas %}
    Focus Areas:
    {% for area in focus_areas %}
    - {{ area }}
    {% endfor %}
    {% endif %}
    
    Instructions:
    1. Provide clear, concise summary ({{ depth * 100 }} words)
    2. Extract {{ depth * 3 }} key points
    3. List {{ depth * 5 }} most relevant sources
    4. Rate confidence based on source quality
    5. Identify information gaps
    6. Suggest {{ depth * 2 }} follow-up questions
    
    {{ ctx.output_format }}
  "#
}

test ResearchAI {
  functions [ResearchTopic]
  args {
    query "Latest developments in AI alignment"
    depth 3
    focus_areas ["RLHF", "interpretability", "robustness"]
  }
}
```

### Code Generation Skill

```baml
// baml_src/skills/code.baml

class CodeSnippet {
  language string @description("Programming language")
  code string @description("The actual code")
  explanation string @description("How the code works")
  test_cases string? @description("Example test cases")
  dependencies string[]? @description("Required libraries or imports")
}

function GenerateCode(
  description: string,
  language: string,
  style: string?
) -> CodeSnippet {
  client GPT4o
  prompt #"
    Generate {{ language }} code based on this description:
    
    {{ description }}
    
    {% if style %}
    Code style: {{ style }}
    {% endif %}
    
    Requirements:
    1. Write clean, well-commented code
    2. Include error handling
    3. Provide explanation
    4. Add test cases if applicable
    5. List any dependencies
    
    {{ ctx.output_format }}
  "#
}

test GenerateTypescript {
  functions [GenerateCode]
  args {
    description "Binary search function with type safety"
    language "typescript"
    style "functional"
  }
}
```

**Add to registry:**

```typescript
// src/skills/registry.ts
export const SKILLS: SkillFunction[] = [
  // ... existing blog skills
  {
    id: 'research-topic',
    name: 'Research Topic',
    description: 'Conduct comprehensive research on a topic',
    triggers: [
      'research',
      'research topic',
      'investigate',
      'deep dive',
      'analyze topic',
      'study'
    ],
    bamlFunction: 'ResearchTopic'
  },
  {
    id: 'code-generate',
    name: 'Generate Code',
    description: 'Generate code snippets based on description',
    triggers: [
      'generate code',
      'write code',
      'create function',
      'implement',
      'code this'
    ],
    bamlFunction: 'GenerateCode'
  }
];
```

---

## Week 3: Context Management & History

### Simple Context Manager

```typescript
// src/context/manager.ts

import type { SkillFunction } from '../router/types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export class ContextManager {
  private cache = new Map<string, any>();

  /**
   * Load context required by skill
   */
  async load(skill: SkillFunction, input: string): Promise<any> {
    const context: any = {};

    if (!skill.requiresContext) {
      return context;
    }

    for (const requirement of skill.requiresContext) {
      switch (requirement) {
        case 'existing_posts':
          context.existing_posts = await this.getExistingPosts();
          break;
        case 'git_diff':
          context.git_diff = await this.getGitDiff();
          break;
        case 'codebase_context':
          context.codebase_context = await this.getCodebaseContext();
          break;
      }
    }

    return context;
  }

  private async getExistingPosts(): Promise<string[]> {
    // Cache for 5 minutes
    const cacheKey = 'existing_posts';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const postsDir = join(process.cwd(), 'published');
      const files = await readdir(postsDir);
      const posts = files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', '').replace(/-/g, ' '));
      
      this.cache.set(cacheKey, posts);
      setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
      
      return posts;
    } catch {
      return [];
    }
  }

  private async getGitDiff(): Promise<string> {
    // Placeholder - implement git diff reading
    return '';
  }

  private async getCodebaseContext(): Promise<string> {
    // Placeholder - implement codebase scanning
    return '';
  }
}
```

### History Logger

```typescript
// src/history/history.ts

import { appendFile } from 'fs/promises';
import { join } from 'path';

interface HistoryEntry {
  timestamp: Date;
  input: string;
  skill: string;
  confidence: number;
  result: any;
  duration: number;
}

export class History {
  private logPath: string;

  constructor(logPath?: string) {
    this.logPath = logPath || join(process.cwd(), '.qara', 'history.jsonl');
  }

  async log(entry: HistoryEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await appendFile(this.logPath, line);
  }

  // Add query methods as needed
}
```

**Update runtime to use context:**

```typescript
// src/runtime/qara.ts

import { ContextManager } from '../context/manager';
import { History } from '../history/history';

export class QaraRuntime {
  private router: QaraRouter;
  private context: ContextManager;
  private history: History;

  constructor() {
    this.router = new QaraRouter(SKILLS);
    this.context = new ContextManager();
    this.history = new History();
  }

  async execute(input: string, options: ExecuteOptions = {}): Promise<any> {
    const startTime = performance.now();
    
    const route = this.router.route(input);
    if (!route) throw new Error(`No skill found for: "${input}"`);

    // Load context
    const ctx = await this.context.load(route.skill, input);
    const params = this.extractParameters(input, route, ctx);

    const result = await this.executeBamlFunction(
      route.skill.bamlFunction,
      params,
      options
    );

    // Log to history
    const duration = performance.now() - startTime;
    this.history.log({
      timestamp: new Date(),
      input,
      skill: route.skill.id,
      confidence: route.confidence,
      result,
      duration
    }).catch(console.error);

    return result;
  }

  private extractParameters(
    input: string,
    route: RouteMatch,
    ctx: any
  ): any {
    // Merge context with extracted parameters
    const params = this.basicExtract(input, route);
    return { ...params, ...ctx };
  }
}
```

---

## Week 4: Testing & Benchmarking

### Unit Tests

```typescript
// tests/router.test.ts

import { describe, test, expect } from 'bun:test';
import { QaraRouter } from '../src/router/router';
import { SKILLS } from '../src/skills/registry';

describe('QaraRouter', () => {
  const router = new QaraRouter(SKILLS);

  test('routes exact match', () => {
    const result = router.route('write blog about AI');
    expect(result).not.toBeNull();
    expect(result?.skill.id).toBe('blog-write');
    expect(result?.matchType).toBe('exact');
  });

  test('routes fuzzy match', () => {
    const result = router.route('create a new post about coding');
    expect(result).not.toBeNull();
    expect(result?.skill.id).toBe('blog-write');
  });

  test('returns null for no match', () => {
    const result = router.route('xyz nonsense query abc');
    expect(result).toBeNull();
  });

  test('routes in <1ms', () => {
    const start = performance.now();
    router.route('write blog about TypeScript');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1.0);
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.ts

import { describe, test, expect } from 'bun:test';
import { QaraRuntime } from '../src/runtime/qara';

describe('QaraRuntime Integration', () => {
  const qara = new QaraRuntime();

  test('executes blog write skill', async () => {
    const result = await qara.execute('write blog about BAML');
    
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('slug');
    expect(result.draft).toBe(true);
  }, 30000); // 30s timeout for LLM call

  test('handles unknown input gracefully', async () => {
    await expect(
      qara.execute('asdfasdfasdf')
    ).rejects.toThrow('No skill found');
  });
});
```

### Performance Benchmark

```typescript
// tests/benchmark.ts

import { QaraRouter } from '../src/router/router';
import { SKILLS } from '../src/skills/registry';

function benchmark() {
  const router = new QaraRouter(SKILLS);
  
  const queries = [
    'write blog about AI',
    'research quantum computing',
    'generate typescript code',
    'create new post about BAML',
    'investigate machine learning'
  ];

  const iterations = 10000;
  const times: number[] = [];

  console.log(`Running ${iterations} routing operations...`);

  for (let i = 0; i < iterations; i++) {
    const query = queries[i % queries.length];
    const start = performance.now();
    router.route(query);
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);

  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const avg = times.reduce((a, b) => a + b) / times.length;

  console.log('\n=== Routing Performance ===');
  console.log(`Iterations: ${iterations}`);
  console.log(`Average: ${avg.toFixed(3)}ms`);
  console.log(`p50: ${p50.toFixed(3)}ms`);
  console.log(`p95: ${p95.toFixed(3)}ms`);
  console.log(`p99: ${p99.toFixed(3)}ms`);
  console.log(`Min: ${times[0].toFixed(3)}ms`);
  console.log(`Max: ${times[times.length - 1].toFixed(3)}ms`);

  const stats = router.getStats();
  console.log('\n=== Router Stats ===');
  console.log(stats);
}

benchmark();
```

**Run benchmarks:**

```bash
bun run tests/benchmark.ts

# Expected output:
# === Routing Performance ===
# Iterations: 10000
# Average: 0.087ms
# p50: 0.065ms
# p95: 0.142ms
# p99: 0.231ms
# Min: 0.032ms
# Max: 1.543ms
```

---

## Success Criteria

### Week 1 (POC)
- ✅ BAML setup working
- ✅ 1 skill (blog) implemented and tested
- ✅ Router achieving <1ms routing
- ✅ CLI functional

### Week 2 (Core Skills)
- ✅ 3+ skills implemented (blog, research, code)
- ✅ All skills tested in BAML playground
- ✅ Router handles all skill triggers

### Week 3 (Infrastructure)
- ✅ Context manager loading required data
- ✅ History logging operational
- ✅ Integration tests passing

### Week 4 (Validation)
- ✅ Performance benchmarks show <1ms routing
- ✅ All unit tests passing
- ✅ Integration tests with real LLMs passing
- ✅ Ready for parallel run with v1

---

## Next: Month 2 Planning

After Week 4 POC, decide:

**GO:** 
- Begin parallel run with v1
- Implement remaining skills
- Add streaming support
- Build dashboard

**NO-GO:**
- Document learnings
- Archive POC
- Re-evaluate approach

---

**Document Version:** 1.0  
**Status:** Ready for Day 1 execution  
**Estimated Effort:** 160 hours (4 weeks × 40 hours)
