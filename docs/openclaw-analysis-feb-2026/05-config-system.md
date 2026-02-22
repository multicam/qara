# Configuration System Architecture

## Overview

The config system manages a JSON5 config file with env var interpolation, `$include` directives, Zod validation, 7 layers of defaults, atomic writes with backup rotation, and a migration system for legacy config shapes. The session store is a JSON file with in-process locking and TTL caching.

---

## Directory Structure

```
src/config/
├── config.ts                 — Public re-export barrel (module's public API)
├── io.ts                     — Core I/O: loadConfig, readConfigFileSnapshot, writeConfigFile
├── schema.ts                 — JSON Schema + UI hints from Zod schema
├── zod-schema.ts             — Root OpenClawSchema Zod object
├── zod-schema.*.ts           — Sub-schemas per domain (agents, hooks, channels, providers, etc.)
├── types.ts                  — Re-export barrel for all TS type definitions
├── types.openclaw.ts         — OpenClawConfig type + ConfigFileSnapshot type
├── types.*.ts                — Per-domain TS types (agents, gateway, channels, plugins, etc.)
├── defaults.ts               — applyXxxDefaults() functions applied after validation
├── paths.ts                  — Path resolution: state dir, config path, OAuth dir
├── validation.ts             — validateConfigObjectWithPlugins() — Zod + plugin schemas
├── env-substitution.ts       — ${VAR} interpolation in config string values
├── env-vars.ts               — applyConfigEnvVars() — injects config.env vars into process.env
├── env-preserve.ts           — restoreEnvVarRefs() — restores ${VAR} on write-back
├── includes.ts               — $include directive: merges external JSON5 files
├── merge-patch.ts            — RFC 7396 merge-patch: applyMergePatch()
├── merge-config.ts           — Higher-level config merge utilities
├── runtime-overrides.ts      — In-memory overrides: setConfigOverride, applyConfigOverrides
├── normalize-paths.ts        — Resolves ~ and relative paths within config
├── backup-rotation.ts        — Rotates .bak, .bak.1 ... .bak.4 on every write
├── redact-snapshot.ts        — Redacts sensitive fields for Control UI
├── legacy.ts                 — findLegacyConfigIssues + applyLegacyMigrations
├── legacy.rules.ts           — Rules that detect fatal legacy keys
├── legacy.migrations.ts      — Combines all 3 migration part files
├── legacy.migrations.part-{1,2,3}.ts — 20 named migration transforms (~1137 lines)
├── legacy-migrate.ts         — Public migrateLegacyConfig() entry point
├── legacy.shared.ts          — Shared types/utilities for migration authoring
├── cache-utils.ts            — TTL helpers for config and session caches
├── agent-dirs.ts             — Detects duplicate agent workspace directories
├── agent-limits.ts           — Default concurrency constants
├── config-paths.ts           — Dot-notation path parsing/set/unset for runtime overrides
├── commands.ts               — Config for custom command definitions
├── schema.hints.ts           — ConfigUiHints — per-path UI metadata
├── schema.labels.ts          — Human-readable labels for schema fields
├── schema.help.ts            — Help text for schema fields
├── plugins-allowlist.ts      — Plugin allow/deny filtering
├── plugin-auto-enable.ts     — Logic for auto-enabling plugins
├── talk.ts                   — TTS API key resolution
├── version.ts                — compareOpenClawVersions()
├── logging.ts                — Logging config utilities
└── sessions/                 — Session store
    ├── store.ts              — Core session store: JSON file + lock queue + TTL cache
    ├── types.ts              — SessionEntry type
    ├── paths.ts              — Session file/transcript path resolution
    ├── main-session.ts       — resolveMainSessionKey()
    ├── metadata.ts           — deriveSessionMetaPatch()
    ├── delivery-info.ts      — Delivery context helpers
    ├── group.ts              — Group session key resolution
    ├── transcript.ts         — Session transcript file helpers
    ├── session-key.ts        — Session key construction utilities
    └── reset.ts              — Session reset logic
```

---

## Config File Format

**Format**: JSON5 (parsed by `json5` npm package). Supports comments, trailing commas.
**File name**: `openclaw.json`
**Primary location**: `~/.openclaw/openclaw.json`
**Override**: `OPENCLAW_CONFIG_PATH` env var

```jsonc
// Example openclaw.json (JSON5 — comments allowed)
{
  "$schema": "https://...",
  "env": {
    "vars": { "MY_SECRET": "abc123" }
  },
  "gateway": {
    "port": 4200,
    "auth": { "mode": "token", "token": "${OPENCLAW_TOKEN}" }
  },
  "agents": {
    "defaults": {
      "model": { "provider": "anthropic", "id": "claude-sonnet-4-6" }
    }
  },
  "channels": {
    "telegram": { "botToken": "${TELEGRAM_BOT_TOKEN}" }
  },
  // $include pulls in another JSON5 file
  "$include": "./secrets.json"
}
```

### Legacy Fallbacks (`paths.ts:21-24`)

Falls back to `.clawdbot`, `.moldbot`, `.moltbot` directories and matching filenames when new locations don't exist.

---

## Config Loading Pipeline

```
loadConfig()                                          <- io.ts:1091
|
+- Check TTL cache (200ms, configurable via OPENCLAW_CONFIG_CACHE_MS)
|   Hit -> return cached config
|
+- createConfigIO().loadConfig()                      <- io.ts:529-627
   |
   +- 1.  maybeLoadDotEnvForConfig()                  load .env file
   +- 2.  fs.readFileSync(configPath)                 read raw JSON5
   +- 3.  JSON5.parse(raw)                            parse JSON5
   +- 4.  resolveConfigIncludes(parsed)               resolve $include (recursive, depth <= 10)
   +- 5.  applyConfigEnvVars(resolved)                inject config.env.vars into process.env
   +- 6.  resolveConfigEnvVars(resolved)              substitute ${VAR} references
   +- 7.  warnOnConfigMiskeys()                       warn on known typos
   +- 8.  findDuplicateAgentDirs()                    check workspace conflicts
   +- 9.  validateConfigObjectWithPlugins()            Zod validation + plugin schemas
   +- 10. applyMessageDefaults()                      ackReactionScope = "group-mentions"
   +- 11. applyLoggingDefaults()                      redactSensitive = "tools"
   +- 12. applySessionDefaults()                      mainKey -> "main"
   +- 13. applyAgentDefaults()                        maxConcurrent, subagent limits
   +- 14. applyContextPruningDefaults()               mode = "cache-ttl", heartbeat
   +- 15. applyCompactionDefaults()                   mode = "safeguard"
   +- 16. applyModelDefaults()                        reasoning, input, cost, contextWindow
   +- 17. normalizeConfigPaths()                      resolve ~ and relative paths
   +- 18. findDuplicateAgentDirs() x2                 post-defaults recheck
   +- 19. applyConfigEnvVars() x2                     re-apply after defaults
   +- 20. loadShellEnvFallback()                      optional: login shell secrets
   +- 21. applyConfigOverrides()                      in-memory runtime overrides
```

---

## Schema & Validation

**Schema system**: Zod v4 with `.strict()` at every level (unknown keys throw errors).

### Root Schema (`zod-schema.ts:105-697`)

```typescript
export const OpenClawSchema = z.object({
  $schema:      z.string().optional(),
  meta:         z.object({ lastTouchedVersion, lastTouchedAt }).strict().optional(),
  env:          z.object({ shellEnv, vars }).catchall(z.string()).optional(),
  agents:       AgentsSchema,
  channels:     ChannelsSchema,
  gateway:      z.object({ port, mode, bind, auth, reload, tls, ... }).strict().optional(),
  plugins:      z.object({ enabled, allow, deny, load, entries, installs }).strict().optional(),
  hooks:        z.object({ enabled, path, token, mappings, gmail, internal }).strict().optional(),
  models:       ModelsConfigSchema,
  memory:       MemorySchema,
  skills:       z.object({ allowBundled, load, install, entries }).strict().optional(),
  // ... 20+ more top-level keys
}).strict().superRefine(/* cross-field validation */);
```

### Sensitive Field Annotation

```typescript
// zod-schema.sensitive.ts
export const sensitive = z.registry<undefined, z.ZodType>();

// Usage in schema:
token: z.string().optional().register(sensitive)
```

Fields registered with `sensitive` are redacted to `"__OPENCLAW_REDACTED__"` when sent to the Control UI (`redact-snapshot.ts`).

### Validation (`validation.ts:148-160`)

Beyond Zod, validation also checks:
- Legacy config keys (whatsapp/telegram at root level, routing.* keys)
- Duplicate agent workspace directories
- Avatar path security (workspace-relative or http/data URI only)
- Plugin config schemas (validates `plugins.entries.<id>.config` against each plugin's JSON Schema)
- Channel ID validity against the registry
- Heartbeat target validity

### JSON Schema Export (`schema.ts:325-338`)

```typescript
const schema = OpenClawSchema.toJSONSchema({ target: "draft-07", unrepresentable: "any" });
schema.title = "OpenClawConfig";
```

Exported for editor tooling (`$schema` field) and the Control UI.

---

## Environment Variable Interpolation

### Syntax (`env-substitution.ts:27`)

```
${VAR_NAME}    — substitutes env var (uppercase only: [A-Z_][A-Z0-9_]*)
$${VAR_NAME}   — escape: outputs literal "${VAR_NAME}"
```

Throws `MissingEnvVarError` if a referenced var is empty or undefined.

### Application Order in Loading (`io.ts:499-513`)

```
1. applyConfigEnvVars(resolved, env)    — inject config.env.vars into process.env
2. resolveConfigEnvVars(resolved, env)  — substitute ${VAR} throughout config tree
```

### Shell Env Fallback

When `config.env.shellEnv.enabled = true` (or `OPENCLAW_SHELL_ENV_FALLBACK` set), executes `$SHELL -l -c 'env -0'` to import secrets like `ANTHROPIC_API_KEY` from the user's login shell.

### Write-back Preservation

On write, expanded values are restored to their original `${VAR}` form via `restoreEnvVarRefs()` and `restoreEnvRefsFromMap()`. Only changed paths get the literal value written; unchanged paths keep their `${VAR}` references.

---

## $include Directives

```jsonc
{
  "$include": "./secrets.json",       // single file
  "$include": ["./a.json", "./b.json"] // multiple files
}
```

- Resolved recursively (depth limit: 10)
- Included files are JSON5
- Deep-merged into the parent object
- Paths are relative to the including file

---

## Config Writing

### Write Pipeline (`io.ts:820-1044`)

```
writeConfigFile(cfg, options)
|
+- 1.  clearConfigCache()                         invalidate in-memory cache
+- 2.  readConfigFileSnapshotInternal()            read current on-disk state
+- 3.  createMergePatch(snapshot.config, cfg)      RFC 7396 diff
+- 4.  applyMergePatch(snapshot.resolved, patch)   apply to pre-defaults snapshot
|      (prevents defaults from leaking into saved file)
+- 5.  collectEnvRefPaths()                        map paths with ${VAR} refs
+- 6.  collectChangedPaths()                       track which paths changed
+- 7.  validateConfigObjectRawWithPlugins()         validate before writing
+- 8.  restoreEnvVarRefs()                         restore ${VAR} where unchanged
+- 9.  restoreEnvRefsFromMap()                     secondary env-ref pass
+- 10. stampConfigVersion()                        inject meta.lastTouchedVersion/At
+- 11. JSON.stringify(config, null, 2)             serialize to pretty JSON
+- 12. Write to temp file (mode 0o600)
+- 13. rotateConfigBackups()                       .bak -> .bak.1 -> ... -> .bak.4
+- 14. Atomic rename(tmp, configPath)              (copyFile fallback on Windows)
+- 15. Append to config-audit.jsonl                audit log with hashes
```

### Key Details

- **Output format**: Standard JSON (not JSON5) with 2-space indent. Comments and `$include` directives from the original file are NOT preserved.
- **Defaults never written**: The write pipeline operates on `snapshot.resolved` (before defaults), so defaults stay runtime-only.
- **Backup rotation**: Keeps 5 rolling backups (`.bak`, `.bak.1` through `.bak.4`).
- **Audit log**: Appends to `config-audit.jsonl` with SHA-256 hashes, sizes, and suspicious-write flags.

### Suspicious Write Detection (`io.ts:347-374`)

Flags writes where:
- File shrank >50% in bytes
- File had no `meta` block before write
- `gateway.mode` was present before but removed

---

## Config Diffing

### Merge Patch (`merge-patch.ts:61-93`)

```typescript
export function applyMergePatch(base: unknown, patch: unknown, options = {}): unknown
```

RFC 7396 compliant: `null` values mean "delete this key". Supports optional id-keyed array merging (`mergeObjectArraysById`).

### Change Tracking (`io.ts:238-273`)

`collectChangedPaths(base, target, path, output)` — recursively walks both objects and collects dot-notation paths of every changed leaf. Used for env-ref restoration (only restore `${VAR}` on paths that didn't change).

---

## Migration System

**No version-number tracking.** Migrations are idempotent and applied every call.

### Structure (`legacy.shared.ts`)

```typescript
type LegacyConfigMigration = {
  id: string;                                              // e.g. "bindings.match.provider->channel"
  describe: string;                                        // human-readable description
  apply: (raw: Record<string, unknown>, changes: string[]) => void;  // mutates in place
}
```

### 20 Migrations Across 3 Files (10+4+6)

| File | Count | Examples |
|---|---|---|
| `legacy.migrations.part-1.ts` | 10 | bindings renames, DM policy, group chat, routing->channels, `telegram.requireMention->channels.telegram.groups.*.requireMention` |
| `legacy.migrations.part-2.ts` | 4 | top-level channel keys -> channels.*, routing.bindings |
| `legacy.migrations.part-3.ts` | 6 | provider->channel renames, accountID casing |

### Detection Rules (`legacy.rules.ts`)

11 rules that detect fatal legacy top-level keys (like `whatsapp`, `telegram` at root) and produce blocking errors before migrations run.

### Public API (`legacy-migrate.ts:5-19`)

```typescript
export function migrateLegacyConfig(raw: unknown):
  { config: OpenClawConfig | null; changes: string[] }
```

Returns `null` config if migration leaves it still-invalid; returns `changes[]` descriptions.

---

## Defaults System

Applied in sequence after Zod validation (`io.ts:582-591`):

```
validated.config
  |-> applyMessageDefaults()          ackReactionScope = "group-mentions"
  |-> applyLoggingDefaults()          redactSensitive = "tools"
  |-> applySessionDefaults()          mainKey -> "main"
  |-> applyAgentDefaults()            maxConcurrent, subagent limits
  |-> applyContextPruningDefaults()   mode = "cache-ttl", heartbeat intervals
  |-> applyCompactionDefaults()       mode = "safeguard"
  |-> applyModelDefaults()            reasoning, input, cost, contextWindow, maxTokens
```

Each function is pure (returns new object). **Defaults are never written back to the config file** — the write pipeline operates on the pre-defaults `resolved` snapshot.

### Model Aliases (`defaults.ts:14-26`)

Pre-defined map so short names resolve to full provider/model strings:
```
"opus"        -> anthropic/claude-opus-4-6
"sonnet"      -> anthropic/claude-sonnet-4-6
"gpt"         -> openai/gpt-5.2
"gpt-mini"    -> openai/gpt-5-mini
"gemini"      -> google/gemini-3-pro-preview
"gemini-flash" -> google/gemini-3-flash-preview
```

---

## Runtime Overrides

```
setConfigOverride(path, value)     <- config-paths.ts
applyConfigOverrides(config)       <- runtime-overrides.ts
```

In-memory overrides applied as the last step of `loadConfig()`. Dot-notation paths (e.g. `"gateway.port"`) are parsed and applied to the config object. Used for CLI flags and programmatic overrides that shouldn't be persisted.

---

## Session Store

**Storage**: Plain JSON file (NOT SQLite)
**Path**: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
**Structure**: `Record<string, SessionEntry>` keyed by session key

### SessionEntry Type (`sessions/types.ts:25-113`)

Contains runtime session state:
- Model, provider, tokens used
- Delivery context (channel, peer, account)
- Compaction count
- Queue mode
- Heartbeat state
- Last activity timestamps

### Caching (`sessions/store.ts:39-65`)

```
SESSION_STORE_CACHE: Map<string, SessionStoreCacheEntry>
Default TTL: 45 seconds (configurable via OPENCLAW_SESSION_CACHE_TTL_MS)
Validation: checks file mtime on cache hit
```

### Locking (`sessions/store.ts:698-800`)

Per-path in-process queue (`LOCK_QUEUES: Map<string, SessionStoreLockQueue>`). Each write serializes through an async promise queue, then acquires a file-level write lock.

### Maintenance

| Operation | Default | Config key |
|---|---|---|
| **Pruning** | 30 days | `session.maintenance.pruneAfter` |
| **Capping** | 500 entries | `session.maintenance.maxEntries` |
| **Rotation** | 10 MB | `session.maintenance.rotateBytes` |

Rotation renames to `sessions.json.bak.{timestamp}`, keeps 3 most recent backups.

---

## OpenClawConfig Top-Level Sections

| Key | Purpose |
|---|---|
| `$schema` | JSON Schema URL for editor tooling |
| `meta` | Version bookkeeping (lastTouchedVersion, lastTouchedAt) |
| `env` | Env var injection, shell env fallback, explicit vars |
| `wizard` | Setup wizard run metadata |
| `diagnostics` | OTel tracing, cache trace, feature flags |
| `logging` | Log level, file, console style, redaction |
| `update` | Update channel (stable/beta/dev), auto-check |
| `browser` | CDP config, browser profiles, SSRF policy |
| `ui` | Accent color, assistant name/avatar |
| `auth` | Auth profiles (API key, OAuth, token), ordering, cooldowns |
| `models` | Provider model catalog with costs and capabilities |
| `nodeHost` | Browser proxy for node-host |
| `agents` | `defaults` + `list[]` of named agent entries |
| `tools` | Tool allow/deny lists, agentToAgent config |
| `bindings` | Channel -> agent routing rules |
| `broadcast` | Multi-agent message broadcasting |
| `audio` | Audio transcription config |
| `media` | Media filename preservation |
| `messages` | Message ack, compaction settings |
| `commands` | Custom slash commands |
| `approvals` | Approval workflow policies |
| `session` | Session scope, maintenance (prune/cap/rotate) |
| `cron` | Scheduled task runner |
| `hooks` | Webhook endpoint, mappings, Gmail, internal hooks |
| `web` | WebSocket reconnect settings |
| `channels` | Per-channel config (slack, telegram, discord, imessage, whatsapp, msteams, signal, irc, googlechat) |
| `discovery` | mDNS, wide-area discovery |
| `canvasHost` | Static file server for canvas |
| `talk` | TTS voice, model, ElevenLabs API key |
| `gateway` | HTTP server, auth, TLS, hot reload, remote, nodes |
| `memory` | Memory backend (builtin or qmd) |
| `skills` | Skill loading dirs, install prefs, per-skill config |
| `plugins` | Plugin enable/disable, load paths, per-plugin config |

---

## Additional Config Schema Fields

The following fields were not previously documented. They extend the sections noted in the root schema above.

### Gateway Section Additions

| Field | Type / Values | Description |
|---|---|---|
| `customBindHost` | string | Custom bind address when `gateway.bind = "custom"` |
| `controlUi` | object | Control UI server options: `{ enabled, basePath, root, allowedOrigins, allowInsecureAuth, dangerouslyDisableDeviceAuth }` |
| `trustedProxies` | string[] | Array of trusted proxy CIDRs for real-IP extraction |
| `allowRealIpFallback` | boolean | Allow falling back to socket IP when no trusted proxy header present |
| `tools` | object | Gateway-level tool deny/allow lists (applies to all agents unless overridden) |
| `channelHealthCheckMinutes` | integer | Interval for automatic channel health probes |
| `tailscale` | object | `{ mode: "off" \| "serve" \| "funnel", resetOnExit }` — Tailscale serve/funnel management |
| `remote` | object | Remote gateway connection: `{ url, transport, token, password, tlsFingerprint, sshTarget, sshIdentity }` |
| `http` | object | HTTP endpoint toggles: `{ chatCompletions, responses }` each with upload config |
| `nodes` | object | Node host policy: `{ browser.mode, allowCommands, denyCommands }` |

### Hooks Section Additions

| Field | Description |
|---|---|
| `defaultSessionKey` | Default session key for inbound hook requests |
| `allowRequestSessionKey` | Whether callers may specify a session key per request |
| `allowedSessionKeyPrefixes` | Restrict session keys to allowed prefixes |
| `allowedAgentIds` | Restrict which agent IDs hooks may target |
| `maxBodyBytes` | Maximum request body size for the hooks endpoint |
| `presets` | Named preset payloads that hook requests may reference |
| `transformsDir` | Directory containing hook transform scripts |

### Agents Defaults — Compaction Section Additions (`zod-schema.agent-defaults.ts:94-96`)

Two new optional fields under `agents.defaults.compaction`:

| Field | Type | Description |
|---|---|---|
| `reserveTokens` | `number` (optional) | Number of tokens to reserve from the model's context window before triggering compaction. Allows callers to set aside headroom for reply generation. |
| `reserveTokensFloor` | `number` (optional) | Minimum floor applied to `reserveTokens` after any dynamic adjustments, preventing the reserved amount from shrinking below a safe lower bound. |

### Plugins Section Addition

| Field | Type | Description |
|---|---|---|
| `slots` | `{ memory?: string }` | Plugin slot arbitration — at most one plugin per slot can be active at a time. The `memory` slot allows only one memory plugin (e.g., a custom memory plugin) to be active. |

---

## ConfigFileSnapshot (`types.openclaw.ts:112-129`)

The snapshot is the gateway's window into config state:

```typescript
type ConfigFileSnapshot = {
  path: string;
  exists: boolean;
  raw: string | null;              // raw JSON5 text
  parsed: unknown;                  // parsed (before ${} substitution)
  resolved: OpenClawConfig;         // after $include + ${} but BEFORE defaults
  valid: boolean;
  config: OpenClawConfig;           // fully loaded with all defaults
  hash?: string;                    // SHA-256 of raw — change detection
  issues: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  legacyIssues: LegacyConfigIssue[];
}
```

The `resolved` field (before defaults) is used as the write base to prevent defaults from leaking into the saved file. The `hash` field is used by the gateway's hot-reload watcher for change detection.

---

## Key Architectural Patterns

**JSON5 in, JSON out** — Config is read as JSON5 (comments, trailing commas) but written back as standard JSON. Comments and `$include` directives are not preserved on write.

**Env var round-trip** — `${VAR}` references are expanded on load and restored on write. Only paths that actually changed get literal values; unchanged paths keep their `${VAR}` references.

**Pre-defaults write base** — The write pipeline operates on `snapshot.resolved` (after `$include` and `${}` but before defaults). This prevents runtime defaults from leaking into the user's file.

**Idempotent migrations** — No version tracking. All 20 migrations run on every load, each checking whether its transform is needed. This simplifies the migration system at the cost of running unnecessary checks.

**Atomic write with audit** — Writes to a temp file, rotates backups, then atomic rename. Every write is logged to `config-audit.jsonl` with hashes and suspicious-write flags.

**In-process session locking** — The session store uses per-path promise queues for serialization, avoiding the overhead of SQLite while still preventing concurrent corruption.
