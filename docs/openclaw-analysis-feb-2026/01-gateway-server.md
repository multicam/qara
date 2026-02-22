# Gateway Server Architecture

## Overview

The gateway is a **WebSocket + HTTP control plane** that sits between clients/channels and the AI agent runtime. Everything flows through it — messages, config, auth, hooks, health.

---

## Directory Structure

```
src/gateway/
├── server.ts                  — Public re-export entry point
├── server.impl.ts             — startGatewayServer() — full orchestration
├── server-startup.ts          — startGatewaySidecars() — post-HTTP subsystems
├── server-runtime-state.ts    — HTTP/WS server construction + shared state init
├── server-ws-runtime.ts       — attachGatewayWsHandlers() — WS wiring shim
├── server/
│   ├── ws-connection.ts       — Per-connection lifecycle handler
│   ├── ws-connection/
│   │   ├── message-handler.ts — Handshake + post-handshake message routing
│   │   └── auth-messages.ts   — Auth failure message formatting
│   ├── health-state.ts        — Presence/health versioning + snapshot cache
│   ├── hooks.ts               — HTTP hook endpoint dispatch
│   ├── plugins-http.ts        — HTTP plugin endpoint dispatch
│   ├── presence-events.ts     — Presence snapshot broadcast
│   ├── http-listen.ts         — HTTP server listen helper
│   ├── tls.ts                 — TLS runtime loader
│   ├── close-reason.ts        — WS close reason truncation
│   └── ws-types.ts            — GatewayWsClient type
├── server-methods.ts          — handleGatewayRequest() + coreGatewayHandlers registry
├── server-methods-list.ts     — Method + event name lists
├── server-methods/            — One file per method domain (chat, config, nodes, ...)
│   │                            Domains include: push, voicewake, web, wizard, usage, browser
│   │                            (in addition to existing chat, config, nodes, sessions, ...)
├── method-scopes.ts           — RBAC scope definitions + authorization logic
├── auth.ts                    — authorizeGatewayConnect() — multi-mode auth
├── auth-rate-limit.ts         — IP-based rate limiter
├── control-plane-rate-limit.ts — Extracted control-plane write-method rate limiter
├── exec-approval-manager.ts   — Centralized exec approval lifecycle manager
├── server-lanes.ts            — Session/global lane management (extracted)
├── server-mobile-nodes.ts     — Mobile node connection handling
├── hooks.ts                   — Hook config resolution + payload normalization
├── server-channels.ts         — createChannelManager() — channel lifecycle
├── server-chat.ts             — createAgentEventHandler() — chat event pipeline
├── server-broadcast.ts        — createGatewayBroadcaster() — fan-out to WS clients
├── server-maintenance.ts      — Tick/health/dedupe maintenance timers
├── server-constants.ts        — Protocol limits and intervals
├── config-reload.ts           — chokidar watcher + reload plan engine
├── server-reload-handlers.ts  — Hot-reload action execution
├── server-runtime-config.ts   — Resolve bind/auth/TLS/hooks config at start
├── protocol/                  — Schema, validators, error codes, frame types
└── (other: cron, discovery, tailscale, node-registry, plugins, ...)
```

---

## Additional HTTP Endpoints

Beyond the WebSocket upgrade handler and plugin HTTP routes, the gateway exposes two compatibility HTTP endpoints:

| File | Path | Description |
|---|---|---|
| `server-methods/openai-http.ts` | `POST /v1/chat/completions` | OpenAI-compatible chat completions with SSE streaming. Allows any OpenAI client to talk to OpenClaw directly. |
| `server-methods/openresponses-http.ts` | `POST /v1/responses` | OpenResponses-compatible endpoint, enabling tools that speak the newer `/v1/responses` API format. |

Both endpoints authenticate via the standard gateway token and stream responses using Server-Sent Events (SSE).

---

## Server Boot Sequence

```
startGatewayServer(port, opts)          <- server.impl.ts
|
+- Phase 1: Config & Migration
|   Read config snapshot -> migrate legacy -> validate
|
+- Phase 2: Auth Bootstrap
|   Ensure token exists -> start diagnostics heartbeat
|
+- Phase 3: Method & Plugin Loading
|   Core methods + plugin methods + channel methods -> deduplicated set
|
+- Phase 4: Runtime Config
|   Resolve bind host, auth mode, TLS, hooks, OpenAI endpoints
|
+- Phase 5: HTTP/WS Server Construction
|   For each bind host:
|     create HTTP server -> listen -> attach WS upgrade handler
|   Create WebSocketServer (noServer mode, 25 MB max payload)
|   Init shared state: clients Set, broadcast fns, run state, dedupers
|
+- Phase 6: Subsystem Wiring
|   NodeRegistry, ChannelManager, Discovery (mDNS)
|   Maintenance timers, agent event handler, heartbeat listener
|
+- Phase 7: WS Handler Attachment
|   Wire per-connection lifecycle + message handler
|
+- Phase 8: Sidecars
|   Clean stale locks -> browser control -> Gmail watcher
|   Internal hooks -> channels -> plugin services -> memory backend
|
+- Phase 9: Config Reloader + Close Handler
    chokidar watcher -> diff-driven reload -> orderly shutdown fn
```

### Phase Details

**Phase 1 — Config validation and migration** (`server.impl.ts:186-234`)
- Reads config file snapshot via `readConfigFileSnapshot()`.
- If `legacyIssues` are detected, calls `migrateLegacyConfig()` and writes back.
- Validates config; throws if invalid (instructs user to run `openclaw doctor`).
- Calls `applyPluginAutoEnable()` to auto-enable plugins detected from env vars.

**Phase 2 — Auth bootstrap and diagnostics** (`server.impl.ts:236-260`)
- Calls `ensureGatewayStartupAuth()` to generate/persist a token if none is configured.
- Starts diagnostic heartbeat if `isDiagnosticsEnabled(cfg)`.
- Sets SIGUSR1 restart policy and pre-restart deferral check (waits for active queues to drain).

**Phase 3 — Plugin and method loading** (`server.impl.ts:267-285`)
- Calls `listGatewayMethods()` to build the base method name list from `server-methods-list.ts`.
- Calls `loadGatewayPlugins()` to let plugins contribute extra handlers and methods.
- Collects channel plugin method contributions via `listChannelPlugins().flatMap(p => p.gatewayMethods)`.
- Final `gatewayMethods` is a deduplicated union of all three sets.

**Phase 4 — Runtime config resolution** (`server.impl.ts:287-310`)
- Calls `resolveGatewayRuntimeConfig()` to resolve bind host, auth mode, TLS, hooks, control UI, OpenAI/OpenResponses endpoints.
- Creates `AuthRateLimiter` only when `cfg.gateway.auth.rateLimit` is set.

**Phase 5 — HTTP/WS server construction** (`server.impl.ts:360-401`)
- Calls `createGatewayRuntimeState()` (`server-runtime-state.ts:34`), which:
  - Creates canvas host handler (if enabled).
  - Resolves bind hosts (can be multiple for loopback aliases).
  - For each host: creates HTTP server via `createGatewayHttpServer()`, listens, pushes to array.
  - Creates a `WebSocketServer` in `noServer` mode with `maxPayload: MAX_PAYLOAD_BYTES` (25 MB).
  - Attaches WS upgrade handler to each HTTP server.
  - Initializes all shared mutable state: `clients` Set, `broadcast`/`broadcastToConnIds` functions, `chatRunState`, `agentRunSeq`, `dedupe`, `chatAbortControllers`, `toolEventRecipients`.

**Phase 6 — Subsystem wiring** (`server.impl.ts:402-530`)
- Creates `NodeRegistry`, `NodeSubscriptionManager`, channel manager.
- Starts `GatewayDiscovery` (mDNS/Bonjour, wide-area).
- Registers skills change listener with 30-second debounce.
- Starts maintenance timers (tick every 30 s, health refresh every 60 s, dedupe cleanup every 60 s).
- Calls `onAgentEvent(createAgentEventHandler(...))` to wire agent events into the chat broadcast pipeline.
- Calls `onHeartbeatEvent(evt => broadcast("heartbeat", evt))`.

**Phase 7 — WS handler attachment** (`server.impl.ts:566-625`)
- Calls `attachGatewayWsHandlers()` -> `attachGatewayWsConnectionHandler()`, passing all context and the frozen `GatewayRequestContext`.

**Phase 8 — Sidecars** (`server.impl.ts:656-679`)
- Calls `startGatewaySidecars()` (`server-startup.ts:32`):
  - Cleans stale session lock files.
  - Starts browser control server.
  - Starts Gmail watcher if configured.
  - Loads internal hooks via `loadInternalHooks()`.
  - Starts channels via `startChannels()`.
  - Fires `gateway:startup` internal hook (250 ms delayed).
  - Starts plugin services.
  - Starts memory backend.
  - Checks restart sentinel.
- Runs `gateway_start` plugin hook (fire-and-forget).

**Phase 9 — Config reloader + close handler** (`server.impl.ts:681-747`)
- Creates `startGatewayConfigReloader()` with chokidar watcher on `CONFIG_PATH`.
- Builds `close()` via `createGatewayCloseHandler()` which orchestrates orderly shutdown of all subsystems.
- Returns `{ close }` as the `GatewayServer` handle.

---

## WebSocket Handshake Protocol

```
Client                              Server
  |                                    |
  |<------ connect.challenge ----------|  nonce + timestamp
  |                                    |
  |--- { method:"connect", params } -->|
  |     . protocol version range       |
  |     . role (operator | node)       |
  |     . device identity + signature  |
  |     . auth token/password          |
  |                                    |
  |   Server verifies:                 |
  |   +- protocol version in range     |
  |   +- device.id matches publicKey   |
  |   +- signedAt within +/-10 min     |
  |   +- nonce matches challenge       |
  |   +- signature valid               |
  |   +- auth (token/password/proxy)   |
  |   +- device pairing check          |
  |                                    |
  |<-------- hello-ok -----------------|  protocol, features,
  |          snapshot, policy           |  methods, events,
  |                                    |  deviceToken, maxPayload
  |                                    |
  |--- { type:"req", method, params }->|  normal RPC from here
  |<-- { type:"res", ok, payload } ----|
  |<-- { type:"event", event, seq } ---|  server-push events
```

### Connection Lifecycle (`server/ws-connection.ts:58-303`)

On every new WS connection `wss.on("connection")`:
1. `connId = randomUUID()` assigned.
2. Server immediately sends `connect.challenge` with a random `nonce` and timestamp.
3. A `handshakeTimer` of `10 000 ms` closes the socket if `connect` is not received.
4. Delegates all message handling to `attachGatewayWsMessageHandler()`.
5. On socket close: removes from `clients` Set, updates presence, unregisters node from registry.

### Handshake (`server/ws-connection/message-handler.ts:179-952`)

First message must be `{ type:"req", method:"connect", params: ConnectParams }`:
1. Protocol version negotiation: server supports exactly `PROTOCOL_VERSION`; rejects if client's `[minProtocol, maxProtocol]` does not contain it.
2. Role validation: only `"operator"` or `"node"` accepted.
3. Browser origin check for Control UI and webchat clients.
4. Device identity validation:
   - `device.id` must match `deriveDeviceIdFromPublicKey(device.publicKey)`.
   - `device.signedAt` must be within +/-10 minutes.
   - `device.nonce` must match the `connectNonce` sent in step 2 (required for non-local connections).
   - Signature over a deterministic payload is verified with `verifyDeviceSignature()`.
5. Auth check via `authorizeGatewayConnect()`.
6. Device pairing check: if paired device exists, verifies role/scope haven't been upgraded; if not paired or upgrade detected, calls `requestDevicePairing()`.
7. Success: server sends `hello-ok` frame containing `{ protocol, server, features: { methods, events }, snapshot, canvasHostUrl, auth: { deviceToken }, policy: { maxPayload, tickIntervalMs } }`.
8. `setClient(nextClient)` adds client to `clients` Set; subsequent messages route to `handleGatewayRequest()`.

### Post-handshake messages (`message-handler.ts:955-1000`)

All subsequent messages must be `{ type:"req", id, method, params }`. The `respond` closure sends `{ type:"res", id, ok, payload, error }`. Handler dispatch is async but fire-and-forget with error catching.

---

## RPC Method Dispatch

```
Incoming request { method, params }
         |
         v
+------------------------+
| authorizeGatewayMethod |  <- checks role + scope
+-----------+------------+
            | authorized?
            v
+---------------------------+
| Rate limit check          |  <- 3/60s for write methods
| (config.apply/patch,      |     (config.apply, config.patch,
|  update.run)              |      update.run)
+----------+----------------+
           |
           v
  extraHandlers[method]           plugin-contributed handlers
  ?? coreGatewayHandlers[method]  built-in handlers
           |
           v
  handler({ req, params, client, respond, context })
```

### Method Registry (`server-methods.ts:69-96`)

`coreGatewayHandlers` is a flat object spread from ~25 domain handler sets:

```typescript
export const coreGatewayHandlers: GatewayRequestHandlers = {
  ...connectHandlers,   // connect
  ...chatHandlers,      // chat.send, chat.abort, chat.history
  ...nodeHandlers,      // node.invoke, node.list, ...
  ...configHandlers,    // config.get, config.set, config.apply, config.patch
  // ... ~20 more
};
```

Each handler file exports `{ methodName: async (opts) => void }`. The handler receives `{ req, params, client, isWebchatConnect, respond, context }` (`server-methods/types.ts:97-104`).

### Additional RPC Methods (delta additions)

The following method names have been added to `server-methods-list.ts` and their respective domain handler files:

| Domain | New Methods |
|---|---|
| `sessions` | `sessions.preview`, `sessions.patch`, `sessions.compact` |
| `agents` | `agents.create`, `agents.update`, `agents.delete`, `agents.files.*` |
| `tts` | `tts.*` (text-to-speech control) |
| `voicewake` | `voicewake.*` (wake-word configuration and status) |
| `usage` | `usage.*` (usage statistics and quotas) |
| `browser` | `browser.request` |
| `chat` | `chat.history` (previously noted; now formally in domain split) |

### Dispatch (`server-methods.ts:98-150`)

`handleGatewayRequest()`:
1. Calls `authorizeGatewayMethod(method, client)` — returns an `ErrorShape` if unauthorized.
2. Checks `CONTROL_PLANE_WRITE_METHODS` (`config.apply`, `config.patch`, `update.run`) against a rate limiter (3/60 s per actor).
3. Looks up handler: `opts.extraHandlers?.[req.method] ?? coreGatewayHandlers[req.method]`.
4. If not found, responds with `unknown method` error.
5. Calls `await handler({...})`.

### Authorization (`server-methods.ts:38-67`)

- `health` is always allowed regardless of role.
- Node-role methods (`node.invoke.result`, `node.event`, `skills.bins`) are only allowed when `role === "node"`.
- Operator role is checked, then `authorizeOperatorScopesForMethod()` verifies scope.
- `ADMIN_SCOPE` is a pass-all for operators.

### RBAC Scopes (`method-scopes.ts`)

Five scopes, each with an explicit method list:

| Scope | Grants |
|---|---|
| `operator.read` | health, logs, sessions/models/skills list, config.get |
| `operator.write` | send, chat.send, agent, node.invoke — implies read |
| `operator.admin` | config.*, channels.logout, sessions.delete — implies all |
| `operator.approvals` | exec.approval.* |
| `operator.pairing` | node.pair.*, device.pair.*, device.token.* |

Read methods also pass with `WRITE_SCOPE` (write implies read). Admin scope passes all (`method-scopes.ts:177-192`).

---

## Authentication & Authorization

### Auth Modes (`auth.ts`)

| Mode | How it works |
|---|---|
| `token` | Bearer token via `safeEqualSecret()` |
| `password` | Password via `safeEqualSecret()` |
| `trusted-proxy` | Check remoteAddr in trustedProxies, extract identity from userHeader |
| `none` | No auth (local dev) |

Mode is resolved by priority (`auth.ts:220-237`):
1. `authOverride.mode` (programmatic override)
2. `cfg.gateway.auth.mode` (config)
3. Inferred from `password` presence -> `"password"`
4. Inferred from `token` presence -> `"token"`
5. Default -> `"token"`

### `authorizeGatewayConnect()` (`auth.ts:322-429`)

```
trusted-proxy mode -> authorizeTrustedProxy()
  -> checks remote IP in trustedProxies list
  -> reads userHeader value

none mode -> ok immediately

token/password mode:
  -> rate limit check (per IP per scope)
  -> allowTailscale? -> resolveVerifiedTailscaleUser() (whois lookup)
  -> token compare via safeEqualSecret()
  -> password compare via safeEqualSecret()
```

Device token auth is an additional path in the message handler (`message-handler.ts:593-621`): if standard auth failed but the client provided `auth.token` + a `device` identity, it falls through to `verifyDeviceToken()`.

### Trusted-proxy flow (`auth.ts:283-320`)

- `remoteAddr` must be in configured `trustedProxies` list.
- All `requiredHeaders` must be present and non-empty.
- `userHeader` is extracted as the user identity.
- Optional `allowUsers` allowlist is checked.

Rate limiting is per-IP per-scope via `AuthRateLimiter`.

---

## Chat Message Flow

```
User sends "summarize my emails" via Telegram
                |
                v
        Channel plugin receives
                |
                v
        Gateway routes to agent session
                |
                v
  +-------------------------------+
  | Agent runtime emits           |
  | AgentEventPayload stream:     |
  |   lifecycle.start             |
  |   stream.assistant (text)     |
  |   tool.call / tool.result     |
  |   lifecycle.end               |
  +--------------+----------------+
                 |
                 v
  createAgentEventHandler()
  +----------------------------------------+
  | . Resolve clientRunId & sessionKey     |
  | . Sequence gap detection               |
  | . Tool events -> targeted broadcast    |
  |   (only to registered connIds)         |
  | . Text events -> throttled delta       |
  |   (buffer + flush every 150ms)         |
  | . lifecycle.end -> final broadcast     |
  | . Forward to channel via               |
  |   nodeSendToSession()                  |
  +----------------------------------------+
```

### State structures

- `ChatRunState`: holds `registry` (queue of `{sessionKey, clientRunId}` per agent runId), `buffers` (accumulated text per clientRunId), `deltaSentAt` (throttle timestamps), `abortedRuns`.
- `ToolEventRecipientRegistry`: maps `runId -> Set<connId>` for targeted tool-event delivery (10 min TTL, 30 s grace after finalization).

### Event handler (`server-chat.ts:221-432`)

`createAgentEventHandler()` returns a function subscribed to `AgentEventPayload` events:

```
AgentEventPayload arrives:
  -> Resolve clientRunId (from chatRunRegistry or evt.runId)
  -> Resolve sessionKey (from registry, event, or resolveSessionKeyForRun())
  -> Sequence check: if evt.seq !== last+1, broadcast seq-gap error
  -> agentRunSeq.set(evt.runId, evt.seq)
  -> Tool event? -> broadcastToConnIds("agent", toolPayload, registered recipients)
  -> Non-tool? -> broadcast("agent", agentPayload) (all clients)
  -> nodeSendToSession(sessionKey, "agent", payload) (channels/nodes)
  -> If stream="assistant" and data.text -> emitChatDelta (throttled to 150ms)
  -> If lifecycle.phase="end"|"error" -> emitChatFinal -> broadcast("chat", finalPayload)
```

**Chat delta throttle** (`server-chat.ts:231-258`): accumulated text is stored in `chatRunState.buffers`. Delta events are only broadcast if 150+ ms have elapsed since last send. Final events always flush the buffer.

**Heartbeat suppression** (`server-chat.ts:13-27`): If `runContext.isHeartbeat` and `heartbeatVisibility.showOk === false`, delta and final webchat broadcasts are suppressed (channel delivery still occurs).

---

## Broadcast System

```
broadcast(event, payload, opts?)
         |
         v
  For each client in clients Set:
    +- targetConnIds filter?  -> skip if not targeted
    +- hasEventScope(client)? -> scope guard
    |   . exec.approval.*   -> requires operator.approvals
    |   . device.pair.*     -> requires operator.pairing
    +- bufferedAmount > 50 MB?
    |   +- dropIfSlow -> silently skip
    |   +- else -> close(1008, "slow consumer")
    +- socket.send(JSON frame)
```

### Scope guards on events (`server-broadcast.ts:9-55`)

Certain events require specific scopes:
- `exec.approval.requested/resolved` -> `operator.approvals`
- `device.pair.requested/resolved` -> `operator.pairing`
- `node.pair.requested/resolved` -> `operator.pairing`

Targeted broadcasts (`broadcastToConnIds`) skip the global sequence counter and filter by `connId` set.

---

## Config Hot-Reload

```
chokidar watches CONFIG_PATH (300ms debounce)
         |
         v
  diffConfigPaths(prev, next) -> ["hooks.gmail.enabled", "cron.jobs.0"]
         |
         v
  buildGatewayReloadPlan(changedPaths)
         |
    +----------------------------------------------+
    | Match path prefix against reload rules:      |
    |                                              |
    |  hooks.gmail.*  -> hot: restart-gmail        |
    |  hooks.*        -> hot: reload-hooks         |
    |  cron.*         -> hot: restart-cron         |
    |  agents.*.hb    -> hot: restart-heartbeat    |
    |  channel.*      -> hot: restart-channel:X    |
    |  gateway.*      -> restart (full)            |
    |  discovery.*    -> restart (full)            |
    |  models/agents  -> none (read live)          |
    +----------------------------------------------+
         |
    mode=hybrid (default):
      hot changes -> apply in-process
      restart changes -> full gateway restart
```

### Reload plan engine (`config-reload.ts:174-243`)

`buildGatewayReloadPlan(changedPaths)` walks each changed path against `listReloadRules()`. Rules are matched by prefix:

| Prefix | Kind | Action |
|---|---|---|
| `hooks.gmail` | hot | restart-gmail-watcher, reload-hooks |
| `hooks` | hot | reload-hooks |
| `agents.defaults.heartbeat`, `agent.heartbeat` | hot | restart-heartbeat |
| `cron` | hot | restart-cron |
| `browser` | hot | restart-browser-control |
| Channel plugin prefixes | hot | restart-channel:X |
| `gateway`, `discovery`, `plugins`, `canvasHost` | restart | full gateway restart |
| `models`, `agents`, `session`, `talk`, etc. | none | no-op (read live from config) |
| Unknown path | — | full gateway restart |

### Mode-gating

- `mode === "off"` -> no reload ever.
- `mode === "restart"` -> any change triggers full restart.
- `mode === "hot"` -> restart-requiring changes are logged and skipped.
- `mode === "hybrid"` (default) -> hot changes are applied; restart-requiring changes trigger full restart.

Hot reload actions are executed by `createGatewayReloadHandlers()` in `server-reload-handlers.ts`.

---

## Hook System

### Config resolution (`hooks.ts:36-93`)

`resolveHooksConfig(cfg)` is called lazily:
- Requires `hooks.enabled === true` and `hooks.token`.
- Resolves base path (default `/hooks`), max body size (default 256 KB).
- Resolves agent policy: default agent ID, known agent IDs, optional allowlist.
- Resolves session policy: default session key, allowed prefixes, `allowRequestSessionKey` flag.

### Hook dispatch (`server/hooks.ts:15-117`)

`createGatewayHooksRequestHandler()` wraps `createHooksRequestHandler()` with two dispatch functions:

**`dispatchWakeHook`**:
```
enqueueSystemEvent(text, { sessionKey })
if mode === "now": requestHeartbeatNow()
```

**`dispatchAgentHook`**:
```
Constructs a CronJob with schedule.kind="at" and now as the time.
Runs runCronIsolatedAgentTurn() asynchronously.
On completion: enqueueSystemEvent(summary, mainSessionKey)
If wakeMode="now": requestHeartbeatNow()
```

Token auth is checked via `Authorization: Bearer <token>` or `X-OpenClaw-Token` header.

---

## Maintenance Timers

| Timer | Interval | Purpose |
|---|---|---|
| **Tick** | 30s | WS keepalive broadcast to all clients + nodes |
| **Health** | 60s | Refresh health snapshot, broadcast to clients |
| **Dedupe cleanup** | 60s | Evict expired entries (5 min TTL), trim agentRunSeq (>10K), abort timed-out chat runs, clean stale abort markers (>60 min) |

### Health state module (`server/health-state.ts`)

Module-level singletons:
```typescript
let presenceVersion = 1;  // incremented on connect/disconnect
let healthVersion = 1;    // incremented on each health snapshot refresh
let healthCache: HealthSummary | null = null;
let healthRefresh: Promise<HealthSummary> | null = null;  // deduplicates concurrent calls
```

`refreshGatewayHealthSnapshot()`: deduplicated via the `healthRefresh` promise — concurrent calls join the same in-flight request. On completion: updates `healthCache`, increments `healthVersion`, calls `broadcastHealthUpdate(snap)`.

`buildGatewaySnapshot()`: constructs the snapshot sent in `hello-ok`, including `presence`, `stateVersion`, `uptimeMs`, `configPath`, `stateDir`, `sessionDefaults`, `authMode`, `updateAvailable`.

---

## Key Architectural Patterns

**Context at construction, not per-call** — The entire `GatewayRequestContext` (services, broadcast, registries) is captured at startup and threaded to handlers as a frozen object. No per-request DI.

**Deduplicated async refresh** — Health snapshot uses a shared Promise: concurrent callers join the same in-flight request instead of stampeding.

**Scope-filtered broadcast** — Event delivery is filtered per-client by declared scopes at broadcast time. Producers don't need to know about auth.

**Diff-driven config reload** — `diffConfigPaths()` recursively compares old/new config, returning dot-notation change paths. Each path is matched against reload rules for surgical hot-reload vs full restart.

**Handler domain split** — Each functional area (chat, config, nodes, sessions, etc.) exports a handler record from its own file in `server-methods/`, then spread into a single flat registry.
