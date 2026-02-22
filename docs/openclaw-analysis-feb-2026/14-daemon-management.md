# 14 — Daemon Management

## Summary

- **Three platform backends, one unified interface**: `resolveGatewayService()` in `src/daemon/service.ts:67` selects between launchd (macOS), systemd (Linux), and Windows Task Scheduler at runtime via `process.platform`, returning a `GatewayService` object with identical method signatures across all three.
- **No PID files in the traditional sense**: Instead a JSON lock file (`gateway.<hash>.lock`) stored in a dedicated lock directory is used for single-instance enforcement, with stale lock detection via `/proc/<pid>/stat` on Linux and `process.kill(pid, 0)` cross-platform.
- **Signal handling is in the gateway daemon process itself**: SIGTERM triggers graceful stop, SIGINT also stops, and SIGUSR1 triggers an authorized in-process or full-process restart — all implemented in `src/macos/gateway-daemon.ts`.
- **Auto-restart is delegated to the OS supervisor**: launchd uses `KeepAlive=true`, systemd uses `Restart=always`+`RestartSec=5`, and Windows Scheduled Task uses `ONLOGON` trigger.
- **Log management is launchd-only**: On macOS, stdout/stderr are redirected to files in `~/.openclaw/logs/`. systemd logs via journald. Windows has no explicit log config.

---

## Directory Structure

```
src/daemon/                         — Core daemon abstractions
  service.ts                        — Platform dispatcher (resolveGatewayService)
  service-types.ts                  — Shared TypeScript types for install/control args
  service-runtime.ts                — GatewayServiceRuntime type
  constants.ts                      — Service labels, names, profile resolvers
  paths.ts                          — Home/state dir resolution
  service-env.ts                    — Builds minimal PATH and service environment vars
  service-audit.ts                  — Config auditing (token drift, PATH, runtime checks)
  systemd.ts                        — Linux systemd backend
  systemd-unit.ts                   — systemd .service file render/parse
  systemd-hints.ts                  — WSL/systemd unavailability messages
  systemd-linger.ts                 — loginctl linger enable/check
  launchd.ts                        — macOS launchd backend
  launchd-plist.ts                  — XML plist render/parse
  schtasks.ts                       — Windows Task Scheduler backend
  schtasks-exec.ts                  — schtasks.exe wrapper
  node-service.ts                   — Node Host service (wraps GatewayService with NODE_* env)
  inspect.ts                        — Multi-instance service scanner
  diagnostics.ts                    — Log error line reader
  runtime-paths.ts                  — System/version-manager node path detection
  program-args.ts                   — Builds programArguments array for install
  exec-file.ts                      — execFile promisified wrapper
  cmd-argv.ts / cmd-set.ts          — Windows CMD arg quoting/parsing
  arg-split.ts                      — Cross-platform arg splitting
  output.ts                         — Formatted line writers
  runtime-format.ts / runtime-parse.ts — Runtime output parsers

src/macos/gateway-daemon.ts         — Main gateway daemon entry point (signal handling, lock, restart)
src/infra/gateway-lock.ts           — Lock file acquisition/release
src/infra/process-respawn.ts        — Fresh PID respawn logic (spawn/supervisor/in-process)
src/shared/pid-alive.ts             — process.kill(pid, 0) liveness check

src/cli/daemon-cli.ts               — Public CLI exports barrel
src/cli/daemon-cli/
  register.ts                       — Registers `daemon` command group
  register-service-commands.ts      — Attaches status/install/uninstall/start/stop/restart
  runners.ts                        — Re-exports all run* functions
  install.ts                        — runDaemonInstall implementation
  lifecycle.ts                      — runDaemonStart/Stop/Restart/Uninstall (Gateway-specific)
  lifecycle-core.ts                 — Platform-generic start/stop/restart/uninstall logic
  status.ts                         — runDaemonStatus entry point
  status.gather.ts                  — DaemonStatus data assembly
  status.print.ts                   — DaemonStatus terminal renderer
  restart-health.ts                 — Post-restart health polling and stale PID termination
  probe.ts                          — WebSocket RPC probe
  response.ts                       — JSON response emitters and action context
  shared.ts                         — Port/URL parsing helpers
  types.ts                          — DaemonStatusOptions, DaemonInstallOptions types

src/commands/
  daemon-install-helpers.ts         — buildGatewayInstallPlan (args + env assembly)
  daemon-runtime.ts                 — Runtime selection ("node" | "bun")
  daemon-install-runtime-warning.ts — Node version manager warning emitter
```

---

## Platform Service Dispatcher

`src/daemon/service.ts:67-114`:

```
resolveGatewayService() → GatewayService
  ├── darwin  → launchd LaunchAgent backend
  ├── linux   → systemd user service backend
  ├── win32   → Windows Task Scheduler backend
  └── other   → throws Error
```

All callers operate uniformly on the returned `GatewayService` object:

```
GatewayService
  ├── label: string
  ├── install(args)        → InstallResult
  ├── uninstall()          → void
  ├── stop()               → void
  ├── restart()            → void
  ├── isLoaded()           → boolean
  ├── readCommand()        → string[]
  └── readRuntime()        → GatewayServiceRuntime
```

---

## Platform Backends

| Platform | Mechanism | Config File | Auto-Restart |
|----------|-----------|-------------|--------------|
| macOS | launchd LaunchAgent | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` | `KeepAlive=true` |
| Linux | systemd user service | `~/.config/systemd/user/openclaw-gateway.service` | `Restart=always`, `RestartSec=5` |
| Windows | Task Scheduler | Task `"OpenClaw Gateway"`, script `gateway.cmd` | `ONLOGON` trigger only |

### macOS (launchd)

- Bootstrap domain: `gui/<uid>` — requires logged-in GUI session, fails under SSH/headless
- Install: `bootout` → `unload` → `enable` → `bootstrap` → `kickstart`
- Restart: `launchctl kickstart -k gui/<uid>/ai.openclaw.gateway`
- Stop: `launchctl bootout gui/<uid>/ai.openclaw.gateway`
- Logs: `~/.openclaw/logs/gateway.log` and `gateway.err.log`
- Legacy cleanup: moves old plists to `~/.Trash/`

### Linux (systemd)

- Requires user linger for survival after logout: `loginctl enable-linger <user>`
- Unit content: `After=network-online.target`, `Restart=always`, `RestartSec=5`, `KillMode=process`
- Install: mkdir → write unit → `daemon-reload` → `enable` → `restart`
- WSL detection: provides WSL2 setup hints when systemd unavailable

### Windows (Task Scheduler)

- Script: `~\.openclaw\gateway.cmd` (CMD batch file)
- Trigger: `ONLOGON` — runs at login, not a persistent service
- Run rights: `LIMITED` (not elevated), `NP` (no password), `IT` (interactive)
- No automatic respawn on crash

---

## Daemon Lifecycle

### Install

```
openclaw gateway install [--port N] [--runtime node] [--token T] [--force]
  │
  ├── Check Nix mode → fail if OPENCLAW_NIX_MODE
  ├── resolveGatewayService()
  ├── service.isLoaded() → if loaded + !force → "already installed"
  ├── resolveGatewayAuth() → determine token need
  ├── Auto-generate token if needed → persist to openclaw.json
  ├── buildGatewayInstallPlan()
  │     ├── resolvePreferredNodePath()     → pick running or system node
  │     ├── resolveGatewayProgramArguments() → build argv
  │     └── buildServiceEnvironment()      → minimal PATH + env vars
  └── service.install({ programArguments, environment })
```

### Start

```
openclaw gateway start
  └── service.isLoaded()? → service.restart()
        darwin: launchctl kickstart -k gui/$UID/ai.openclaw.gateway
        linux:  systemctl --user restart openclaw-gateway.service
        win32:  schtasks /Run /TN "OpenClaw Gateway"
```

"Start" calls `service.restart()` because the service was already registered at install time.

### Stop

```
openclaw gateway stop
  └── service.isLoaded()? → service.stop()
        darwin: launchctl bootout gui/$UID/ai.openclaw.gateway
        linux:  systemctl --user stop openclaw-gateway.service
        win32:  schtasks /End /TN "OpenClaw Gateway"
```

### Restart (with Health Check)

```
openclaw gateway restart
  ├── resolveGatewayRestartPort()
  ├── checkTokenDrift() → warn if service env token ≠ config token
  ├── service.restart()
  └── waitForGatewayHealthyRestart()
        ├── polls up to 8x with 450ms delay
        ├── inspectGatewayRestart() → readRuntime() + inspectPortUsage()
        └── healthy = status === "running" && process owns the port
```

If stale PIDs found: `SIGTERM` → 400ms → `SIGKILL`.

### Uninstall

```
openclaw gateway uninstall
  ├── service.isLoaded()? → service.stop() (best-effort)
  ├── service.uninstall()
  │     darwin: bootout + unload, move plist to ~/.Trash/
  │     linux:  systemctl disable --now, unlink unit
  │     win32:  schtasks /Delete /F, unlink script
  └── verify unregistered
```

---

## Lock File Management

`src/infra/gateway-lock.ts`

### Lock File

No traditional PID files. JSON lock file prevents multiple gateway instances for the same config:

- **Path**: `gateway.<hash>.lock` where hash is SHA-256 of config file path (8 chars)
- **Content**: `{ pid, createdAt, configPath, startTime? }`
- **Acquisition**: `"wx"` flag (exclusive create, atomic on POSIX), polls 100ms up to 5s
- **Release**: close handle + delete file

### Stale Lock Detection

1. `process.kill(pid, 0)` — cross-platform liveness check
2. Linux: compare `startTime` from `/proc/<pid>/stat` to detect PID reuse
3. Fallback: check `/proc/<pid>/cmdline` for gateway argv patterns
4. Timestamp check: if `createdAt` or mtime > 30s, treat as stale

---

## Signal Handling

`src/macos/gateway-daemon.ts:210-233`:

| Signal | Action |
|--------|--------|
| `SIGTERM` | Graceful stop: `shuttingDown=true`, 5s force-exit timer, `server.close()`, `process.exit(0)` |
| `SIGINT` | Same as SIGTERM |
| `SIGUSR1` | Authorized restart: drain tasks (30s timeout), `server.close()`, respawn |

### Restart Respawn Logic (`process-respawn.ts`)

```
restartGatewayProcessWithFreshPid()
  │
  ├── Supervised (launchd/systemd env detected)?
  │     └── process.exit(0) → supervisor restarts
  │
  ├── OPENCLAW_NO_RESPAWN=1?
  │     └── In-process restart (resolve while-loop Promise)
  │
  └── Otherwise (standalone):
        └── spawn(process.execPath, args, {detached:true})
            child.unref()
            process.exit(0)
```

Supervised detection via env vars: `LAUNCH_JOB_LABEL`, `LAUNCH_JOB_NAME`, `INVOCATION_ID`, `SYSTEMD_EXEC_PID`, `JOURNAL_STREAM`.

---

## Service Config Audit

`service-audit.ts:393-414` checks:

| Issue Code | Description |
|------------|-------------|
| `gateway-command-missing` | Service doesn't include `gateway` subcommand |
| `gateway-token-mismatch` | Service env token ≠ config file token |
| `gateway-runtime-bun` | Bun incompatible with WhatsApp/Telegram |
| `gateway-runtime-node-version-manager` | nvm/fnm/volta paths break after upgrades |
| `gateway-path-missing` | No PATH set in service env |
| `launchd-keep-alive` | Plist missing auto-start fields |
| `launchd-run-at-load` | Plist missing RunAtLoad |
| `systemd-after-network-online` | Unit missing network dependency |
| `systemd-restart-sec` | Unit missing restart delay |

---

## Log Management

- **macOS**: `~/.openclaw/logs/gateway.log` and `gateway.err.log` via plist `StandardOutPath`/`StandardErrorPath`. No rotation implemented.
- **Linux**: journald via `journalctl --user -u openclaw-gateway`
- **Windows**: No log file configuration

Error pattern scanning (`diagnostics.ts:4-10`) surfaces last error line from logs when daemon is running but port not busy:
- `refusing to bind gateway`
- `gateway auth mode`
- `gateway start blocked`
- `failed to bind gateway socket`
- `tailscale .* requires`

---

## Environment Variables

| Variable | Effect |
|----------|--------|
| `OPENCLAW_STATE_DIR` | Override `~/.openclaw` state dir |
| `OPENCLAW_PROFILE` | Profile suffix (`~/.openclaw-<profile>`) |
| `OPENCLAW_GATEWAY_PORT` | Gateway listen port |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token |
| `OPENCLAW_LAUNCHD_LABEL` | Override macOS plist label |
| `OPENCLAW_SYSTEMD_UNIT` | Override systemd unit name |
| `OPENCLAW_WINDOWS_TASK_NAME` | Override Windows task name |
| `OPENCLAW_LOG_PREFIX` | Log file name prefix |
| `OPENCLAW_CONFIG_PATH` | Config file path override |
| `OPENCLAW_NO_RESPAWN` | Disable out-of-process restart |
| `OPENCLAW_ALLOW_MULTI_GATEWAY` | Skip lock acquisition |
| `OPENCLAW_SERVICE_MARKER` | Service identity marker |
| `OPENCLAW_SERVICE_KIND` | `"gateway"` or `"node"` |
| `OPENCLAW_SERVICE_VERSION` | Version embedded in service env |

---

## Data Flow — Install

```
CLI args (--port, --runtime, --token, --force)
        │
        ├── loadConfig()                    → openclaw.json
        ├── resolveGatewayAuth()            → auth mode, existing token
        ├── [auto-generate token if needed] → writeConfigFile()
        ├── buildGatewayInstallPlan()
        │     ├── resolvePreferredNodePath()
        │     ├── resolveGatewayProgramArguments()
        │     └── buildServiceEnvironment()
        └── service.install({ programArguments, environment })
              │
         ┌────┴──────────┬──────────────┐
         ▼               ▼              ▼
       macOS           Linux          Windows
    write plist      write .service   write .cmd
    launchctl        systemctl        schtasks /Create
    bootstrap        daemon-reload    schtasks /Run
    kickstart        enable, restart
```

## Data Flow — Status

```
openclaw gateway status [--probe] [--deep]
        │
        ├── service.isLoaded()       → supervisor query
        ├── service.readCommand()    → parse config file for argv
        ├── service.readRuntime()    → { status, pid, state, lastExitStatus }
        ├── auditGatewayServiceConfig()  → ServiceConfigAudit
        ├── inspectPortUsage(port)   → lsof/ss/netstat
        ├── readLastGatewayErrorLine() → scan logs (if running but port not busy)
        ├── findExtraGatewayServices() → scan for multi-instance
        └── probeGatewayStatus() [if --probe] → WebSocket RPC
```

## Data Flow — Signal Handling and Restart

```
Running Gateway Process
        │
        │  SIGTERM / SIGINT
        ├───────────────► shuttingDown=true
        │                 forceExit timer (5s)
        │                 server.close()
        │                 process.exit(0)
        │
        │  SIGUSR1 (authorized)
        └───────────────► drain tasks (30s)
                          server.close()
                          restartGatewayProcessWithFreshPid()
                            │
               ┌────────────┼──────────────┐
               ▼            ▼              ▼
          supervised    NO_RESPAWN=1    standalone
          process.exit  in-process     spawn + unref
          → supervisor  restart        process.exit
            restarts    (while loop)   → fresh PID
```

---

## Key Types

| Type | File:Line | Purpose |
|------|-----------|---------|
| `GatewayService` | `service.ts:54-65` | Unified platform interface |
| `GatewayServiceInstallArgs` | `service-types.ts:3-10` | Install parameters |
| `GatewayServiceRuntime` | `service-runtime.ts:1-13` | Runtime status (status, pid, state) |
| `DaemonStatus` | `cli/daemon-cli/status.gather.ts:44-96` | Full status data |
| `LockPayload` | `infra/gateway-lock.ts:12-17` | Lock file content |
| `ServiceConfigAudit` | `service-audit.ts:31-47` | Config audit result |
