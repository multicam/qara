# Parallel Execution Patterns

**Purpose**: Technical guide to implementing parallel execution with Promise.all, handling concurrency, and avoiding common pitfalls beyond agent delegation.

**Last Updated**: 2025-11-19

---

## Table of Contents
1. [Overview](#overview)
2. [Promise.all Patterns](#promiseall-patterns)
3. [Concurrency Control](#concurrency-control)
4. [Error Handling](#error-handling)
5. [Race Conditions & Shared State](#race-conditions--shared-state)
6. [Performance Optimization](#performance-optimization)
7. [Real-World Examples](#real-world-examples)
8. [Anti-Patterns](#anti-patterns)

---

## Overview

This document covers **technical parallel execution** patterns (Promise.all, concurrency, error handling). For **agent delegation** patterns, see `delegation-guide.md`.

### When to Use Parallel Execution

**✅ Use Parallel When:**
- Operations are **independent** (don't depend on each other)
- Operations are **I/O bound** (network, file system, database)
- Total time matters more than resource usage
- Order of completion doesn't matter

**❌ Use Sequential When:**
- Operations **depend on previous results**
- Operations are **CPU intensive** (may overwhelm system)
- Order of execution matters
- Debugging complex workflows

### The Basic Pattern

```typescript
// Sequential (slow)
const result1 = await operation1();
const result2 = await operation2();
const result3 = await operation3();
// Total time: T1 + T2 + T3

// Parallel (fast)
const [result1, result2, result3] = await Promise.all([
  operation1(),
  operation2(),
  operation3(),
]);
// Total time: max(T1, T2, T3)
```

---

## Promise.all Patterns

### Basic Promise.all

```typescript
// Execute multiple promises in parallel
const results = await Promise.all([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);

console.log(results); // [user1, user2, user3]
```

**Key Points:**
- All promises start immediately
- Waits for all to complete
- Returns array in same order as input
- **Fails fast**: If any promise rejects, entire Promise.all rejects

### Promise.allSettled (Handle Failures Gracefully)

```typescript
// Continue even if some promises fail
const results = await Promise.allSettled([
  fetchUser(1),
  fetchUser(999), // This will fail
  fetchUser(3),
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`User ${index + 1}:`, result.value);
  } else {
    console.error(`User ${index + 1} failed:`, result.reason);
  }
});

// Output:
// User 1: { id: 1, name: "Alice" }
// User 2 failed: Error: User not found
// User 3: { id: 3, name: "Charlie" }
```

**When to use allSettled:**
- Some operations can fail without breaking the whole batch
- Need to collect all results, both successes and failures
- Reporting/logging scenarios

### Promise.race (First to Complete)

```typescript
// Returns first promise to resolve or reject
const fastest = await Promise.race([
  fetchFromServer1(),
  fetchFromServer2(),
  fetchFromServer3(),
]);

console.log('Fastest server responded:', fastest);
```

**Use cases:**
- Timeout implementations
- Racing multiple API endpoints
- Fallback strategies

### Promise.any (First Success)

```typescript
// Returns first promise to successfully resolve
// Ignores rejections until all fail
const result = await Promise.any([
  fetchFromServer1(), // Fails
  fetchFromServer2(), // Succeeds second
  fetchFromServer3(), // Succeeds first
]);

console.log('First successful response:', result);
```

**Use cases:**
- Fallback to multiple sources
- Resilient API calls
- Geographic redundancy

---

## Concurrency Control

### Problem: Too Much Parallelism

```typescript
// ❌ Bad: Spawn 10,000 requests at once
const userIds = Array.from({ length: 10000 }, (_, i) => i + 1);
const users = await Promise.all(
  userIds.map(id => fetchUser(id))
); // 🔥 Server explodes
```

### Solution 1: Chunk/Batch Processing

```typescript
// ✅ Good: Process in batches of 50
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function processBatches(userIds: number[]) {
  const batches = chunk(userIds, 50);
  const allResults = [];

  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(id => fetchUser(id))
    );
    allResults.push(...results);
  }

  return allResults;
}
```

### Solution 2: Concurrency Limiter

```typescript
// ✅ Better: Limit concurrent operations
async function withConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// Usage
const users = await withConcurrencyLimit(
  userIds,
  10, // Max 10 concurrent requests
  id => fetchUser(id)
);
```

### Solution 3: p-limit Library

```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent

const users = await Promise.all(
  userIds.map(id => limit(() => fetchUser(id)))
);
```

**When to limit concurrency:**
- API rate limits (avoid 429 errors)
- Database connection pools
- File system operations
- Memory constraints
- CPU-intensive tasks

---

## Error Handling

### Pattern 1: Fail Fast (Promise.all)

```typescript
try {
  const results = await Promise.all([
    operation1(),
    operation2(),
    operation3(),
  ]);
  console.log('All succeeded:', results);
} catch (error) {
  console.error('At least one failed:', error);
  // Don't know which ones succeeded
}
```

**Use when:**
- All operations must succeed
- Partial results are useless
- Want to fail immediately

### Pattern 2: Collect All Results (Promise.allSettled)

```typescript
const results = await Promise.allSettled([
  operation1(),
  operation2(),
  operation3(),
]);

const successes = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

const failures = results
  .filter(r => r.status === 'rejected')
  .map(r => r.reason);

console.log(`${successes.length} succeeded, ${failures.length} failed`);
```

**Use when:**
- Partial results are useful
- Need to report on all operations
- Some failures are acceptable

### Pattern 3: Retry Failed Operations

```typescript
async function executeWithRetry(
  operations: (() => Promise<any>)[],
  maxRetries: number = 3
) {
  let results = await Promise.allSettled(operations.map(op => op()));

  for (let retry = 1; retry <= maxRetries; retry++) {
    const failedOps = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ index }) => operations[index]);

    if (failedOps.length === 0) break;

    console.log(`Retry ${retry}: ${failedOps.length} operations`);

    const retryResults = await Promise.allSettled(
      failedOps.map(op => op())
    );

    // Update results with retry results
    let retryIndex = 0;
    results = results.map((result, index) => {
      if (result.status === 'rejected') {
        return retryResults[retryIndex++];
      }
      return result;
    });
  }

  return results;
}
```

---

## Race Conditions & Shared State

### Problem: Concurrent Modifications

```typescript
// ❌ Bad: Race condition
let counter = 0;

await Promise.all([
  async () => { counter++; }, // Read counter, increment
  async () => { counter++; }, // Read counter, increment
  async () => { counter++; }, // Read counter, increment
]);

console.log(counter); // Expected: 3, Actual: Could be 1, 2, or 3!
```

### Solution 1: Avoid Shared State

```typescript
// ✅ Good: No shared state
const results = await Promise.all([
  async () => 1,
  async () => 1,
  async () => 1,
]);

const counter = results.reduce((sum, val) => sum + val, 0);
console.log(counter); // Always 3
```

### Solution 2: Use Atomics (SharedArrayBuffer)

```typescript
// For true parallel computation (workers)
const buffer = new SharedArrayBuffer(4);
const counter = new Int32Array(buffer);

await Promise.all([
  async () => Atomics.add(counter, 0, 1),
  async () => Atomics.add(counter, 0, 1),
  async () => Atomics.add(counter, 0, 1),
]);

console.log(counter[0]); // Always 3
```

### Solution 3: Mutex/Locks

```typescript
class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

// Usage
const mutex = new Mutex();
let counter = 0;

await Promise.all([
  async () => {
    await mutex.acquire();
    counter++;
    mutex.release();
  },
  async () => {
    await mutex.acquire();
    counter++;
    mutex.release();
  },
]);
```

---

## Performance Optimization

### Measure Before Optimizing

```typescript
// Benchmark sequential vs parallel
async function benchmark() {
  console.time('Sequential');
  await operation1();
  await operation2();
  await operation3();
  console.timeEnd('Sequential');

  console.time('Parallel');
  await Promise.all([operation1(), operation2(), operation3()]);
  console.timeEnd('Parallel');
}
```

### When Parallel Is Slower

**CPU-bound operations:**
```typescript
// ❌ Bad: Parallel CPU work (no benefit)
const results = await Promise.all([
  heavyComputation1(), // Blocks CPU
  heavyComputation2(), // Blocks CPU
  heavyComputation3(), // Blocks CPU
]);
// No speedup - CPU can only do one at a time!

// ✅ Better: Use Worker threads for true parallelism
import { Worker } from 'worker_threads';
```

**Small operations with overhead:**
```typescript
// ❌ Bad: Parallelizing tiny operations
await Promise.all([
  Promise.resolve(1 + 1),
  Promise.resolve(2 + 2),
  Promise.resolve(3 + 3),
]);
// Overhead > benefit

// ✅ Good: Just do it synchronously
const results = [1 + 1, 2 + 2, 3 + 3];
```

### Optimal Batch Sizes

```typescript
// Experiment to find optimal batch size
async function findOptimalBatchSize() {
  const sizes = [10, 50, 100, 200, 500];
  const items = Array.from({ length: 1000 }, (_, i) => i);

  for (const size of sizes) {
    console.time(`Batch size: ${size}`);
    await processBatches(items, size);
    console.timeEnd(`Batch size: ${size}`);
  }
}
```

---

## Real-World Examples

### Example 1: Bulk File Processing

```typescript
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function processFiles(directory: string, files: string[]) {
  // Read all files in parallel
  const contents = await Promise.all(
    files.map(file => readFile(join(directory, file), 'utf-8'))
  );

  // Transform files
  const processed = contents.map(content => {
    return content.toUpperCase(); // Example transformation
  });

  // Write all files in parallel
  await Promise.all(
    files.map((file, index) =>
      writeFile(join(directory, `processed-${file}`), processed[index])
    )
  );

  console.log(`Processed ${files.length} files`);
}
```

### Example 2: API Data Aggregation

```typescript
async function aggregateUserData(userId: number) {
  // Fetch related data in parallel
  const [user, posts, comments, likes] = await Promise.all([
    fetchUser(userId),
    fetchUserPosts(userId),
    fetchUserComments(userId),
    fetchUserLikes(userId),
  ]);

  return {
    user,
    stats: {
      posts: posts.length,
      comments: comments.length,
      likes: likes.length,
    },
  };
}
```

### Example 3: Health Check System

```typescript
interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
}

async function checkSystemHealth(): Promise<HealthCheck[]> {
  const services = [
    { name: 'database', check: checkDatabase },
    { name: 'redis', check: checkRedis },
    { name: 'api', check: checkAPI },
    { name: 's3', check: checkS3 },
  ];

  const results = await Promise.allSettled(
    services.map(async ({ name, check }) => {
      const start = Date.now();
      await check();
      return {
        service: name,
        status: 'healthy' as const,
        responseTime: Date.now() - start,
      };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      service: services[index].name,
      status: 'unhealthy' as const,
      responseTime: 0,
      error: result.reason.message,
    };
  });
}
```

### Example 4: Image Processing Pipeline

```typescript
async function processImages(imageUrls: string[]) {
  // Download images (limited concurrency)
  const limit = pLimit(5);
  const images = await Promise.all(
    imageUrls.map(url => limit(() => downloadImage(url)))
  );

  // Process images in parallel
  const processed = await Promise.all(
    images.map(image => ({
      thumbnail: resizeImage(image, 150, 150),
      medium: resizeImage(image, 500, 500),
      large: resizeImage(image, 1200, 1200),
    }))
  );

  // Upload processed images (limited concurrency)
  await Promise.all(
    processed.flatMap(set =>
      Object.entries(set).map(([size, image]) =>
        limit(() => uploadImage(image, size))
      )
    )
  );
}
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: forEach with async

```typescript
// ❌ Bad: forEach doesn't wait for async
files.forEach(async file => {
  await processFile(file);
});
console.log('Done!'); // Actually not done!

// ✅ Good: Use for...of or Promise.all
for (const file of files) {
  await processFile(file);
}

// ✅ Better: Parallel with Promise.all
await Promise.all(files.map(file => processFile(file)));
```

### ❌ Anti-Pattern 2: Nested Promise.all

```typescript
// ❌ Bad: Nested and hard to read
const results = await Promise.all(
  users.map(async user => {
    return await Promise.all(
      user.posts.map(async post => {
        return await Promise.all(
          post.comments.map(comment => processComment(comment))
        );
      })
    );
  })
);

// ✅ Good: Flatten structure
const allComments = users.flatMap(u => u.posts.flatMap(p => p.comments));
const results = await Promise.all(allComments.map(c => processComment(c)));
```

### ❌ Anti-Pattern 3: No Error Handling

```typescript
// ❌ Bad: Silent failures
await Promise.allSettled(operations);
// No checking of results!

// ✅ Good: Check and handle failures
const results = await Promise.allSettled(operations);
const failures = results.filter(r => r.status === 'rejected');
if (failures.length > 0) {
  console.error(`${failures.length} operations failed`);
  // Handle failures appropriately
}
```

### ❌ Anti-Pattern 4: Uncontrolled Parallelism

```typescript
// ❌ Bad: No concurrency limit
await Promise.all(
  thousandItems.map(item => apiCall(item))
); // 💥 Rate limit exceeded

// ✅ Good: Control concurrency
await withConcurrencyLimit(thousandItems, 10, item => apiCall(item));
```

---

## Quick Reference

### Choosing the Right Tool

```typescript
// All must succeed, fail fast
Promise.all([...])

// Collect all results, even failures
Promise.allSettled([...])

// First to complete (resolve or reject)
Promise.race([...])

// First successful result
Promise.any([...])

// Limit concurrent operations
pLimit(10)
```

### Common Patterns

```typescript
// Batch processing
const batches = chunk(items, 50);
for (const batch of batches) {
  await Promise.all(batch.map(processItem));
}

// Retry failures
const results = await Promise.allSettled(operations);
const failed = results.filter(r => r.status === 'rejected');
// Retry failed...

// Timeout
await Promise.race([
  operation(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  ),
]);
```

---

## Related Documentation

- **delegation-guide.md** - Agent-based parallel execution and task decomposition
- **agent-guide.md** - Agent hierarchy and escalation patterns
- **cli-first-guide.md** - Building deterministic tools for parallel execution
- **testing-guide.md** - Testing parallel code
- **CONSTITUTION.md** - Deterministic code principles

---

**Key Takeaways:**
1. Use Promise.all for independent I/O operations
2. Limit concurrency to avoid overwhelming systems
3. Use Promise.allSettled when partial failures are OK
4. Avoid shared state in parallel code
5. Measure performance - parallel isn't always faster
6. Handle errors explicitly
7. Never use forEach with async functions
