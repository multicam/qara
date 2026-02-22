# 15 — ACP (Agent Control Protocol)

## Summary

- ACP is an implementation of the open [Agent Control Protocol](https://agentclientprotocol.com) spec (via `@agentclientprotocol/sdk` v0.14.1), adapted as a **bridge between IDE tools (clients) and the OpenClaw gateway**. It gives editors like VS Code or Cursor a standardized way to send prompts to an AI agent.
- Transport is **newline-delimited JSON (NDJSON) over stdio**, not HTTP. The ACP server runs as a child of the IDE tool, reading from stdin and writing to stdout; the gateway connection happens over a persistent WebSocket in the same process.
- The core translator class (`AcpGatewayAgent`) is a **dual-protocol bridge**: ACP on its left side (toward the IDE) and the internal OpenClaw gateway RPC protocol on its right side (toward the AI backend).
- Session management is **in-memory** with TTL-based eviction and a hard cap of 5,000 sessions. ACP session IDs map to gateway session keys.
- Security: prompt-size hard caps (2MB), session-creation rate limiting (120/10s), tool permission gating with explicit deny-list of dangerous tool names, and TLS fingerprint pinning for remote connections.

---

## Directory Structure

```
src/acp/
  index.ts              — Public exports (3 exports)
  types.ts              — AcpSession, AcpServerOptions, ACP_AGENT_INFO
  commands.ts           — Available slash-command list sent to IDE on session init
  server.ts             — serveAcpGateway() entry point; wires ACP <-> gateway
  translator.ts         — AcpGatewayAgent class (core bridge, 499 lines)
  session.ts            — createInMemorySessionStore() factory
  session-mapper.ts     — Resolves ACP session meta to gateway session keys
  event-mapper.ts       — Converts ACP ContentBlock[] to gateway message format
  meta.ts               — readString/readBool/readNumber helpers for _meta bags
  secret-file.ts        — Reads credentials from files (avoids CLI arg exposure)
  client.ts             — createAcpClient() for test/interactive use
  *.test.ts             — Unit tests

src/cli/
  acp-cli.ts            — CLI command: `openclaw acp [client]`

src/security/
  dangerous-tools.ts    — DANGEROUS_ACP_TOOLS deny-list

src/infra/
  fixed-window-rate-limit.ts — Rate limiter for session creation
```

---

## What ACP Solves

The OpenClaw gateway speaks its own WebSocket-based RPC protocol. IDE extensions expecting ACP need a translator. The ACP server is the **adapter** between:

- **ACP protocol** (what IDEs speak, JSON-RPC over stdio NDJSON)
- **OpenClaw gateway protocol** (what the backend speaks, WebSocket JSON frames)

Any ACP-compliant client can use any ACP-compliant agent.

---

## Protocol Design

### ACP Layer (IDE ↔ ACP Server)

JSON-RPC 2.0 over NDJSON stdio via the SDK's `ndJsonStream`.

| Message | Direction | Purpose |
|---|---|---|
| `InitializeRequest/Response` | Client → Agent | Protocol version + capability negotiation |
| `NewSessionRequest/Response` | Client → Agent | Create conversation session |
| `LoadSessionRequest/Response` | Client → Agent | Reattach to existing session |
| `ListSessionsRequest/Response` | Client → Agent | Enumerate gateway sessions |
| `PromptRequest/Response` | Client → Agent | Send prompt, receive stop reason |
| `CancelNotification` | Client → Agent | Abort ongoing prompt |
| `SetSessionModeRequest/Response` | Client → Agent | Change thinking level |
| `AuthenticateRequest/Response` | Client → Agent | Auth (currently no-op) |
| `SessionNotification` | Agent → Client | Stream response chunks + tool updates |
| `RequestPermissionRequest/Response` | Agent → Client | Ask user before running a tool |

### Capabilities Advertised (`translator.ts:123-143`)

```
image: true, audio: false, embeddedContext: true
mcpCapabilities: { http: false, sse: false }
sessionCapabilities: { list: {} }
authMethods: []
```

MCP server URLs passed by clients are silently ignored (logged at `translator.ts:147`). OpenClaw manages its own tools natively.

### Gateway Layer (ACP Server ↔ OpenClaw Gateway)

Custom JSON-framed WebSocket protocol:

```
RequestFrame:  { type: "req",   id, method, params }
ResponseFrame: { type: "res",   id, ok, payload?, error? }
EventFrame:    { type: "event", event, payload?, seq? }
```

Gateway methods called by ACP:
- `chat.send` — sends prompt (`translator.ts:290-308`)
- `chat.abort` — cancels generation (`translator.ts:319`)
- `sessions.list` — enumerate sessions (`translator.ts:210`)
- `sessions.resolve` — resolve session key/label (`session-mapper.ts:39,52,62,75`)
- `sessions.reset` — clear history (`session-mapper.ts:97`)
- `sessions.patch` — set thinking level (`translator.ts:241`)

---

## Server/Client Architecture

### Server (`server.ts` + `translator.ts`)

`serveAcpGateway(opts)` at `server.ts:15`:

1. Load config, resolve auth credentials
2. Create `GatewayClient` WebSocket connection to gateway
3. **Gateway connects and completes handshake** — a `gatewayReady` Promise (lines 46-63) gates ACP startup. If the gateway fails to connect, the server throws instead of accepting ACP requests.
4. Wrap `process.stdout`/`process.stdin` into NDJSON stream
5. Create `AgentSideConnection` (ACP SDK) with `AcpGatewayAgent` as handler
6. Start gateway connection (auto-reconnect: 1s → 30s backoff)
7. Return promise that resolves on SIGINT/SIGTERM

### Client (`client.ts`)

Reference implementation / test utility. Spawns ACP server as child process, wraps stdio into NDJSON, provides REPL for interactive testing.

---

## Tool Exposure

Tools are **executed entirely by the gateway backend** and streamed back as gateway `agent` events. ACP only relays tool call notifications to the IDE.

### Tool Call Flow (`translator.ts:331-393`)

```
Gateway event: "agent" { stream: "tool", phase: "start" }
  └── sessionUpdate: tool_call, status: "in_progress"

Gateway event: "agent" { stream: "tool", phase: "result" }
  └── sessionUpdate: tool_call_update, status: "completed" or "failed"
```

### Tool Kind Inference (`event-mapper.ts:106-133`)

Maps tool names to kinds by string matching:
- `read` → read, `write`/`edit` → edit, `delete`/`remove` → delete
- `move`/`rename` → move (added Feb 2026)
- `search`/`find` → search, `exec`/`run`/`bash` → execute
- `fetch`/`http` → fetch, else → other

### Permission Gating (Client Side, `client.ts:188-235`)

- Read/search tools NOT in `DANGEROUS_ACP_TOOLS` → **auto-approve**
- Everything else → prompt user via TTY readline (30s timeout)

Dangerous tools always require explicit approval (`security/dangerous-tools.ts:24-37`):
```
exec, spawn, shell, sessions_spawn, sessions_send,
gateway, fs_write, fs_delete, fs_move, apply_patch
```

---

## Session Management

### AcpSession (`types.ts:4-12`)

```
AcpSession
  ├── sessionId: string        — ACP UUID (local to ACP server)
  ├── sessionKey: string       — Gateway session key (e.g. "agent:main:main")
  ├── cwd: string              — Working directory for prompt prefix
  ├── createdAt: number
  ├── lastTouchedAt: number
  ├── abortController: AbortController | null
  └── activeRunId: string | null
```

### Session Store (`session.ts`)

In-memory singleton. Capacity: 5,000 sessions. TTL: 24 hours.

Eviction: reap idle sessions → if still at cap, evict oldest idle (LRU) → if all active, throw error.

Active-run tracking: `runId → sessionId` map for routing gateway events.

### Session Key Resolution (`session-mapper.ts`)

Priority:
1. `params._meta.sessionLabel` → gateway `sessions.resolve` lookup
2. `params._meta.sessionKey` → use directly
3. `opts.defaultSessionLabel` → from server startup
4. `opts.defaultSessionKey` → from server startup
5. Fallback: `acp:<uuid>` for new, `params.sessionId` for load

---

## Authentication

### ACP Level

`authenticate()` returns `{}` — no ACP-level auth. Security is at the gateway level.

### Gateway Level (`server.ts:26-35`)

Credential priority:
1. CLI `--token` / `--password` flags
2. Remote mode config (`remote.token`/`remote.password`)
3. `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` env vars
4. Auth config file

`--token-file` / `--password-file` read from files via `readSecretFromFile` to avoid process listing exposure.

Device identity: Ed25519 signed payload with public key in `connect` frame. Device token cached after first successful auth.

### TLS Security

Plaintext `ws://` to non-loopback addresses is blocked. TLS fingerprint pinning supported via `--tls-fingerprint`.

---

## Data Flow — Full Prompt Turn

```
IDE / ACP Client
    │
    │  JSON-RPC over NDJSON stdio
    │  (PromptRequest: sessionId, prompt[], _meta)
    ▼
AcpGatewayAgent.prompt()                    [translator.ts:252]
    ├── extractTextFromPrompt() → userText   [event-mapper.ts:38]
    ├── extractAttachmentsFromPrompt() → []  [event-mapper.ts:71]
    ├── prefix "[Working directory: ~/foo]"  [translator.ts:268-269]
    ├── enforce 2MB size limit (x2 check)    [translator.ts:265,272]
    ├── sessionStore.setActiveRun()          [session.ts:131]
    ├── pendingPrompts.set(sessionId, {...}) [translator.ts:281]
    │
    │  gateway.request("chat.send", {...}, {expectFinal:true})
    ▼
GatewayClient → WebSocket → OpenClaw Gateway
    │
    │  Events stream back:
    │  "chat" { state:"delta" } → sessionUpdate(agent_message_chunk)
    │  "agent" { stream:"tool", phase:"start" } → sessionUpdate(tool_call)
    │  "agent" { stream:"tool", phase:"result" } → sessionUpdate(tool_call_update)
    │  "chat" { state:"final" } → pending.resolve({ stopReason:"end_turn" })
    ▼
ACP SDK → PromptResponse → IDE
```

## Data Flow — Session Lifecycle

```
openclaw acp --session agent:main:main
    │
    ▼
serveAcpGateway()                      [server.ts:15]
    ├── GatewayClient.start()           [WebSocket connect]
    └── AgentSideConnection created     [ACP SDK; stdio NDJSON]

IDE: initialize()
    ←── capabilities, agentInfo

IDE: newSession({ cwd, mcpServers:[] })
    ├── enforceSessionCreateRateLimit() [120/10s]
    ├── resolveSessionKey()             [session-mapper.ts:27]
    ├── resetSessionIfNeeded()          [if --reset-session]
    ├── sessionStore.createSession()    [sessionId = UUID]
    ├── sendAvailableCommands()         [28 slash commands]
    ←── NewSessionResponse { sessionId }

IDE: prompt({ sessionId, prompt:[...] })
    ... (see prompt turn above)

IDE: cancel({ sessionId })
    ├── cancelActiveRun()               [abort AbortController]
    ├── gateway.request("chat.abort")
    └── pending.resolve({ stopReason:"cancelled" })
```

## Data Flow — Permission Request (Client Side)

```
Gateway backend requests tool execution
    │
    ▼
ACP Agent → requestPermission(params)
    │
    ▼
resolvePermissionRequest()              [client.ts:188]
    ├── Resolve tool name and kind
    ├── Read/search AND not dangerous? → auto-approve
    └── Otherwise → TTY readline prompt (30s timeout)
          "Allow 'bash: git status'? (y/N)"
    │
    ▼
RequestPermissionResponse → ACP SDK → Agent
```

---

## Configuration

| Option | Default | Description |
|---|---|---|
| `gatewayUrl` | `ws://127.0.0.1:18789` | Gateway WebSocket URL |
| `gatewayToken` | from config/env | Auth token |
| `gatewayPassword` | from config/env | Auth password |
| `defaultSessionKey` | none | Gateway session key for all sessions |
| `defaultSessionLabel` | none | Gateway session label to resolve |
| `requireExistingSession` | `false` | Fail if session doesn't exist |
| `resetSession` | `false` | Reset history before first use |
| `prefixCwd` | `true` | Prefix prompts with working directory |
| `sessionCreateRateLimit.maxRequests` | `120` | Max new sessions per window |
| `sessionCreateRateLimit.windowMs` | `10_000` | Rate limit window |
| `verbose` | `false` | Log ACP events to stderr |

---

## Key Types

| Type | File:Line | Purpose |
|---|---|---|
| `AcpSession` | `types.ts:4` | Per-session state: IDs, cwd, run tracking |
| `AcpServerOptions` | `types.ts:14` | Server configuration |
| `AcpSessionStore` | `session.ts:4` | Session CRUD + run lifecycle interface |
| `AcpSessionMeta` | `session-mapper.ts:5` | Parsed `_meta` fields from requests |
| `PendingPrompt` | `translator.ts:46` | In-flight prompt: resolve/reject, tool tracking |
| `AcpGatewayAgent` | `translator.ts:64` | Core bridge class (implements ACP `Agent`) |
| `GatewayAttachment` | `event-mapper.ts:3` | Image attachment format |

### event-mapper.ts — Current Exports (Feb 2026)

`event-mapper.ts` now has **4 exports** (was 2 at initial doc):

| Export | Purpose |
|--------|---------|
| `extractTextFromPrompt()` | Extracts text from ACP ContentBlock[]; now handles `"resource"` and `"resource_link"` block types in addition to `"text"` |
| `extractAttachmentsFromPrompt()` | Extracts image attachments from prompt blocks |
| `formatToolTitle(name, args)` | Formats a human-readable tool title for IDE display (new) |
| `inferToolKind()` | Infers tool kind from tool name; now also handles `"move"`/`"rename"` → `"move"` kind (updated) |
| `AcpClientHandle` | `client.ts:245` | `{ client, agent, sessionId }` |
| `DANGEROUS_ACP_TOOL_NAMES` | `security/dangerous-tools.ts:24` | Tool deny-list |
