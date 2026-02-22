# 09 — Cron / Scheduling System

## Summary

The cron system is a **file-backed, single-timer scheduler** using a `jobs.json` store. There are no built-in platform jobs — all jobs are user/agent-registered. The gateway creates exactly one `CronService` instance per server run.

Three schedule kinds exist: `at` (one-shot absolute time), `every` (interval with anchor), and `cron` (cron expression via the `croner` library). The timer fires at most once per 60 seconds (`MAX_TIMER_DELAY_MS`) regardless of job schedule to prevent drift.

All mutations go through a **promise-chain lock** (`locked.ts`) that serializes operations per-store-path, preventing race conditions without an OS file lock.

Job execution splits into two paths: `main` (injects a `systemEvent` into the existing session + heartbeat wake) and `isolated` (spawns a complete agent turn in a dedicated session with its own model/provider/delivery resolution).

**Error backoff** follows a fixed schedule: 30s, 1min, 5min, 15min, 60min (caps). Jobs with `kind: "cron"` also enforce a 2-second minimum refire gap to prevent spin-loops.

Cron jobs are exposed as gateway protocol methods (`cron.add`, `cron.list`, etc.) and also as an **agent tool** (`createCronTool`) so AI models can self-schedule tasks.

---

## Directory Structure

```
src/cron/
├── types.ts                  — Core type definitions (CronJob, CronSchedule, CronPayload, etc.)
├── service.ts                — CronService class (public façade)
├── service/
│   ├── state.ts              — CronServiceState, CronServiceDeps types
│   ├── ops.ts                — start/stop/add/update/remove/run/wakeNow operations
│   ├── timer.ts              — armTimer, onTimer, executeJob, error backoff, session reaper
│   ├── jobs.ts               — computeJobNextRunAtMs, createJob, applyJobPatch, stagger logic
│   ├── store.ts              — ensureLoaded, persist, schema migration on load
│   ├── locked.ts             — Promise-chain lock per storePath
│   └── normalize.ts          — normalizeRequiredName, inferLegacyName, normalizePayloadToSystemText
├── schedule.ts               — computeNextRunAtMs (calls croner)
├── parse.ts                  — parseAbsoluteTimeMs (ISO-8601 + numeric epoch)
├── stagger.ts                — Top-of-hour stagger detection and offset computation
├── normalize.ts              — normalizeCronJobCreate, normalizeCronJobPatch (protocol input)
├── store.ts                  — loadCronStore, saveCronStore, DEFAULT_CRON_STORE_PATH
├── delivery.ts               — resolveCronDeliveryPlan
├── run-log.ts                — appendCronRunLog, readCronRunLogEntries (JSONL per job)
├── session-reaper.ts         — sweepCronRunSessions (prune expired isolated run sessions)
├── validate-timestamp.ts     — validateScheduleTimestamp (±1min past, ±10yr future)
├── webhook-url.ts            — normalizeHttpWebhookUrl
├── legacy-delivery.ts        — Migration helpers for old payload.deliver fields
├── payload-migration.ts      — Legacy payload schema migration
├── isolated-agent.ts         — Re-exports runCronIsolatedAgentTurn
└── isolated-agent/
    ├── run.ts                — runCronIsolatedAgentTurn (full agent execution for isolated jobs)
    ├── session.ts            — resolveCronSession (session lookup/create with freshness policy)
    ├── delivery-target.ts    — resolveDeliveryTarget
    ├── helpers.ts            — Payload picking utilities (summary, heartbeat-only, etc.)
    ├── skills-snapshot.ts    — Skill snapshot resolution for isolated runs
    └── subagent-followup.ts  — Wait for descendant subagent completions before delivery

src/gateway/
├── server-cron.ts            — buildGatewayCronService (wires CronService into gateway)
├── server-methods/cron.ts    — cronHandlers: protocol method handlers
└── protocol/schema/cron.ts   — TypeBox schemas for all cron protocol messages

src/config/
└── types.cron.ts             — CronConfig type (enabled, store, maxConcurrentRuns, etc.)

src/agents/tools/
└── cron-tool.ts              — createCronTool: agent-facing cron management tool
```

---

## Entry Points

- `src/cron/service.ts:7` — `CronService` class (public API)
- `src/gateway/server-cron.ts:68` — `buildGatewayCronService` (gateway integration)
- `src/gateway/server-methods/cron.ts:20` — `cronHandlers` (protocol RPC methods)
- `src/agents/tools/cron-tool.ts:207` — `createCronTool` (agent tool)

---

## CronService Public Façade

`service.ts:7-52` — thin wrapper holding private `CronServiceState`, delegating all operations to the `ops` module:

```
CronService
  ├── start()          → ops.start
  ├── stop()           → ops.stop
  ├── list(opts?)      → ops.list
  ├── add(input)       → ops.add
  ├── update(id,patch) → ops.update
  ├── remove(id)       → ops.remove
  ├── run(id,mode?)    → ops.run
  ├── getJob(id)       → direct store lookup
  └── wake(opts)       → ops.wakeNow
```

---

## Service State

`service/state.ts:86-108`:

```
CronServiceState
  ├── deps: CronServiceDepsInternal   — injected dependencies
  ├── store: CronStoreFile | null     — in-memory jobs
  ├── timer: NodeJS.Timeout | null    — single pending timer
  ├── running: boolean                — prevents concurrent timer ticks
  ├── op: Promise<unknown>            — lock chain tail
  ├── warnedDisabled: boolean
  ├── storeLoadedAtMs: number | null
  └── storeFileMtimeMs: number | null
```

---

## Startup Sequence

`service/ops.ts:30-62`:

```
start()
  │
  ├─► locked()
  │     ├── ensureLoaded()         — read jobs.json from disk
  │     ├── clear stale runningAtMs markers
  │     ├── runMissedJobs()        — jobs due during downtime
  │     ├── recomputeNextRuns()
  │     └── persist()
  │
  └─► armTimer()
```

The `skipJobIds` set prevents re-running jobs whose `runningAtMs` was cleared (they were in-flight when the server died) from getting re-executed as "missed" — `service/ops.ts:39-48`.

---

## Timer Management

### armTimer — `service/timer.ts:156-195`

Central scheduling function:

```
armTimer(state)
  ├── clearTimeout(state.timer)
  ├── if !cronEnabled → return
  ├── nextAt = min(nextRunAtMs) across all enabled jobs
  ├── delay = max(nextAt - now, 0)
  ├── clampedDelay = min(delay, 60_000)   ← MAX_TIMER_DELAY_MS
  └── state.timer = setTimeout(onTimer, clampedDelay)
```

Even with no imminent jobs, the scheduler wakes at least once per minute when jobs exist, to recover from clock jumps.

### onTimer — `service/timer.ts:197-399`

```
onTimer()
  │
  ├── if (state.running) → re-arm at MAX_TIMER_DELAY_MS, return
  │
  ├── state.running = true
  │
  ├─► locked()
  │     ├── forceReload store from disk
  │     ├── findDueJobs(): jobs where nextRunAtMs <= now
  │     │   if none: recomputeNextRunsForMaintenance(), persist, return []
  │     │   else: mark each job runningAtMs = now, persist
  │
  ├─► run due jobs concurrently (up to maxConcurrentRuns)
  │     └── each: executeJobCore() wrapped with jobTimeoutMs race
  │
  ├─► locked()
  │     ├── forceReload store
  │     ├── applyJobResult() for each completed job
  │     ├── recomputeNextRunsForMaintenance()
  │     └── persist()
  │
  ├── sweepCronRunSessions()   ← throttled to once per 5 min
  │
  └── finally: state.running = false, armTimer()
```

The double-`locked()` pattern — one to mark jobs running, one to apply results — ensures that concurrent jobs from the same tick don't corrupt each other's state.

---

## Schedule Computation

`schedule.ts:13-73` — three paths for `computeNextRunAtMs`:

| Kind | Logic | Source |
|------|-------|--------|
| `at` | Parses via `parseAbsoluteTimeMs`, returns timestamp only if future | `schedule.ts:14-31` |
| `every` | `anchor + ceil((now - anchor) / every) * every` | `schedule.ts:33-42` |
| `cron` | `new Cron(expr, { timezone }).nextRun(now)` via croner lib | `schedule.ts:44-72` |

---

## Stagger System

`stagger.ts`, `service/jobs.ts:30-64`

For `kind: "cron"` schedules on top-of-hour expressions (`0 * * * *`), a default 5-minute stagger window is applied automatically (`stagger.ts:3`).

Per-job offset is **deterministic** — derived from SHA-256 of the job ID:

```
resolveStableCronOffsetMs(jobId, staggerMs)
  └── SHA-256(jobId).readUInt32BE(0) % staggerMs
```

The stagger logic in `computeStaggeredCronNextRunAtMs` (`service/jobs.ts:38-64`) shifts the cursor back by the offset to avoid missing the current window, then adds the offset to the base next-run time.

---

## Job Execution Paths

### Main Path (`sessionTarget: "main"`)

Injects a system event into the existing session:

```
resolveJobPayloadTextForMain()
  └── enqueueSystemEvent(text)
        └── requestHeartbeatNow() or runHeartbeatOnce()
```

### Isolated Path (`sessionTarget: "isolated"`)

Spawns a complete agent turn — `isolated-agent/run.ts:152`:

```
runCronIsolatedAgentTurn()
  │
  ├── Agent resolution (run.ts:162-195)
  │     └── resolve agentId, merge per-agent config overrides
  │
  ├── Session management (run.ts:266-303, session.ts:11-70)
  │     └── resolveCronSession(): lookup/create "cron:<jobId>" session
  │         └── each run gets unique "cron:<jobId>:run:<uuid>" sub-key
  │
  ├── Model selection (run.ts:211-351)
  │     ├── 1. Per-job payload.model override
  │     ├── 2. Session modelOverride (/model command)
  │     ├── 3. Gmail hook model
  │     └── 4. Agent defaults / global defaults
  │
  ├── Prompt construction (run.ts:369-411)
  │     └── "[cron:<id> <name>] <message>" + timestamp line
  │
  ├── Agent execution (run.ts:450-497)
  │     └── runWithModelFallback → runEmbeddedPiAgent or runCliAgent
  │
  └── Delivery (run.ts:595-779)
        ├── deliverOutboundPayloads (for media/channel-data)
        ├── runSubagentAnnounceFlow (for plain text to chat channel)
        ├── skip for HEARTBEAT_OK token
        └── delivered=true if messaging-tool already sent to target
```

---

## Job Execution Data Flow

```
Timer fires
    │
    ▼
onTimer(state)
    │
    ├─► locked() ─► forceReload store
    │               findDueJobs(): jobs where nextRunAtMs <= now
    │               Mark job.state.runningAtMs = now
    │               persist()
    │
    ▼
runDueJob(job) ─► executeJobCore(state, job)
                        │
          ┌─────────────┴─────────────┐
          │ sessionTarget="main"      │ sessionTarget="isolated"
          │                           │
          ▼                           ▼
  resolveJobPayloadTextForMain()   runIsolatedAgentJob()
  enqueueSystemEvent(text)         │
  requestHeartbeatNow() or         │  ──► runCronIsolatedAgentTurn()
  runHeartbeatOnce()               │        ├── resolveCronSession()
                                   │        ├── runEmbeddedPiAgent() or runCliAgent()
                                   │        ├── resolveCronDeliveryPlan()
                                   │        └── deliverOutboundPayloads() or
                                   │            runSubagentAnnounceFlow()
                                   ▼
                              CronRunOutcome { status, summary, delivered, telemetry }
    │
    ▼
locked() ─► applyJobResult(state, job, result)
              ├── consecutiveErrors tracking
              ├── errorBackoffMs() → nextRunAtMs
              ├── MIN_REFIRE_GAP_MS enforcement (cron kind)
              └── deleteAfterRun logic
            emitJobFinished() → onEvent(evt)
              ├── broadcast("cron", evt)  ← WebSocket clients
              ├── HTTP webhook POST (if delivery.mode="webhook")
              └── appendCronRunLog()     ← JSONL run log
            recomputeNextRunsForMaintenance()
            persist()
    │
    ▼
sweepCronRunSessions()   ← self-throttled, every 5 min
armTimer()               ← re-schedule for next job
```

---

## Error Backoff

`service/timer.ts:53-64`, `service/timer.ts:118-135`

Fixed schedule for jobs returning `status: "error"`:

| Consecutive Error | Backoff |
|-------------------|---------|
| 1st | 30 seconds |
| 2nd | 1 minute |
| 3rd | 5 minutes |
| 4th | 15 minutes |
| 5th+ | 60 minutes (cap) |

The `consecutiveErrors` counter is stored in `job.state` and reset to 0 on success. Next run = `max(naturalNext, endedAt + backoffMs)`.

---

## Auto-disable Rules

`service/timer.ts:97-154`, `service/jobs.ts:149-178`

- **One-shot (`at`) jobs**: Always disabled after any terminal run. If `deleteAfterRun: true` and status is `"ok"`, the job is deleted from the store entirely.
- **Schedule errors**: After 3 consecutive schedule-computation failures, the job is auto-disabled (`service/jobs.ts:165-169`).
- **Stuck runs**: `runningAtMs` older than 2 hours is cleared on the next tick (`service/jobs.ts:204-213`). Stale values at startup are also cleared.

---

## Lock Mechanism

`service/locked.ts:1-22`

Module-level `Map<string, Promise<void>>` keyed by `storePath`:

```
locked(state, fn)
  ├── storeOp = storeLocks.get(storePath) ?? Promise.resolve()
  ├── next = Promise.all([state.op, storeOp]).then(fn)
  ├── state.op = next (swallowed)
  ├── storeLocks.set(storePath, next)
  └── return await next
```

Both per-instance (`state.op`) and cross-instance (module `storeLocks`) chains must complete before `fn` runs. Errors are swallowed in the chain tail via `resolveChain` to keep the lock alive.

---

## File Store

- Default path: `~/.openclaw/cron/jobs.json` (`store.ts:8-9`)
- Loaded as JSON5 (`store.ts:26`)
- Saved atomically: write to `.{pid}.{hex}.tmp` then `rename` to target (`store.ts:53-57`)
- Backup copy kept at `jobs.json.bak` (`store.ts:58-60`)
- On load, `ensureLoaded` runs a comprehensive migration pass for all legacy field formats

---

## Gateway Integration

### Startup — `server.impl.ts:423-428`, `541`

```
buildGatewayCronService({ cfg, deps, broadcast })
  ├── enqueueSystemEvent → session system-events queue
  ├── requestHeartbeatNow → triggers immediate heartbeat
  ├── runHeartbeatOnce → synchronous heartbeat for wakeMode: "now"
  ├── runIsolatedAgentJob → runCronIsolatedAgentTurn with per-agent config
  └── onEvent → broadcast to WS clients + webhook POST + run log
```

### Config-reload — `server.impl.ts:687-699`

Old `CronService` is stopped, new one is built and started with refreshed config.

### Protocol Methods — `server-methods/cron.ts:20-227`

| Method | Description |
|--------|-------------|
| `wake` | Inject system event + optional immediate heartbeat |
| `cron.list` | List enabled (or all) jobs |
| `cron.status` | Scheduler status + nextWakeAtMs |
| `cron.add` | Create job (normalizes + validates timestamp) |
| `cron.update` | Patch job |
| `cron.remove` | Delete job by id/jobId |
| `cron.run` | Manually trigger job (default mode: `"force"`) |
| `cron.runs` | Read JSONL run history for a job |

---

## Agent Tool

`cron-tool.ts:207` — `createCronTool` exposes cron management to AI models. Includes a flat-params fallback for non-frontier models that don't nest job fields inside `job:` (`cron-tool.ts:292-341`). Auto-infers delivery targets from the calling agent's session key (`cron-tool.ts:154-205`).

---

## Run Log and Session Reaper

**Run log** (`run-log.ts`): Each job gets a JSONL file at `{cronDir}/runs/{jobId}.jsonl`. Writes serialized per-path via `Map<string, Promise<void>>`. Files pruned to 2 MB / 2,000 lines via `pruneIfNeeded`.

**Session reaper** (`session-reaper.ts`): Runs inside `onTimer` after every job tick (throttled to once per 5 minutes). Prunes session-store entries matching `cron:<jobId>:run:<uuid>` older than the retention period (default 24 hours). The base `cron:<jobId>` session is preserved.

---

## Configuration

`config/types.cron.ts`:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Unless `OPENCLAW_SKIP_CRON=1` |
| `store` | `~/.openclaw/cron/jobs.json` | Path to jobs file |
| `maxConcurrentRuns` | `1` | Max simultaneous job executions |
| `webhook` | — | DEPRECATED: legacy global webhook URL |
| `webhookToken` | — | Bearer token for webhook POST |
| `sessionRetention` | `"24h"` | Retention for isolated run sessions |

---

## Key Types

| Type | Location | Purpose |
|------|----------|---------|
| `CronSchedule` | `types.ts:3-12` | Union of `at`, `every`, `cron` schedule variants |
| `CronJob` | `types.ts:100-117` | Full job record including state |
| `CronJobState` | `types.ts:85-98` | Runtime: nextRunAtMs, runningAtMs, consecutiveErrors |
| `CronPayload` | `types.ts:54-68` | Union of `systemEvent` and `agentTurn` payloads |
| `CronDelivery` | `types.ts:21-26` | Delivery config: `none`, `announce`, or `webhook` |
| `CronStoreFile` | `types.ts:119-122` | File format: `{ version: 1, jobs: CronJob[] }` |
| `CronServiceDeps` | `service/state.ts:34-80` | DI contract for CronService |
| `CronEvent` | `service/state.ts:13-25` | Lifecycle event emitted by onEvent |
| `CronRunLogEntry` | `run-log.ts:5-18` | JSONL record per job finish |

---

## Scheduling Precision and Bounds

| Constraint | Value | Source |
|------------|-------|--------|
| Max timer delay (clamp) | 60,000 ms | `timer.ts:16` |
| Default job timeout | 10 minutes | `timer.ts:32` |
| Min refire gap (cron kind) | 2,000 ms | `timer.ts:25` |
| Stuck run threshold | 2 hours | `jobs.ts:28` |
| Max schedule errors before disable | 3 | `jobs.ts:150` |
| Session reaper minimum interval | 5 minutes | `session-reaper.ts:18` |
| Default session retention | 24 hours | `session-reaper.ts:15` |
| Webhook POST timeout | 10,000 ms | `server-cron.ts:31` |
| Timestamp validation: past grace | 1 minute | `validate-timestamp.ts:4` |
| Timestamp validation: max future | 10 years | `validate-timestamp.ts:5` |
