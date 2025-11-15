# BAML Web Scraping Quick Start Guide

**Created:** 2025-11-14
**Purpose:** Quick reference for implementing BAML-based web scraping

---

## What is BAML?

BAML (Boundary AI Markup Language) is a **data extraction and structuring layer** that uses LLMs to convert unstructured HTML/text into type-safe, validated data structures.

**CRITICAL:** BAML is NOT a web scraper. It's the "last mile" - you fetch HTML with other tools, then BAML structures it.

---

## The Stack

```
[Playwright/Puppeteer/Cheerio] → [Raw HTML] → [BAML + LLM] → [Typed Data]
        Fetching                   Extraction      Structuring    Output
```

---

## Quick Setup (TypeScript + Bun)

### 1. Install Dependencies

```bash
bun add @boundaryml/baml-client playwright
bun add -d @types/node
```

### 2. Create BAML Schema

```baml
// baml/types.baml
class Product {
  name string
  price float
  description string?
  in_stock bool
}

// baml/functions.baml
function ExtractProduct(html: string) -> Product {
  client GPT4
  prompt #"
    Extract product information from: {{ html }}
    {{ ctx.output_format }}
  "#
}
```

### 3. Generate TypeScript Client

```bash
baml-cli generate --project-dir ./baml
```

### 4. Use in Your Code

```typescript
import { chromium } from 'playwright';
import { BamlClient } from '@boundaryml/baml-client';

const client = new BamlClient();

async function scrapeProduct(url: string) {
  // Step 1: Fetch HTML with Playwright
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const html = await page.content();
  await browser.close();

  // Step 2: Extract structured data with BAML
  const product = await client.ExtractProduct({ html });

  return product; // Fully typed!
}
```

---

## Essential Patterns

### Pattern 1: Single Item Extraction

```typescript
async function scrapeSingle(url: string) {
  const html = await fetchPage(url);
  return await client.ExtractProduct({ html });
}
```

### Pattern 2: List Extraction

```baml
function ExtractProducts(html: string) -> Product[] {
  client GPT4
  prompt #"Extract all products from: {{ html }}"#
}
```

```typescript
async function scrapeList(url: string) {
  const html = await fetchPage(url);
  return await client.ExtractProducts({ html });
}
```

### Pattern 3: Pagination

```typescript
async function scrapeAllPages(baseUrl: string, maxPages: number = 10) {
  const allProducts = [];

  for (let page = 1; page <= maxPages; page++) {
    const html = await fetchPage(`${baseUrl}?page=${page}`);
    const products = await client.ExtractProducts({ html });

    if (products.length === 0) break;

    allProducts.push(...products);
    await sleep(1000); // Rate limiting
  }

  return allProducts;
}
```

### Pattern 4: Error Handling with Retries

```typescript
import { retry } from '@lifeomic/attempt';

async function scrapeWithRetry(url: string) {
  return retry(
    async () => {
      const html = await fetchPage(url);
      return await client.ExtractProduct({ html });
    },
    {
      maxAttempts: 3,
      delay: 1000,
      factor: 2 // Exponential backoff
    }
  );
}
```

### Pattern 5: Parallel Scraping with Concurrency Limit

```typescript
import pLimit from 'p-limit';

async function scrapeParallel(urls: string[], concurrency: number = 5) {
  const limit = pLimit(concurrency);

  const promises = urls.map(url =>
    limit(() => scrapeWithRetry(url))
  );

  return Promise.all(promises);
}
```

---

## Schema Design Best Practices

### Use Optional Fields Liberally

Real-world data is messy - make fields optional unless guaranteed:

```baml
class Product {
  name string           // Required
  price float           // Required
  description string?   // Optional
  rating float?         // Optional
  reviews Review[]?     // Optional list
}
```

### Nested Structures

```baml
class Review {
  author string
  rating float
  text string
}

class Product {
  name string
  price float
  reviews Review[]  // Nested objects
}
```

### Validation Constraints

```baml
class Product {
  name string @assert(min_length: 1, max_length: 200)
  price float @assert(min: 0)
  rating float? @assert(min: 0, max: 5)
}
```

### Enums for Categorical Data

```baml
enum ProductCondition {
  NEW
  USED
  REFURBISHED
}

class Product {
  name string
  condition ProductCondition
}
```

---

## When to Use What Tool

| Tool | Use Case | Speed | Resources |
|------|----------|-------|-----------|
| **Cheerio** | Static HTML | Very Fast | Low |
| **Puppeteer** | JavaScript-rendered, Chrome only | Slow | High |
| **Playwright** | JavaScript-rendered, multi-browser | Fast | Medium |

### Cheerio (Static Content)

```typescript
import * as cheerio from 'cheerio';

async function scrapeStatic(url: string) {
  const response = await fetch(url);
  const html = await response.text();

  // Optional: Pre-filter with Cheerio
  const $ = cheerio.load(html);
  const productSection = $('.product-details').html();

  return await client.ExtractProduct({ html: productSection });
}
```

### Playwright (Dynamic Content)

```typescript
import { chromium } from 'playwright';

async function scrapeDynamic(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for specific elements if needed
  await page.waitForSelector('.product-info');

  const html = await page.content();
  await browser.close();

  return await client.ExtractProduct({ html });
}
```

---

## Production Checklist

### Error Handling

- [ ] Retry logic with exponential backoff
- [ ] Timeout configuration
- [ ] Graceful degradation
- [ ] Comprehensive logging

### Rate Limiting

- [ ] Delays between requests
- [ ] Concurrent request limits
- [ ] Respect robots.txt
- [ ] User-Agent headers

### Memory Management

- [ ] Stream processing for large datasets
- [ ] Close browser instances
- [ ] Chunked database writes
- [ ] Clear unused variables

### Validation

- [ ] Schema-level validation (BAML)
- [ ] Application-level validation
- [ ] Data quality checks
- [ ] Deduplication logic

### Monitoring

- [ ] Structured logging (pino)
- [ ] Error tracking (Sentry)
- [ ] Performance metrics
- [ ] Success rate tracking

---

## Common Mistakes to Avoid

1. **Thinking BAML is a scraper** - It's NOT. Use Playwright/Cheerio to fetch.
2. **Making all fields required** - Real data has gaps. Use optional fields.
3. **No retries** - Networks fail. Always implement retry logic.
4. **Synchronous code** - Use async/await for parallelism.
5. **No rate limiting** - You'll get IP banned. Add delays.
6. **Accumulating in memory** - Stream or batch process large datasets.
7. **Ignoring errors** - Log everything for debugging.

---

## Complete Production Example

```typescript
import { chromium } from 'playwright';
import { BamlClient } from '@boundaryml/baml-client';
import pLimit from 'p-limit';
import pino from 'pino';

const logger = pino();
const client = new BamlClient();

interface ScrapeResult<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  url: string;
}

async function scrapeProduct(url: string, attempt: number = 0): Promise<ScrapeResult<Product>> {
  const maxAttempts = 3;

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const html = await page.content();
    await browser.close();

    const product = await client.ExtractProduct({ html });

    logger.info({ url, product: product.name }, 'Scrape successful');

    return { status: 'success', data: product, url };

  } catch (error) {
    logger.error({ url, error, attempt }, 'Scrape failed');

    if (attempt < maxAttempts - 1) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return scrapeProduct(url, attempt + 1);
    }

    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      url
    };
  }
}

async function scrapeProductCatalog(urls: string[]): Promise<Product[]> {
  const limit = pLimit(5); // Max 5 concurrent requests

  const results = await Promise.all(
    urls.map(url => limit(() => scrapeProduct(url)))
  );

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');

  logger.info({
    total: urls.length,
    successful: successful.length,
    failed: failed.length
  }, 'Catalog scrape completed');

  return successful.map(r => r.data!);
}

export { scrapeProduct, scrapeProductCatalog };
```

---

## Testing

```typescript
import { test, expect } from 'vitest';
import { BamlClient } from '@boundaryml/baml-client';

test('extracts product correctly', async () => {
  const client = new BamlClient();
  const html = `
    <div class="product">
      <h1>iPhone 15 Pro</h1>
      <span class="price">$999</span>
      <p>Latest iPhone model</p>
    </div>
  `;

  const product = await client.ExtractProduct({ html });

  expect(product.name).toContain('iPhone');
  expect(product.price).toBeGreaterThan(0);
  expect(product.description).toBeTruthy();
});
```

---

## Next Steps

1. **Start Simple**: Single-page, static HTML scraper
2. **Add Retry Logic**: Handle failures gracefully
3. **Add Pagination**: Scale to multiple pages
4. **Optimize Performance**: Parallelism and caching
5. **Production Hardening**: Logging, monitoring, alerts

---

## Resources

- **BAML Docs**: https://docs.boundaryml.com
- **Playwright Docs**: https://playwright.dev
- **This Research**: See full report in `2025-11-14_baml-web-scraping-comprehensive-research.md`

---

**Quick Start Complete!** You now have everything needed to build production-ready BAML scrapers.
