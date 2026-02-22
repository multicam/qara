# NanoClaw Components Reference

Detailed breakdown of every component, what it does, and where to find it.

## Host Process Components

### 1. Orchestrator — `src/index.ts`

The main entry point. Coordinates everything.

| Function | Line | Purpose |
|----------|------|---------|
| `main()` | 412 | Startup sequence: Docker check → DB init → WhatsApp connect → start loops |
| `startMessageLoop()` | 298 | Polls SQLite every 2s for new messages, checks triggers, dispatches to GroupQueue |
| `processGroupMessages()` | 121 | Formats messages for a group and sends to container |
| `runAgent()` | 219 | Prepares snapshots and spawns container via container-runner |
| `recoverPendingMessages()` | 393 | Re-enqueues groups with unprocessed messages after crash |

**Startup sequence:**
1. `ensureContainerSystemRunning()` — verify Docker, kill orphan containers
2. `initDatabase()` — open SQLite, run migrations
3. `loadState()` — restore cursors, sessions, registered groups
4. `whatsapp.connect()` — wait for `connection.open`
5. Start 3 concurrent loops: scheduler, IPC watcher, message loop
6. `recoverPendingMessages()` — handle crash recovery

### 2. WhatsApp Channel — `src/channels/whatsapp.ts`

Baileys-based WhatsApp Web connection.

**Inbound** (line 147-201):
- Listens for `messages.upsert` events
- Translates LID JIDs to phone JIDs (WhatsApp format migration)
- Stores metadata for all chats (discovery)
- Stores full message content only for registered groups

**Outbound** (line 209-211):
- Sends messages, prefixed with assistant name if on shared number
- Handles media, reactions, etc.

### 3. SQLite Database — `src/db.ts`

Six tables in `store/messages.db`:

| Table | Purpose |
|-------|---------|
| `chats` | JID, name, last activity — all chats (registered or not) |
| `messages` | Full message content — registered groups only |
| `scheduled_tasks` | Task definitions (cron/interval/once, prompt, status, next_run) |
| `task_run_logs` | Execution history per task |
| `router_state` | Key-value store for cursors |
| `sessions` | group_folder → session_id mapping for SDK continuity |
| `registered_groups` | JID → folder/name/trigger config |

**Key functions:**
- `storeMessage()` (line 239) — insert incoming message
- `getNewMessages()` (line 281) — poll for unprocessed messages since cursor
- `initDatabase()` (line 120) — schema creation and migrations

### 4. Message Router — `src/router.ts`

Formats messages for outbound delivery. Routes responses to the correct channel.

### 5. Config — `src/config.ts`

All tunable parameters:

| Constant | Default | Source |
|----------|---------|--------|
| `ASSISTANT_NAME` | `'Andy'` | `.env` |
| `POLL_INTERVAL` | 2000ms | hardcoded |
| `SCHEDULER_POLL_INTERVAL` | 60000ms | hardcoded |
| `IPC_POLL_INTERVAL` | 1000ms | hardcoded |
| `IDLE_TIMEOUT` | 30min | env |
| `CONTAINER_TIMEOUT` | 30min | env |
| `CONTAINER_MAX_OUTPUT_SIZE` | 10MB | env |
| `MAX_CONCURRENT_CONTAINERS` | 5 | env |
| `CONTAINER_IMAGE` | `'nanoclaw-agent:latest'` | env |
| `TRIGGER_PATTERN` | `/^@Andy\b/i` | derived |
| `MAIN_GROUP_FOLDER` | `'main'` | hardcoded |

### 6. GroupQueue — `src/group-queue.ts`

Concurrency control for container spawning.

- Enforces `MAX_CONCURRENT_CONTAINERS` (5) globally
- Per-group state: active flag, pending messages/tasks, process handle, retry count
- Exponential backoff: base 5s, doubles per retry, max 5 retries
- Tasks prioritized over messages when draining
- `sendMessage()` (line 149) — pipes follow-up messages to running container via IPC input files

### 7. Container Runner — `src/container-runner.ts`

Spawns and manages Docker containers.

**`runContainerAgent()`** (line 214):
1. `buildVolumeMounts()` — compute all bind mounts per group
2. Spawn Docker with `stdio: ['pipe', 'pipe', 'pipe']`
3. Write `ContainerInput` JSON to stdin
4. Parse stdout for sentinel-wrapped results: `---NANOCLAW_OUTPUT_START---` / `---NANOCLAW_OUTPUT_END---`
5. Forward each parsed result immediately to WhatsApp
6. Hard timeout with idle detection

### 8. IPC Watcher — `src/ipc.ts`

Polls `data/ipc/` every 1s for JSON files written by containers.

**Two subdirectories per group:**
- `messages/` — `{type: "message", chatJid, text}` → forwarded to WhatsApp
- `tasks/` — task operations: schedule, pause, resume, cancel, refresh_groups, register_group

**Authorization** (line 76-89): Non-main groups can only send to their own chat JID. Main group can send to any JID.

### 9. Task Scheduler — `src/task-scheduler.ts`

Polls every 60s for due tasks.

```sql
SELECT * FROM scheduled_tasks
WHERE status = 'active' AND next_run IS NOT NULL AND next_run <= ?
ORDER BY next_run
```

- Enqueues due tasks via GroupQueue
- Spawns containers with `isScheduledTask: true`
- Computes next run from cron/interval expressions after completion
- Two context modes: `'group'` (shared session) or `'isolated'` (fresh each run)

---

## Container Components

### 10. Agent Runner — `container/agent-runner/src/index.ts`

Entry point inside the Docker container.

**`main()`** (line 492):
1. Read `ContainerInput` from stdin
2. Extract secrets into `sdkEnv` (never set on `process.env`)
3. Run query loop: call `runQuery()`, wait for next IPC input or `_close` sentinel
4. Resume same session for follow-up messages

**`runQuery()`** (line 356):
- Calls Claude Agent SDK `query()` with `MessageStream`
- Polls `/workspace/ipc/input/*.json` at 500ms for follow-up messages
- Pushes them into MessageStream for multi-turn without restart

**SDK Configuration:**
- `cwd: '/workspace/group'`
- `resume: sessionId` (conversation continuity)
- `permissionMode: 'bypassPermissions'`
- MCP server: `nanoclaw` (the IPC bridge)
- Tools: Bash, file tools, web tools, Task/TeamCreate, `mcp__nanoclaw__*`

**SDK Hooks:**
- `PreCompact` — archives full transcript to `conversations/` before compaction
- `PreToolUse` on Bash — prepends `unset ANTHROPIC_API_KEY CLAUDE_CODE_OAUTH_TOKEN`

### 11. MCP Server (IPC Bridge) — `container/agent-runner/src/ipc-mcp-stdio.ts`

Gives Claude tools that write JSON files to the IPC directory.

**Tools provided:**
- `send_message` → writes to `/workspace/ipc/messages/`
- `schedule_task` → writes to `/workspace/ipc/tasks/`
- `register_group` → writes to `/workspace/ipc/tasks/`
- `refresh_groups` → writes to `/workspace/ipc/tasks/`

**Atomic write pattern:**
```typescript
const tempPath = `${filepath}.tmp`;
fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
fs.renameSync(tempPath, filepath);  // atomic on Linux/macOS
```

---

## Directory Structure

```
nanoclaw/
├── src/                        # Host process source
│   ├── index.ts                # Orchestrator
│   ├── channels/
│   │   └── whatsapp.ts         # WhatsApp connection
│   ├── config.ts               # All configuration
│   ├── container-runner.ts     # Docker spawning
│   ├── container-runtime.ts    # Docker health/cleanup
│   ├── group-queue.ts          # Concurrency control
│   ├── ipc.ts                  # IPC watcher
│   ├── router.ts               # Message routing
│   ├── task-scheduler.ts       # Cron/interval tasks
│   ├── db.ts                   # SQLite operations
│   └── types.ts                # Shared types
├── container/
│   ├── Dockerfile              # Agent container image
│   ├── build.sh                # Build script
│   └── agent-runner/
│       └── src/
│           ├── index.ts        # Agent entry point
│           └── ipc-mcp-stdio.ts # MCP server (IPC bridge)
├── groups/
│   ├── main/                   # Main group (admin)
│   │   └── CLAUDE.md           # Persona + capabilities
│   ├── global/                 # Shared across all groups (read-only)
│   │   └── CLAUDE.md
│   └── {name}/                 # Per-group directories
│       └── CLAUDE.md
├── data/
│   ├── ipc/{name}/             # Per-group IPC directories
│   │   ├── input/              # Host → container messages
│   │   ├── messages/           # Container → host messages
│   │   └── tasks/              # Container → host task ops
│   └── sessions/{name}/        # Per-group .claude/ sessions
├── store/
│   └── messages.db             # SQLite database
└── .env                        # Secrets (never committed)
```
