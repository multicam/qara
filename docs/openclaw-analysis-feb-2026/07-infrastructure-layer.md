# Infrastructure Layer Architecture

## Overview

The infra layer is a flat directory (~230 files) providing cross-cutting concerns: process management, networking, security, outbound delivery, storage, updates, concurrency primitives, and environment handling. No build entrypoint — every file is a standalone module imported where needed.

---

## Directory Structure

```
src/infra/
├── format-time/              # Datetime formatting (format-datetime, format-duration, format-relative)
├── net/                      # SSRF guard, DNS pinning, fetch protection
│   ├── ssrf.ts               # isPrivateIpAddress(), IPv4/IPv6/embedded analysis
│   ├── fetch-guard.ts        # fetchWithSsrfGuard() — pinned DNS, redirect stripping
│   └── hostname.ts           # Hostname resolution utilities
├── outbound/                 # Full outbound message delivery pipeline (20+ files)
│   ├── deliver.ts            # deliverOutboundPayloads() — main delivery funnel
│   ├── delivery-queue.ts     # Write-ahead queue (disk persistence)
│   ├── message.ts            # sendMessage() — high-level send
│   ├── message-action-runner.ts  # runMessageAction() — action dispatch
│   ├── outbound-send-service.ts  # executeSendAction()
│   ├── channel-selection.ts  # resolveChannel()
│   ├── target-resolver.ts    # resolveActionTarget()
│   └── ...                   # chunking, formatting, broadcast, recovery
└── tls/                      # TLS cert loading and fingerprinting
    ├── gateway.ts            # loadGatewayTlsRuntime() — cert gen/load
    └── fingerprint.ts        # SHA-256 cert fingerprint

# Flat files (~200) by domain:

# Process management
├── process-respawn.ts        # restartGatewayProcessWithFreshPid()
├── restart.ts                # Restart orchestration
├── restart-sentinel.ts       # Cross-process restart context
├── runtime-guard.ts          # Runtime validation
├── runtime-status.ts         # Runtime status tracking

# Network / mDNS / Tailscale
├── bonjour.ts                # mDNS announce/browse API
├── bonjour-ciao.ts           # ciao mDNS implementation
├── bonjour-discovery.ts      # discoverGatewayBeacons() — macOS/Linux mDNS
├── bonjour-errors.ts         # mDNS error handling
├── tailscale.ts              # findTailscaleBinary(), whois, funnel
├── tailnet.ts                # Tailnet peer discovery
├── widearea-dns.ts           # Wide-area DNS discovery
├── ports.ts                  # ensurePortAvailable(), port conflict diagnostics
├── ports-inspect.ts          # inspectPortUsage() — lsof/procfs
├── ports-lsof.ts             # lsof parser
├── ports-format.ts           # Port conflict formatting

# Device pairing
├── device-pairing.ts         # Device pairing protocol
├── device-identity.ts        # Device ID derivation from public key
├── device-auth-store.ts      # Paired device storage
├── pairing-files.ts          # Pairing file management
├── pairing-token.ts          # Pairing token generation
├── node-pairing.ts           # Node-to-gateway pairing

# Security
├── exec-approvals.ts         # Exec approval state + decision flow
├── exec-approvals-allowlist.ts  # Persistent allowlist
├── exec-approvals-analysis.ts   # Command safety analysis
├── exec-approval-forwarder.ts   # Approval forwarding
├── exec-safe-bin-policy.ts   # Per-binary flag restrictions
├── exec-safe-bin-trust.ts    # Trust level for safe binaries
├── exec-safety.ts            # Safety utilities
├── exec-host.ts              # Host command execution
├── host-env-security.ts      # sanitizeHostExecEnv()
├── host-env-security-policy.json  # Blocked env var policy

# Storage
├── file-lock.ts              # Re-export from plugin-sdk
├── json-file.ts              # saveJsonFile() / loadJsonFile()
├── json-files.ts             # Multi-file JSON utilities
├── gateway-lock.ts           # Single-instance gateway lock
├── fs-safe.ts                # Safe filesystem operations

# State migrations
├── state-migrations.ts       # State directory migration orchestrator
├── state-migrations.fs.ts    # Filesystem migration operations

# Events
├── agent-events.ts           # In-memory pub/sub for agent events
├── system-events.ts          # Session-scoped system event queue

# Heartbeat
├── heartbeat-runner.ts       # Heartbeat execution pipeline
├── heartbeat-wake.ts         # Wake scheduler with coalescing
├── heartbeat-events.ts       # Heartbeat event types
├── heartbeat-events-filter.ts  # Event filtering
├── heartbeat-active-hours.ts # Active hours scheduling
├── heartbeat-reason.ts       # Wake reason tracking
├── heartbeat-visibility.ts   # Heartbeat UI visibility

# System presence
├── system-presence.ts        # In-memory presence tracking

# Update system
├── update-runner.ts          # runGatewayUpdate() — git/npm update
├── update-check.ts           # Check for available updates
├── update-channels.ts        # stable/beta/dev channel management
├── update-global.ts          # Global package update
├── update-startup.ts         # Startup update check

# Binary management
├── binaries.ts               # ensureBinary() — require external tools

# Archive/compression
├── archive.ts                # Tar/zip with security measures
├── archive-path.ts           # Archive path utilities

# Environment
├── env.ts                    # normalizeEnv(), env var aliases
├── dotenv.ts                 # Two-phase .env loading
├── shell-env.ts              # Login shell env import
├── path-env.ts               # PATH manipulation
├── path-prepend.ts           # PATH prepend utilities

# Concurrency
├── backoff.ts                # computeBackoff() with jitter
├── retry.ts                  # retryAsync() with policies
├── retry-policy.ts           # Retry policy types
├── dedupe.ts                 # TTL + max-size LRU dedupe cache
├── fixed-window-rate-limit.ts  # Fixed-window rate limiter
├── channel-activity.ts       # Channel activity tracking

# Package install
├── npm-pack-install.ts       # npm pack + install
├── npm-integrity.ts          # Package integrity checks
├── install-safe-path.ts      # Safe install path resolution
├── install-source-utils.ts   # Install source utilities

# Misc
├── jsonl-socket.ts           # Unix domain socket JSONL protocol
├── logging.ts                # Logging infrastructure
└── ...
```

---

## Process Management

### Process Respawn (`process-respawn.ts:40-61`)

`restartGatewayProcessWithFreshPid()` uses a three-way decision:

```
1. OPENCLAW_NO_RESPAWN=1
   -> return { mode: "disabled" }
   -> caller handles in-process restart

2. Supervisor env vars detected
   (LAUNCH_JOB_LABEL, INVOCATION_ID, SYSTEMD_EXEC_PID, etc.)
   -> return { mode: "supervised" }
   -> caller exits, lets launchd/systemd restart

3. Otherwise
   -> spawn(process.execPath, args, { detached: true, stdio: "inherit" })
   -> child.unref()
   -> return { mode: "spawned", pid }
```

Supervisor detection checks `SUPERVISOR_HINT_ENV_VARS` — presence of any indicates managed process.

### Gateway Lock (`gateway-lock.ts:165-249`)

Single-instance enforcement:

```
Lock file: <lockDir>/gateway.<config-hash-8>.lock
  - Hash = SHA-256 of config path (first 8 hex chars)
  - Supports multiple instances with different configs

Acquisition:
  - fs.open(lockPath, "wx")          atomic exclusive create (POSIX)
  - Writes { pid, createdAt, configPath, startTime? }
  - Stale detection: reads /proc/<pid>/stat field 22 (Linux start time)
    to distinguish PID reuse from live process
  - Polls every 100ms, timeout 5s -> throw GatewayLockError
```

### Restart Sentinel (`restart-sentinel.ts`)

One-shot JSON file at `<stateDir>/restart-sentinel.json` — passes restart context across process boundaries:

```typescript
{ kind: "config-apply" | "config-patch" | "update" | "restart",
  status, deliveryContext, threadId }
```

Written before restart. Consumed (read then deleted) on startup.

---

## Network

### Port Management (`ports.ts`)

```
ensurePortAvailable(port)
|
+- Create temporary TCP server to validate port
+- On EADDRINUSE:
    handlePortError()
      +- inspectPortUsage() via lsof or /proc/net/tcp
      +- Print diagnostics with process owner info
      +- Recognize own process via regex /openclaw|src\/index\.ts/
```

### mDNS Discovery (`bonjour-discovery.ts`)

Service type: `_openclaw-gw._tcp`

```
discoverGatewayBeacons()
|
+- macOS:
|   dns-sd -B -> browse instances
|   dns-sd -L -> lookup per instance
|   Parse TXT records
|
+- Linux:
|   avahi-browse -rt _openclaw-gw._tcp
|   Parse structured output
|
+- Wide-area fallback:
    Probe Tailscale peer IPs with dig @<ip> PTR
    Fetch SRV + TXT records
```

TXT record fields: `displayName`, `lanHost`, `tailnetDns`, `gatewayPort`, `sshPort`, `gatewayTls`, `gatewayTlsSha256`, `role`, `transport`, `cliPath`.

### Tailscale Integration (`tailscale.ts`)

```
findTailscaleBinary() — four strategies in sequence:
  1. which tailscale
  2. /Applications/Tailscale.app/Contents/MacOS/Tailscale (macOS)
  3. find /Applications -maxdepth 3 -name Tailscale
  4. locate Tailscale.app
  -> Module-level cached

readTailscaleWhoisIdentity(ip)
  -> tailscale whois --json <ip>
  -> TTL cache: 60s success, 5s error

ensureFunnel(port)
  -> Enables Tailscale Funnel
  -> Retries with sudo -n on permission errors
```

### SSRF Protection (`net/ssrf.ts`, `net/fetch-guard.ts`)

**Note — IP classification refactoring:** `isPrivateIpAddress()` in `net/ssrf.ts` has been refactored to delegate range classification to a new shared module `src/shared/net/ip.ts`, which uses the `ipaddr.js` library. The previous inline IPv4/IPv6 block comparisons have been replaced by `ipaddr.js`'s `address.range()` method evaluated against two named range sets: `BLOCKED_IPV4_SPECIAL_USE_RANGES` and `PRIVATE_OR_LOOPBACK_IPV6_RANGES`. A companion file `src/shared/net/ipv4.ts` provides IPv4-specific helpers. The externally observable behavior (which addresses are blocked) is unchanged; only the implementation mechanism differs.

```
isPrivateIpAddress(address)                       <- net/ssrf.ts:308-377
|
+- Delegates to src/shared/net/ip.ts (ipaddr.js-based range classification)
|
+- IPv4 blocks (BLOCKED_IPV4_SPECIAL_USE_RANGES):
|   0.0.0.0/8, 10/8, 127/8, 169.254/16,
|   172.16-31/12, 192.168/16, 100.64-127/10 (CGNAT)
|
+- IPv6 blocks (PRIVATE_OR_LOOPBACK_IPV6_RANGES):
|   loopback, unspecified, link-local fe80::/10,
|   site-local fec0::/10, ULA fc00::/7
|
+- Embedded IPv4 in IPv6:
|   IPv4-mapped (::ffff:), IPv4-compat (::0:),
|   NAT64 (64:ff9b::), 6to4 (2002::), Teredo (2001:0000::), ISATAP
|
+- Legacy non-canonical IPv4 literals rejected
    (octal, hex, short forms)

fetchWithSsrfGuard()                              <- net/fetch-guard.ts:91-197
|
+- Resolve hostname with resolvePinnedHostnameWithPolicy()
|   Check blocklist, allowlist, then DNS resolve
|
+- Create pinned undici.Agent (DNS rebinding protection)
|   Only connects to pre-resolved IPs
|
+- Manual redirect following:
|   Strip Authorization, Cookie, Proxy-Authorization on cross-origin
|   Loop detection via visited Set
|   Max 3 redirects
```

---

## Outbound Delivery Pipeline (`src/infra/outbound/`)

### Full Flow

```
runMessageAction()                    <- message-action-runner.ts:691
  -> resolveChannel()                 <- channel-selection.ts
  -> resolveActionTarget()            <- target-resolver.ts
  -> handleSendAction()               <- message-action-runner.ts:378
    -> executeSendAction()            <- outbound-send-service.ts:78
      -> sendMessage()                <- message.ts
        -> deliverOutboundPayloads()  <- deliver.ts:226
           |
           +- enqueueDelivery()       <- delivery-queue.ts:81
           |   Write-ahead to disk before sending
           |
           +- deliverOutboundPayloadsCore()  <- deliver.ts:287
           |   +- loadChannelOutboundAdapter(channel)
           |   +- hook: message_sending (can modify or cancel)
           |   +- Route by payload type:
           |   |   channelData? -> sendPayload()
           |   |   mediaUrls?   -> sendMedia() per URL
           |   |   text?        -> chunk + sendText()
           |   +- hook: message_sent
           |
           +- ackDelivery() or failDelivery()
```

### Write-Ahead Queue (`delivery-queue.ts`)

```
Path: <stateDir>/delivery-queue/<uuid>.json (mode 0o600)
Write: atomic via .pid.tmp rename pattern

Backoff schedule: [5s, 25s, 2m, 10m] for retries 1-4
Max retries: 5 -> moved to delivery-queue/failed/

Startup recovery:
  recoverPendingDeliveries()
    Scan queue, apply backoff waits
    Retry up to 60-second wall-clock budget
    Defer remainder to next restart
```

### Text Chunking (`deliver.ts:333-368`)

Two modes:
- `"length"`: `handler.chunker(text, textLimit)` directly
- `"newline"`: split by paragraph first, then chunker per block

Signal has a dedicated path using `markdownToSignalTextChunks()` preserving style ranges.

### Broadcast (`message-action-runner.ts:297-376`)

Iterates all configured channels x all target strings. Calls `runMessageAction()` recursively per combination. Abort signals propagate; per-target errors collected (not thrown).

---

## Storage

### JSON Persistence (`json-file.ts`)

```
saveJsonFile(path, data)
  - mkdirSync(parent, { mode: 0o700 })
  - writeFileSync(JSON.stringify(data, null, 2) + "\n")
  - chmod 0o600
  - No atomic write — direct writeFileSync

loadJsonFile(path)
  - Returns undefined on any error (missing file or parse failure)
```

### Gateway Lock

Lock file: `<lockDir>/gateway.<config-hash-8>.lock`
- SHA-256 hash of config path (first 8 hex chars)
- Multiple instances with different configs supported
- Stale PID detection via `/proc/<pid>/stat` start time (Linux)

### File Lock

Re-exported from plugin-sdk: `acquireFileLock()`, `withFileLock()`.

---

## Security

### Exec Approvals (`exec-approvals.ts`)

State file: `~/.openclaw/exec-approvals.json` (mode `0o600`)

```typescript
ExecApprovalsFile = {
  version: 1;
  socket?: { path?: string; token?: string };     // Unix socket for live UI
  defaults?: ExecApprovalsDefaults;
  agents?: Record<string, ExecApprovalsAgent>;     // keyed by agentId
}
```

Security levels (ordered): `"deny" < "allowlist" < "full"`

```
requiresExecApproval()
  ask === "always"    -> always prompt
  ask === "on-miss"   -> prompt if allowlist unsatisfied or analysis failed

Decision flow:
  requestExecApprovalViaSocket()
    Connect to Unix domain socket
    Send { type: "request", token, id, request }
    Expect { type: "decision", decision: "allow-once"|"allow-always"|"deny" }
```

### Safe-Bin Policy (`exec-safe-bin-policy.ts`)

Per-binary profiles restricting flag usage:

| Binary | Key restrictions |
|---|---|
| `jq` | Denied: `--argfile`, `--rawfile`, `--from-file`, `-f` |
| `grep` | Denied: `--file`, `--recursive`, `-r`, `-R` |
| `sort` | Denied: `--compress-program` |
| `cut`, `uniq`, `head`, `tail`, `tr`, `wc` | `maxPositional: 0` (stdin only) |

```
validateSafeBinArgv()
  - Tokenize argv
  - Reject glob characters (*?[])
  - Reject path-like tokens (/, ./, ../, ~, C:\)
  - Reject denied flags
```

### Host Env Security (`host-env-security.ts`)

```
sanitizeHostExecEnv()
  Blocked exact keys:
    NODE_OPTIONS, NODE_PATH, PYTHONHOME, PYTHONPATH,
    PERL5LIB, PERL5OPT, RUBYLIB, RUBYOPT,
    BASH_ENV, ENV, SHELL, GCONV_PATH, IFS, SSLKEYLOGFILE

  Blocked prefixes:
    DYLD_, LD_, BASH_FUNC_

  Also rejects non-portable key names
  Then applies caller overrides
```

---

## Update System

### Channels (`update-channels.ts`)

```
"stable" -> npm tag "latest"
"beta"   -> npm tag "beta"
"dev"    -> npm tag "dev"

Auto-detection from git:
  tag with -beta  -> beta
  any stable tag  -> stable
  branch          -> dev
```

### Update Runner (`update-runner.ts:327`)

**Git install mode** (when `gitRoot === pkgRoot`):

```
runGatewayUpdate()
|
+- 1. git status --porcelain (abort if dirty, excluding dist/control-ui/)
+- 2. For dev channel: verify upstream, git fetch
+- 3. PREFLIGHT (update-runner.ts:539-619):
|      Create git worktree in /tmp/openclaw-update-preflight-*
|      Iterate up to 10 upstream commits
|      For each: install -> build -> lint in isolation
|      Take first passing commit as selectedSha
+- 4. git rebase <selectedSha>
+- 5. For stable/beta: git fetch, resolve channel tag, checkout --detach
+- 6. deps install -> build -> ui:build
+- 7. Verify openclaw.mjs entry exists
+- 8. openclaw doctor --non-interactive --fix
+- 9. Verify UI dist index, repair if needed
```

**Global package install mode** (npm/pnpm/bun -g):
- Detect package manager via `detectGlobalInstallManagerForRoot()`
- Run `<manager> install -g openclaw@<tag>`

---

## Agent Events (`agent-events.ts`)

In-memory pub/sub with per-run sequence numbers:

```
Module-level state:
  seqByRun: Map<string, number>           monotonic counter per runId
  listeners: Set<(evt) => void>
  runContextById: Map<string, AgentRunContext>

emitAgentEvent({ runId, stream, data })
  1. Increment seqByRun for runId
  2. Resolve sessionKey from event or registered context
  3. Build payload with seq + ts
  4. Iterate all listeners (swallow errors)

onAgentEvent(listener) -> returns unsubscribe fn

registerAgentRunContext(runId, context)
  -> create or merge context (only update changed fields)
  -> supports heartbeat-aware routing
```

---

## System Events (`system-events.ts`)

Lightweight in-memory queue, session-scoped, not persisted:

```
queues: Map<string, SessionQueue>
  SessionQueue = { queue: SystemEvent[], lastText, lastContextKey }

enqueueSystemEvent(text, { sessionKey })
  - Deduplicate consecutive identical texts
  - Track contextKey for context-change detection
  - Max 20 events per session (FIFO eviction)

drainSystemEvents(sessionKey)
  -> returns all texts, DELETES the queue entry

isSystemEventContextChanged(sessionKey, contextKey)
  -> compares current contextKey to last stored one
```

---

## Heartbeat System

### Wake Scheduler (`heartbeat-wake.ts`)

Module-level singleton timer with coalescing:

```
Pending wakes keyed by: agentId::sessionKey

Priority order:
  RETRY(0) < INTERVAL(1) < DEFAULT(2) < ACTION(3)
  Action-triggered wakes preempt interval wakes for same target

schedule(target, kind, delayMs)
  - Retry-kind timers cannot be preempted (hold backoff delay)
  - When running === true, reschedule instead of concurrent run
  - After run, if new wakes arrived, reschedule immediately

setHeartbeatWakeHandler(fn)
  -> Generation-guarded disposer
  -> Prevents stale cleanup from SIGUSR1 in-process restarts
```

### Heartbeat Runner (`heartbeat-runner.ts`)

Uses `CommandLane` for concurrency control. Flow:
1. Read heartbeat config per agent
2. Resolve delivery target (last sender or configured)
3. Construct prompt with system events prepended
4. Call agent reply pipeline
5. Deliver result via `deliverOutboundPayloads()`

---

## System Presence (`system-presence.ts`)

In-memory tracking with 5-minute TTL, 200-entry max:

```
On module load — initSelfPresence():
  macOS: sysctl -n hw.model + sw_vers -productVersion
  Linux: os.arch() + os.release()
  LAN IP: pickPrimaryLanIPv4() or os.hostname() fallback
```

---

## TLS (`tls/gateway.ts`)

```
loadGatewayTlsRuntime()
|
+- Resolve cert/key paths
|   Default: ~/.openclaw/gateway/tls/gateway-cert.pem, gateway-key.pem
|
+- If both missing and autoGenerate !== false:
|   openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes
|   CN=openclaw-gateway
|
+- Read cert, compute SHA-256 fingerprint via X509Certificate.fingerprint256
+- Return { cert, key, ca, minVersion: "TLSv1.3" }
```

---

## Archive/Compression (`archive.ts`)

Supports `"tar"` (node-tar) and `"zip"` (jszip).

Limits: 256MB max archive, 512MB max extracted total, 256MB max single entry, 50K max entries.

Security measures:
- `validateArchiveEntryPath()` — reject path traversal (`../`)
- `assertNoSymlinkTraversal()` — walk each path component checking `lstat`
- `assertResolvedInsideDestination()` — `fs.realpath()` check after mkdir
- `openZipOutputFile()` uses `O_NOFOLLOW` flag (non-Windows)
- Tar rejects SymbolicLink, Link, BlockDevice, CharacterDevice, FIFO, Socket entries

---

## Environment (`env.ts`, `dotenv.ts`, `shell-env.ts`)

### dotenv Loading (`dotenv.ts:6-20`)

Two-phase:
1. `dotenv.config()` from CWD (standard)
2. `dotenv.config({ path: "~/.openclaw/.env", override: false })` — global fallback, does NOT override

### Env Normalization (`env.ts`)

`normalizeEnv()` canonicalizes `OPENCLAW_*` env vars from legacy names.
`normalizeZaiEnv()` aliases `Z_AI_API_KEY` -> `ZAI_API_KEY` if unset.

### Shell Env Import (`shell-env.ts`)

Spawns user's shell with `-i -l -c env` to import secrets. Shell path validated against:
- Trusted prefixes: `/bin/`, `/usr/bin/`, `/usr/local/bin/`, `/opt/homebrew/bin/`, `/run/current-system/sw/bin/`
- `/etc/shells` whitelist

---

## Concurrency Utilities

### Backoff (`backoff.ts`)

```typescript
computeBackoff(policy, attempt) {
  const base = policy.initialMs * policy.factor ** Math.max(attempt - 1, 0);
  const jitter = base * policy.jitter * Math.random();
  return Math.min(policy.maxMs, Math.round(base + jitter));
}
```

`sleepWithAbort()` uses `timers/promises.setTimeout` with `AbortSignal`.

### Retry (`retry.ts:70-136`)

Two modes:
- Simple: `retryAsync(fn, N, initialDelayMs)` — exponential `initialDelayMs * 2^i`
- Options: `RetryOptions` with `shouldRetry(err, attempt)`, `retryAfterMs(err)` (respects HTTP `Retry-After`), `onRetry(info)`, jitter

### Dedupe Cache (`dedupe.ts`)

TTL + max-size LRU cache. `check(key)` returns `true` if recently seen, inserts/refreshes, then prunes expired + overflow. Uses insertion-order of `Map` for LRU.

### Fixed-Window Rate Limiter (`fixed-window-rate-limit.ts`)

Returns `{ allowed, retryAfterMs, remaining }`. Window resets when `Date.now() - windowStartMs >= windowMs`. Single global counter (no per-IP buckets).

### JSONL Socket (`jsonl-socket.ts`)

Unix domain socket protocol:
```
Connect -> send newline-terminated JSON
Read newline-delimited JSON responses
Call accept(msg) until non-undefined return
Timeout resolves to null
```

---

## Additional Infrastructure Modules

The following ~60 files were not covered in the sections above. They are organized by domain.

### Provider Usage Tracking (~15 files)

Aggregates and formats API usage/cost data from all supported providers.

| File | Description |
|---|---|
| `provider-usage.ts` | Barrel re-export for the provider-usage subsystem |
| `provider-usage.types.ts` | `ProviderUsageSnapshot` and `UsageWindow` types |
| `provider-usage.fetch.ts` | Top-level fetch orchestrator — calls per-provider fetchers |
| `provider-usage.fetch.claude.ts` | Usage fetcher for Anthropic/Claude |
| `provider-usage.fetch.codex.ts` | Usage fetcher for OpenAI Codex |
| `provider-usage.fetch.copilot.ts` | Usage fetcher for GitHub Copilot |
| `provider-usage.fetch.gemini.ts` | Usage fetcher for Google Gemini |
| `provider-usage.fetch.minimax.ts` | Usage fetcher for MiniMax |
| `provider-usage.fetch.zai.ts` | Usage fetcher for Zai |
| `provider-usage.fetch.antigravity.ts` | Usage fetcher for Antigravity |
| `provider-usage.format.ts` | Formats usage snapshots for CLI/UI display |
| `provider-usage.load.ts` | Loads persisted usage data from disk |
| `provider-usage.auth.ts` | Auth resolution for provider usage API calls |
| `provider-usage.shared.ts` | Shared utilities used across fetchers |

### Apple Push Notifications

| File | Description |
|---|---|
| `push-apns.ts` | HTTP/2-based APNs client for delivering push notifications to iOS nodes |

### SSH / Remote Node Support

| File | Description |
|---|---|
| `ssh-config.ts` | SSH config parsing and resolution |
| `ssh-tunnel.ts` | SSH tunnel management; exports `SshParsedTarget` type |
| `scp-host.ts` | SCP file transfer to remote hosts |

### Voice Wake

| File | Description |
|---|---|
| `voicewake.ts` | `VoiceWakeConfig` with trigger phrase definitions for wake-word detection |

### WebSocket Helpers

| File | Description |
|---|---|
| `ws.ts` | `rawDataToString()` — normalizes raw WebSocket data (Buffer, ArrayBuffer, Buffer[]) to string |

### Diagnostics

| File | Description |
|---|---|
| `diagnostic-events.ts` | OTel-style diagnostic event emission for tracing and observability |
| `diagnostic-flags.ts` | Reads `OPENCLAW_DIAGNOSTICS` env var to enable diagnostic modes at runtime |

### Other Utilities

| File | Description |
|---|---|
| `unhandled-rejections.ts` | Installs a global unhandled rejection handler with formatted output |
| `skills-remote.ts` | Remote skill resolution for node-hosted skill directories |
| `transport-ready.ts` | Signals when a transport layer (e.g., WebSocket) is ready to accept messages |
| `session-maintenance-warning.ts` | Emits warnings when session maintenance tasks are overdue |
| `brew.ts` | Homebrew detection and formula install helpers |
| `detect-package-manager.ts` | Detects the active global package manager (npm/pnpm/yarn/bun) |
| `git-root.ts` | Locates the git repository root from a given path |
| `git-commit.ts` | Reads the current git commit hash |
| `gemini-auth.ts` | Gemini API authentication and credential resolution |
| `home-dir.ts` | Cross-platform home directory resolution with `~` normalization |
| `machine-name.ts` | Derives a stable human-readable machine identifier |
| `os-summary.ts` | Builds a short OS/hardware summary string for diagnostics and presence |

---

## Key Architectural Patterns

**Write-ahead delivery queue** — Every outbound message is persisted to disk before the send attempt. On crash, `recoverPendingDeliveries()` retries within a 60-second budget on next startup. Failed messages move to a `failed/` directory after 5 retries.

**Three-way respawn decision** — Process restart detects supervisor environments (launchd/systemd) and defers to them, spawns detached children for standalone mode, or returns "disabled" for in-process restart.

**DNS-pinned fetch** — SSRF protection resolves hostnames upfront, creates a pinned `undici.Agent` that only connects to pre-resolved IPs, strips auth headers on cross-origin redirects, and blocks all private IP ranges including embedded IPv4-in-IPv6. Range classification is handled by `ipaddr.js` via the shared `src/shared/net/ip.ts` module.

**Preflight worktree builds** — Updates create an isolated git worktree, iterate up to 10 upstream commits testing install/build/lint, and only rebase to the first passing commit. Production is never broken by a bad upstream commit.

**Generation-guarded handlers** — The heartbeat wake handler uses a generation counter to prevent stale cleanup functions (from in-process SIGUSR1 restarts) from clearing a newer handler.

**Safe-bin profiles** — Per-binary flag restrictions prevent tools like `grep` from being used for file traversal or `sort` from executing external binaries via `--compress-program`.
