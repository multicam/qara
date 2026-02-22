# 13 — Auto-Reply System

## Summary

The auto-reply system is a **multi-stage pipeline** that transforms an inbound `MsgContext` into one or more `ReplyPayload` objects through sequential steps: context finalization, session resolution, directive parsing, command handling, and agent execution.

**Three dispatch paths**: direct reply (short-circuit from commands/directives), AI agent run (via `runReplyAgent`), or queued/followup run (via `enqueueFollowupRun`).

**Inline directives** (`/think`, `/verbose`, `/model`, `/elevated`, `/exec`, `/queue`, `/status`) are stripped from message text before agent execution and control model behavior without calling the AI.

**Rate limiting and spam prevention** operate at multiple layers: inbound deduplication (LRU cache keyed by provider+message+session), message queue modes (`steer`, `followup`, `collect`, `interrupt`), inbound debouncing, and a send-policy gate.

The `TypingController` drives the "is typing..." indicator and shuts down cleanly when both the run completes and the dispatch queue drains.

---

## Directory Structure

```
src/auto-reply/
├── types.ts                      — GetReplyOptions, ReplyPayload, BlockReplyContext
├── templating.ts                 — MsgContext, TemplateContext, applyTemplate()
├── dispatch.ts                   — dispatchInboundMessage() entry point variants
├── reply.ts                      — public re-exports (getReplyFromConfig, directives, etc.)
├── command-auth.ts               — sender authorization: ownerAllowFrom, allowFrom
├── commands-registry.ts          — command parsing, alias resolution, text/native detection
├── commands-registry.types.ts    — ChatCommandDefinition, CommandArgs, CommandDetection
├── commands-registry.data.ts     — concrete command list (getChatCommands)
├── commands-args.ts              — argument parsing helpers
├── command-detection.ts          — hasControlCommand()
├── heartbeat.ts                  — HEARTBEAT_PROMPT, stripHeartbeatToken()
├── inbound-debounce.ts           — createInboundDebouncer(), resolveInboundDebounceMs()
├── fallback-state.ts             — model fallback transition logic
├── group-activation.ts           — group activation mode normalization
├── model.ts                      — extractModelDirective()
├── model-runtime.ts              — runtime model resolution helpers
├── send-policy.ts                — parseSendPolicyCommand(), SendPolicyOverride
├── skill-commands.ts             — skill-based command discovery
├── status.ts                     — /status reply formatting
├── thinking.ts                   — ThinkLevel, VerboseLevel, ElevatedLevel, ReasoningLevel
├── tokens.ts                     — HEARTBEAT_TOKEN, SILENT_REPLY_TOKEN, isSilentReplyText()
└── reply/
    ├── get-reply.ts              — getReplyFromConfig() — top-level orchestrator
    ├── get-reply-run.ts          — runPreparedReply() — pre-agent preparation
    ├── get-reply-directives.ts   — resolveReplyDirectives() — directive stage
    ├── get-reply-inline-actions.ts — handleInlineActions() — command/skill dispatch
    ├── dispatch-from-config.ts   — dispatchReplyFromConfig() — TTS + routing wrapper
    ├── agent-runner.ts           — runReplyAgent() — queue management + agent orchestration
    ├── agent-runner-execution.ts — runAgentTurnWithFallback() — actual model call
    ├── agent-runner-payloads.ts  — buildReplyPayloads() — normalize agent output
    ├── reply-dispatcher.ts       — createReplyDispatcher() — serialized delivery queue
    ├── session.ts                — initSessionState() — session lifecycle
    ├── directive-handling.ts     — parseInlineDirectives(), persistInlineDirectives()
    ├── directive-handling.parse.ts — InlineDirectives type + full parse chain
    ├── directives.ts             — extractThinkDirective(), extractVerboseDirective(), etc.
    ├── queue/
    │   ├── types.ts              — QueueMode, QueueSettings, FollowupRun
    │   ├── settings.ts           — resolveQueueSettings()
    │   ├── enqueue.ts            — enqueueFollowupRun()
    │   ├── drain.ts              — scheduleFollowupDrain()
    │   └── state.ts              — clearFollowupQueue()
    ├── inbound-dedupe.ts         — shouldSkipDuplicateInbound()
    ├── normalize-reply.ts        — normalizeReplyPayload() — SILENT/HEARTBEAT strip
    ├── route-reply.ts            — routeReply() — cross-channel routing
    ├── typing.ts                 — createTypingController()
    ├── groups.ts                 — buildGroupChatContext(), buildGroupIntro()
    ├── commands-core.ts          — handleCommands() — command handler dispatch loop
    └── commands-context.ts       — buildCommandContext()
```

---

## Entry Points

- `src/auto-reply/dispatch.ts:35` — `dispatchInboundMessage()` — primary entry from channel adapters
- `src/auto-reply/dispatch.ts:56` — `dispatchInboundMessageWithBufferedDispatcher()` — entry with typing-integrated dispatcher
- `src/auto-reply/reply/get-reply.ts:54` — `getReplyFromConfig()` — direct reply resolution (also callable standalone)
- `src/auto-reply/reply/dispatch-from-config.ts:83` — `dispatchReplyFromConfig()` — TTS/routing wrapper around getReplyFromConfig

---

## Data Flow

```
Channel Adapter (Telegram/Slack/WhatsApp/Web/etc.)
        │
        ▼  MsgContext
dispatchInboundMessage()                    [dispatch.ts:35]
        │
        ▼
finalizeInboundContext()                    [inbound-context.ts:37]
  · Normalize Body/BodyForAgent/BodyForCommands
  · Set CommandAuthorized default-deny
  · Align MediaTypes[]
        │
        ▼
dispatchReplyFromConfig()                   [dispatch-from-config.ts:83]
  · shouldSkipDuplicateInbound()            [inbound-dedupe.ts:37]
  · tryFastAbortFromMessage()               [abort.ts]
  · Fire message_received plugin hooks      [line:170]
  · Fire internal "message.received" hook   [line:204]
  · Detect cross-channel routing            [line:239]
        │
        ▼
getReplyFromConfig()                        [get-reply.ts:54]
  · Resolve model (heartbeat / channel / default)
  · applyMediaUnderstanding()
  · applyLinkUnderstanding()
  · resolveCommandAuthorization()           [command-auth.ts:218]
  │
  ├──▶ initSessionState()                   [session.ts:100]
  │      · Resolve sessionKey, sessionId
  │      · Check reset triggers (/new, /reset)
  │      · evaluateSessionFreshness()
  │      · Persist session entry
  │
  ├──▶ resolveReplyDirectives()             [get-reply-directives.ts:87]
  │      · parseInlineDirectives()          [directive-handling.parse.ts:63]
  │      · createModelSelectionState()
  │      · resolveGroupRequireMention()
  │      · applyInlineDirectiveOverrides()
  │      [returns kind:"reply" or kind:"continue"]
  │
  ├──▶ handleInlineActions()                [get-reply-inline-actions.ts:73]
  │      · Skill command invocations
  │      · Inline command extraction
  │      · Inline status reply
  │      · handleCommands() dispatch loop   [commands-core.ts:42]
  │      [returns kind:"reply" or kind:"continue"]
  │
  └──▶ runPreparedReply()                   [get-reply-run.ts:110]
         · Build system prompt parts
         · Compose FollowupRun object
         │
         ▼
       runReplyAgent()                      [agent-runner.ts:98]
         · Queue management (steer/followup/collect)
         · runMemoryFlushIfNeeded()
         │
         ▼
       runAgentTurnWithFallback()           [agent-runner-execution.ts]
         · AI model call (Claude/OpenAI/etc.)
         · Block streaming via blockReplyPipeline
         · Tool result callbacks
         │
         ▼
       buildReplyPayloads()                 [agent-runner-payloads.ts]
         │
         ▼
       ReplyPayload | ReplyPayload[] | undefined
              │
              ▼  back to dispatch-from-config.ts
       maybeApplyTtsToPayload()             [tts.ts]
              │
              ▼
       dispatcher.sendFinalReply(payload)  [reply-dispatcher.ts:200]
              │  (serialized, human-delay)
              ▼
       channel deliver() callback
```

---

## Pipeline Stages

### 1. Inbound Dispatch — `dispatch.ts:35-97`

Three entry points unify into `dispatchInboundMessage`, which calls `finalizeInboundContext` then `dispatchReplyFromConfig` wrapped in `withReplyDispatcher`. The wrapper ensures `dispatcher.markComplete()` and `dispatcher.waitForIdle()` always fire on every exit path.

### 2. Context Finalization — `reply/inbound-context.ts:37-124`

Normalizes all text fields (newlines, media types, chat type), resolves `BodyForAgent` and `BodyForCommands` from a priority chain (`BodyForAgent ?? CommandBody ?? RawBody ?? Body`), and enforces `CommandAuthorized = boolean` (default-deny when absent).

### 3. Deduplication — `reply/inbound-dedupe.ts:37-51`

Cache key from `[provider, accountId, sessionKey, peerId, threadId, messageId]`. LRU cache holds 5000 entries with 20-minute TTL. Duplicates are silently dropped before any processing.

### 4. Session Initialization — `reply/session.ts:100-490`

Resolves session key from `sessionCfg.scope` ("per-sender" default), loads the store fresh (no-cache), checks freshness against reset policy, and handles reset triggers. Session state carries `sessionId`, `systemSent`, `abortedLastRun`, `thinkingLevel`, `verboseLevel`, `modelOverride`, and delivery fields.

Reset triggers (default `/new`, `/reset`) matched case-insensitively with prefix matching (`session.ts:182-206`). When triggered with an authorized sender, persistent state like thinking/verbose levels carries over.

### 5. Directive Resolution — `reply/get-reply-directives.ts:87-482`

Parse chain in `directive-handling.parse.ts:63-190`:

```
extractThinkDirective → extractVerboseDirective → extractReasoningDirective
  → extractElevatedDirective → extractExecDirective → extractStatusDirective
  → extractModelDirective → extractQueueDirective
```

Each extractor strips its token from the message body, producing a `cleaned` string. Returns `{kind:"reply"}` short-circuit or `{kind:"continue"}` continuation.

### 6. Inline Actions — `reply/get-reply-inline-actions.ts:73-381`

Handles skill command invocations, inline `[[command body]]`-style commands, inline status requests, directive-only acknowledgements, then the main command handler loop.

`handleCommands()` in `commands-core.ts:42-183` iterates 20+ handlers in fixed order:

```
handlePluginCommand, handleBashCommand, handleActivationCommand,
handleSendPolicyCommand, handleUsageCommand, handleSessionCommand,
handleRestartCommand, handleTtsCommands, handleHelpCommand,
handleCommandsListCommand, handleStatusCommand, handleAllowlistCommand,
handleApproveCommand, handleContextCommand, handleExportSessionCommand,
handleWhoamiCommand, handleSubagentsCommand, handleConfigCommand,
handleDebugCommand, handleModelsCommand, handleStopCommand,
handleCompactCommand, handleAbortTrigger
```

First handler returning a result short-circuits. After all handlers, a `sendPolicy` check can block agent execution.

### 7. Reply Preparation — `reply/get-reply-run.ts:110-473`

Composes the final agent prompt from:
- `inboundMetaPrompt` (metadata for context)
- `groupChatContext` (always-on for groups: name, participants)
- `groupIntro` (first turn only: activation mode, silence guidance)
- `extraSystemPrompt` (joined with `\n\n`)
- Thread context notes (`ThreadHistoryBody` / `ThreadStarterBody`)
- Media notes and reply hints
- Session hints (aborted run notices)
- System events (from `prependSystemEvents`)
- `UntrustedContext` appended safely

### 8. Agent Execution — `reply/agent-runner.ts:98-730`

Queue logic before calling the model:
- `steer` mode with active streaming: inject message into live run via `queueEmbeddedPiMessage`, no new turn
- `followup`/`collect`/`steer-backlog` modes with active run: enqueue for later execution
- Otherwise: call `runAgentTurnWithFallback()`

Post-run: persist session usage, handle fallback transitions, assemble `verboseNotices`, append usage line, perform post-compaction audit, then `finalizeWithFollowup()` to drain queued follow-up runs.

### 9. Reply Delivery — `reply/reply-dispatcher.ts:103-207`

`createReplyDispatcher()` serializes all outbound deliveries via a `sendChain` promise. Three delivery kinds: `tool` (intermediate tool results), `block` (streaming chunks), `final` (complete response). Human-like delay applied between block replies (800-2500ms default). A `pending` counter with a "reservation" pattern prevents premature idle signals.

---

## Queue Modes

`reply/queue/types.ts:8`:

| Mode | Behavior |
|------|----------|
| `steer` | Inject new message into running agent's input stream |
| `followup` | Enqueue for sequential execution after current run |
| `collect` | Aggregate messages (debounce), then run |
| `interrupt` | Abort current run, start fresh with new message |
| `steer-backlog` | Steer if possible, else backlog for followup |
| `queue` | Simple FIFO queue |

Queue settings resolved from: inline directive → session entry → channel config → global config → plugin default (`queue/settings.ts:32-68`).

---

## Authorization Gating

`command-auth.ts:218-343`:

| Layer | Config Path | Effect |
|-------|------------|--------|
| Owner allow | `cfg.commands.ownerAllowFrom` | Explicit owner list (supports `provider:id` prefixed entries) |
| Command allow | `cfg.commands.allowFrom` | Per-provider or global `*` command authorization |
| Channel enforce | `dock.commands.enforceOwnerForCommands` | Channel-level strict owner enforcement |
| Context inject | `ctx.OwnerAllowFrom` | Context-injected overrides (trusted, config-derived) |

Sender candidates resolved from `senderId`, `senderE164`, `from` — provider-specific priority.

---

## Group Chat Activation

`reply/groups.ts:31-56`:

- `requireMention = true` (default): bot replies only when `ctx.WasMentioned === true`
- `requireMention = false`: "always-on" mode, bot receives every group message
- Controlled by channel dock via `dock.groups.resolveRequireMention()`

---

## Reply Generation Modes

### Templated Replies (commands, status, errors)
- `buildStatusReply()` at `reply/commands-status.ts`
- `applyTemplate(str, ctx)` at `templating.ts:196-204` — `{{Placeholder}}` interpolation
- `responsePrefix` template prepended to all final replies
- Error messages for auth failures returned as static strings

### AI-Generated Replies (`agent-runner.ts:98-730`)
- Full `runAgentTurnWithFallback()` path calling configured provider/model
- System prompt: `extraSystemPrompt` (group context, metadata, activation intro) + agent system prompt
- User prompt: `prefixedCommandBody` (thread context + media notes + `UntrustedContext` + message body)
- `blockStreamingEnabled` controls partial reply streaming via `onBlockReply` callbacks

### Heartbeat Replies (`heartbeat.ts:6-9`)
- Default prompt: `"Read HEARTBEAT.md if it exists..."`
- `HEARTBEAT_OK` token stripped from output
- Short ack replies (≤300 chars) silently dropped
- `isHeartbeatContentEffectivelyEmpty()` skips API call when no actionable tasks

### Silent Reply Token (`tokens.ts:3-4`, `normalize-reply.ts:39-44`)
- `NO_REPLY` token: if AI responds with this at start or end, reply is silently dropped
- Used in group chats to allow the model to "lurk"

---

## Typing Controller State Machine

`reply/typing.ts:14-196`:

```
createTypingController()
  ├── startTypingLoop()  — fires at typingIntervalSeconds (default 6s)
  ├── markRunComplete()  — called when agent execution finishes
  ├── markDispatchIdle() — called when all deliveries complete
  └── maybeStopOnIdle()  — stops only when BOTH conditions true
```

- `sealed` flag prevents restart after stop (protects against late callback re-entry)
- Typing TTL timer (`typingTtlMs = 2m`) auto-stops indicator for long-running operations

---

## Configuration

| Config Path | Effect | Source |
|---|---|---|
| `cfg.agents.defaults.heartbeat.model` | Heartbeat model override | `get-reply.ts:87` |
| `cfg.agents.defaults.typingIntervalSeconds` | Typing indicator interval | `get-reply.ts:112` |
| `cfg.agents.defaults.thinkingDefault` | Default think level | `get-reply-directives.ts:342` |
| `cfg.agents.defaults.verboseDefault` | Default verbose level | `get-reply-directives.ts:346` |
| `cfg.agents.defaults.blockStreamingDefault` | Enable block streaming | `get-reply-directives.ts:358` |
| `cfg.agents.defaults.contextTokens` | Context token budget | `get-reply-directives.ts:392` |
| `cfg.commands.ownerAllowFrom` | Owner sender allowlist | `command-auth.ts:109` |
| `cfg.commands.allowFrom` | Command authorization list | `command-auth.ts:156` |
| `cfg.commands.text` | Enable/disable text commands | `commands-registry.ts:521` |
| `cfg.messages.inbound.debounceMs` | Inbound debounce delay | `inbound-debounce.ts:29` |
| `cfg.messages.inbound.byChannel` | Per-channel debounce | `inbound-debounce.ts:26` |
| `cfg.messages.queue.mode` | Queue mode | `queue/settings.ts:43` |
| `cfg.messages.queue.debounceMs` | Queue debounce | `queue/settings.ts:47` |
| `cfg.messages.queue.cap` | Queue depth cap | `queue/settings.ts:55` |
| `cfg.messages.queue.drop` | Drop policy (old/new/summarize) | `queue/settings.ts:60` |
| `cfg.session.scope` | Session scope (per-sender/shared) | `session.ts:124` |
| `cfg.session.resetTriggers` | Commands that start new session | `session.ts:121` |
| `cfg.session.typingMode` | Typing indicator mode | `get-reply-run.ts:167` |
| `cfg.session.mainKey` | Main session key | `session.ts:115` |

---

## Key Types

| Type | File:Line | Purpose |
|---|---|---|
| `MsgContext` | `templating.ts:13` | Full inbound message context (40+ fields) |
| `FinalizedMsgContext` | `templating.ts:146` | MsgContext with `CommandAuthorized: boolean` (not optional) |
| `TemplateContext` | `templating.ts:154` | MsgContext + BodyStripped, SessionId, IsNewSession |
| `ReplyPayload` | `types.ts:58` | Outbound message: text, mediaUrl, replyToId, isError, etc. |
| `GetReplyOptions` | `types.ts:16` | Reply callbacks: onBlockReply, onToolResult, onModelSelected |
| `InlineDirectives` | `reply/directive-handling.parse.ts:18` | Parsed directive state from message body |
| `FollowupRun` | `reply/queue/types.ts:21` | Full agent run descriptor for queuing |
| `QueueSettings` | `reply/queue/types.ts:12` | mode, debounceMs, cap, dropPolicy |
| `CommandContext` | `reply/commands-types.ts` | isAuthorizedSender, senderIsOwner, commandBodyNormalized |
| `ChatCommandDefinition` | `commands-registry.types.ts:52` | Command schema: key, textAliases, args, scope |
| `ReplyDispatcher` | `reply/reply-dispatcher.ts:72` | sendToolResult, sendBlockReply, sendFinalReply, waitForIdle |
| `TypingController` | `reply/typing.ts:4` | startTypingLoop, markRunComplete, markDispatchIdle, cleanup |
| `SessionInitResult` | `reply/session.ts:39` | sessionCtx, sessionEntry, isNewSession, resetTriggered |
