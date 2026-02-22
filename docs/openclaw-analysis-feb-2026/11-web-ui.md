# 11 — Web UI

## Summary

- **Framework**: Lit 3.x (Web Components with TypeScript decorators). No React, Vue, or Svelte. The entire UI is one custom element `<openclaw-app>` defined with `@customElement`.
- **Single Component Architecture**: `OpenClawApp` (`ui/src/ui/app.ts:108`) holds all application state as `@state()` decorated properties. There are no child components — views are pure render functions that receive props.
- **Communication**: Exclusively WebSocket via `GatewayBrowserClient` (`ui/src/ui/gateway.ts:65`), a hand-rolled client supporting request/response pairs (JSON-framed `req`/`res`) and server-pushed `event` frames.
- **Auth Flow**: Ed25519 device keypair generated client-side, signed challenge/nonce exchange, device tokens stored in `localStorage`. Falls back to shared token or password on HTTP contexts.
- **Routing**: URL-path-based tab routing implemented from scratch using `window.history.pushState`/`popstate` — no router library. 13 tabs map to paths like `/chat`, `/config`, `/agents`.
- **State Management**: All state lives directly on the single `OpenClawApp` LitElement class as Lit reactive `@state()` properties (~120+ properties). No external state library.

---

## Directory Structure

```
ui/
├── index.html                          — Single-page entry point, mounts <openclaw-app>
├── package.json                        — Dependencies: lit, marked, dompurify, @noble/ed25519
├── vite.config.ts                      — Build config; outputs to ../dist/control-ui
├── vitest.config.ts                    — Browser tests via Playwright/Chromium
├── src/
│   ├── main.ts                         — Imports styles + app.ts (2 lines)
│   ├── styles.css                      — Aggregates 5 CSS partials
│   ├── styles/
│   │   ├── base.css                    — CSS custom properties (design tokens)
│   │   ├── layout.css                  — Shell grid layout
│   │   ├── layout.mobile.css           — Mobile breakpoints
│   │   ├── components.css              — Reusable component styles
│   │   ├── config.css                  — Config form styles
│   │   └── chat/                       — Chat-specific CSS partials
│   └── ui/
│       ├── app.ts                      — ROOT: OpenClawApp LitElement (all state)
│       ├── app-view-state.ts           — AppViewState type (all state fields + methods)
│       ├── app-render.ts               — renderApp() — tab dispatch function
│       ├── app-gateway.ts              — connectGateway(), handleGatewayEvent()
│       ├── app-chat.ts                 — Chat send/queue logic
│       ├── app-settings.ts             — Tab routing, theme, settings persistence
│       ├── app-lifecycle.ts            — connectedCallback/disconnectedCallback wiring
│       ├── app-polling.ts              — Interval-based polling (nodes/logs/debug)
│       ├── app-scroll.ts              — Chat/log auto-scroll
│       ├── app-tool-stream.ts          — Live tool execution streaming
│       ├── gateway.ts                  — GatewayBrowserClient (WebSocket)
│       ├── device-identity.ts          — Ed25519 keypair generation + storage
│       ├── device-auth.ts              — Device token store (localStorage)
│       ├── navigation.ts               — Tab/path mapping, URL helpers
│       ├── storage.ts                  — UiSettings load/save (localStorage)
│       ├── theme.ts                    — ThemeMode resolution
│       ├── theme-transition.ts         — View Transition API for theme changes
│       ├── markdown.ts                 — marked + DOMPurify render pipeline
│       ├── types.ts                    — Domain types (sessions, agents, channels, etc.)
│       ├── ui-types.ts                 — UI-only types (ChatAttachment, CronFormState)
│       ├── controllers/                — Gateway request functions (one per domain)
│       │   ├── chat.ts                 — loadChatHistory(), sendChatMessage()
│       │   ├── config.ts               — loadConfig(), saveConfig(), applyConfig()
│       │   ├── channels.ts             — loadChannels()
│       │   ├── sessions.ts             — loadSessions(), deleteSession()
│       │   ├── agents.ts               — loadAgents()
│       │   ├── usage.ts                — loadUsage(), loadTimeSeries()
│       │   ├── skills.ts               — loadSkills(), installSkill()
│       │   ├── logs.ts                 — loadLogs()
│       │   ├── nodes.ts                — loadNodes()
│       │   ├── cron.ts                 — loadCronJobs(), addCronJob()
│       │   └── ...
│       ├── views/                      — Pure render functions per tab
│       │   ├── chat.ts                 — renderChat()
│       │   ├── config.ts               — renderConfig()
│       │   ├── agents.ts               — renderAgents()
│       │   ├── channels.ts             — renderChannels()
│       │   ├── sessions.ts             — renderSessions()
│       │   ├── usage.ts                — renderUsage()
│       │   ├── overview.ts             — renderOverview()
│       │   ├── nodes.ts                — renderNodes()
│       │   ├── logs.ts                 — renderLogs()
│       │   ├── debug.ts                — renderDebug()
│       │   ├── cron.ts                 — renderCron()
│       │   ├── skills.ts               — renderSkills()
│       │   ├── config-form.ts          — Re-exports config form renderer
│       │   └── channels.*.ts           — Per-channel views (discord, slack, etc.)
│       ├── chat/                       — Chat message processing pipeline
│       │   ├── grouped-render.ts       — Message grouping renderer
│       │   ├── message-normalizer.ts   — Normalizes raw messages for display
│       │   ├── message-extract.ts      — Text extraction from message objects
│       │   └── tool-cards.ts           — Tool call card rendering
│       └── i18n/
│           ├── index.ts                — i18n exports
│           ├── lib/translate.ts        — t() function
│           ├── lib/lit-controller.ts   — I18nController for LitElement
│           └── locales/                — en, pt-BR, zh-CN, zh-TW
```

---

## Framework and Build Tooling

**Lit 3.3.2** — Google's Web Components library using `LitElement`, `@customElement`, `@state()` decorators, and tagged template literal `html\`...\`` for rendering.

Shadow DOM disabled: `createRenderRoot()` returns `this` (`app.ts:361-363`) — styles live in the regular document DOM.

**Vite 7.3.1** — outputs to `../dist/control-ui`. Base path configurable via `OPENCLAW_CONTROL_UI_BASE_PATH` env variable.

**Testing**: Vitest 4.0.18 with `@vitest/browser-playwright` running in headless Chromium.

**Key libraries**: `marked` 17.x (Markdown), `dompurify` 3.x (sanitization), `@noble/ed25519` 3.0.0 (device auth), `signal-polyfill`/`@lit-labs/signals` (TC39 Signals, optional enhancement).

---

## Component Architecture

### Single Root Component

One Lit custom element: `OpenClawApp` at `app.ts:107`. All views are plain TypeScript functions returning Lit `html` template results:

```
render() → renderApp(this as AppViewState)
```

### View Dispatch Pattern

`renderApp()` in `app-render.ts:91` — large conditional rendering one tab at a time:

```
state.tab === "overview" ? renderOverview({...}) : nothing
state.tab === "chat"     ? renderChat({...})     : nothing
state.tab === "config"   ? renderConfig({...})   : nothing
...
```

All 13 tabs use this `state.tab === "tabname" ? renderXxx({...props}) : nothing` pattern.

---

## Routing

`navigation.ts` — URL-path-based tab routing, no router library.

### Tab Groups

```
chat:     [chat]
control:  [overview, channels, instances, sessions, usage, cron]
agent:    [agents, skills, nodes]
settings: [config, debug, logs]
```

### Navigation Flow

```
User clicks nav item
  └── setTabInternal()
        ├── host.tab = newTab
        ├── stop inactive tab polling
        ├── syncUrlWithTab() → history.pushState("/config")
        └── refreshActiveTab() → load data for new tab

Browser back/forward
  └── popstate event → tabFromPath(pathname) → setTabFromRoute()
```

Base path support: `inferBasePath()` reads `window.__OPENCLAW_CONTROL_UI_BASE_PATH__` or infers from `window.location.pathname`.

---

## WebSocket Communication

### GatewayBrowserClient (`gateway.ts:65`)

Three frame types:

| Frame | Direction | Format |
|-------|-----------|--------|
| `req` | Client → Server | `{ type, id, method, params }` |
| `res` | Server → Client | `{ type, id, ok, payload?, error? }` |
| `event` | Server → Client | `{ type, event, payload?, seq? }` |

Request/response uses UUID-keyed pending promise map.

### Event Handling (`app-gateway.ts:191-290`)

| Event | Action |
|-------|--------|
| `"agent"` | Tool stream updates |
| `"chat"` | Streaming response delta/final/error |
| `"presence"` | Update presence entries |
| `"cron"` | Reload cron jobs |
| `"exec.approval.requested"` | Add to approval queue |
| `"exec.approval.resolved"` | Remove from approval queue |
| `GATEWAY_EVENT_UPDATE_AVAILABLE` | Set update flag |

### Reconnect Backoff

`gateway.ts:112-119` — exponential from 800ms, max 15s (factor 1.7x).

### Sequence Gap Detection

`gateway.ts:258-263` — tracks `lastSeq`, fires `onGap` callback when events are missed.

---

## Authentication Flow

```
Browser                                   Gateway
  │                                          │
  │  WebSocket connect                       │
  │─────────────────────────────────────>    │
  │                                          │
  │  event: connect.challenge { nonce }      │
  │<─────────────────────────────────────    │
  │                                          │
  │  [generate/load Ed25519 keypair]         │
  │  [sign(deviceId + nonce + scopes)]       │
  │                                          │
  │  req: connect { device, auth, scopes }   │
  │─────────────────────────────────────>    │
  │                                          │
  │  res: hello-ok { auth.deviceToken }      │
  │<─────────────────────────────────────    │
  │                                          │
  │  [store deviceToken in localStorage]     │
```

**Device identity** (`device-identity.ts:49-58`): Ed25519 via `@noble/ed25519`, SHA-256 fingerprint as deviceId, persisted in localStorage (`"openclaw-device-identity-v1"`).

**Fallbacks**: plain HTTP skips device identity (requires `allowInsecureAuth`); failed device token clears and falls back to shared API token; URL `?token=` param read on startup.

---

## State Management

All state lives on the `OpenClawApp` LitElement instance as ~120+ `@state()` decorated properties. When any property mutates, Lit schedules a re-render.

`AppViewState` at `app-view-state.ts:38` defines the full shape (290 lines) passed to view render functions.

Mutations via:
- Direct property assignment: `state.chatMessages = [...]`
- Module-level functions: `handleGatewayEvent(host, evt)`
- View callbacks as props: `onDraftChange: (next) => (state.chatMessage = next)`

`UiSettings` persisted to localStorage (`"openclaw.control.settings.v1"`).

---

## Pages/Views

| Tab | Path | View Function | Purpose |
|---|---|---|---|
| `chat` | `/chat` | `renderChat()` | Primary AI chat with streaming, tool cards, sidebar |
| `overview` | `/overview` | `renderOverview()` | Gateway health, connection settings, quick stats |
| `channels` | `/channels` | `renderChannels()` | Manage messaging platform connectors |
| `instances` | `/instances` | `renderInstances()` | Active gateway instances / presence |
| `sessions` | `/sessions` | `renderSessions()` | Browse, filter, patch, delete sessions |
| `usage` | `/usage` | `renderUsageTab()` | Token/cost analytics with charts |
| `cron` | `/cron` | `renderCron()` | Scheduled jobs management |
| `agents` | `/agents` | `renderAgents()` | Agent config, files, skills, tool profiles |
| `skills` | `/skills` | `renderSkills()` | Gateway-wide skill management |
| `nodes` | `/nodes` | `renderNodes()` | Remote nodes, device pairing, exec approvals |
| `config` | `/config` | `renderConfig()` | JSON/form config editor |
| `debug` | `/debug` | `renderDebug()` | Live event log, heartbeat, raw method calls |
| `logs` | `/logs` | `renderLogs()` | Streaming log viewer with level/text filters |

Per-channel views: `channels.discord.ts`, `channels.slack.ts`, `channels.telegram.ts`, `channels.whatsapp.ts`, `channels.signal.ts`, `channels.nostr.ts`, `channels.imessage.ts`, `channels.googlechat.ts`.

Config form split: `config-form.analyze.ts` (schema analysis), `config-form.node.ts` (recursive renderer), `config-form.render.ts` (top-level form), `config-form.shared.ts` (helpers).

---

## Theming and Styling

**Dark-first design** with red accent (`#ff5c5c`) and teal secondary (`#14b8a6`).

CSS custom properties on `:root` in `styles/base.css:3-113`. Light overrides on `:root[data-theme="light"]`.

Three modes: `"system" | "light" | "dark"` — applied via `data-theme` attribute and `colorScheme` style.

**Animated transitions**: `theme-transition.ts:46-109` uses `document.startViewTransition()` API for smooth cross-fade anchored to the toggle button click coordinates.

**Shell layout** — CSS Grid (`layout.css:6-22`): 220px sidebar + content, 56px topbar. Nav collapse supported.

**Chat split** — `splitRatio` (0.4–0.7, default 0.6) drives a resizable divider component.

Fonts: Space Grotesk (body), JetBrains Mono (code).

---

## Build and Deployment

- Output: `dist/control-ui` — served by the gateway server process
- Base path: configurable via env var or runtime `window.__OPENCLAW_CONTROL_UI_BASE_PATH__`
- Dev server: `vite dev` on `0.0.0.0:5173`
- Bootstrap endpoint: `GET /_control-ui-bootstrap` returns `ControlUiBootstrapConfig` with assistant name/avatar
- Docker: gateway serves pre-built UI from `dist/control-ui`

### Polling (via WebSocket RPC)

| Domain | Interval | Condition |
|--------|----------|-----------|
| Nodes | 5000ms | Always |
| Logs | 2000ms | On logs tab |
| Debug | 3000ms | On debug tab |

---

## Data Flow — Application Startup

```
index.html loads
  └── main.ts
        ├── styles.css (CSS custom properties)
        └── ui/app.ts
              └── <openclaw-app> custom element mounts
                    ├── loadSettings() from localStorage
                    ├── connectedCallback()
                    │     ├── inferBasePath()
                    │     ├── loadControlUiBootstrapConfig()  [GET /_control-ui-bootstrap]
                    │     ├── syncTabWithLocation()            [URL path → Tab]
                    │     ├── syncThemeWithSettings()           [data-theme attr]
                    │     ├── attachThemeListener()             [matchMedia]
                    │     ├── connectGateway()                  [open WebSocket]
                    │     └── startNodesPolling()               [setInterval 5s]
                    └── render() → renderApp(state)
```

## Data Flow — Chat Send

```
User types → state.chatMessage = next

User clicks Send
  └── handleSendChatInternal()
        ├── isChatStopCommand? → handleAbortChat()
        ├── isChatBusy? → enqueueChatMessage()
        └── sendChatMessageNow()
              └── client.request("chat.send", { sessionKey, message, attachments })
                    └── res: { runId } → state.chatRunId = runId

Gateway pushes events:
  "agent" { stream: "tool_use_start" } → toolStreamById updated
  "chat" { state: "delta" }            → chatStream updated
  "chat" { state: "final" }            → chatMessages updated
                                         resetToolStream()
                                         flushChatQueue()
                                         loadChatHistory()
```

---

## Key Types

| Type | File:Line | Purpose |
|---|---|---|
| `AppViewState` | `app-view-state.ts:38` | Complete state + methods (290 lines) |
| `UiSettings` | `storage.ts:6` | Persisted user preferences |
| `GatewayBrowserClient` | `gateway.ts:65` | WebSocket client |
| `GatewayHelloOk` | `gateway.ts:28` | Handshake response |
| `GatewayEventFrame` | `gateway.ts:12` | Server-pushed event |
| `Tab` | `navigation.ts:14` | Union of 13 tab names |
| `DeviceIdentity` | `device-identity.ts:11` | Ed25519 keypair + device ID |
| `ChatAttachment` | `ui-types.ts:1` | Image attachment for chat |
| `ToolStreamEntry` | `app-tool-stream.ts:16` | Live tool execution state |
| `ThemeMode` | `theme.ts:1` | `"system" \| "light" \| "dark"` |
| `ChatProps` | `views/chat.ts:34` | Props for renderChat() |
| `ConfigFormProps` | `views/config-form.render.ts:7` | Props for config form |

### i18n

Locales: en, pt-BR, zh-CN, zh-TW. Translation via `t()` function with `I18nController` for LitElement integration.
