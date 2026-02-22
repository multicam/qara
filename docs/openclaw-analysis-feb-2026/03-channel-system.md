# Channel System Architecture

## Overview

A **two-tier plugin architecture** — lightweight static metadata (docks) always available, full implementations loaded at runtime via extension plugins. All channels follow the same contract, registration flow, and delivery pipeline.

---

## The Two Tiers

```
+--------------------------------------------------------------+
|  TIER 1 — Channel Docks (always loaded)                      |
|  src/channels/dock.ts                                        |
|                                                              |
|  Lightweight metadata for 8 core channels:                   |
|  Telegram, WhatsApp, Discord, Slack, Signal,                 |
|  iMessage, IRC, GoogleChat                                   |
|                                                              |
|  Contains: capabilities, text chunk limits,                  |
|  threading defaults, mention strip patterns,                 |
|  allowFrom formatters                                        |
|                                                              |
|  Used by: shared code paths that must not import             |
|  heavy channel monitors                                      |
+--------------------------------------------------------------+
                          |
                          v
+--------------------------------------------------------------+
|  TIER 2 — Channel Plugins (runtime-loaded)                   |
|  extensions/<channel>/src/channel.ts                         |
|                                                              |
|  Full ChannelPlugin with all adapters:                       |
|  config, outbound, gateway, security, groups, threading,     |
|  messaging, actions, status, pairing, setup, streaming...    |
|                                                              |
|  Registered via: api.registerChannel({ plugin })             |
|  Accessed via: getChannelPlugin(id)                          |
+--------------------------------------------------------------+
```

---

## The `ChannelPlugin` Contract

```
ChannelPlugin<ResolvedAccount>                    <- types.plugin.ts:48-84
|
+- id: ChannelId                                  (required)
+- meta: { name, icon, order }                    (required)
+- capabilities: ChannelCapabilities              (required)
|
+- config: ChannelConfigAdapter                   (required)
|   +- listAccountIds(cfg)
|   +- resolveAccount(cfg, accountId)
|   +- isConfigured(account)
|   +- describeAccount(account)
|
+- outbound?: ChannelOutboundAdapter
|   +- deliveryMode: "direct" | "gateway" | "hybrid"
|   +- chunker?: (text, limit) => string[]
|   +- textChunkLimit?: number
|   +- sendText?(ctx)
|   +- sendMedia?(ctx)
|   +- sendPayload?(ctx)
|   +- sendPoll?(ctx)
|
+- gateway?: ChannelGatewayAdapter
|   +- startAccount(ctx)                          start monitoring
|   +- stopAccount?(ctx)                          graceful shutdown
|   +- loginWithQrStart/Wait?(ctx)                QR login (WhatsApp)
|   +- logoutAccount?(ctx)
|
+- security?: ChannelSecurityAdapter
|   +- resolveDmPolicy(ctx)                       open/pairing/deny
|   +- collectWarnings(ctx)
|
+- groups?: ChannelGroupAdapter
|   +- resolveRequireMention(ctx)                 must @mention to respond?
|   +- resolveToolPolicy(ctx)                     per-sender tool limits
|
+- threading?: ChannelThreadingAdapter
|   +- resolveReplyToMode(ctx)                    off/first/all
|   +- buildToolContext(ctx)                      thread IDs for agent tools
|
+- mentions?: ChannelMentionAdapter
|   +- stripPatterns                              regex to strip @mentions
|
+- actions?: ChannelMessageActionAdapter
|   +- handleAction(ctx)                          54 named actions
|
+- status?: ChannelStatusAdapter
|   +- probeAccount(ctx)                          health check
|   +- auditAccount(ctx)                          deep audit
|   +- collectStatusIssues(ctx)
|
+- setup?: ChannelSetupAdapter                    CLI setup wizard
+- pairing?: ChannelPairingAdapter                device pairing flow
+- directory?: ChannelDirectoryAdapter            contact/group lookup
+- streaming?: ChannelStreamingAdapter            live edit streaming
+- messaging?: ChannelMessagingAdapter            inbound message handling
+- agentPrompt?: ChannelAgentPromptAdapter        channel-specific prompt
+- heartbeat?: ChannelHeartbeatAdapter            heartbeat behavior
+- agentTools?: ChannelAgentToolFactory           channel-specific tools
+- elevated?: ChannelElevatedAdapter              host-mode escalation
+- onboarding?: ChannelOnboardingAdapter          guided first-run onboarding flow
+- configSchema?: JSONSchema                      JSON schema for channel config validation
+- auth?: ChannelAuthAdapter                      auth flow for user-facing OAuth/token entry
+- commands?: ChannelCommandAdapter               native bot command registration and dispatch
+- resolver?: ChannelResolverAdapter              custom peer/identity resolution
+- reload?: ChannelReloadAdapter                  hot-reload hook for account config changes
```

### Channel Capabilities (`types.core.ts:171-184`)

```typescript
ChannelCapabilities = {
  chatTypes: ["direct", "group", "channel", "thread"],
  polls?, reactions?, edit?, unsend?, reply?,
  effects?, groupManagement?, threads?, media?,
  nativeCommands?, blockStreaming?
}
```

| Channel | chatTypes | Key capabilities |
|---|---|---|
| Telegram | direct, group, channel, thread | reactions, edit, unsend, reply, polls, threads, media |
| Discord | direct, channel, thread | reactions, edit, unsend, reply, threads, media |
| Slack | direct, channel, thread | reactions, edit, reply, threads, media |
| WhatsApp | direct, group | reactions, reply, media |
| Signal | direct, group | reactions, reply, media |
| iMessage | direct, group | reactions, reply, media |
| IRC | direct, channel | (minimal) |
| GoogleChat | direct, group, thread | reply, threads |

---

## Extension Registration Flow

```
1. Discovery
   discoverOpenClawPlugins({ workspaceDir })
     Scans: config/ -> workspace/ -> global/ -> bundled/
     Finds: openclaw.plugin.json manifests
     Priority: config=0 > workspace=1 > global=2 > bundled=3

2. Loading
   loadPlugins(options)
     For each candidate:
       jiti.import(extension entrypoint)      <- TypeScript direct
       resolvePluginModuleExport(module)       <- find register()

3. Registration
   plugin.register(api)
     Extension calls:
       setTelegramRuntime(api.runtime)         <- inject PluginRuntime singleton
       api.registerChannel({ plugin })         <- push to registry.channels[]

4. Access
   getChannelPlugin("telegram")
     -> requireActivePluginRegistry()
     -> registry.channels.find(e => e.plugin.id === id)
```

### Extension File Structure (every channel follows this)

```
extensions/<channel>/
+-- index.ts                <- plugin entry: setRuntime + api.registerChannel
+-- src/
|   +-- channel.ts          <- ChannelPlugin object literal (all adapters)
|   +-- runtime.ts          <- module singleton: setXxxRuntime / getXxxRuntime
+-- package.json            <- { "openclaw": { "extensions": ["./index.ts"] } }
+-- openclaw.plugin.json    <- { "id": "...", "channels": ["..."] }
```

The `runtime.ts` pattern is identical everywhere:

```typescript
let runtime: PluginRuntime | null = null;
export function setXxxRuntime(next: PluginRuntime) { runtime = next; }
export function getXxxRuntime(): PluginRuntime {
  if (!runtime) throw new Error("...");
  return runtime;
}
```

All channel implementation calls go through `getXxxRuntime().channel.xxx.*` — the plugin SDK contract stays stable while the host can swap implementations.

### New Channel Extensions

The following channel adapters have been added as bundled extensions since the initial inventory:

| Extension | Platform |
|---|---|
| `feishu` | Feishu / Lark (ByteDance enterprise messaging) |
| `matrix` | Matrix protocol (Element, etc.) |
| `msteams` | Microsoft Teams |
| `nextcloud-talk` | Nextcloud Talk |
| `nostr` | Nostr decentralized protocol |
| `tlon` | Tlon / Urbit groups |
| `twitch` | Twitch chat |
| `zalo` | Zalo (Vietnam) — bot account |
| `zalouser` | Zalo — user account variant |
| `bluebubbles` | BlueBubbles server (iMessage relay for non-Apple hosts) |

### Organized Subdirectories in `channels/plugins/`

The `channels/plugins/` directory has been refactored into named subdirectories for better organization:

```
src/channels/plugins/
├── actions/          <- Message action implementations (send, react, edit, etc.)
├── agent-tools/      <- ChannelAgentToolFactory implementations per channel
├── outbound/         <- Outbound delivery helpers (chunkers, media, text)
├── normalize/        <- Inbound message normalization (text, media, metadata)
├── onboarding/       <- First-run and setup wizard flows
└── status-issues/    <- Status probe and audit issue collectors
```

### Catalog Discovery (`channels/plugins/catalog.ts:259-296`)

`listChannelPluginCatalogEntries()` calls `discoverOpenClawPlugins()` (scans workspace/global/bundled dirs for `openclaw.plugin.json` files) and resolves entries sorted by `meta.order`. Additionally reads external `catalog.json` files from `OPENCLAW_PLUGIN_CATALOG_PATHS`, allowing marketplace-style plugin listings without installation.

---

## Message Routing (Inbound)

```
Inbound message arrives
(e.g. Telegram group mention)
         |
         v
resolveAgentRoute({ cfg, channel, accountId, peer, parentPeer, guildId, ... })
         |                                                    <- resolve-route.ts:295
         |
    Evaluate binding tiers in priority order:
         |
    +------------------------------------------------------+
    |  1. binding.peer         exact peer match             |
    |  2. binding.peer.parent  thread parent inherit        |
    |  3. binding.guild+roles  Discord guild+role IDs       |
    |  4. binding.guild        Discord guild only           |
    |  5. binding.team         Slack team                   |
    |  6. binding.account      specific accountId           |
    |  7. binding.channel      channel-wide (account=*)     |
    |  8. default              resolveDefaultAgentId()      |
    +------------------------------------------------------+
         |
         v
    Returns: { agentId, sessionKey, matchedBy }
```

### Session Key Format (`routing/session-key.ts:141-188`)

```
agent:<agentId>:main                                         (DM, dmScope=main)
agent:<agentId>:direct:<peerId>                              (DM, per-peer)
agent:<agentId>:<channel>:direct:<peerId>                    (DM, per-channel-peer)
agent:<agentId>:<channel>:<accountId>:direct:<peerId>        (DM, per-account)
agent:<agentId>:<channel>:<peerKind>:<peerId>                (group/channel)
agent:<agentId>:<channel>:<peerKind>:<peerId>:thread:<id>    (thread)
```

Bindings are cached per `OpenClawConfig` instance via `WeakMap` (limit: 2000 entries).

---

## Outbound Message Delivery

```
Agent response ready
         |
         v
deliverOutboundPayloads()                          <- infra/outbound/deliver.ts:226
         |
    +--------------------------------------------------+
    |  1. Write-ahead queue                             |
    |     enqueueDelivery() before sending              |
    |     Remove on ACK                                 |
    |                                                   |
    |  2. Load outbound adapter                         |
    |     loadChannelOutboundAdapter(channel)            |
    |     -> plugin.outbound from registry              |
    |                                                   |
    |  3. For each payload:                             |
    |     +- Fire message_sending hook                  |
    |     |   (can mutate content or cancel)             |
    |     |                                             |
    |     +- Route by payload type:                     |
    |     |   channelData? -> sendPayload()             |
    |     |   mediaUrls?   -> sendMedia() per URL       |
    |     |   text?        -> chunk + sendText()        |
    |     |                                             |
    |     +- Fire message_sent hook                     |
    |                                                   |
    |  4. Mirror transcript (if configured)             |
    +--------------------------------------------------+
```

### Text Chunking Per Channel

| Channel | Chunker | Notes |
|---|---|---|
| Telegram | `markdownToTelegramHtmlChunks()` | Converts markdown to Telegram HTML |
| Signal | `markdownToSignalTextChunks()` | Preserves rich text style ranges |
| Discord | markdown chunks | 4096 char limit |
| Slack | markdown chunks | mrkdwn format |
| WhatsApp | plain text chunks | |
| Others | generic chunker or null (send as-is) | |

### Core Outbound Adapter Interface (`types.adapters.ts:97-114`)

```typescript
export type ChannelOutboundAdapter = {
  deliveryMode: "direct" | "gateway" | "hybrid";
  chunker?: ((text: string, limit: number) => string[]) | null;
  chunkerMode?: "text" | "markdown";
  textChunkLimit?: number;
  resolveTarget?: (params) => { ok: true; to: string } | { ok: false; error: Error };
  sendPayload?: (ctx: ChannelOutboundPayloadContext) => Promise<OutboundDeliveryResult>;
  sendText?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>;
  sendMedia?: (ctx: ChannelOutboundContext) => Promise<OutboundDeliveryResult>;
  sendPoll?: (ctx: ChannelPollContext) => Promise<ChannelPollResult>;
};
```

---

## Channel Lifecycle Management

```
createChannelManager()                           <- server-channels.ts:80-414
|
+- startChannels()
|   for each plugin in listChannelPlugins():
|     for each accountId in plugin.config.listAccountIds():
|       startChannel(channelId, accountId)
|
+- startChannel(channelId, accountId)
|   +- Check isEnabled() && isConfigured()
|   |   not enabled -> set status "disabled"
|   |   not configured -> set status "not_configured"
|   |
|   +- Create AbortController
|   +- plugin.gateway.startAccount({
|   |     cfg, accountId, account,
|   |     abortSignal, log,
|   |     getStatus, setStatus          <- runtime snapshot callbacks
|   |   })
|   |
|   +- On crash (non-manual):
|       +- computeBackoff(policy, attempt)
|       |   initial=5s, factor=2x, jitter=0.1, ceiling=5min
|       +- Wait backoff duration
|       +- Retry (up to MAX_RESTART_ATTEMPTS=10)
|
+- stopChannel(channelId, accountId)
|   +- Add to manuallyStopped set (prevents auto-restart)
|   +- abort.abort()
|   +- plugin.gateway.stopAccount() (if provided)
|   +- Await task promise
|
+- getRuntimeSnapshot()
    +- Merge plugin config + runtime state for all accounts
```

### Restart Policy (`server-channels.ts:12-17`)

```typescript
const CHANNEL_RESTART_POLICY: BackoffPolicy = {
  initialMs: 5_000,
  maxMs: 5 * 60_000,
  factor: 2,
  jitter: 0.1,
};
const MAX_RESTART_ATTEMPTS = 10;
```

---

## Channel-Specific Features

### Typing / Streaming

```
blockStreaming: true   (Telegram, iMessage, IRC, GoogleChat)
  -> Coalesce full response, send once

blockStreaming: false  (Discord, Slack)
  -> DraftStreamLoop: throttled progressive edits
    update(text) -> sendOrEditStreamMessage()
    throttleMs-gated to avoid API rate limits
```

### Ack Reactions

```
shouldAckReaction({ cfg, channel, chatType, ... })
  -> scope: "all" | "direct" | "group-all" | "group-mentions" | "off"

Flow:
  Message received -> send ack emoji
  Agent processing...
  Reply sent -> removeAckReactionAfterReply()
```

### Threading / Replies

```
ChannelThreadingAdapter.resolveReplyToMode()
  -> "off"   : no reply threading
  -> "first" : reply to first message only
  -> "all"   : reply to every message

buildToolContext() -> { currentChannelId, currentThreadTs, hasRepliedRef }
  Used by agent tools to thread responses correctly

Slack special: allowExplicitReplyTagsWhenOff = true
  Explicit [reply:...] directives still pass replyToId even when mode="off"
```

### Group Mentions

```
resolveRequireMention({ cfg, chatType, guildId, groupId })
  -> true:  must @mention bot to trigger response
  -> false: respond to all messages

Mention stripping (before agent sees the message):
  Discord:  <@!?\d+>
  Slack:    <@[^>]+>
  WhatsApp: self-E164-derived patterns
  Telegram: @botname patterns
```

### Message Actions (54 named actions)

```
send, react, edit, unsend, poll,
thread-create, ban, kick, role-add, role-remove,
pin, unpin, mute, unmute, archive, ...

handleAction(ctx: ChannelMessageActionContext)
  ctx.requesterSenderId -> server-injected (never model-controlled)
```

---

## Multi-Account Configuration

```yaml
# Config pattern (same for all channels):
channels:
  telegram:
    enabled: true
    botToken: "..."              # default account
    accounts:
      work:
        botToken: "..."          # named account "work"
      personal:
        botToken: "..."          # named account "personal"
```

```
ChannelConfigAdapter:
  listAccountIds(cfg)      -> ["default", "work", "personal"]
  resolveAccount(cfg, id)  -> merges base + account-level config
  defaultAccountId(cfg)    -> "default"
```

Config path resolution:
```
cfg.channels.telegram.accounts.work.dmPolicy     <- account-specific
cfg.channels.telegram.dmPolicy                    <- base (default account)
```

---

## Media Handling

```
Outbound media:
  payload.mediaUrls[] -> one sendMedia() call per URL
  mediaLocalRoots -> per-agent scoped local file access

Size limits:
  resolveChannelMediaMaxBytes({ cfg, channel, accountId })
    1. channel-specific mediaMaxMb config
    2. cfg.agents.defaults.mediaMaxMb fallback

Per-channel behavior:
  Telegram: auto-detects photo/video/document from URL
  Signal:   enforces maxBytes in send call, style ranges preserved
  Discord:  attachment upload with embed
  WhatsApp: media message with caption
  Slack:    file upload API
```

---

## Full Inbound -> Outbound Flow

```
+==============================================================+
||  User sends "@bot summarize this" in Telegram group         ||
+=============================+================================+
                              |
              +---------------v---------------+
              | Telegram monitor               |  extensions/telegram
              | receives update                |
              +---------------+---------------+
                              |
              +---------------v---------------+
              | Strip @mention                 |  mentions.stripPatterns
              | Check requireMention           |  groups.resolveRequireMention
              | Send ack reaction              |  ack-reactions.ts
              +---------------+---------------+
                              |
              +---------------v---------------+
              | resolveAgentRoute()            |  routing/resolve-route.ts
              | -> agentId, session            |  binding tier evaluation
              +---------------+---------------+
                              |
              +---------------v---------------+
              | Gateway enqueues               |  server-chat.ts
              | agent run                      |
              +---------------+---------------+
                              |
              +---------------v---------------+
              | Agent runtime                  |  agents/pi-embedded-runner
              | processes message              |
              | (model + tools)                |
              +---------------+---------------+
                              |
              +---------------v---------------+
              | Response payloads              |
              | assembled                      |
              +---------------+---------------+
                              |
              +---------------v---------------+
              | deliverOutbound                |  infra/outbound/deliver.ts
              | Payloads()                     |
              +-------------------------------+
              | Load outbound adapter          |
              | Chunk text                     |
              | -> TG HTML chunks              |
              | Fire message_sending           |
              | sendText/sendMedia             |
              | Fire message_sent              |
              | Remove ack reaction            |
              +---------------+---------------+
                              |
              +---------------v---------------+
              | User sees reply                |
              | in Telegram group              |
              +-------------------------------+
```

---

## Key Entry Points

| File | What | Line |
|---|---|---|
| `src/channels/plugins/types.plugin.ts` | `ChannelPlugin<>` type — the contract | :48 |
| `src/channels/plugins/types.core.ts` | Core data types (capabilities, threading, etc.) | :1 |
| `src/channels/plugins/types.adapters.ts` | All adapter types | :1 |
| `src/channels/plugins/index.ts` | `listChannelPlugins()`, `getChannelPlugin()` | :31 |
| `src/channels/dock.ts` | `listChannelDocks()`, `getChannelDock()` | :585 |
| `src/channels/registry.ts` | `CHAT_CHANNEL_ORDER`, `CHAT_CHANNEL_META` | :7 |
| `src/gateway/server-channels.ts` | `createChannelManager()` | :80 |
| `src/routing/resolve-route.ts` | `resolveAgentRoute()` | :295 |
| `src/infra/outbound/deliver.ts` | `deliverOutboundPayloads()` | :226 |
