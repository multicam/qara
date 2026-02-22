# CLI System Architecture

## Overview

The CLI is built on Commander.js with aggressive lazy loading — commands are registered as placeholders and only dynamically imported on invocation. Nine high-frequency commands bypass Commander entirely via a hand-parsed fast-path router. The TUI is built on `@mariozechner/pi-tui` with WebSocket gateway connectivity.

---

## Boot Sequence

```
openclaw.mjs                                      <- shebang binary
|
+- module.enableCompileCache()                    Node compile cache
+- import("./dist/entry.js")
   |
   +- entry.ts
      |
      +- 1. Suppress experimental warnings
      |     If --disable-warning not present:
      |       respawn as child with the flag
      |       (guard: OPENCLAW_NODE_OPTIONS_READY=1)
      |
      +- 2. Profile environment
      |     parseCliProfileArgs(argv) -> --dev or --profile <name>
      |     applyCliProfileEnv() -> set OPENCLAW_STATE_DIR + CONFIG_PATH
      |     Remove flags from argv (Commander never sees them)
      |
      +- 3. import("./cli/run-main.js").runCli(process.argv)
         |
         +- runCli()                              <- run-main.ts:64
            |
            +- normalizeWindowsArgv(argv)
            +- loadDotEnv({ quiet: true })
            +- normalizeEnv()                     canonicalize OPENCLAW_* vars
            +- ensureOpenClawCliOnPath()           add CLI to PATH if needed
            +- assertSupportedRuntime()            minimum Node version check
            |
            +- tryRouteCli(argv)                  FAST PATH (bypasses Commander)
            |   [src/cli/route.ts] calls findRoutedCommand() [src/cli/program/routes.ts]
            |   9 routes: health, status, sessions, config get/unset,
            |   models list/status, agents list, memory status
            |   -> parse argv by hand, call command directly, return true
            |
            +- (if fast path didn't match):
            +- enableConsoleCapture()
            +- buildProgram()                     Commander program factory
            |   +- createProgramContext()          version + channel options
            |   +- configureProgramHelp()          version, help formatting
            |   +- registerPreActionHooks()        config guard, banner, verbose
            |   +- registerProgramCommands()       all lazy stubs
            |
            +- Eager-load primary command if known
            |   registerCoreCliByName(program, ctx, primary, argv)
            |   registerSubCliByName(program, primary)
            |
            +- registerPluginCliCommands()         if not a builtin
            +- program.parseAsync(argv)
```

---

## Directory Structure

### `src/cli/`

```
src/cli/
├── run-main.ts               <- runCli() — main CLI orchestrator
├── program.ts                <- Re-export barrel for buildProgram
├── program/
│   ├── build-program.ts      <- buildProgram() — Commander program factory
│   ├── context.ts            <- ProgramContext type + createProgramContext()
│   ├── program-context.ts    <- Symbol-keyed context attach/retrieve
│   ├── help.ts               <- configureProgramHelp() — formatting, examples
│   ├── preaction.ts          <- registerPreActionHooks() — config guard, banner
│   ├── config-guard.ts       <- ensureConfigReady() — validate config before commands
│   ├── routes.ts             <- findRoutedCommand(path) — routing table and RouteSpec type definitions
│   ├── command-registry.ts   <- Core command lazy-load stubs (setup, agent, config, etc.)
│   ├── register.agent.ts     <- openclaw agent / agents
│   ├── register.configure.ts <- openclaw configure
│   ├── register.maintenance.ts <- openclaw doctor / dashboard / reset / uninstall
│   ├── register.message.ts   <- openclaw message (delegates to message/ subdirectory)
│   ├── register.onboard.ts   <- openclaw onboard
│   ├── register.setup.ts     <- openclaw setup
│   ├── register.status-health-sessions.ts <- openclaw status / health / sessions
│   ├── register.subclis.ts   <- Sub-CLI lazy-load stubs (gateway, tui, models, etc.)
│   ├── helpers.ts            <- Utility module: collectOption(), parsePositiveIntOrUndefined()
│   ├── action-reparse.ts     <- reparseProgramFromActionArgs() — re-parse after lazy load
│   └── message/              <- Message subcommand registrars (12 files)
│       ├── register.send.ts
│       ├── register.read-edit-delete.ts
│       ├── register.reactions.ts
│       ├── register.broadcast.ts
│       ├── register.thread.ts
│       ├── register.pins.ts
│       ├── register.poll.ts
│       ├── register.emoji-sticker.ts
│       ├── register.discord-admin.ts
│       ├── register.permissions-search.ts
│       └── helpers.ts
├── cli-utils.ts              <- runCommandWithRuntime(), option helpers
├── banner.ts                 <- ASCII banner for startup
├── theme.ts                  <- ANSI color theme for CLI output
└── runtime.ts                <- defaultRuntime — global I/O abstraction
```

### `src/commands/`

```
src/commands/
├── onboard.ts                       <- Onboard command implementation
├── onboard-interactive.ts           <- Interactive wizard flow
├── doctor.ts                        <- Doctor command implementation
├── config-cli.ts                    <- openclaw config get/set/unset/edit/path/schema
├── gateway-cli.ts                   <- openclaw gateway run/status/call/health/probe
├── tui-cli.ts                       <- openclaw tui
├── models-cli.ts                    <- openclaw models list/status/set/scan
├── memory-cli.ts                    <- openclaw memory search/status/reindex
├── browser-cli.ts                   <- openclaw browser
├── logs-cli.ts                      <- openclaw logs
├── system-cli.ts                    <- openclaw system events/heartbeat/presence
├── nodes-cli.ts                     <- openclaw nodes
├── devices-cli.ts                   <- openclaw devices
├── node-cli.ts                      <- openclaw node (headless host)
├── sandbox-cli.ts                   <- openclaw sandbox
├── cron-cli.ts                      <- openclaw cron
├── dns-cli.ts                       <- openclaw dns
├── docs-cli.ts                      <- openclaw docs
├── hooks-cli.ts                     <- openclaw hooks
├── webhooks-cli.ts                  <- openclaw webhooks
├── qr-cli.ts                        <- openclaw qr
├── pairing-cli.ts                   <- openclaw pairing
├── plugins-cli.ts                   <- openclaw plugins
├── channels-cli.ts                  <- openclaw channels
├── directory-cli.ts                 <- openclaw directory
├── security-cli.ts                  <- openclaw security
├── skills-cli.ts                    <- openclaw skills
├── update-cli.ts                    <- openclaw update
├── completion-cli.ts                <- openclaw completion
├── exec-approvals-cli.ts            <- openclaw approvals
├── acp-cli.ts                       <- openclaw acp
└── clawbot-cli.ts                   <- openclaw clawbot (legacy)
```

---

## Full Command Tree

### Core Commands (`command-registry.ts`)

| Command | Description |
|---|---|
| `setup` | Initialize local config and workspace |
| `onboard` | Interactive onboarding wizard |
| `configure` | Interactive setup wizard for creds/channels/gateway |
| `config` | Non-interactive config get/set/unset/edit/path/schema |
| `doctor` | Health checks + quick fixes |
| `dashboard` | Open Control UI |
| `reset` | Reset local config/state |
| `uninstall` | Uninstall gateway service + data |
| `message` | Send/read/manage messages (+ subcommands) |
| `memory` | Search and reindex memory files |
| `agent` | Run one agent turn via the Gateway |
| `agents` | Manage isolated agents (list/add/delete/set-identity) |
| `status` | Channel health + recent sessions |
| `health` | Fetch gateway health |
| `sessions` | List stored sessions |
| `browser` | Manage dedicated browser |

### Sub-CLI Commands (`register.subclis.ts`)

| Command | Subcommands |
|---|---|
| `gateway` | run, status, call, health, probe, discover, usage-cost |
| `daemon` | Legacy gateway service alias |
| `tui` | Terminal UI connected to Gateway |
| `models` | list, status, set, scan |
| `logs` | Tail gateway file logs |
| `system` | events, heartbeat, presence |
| `nodes` | Node pairing and commands |
| `devices` | Device pairing + token management |
| `node` | Headless node host service |
| `sandbox` | Container management |
| `cron` | Cron job management |
| `dns` | DNS helpers (Tailscale + CoreDNS) |
| `docs` | Search live docs |
| `hooks` | Internal agent hooks |
| `webhooks` | Webhook helpers |
| `qr` | iOS pairing QR code |
| `pairing` | Secure DM pairing |
| `plugins` | Plugin management |
| `channels` | Manage chat channels |
| `directory` | Lookup contacts/groups |
| `security` | Security audits |
| `skills` | List/inspect skills |
| `update` | Update OpenClaw |
| `completion` | Shell completion script |
| `approvals` | Exec approval management |
| `acp` | Agent Control Protocol tools |
| `clawbot` | Legacy clawbot aliases |

---

## Lazy Loading Mechanism

Every command starts as a lightweight placeholder:

```
registerLazyCoreCommand(program, ctx, entry, command)
|
+- program.command(name).description(desc)
+- placeholder.allowUnknownOption(true)          ignore unknown flags
+- placeholder.allowExcessArguments(true)         ignore extra args
+- placeholder.action(async (...actionArgs) => {
      removeEntryCommands(program, entry)         remove all stubs for this entry
      await entry.register({ program, ctx })      dynamic import + real register
      await reparseProgramFromActionArgs(...)      reconstruct argv, reparse
   })
```

When the primary command is known upfront (not `--help`), the system eagerly loads just that command's real implementation, skipping the lazy stub + reparse cycle.

---

## Fast-Path Routing

The fast-path implementation is split across two files:

- **`src/cli/route.ts:22`** — `tryRouteCli()` — public entry point called from `run-main.ts`. Calls `findRoutedCommand()` to look up a matching route and `prepareRoutedCommand()` to execute it. Returns `true` if a route matched, `false` to fall through to Commander.
- **`src/cli/program/routes.ts:249`** — `findRoutedCommand(path)` — contains the routing table, `RouteSpec` type definitions, and the hand-parsing utilities (`hasFlag`, `getFlagValue`, `getCommandPositionals`).

Nine routes bypass Commander entirely for startup speed:

```
tryRouteCli(argv)  [src/cli/route.ts]
|
+- findRoutedCommand(path)  [src/cli/program/routes.ts]
   |
   +- routeHealth          "openclaw health"
   +- routeStatus          "openclaw status"
   +- routeSessions        "openclaw sessions"
   +- routeAgentsList      "openclaw agents list"
   +- routeMemoryStatus    "openclaw memory status"
   +- routeConfigGet       "openclaw config get <key>"
   +- routeConfigUnset     "openclaw config unset <key>"
   +- routeModelsList      "openclaw models list"
   +- routeModelsStatus    "openclaw models status"
```

Each route parses argv by hand and calls the command function directly. If any flag requires `=` syntax but has none, the route returns `false` and falls through to Commander.

---

## Pre-Action Hooks (`preaction.ts`)

A single `program.hook("preAction", ...)` runs before every command:

```
preAction hook
|
+- setProcessTitleForCommand()        e.g. process.title = "openclaw-gateway"
+- Skip if --help or --version
+- emitCliBanner(version)             ASCII banner (unless suppressed)
+- setVerbose(flag)                   from --verbose / --debug
+- Skip config guard for: doctor, completion
+- ensureConfigReady()                validate config, run migrations if needed
|   |
|   +- shouldMigrateStateFromPath() -> run doctor migrations (once per process)
|   +- Read config snapshot
|   +- If invalid: print error, exit(1) unless ALLOWED_INVALID_COMMANDS
|
+- If command in PLUGIN_REQUIRED_COMMANDS (message, channels, directory):
    ensurePluginRegistryLoaded()
```

---

## Context & Dependency Injection

### ProgramContext

```typescript
type ProgramContext = {
  programVersion: string;
  channelOptions: string[];           // ["whatsapp", "telegram", "discord", ...]
  messageChannelOptions: string;      // joined with "|"
  agentChannelOptions: string;        // "last|whatsapp|telegram|..."
};
```

Attached to Commander program via `Symbol.for("openclaw.cli.programContext")`:

```typescript
setProgramContext(program, ctx);       // attach
getProgramContext(program);            // retrieve in sub-registrars
```

### defaultRuntime

Global I/O abstraction (`src/cli/runtime.ts`) passed into every command function:

```typescript
interface RuntimeEnv {
  log(...args: any[]): void;      // stdout
  error(...args: any[]): void;    // stderr
  exit(code: number): void;       // process.exit
}
```

Swappable in tests — commands never call `process.exit` or `console.log` directly.

---

## TUI — Terminal UI (`src/tui/tui.ts`)

Built on `@mariozechner/pi-tui` with a `GatewayChatClient` WebSocket connection.

### Components

```
+----------------------------------------------------------+
|  Header (Text) — session name + model info               |
+----------------------------------------------------------+
|                                                          |
|  ChatLog — scrollable message history                    |
|  (assistant messages, tool calls, system events)         |
|                                                          |
+----------------------------------------------------------+
|  StatusContainer — Loader (busy) or Text (idle)          |
+----------------------------------------------------------+
|  Footer (Text) — keybindings hint                        |
+----------------------------------------------------------+
|  CustomEditor — text input with submit handler           |
+----------------------------------------------------------+
```

### Keyboard Bindings

| Key | Action |
|---|---|
| `Enter` | Submit message |
| `Ctrl+C` | Clear input / double-press to exit |
| `Ctrl+D` | Exit immediately |
| `Ctrl+O` | Toggle tool call expansion |
| `Ctrl+L` | Open model selector overlay |
| `Ctrl+G` | Open agent selector overlay |
| `Ctrl+P` | Open session selector overlay |
| `Ctrl+T` | Toggle thinking messages |
| `Escape` | Abort active agent turn |

### Input Parsing

```
Submit handler (createEditorSubmitHandler)
|
+- Starts with "!" (not bare "!"):
|   handleBangLine() -> run as local shell command
|
+- Starts with "/":
|   handleCommand() -> slash command (/clear, /session, /model, etc.)
|
+- Otherwise:
    sendMessage() -> send to gateway via GatewayChatClient
```

### Status States

- `sending` / `waiting` / `streaming` / `running` -> animated Loader
- `idle` -> plain Text
- 1-second timer updates elapsed time during busy states
- 120ms timer animates "waiting" phrases

---

## Onboarding Wizard

```
openclaw onboard
|
+- Validate deprecated auth choice strings
+- If --reset: handleReset("full", workspaceDir, runtime)
+- If Windows: print WSL2 recommendation
|
+- Fork:
   +- --non-interactive: runNonInteractiveOnboarding()
   +- interactive: runInteractiveOnboarding()
       |
       +- createClackPrompter() (@clack/prompts)
       +- runOnboardingWizard(opts, runtime, prompter)
       |   Steps: API key, model selection, channel setup,
       |   gateway auth, daemon install, first message test
       +- Catch WizardCancelledError -> exit(1)
       +- finally: restoreTerminalState()
```

---

## Doctor / Diagnostics

```
openclaw doctor [--fix] [--non-interactive]
|
+- Sequential check/repair steps (15+):
|
+- 1.  maybeOfferUpdateBeforeDoctor       offer update if available
+- 2.  maybeRepairUiProtocolFreshness     check UI protocol
+- 3.  noteSourceInstallIssues            detect source-only installs
+- 4.  loadAndMaybeMigrateDoctorConfig    load config + schema migrations
+- 5.  Gateway auth check                 if no token, prompt to generate
+- 6.  detectLegacyStateMigrations        detect old state layout
+- 7.  runLegacyStateMigrations           migrate old state
+- 8.  noteStateIntegrity                 check workspace integrity
+- 9.  noteSessionLockHealth              scan for stale lock files
+- 10. maybeRepairSandboxImages           pull/prune Docker images
+- 11. maybeRepairGatewayServiceConfig    check systemd/launchctl service
+- 12. noteSecurityWarnings               flag insecure config
+- 13. ensureSystemdUserLingerInteractive  Linux: loginctl enable-linger
+- 14. noteMemorySearchHealth             check memory search index
+- 15. doctorShellCompletion              check/repair shell completion
+- 16. checkGatewayHealth                 probe gateway health
+- 17. maybeRepairGatewayDaemon           offer to start daemon
|
+- If config mutated: write updated config file
```

Uses `@clack/prompts` for interactive confirmations. `createDoctorPrompter` provides non-interactive mode.

---

## Plugin CLI Integration

```
registerPluginCliCommands(program, config)          <- plugins/cli.ts
|
+- loadOpenClawPlugins({ config, workspaceDir })
+- Get existing command names from Commander
+- For each plugin CLI registrar:
    +- Check command name collisions (builtins always win)
    +- If no collision: entry.register({ program, config, workspaceDir, logger })
```

Called from:
- `run-main.ts:119` — when primary command is not a builtin
- Inside `pairing` sub-CLI registrar (needs channels)
- Inside `plugins` sub-CLI registrar

---

## Error Handling

### Four Layers

```
Layer 1 — Per-command wrapper (cli-utils.ts:34-49)
  runCommandWithRuntime(runtime, action, onError?)
    try { await action() }
    catch { runtime.error(err); runtime.exit(1) }

Layer 2 — Commander output (help.ts:98)
  outputError: (str, write) => write(theme.error(str))
  Validation errors (missing options, unknown commands) styled red

Layer 3 — Process-level (run-main.ts:87-93)
  process.on("uncaughtException", ...)
  installUnhandledRejectionHandler()
  -> formatUncaughtError() -> process.exit(1)

Layer 4 — Config guard early exit (config-guard.ts:92-94)
  Invalid config before any command runs
  Prints structured error with path + "Run: openclaw doctor --fix"
  exit(1) unless in ALLOWED_INVALID_COMMANDS
```

---

## Help System

```
configureProgramHelp(program, ctx)                  <- help.ts
|
+- Root-level flags: --dev, --profile <name>
+- Formatted output:
|   sortSubcommands: true
|   ANSI coloring via theme.option() / theme.command()
|   Commands with subcommands get "*" suffix: "gateway *"
|   Colorized headings: "Usage:", "Options:", "Commands:"
+- Before-help: ASCII banner (if not already emitted)
+- After-help: 9 example invocations
    openclaw onboard
    openclaw agent -m "hello"
    openclaw gateway run
    openclaw tui
    openclaw status
    openclaw doctor
    ...
```

---

## Key Architectural Patterns

**Lazy stub + re-parse** — Commands are registered as placeholders with `allowUnknownOption(true)`. On invocation, the real module is dynamically imported, stubs removed, and Commander re-parses the same argv with the real command definition. This keeps startup time fast regardless of how many commands exist.

**Fast-path routing** — The 9 most common commands bypass Commander entirely, parsing argv by hand. `tryRouteCli()` (`src/cli/route.ts`) is the public entry point; `findRoutedCommand()` (`src/cli/program/routes.ts`) holds the routing table and `RouteSpec` type definitions. This avoids the overhead of building the full Commander program for quick operations like `openclaw health`.

**Symbol-keyed context** — `ProgramContext` is attached to the Commander program via `Symbol.for()`, avoiding polluting Commander's public API while making context available to all sub-registrars.

**`defaultRuntime` I/O abstraction** — Every command receives a `RuntimeEnv` with `log`, `error`, `exit` methods. Never calls `process.exit` or `console.log` directly. Enables testability by swapping the runtime in test harnesses.

**`runCommandWithRuntime` wrapper** — Uniform error-to-exit conversion. Every command action is wrapped, ensuring consistent error output and exit codes.
