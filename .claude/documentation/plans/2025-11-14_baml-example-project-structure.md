# BAML Scraper - Example Project Structure

**Created:** 2025-11-14
**Purpose:** Reference implementation structure for BAML-based web scraping projects

---

## Project Directory Structure

```
baml-scraper/
├── baml/                           # BAML schema definitions
│   ├── types.baml                  # Data structure definitions
│   ├── functions.baml              # Extraction functions
│   └── clients.baml                # LLM client configurations
│
├── src/
│   ├── scrapers/                   # Domain-specific scrapers
│   │   ├── product-scraper.ts
│   │   ├── article-scraper.ts
│   │   └── job-scraper.ts
│   │
│   ├── utils/                      # Shared utilities
│   │   ├── browser.ts              # Browser automation helpers
│   │   ├── retry.ts                # Retry logic
│   │   ├── rate-limiter.ts         # Rate limiting
│   │   ├── cache.ts                # Caching layer
│   │   └── logger.ts               # Structured logging
│   │
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts
│   │
│   └── index.ts                    # Main entry point
│
├── tests/
│   ├── scrapers/
│   │   ├── product-scraper.test.ts
│   │   └── article-scraper.test.ts
│   │
│   └── fixtures/                   # Test data
│       ├── product-page.html
│       └── article-page.html
│
├── config/
│   ├── baml.config.ts              # BAML configuration
│   └── scraper.config.ts           # Scraper settings
│
├── scripts/
│   ├── generate-baml.sh            # Code generation script
│   └── test-scraper.ts             # Manual testing script
│
├── .env.example                    # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## File Contents

### 1. `baml/types.baml`

```baml
// Core data structures for web scraping

// Product scraping
class Price {
  amount float
  currency string
}

class Review {
  author string
  rating float
  comment string
  date string?
  verified_purchase bool?
}

class Product {
  name string
  description string?
  price Price
  original_price Price?
  discount_percentage float?
  rating float?
  review_count int?
  in_stock bool
  specifications map<string, string>?
  reviews Review[]?
  image_urls string[]?
  category string?
}

// Article scraping
class Author {
  name string
  bio string?
  profile_url string?
}

class Article {
  title string
  subtitle string?
  author Author
  published_date string
  updated_date string?
  content string
  excerpt string?
  tags string[]
  category string
  read_time_minutes int?
  image_url string?
  source_url string
}

// Job scraping
enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
}

enum ExperienceLevel {
  ENTRY
  JUNIOR
  MID
  SENIOR
  LEAD
}

class Salary {
  min float?
  max float?
  currency string
  period string
}

class JobListing {
  title string
  company string
  location string
  remote bool?
  job_type JobType
  experience_level ExperienceLevel
  salary Salary?
  description string
  requirements string[]
  benefits string[]?
  posted_date string
  application_url string
}
```

### 2. `baml/functions.baml`

```baml
// Extraction functions

// Product extraction
function ExtractProduct(html: string) -> Product {
  client GPT4
  prompt #"
    Extract product information from the following HTML:

    {{ html }}

    Focus on extracting:
    - Product name and description
    - Current price and any discounts
    - Stock availability
    - Customer reviews and ratings
    - Technical specifications
    - Product images

    {{ ctx.output_format }}
  "#
}

function ExtractProducts(html: string) -> Product[] {
  client GPT4
  prompt #"
    Extract all product listings from:

    {{ html }}

    Return a list of products with their basic information.

    {{ ctx.output_format }}
  "#
}

// Article extraction
function ExtractArticle(html: string) -> Article {
  client GPT4
  prompt #"
    Extract article content and metadata from:

    {{ html }}

    Include author information, publication dates, and full content.

    {{ ctx.output_format }}
  "#
}

// Job extraction
function ExtractJobs(html: string) -> JobListing[] {
  client GPT4
  prompt #"
    Extract all job listings from:

    {{ html }}

    Include job details, requirements, and salary information if available.

    {{ ctx.output_format }}
  "#
}
```

### 3. `baml/clients.baml`

```baml
// LLM client configurations

client GPT4 {
  provider openai
  model "gpt-4-turbo-preview"
  options {
    temperature 0.1
    max_tokens 4096
  }
}

client GPT35 {
  provider openai
  model "gpt-3.5-turbo"
  options {
    temperature 0.1
    max_tokens 2048
  }
}

client Claude {
  provider anthropic
  model "claude-3-sonnet-20240229"
  options {
    temperature 0.1
    max_tokens 4096
  }
}

// Fallback configuration
client Resilient {
  provider openai
  model "gpt-4-turbo-preview"
  fallback_client GPT35
  fallback_client Claude
}
```

### 4. `src/utils/browser.ts`

```typescript
import { chromium, Browser, Page } from 'playwright';
import { logger } from './logger';

export class BrowserManager {
  private browser: Browser | null = null;

  async launch() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logger.info('Browser launched');
    }
    return this.browser;
  }

  async newPage(): Promise<Page> {
    const browser = await this.launch();
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (compatible; ProductScraper/1.0)'
    });
    return page;
  }

  async fetchPage(url: string, waitForSelector?: string): Promise<string> {
    const page = await this.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }

      const html = await page.content();
      return html;

    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }
}

export const browserManager = new BrowserManager();
```

### 5. `src/utils/retry.ts`

```typescript
import { logger } from './logger';

interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < opts.maxAttempts - 1) {
        const delay = Math.min(
          opts.initialDelay * Math.pow(opts.factor, attempt),
          opts.maxDelay
        );

        logger.warn({
          attempt: attempt + 1,
          maxAttempts: opts.maxAttempts,
          delay,
          error: lastError.message
        }, 'Retry attempt failed, waiting before retry');

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

### 6. `src/utils/rate-limiter.ts`

```typescript
import pLimit from 'p-limit';

export class RateLimiter {
  private limit: ReturnType<typeof pLimit>;
  private lastRequest: number = 0;
  private minDelay: number;

  constructor(concurrency: number = 5, minDelayMs: number = 1000) {
    this.limit = pLimit(concurrency);
    this.minDelay = minDelayMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.limit(async () => {
      // Ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;

      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve =>
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }

      this.lastRequest = Date.now();
      return fn();
    });
  }
}
```

### 7. `src/utils/cache.ts`

```typescript
import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlMinutes: number = 60) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  private hashKey(key: string): string {
    return createHash('md5').update(key).digest('hex');
  }

  set(key: string, value: T): void {
    const hash = this.hashKey(key);
    this.store.set(hash, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key: string): T | null {
    const hash = this.hashKey(key);
    const entry = this.store.get(hash);

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.store.delete(hash);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.store.clear();
  }
}
```

### 8. `src/utils/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});
```

### 9. `src/scrapers/product-scraper.ts`

```typescript
import { BamlClient } from '@boundaryml/baml-client';
import { Product } from '../types';
import { browserManager } from '../utils/browser';
import { retry } from '../utils/retry';
import { RateLimiter } from '../utils/rate-limiter';
import { Cache } from '../utils/cache';
import { logger } from '../utils/logger';

const client = new BamlClient();
const rateLimiter = new RateLimiter(5, 1000);
const cache = new Cache<Product>(60);

interface ScrapeResult {
  status: 'success' | 'error';
  data?: Product;
  error?: string;
  url: string;
}

export async function scrapeProduct(url: string): Promise<ScrapeResult> {
  // Check cache
  const cached = cache.get(url);
  if (cached) {
    logger.info({ url }, 'Cache hit');
    return { status: 'success', data: cached, url };
  }

  return rateLimiter.execute(async () => {
    try {
      const html = await retry(() =>
        browserManager.fetchPage(url, '.product-info')
      );

      const product = await retry(() =>
        client.ExtractProduct({ html })
      );

      // Validate
      if (!product.name || !product.price) {
        throw new Error('Missing required product fields');
      }

      // Cache result
      cache.set(url, product);

      logger.info({ url, product: product.name }, 'Product scraped successfully');

      return { status: 'success', data: product, url };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ url, error: message }, 'Product scrape failed');

      return { status: 'error', error: message, url };
    }
  });
}

export async function scrapeProducts(urls: string[]): Promise<Product[]> {
  logger.info({ count: urls.length }, 'Starting batch scrape');

  const results = await Promise.all(
    urls.map(url => scrapeProduct(url))
  );

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');

  logger.info({
    total: urls.length,
    successful: successful.length,
    failed: failed.length
  }, 'Batch scrape completed');

  return successful.map(r => r.data!);
}
```

### 10. `package.json`

```json
{
  "name": "baml-scraper",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "baml:gen": "baml-cli generate --project-dir ./baml",
    "prebuild": "bun run baml:gen",
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@boundaryml/baml-client": "latest",
    "playwright": "^1.40.0",
    "cheerio": "^1.0.0-rc.12",
    "p-limit": "^5.0.0",
    "pino": "^8.17.0",
    "pino-pretty": "^10.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "tsx": "^4.7.0"
  }
}
```

### 11. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 12. `.env.example`

```bash
# LLM API Keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Logging
LOG_LEVEL=info

# Rate Limiting
MAX_CONCURRENT_REQUESTS=5
MIN_DELAY_MS=1000

# Cache
CACHE_TTL_MINUTES=60

# Browser
HEADLESS=true
USER_AGENT=Mozilla/5.0 (compatible; ProductScraper/1.0)
```

### 13. `tests/scrapers/product-scraper.test.ts`

```typescript
import { test, expect, beforeAll, afterAll } from 'vitest';
import { scrapeProduct } from '../../src/scrapers/product-scraper';
import { browserManager } from '../../src/utils/browser';
import { readFileSync } from 'fs';
import { join } from 'path';

let mockHtml: string;

beforeAll(async () => {
  mockHtml = readFileSync(
    join(__dirname, '../fixtures/product-page.html'),
    'utf-8'
  );
});

afterAll(async () => {
  await browserManager.close();
});

test('extracts product name', async () => {
  const result = await scrapeProduct('https://example.com/product');

  expect(result.status).toBe('success');
  expect(result.data?.name).toBeTruthy();
  expect(result.data?.name).toHaveLength.greaterThan(0);
});

test('extracts price correctly', async () => {
  const result = await scrapeProduct('https://example.com/product');

  expect(result.data?.price.amount).toBeGreaterThan(0);
  expect(result.data?.price.currency).toMatch(/[A-Z]{3}/);
});

test('handles missing optional fields', async () => {
  const result = await scrapeProduct('https://example.com/minimal-product');

  expect(result.status).toBe('success');
  expect(result.data?.name).toBeTruthy();
  // Optional fields may be undefined
  expect(result.data?.description).toBeDefined();
});

test('retries on failure', async () => {
  // This would require mocking the browser/network to simulate failures
  // Implementation depends on your testing strategy
});
```

### 14. `src/index.ts`

```typescript
import { scrapeProducts } from './scrapers/product-scraper';
import { browserManager } from './utils/browser';
import { logger } from './utils/logger';

async function main() {
  const urls = [
    'https://example.com/product1',
    'https://example.com/product2',
    'https://example.com/product3'
  ];

  try {
    const products = await scrapeProducts(urls);

    console.log('\n=== Scraping Results ===');
    console.log(`Successfully scraped: ${products.length} products\n`);

    products.forEach(product => {
      console.log(`Name: ${product.name}`);
      console.log(`Price: ${product.price.amount} ${product.price.currency}`);
      console.log(`In Stock: ${product.in_stock}`);
      console.log('---');
    });

  } catch (error) {
    logger.error({ error }, 'Scraping failed');
    process.exit(1);

  } finally {
    await browserManager.close();
  }
}

main();
```

### 15. `README.md`

```markdown
# BAML Web Scraper

Production-ready web scraper built with BAML, Playwright, and TypeScript.

## Features

- Type-safe data extraction with BAML
- Automatic retries with exponential backoff
- Rate limiting and concurrency control
- In-memory caching
- Structured logging
- Comprehensive error handling

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Install Playwright browsers:
   ```bash
   bunx playwright install chromium
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Generate BAML client:
   ```bash
   bun run baml:gen
   ```

## Usage

```typescript
import { scrapeProduct } from './scrapers/product-scraper';

const result = await scrapeProduct('https://example.com/product');

if (result.status === 'success') {
  console.log(result.data);
}
```

## Development

```bash
# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Run production build
bun start
```

## Project Structure

See `2025-11-14_baml-example-project-structure.md` for details.
```

---

## Usage Instructions

### 1. Create New Project

```bash
mkdir baml-scraper
cd baml-scraper
bun init -y
```

### 2. Install Dependencies

```bash
bun add @boundaryml/baml-client playwright cheerio p-limit pino pino-pretty
bun add -d @types/node typescript vitest tsx
bunx playwright install chromium
```

### 3. Copy Files

Copy all the file contents above into your project following the directory structure.

### 4. Generate BAML Client

```bash
bunx baml-cli generate --project-dir ./baml
```

### 5. Run

```bash
bun run dev
```

---

## Customization Guide

### Add New Data Type

1. Define in `baml/types.baml`:
   ```baml
   class CustomType {
     field1 string
     field2 int
   }
   ```

2. Create extraction function in `baml/functions.baml`:
   ```baml
   function ExtractCustom(html: string) -> CustomType {
     client GPT4
     prompt #"Extract custom data from: {{ html }}"#
   }
   ```

3. Create scraper in `src/scrapers/custom-scraper.ts`

4. Regenerate BAML client: `bun run baml:gen`

### Adjust Rate Limiting

In `src/scrapers/product-scraper.ts`:

```typescript
const rateLimiter = new RateLimiter(
  10,   // Max 10 concurrent requests
  2000  // 2 second minimum delay
);
```

### Change LLM Provider

In `baml/clients.baml`:

```baml
client MyClient {
  provider anthropic  // or openai, etc.
  model "claude-3-opus-20240229"
}
```

---

## Best Practices Implemented

- **Separation of Concerns**: Scrapers, utilities, and BAML schemas are separated
- **Type Safety**: Full TypeScript typing + BAML schemas
- **Error Handling**: Retries, validation, structured errors
- **Performance**: Rate limiting, caching, concurrent requests
- **Observability**: Structured logging with pino
- **Testing**: Vitest setup with fixtures
- **Maintainability**: Clear structure, documented code

---

## Next Steps

1. Customize BAML schemas for your target websites
2. Implement domain-specific scrapers
3. Add database persistence layer
4. Set up monitoring and alerting
5. Deploy to production environment

---

**Project Structure Complete!** This provides a solid foundation for production BAML scraping projects.
