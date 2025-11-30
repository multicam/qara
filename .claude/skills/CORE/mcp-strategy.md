# Two-Tier MCP Strategy

**Purpose**: Guide to Qara's dual-tier MCP architecture - using legacy MCPs for discovery and TypeScript wrappers for production.

**Last Updated**: 2025-11-19

---

## Table of Contents
1. [Overview](#overview)
2. [The Problem with Traditional MCPs](#the-problem-with-traditional-mcps)
3. [The Two-Tier Solution](#the-two-tier-solution)
4. [Tier 1: Legacy MCPs](#tier-1-legacy-mcps-discovery-phase)
5. [Tier 2: System MCPs](#tier-2-system-mcps-execution-phase)
6. [Migration Path](#migration-path)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)

---

## Overview

From CONSTITUTION.md:
> **Two-Tier MCP Strategy**: Discovery via MCP → Production via CLI-First TypeScript

### The Core Insight

**Traditional MCP-only architectures are expensive and inflexible for production use.**

Qara uses a two-tier approach:
- **Tier 1 (Legacy MCPs)**: Explore and discover APIs/services
- **Tier 2 (System MCPs)**: Production-ready TypeScript wrappers

This combines the **flexibility of MCPs** with the **efficiency of deterministic code**.

### When to Use Each Tier

```
┌─────────────────────────────────────────────────────┐
│ Exploration & Discovery → Tier 1 (Legacy MCPs)     │
│ - First time using API                              │
│ - Understanding capabilities                        │
│ - One-off tasks                                     │
└─────────────────────────────────────────────────────┘
                        ↓
                   Learn & Document
                        ↓
┌─────────────────────────────────────────────────────┐
│ Production & Efficiency → Tier 2 (System MCPs)     │
│ - Repeated operations (>10 times)                   │
│ - Type safety required                              │
│ - Token cost matters                                │
│ - Need filtering/transformation                     │
└─────────────────────────────────────────────────────┘
```

---

## The Problem with Traditional MCPs

### Issue 1: Token Explosion

**Legacy MCPs pass full schemas every call:**
```
Tool call: brightdata_run_actor
↓
MCP sends entire schema (1000+ tokens)
↓
Model processes schema
↓
Returns unfiltered dataset (50,000+ tokens)
↓
Model processes all data
↓
💸 Expensive! (51,000+ tokens per call)
```

**Result**: $$$$ for repeated operations

### Issue 2: No Type Safety

```typescript
// ❌ MCP: Dynamic schemas at runtime
const result = await use_mcp_tool('brightdata_run_actor', {
  actorId: 'web-scraper', // Typo - no error until runtime!
  input: { url: 'https://example.com' }
});

// No IDE autocomplete
// No type checking
// Runtime errors only
```

### Issue 3: No Pre-Filtering

**MCP returns everything:**
```json
{
  "results": [
    { "id": 1, "data": "...", "metadata": "...", "extra": "..." },
    { "id": 2, "data": "...", "metadata": "...", "extra": "..." },
    // ... 1000 more items
  ],
  "total": 1002,
  "pagination": { ... },
  "debug": { ... }
}
```

**You only need:**
```json
[
  { "id": 1, "data": "..." },
  { "id": 2, "data": "..." }
]
```

**But MCP sends all 50K tokens to model first**, then model filters.

---

## The Two-Tier Solution

### Tier 1: Discovery (Legacy MCPs)

**Purpose**: Explore and learn
**Location**: `~/.claude/MCPs/` (if you use them)
**When**: First-time API exploration

**Characteristics:**
- ✅ Flexible discovery
- ✅ Easy to try new services
- ✅ No code required
- ❌ High token cost
- ❌ No type safety
- ❌ Can't filter before model

### Tier 2: Production (System MCPs)

**Purpose**: Efficient, repeated use
**Location**: `~/.claude/skills/system-mcp/`
**When**: API will be called >10 times

**Characteristics:**
- ✅ Type-safe TypeScript
- ✅ Filter before model context (99% token savings!)
- ✅ Reusable helper functions
- ✅ Version controlled
- ✅ Testable independently
- ❌ Requires code (worth it!)

---

## Tier 1: Legacy MCPs (Discovery Phase)

### When to Use Legacy MCPs

**✅ Use Legacy MCPs for:**
1. **First-time exploration**: "What can this API do?"
2. **Discovering endpoints**: "What actors exist?"
3. **Understanding schemas**: "What fields are available?"
4. **One-off tasks**: "Just need this once"
5. **Prototyping**: "Testing if this works"

### Example: Exploring BrightData

```typescript
// Via MCP tool call
use_mcp_tool('brightdata_list_actors')
// Returns: All available actors with descriptions

use_mcp_tool('brightdata_get_actor_input_schema', {
  actorId: 'web-scraper'
})
// Returns: Schema showing what inputs web-scraper accepts

use_mcp_tool('brightdata_run_actor', {
  actorId: 'web-scraper',
  input: { url: 'https://example.com' }
})
// Returns: Full result dataset
```

**Perfect for discovery!** Now you know:
- What actors exist
- What inputs they need
- What outputs they return

### Legacy MCP Configuration

**Example `.mcp.json` (if using):**
```json
{
  "mcpServers": {
    "brightdata": {
      "command": "npx",
      "args": ["-y", "@brightdata/mcp-server"],
      "env": {
        "BRIGHTDATA_API_KEY": "${BRIGHTDATA_API_KEY}"
      }
    }
  }
}
```

---

## Tier 2: System MCPs (Execution Phase)

### When to Create System MCPs

**✅ Create System MCP when:**
1. **Frequency**: Will call API >10 times
2. **Token cost**: API returns large datasets
3. **Type safety**: Need autocomplete and type checking
4. **Filtering**: Need to filter data before model context
5. **Reusability**: Multiple skills need same API

### System MCP Structure

```
~/.claude/skills/system-mcp/
├── SKILL.md                    # Skill routing
├── providers/
│   ├── brightdata/
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── api.ts             # API client
│   │   ├── actors.ts          # Actor helpers
│   │   └── filters.ts         # Data filtering
│   ├── github/
│   │   ├── types.ts
│   │   ├── api.ts
│   │   └── repos.ts
│   └── notion/
│       ├── types.ts
│       ├── api.ts
│       └── pages.ts
└── scripts/
    ├── scrape-web.ts          # Executable scripts
    └── fetch-repos.ts
```

### Example: BrightData System MCP

**types.ts:**
```typescript
export interface ActorRun {
  id: string;
  actorId: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: string;
  finishedAt?: string;
}

export interface WebScraperInput {
  url: string;
  waitForSelector?: string;
  screenshotFormat?: 'png' | 'jpg';
}

export interface ScrapedContent {
  url: string;
  title: string;
  markdown: string;
  html?: string;
}
```

**api.ts:**
```typescript
import { ActorRun, WebScraperInput, ScrapedContent } from './types';

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
const BASE_URL = 'https://api.brightdata.com/datasets/v1';

export async function runActor(
  actorId: string,
  input: WebScraperInput
): Promise<ActorRun> {
  const response = await fetch(`${BASE_URL}/actors/${actorId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`BrightData API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getActorRun(runId: string): Promise<ActorRun> {
  const response = await fetch(`${BASE_URL}/runs/${runId}`, {
    headers: {
      'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get run: ${response.statusText}`);
  }

  return response.json();
}
```

**actors.ts (filtered helpers):**
```typescript
import { runActor, getActorRun } from './api';
import { ScrapedContent } from './types';

/**
 * Scrape web page and return only markdown content
 * Filters out unnecessary fields BEFORE returning to model
 */
export async function scrapeAsMarkdown(url: string): Promise<ScrapedContent> {
  // Start actor
  const run = await runActor('web-scraper', {
    url,
    waitForSelector: 'body',
  });

  // Wait for completion
  let result = await getActorRun(run.id);
  while (result.status === 'RUNNING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    result = await getActorRun(run.id);
  }

  if (result.status === 'FAILED') {
    throw new Error('Scraping failed');
  }

  // Fetch results
  const dataset = await fetch(result.defaultDatasetId);
  const fullData = await dataset.json();

  // 🎯 CRITICAL: Filter BEFORE returning to model
  // Full data might be 50K tokens
  // We only need 2K tokens of markdown
  return {
    url: fullData.url,
    title: fullData.title,
    markdown: fullData.markdown,
    // Excluded: html, screenshots, metadata, debug info
  };
}
```

**scripts/scrape-web.ts (executable):**
```typescript
#!/usr/bin/env bun
import { scrapeAsMarkdown } from '../providers/brightdata/actors';

const url = process.argv[2];
if (!url) {
  console.error('Usage: scrape-web.ts <url>');
  process.exit(1);
}

const result = await scrapeAsMarkdown(url);
console.log(JSON.stringify(result, null, 2));
```

### Benefits Over MCP

**Token Savings:**
```
Legacy MCP:
- Schema: 1,000 tokens
- Full dataset: 50,000 tokens
- Total: 51,000 tokens per call
- Cost: $$$

System MCP:
- No schema overhead
- Pre-filtered data: 500 tokens
- Total: 500 tokens per call
- Cost: $ (99% savings!)
```

**Type Safety:**
```typescript
// ✅ TypeScript catches errors at compile time
const result = await scrapeAsMarkdown(url);
console.log(result.markdown); // Autocomplete works!
// result.unknownField // ← Type error caught immediately
```

**Reusability:**
```typescript
// Import in any skill
import { scrapeAsMarkdown } from '~/.claude/skills/system-mcp/providers/brightdata/actors';

// Use in multiple places
const content1 = await scrapeAsMarkdown('https://example1.com');
const content2 = await scrapeAsMarkdown('https://example2.com');
```

---

## Migration Path

### Step 1: Discovery (Use Legacy MCP)

```typescript
// Use MCP to explore
use_mcp_tool('brightdata_list_actors')
use_mcp_tool('brightdata_run_actor', { actorId: 'web-scraper', ... })
```

**Learn:**
- What endpoints exist
- What inputs they need
- What outputs they return
- What fields are useful

### Step 2: Document

Create documentation file:
```markdown
# BrightData Web Scraper

## Actor ID
`web-scraper`

## Input Schema
{
  url: string (required)
  waitForSelector?: string
  screenshotFormat?: 'png' | 'jpg'
}

## Output Fields (useful ones)
- url: string
- title: string
- markdown: string

## Output Fields (ignore)
- html: string (50KB+ each)
- screenshots: base64 strings (huge!)
- metadata: object (not needed)
- debug: object (not needed)
```

### Step 3: Implement System MCP

Create TypeScript wrapper:
```typescript
// providers/brightdata/types.ts
export interface WebScraperInput { ... }
export interface ScrapedContent { ... }

// providers/brightdata/api.ts
export async function runActor(...) { ... }

// providers/brightdata/actors.ts
export async function scrapeAsMarkdown(url: string) {
  // Call API
  // Filter results BEFORE returning
  return { url, title, markdown }; // Only what's needed
}
```

### Step 4: Create Executable Script

```typescript
#!/usr/bin/env bun
// scripts/scrape-web.ts
import { scrapeAsMarkdown } from '../providers/brightdata/actors';

const url = process.argv[2];
const result = await scrapeAsMarkdown(url);
console.log(JSON.stringify(result, null, 2));
```

Make executable:
```bash
chmod +x scripts/scrape-web.ts
```

### Step 5: Update Skills

```markdown
# Research Skill

## Web Scraping

Use system-mcp TypeScript wrapper:

```bash
bun run ~/.claude/skills/system-mcp/scripts/scrape-web.ts https://example.com
```

Returns filtered markdown only (99% token savings).
```

### Step 6: Retire Legacy MCP

```bash
# Move to unused directory
mv ~/.claude/MCPs/brightdata.json ~/.claude/MCPs/unused/

# Or comment out in .mcp.json
{
  "mcpServers": {
    // "brightdata": { ... }  // Migrated to system-mcp
  }
}
```

---

## Real-World Examples

### Example 1: BrightData Migration

**Before (Legacy MCP):**
- 51,000 tokens per scrape
- No type safety
- Slow (schema overhead)
- Cost: $0.50 per scrape

**After (System MCP):**
- 500 tokens per scrape
- Full TypeScript types
- Fast (direct API)
- Cost: $0.005 per scrape (99% savings!)

### Example 2: GitHub API

**Tier 1 Discovery:**
```typescript
// Explore via MCP
use_mcp_tool('github_list_repos', { username: 'user' })
// Learn: Returns name, description, stars, etc.
```

**Tier 2 Production:**
```typescript
// system-mcp/providers/github/repos.ts
export async function listRepos(username: string) {
  const response = await fetch(`https://api.github.com/users/${username}/repos`);
  const repos = await response.json();
  
  // Filter: Only need name and stars
  return repos.map(r => ({
    name: r.name,
    stars: r.stargazers_count,
  }));
}
```

### Example 3: Notion API

**Tier 1 Discovery:**
```typescript
use_mcp_tool('notion_list_databases')
use_mcp_tool('notion_query_database', { id: 'db-id' })
```

**Tier 2 Production:**
```typescript
// system-mcp/providers/notion/pages.ts
export async function getPageContent(pageId: string): Promise<string> {
  // Fetch page blocks
  // Convert to markdown
  // Return only markdown content (not all metadata)
  return markdown;
}
```

---

## Best Practices

### 1. Start with Discovery

**Always explore with Legacy MCP first:**
- Understand API capabilities
- Learn schemas and responses
- Test edge cases
- Document findings

**Don't write code until you know:**
- What endpoints you'll use
- What data you need
- What can be filtered out

### 2. Migrate When Justified

**Create System MCP when:**
- ✅ Will use API >10 times
- ✅ Token costs add up
- ✅ Need type safety
- ✅ Data needs filtering

**Keep using Legacy MCP when:**
- ❌ One-off tasks only
- ❌ API changes frequently
- ❌ Still experimenting
- ❌ Simple, small responses

### 3. Filter Aggressively

**In System MCP, return ONLY what's needed:**
```typescript
// ❌ Bad: Return everything
return fullApiResponse; // 50K tokens

// ✅ Good: Return only essentials
return {
  id: response.id,
  title: response.title,
  content: response.markdown,
  // Excluded: html, metadata, debug, etc.
};
```

### 4. Type Everything

**Use TypeScript interfaces:**
```typescript
// Explicit types for inputs
export interface ScrapeInput {
  url: string;
  waitForSelector?: string;
}

// Explicit types for outputs
export interface ScrapeResult {
  url: string;
  markdown: string;
}

// Function signature
export async function scrape(input: ScrapeInput): Promise<ScrapeResult> {
  // Implementation
}
```

### 5. Make It Executable

**Every System MCP should have executable scripts:**
```typescript
#!/usr/bin/env bun
// Can be run directly
// Can be tested independently
// Can be used in CLI-First patterns
```

### 6. Document Migration

**Keep notes on what you learned:**
```markdown
# API Migration Notes

## Discovery Phase (Legacy MCP)
- Tested actors: web-scraper, google-search
- web-scraper works great for markdown
- google-search not useful (rate limits)

## System MCP Implementation
- Created types for WebScraperInput/Output
- Filter reduces tokens from 50K to 500
- Added error handling for timeouts

## Results
- 99% token reduction
- Type safety catches errors early
- 10x faster execution
```

---

## Quick Reference

### Decision Tree

```
Need to use external API?
│
├─ First time? → Use Legacy MCP (Tier 1)
│  └─ Learn, document, test
│
└─ Used >10 times? → Create System MCP (Tier 2)
   └─ TypeScript wrapper with filtering
```

### Migration Checklist

- [ ] Explored API with Legacy MCP
- [ ] Documented endpoints and schemas
- [ ] Identified useful vs unnecessary fields
- [ ] Created TypeScript types
- [ ] Implemented API client
- [ ] Added filtering logic
- [ ] Created executable scripts
- [ ] Updated skills to use new wrapper
- [ ] Retired Legacy MCP
- [ ] Documented migration

---

## Related Documentation

- **CONSTITUTION.md** - Two-Tier MCP Strategy principle
- **cli-first-guide.md** - Building CLI wrappers for APIs
- **cli-first-examples.md** - API CLI tool examples (see llcli)
- **mcp-profile-management.md** - Legacy MCP configuration (if needed)
- **system-mcp skill** - Live example of Tier 2 implementation

---

**Key Takeaways:**
1. Use Legacy MCPs for discovery only
2. Migrate to System MCPs for repeated use
3. Filter data aggressively (99% token savings)
4. Type everything with TypeScript
5. Make scripts executable
6. Discovery → Document → Implement → Migrate
7. Measure token savings to justify migration
