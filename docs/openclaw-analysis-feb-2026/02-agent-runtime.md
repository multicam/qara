# Agent Runtime Architecture

## Overview

The agent runtime is the AI execution engine — it takes a user message, orchestrates model calls with tools, and streams results back through the gateway. Built on top of **Pi Agent Core SDK** (`@mariozechner/pi-coding-agent`).

---

## Directory Structure

```
src/agents/
├── pi-embedded-runner/              <- Core orchestration
│   ├── run.ts                       <- runEmbeddedPiAgent() — THE entry point
│   ├── run/
│   │   ├── attempt.ts               <- Single execution attempt
│   │   ├── payloads.ts              <- Build result payloads from assistant text; also contains centralized tool error warning policy (resolveToolErrorWarningPolicy at lines 55-81)
│   │   ├── images.ts                <- Detect/load images for vision models
│   │   ├── compaction-timeout.ts    <- Snapshot recovery on compaction timeout
│   │   ├── params.ts                <- ClientToolDefinition for OpenResponses
│   │   └── types.ts                 <- EmbeddedRunAttemptParams/Result
│   ├── runs.ts                      <- ACTIVE_EMBEDDED_RUNS registry + waiters
│   ├── model.ts                     <- resolveModel() — find model in registry
│   ├── system-prompt.ts             <- buildEmbeddedSystemPrompt()
│   ├── session-manager-init.ts      <- prepareSessionManagerForRun()
│   ├── session-manager-cache.ts     <- Session file prewarming
│   ├── history.ts                   <- Turn limiting, DM history caps
│   ├── lanes.ts                     <- Session + global concurrency lanes
│   ├── compact.ts                   <- Manual compaction trigger
│   ├── google.ts                    <- Gemini-specific sanitization
│   ├── extra-params.ts              <- Stream param injection
│   ├── tool-split.ts                <- Built-in vs custom tool separation
│   ├── tool-result-context-guard.ts <- Overflow detection per tool result
│   ├── tool-result-truncation.ts    <- Truncate oversized results
│   ├── abort.ts                     <- Abort signal coordination for runs
│   ├── cache-ttl.ts                 <- Cache TTL annotation helpers
│   ├── compaction-safety-timeout.ts <- Safety timeout wrapping compaction waits
│   ├── extensions.ts                <- Pi SDK extension path builder
│   ├── logger.ts                    <- Run-scoped logger factory
│   ├── sandbox-info.ts              <- Sandbox metadata extraction
│   ├── thinking.ts                  <- Thinking-level resolution & fallback
│   └── wait-for-idle-before-flush.ts <- Idle detection before final flush
│
├── pi-embedded-subscribe.ts                    <- Event handler factory
├── pi-embedded-subscribe.handlers.ts           <- Event dispatch switch
├── pi-embedded-subscribe.handlers.lifecycle.ts <- agent_start/end
├── pi-embedded-subscribe.handlers.messages.ts  <- message streaming
├── pi-embedded-subscribe.handlers.tools.ts     <- tool_execution events
├── pi-embedded-subscribe.handlers.compaction.ts <- compaction events
│
├── tools/                           <- Individual tool implementations
│   ├── browser-tool.ts              <- Puppeteer browser control
│   ├── canvas-tool.ts               <- Canvas rendering
│   ├── cron-tool.ts                 <- Cron scheduling
│   ├── discord-actions*.ts          <- Discord messaging
│   ├── image-tool.ts                <- Image analysis
│   ├── memory-tool.ts               <- Memory read/search
│   ├── message-tool.ts              <- Cross-channel messaging
│   ├── sessions-spawn-tool.ts       <- Sub-agent spawning
│   ├── slack-actions.ts             <- Slack messaging
│   ├── telegram-actions.ts          <- Telegram messaging
│   ├── tts-tool.ts                  <- Text-to-speech
│   ├── web-fetch.ts                 <- URL fetching
│   ├── web-search.ts                <- Web search
│   ├── whatsapp-actions.ts          <- WhatsApp messaging
│   ├── agents-list-tool.ts          <- List available agents
│   ├── agent-step.ts                <- Single-step agent invocation
│   ├── gateway-tool.ts              <- Direct gateway RPC from within agent
│   ├── nodes-tool.ts                <- Node registry queries
│   ├── subagents-tool.ts            <- Subagent management interface
│   ├── sessions-history-tool.ts     <- Session history retrieval
│   ├── sessions-list-tool.ts        <- Session enumeration
│   ├── session-status-tool.ts       <- Session status probe
│   └── sessions-send-tool.a2a.ts    <- Agent-to-agent session delivery
│
├── sandbox/                         <- Docker execution sandbox
│   ├── config.ts                    <- resolveSandboxConfigForAgent()
│   ├── context.ts                   <- resolveSandboxContext()
│   ├── docker.ts                    <- Container build args
│   ├── fs-bridge.ts                 <- Host<->container filesystem bridge
│   ├── manage.ts                    <- Container lifecycle
│   └── tool-policy.ts              <- Sandbox tool allow/deny
│
├── skills/                          <- Skill system
│   ├── workspace.ts                 <- loadWorkspaceSkillEntries()
│   ├── bundled-dir.ts               <- Built-in skills directory
│   ├── config.ts                    <- Skill allowlist resolution
│   ├── filter.ts                    <- Eligibility filtering
│   ├── frontmatter.ts              <- YAML frontmatter parsing
│   └── env-overrides.ts            <- Skill env var injection
│
├── auth-profiles/                   <- Auth profile management
│   ├── constants.ts                 <- Shared constants
│   ├── display.ts                   <- Profile display helpers
│   ├── doctor.ts                    <- Diagnostic / doctor checks
│   ├── external-cli-sync.ts         <- External CLI auth sync
│   ├── oauth.ts                     <- OAuth flow
│   ├── order.ts                     <- Profile ordering / priority
│   ├── paths.ts                     <- File path resolution
│   ├── profiles.ts                  <- Profile CRUD
│   ├── repair.ts                    <- Profile repair utilities
│   ├── session-override.ts          <- Per-session auth overrides
│   ├── store.ts                     <- Profile store init
│   ├── types.ts                     <- Type definitions
│   └── usage.ts                     <- Cooldown tracking
│
├── owner-display.ts                 <- resolveOwnerDisplaySetting() — resolves owner display hashing for system prompt
├── system-prompt.ts                 <- buildAgentSystemPrompt() — full prompt
├── system-prompt-params.ts          <- Runtime info for prompt
├── model-catalog.ts                 <- Discover all available models
├── model-fallback.ts                <- Multi-model failover
├── model-selection.ts               <- Normalize refs, build fallback list
├── workspace.ts                     <- Workspace defaults, template expansion
├── workspace-run.ts                 <- Workspace dir resolution
├── bash-tools.ts                    <- createExecTool(), createProcessTool()
├── bash-tools.exec.ts               <- Exec implementation
├── bash-tools.exec-approval-request.ts <- Approval gateway call
├── pi-tools.ts                      <- createOpenClawCodingTools() — ALL tools
├── pi-tools.before-tool-call.ts     <- Hook wrapping + loop detection
├── pi-tools.policy.ts               <- Tool allow/deny resolution
├── tool-policy.ts                   <- TOOL_GROUPS, TOOL_PROFILES
├── session-write-lock.ts            <- File-level session lock
├── session-file-repair.ts           <- Corruption recovery
├── memory-search.ts                 <- Memory/embedding config
└── pi-extensions/                   <- Compaction & context pruning
    ├── compaction-safeguard.ts
    └── context-pruning/
```

---

## Agent Run Lifecycle

```
runEmbeddedPiAgent()                                    <- run.ts
|
+- 1. QUEUE & LANE
|   +- resolveSessionLane(sessionKey)     per-session serialization
|   +- resolveGlobalLane(lane)            global concurrency control
|   +- double-enqueue: session lane -> global lane
|
+- 2. HOOKS & MODEL RESOLUTION
|   +- fire before_model_resolve hook
|   +- fire before_agent_start hook (legacy)
|   +- resolveModel(provider, modelId)
|       +- Pi SDK model registry lookup
|       +- Inline config models (cfg.models.providers[].models)
|       +- Forward-compat alias fallback
|
+- 3. AUTH PROFILE SELECTION
|   +- resolveAuthProfileOrder() -> ordered candidates
|   +- Skip profiles in cooldown
|   +- applyApiKeyInfo() -> set runtime API key
|   +- Special: Copilot token exchange
|
+- 4. ATTEMPT LOOP  (retries on overflow/auth failure)
|   |
|   +-> runEmbeddedAttempt()                            <- attempt.ts
|       |
|       +- Sandbox resolution
|       +- Skill loading + env overrides
|       +- Bootstrap/context file resolution
|       |
|       +- TOOL ASSEMBLY
|       |   createOpenClawCodingTools()
|       |   +- Pi SDK built-in: read, edit, write, grep, glob
|       |   +- OpenClaw custom: message, browser, sessions, etc.
|       |   +- Bash: exec tool + process tool
|       |   +- All wrapped with beforeToolCallHook
|       |
|       +- SYSTEM PROMPT BUILD
|       |   buildAgentSystemPrompt()
|       |   +- ~20 parameterized sections (see below)
|       |
|       +- SESSION CREATION
|       |   +- SessionManager.open(sessionFile)
|       |   +- createAgentSession({ model, tools, ... })
|       |   +- Override system prompt on Pi session
|       |   +- History sanitize -> validate -> truncate -> repair
|       |
|       +- EVENT SUBSCRIPTION
|       |   subscribeEmbeddedPiSession()
|       |   +- Intercepts all Pi SDK events for broadcast
|       |
|       +- REGISTER ACTIVE RUN
|       |   setActiveEmbeddedRun(sessionId, handle)
|       |
|       +- START TIMEOUT TIMER
|       |
|       +- FIRE before_prompt_build HOOK
|       |   (can inject prependContext or override systemPrompt)
|       |
|       +- DETECT IMAGES (for vision models)
|       |
|       +- SUBMIT PROMPT
|       |   activeSession.prompt(text, { images })
|       |
|       +- WAIT FOR COMPACTION (if triggered)
|       |
|       +- CLEANUP
|           unsubscribe(), clearActiveRun(), release lock
|
+- ON CONTEXT OVERFLOW:
|   +- compactEmbeddedPiSessionDirect() (up to 3x)
|   +- tool-result truncation fallback
|
+- ON AUTH/RATE-LIMIT FAILURE:
|   +- advanceAuthProfile() -> try next profile
|   +- throw FailoverError -> model-fallback catches it
|
+- ON COMPACTION TIMEOUT:
    +- Use pre-compaction snapshot, flag timedOut
```

### Phase Details

**Phase 1: Queue & Workspace Resolution** (`run.ts:174-211`)
```typescript
const sessionLane = resolveSessionLane(params.sessionKey?.trim() || params.sessionId);
const globalLane = resolveGlobalLane(params.lane);
const enqueueSession = (task, opts) => enqueueCommandInLane(sessionLane, task, opts);
return enqueueSession(() => enqueueGlobal(async () => {
  const workspaceResolution = resolveRunWorkspaceDir({ ... });
```
Runs are double-enqueued: once in a per-session lane and once in a global lane. This serializes concurrent requests for the same session.

**Phase 2: Hook-Driven Model Resolution** (`run.ts:225-268`)
- Fires `before_model_resolve` hook, then legacy `before_agent_start` for provider/model overrides
- Calls `resolveModel(provider, modelId, agentDir, config)` at `run.ts:270`
- Validates context window against `CONTEXT_WINDOW_HARD_MIN_TOKENS` / `CONTEXT_WINDOW_WARN_BELOW_TOKENS`

**Phase 3: Auth Profile Selection** (`run.ts:311-475`)
- `resolveAuthProfileOrder()` returns ordered candidates
- `profileCandidates` array tried in order; cooldown profiles are skipped
- `applyApiKeyInfo()` resolves the actual API key and calls `authStorage.setRuntimeApiKey()`
- GitHub Copilot tokens are exchanged via `resolveCopilotApiToken()`

**Phase 4: Main Attempt Loop** (`run.ts:484-1083`)
Calls `runEmbeddedAttempt()` and handles:
- Context overflow -> `compactEmbeddedPiSessionDirect()` up to 3 times, then tool result truncation
- Prompt errors -> auth profile rotation if failover-classified, thinking level fallback
- Timeout during compaction -> flags `timedOutDuringCompaction`, uses pre-compaction snapshot
- Auth/rate-limit failures -> `advanceAuthProfile()`, then throws `FailoverError` if fallbacks configured

**Phase 5: Single Attempt** (`run/attempt.ts:219-1279`)
1. **Sandbox resolution** (`attempt.ts:233`): `resolveSandboxContext()` determines Docker mode
2. **Skill loading** (`attempt.ts:249-267`): `loadWorkspaceSkillEntries()` + `applySkillEnvOverrides()`
3. **Bootstrap/context file resolution** (`attempt.ts:270-281`): `resolveBootstrapContextForRun()`
4. **Tool assembly** (`attempt.ts:288-326`): `createOpenClawCodingTools()` with all context injected
5. **System prompt build** (`attempt.ts:434-485`): `buildEmbeddedSystemPrompt()` -> `buildAgentSystemPrompt()`
6. **Session creation** (`attempt.ts:514-586`): `SessionManager.open()` -> `createAgentSession()` from Pi SDK
7. **History sanitization** (`attempt.ts:662-700`): sanitize -> validate -> truncate -> repair pairing
8. **Subscription** (`attempt.ts:754-776`): `subscribeEmbeddedPiSession()` attaches to session events
9. **Active run registration** (`attempt.ts:801`): `setActiveEmbeddedRun(sessionId, queueHandle)`
10. **Timeout timer** (`attempt.ts:805-835`): `setTimeout(abortRun, timeoutMs)`
11. **Hook: before_prompt_build** (`attempt.ts:888-930`): can inject `prependContext` or `systemPrompt`
12. **Image detection** (`attempt.ts:963-988`): `detectAndLoadPromptImages()` for vision-capable models
13. **Prompt submission** (`attempt.ts:1043-1046`): `activeSession.prompt(effectivePrompt, {images})`
14. **Compaction wait** (`attempt.ts:1067`): `waitForCompactionRetry()` - blocks until all compactions done
15. **Cleanup** (`attempt.ts:1183-1193`): `unsubscribe()`, `clearActiveEmbeddedRun()`, session lock release

---

## Pi Agent Core Integration

Pi Agent Core (`@mariozechner/pi-agent-core`, `@mariozechner/pi-coding-agent`) is an embedded npm package. OpenClaw imports it at `attempt.ts:6-7`:

```typescript
import { streamSimple } from "@mariozechner/pi-ai";
import { createAgentSession, SessionManager, SettingsManager } from "@mariozechner/pi-coding-agent";
```

### Key integration points

| What | Where | How |
|------|-------|-----|
| Session creation | `attempt.ts:575-586` | `createAgentSession({ model, tools, customTools, sessionManager, ... })` |
| System prompt override | `attempt.ts:587`, `system-prompt.ts:87-99` | Mutates `session.agent._baseSystemPrompt` and `_rebuildSystemPrompt` |
| Stream function override | `attempt.ts:625-637` | `activeSession.agent.streamFn = streamSimple` (or Ollama override) |
| Prompt submission | `attempt.ts:1043` | `activeSession.prompt(text, {images})` |
| Message history | `attempt.ts:691` | `activeSession.agent.replaceMessages(limited)` |
| Steer (mid-run inject) | `runs.ts:794` | `activeSession.steer(text)` |
| Abort | `attempt.ts:728` | `activeSession.abort()` |
| Compaction settings | `attempt.ts:531-534` | `applyPiCompactionSettingsFromConfig(settingsManager, cfg)` |
| Extensions (pruning) | `attempt.ts:537-543` | `buildEmbeddedExtensionPaths({ cfg, sessionManager, ... })` |

### Custom vs built-in tools split (`tool-split.ts`)

`splitSdkTools()` separates tools the Pi SDK handles natively (file ops, grep, find) from custom tools (messaging, sessions, browser, etc.) that OpenClaw implements:

```typescript
// attempt.ts:548-551
const { builtInTools, customTools } = splitSdkTools({
  tools,
  sandboxEnabled: !!sandbox?.enabled,
});
```

### System prompt override application (`system-prompt.ts:87-99`)

```typescript
export function applySystemPromptOverrideToSession(session, override) {
  const prompt = typeof override === "function" ? override() : override.trim();
  session.agent.setSystemPrompt(prompt);
  // Patch Pi SDK's internal rebuild to always return our override
  session._baseSystemPrompt = prompt;
  session._rebuildSystemPrompt = () => prompt;
}
```

---

## Model Selection & Fallback

### Model Resolution (`pi-embedded-runner/model.ts:43-102`)

Three-stage resolution:
1. `modelRegistry.find(provider, modelId)` — looks up Pi SDK's registered models from `models.json`
2. Inline config check: `cfg.models.providers[provider].models` — user-defined provider models
3. Forward-compat fallback: `resolveForwardCompatModel()` — handles renamed/aliased model IDs
4. Generic fallback for configured providers with unknown model IDs (uses `openai-responses` API)

### Model Catalog (`model-catalog.ts:78-165`)

Singleton promise with no-cache-on-empty guard. Dynamically imports the Pi SDK to allow test mocking.

### Model Fallback (`model-fallback.ts:295-419`)

```
runWithModelFallback()
|
+- Build candidate list:
|   primary model -> cfg.agents.defaults.model.fallbacks[]
|
+- For each candidate:
|   |
|   +- Skip if all auth profiles in cooldown
|   |   (unless probe window: soonest expiry < 2 min -> allow 1 probe/30s)
|   |
|   +- Try: run(provider, model)
|   |   +- Success -> return result
|   |   +- FailoverError -> record attempt, try next
|   |
|   +- Non-failover errors (AbortError, context overflow) -> rethrow
|
+- All candidates exhausted -> throw last error
```

Example chain:
```
  anthropic/claude-opus-4-6
    -> openai/gpt-4o           (fallback 1)
    -> google/gemini-2.5-pro   (fallback 2)
    -> ollama/llama3.3         (fallback 3)
```

**Probe throttling**: For the primary model in cooldown, `shouldProbePrimaryDuringCooldown()` (`model-fallback.ts:261-285`) allows one probe attempt every 30 seconds when the soonest cooldown expiry is within 2 minutes.

---

## Tool System

### Assembly Pipeline

```
createOpenClawCodingTools()                    <- pi-tools.ts
|
+- Pi SDK built-in tools
|   +- readTool, createEditTool, createWriteTool
|   +- globTool, grepTool
|   +- (managed by Pi SDK session)
|
+- OpenClaw custom tools
|   +- message-tool      (cross-channel send)
|   +- browser-tool       (Puppeteer)
|   +- canvas-tool        (rendering)
|   +- cron-tool          (scheduling)
|   +- memory-tool        (embeddings search)
|   +- sessions-spawn     (sub-agent launch)
|   +- image-tool         (vision/analysis)
|   +- web-fetch / search (internet access)
|   +- tts-tool           (text-to-speech)
|   +- channel actions    (telegram, slack, discord, whatsapp)
|
+- Bash tools
|   +- exec              (command execution)
|   +- process            (long-running processes)
|
+- All wrapped with beforeToolCallHook
    +- Loop detection (critical -> block)
    +- Plugin hook: before_tool_call (can block or mutate params)
    +- Pass through to actual execute()
```

### Tool Policy

```
applyToolPolicyPipeline()
|
+- TOOL_PROFILES:
|   minimal  -> read, edit, write, glob, grep, exec
|   coding   -> minimal + browser, canvas, image, web_fetch
|   messaging -> coding + message, telegram, slack, discord, whatsapp
|   full     -> everything
|
+- TOOL_GROUPS (named expansions):
|   group:fs       -> read, edit, write, glob, grep, apply_patch
|   group:runtime  -> exec, process
|   group:web      -> web_fetch, web_search, browser
|   group:comms    -> message, telegram, slack, discord, whatsapp
|
+- Owner-only gates:
|   whatsapp_login, cron, gateway -> require senderIsOwner
|
+- Sandbox policy:
|   sandbox/tool-policy.ts -> separate allow/deny for containers
|
+- Config-driven:
    cfg.agents[id].tools.allow / .deny
```

### Exec Approval Flow

```
Agent calls exec("rm -rf /tmp/stuff")
         |
         v
  Check security level:
    safe (in safeBins list) -> execute immediately
    normal/elevated         -> check ask policy
         |
         v
  ask: "never"     -> execute
  ask: "untrusted" -> check trust, maybe approve
  ask: "always"    -> always approve
         |
         v
  requestExecApprovalDecision()
    -> callGatewayTool("exec.approval.request", { command, cwd, ... })
    -> Gateway broadcasts to WS clients
    -> UI prompts user: Allow / Deny
    -> Decision returned
         |
    +----+----+
    v         v
  allow     deny
  execute   throw error
```

**Security levels** (`ExecSecurity`): `"safe"` / `"normal"` / `"elevated"` control which commands are allowed without approval. `ExecAsk` values: `"never"` / `"untrusted"` / `"always"`.

**Safe bins** (`infra/exec-approvals.ts`): `resolveSafeBins()` returns a trusted binary allowlist. Commands matching safe bins skip the approval gateway.

**Before-tool-call hook** (`pi-tools.before-tool-call.ts:74-173`):
```typescript
export async function runBeforeToolCallHook(args) {
  // 1. Tool loop detection (critical -> block, warning -> log)
  const loopResult = detectToolCallLoop(sessionState, toolName, params, loopDetection);
  if (loopResult.stuck && loopResult.level === "critical") {
    return { blocked: true, reason: loopResult.message };
  }
  // 2. Plugin hook: before_tool_call
  const hookResult = await hookRunner.runBeforeToolCall({ toolName, params }, hookCtx);
  if (hookResult?.block) return { blocked: true, reason: hookResult.blockReason };
  // 3. Return possibly-mutated params
  return { blocked: false, params: hookResult?.params ?? args.params };
}
```

---

## System Prompt Construction

`buildAgentSystemPrompt()` assembles ~20 sections (`system-prompt.ts:169-639`):

```
+------------------------------------------------------+
|  SYSTEM PROMPT (full mode)                           |
+------------------------------------------------------+
|  1. Agent Identity                                   |
|     "You are a personal assistant running in OC"     |
|                                                      |
|  2. Tooling                                          |
|     Filtered tool list + usage guidance              |
|                                                      |
|  3. Safety                                           |
|     No self-preservation, power-seeking, bypass      |
|                                                      |
|  4. CLI Quick Reference                              |
|     Gateway commands cheat sheet                     |
|                                                      |
|  5. Skills          <- stripped in subagent mode      |
|     <available_skills> XML listing                   |
|                                                      |
|  6. Memory Recall   <- stripped in subagent mode      |
|     memory_search / memory_get instructions          |
|                                                      |
|  7. Self-Update     <- stripped in subagent mode      |
|     Gateway tool guidance                            |
|                                                      |
|  8. Model Aliases   <- stripped in subagent mode      |
|     Configured model alias lines                     |
|                                                      |
|  9. Workspace                                        |
|     Working directory, sandbox paths                 |
|                                                      |
| 10. Documentation   <- stripped in subagent mode      |
|     Docs path, links                                 |
|                                                      |
| 11. Sandbox (when enabled)                           |
|     Container paths, browser CDP, elevated mode      |
|                                                      |
| 12. User Identity   <- stripped in subagent mode      |
|     Owner phone numbers                              |
|                                                      |
| 13. Date & Time                                      |
|     Current time + timezone                          |
|                                                      |
| 14. Reply Tags      <- stripped in subagent mode      |
|     [[reply_to_current]] syntax                      |
|                                                      |
| 15. Messaging       <- stripped in subagent mode      |
|     Channel routing, message tool hints              |
|                                                      |
| 16. Voice/TTS       <- stripped in subagent mode      |
|                                                      |
| 17. Group/Subagent Context (when present)            |
|     extraSystemPrompt injection                      |
|                                                      |
| 18. Reactions (when configured)                      |
|                                                      |
| 19. Reasoning Format (when reasoningTagHint set)     |
|     <think> / <final> tag instructions               |
|                                                      |
| 20. Project Context                                  |
|     All workspace files (BOOTSTRAP, SOUL, etc.)      |
|     under ## <path> headers                          |
|                                                      |
| 21. Silent Replies  <- stripped in subagent mode      |
|     SILENT_REPLY_TOKEN instructions                  |
|                                                      |
| 22. Heartbeats      <- stripped in subagent mode      |
|     HEARTBEAT_OK ack format                          |
|                                                      |
| 23. Runtime                                          |
|     Host, OS, model, shell, channel, thinking level  |
+------------------------------------------------------+
```

**Subagent mode** (`promptMode: "minimal"`) strips: Skills, Memory, Docs, Self-Update, Model Aliases, User Identity, Reply Tags, Messaging, TTS, Silent Replies, Heartbeats, Reactions. It uses a `## Subagent Context` header instead of `## Group Chat Context`.

---

## Event Pipeline

```
Pi SDK session events
         |
         v
subscribeEmbeddedPiSession()
         |
    +----+--------------------------------------------+
    | createEmbeddedPiSessionEventHandler()           |
    |                                                  |
    |  switch(event.type):                             |
    |                                                  |
    |  agent_start/end                                 |
    |    -> emitAgentEvent("lifecycle", phase)          |
    |                                                  |
    |  message_start                                   |
    |    -> init text accumulator                       |
    |                                                  |
    |  message_update                                  |
    |    -> accumulate text chunks                      |
    |    -> strip <think>/<final> tags                  |
    |    -> paragraph-preference chunking               |
    |    -> emitAgentEvent("message", delta)            |
    |    -> onBlockReply() for channel delivery         |
    |                                                  |
    |  message_end                                     |
    |    -> flush remaining text                        |
    |    -> emitAgentEvent("message", final)            |
    |                                                  |
    |  tool_execution_start                            |
    |    -> emitAgentEvent("tool", { name, params })   |
    |                                                  |
    |  tool_execution_end                              |
    |    -> record toolMetas[]                          |
    |    -> track messaging tool outputs                |
    |    -> fire after_tool_call plugin hook            |
    |    -> emitAgentEvent("tool", { result })          |
    |                                                  |
    |  auto_compaction_start/end                       |
    |    -> emitAgentEvent("lifecycle", compaction)     |
    +--------------------------------------------------+
         |
         v
Gateway's createAgentEventHandler()
    -> broadcast to WS clients
    -> forward to originating channel
```

---

## Session & Concurrency

```
Concurrent messages to same session:
|
+- resolveSessionLane(sessionKey) -> per-session queue
+- resolveGlobalLane(lane)        -> global queue
|
+- Double-enqueue ensures:
    1. Same session = strictly serialized
    2. Global lane = bounded concurrency across sessions

Session file:
  agentDir/sessions/<sessionId>.json  (Pi SDK format)

Write protection:
  acquireSessionWriteLock(sessionFile)
    +- File-level lock (maxHoldMs = timeout)
    +- Prevents parallel writes
    +- Released in finally block

Session repair:
  repairSessionFileIfNeeded()
    +- Fix truncated JSON
    +- Fix orphaned tool results (unpaired)

guardSessionManager() wraps SessionManager:
    +- Injects agent ID metadata
    +- Tracks input provenance
    +- Guards synthetic tool result pairing
```

---

## Memory & Context Injection

```
Workspace files (resolved at run start):
  BOOTSTRAP.md, SOUL.md, AGENTS.md, TOOLS.md,
  IDENTITY.md, USER.md, HEARTBEAT.md
         |
         v
  Injected as ## <filename> sections
  under "# Project Context" in system prompt

Memory search (when configured):
  +- Sources: ["memory", "sessions"]
  +- Provider: openai | local | gemini | voyage | auto
  +- Store: SQLite + sqlite-vec at store.path
  +- Chunking: tokens / overlap
  +- Sync: onSessionStart, onSearch, watch

Context window management:
  +- evaluateContextWindowGuard()
  |   hard min tokens -> block run
  |   soft warn tokens -> log warning
  |
  +- Context overflow -> compactEmbeddedPiSessionDirect() (up to 3x)
  |
  +- Cache TTL pruning (optional):
      appendCacheTtlTimestamp() after each prompt
      -> pruner selectively drops old turns
```

---

## Sandbox / Docker Execution

### Sandbox Context Resolution (`sandbox/context.ts`)

`resolveSandboxContext({ config, sessionKey, workspaceDir })` returns a `SandboxContext` or `null`:

```typescript
type SandboxContext = {
  enabled: boolean;
  workspaceDir: string;           // Host-side workspace
  containerWorkspaceDir: string;  // Container-side path
  workspaceAccess: "none" | "ro" | "rw";
  fsBridge?: FsBridge;            // Host<->container file bridge
  browserBridgeUrl?: string;      // CDP URL for browser tool
  scope: "agent" | "session" | "shared";
};
```

### Docker Config (`sandbox/config.ts:54-97`)

`resolveSandboxDockerConfig()` merges global + agent-specific Docker settings. Defaults:
- `readOnlyRoot: true`
- `network: "none"`
- `capDrop: ["ALL"]`
- `tmpfs: ["/tmp", "/var/tmp", "/run"]`

### Bash Tool Execution (`bash-tools.exec.ts`)

The `exec` tool routes through `runExecProcess()`. For sandboxed runs, commands are executed inside the Docker container. For elevated (host) mode, they go through `executeNodeHostCommand()`.

---

## Subagent System

OpenClaw supports a first-class subagent model where a parent agent can spawn, track, and receive results from child agents across sessions.

### Registry (`subagent-registry.ts` family)

```
src/agents/subagents/
├── subagent-registry.ts           <- Core registry: register, resolve, update state
├── subagent-registry.persistence.ts  <- SQLite-backed persistence of subagent records
├── subagent-registry.cleanup.ts   <- TTL-based cleanup of completed/abandoned entries
├── subagent-registry.queries.ts   <- Query helpers (by parent, by status, by session)
└── subagent-registry.completion.ts <- Completion tracking + parent notification
```

### Lifecycle Files

| File | Purpose |
|---|---|
| `subagent-announce.ts` | Broadcasts subagent creation/completion events to gateway clients |
| `subagent-depth.ts` | Enforces a maximum nesting depth to prevent unbounded recursion |
| `subagent-spawn.ts` | Entry point for spawning a new subagent: validates depth, registers, enqueues run |

### Flow

```
Parent agent calls sessions-spawn-tool or subagents-tool
         |
         v
subagent-spawn.ts
  +- Check nesting depth via subagent-depth.ts
  +- Register in subagent-registry.ts
  +- Enqueue runEmbeddedPiAgent() for child session
  +- subagent-announce.ts -> broadcast "subagent.spawned" event
         |
  Child agent runs (same runtime, separate session lane)
         |
  On completion:
  +- subagent-registry.completion.ts records result
  +- subagent-announce.ts -> broadcast "subagent.ended" event
  +- Parent session is notified (can steer or continue)
```

---

## Additional Model Providers

The following model providers have been added to the Pi SDK model registry or supported via inline config:

| Provider | Notes |
|---|---|
| **Chutes** | Distributed inference provider |
| **MiniMax VLM** | Chinese multimodal LLM provider (vision + language) |
| **BytePlus / Doubao** | ByteDance's model API (Doubao series) |
| **Venice** | Privacy-focused inference API |
| **Together** | Together AI inference platform |
| **AWS Bedrock (discovery)** | Auto-discovers available Bedrock models from the caller's AWS account |
| **Opencode Zen** | Opencode's Zen model variant |

These providers are configured under `cfg.models.providers[]` or registered via `resolveModel()` inline config path (see Model Resolution in the Model Selection section above).

---

## Key Architectural Patterns

**Double-lane queuing** — Every run enqueues in both a per-session lane (serialization) and a global lane (concurrency cap). Same-session requests never overlap; cross-session requests run in parallel up to the global limit.

**Auth profile rotation** — Multiple API keys per provider, round-robin with cooldown tracking. Failed profiles are cooled down; probing resumes when cooldown approaches expiry.

**Pi SDK as embedded library** — The SDK's `createAgentSession` / `session.prompt()` / `session.subscribe()` are used directly, but the system prompt and stream function are monkey-patched after creation for full control.

**Hook-wrapped tools** — Every tool goes through `wrapToolWithBeforeToolCallHook()` which runs loop detection + plugin hooks before execution. This is separate from the exec-specific approval flow.

**Paragraph-preference text chunking** — The `EmbeddedBlockChunker` accumulates streamed text and emits at paragraph boundaries rather than arbitrary chunk boundaries, producing cleaner channel messages.
