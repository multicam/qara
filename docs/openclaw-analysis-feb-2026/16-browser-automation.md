# 16 — Browser Automation

## Summary

- **Engine**: Playwright-core connects to Chromium-based browsers via CDP (Chrome DevTools Protocol). Playwright is optional — the system degrades gracefully if not installed.
- **Two browser profiles**: `openclaw` (a dedicated, OpenClaw-launched isolated Chromium instance) and `chrome` (user's existing Chrome, controlled via a Chrome Extension relay that forwards CDP commands over WebSocket).
- **Architecture**: A local Express HTTP control server (`127.0.0.1:<controlPort>`) serves REST routes. Playwright connects to Chrome via `chromium.connectOverCDP()`. The AI agent tool (`browser-tool.ts`) talks to this control server, which drives Playwright.
- **Security**: SSRF policy on navigation, JavaScript `evaluate` can be disabled, extension relay enforces loopback-only access with per-connection auth tokens, screenshots are size-clamped.
- **State management**: Per-page state in `WeakMap<Page, PageState>` (auto-GC). Module-level singleton `cached: ConnectedBrowser | null` holds the persistent Playwright connection.

---

## Directory Structure

```
src/browser/
├── chrome.ts                        — Chrome process launch/stop
├── chrome.executables.ts            — Cross-platform browser discovery
├── chrome.profile-decoration.ts     — Chrome profile color/name decoration
├── cdp.ts                           — CDP helpers (screenshot, URL normalization)
├── cdp.helpers.ts                   — Low-level CDP fetch/WebSocket utilities
├── config.ts                        — ResolvedBrowserConfig/Profile resolution
├── constants.ts                     — Default values
├── server.ts                        — Control server entry point (Express)
├── server-context.ts                — ProfileContext factory + BrowserRouteContext
├── server-context.types.ts          — Core type definitions
├── server-lifecycle.ts              — Profile start/stop orchestration
├── server-middleware.ts             — Auth + common middleware
├── pw-session.ts                    — Playwright connection management + PageState
├── pw-ai.ts                         — Re-exports (lazy-loadable)
├── pw-ai-module.ts                  — Lazy dynamic import wrapper
├── pw-tools-core.ts                 — Barrel re-export of all pw-tools-core modules
├── pw-tools-core.interactions.ts    — click/type/hover/drag/evaluate/wait/screenshot
├── pw-tools-core.snapshot.ts        — snapshotAria/snapshotAi/snapshotRole/navigate
├── pw-tools-core.activity.ts        — console/errors/network request capture
├── pw-tools-core.downloads.ts       — download/upload/dialog arm
├── pw-tools-core.storage.ts         — cookies/localStorage/sessionStorage
├── pw-tools-core.trace.ts           — Playwright trace start/stop
├── pw-tools-core.responses.ts       — HTTP response body capture
├── pw-role-snapshot.ts              — Aria/role snapshot → ref map builder
├── navigation-guard.ts              — SSRF + protocol URL validation
├── extension-relay.ts               — Chrome Extension CDP relay server
├── extension-relay-auth.ts          — Auth token management for relay
├── bridge-server.ts                 — Sandbox bridge (agent-to-browser HTTP bridge)
├── screenshot.ts                    — Screenshot size normalization
├── profiles.ts / profiles-service.ts — Profile management
├── paths.ts                         — Upload/download directory resolution
└── routes/
    ├── index.ts                     — Route registration entry point
    ├── agent.ts                     — /snapshot, /screenshot, /navigate, /pdf
    ├── agent.act.ts                 — /act, /highlight, /hooks/*, /download
    ├── agent.snapshot.ts            — Snapshot route helpers
    ├── agent.shared.ts              — withPlaywrightRouteContext, requirePwAi
    ├── tabs.ts                      — /tabs, /tabs/open, /tabs/focus, DELETE /tabs/:id
    └── basic.ts                     — /, /start, /stop, /profiles

src/agents/tools/
└── browser-tool.ts                  — Agent-facing tool (createBrowserTool)
```

---

## Browser Engine

Playwright-core (`pw-session.ts:9`) connects to **Chromium-based browsers** (Chrome, Brave, Edge, Chromium) over CDP. Does not use Playwright's bundled browsers.

Playwright is optional. `pw-ai-module.ts:25-37` dynamically imports it — if not installed, routes return HTTP 501.

Browser source options:
- Process launched by OpenClaw (`chrome.ts`)
- Already-running Chrome via extension relay (`extension-relay.ts`)
- Remote browser pointed to by `cdpUrl`

---

## Browser Launch and Lifecycle

### Launch (`chrome.ts:163-321`)

`launchOpenClawChrome()` — three-phase launch:

1. **Bootstrap** (first run): spawn Chrome, wait up to 10s for profile files, kill
2. **Decoration**: set custom profile color/name in Chrome Preferences
3. **Real launch**: spawn Chrome with CDP flags, poll `isChromeReachable()` every 200ms up to 15s

Key Chrome flags:
```
--remote-debugging-port=<cdpPort>
--user-data-dir=<userDataDir>
--no-first-run --no-default-browser-check
--disable-sync --disable-background-networking
--disable-blink-features=AutomationControlled  (stealth)
```

Optional: `--headless=new`, `--no-sandbox`, `--disable-dev-shm-usage` (Linux), user `extraArgs`.

### Stop (`chrome.ts:323-350`)

SIGTERM → poll reachability up to 2500ms → SIGKILL if still alive.

---

## Playwright Connection

`pw-session.ts` — module-level singleton:

```
cached: ConnectedBrowser | null    — one connection per cdpUrl
connecting: Promise | null         — in-flight deduplication
```

`connectBrowser()` at `pw-session.ts:318-364`:
- Cache hit returns immediately
- 3 retry attempts with increasing timeouts (5s, 7s, 9s)
- Uses `chromium.connectOverCDP(wsUrl)` to attach to running Chrome
- On disconnect, `cached` is nulled for transparent reconnection

### Abort-safe evaluate (`pw-session.ts:562-679`)

For stuck `page.evaluate()` calls, `forceDisconnectPlaywrightForTarget()`:
1. Nulls `cached` to force reconnection
2. Fires `Runtime.terminateExecution` via raw CDP WebSocket
3. Fire-and-forgets `browser.close()`

---

## Interactions and Capabilities

### Navigation (`pw-tools-core.snapshot.ts:158-179`)

SSRF-guarded via `assertBrowserNavigationAllowed()` before `page.goto()`. Timeout clamped 1s–120s.

### Playwright Interactions (`pw-tools-core.interactions.ts`)

| Function | API |
|---|---|
| `clickViaPlaywright` | `locator.click()` / `dblclick()` |
| `typeViaPlaywright` | `locator.fill()` / `type()` (slow mode) |
| `hoverViaPlaywright` | `locator.hover()` |
| `dragViaPlaywright` | `locator.dragTo()` |
| `selectOptionViaPlaywright` | `locator.selectOption()` |
| `pressKeyViaPlaywright` | `page.keyboard.press()` |
| `fillFormViaPlaywright` | `locator.fill()` / `setChecked()` per field |
| `evaluateViaPlaywright` | `page.evaluate()` / `locator.evaluate()` |
| `scrollIntoViewViaPlaywright` | `locator.scrollIntoViewIfNeeded()` |
| `waitForViaPlaywright` | `page.waitFor*()` multi-condition |

All timeouts clamped: min 500ms, max 60,000ms.

### Screenshot (`pw-tools-core.interactions.ts:444-477`)

Three modes: element by ref, element by selector, full viewport/page.

Post-processing (`screenshot.ts`): resize if >2000px or >5MB, JPEG with stepped quality reduction.

**Labeled screenshot** variant injects amber-colored DOM overlay boxes with ref labels, captures, then removes them.

### Snapshots (`pw-tools-core.snapshot.ts`)

| Format | Method | Output |
|--------|--------|--------|
| `aria` | CDP `Accessibility.getFullAXTree` | Raw accessibility tree |
| `ai` | Playwright `page._snapshotForAI()` | Formatted ARIA YAML with refs |
| `role` | `locator.ariaSnapshot()` | Role+name pairs with ref map |

Role refs stored in `PageState.roleRefs` and module-level cache (max 50 entries, keyed by `cdpUrl::targetId`).

---

## Agent Tool

### Definition (`browser-tool.ts:221-828`)

`createBrowserTool()` returns `AnyAgentTool` with `name: "browser"`. Dispatches on `action`:

```
status | start | stop | profiles | tabs | open | focus | close |
snapshot | screenshot | navigate | console | pdf | upload | dialog | act
```

### Target Routing

```
target = "sandbox"  →  sandboxBridgeUrl HTTP API
target = "host"     →  local control server (127.0.0.1:<controlPort>)
target = "node"     →  gateway node.invoke → browser.proxy command
```

### Full Request Path

```
Agent calls browser(action="snapshot")
  → client.ts HTTP POST to control server
    → Express route handler (routes/agent.ts)
      → withPlaywrightRouteContext()
        → requirePwAi() [lazy-loads pw-ai.js]
          → pw.snapshotAiViaPlaywright()
            → getPageForTargetId() [connectBrowser if needed]
              → Playwright API on Page object
```

---

## Security

### SSRF Guard (`navigation-guard.ts`)

`assertBrowserNavigationAllowed()`:
- Only `http:`/`https:` allowed (plus `about:blank`)
- DNS + IP range policy check via `resolvePinnedHostnameWithPolicy()`
- Configurable `allowPrivateNetwork` and `allowedHostnames`

### Evaluate Gate (`routes/agent.act.ts:319-333`)

JavaScript `evaluate` and `wait --fn` gated by `evaluateEnabled` config (HTTP 403 if disabled).

### Extension Relay (`extension-relay.ts:485-534`)

- Loopback-only WebSocket upgrades
- Extension-origin-only (`chrome-extension://`)
- Per-relay auth token (`x-openclaw-relay-token` header)
- Single extension connection (HTTP 409 on second)

### Control Server Auth (`server-middleware.ts`)

Token-based or password-based HTTP auth on all routes.

### Download Sanitization (`pw-tools-core.downloads.ts:22-48`)

Strips path separators, control characters, limits to 200 chars.

### External Content Wrapping (`browser-tool.ts:33-55`)

Snapshot, console, and tab data wrapped as untrusted external browser content.

---

## Resource Management

### Per-Page State (`pw-session.ts:91-284`)

`WeakMap<Page, PageState>` — auto-GC when Page objects are collected. Explicit cleanup on `page.on("close")`.

Bounded ring buffers:
- Console messages: max 500
- Page errors: max 200
- Network requests: max 500

### Role Ref Cache

Module-level map, max 50 entries (oldest evicted).

### Playwright Connection

Single `cached` connection per `cdpUrl`. Deduplicated via `connecting` promise.

---

## Extension Relay Flow

```
Chrome (user's existing browser)
    │
    │  Chrome Extension (OpenClaw Browser Relay)
    │  WebSocket → ws://127.0.0.1:<relayPort>/extension
    ▼
ChromeExtensionRelayServer
    │  connectedTargets map (sessionId → TargetInfo)
    │  ping every 5s
    │
Playwright → GET /json/version
    │  → webSocketDebuggerUrl: ws://127.0.0.1:<relayPort>/cdp
    │
    │  CDP commands routed:
    │  Browser.*/Target.* → handled locally
    │  All others → forwarded to extension WS
    │  CDP events from extension → broadcast to CDP clients
    ▼
Playwright receives responses normally
```

---

## PageState Lifecycle

```
Page created
    │
    ▼
ensurePageState(page)
    ├── pageStates.set(page, { console:[], errors:[], requests:[] })
    ├── page.on("console") → state.console (max 500, ring)
    ├── page.on("pageerror") → state.errors (max 200, ring)
    ├── page.on("request") → state.requests (max 500, ring)
    ├── page.on("response") → updates request status
    └── page.on("close") → pageStates.delete(page)
```

---

## Configuration

| Config Key | Default | Effect |
|---|---|---|
| `browser.enabled` | `true` | Enable/disable browser subsystem |
| `browser.evaluateEnabled` | `true` | Allow `act:evaluate` and `wait --fn` |
| `browser.headless` | `false` | Launch Chrome headless |
| `browser.noSandbox` | `false` | Add `--no-sandbox` flags |
| `browser.attachOnly` | `false` | Don't auto-launch; attach only |
| `browser.executablePath` | auto-detect | Override browser binary |
| `browser.extraArgs` | `[]` | Extra Chrome CLI flags |
| `browser.color` | `#FF4500` | Profile color |
| `browser.defaultProfile` | `"chrome"` or `"openclaw"` | Default profile name |
| `browser.remoteCdpTimeoutMs` | `1500` | HTTP timeout for remote CDP |
| `browser.remoteCdpHandshakeTimeoutMs` | `3000` | WebSocket timeout |
| `browser.ssrfPolicy.allowPrivateNetwork` | undefined | Allow private IP navigation |
| `browser.ssrfPolicy.allowedHostnames` | undefined | Allowlisted hostnames |
| `browser.profiles.<name>` | — | Per-profile cdpPort/cdpUrl/color/driver |
| `browser.snapshotDefaults.mode` | undefined | Default snapshot mode |

Port derivation: `controlPort` from `gatewayPort` (typically +1), CDP ports from `controlPort`.

---

## Key Types

| Type | File:Line | Purpose |
|---|---|---|
| `RunningChrome` | `chrome.ts:49-56` | PID, exe, userDataDir, cdpPort, proc |
| `ResolvedBrowserConfig` | `config.ts:19-37` | Full resolved browser config |
| `ResolvedBrowserProfile` | `config.ts:39-47` | Per-profile: name, cdpPort, cdpUrl, driver |
| `ProfileRuntimeState` | `server-context.types.ts:11` | Profile + RunningChrome + lastTargetId |
| `BrowserServerState` | `server-context.types.ts:17` | Server + port + profiles map |
| `BrowserRouteContext` | `server-context.types.ts:38` | State + profile actions for routes |
| `PageState` | `pw-session.ts:61-78` | Console, errors, requests, roleRefs |
| `PwAiModule` | `pw-ai-module.ts:3` | Lazy-loaded Playwright module type |
| `BrowserExecutable` | `chrome.executables.ts:7-10` | Kind + path |
| `ChromeExtensionRelayServer` | `extension-relay.ts:111-118` | Relay server handle |
