# Plugin System Architecture

## Overview

The plugin system is OpenClaw's extensibility framework. Plugins can register channels, tools, hooks, HTTP routes, CLI commands, services, and model providers. Discovery scans four origin tiers with security checks, loading uses `jiti` for transparent TypeScript execution, and registration uses a closure-captured API per plugin.

---

## Directory Structure

```
src/plugins/
├── types.ts                  — All exported types (OpenClawPluginApi, PluginHookName, etc.)
├── manifest.ts               — openclaw.plugin.json loader + PackageManifest types
├── discovery.ts              — Filesystem scanning, security checks, PluginCandidate production
├── manifest-registry.ts      — Merges candidates with manifests; handles origin precedence
├── loader.ts                 — Main entry: loadOpenClawPlugins(), jiti, register() invocation
├── registry.ts               — createPluginRegistry(), PluginRegistry shape, createApi() factory
├── hooks.ts                  — createHookRunner() with runVoidHook / runModifyingHook
├── hook-runner-global.ts     — Singleton global hook runner (initializeGlobalHookRunner)
├── runtime.ts                — Global PluginRegistry state via Symbol.for
├── runtime/
│   ├── types.ts              — PluginRuntime interface (365 lines of typed imports)
│   ├── index.ts              — createPluginRuntime() — concrete implementation
│   └── native-deps.ts        — formatNativeDependencyHint helper
├── config-state.ts           — normalizePluginsConfig(), resolveEnableState(), memory slot logic
├── config-schema.ts          — JSON schema types/utilities for plugin config validation
├── schema-validator.ts       — validateJsonSchemaValue() wrapper around Ajv
├── enable.ts                 — enablePluginInConfig() — flips enabled:true + adds to allowlist
├── slots.ts                  — Exclusive slot logic (currently only "memory" slot)
├── bundled-dir.ts            — Resolves bundled extensions/ directory path
├── commands.ts               — Plugin command registry (matchPluginCommand, executePluginCommand)
├── services.ts               — startPluginServices() / stop() lifecycle management
├── tools.ts                  — resolvePluginTools() — invokes tool factories with context
├── providers.ts              — resolvePluginProviders() — extracts ProviderPlugin list
├── http-path.ts              — normalizePluginHttpPath()
├── http-registry.ts          — registerPluginHttpRoute() with deregister handle
├── logger.ts                 — createPluginLoaderLogger() adapter
├── path-safety.ts            — safeStatSync, safeRealpathSync, formatPosixMode
├── source-display.ts         — Human-readable source path formatting
├── status.ts                 — Plugin status/display helpers
├── installs.ts / install.ts / uninstall.ts / update.ts — Install lifecycle
└── cli.ts                    — CLI subcommands for plugin management
```

---

## Plugin Manifest Format

### `openclaw.plugin.json` (`manifest.ts:10-21`)

```json
{
  "id": "my-plugin",
  "configSchema": { "type": "object", "properties": {} },
  "kind": "memory",
  "name": "My Plugin",
  "description": "What it does",
  "version": "1.0.0",
  "channels": ["telegram"],
  "providers": ["openai"],
  "skills": ["code-review"],
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true, "advanced": false }
  }
}
```

Required: `id` (non-empty string) and `configSchema` (object). All others optional (`manifest.ts:62-69`).

### `package.json` openclaw metadata (`manifest.ts:130-143`)

```json
{
  "name": "@acme/my-plugin",
  "openclaw": {
    "extensions": ["./dist/index.js", "./dist/extra.js"],
    "channel": {
      "id": "telegram", "label": "Telegram", "order": 1,
      "aliases": ["tg"], "preferOver": ["other-plugin"]
    },
    "install": {
      "npmSpec": "@acme/my-plugin@latest",
      "localPath": "/opt/plugins/mine"
    }
  }
}
```

`extensions` is the array of entry points. If absent, discovery falls back to `index.ts/js/mjs/cjs`.

---

## Discovery

**Entry point**: `discoverOpenClawPlugins()` at `discovery.ts:537`

### Scan Order (four tiers)

```
Priority 0: config    — paths from config.plugins.load.paths
Priority 1: workspace — <workspaceDir>/.openclaw/extensions/
Priority 2: global    — <configDir>/extensions/
Priority 3: bundled   — resolved by resolveBundledPluginsDir()
```

Higher priority (lower number) wins when duplicate plugin IDs are found across tiers.

### Per-directory scan (`discoverInDirectory` at `discovery.ts:320`)

1. Files with `.ts/.js/.mjs/.cjs` extension (excluding `.d.ts`) -> direct candidates
2. Subdirectories with a `package.json` -> reads `extensions` array from `openclaw` key -> each entry becomes a candidate; if empty, tries `index.ts/js/mjs/cjs`

### Bundled directory resolution (`bundled-dir.ts:5-41`)

1. `OPENCLAW_BUNDLED_PLUGINS_DIR` env override
2. `extensions/` sibling to the binary (bun compile)
3. Walk up 6 parent dirs looking for `extensions/`

### Security Checks (`discovery.ts:65-199`)

Each candidate is rejected (with a `"warn"` diagnostic) if:
- Source file escapes the plugin root via symlinks (`source_escapes_root`)
- `stat()` fails (`path_stat_failed`)
- Path is world-writable — mode & 0o002 (`path_world_writable`)
- Ownership UID doesn't match current process UID for non-bundled plugins (`path_suspicious_ownership`)

---

## Loading

**Entry point**: `loadOpenClawPlugins()` at `loader.ts:334`

```
loadOpenClawPlugins()
|
+- 1. Apply test defaults (Vitest: all disabled unless explicit)
|
+- 2. Check registry cache (keyed by workspaceDir + normalized config)
|      Hit -> return cached registry
|
+- 3. Clear plugin commands, create fresh PluginRegistry + PluginRuntime
|
+- 4. Run discovery + manifest registry load
|
+- 5. For each enabled candidate:
|   |
|   +- Check path-escape safety
|   |
|   +- Lazy-init jiti (only when first plugin needs loading)
|   |   createJiti(import.meta.url, {
|   |     interopDefault: true,
|   |     alias: { "openclaw/plugin-sdk": pluginSdkAlias }
|   |   })
|   |
|   +- getJiti()(candidate.source)  — load module
|   |
|   +- Validate config against JSON schema
|   |
|   +- Resolve module export:
|   |   default export is function -> treated as register
|   |   default export is object   -> reads .register or .activate
|   |   module itself              -> fallback
|   |
|   +- Call register(api) synchronously
|
+- 6. Store in cache
+- 7. setActivePluginRegistry()
+- 8. initializeGlobalHookRunner()
```

### jiti Initialization (`loader.ts:392-414`)

```typescript
let jitiLoader: ReturnType<typeof createJiti> | null = null;
const getJiti = () => {
  if (jitiLoader) return jitiLoader;
  jitiLoader = createJiti(import.meta.url, {
    interopDefault: true,
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"],
    alias: {
      "openclaw/plugin-sdk": pluginSdkAlias,
      "openclaw/plugin-sdk/account-id": ...,
    },
  });
  return jitiLoader;
};
```

Avoids TypeScript compilation overhead entirely when all plugins are disabled (common in unit tests).

---

## Registration — `OpenClawPluginApi`

`createApi()` at `registry.ts:472`. Each plugin gets its own api object with its `PluginRecord` captured in closure:

```typescript
// registry.ts:479-503
{
  id: record.id,
  name: record.name,
  version: record.version,
  description: record.description,
  source: record.source,
  config: params.config,                    // full OpenClawConfig
  pluginConfig?: Record<string, unknown>,   // validated plugin-specific config
  runtime: registryParams.runtime,          // PluginRuntime
  logger: normalizeLogger(registryParams.logger),

  // Registration methods (all write to shared PluginRegistry)
  registerTool(tool, opts)
  registerHook(events, handler, opts)
  registerHttpHandler(handler)
  registerHttpRoute({ path, handler })
  registerChannel(registration)
  registerGatewayMethod(method, handler)
  registerCli(registrar, opts)
  registerService(service)
  registerProvider(provider)
  registerCommand(command)
  resolvePath(input)
  on(hookName, handler, opts)               // typed hook
}
```

---

## Plugin API Surface

### Tools (`registry.ts:172-197`)

`registerTool(tool | factory, opts?)` — accepts either:
- A concrete `AnyAgentTool`
- A factory `(ctx: OpenClawPluginToolContext) => AnyAgentTool | AnyAgentTool[] | null`

Factory is called at agent invocation time with session context (agentId, workspaceDir, config). Optional tools require an allowlist entry.

### Hooks — Legacy Path (`registry.ts:199-267`)

`registerHook(events, handler, opts?)` — wires to internal hook system if `config.hooks.internal.enabled === true`. Requires `opts.entry` (a `HookEntry`) or `opts.name`.

### Hooks — Typed Path (`registry.ts:449-463`)

`api.on(hookName, handler, opts?)` — lands in `registry.typedHooks`. The hook name is one of ~20 `PluginHookName` values. Priority is optional integer (higher = runs first).

### HTTP Handlers (`registry.ts:291-330`)

- `registerHttpHandler(handler)` — catch-all; handler returns `boolean` (true = handled)
- `registerHttpRoute({ path, handler })` — path-specific, must start with `/plugins/`

### Channels (`registry.ts:332-358`)

`registerChannel(registration | plugin)` — registers a `ChannelPlugin` with optional `ChannelDock`.

### Gateway Methods (`registry.ts:269-289`)

`registerGatewayMethod(method, handler)` — adds to `registry.gatewayHandlers`. Cannot override core gateway methods.

### CLI Commands (`registry.ts:389-402`)

`registerCli(registrar, opts?)` — registrar receives `{ program, config, workspaceDir, logger }` at CLI startup. `opts.commands` lists command names for display.

### Services (`registry.ts:404-415`)

`registerService(service)` — `service.start(ctx)` called at gateway startup; `service.stop(ctx)` called in reverse order on shutdown.

### Providers (`registry.ts:360-387`)

`registerProvider(provider)` — registers a `ProviderPlugin` (auth methods, model config, OAuth refresh).

### Plugin Commands (`registry.ts:417-447`, `commands.ts`)

`registerCommand(command)` — registers a `/commandName` slash command that bypasses the LLM. Reserved built-in command names are blocked. Commands are processed before agent invocation.

---

## Plugin Lifecycle

```
+-------------------------------------------------------------+
| Phase          | Where                                      |
+----------------+--------------------------------------------+
| Load + register| register(api) called synchronously         |
|                | in loadOpenClawPlugins() (loader.ts:624)   |
+----------------+--------------------------------------------+
| Service start  | startPluginServices() at gateway startup   |
|                | (services.ts:34-59)                        |
+----------------+--------------------------------------------+
| Service stop   | handle.stop() in reverse start order       |
|                | (services.ts:61-74)                        |
+----------------+--------------------------------------------+
| Reload         | loadOpenClawPlugins() called again;         |
|                | cache busted; clearPluginCommands() first   |
+----------------+--------------------------------------------+
```

Both `register` and `activate` are accepted as synonyms on the plugin definition (`types.ts:229-238`).

---

## Hook System

### Two-Tier Design

**Tier 1 — Legacy internal hooks** (`registerHook`):
Enabled only when `config.hooks.internal.enabled === true`. Hooks stored in `registry.hooks[]` with `HookEntry` metadata.

**Tier 2 — Typed hooks** (`api.on()` -> `registry.typedHooks[]`):
Always active. Processed by `createHookRunner()` (`hooks.ts:111`).

### Hook Execution Patterns (`hooks.ts`)

**Void hooks** (fire-and-forget, `runVoidHook` at `hooks.ts:139`):
- All handlers run in **parallel** (`Promise.all`)
- Errors caught and logged (or re-thrown if `catchErrors: false`)
- Used for: `llm_input`, `llm_output`, `agent_end`, `before_compaction`, `after_compaction`, `before_reset`, `message_received`, `message_sent`, `after_tool_call`, `session_start`, `session_end`, `gateway_start`, `gateway_stop`

**Modifying hooks** (sequential, `runModifyingHook` at `hooks.ts:171`):
- Handlers run **one at a time** in priority order (higher number first)
- Results merged: first defined value wins for overrides; `prependContext` concatenated
- Used for: `before_model_resolve`, `before_prompt_build`, `before_agent_start`, `message_sending`, `before_tool_call`, `subagent_spawning`, `subagent_delivery_target`, `subagent_spawned`, `subagent_ended`

**Synchronous hooks** (special hot-path handling):
- `tool_result_persist` (`hooks.ts:421`): sync-only, message threads through handlers
- `before_message_write` (`hooks.ts:486`): sync-only; `block: true` short-circuits immediately

### Subagent Lifecycle Hooks

Four new **modifying (sequential)** hooks have been added for subagent lifecycle control. They run in priority order like other modifying hooks, allowing plugins to intercept, redirect, or annotate subagent operations:

| Hook | When it fires | What plugins can do |
|------|--------------|---------------------|
| `subagent_spawning` | Before a subagent is registered and enqueued | Override target session/agent, inject extra context, or block spawning |
| `subagent_delivery_target` | When resolving where to deliver a subagent's result | Redirect delivery to a different session or channel |
| `subagent_spawned` | After the subagent has been registered and run enqueued | Observe/log spawn; annotate subagent record |
| `subagent_ended` | After the subagent run completes (success or failure) | Post-process results, trigger follow-up actions |

These hooks are registered via `api.on("subagent_spawning", handler)` (typed path) and follow the same priority-sorted sequential merge behavior as other modifying hooks.

---

### Hook Merge Strategies

| Hook | Merge rule |
|------|-----------|
| `before_model_resolve` | First defined `modelOverride`/`providerOverride` wins (highest priority) |
| `before_prompt_build` | Last `systemPrompt` wins; `prependContext` **concatenated** with `\n\n` |
| `message_sending` | Last `content`/`cancel` wins (lower-priority plugins) |
| `before_tool_call` | Last `params`/`block`/`blockReason` wins |
| `subagent_spawning` | First defined `targetOverride`/`block` wins (highest priority) |
| `subagent_delivery_target` | First defined delivery target wins |

### Priority Sorting (`hooks.ts:99-106`)

```typescript
function getHooksForName<K>(registry, hookName): PluginHookRegistration<K>[] {
  return registry.typedHooks
    .filter(h => h.hookName === hookName)
    .toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
```

Higher-priority hooks run first, making the first defined override win for field merges.

### Global Hook Runner (`hook-runner-global.ts`)

```typescript
let globalHookRunner: HookRunner | null = null;
let globalRegistry: PluginRegistry | null = null;
```

`initializeGlobalHookRunner(registry)` called once at end of `loadOpenClawPlugins()`. Consumers call `getGlobalHookRunner()` for the singleton. `hasGlobalHooks(hookName)` provides a cheap check before dispatching.

---

## Plugin Runtime (`PluginRuntime`)

Defined at `runtime/types.ts:179`, constructed at `runtime/index.ts:239`.

The runtime is a deeply nested object providing the full platform surface to extensions:

| Namespace | Contents |
|-----------|----------|
| `runtime.version` | Package version string |
| `runtime.config` | `loadConfig`, `writeConfigFile` |
| `runtime.system` | `enqueueSystemEvent`, `runCommandWithTimeout`, `formatNativeDependencyHint` |
| `runtime.media` | `loadWebMedia`, `detectMime`, `mediaKindFromMime`, `isVoiceCompatibleAudio`, `getImageMetadata`, `resizeToJpeg` |
| `runtime.tts` | `textToSpeechTelephony` |
| `runtime.tools` | `createMemoryGetTool`, `createMemorySearchTool`, `registerMemoryCli` |
| `runtime.channel.text` | Chunking, markdown table conversion, control command detection |
| `runtime.channel.reply` | Reply dispatchers, inbound context, envelope formatting |
| `runtime.channel.routing` | `resolveAgentRoute` |
| `runtime.channel.pairing` | Pairing request/allowlist store |
| `runtime.channel.media` | `fetchRemoteMedia`, `saveMediaBuffer` |
| `runtime.channel.activity` | `recordChannelActivity`, `getChannelActivity` |
| `runtime.channel.session` | Session store/meta helpers |
| `runtime.channel.mentions` | Mention regex builders/matchers |
| `runtime.channel.reactions` | Ack reaction helpers |
| `runtime.channel.groups` | Group policy resolution |
| `runtime.channel.debounce` | Inbound message debounce |
| `runtime.channel.commands` | Command authorization/detection |
| `runtime.channel.discord` | Full Discord API surface |
| `runtime.channel.slack` | Full Slack API surface |
| `runtime.channel.telegram` | Full Telegram API surface |
| `runtime.channel.signal` | Signal API surface |
| `runtime.channel.imessage` | iMessage API surface |
| `runtime.channel.whatsapp` | WhatsApp Web API surface (lazy-loaded via dynamic import) |
| `runtime.channel.line` | LINE Bot API surface |
| `runtime.logging` | `shouldLogVerbose`, `getChildLogger` |
| `runtime.state` | `resolveStateDir` |

WhatsApp modules are lazy-loaded (`runtime/index.ts:160-237`) because they pull in heavy optional dependencies.

---

## Service Management

`startPluginServices()` at `services.ts:34`:

```
For each entry in registry.services:
    await service.start(serviceContext)    <- sequential start
    running.push({ id, stop })

return {
  stop: async () => {
    for (entry of running.toReversed())   <- reverse-order stop
      await entry.stop?.()
  }
}
```

`OpenClawPluginServiceContext` passed to start/stop:
- `config: OpenClawConfig`
- `workspaceDir?: string`
- `stateDir: string`
- `logger: PluginLogger`

Start errors are logged but do not prevent other services from starting.

---

## Plugin Types

### By Kind

| Kind | Behavior |
|------|----------|
| `"memory"` | Exclusive slot — only one active at a time. Default: `"memory-core"` |
| (none) | Generic — any combination of tools, hooks, services, etc. |

### By Origin

| Origin | Location | Default state |
|--------|----------|---------------|
| `bundled` | Shipped with binary | 3 enabled by default (`device-pair`, `phone-control`, `talk-voice`); rest disabled |
| `global` | `~/.openclaw/extensions/` | Enabled by default |
| `workspace` | `.openclaw/extensions/` | Enabled by default |
| `config` | `plugins.load.paths` | Enabled by default |

### By Registration Type

- **Channel plugins** — `api.registerChannel()` with a `ChannelPlugin`
- **Provider plugins** — `api.registerProvider()` with a `ProviderPlugin` (auth, model config, OAuth)
- **Tool plugins** — `api.registerTool()` with concrete tools or factories
- **Generic plugins** — any combination of hooks, services, CLI, HTTP routes, gateway methods

---

## Configuration

### Config Shape (`config-state.ts:5-14`)

```typescript
type NormalizedPluginsConfig = {
  enabled: boolean;              // default true; plugins.enabled
  allow: string[];               // plugins.allow — explicit allowlist
  deny: string[];                // plugins.deny — blocklist
  loadPaths: string[];           // plugins.load.paths
  slots: { memory?: string | null };  // "none" -> null; default "memory-core"
  entries: Record<string, {
    enabled?: boolean;
    config?: unknown;
  }>;
}
```

### Enable/Disable Logic (`resolveEnableState` at `config-state.ts:164-195`)

```
1. plugins.enabled === false         -> ALL disabled
2. id in deny list                   -> disabled
3. allow list non-empty, id not in   -> disabled
4. id matches memory slot            -> enabled
5. entries[id].enabled = true/false  -> explicit override
6. Bundled + in DEFAULT_ENABLED list -> enabled
7. Other bundled                     -> disabled
8. Non-bundled (global/workspace)    -> enabled by default
```

### Memory Slot Exclusivity (`slots.ts:16-18`)

Only one memory plugin can be active. `resolveMemorySlotDecision()` enforces this:
- Default slot winner: `"memory-core"`
- Config override: `plugins.slots.memory = "memory-lancedb"` or `"none"` (disables)
- If two memory plugins try to activate, only the slot winner loads

### Programmatic Enable (`enable.ts:10`)

`enablePluginInConfig(cfg, pluginId)` sets `entries[id].enabled = true` and calls `ensurePluginAllowlisted()`.

---

## Key Architectural Patterns

**Factory-captured-in-closure API** — Each plugin gets a unique `OpenClawPluginApi` where `PluginRecord` is pre-bound via closure. All registration calls track back to the originating plugin for diagnostics and status reporting.

**Lazy jiti initialization** — The TypeScript/ESM loader is only created when at least one plugin is enabled. Avoids compilation overhead in test environments where plugins are typically disabled.

**Global registry via `Symbol.for`** — Uses `Symbol.for("openclaw.pluginRegistryState")` on `globalThis` so the active registry is accessible across module instances and dynamic import boundaries without import cycles.

**Priority-sorted modifying hook chain** — Modifying hooks run sequentially in descending priority order. Higher-priority plugins' overrides take precedence (first defined value wins).

**Parallel void hooks, sequential modifying hooks** — Void hooks (fire-and-forget) run in parallel for performance. Modifying hooks (that transform data) run sequentially to ensure deterministic merge behavior.

**Reverse-order service shutdown** — Services are stopped in the reverse of their start order, ensuring dependencies are unwound correctly.
