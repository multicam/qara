# 10 — Memory System

## Summary

The memory system has **two completely separate and architecturally unrelated subsystems**: the builtin `src/memory/` system (file-backed, SQLite-stored, vector-search enabled) and the `extensions/memory-lancedb/` plugin (LanceDB-backed, conversation-capture, lifecycle hooks). They do not share any code.

The builtin system uses a **three-tier class inheritance chain** (`MemoryManagerSyncOps` → `MemoryManagerEmbeddingOps` → `MemoryIndexManager`) with a global instance cache keyed by `agentId:workspaceDir:settings`.

The `MemorySearchManager` interface at `src/memory/types.ts:61` is the single abstraction contract; two concrete implementations exist: `MemoryIndexManager` (builtin SQLite) and `QmdMemoryManager` (external `qmd` process), with a `FallbackMemoryManager` wrapper providing automatic failover between them.

The builtin index stores data in a **SQLite database** using three tables (`files`, `chunks`, `embedding_cache`) plus optional `chunks_vec` (via `sqlite-vec` extension) for ANN vector search and `chunks_fts` for BM25 full-text search.

Hybrid search merges **vector cosine similarity** + **BM25 text rank** with configurable weights (default 70%/30%), then optionally applies **MMR re-ranking** (diversity) and **temporal decay** (recency scoring for dated memory files).

There is **no plugin "memory slot" system** in the traditional sense — plugins register tools, and the agent runtime invokes them; memory is retrieved **on demand** when the AI calls `memory_search`, not pre-loaded into a slot.

---

## Directory Structure

```
src/memory/                          — Core builtin memory engine
├── types.ts                         — MemorySearchManager interface + all public types
├── index.ts                         — Public exports
├── search-manager.ts                — Factory: getMemorySearchManager(), FallbackMemoryManager
├── backend-config.ts                — resolveMemoryBackendConfig() for builtin vs qmd routing
├── manager.ts                       — MemoryIndexManager (main class, top of hierarchy)
├── manager-sync-ops.ts              — MemoryManagerSyncOps (abstract, watcher/sync logic)
├── manager-embedding-ops.ts         — MemoryManagerEmbeddingOps (abstract, embed/index logic)
├── manager-search.ts                — Pure search functions: searchVector(), searchKeyword()
├── memory-schema.ts                 — SQLite DDL: tables, indexes
├── embeddings.ts                    — EmbeddingProvider factory + local (node-llama-cpp)
├── embeddings-openai.ts             — OpenAI embeddings client
├── embeddings-gemini.ts             — Gemini embeddings client
├── embeddings-voyage.ts             — Voyage embeddings client
├── hybrid.ts                        — mergeHybridResults(), buildFtsQuery(), bm25RankToScore()
├── mmr.ts                           — Maximal Marginal Relevance re-ranking
├── temporal-decay.ts                — Score decay for dated memory files
├── query-expansion.ts               — FTS keyword extraction (stop words, CJK support)
├── internal.ts                      — chunkMarkdown(), hashText(), cosineSimilarity(), file listing
├── session-files.ts                 — Session JSONL transcript processing
├── qmd-manager.ts                   — QmdMemoryManager (external process backend)
├── sqlite-vec.ts                    — sqlite-vec extension loader
└── sqlite.ts                        — Node.js sqlite module loader

extensions/memory-core/             — Plugin: registers memory tools + CLI
├── index.ts                         — memoryCorePlugin: registerTool + registerCli
├── openclaw.plugin.json             — id:"memory-core", kind:"memory", empty configSchema
└── package.json

extensions/memory-lancedb/          — Plugin: LanceDB long-term memory
├── index.ts                         — memoryPlugin: MemoryDB, Embeddings, 3 tools, 2 lifecycle hooks
├── config.ts                        — memoryConfigSchema, MemoryConfig, vectorDimsForModel()
└── openclaw.plugin.json             — id:"memory-lancedb", configSchema with uiHints

src/agents/
├── memory-search.ts                 — resolveMemorySearchConfig() + all defaults
└── tools/memory-tool.ts             — createMemorySearchTool(), createMemoryGetTool()
```

---

## MemorySearchManager Interface

`src/memory/types.ts:61-80`:

```
MemorySearchManager
  ├── search(query, opts?)              → MemorySearchResult[]
  ├── readFile(params)                  → { text, path }
  ├── status()                          → MemoryProviderStatus
  ├── sync?(params?)                    → void (optional)
  ├── probeEmbeddingAvailability()      → MemoryEmbeddingProbeResult
  ├── probeVectorAvailability()         → boolean
  └── close?()                          → void (optional)
```

Key types at `src/memory/types.ts`:
- `MemorySearchResult` (line 3): `{ path, startLine, endLine, score, snippet, source, citation? }`
- `MemorySource` (line 1): `"memory" | "sessions"`
- `MemoryProviderStatus` (line 24): richly-structured status including backend, provider, files/chunks counts, cache, fts, vector, batch info

Factory: `getMemorySearchManager()` at `src/memory/search-manager.ts:19`.

---

## Memory-Core Extension

`extensions/memory-core/index.ts:10-34`

Minimal plugin — does not implement memory storage; registers tools and CLI by delegating entirely to the runtime API:

```
api.registerTool(ctx => {
  memorySearchTool = api.runtime.tools.createMemorySearchTool(...)
  memoryGetTool = api.runtime.tools.createMemoryGetTool(...)
  return [memorySearchTool, memoryGetTool]  // or null if not configured
}, { names: ["memory_search", "memory_get"] })

api.registerCli(({ program }) => {
  api.runtime.tools.registerMemoryCli(program)
}, { commands: ["memory"] })
```

- Plugin `id`: `"memory-core"`, `kind`: `"memory"`
- Config schema: empty (no user-configurable options)
- If `createMemorySearchTool()` returns null (memory not configured for this agent), the plugin cedes the slot

---

## LanceDB Extension

`extensions/memory-lancedb/index.ts` — standalone plugin providing long-term conversational memory, completely separate from the builtin file-based system.

### MemoryDB Class (lines 59-157)

Wraps LanceDB with lazy initialization:

```
MemoryDB
  ├── store(entry)     → MemoryEntry (auto-generates id, createdAt)
  ├── search(vector, limit=5, minScore=0.5) → MemorySearchResult[]
  ├── delete(id)       → boolean
  └── count()          → number
```

Table schema: `{ id, text, vector: number[N], importance, category, createdAt }`

Vector search uses L2 (Euclidean) distance, converted: `score = 1 / (1 + distance)`.

### Embeddings Class (lines 163-180)

OpenAI-only, uses `openai` npm package directly. Single method: `embed(text) → number[]`.

### Memory Categories (`config.ts:17-18`)

`"preference" | "fact" | "decision" | "entity" | "other"`

### Configuration (`config.ts`)

| Field | Default | Notes |
|---|---|---|
| `embedding.apiKey` | required | Supports `${ENV_VAR}` syntax |
| `embedding.model` | `text-embedding-3-small` | Only `3-small`/`3-large` supported |
| `dbPath` | `~/.openclaw/memory/lancedb` | |
| `autoCapture` | `false` | Auto-store from conversations |
| `autoRecall` | `true` | Auto-inject into context |
| `captureMaxChars` | `500` | Max message length for capture |

Vector dimensions: `text-embedding-3-small` → 1536, `text-embedding-3-large` → 3072.

---

## Builtin Memory — SQLite Storage

### Schema (`src/memory/memory-schema.ts`)

Four tables:

| Table | Purpose |
|-------|---------|
| `files` | File-level index: path (PK), source, hash, mtime, size |
| `chunks` | Chunk-level embeddings: id (SHA-256), path, source, start_line, end_line, hash, model, text, embedding (JSON), updated_at |
| `embedding_cache` | LRU cache keyed by (provider, model, provider_key, hash) |
| `chunks_vec` | Optional sqlite-vec virtual table for ANN search |
| `chunks_fts` | Optional FTS5 virtual table for BM25 keyword search |

DB path: `~/.openclaw/state/memory/{agentId}.sqlite` (`src/agents/memory-search.ts:122-130`).

### Chunking (`src/memory/internal.ts:184-265`)

`chunkMarkdown(content, { tokens, overlap })`:
- `maxChars = tokens * 4` (approximate)
- Lines exceeding maxChars split into segments
- Overlap carries last N characters of previous chunk into next
- Each chunk gets SHA-256 hash
- Defaults: 400 tokens, 80 overlap

### Vector Search (`src/memory/manager-search.ts:20-94`)

When sqlite-vec loaded: `vec_distance_cosine()` SQL function, score = `1 - dist`.

Fallback: loads all chunk embeddings into memory and computes `cosineSimilarity()` (`internal.ts:297-316`).

### Keyword Search (`src/memory/manager-search.ts:136-191`)

SQLite FTS5 with BM25 ranking. Score conversion: `score = 1 / (1 + abs(rank))` (`hybrid.ts:47-49`).

FTS query: tokenizes on Unicode letters/numbers, quotes each token, joins with `AND`.

---

## Hybrid Search and Re-Ranking Pipeline

`mergeHybridResults()` at `src/memory/hybrid.ts:51-149`:

```
1. Collect vector results + keyword results (keyed by chunk id)
2. Combined score = vectorWeight × vectorScore + textWeight × textScore
3. Apply temporal decay (opt-in): score *= exp(-λ × ageInDays)
4. Sort by descending score
5. Apply MMR re-ranking (opt-in): λ × relevance - (1-λ) × max_jaccard_sim
6. Filter by minScore, slice to maxResults
```

Default weights: vector 70%, text 30%. Candidate pool: `maxResults × candidateMultiplier` (4x, capped at 200).

---

## Agent Runtime Integration

### memory_search Tool (`src/agents/tools/memory-tool.ts:40-98`)

Tool description instructs the AI: "Mandatory recall step: semantically search MEMORY.md + memory/*.md before answering questions about prior work, decisions, dates, people, preferences, or todos."

Execution:
1. Agent calls `memory_search` with query
2. Tool calls `getMemorySearchManager()` → manager instance
3. Manager runs `search(query, { maxResults, minScore, sessionKey })`
4. Citations optionally appended (auto-enabled for direct chats): `Source: path#L10-L15`
5. Returns JSON with `{ results, provider, model, fallback, citations, mode }`

### memory_get Tool (`src/agents/tools/memory-tool.ts:101-140`)

Reads specific line ranges from memory files identified by `memory_search`.

### LanceDB Auto-Recall

For the LanceDB plugin, auto-recall injects memories before the agent starts via `api.on("before_agent_start", ...)` at `index.ts:540-563`:
- Embeds the incoming prompt
- Searches for relevant memories
- Returns `{ prependContext: "<relevant-memories>...</relevant-memories>" }`
- Wrapped with untrusted-data warning prefix

---

## Memory Lifecycle

### Sync Triggers (`MemoryManagerSyncOps` at `manager-sync-ops.ts`)

| Trigger | Condition | Debounce |
|---|---|---|
| Session start | `sync.onSessionStart = true` | None |
| On search | `sync.onSearch = true`, dirty | None |
| File watcher | `sync.watch = true`, chokidar event | `watchDebounceMs` (1500ms) |
| Session delta | Transcript grows by 100KB or 50 messages | 5000ms |
| Interval | `sync.intervalMinutes > 0` | Fixed interval |
| Force sync | Explicit `sync({ force: true })` | None |

Watch paths: `MEMORY.md`, `memory.md`, `memory/**/*.md` + `extraPaths`.

Ignored directories: `.git`, `node_modules`, `.pnpm-store`, `.venv`, `venv`, `.tox`, `__pycache__`.

### Full Reindex Triggers (`manager-sync-ops.ts:839-916`)

- `force: true`
- No meta record (first run)
- Embedding model or provider changed
- Provider key changed
- Chunk token or overlap settings changed
- Vector extension now available but dims not recorded

### Atomic Reindex (`manager-sync-ops.ts:987-1093`)

```
1. Open temp SQLite DB at {path}.tmp-{uuid}
2. Seed embedding cache from old DB (avoid re-embedding)
3. Index all files into temp DB
4. Close both databases
5. Atomic swap: backup → old, temp → main, delete backup
6. On failure: restore from backup
```

### Deletion

Stale files (in DB but no longer on disk) removed during sync (`manager-sync-ops.ts:681-703`): deletes from vector table, chunks, FTS, and files tables.

No expiry mechanism in builtin system. LanceDB has explicit deletion via `memory_forget` tool.

---

## Embedding Pipeline

### Provider Resolution (`src/memory/embeddings.ts:138-244`)

Priority when `provider = "auto"`:
1. Local model (if file present on disk)
2. OpenAI
3. Gemini
4. Voyage

All fail → FTS-only mode.

Default models:
| Provider | Model |
|----------|-------|
| OpenAI | `text-embedding-3-small` |
| Gemini | `gemini-embedding-001` |
| Voyage | `voyage-4-large` |
| Local | `embeddinggemma-300m-qat-Q8_0.gguf` |

### Batch Embedding (`MemoryManagerEmbeddingOps`)

Batch limit: `EMBEDDING_BATCH_MAX_TOKENS = 8000` (`manager-embedding-ops.ts:27`).

Three async batch APIs: OpenAI (`batch-openai.ts`), Gemini (`batch-gemini.ts`), Voyage (`batch-voyage.ts`).

Batch failure limit: 2, then fallback to synchronous.

Rate limit retry: max 3 attempts, exponential backoff 500ms-8000ms, 20% jitter.

Timeouts: 60s remote / 5min local (query), 2min remote / 10min local (batch).

### Embedding Cache

`embedding_cache` table keyed by `(provider, model, provider_key, hash)`. Provider key is hash of connection details (base URL, custom headers — excluding auth) for cache invalidation on endpoint change.

LRU eviction when `maxEntries` set.

### Vector Normalization

All embeddings normalized to unit vectors on ingestion (`embeddings.ts:11-18`).

Stored in two places: `chunks.embedding` as JSON (fallback), `chunks_vec.embedding` as Float32Array blob (sqlite-vec ANN).

---

## QMD Backend (External Process)

`src/memory/backend-config.ts` selects between `"builtin"` and `"qmd"` backends.

`QmdMemoryManager` (`qmd-manager.ts:74`) implements `MemorySearchManager` by spawning an external `qmd` CLI process. `FallbackMemoryManager` (`search-manager.ts:75`) wraps QMD: on any search failure it transparently switches to builtin.

Search modes: `"search"` (default, faster), `"vsearch"`, `"query"` (slowest, best recall).

QMD limits: maxResults 6, maxSnippetChars 700, maxInjectedChars 4000, timeoutMs 4000.

---

## Data Flow — Indexing

```
Memory file (MEMORY.md / memory/*.md)
          │
          ▼
  buildFileEntry()                    internal.ts:152
  (hash, mtime, size)
          │
          ▼
  chunkMarkdown(content, chunking)    internal.ts:184
  → MemoryChunk[] (startLine, endLine, text, hash)
          │
          ▼
  enforceEmbeddingMaxInputTokens()    embedding-chunk-limits.ts
          │
          ▼
  embedChunksInBatches()              manager-embedding-ops.ts:177
  ├── loadEmbeddingCache(hashes)      → cache hit → skip
  └── embedBatchWithRetry(texts)      → EmbeddingProvider.embedBatch()
      ├── OpenAI /embeddings
      ├── Gemini embed API
      ├── Voyage embed API
      └── node-llama-cpp local
          │
          ▼
  upsertEmbeddingCache()              → embedding_cache table
          │
          ▼
  INSERT INTO chunks, chunks_vec, chunks_fts, files
```

## Data Flow — Search

```
Agent calls memory_search(query)
          │
          ▼
  manager.search(query, opts)         manager.ts:204
          │
    ┌─────┴──────┐
    │            │
  embed query   searchKeyword(query)   FTS5 BM25
  embedQueryWithTimeout()             manager-search.ts:136
    │            │
    ▼            ▼
  searchVector(queryVec)              manager-search.ts:20
  vec_distance_cosine() via sqlite-vec
    │            │
    └─────┬──────┘
          ▼
  mergeHybridResults()                hybrid.ts:51
  (vectorWeight=0.7, textWeight=0.3)
          │
          ▼
  applyTemporalDecay() (opt-in)      temporal-decay.ts:121
          │
          ▼
  applyMMR() (opt-in)                mmr.ts:189
          │
          ▼
  filter ≥ minScore (0.35), slice to maxResults (6)
          │
          ▼
  decorateCitations() (if direct chat)
          │
          ▼
  MemorySearchResult[]
```

## Data Flow — LanceDB Lifecycle

```
User message arrives
          │
          ▼
  api.on("before_agent_start")         index.ts:539
  embeddings.embed(event.prompt)
          │
          ▼
  db.search(vector, 3, minScore=0.3)
  → <relevant-memories>...</relevant-memories>
  → return { prependContext: "..." }

          ... conversation runs ...

          ▼
  api.on("agent_end")                  index.ts:567
  extract user messages, filter by MEMORY_TRIGGERS
  for each capturable text:
    embeddings.embed(text)
    db.search(vector, 1, 0.95)  ← duplicate check
    if not duplicate: db.store({ text, vector, importance:0.7, category })
```

## Data Flow — Manager Instantiation

```
getMemorySearchManager({ cfg, agentId })    search-manager.ts:19
          │
          ▼ resolve backend config
  backend = "builtin" or "qmd"
          │
  if "qmd": QmdMemoryManager → FallbackMemoryManager(qmd, builtin)
  if "builtin":
          │
          ▼
  MemoryIndexManager.get({ cfg, agentId })  manager.ts:101
  cacheKey = agentId:workspaceDir:settingsJson
  INDEX_CACHE.get(cacheKey) → return existing (or create new)
          │
          ▼
  new MemoryIndexManager(...)               manager.ts:139
  ├── openDatabase()  → SQLite
  ├── ensureSchema()  → create tables
  ├── ensureWatcher() → chokidar
  ├── ensureSessionListener() → transcript events
  └── ensureIntervalSync()
```

---

## Configuration Defaults

`src/agents/memory-search.ts`:

| Setting | Default |
|---|---|
| `provider` | `"auto"` |
| `fallback` | `"none"` |
| `chunking.tokens` | 400 |
| `chunking.overlap` | 80 |
| `query.maxResults` | 6 |
| `query.minScore` | 0.35 |
| `hybrid.enabled` | `true` |
| `hybrid.vectorWeight` | 0.7 |
| `hybrid.textWeight` | 0.3 |
| `hybrid.candidateMultiplier` | 4 |
| `mmr.enabled` | `false` |
| `mmr.lambda` | 0.7 |
| `temporalDecay.enabled` | `false` |
| `temporalDecay.halfLifeDays` | 30 |
| `cache.enabled` | `true` |
| `sync.watch` | `true` |
| `sync.watchDebounceMs` | 1500 |
| `sync.onSessionStart` | `true` |
| `sync.onSearch` | `true` |
| `sources` | `["memory"]` |
| `store.vector.enabled` | `true` |
