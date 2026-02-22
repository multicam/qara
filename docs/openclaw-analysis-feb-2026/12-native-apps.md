# 12 — Native Apps

## Summary

- **Four platforms**: macOS (primary, operator role), iOS/watchOS/ShareExtension (node role), Android (node role). No Windows or Linux native apps.
- **All 100% pure native** — no Electron, Tauri, React Native, or cross-platform frameworks. macOS uses SwiftUI + AppKit, iOS uses SwiftUI + UIKit, Android uses Jetpack Compose. Swift 6 or Kotlin.
- **Gateway connection is WebSocket-based** with a shared binary protocol (`GATEWAY_PROTOCOL_VERSION = 3`). All three platforms implement the exact same `connect` handshake, device-signed auth, and request/response/event frame model.
- **macOS is the operator role** (manages the gateway process, runs it as a launchd agent, has a menu bar app). iOS/Android are **node roles** (discovered via Bonjour/mDNS, connect back to the gateway as sensor/capability providers).
- **Auto-update**: macOS uses Sparkle 2 (`appcast.xml`), iOS uses Fastlane → TestFlight, Android has gateway-triggered APK sideloading.

---

## Directory Structure

```
apps/
├── android/                  — Kotlin + Jetpack Compose Android app
│   ├── app/build.gradle.kts  — Build config, deps, versionCode
│   └── app/src/main/java/ai/openclaw/android/
│       ├── MainActivity.kt           — Activity entry point
│       ├── MainViewModel.kt          — Central ViewModel
│       ├── NodeApp.kt                — Application subclass
│       ├── NodeRuntime.kt            — Connection lifecycle
│       ├── NodeForegroundService.kt  — Persistent notification service
│       ├── gateway/                  — WebSocket, discovery, TLS, auth
│       ├── node/                     — Command handlers (camera, screen, SMS, location)
│       ├── protocol/                 — Protocol constants
│       ├── ui/                       — Compose UI (RootScreen, ChatSheet, Settings)
│       └── voice/                    — VoiceWake, TalkMode
│
├── ios/                      — Swift 6 + SwiftUI iOS app
│   ├── project.yml           — XcodeGen project definition
│   ├── fastlane/Fastfile     — CI: TestFlight upload lane
│   ├── Sources/
│   │   ├── OpenClawApp.swift             — @main SwiftUI app
│   │   ├── Gateway/                      — Discovery, connection, TLS pinning
│   │   ├── Model/NodeAppModel.swift      — Central Observable app model
│   │   ├── Voice/                        — TalkMode, VoiceWake
│   │   ├── Camera/, Screen/, Location/   — Node capability services
│   │   ├── Chat/                         — Chat UI (shared ChatUI)
│   │   └── Onboarding/                   — QR scanner, wizard
│   ├── WatchApp/             — watchOS 11+ watch face app
│   ├── WatchExtension/       — WatchConnectivity bridge
│   └── ShareExtension/       — iOS Share Sheet extension
│
├── macos/                    — Swift 6 + SwiftUI macOS app
│   ├── Package.swift         — SPM: OpenClaw, OpenClawMacCLI, OpenClawIPC, OpenClawDiscovery
│   └── Sources/OpenClaw/
│       ├── MenuBar.swift                 — @main App, MenuBarExtra, SparkleUpdater
│       ├── AppState.swift                — Central @Observable, UserDefaults persistence
│       ├── ControlChannel.swift          — Operator WS connection, event routing
│       ├── GatewayConnection.swift       — Shared WS actor, typed API methods
│       ├── GatewayProcessManager.swift   — launchd job start/stop
│       ├── GatewayLaunchAgentManager.swift — Plist install/uninstall
│       ├── CanvasWindowController.swift  — WKWebView canvas panel
│       ├── WebChatManager.swift          — Floating chat panel
│       ├── VoiceWakeRuntime.swift        — SwabbleKit voice-wake
│       └── (~130 files total)
│
└── shared/OpenClawKit/       — Swift Package shared by macOS and iOS
    └── Sources/
        ├── OpenClawProtocol/GatewayModels.swift  — Code-generated types, PROTOCOL_VERSION=3
        ├── OpenClawKit/GatewayChannel.swift      — GatewayChannelActor (WS actor)
        ├── OpenClawKit/Capabilities.swift         — OpenClawCapability enum
        └── OpenClawChatUI/                        — Shared SwiftUI chat view
```

---

## Platforms

| Platform | Status | Min Version | Role |
|----------|--------|-------------|------|
| macOS | Full (operator + gateway host) | macOS 15 | Operator |
| iOS | Full (node/sensor) | iOS 18 | Node |
| watchOS | Companion (WatchConnectivity) | watchOS 11 | Node (via iPhone) |
| Android | Full (node/sensor) | API 31 (Android 12) | Node |

---

## Frameworks

- **macOS**: SwiftUI + AppKit, Swift Package Manager, `MenuBarExtra` for system tray
- **iOS**: SwiftUI + UIKit (`@UIApplicationDelegateAdaptor`), XcodeGen + Fastlane
- **watchOS**: WatchKit 2 extension
- **Android**: Jetpack Compose + Material 3, Gradle (Kotlin DSL)

Key dependencies:
- macOS: `MenuBarExtraAccess 1.2.2`, `Sparkle 2.8.1`, `SwabbleKit` (voice-wake), `Peekaboo` (screenshot)
- iOS/macOS shared: `ElevenLabsKit 0.1.0` (TTS), `textual 0.3.1` (markdown)
- Android: OkHttp 5, BouncyCastle, CameraX, dnsjava, Compose BOM 2025.12

---

## Gateway Connection Protocol

All platforms use WebSocket JSON-framed protocol (version 3):

```
GatewayModels.swift:5 → GATEWAY_PROTOCOL_VERSION = 3

Frame types:
  RequestFrame  { type, id, method, params }       — client → server
  ResponseFrame { type, id, ok, payload, error }    — server → client
  EventFrame    { type, event, payload, seq }       — server → client (push)
```

`GatewayModels.swift` is **code-generated** from the gateway TypeScript schema.

### Connection Parameters

- Keepalive ping: every 15s
- Watchdog reconnect on missed ticks
- Exponential backoff: 500ms → 30s (Swift), 350ms → 8s (Android)
- Max message size: 16 MB

### Authentication: Device-Signed Identities

All platforms create a persistent ECDSA key pair and sign a payload:

```
v2|<deviceId>|<clientId>|<clientMode>|<role>|<scopes>|<signedAtMs>|<authToken>|<nonce>
```

The device's public key and signature are sent in the `connect` request, allowing the gateway to verify the client without sharing secrets.

### macOS Operator Flow

```
AppState → ConnectionModeCoordinator.apply()
  └── GatewayProcessManager.startIfNeeded()
        ├── Try attach to existing gateway on localhost:port
        └── GatewayLaunchAgentManager.set(enabled:true)
              └── openclaw gateway install --force --port N --json
  └── ControlChannel.configure() → GatewayConnection.refresh()
        └── GatewayChannelActor.connect()
              role: "operator"
              scopes: ["operator.admin", "operator.approvals", "operator.pairing"]
```

### iOS/Android Node Flow

```
Discovery (Bonjour/mDNS or manual config)
  └── TLS fingerprint probe → TOFU trust prompt
        └── GatewayChannelActor.connect() / GatewaySession.connect()
              role: "node"
              caps: [canvas, screen, camera, voiceWake, location, watch, ...]
```

---

## Native Features

### macOS-Only

| Feature | Key File | Description |
|---------|----------|-------------|
| Menu bar app | `MenuBar.swift:42-60` | `MenuBarExtra` with left-click chat, right-click menu, hover HUD |
| Gateway management | `GatewayProcessManager.swift` | Starts/stops gateway as launchd job |
| LaunchAgent install | `GatewayLaunchAgentManager.swift` | Plist write to `~/Library/LaunchAgents/` |
| Canvas panel | `CanvasWindowController.swift` | Floating WKWebView with A2UI commands |
| Exec approvals | `ExecApprovals.swift` + `ExecApprovalsSocket.swift` + `ExecApprovalsGatewayPrompter.swift` | User prompt for shell command execution (split into 3 files: core types + allowlist, socket-based approval protocol, gateway event subscription) |
| Exec env unwrapper | `ExecEnvInvocationUnwrapper.swift` | Strips env wrapper invocations (maxWrapperDepth=4) |
| Shell wrapper parser | `ExecShellWrapperParser.swift` | Parses shell wrapper commands like bash -c |
| Cron editor | `CronSettings.swift` | Full scheduled job management UI |
| Remote/SSH tunnel | `RemoteTunnelManager.swift` | SSH tunnel to remote gateway |
| Config file watch | `ConfigFileWatcher.swift` | Live `openclaw.json` change detection |
| Tailscale | `TailscaleService.swift` | Wide-area network discovery |
| Dock icon | `DockIconManager.swift` | Optional (hidden by default, menu-bar only) |
| Animated critter icon | `CritterStatusLabel.swift` | Changes based on state (paused/working/sleeping) |
| Voice wake | `VoiceWakeRuntime.swift` | SwabbleKit integration, trigger words, push-to-talk |

### iOS-Only

| Feature | Key File | Description |
|---------|----------|-------------|
| Background refresh | `OpenClawApp.swift:104-148` | `BGAppRefreshTask` at 15-min intervals |
| APNs push | `OpenClawApp.swift:61-96` | Silent push wakes gateway session |
| Watch companion | `WatchConnectivityReceiver.swift` | Message bridge to Apple Watch |
| Share Extension | `ShareViewController.swift` | Text, URLs, images, movies from share sheet |
| Location monitor | `SignificantLocationMonitor` | Battery-efficient background location |
| Contacts/Calendar | via node capabilities | CNContactStore, EventKit integration |
| Motion | via node capabilities | CMMotionActivityManager + CMPedometer |

### Android-Only

| Feature | Key File | Description |
|---------|----------|-------------|
| Foreground service | `NodeForegroundService.kt` | Persistent notification, keeps connection alive |
| SMS access | `SmsHandler.kt` | Read/send SMS (unavailable on iOS) |
| Screen recording | `ScreenRecordManager.kt` | MediaProjection API |
| APK self-update | `AppUpdateHandler.kt` | Gateway-triggered sideloading |
| Immersive mode | `MainActivity.kt:89-95` | Hides system bars |
| mDNS via dnsjava | `GatewayDiscovery.kt` | Unicast DNS-SD for Tailnet |
| Wake lock | `MainActivity.kt:46-55` | `FLAG_KEEP_SCREEN_ON` |

---

## Build and Packaging

### macOS

- SPM (`Package.swift`), targets macOS 15, Swift 6 strict concurrency
- 4 products: `OpenClaw` (app), `openclaw-mac` (CLI), `OpenClawIPC`, `OpenClawDiscovery`
- Sparkle 2 for auto-update, appcast at repo root

### iOS

- XcodeGen (`project.yml`) → `OpenClaw.xcodeproj`
- iOS 18, Swift 6, strict concurrency
- Pre-build: SwiftFormat + SwiftLint
- Fastlane `beta` lane: `build_app` → `upload_to_testflight`
- Background modes: audio, remote-notification
- Bonjour services: `_openclaw-gw._tcp`

### Android

- Gradle Kotlin DSL, `compileSdk = 36`, `minSdk = 31`
- Calendar-based versioning: `2026.2.21`
- All ABIs: armeabi-v7a, arm64-v8a, x86, x86_64
- Release: minify + shrink + ProGuard
- Output: `openclaw-<version>-<buildType>.apk`

---

## Auto-Update

| Platform | Mechanism | Details |
|----------|-----------|---------|
| macOS | Sparkle 2 | Appcast XML at repo root, Developer ID signed builds only |
| iOS | Fastlane → TestFlight | Standard Apple distribution |
| Android | Gateway-triggered APK | `AppUpdateHandler` + `InstallResultReceiver` |

---

## Configuration

### macOS (`AppState.swift`)

Stored in `UserDefaults.standard`:

| Setting | Default |
|---------|---------|
| `isPaused` | `false` |
| `launchAtLogin` | `false` |
| `swabbleEnabled` (voice wake) | `false` |
| `showDockIcon` | `false` |
| `heartbeatsEnabled` | `true` |
| `canvasEnabled` | `true` |
| `talkEnabled` | `false` |

Connection modes: `unconfigured`, `local` (manage gateway), `remote` (SSH tunnel/WSS).

Config sync: `AppState.syncGatewayConfigIfNeeded()` writes changes back to `~/.openclaw/openclaw.json`.

### iOS

Settings in `GatewaySettingsStore.swift`. Token/password in Keychain via `KeychainStore`.

### Android

Settings in `EncryptedSharedPreferences` via `SecurePrefs.kt`. Device identity in `DeviceIdentityStore.kt`.

---

## Key Types

### Shared Protocol (`GatewayModels.swift`)

| Type | Purpose |
|------|---------|
| `GatewayFrame` | Discriminated union: `.req`, `.res`, `.event`, `.unknown` |
| `RequestFrame` / `ResponseFrame` / `EventFrame` | Wire frame types |
| `HelloOk` | Connect response: server info, snapshot, auth |
| `ConnectParams` | Connect request parameters |
| `Snapshot` | Gateway state: presence, health, sessionDefaults |
| `NodeInvokeRequestEvent` | Gateway → node invoke command |
| `ChatEvent` | Streaming chat: runId, sessionKey, state, message, usage |
| `CronJob` | Scheduled job definition |

### macOS

| Type | File | Purpose |
|------|------|---------|
| `GatewayConnection` | `GatewayConnection.swift:51` | Singleton actor, typed API |
| `ControlChannel` | `ControlChannel.swift:44` | Event routing (heartbeat/agent/shutdown) |
| `AppState` | `AppState.swift:9` | All UI state + settings |
| `GatewayProcessManager` | `GatewayProcessManager.swift:6` | launchd lifecycle |

### Shared Swift

| Type | File | Purpose |
|------|------|---------|
| `GatewayChannelActor` | `GatewayChannel.swift:138` | Swift actor wrapping WebSocket |
| `GatewayConnectOptions` | `GatewayChannel.swift:79` | Role, scopes, caps, commands |
| `GatewayAuthSource` | `GatewayChannel.swift:116` | `.deviceToken`, `.sharedToken`, `.password` |

### Android

| Type | File | Purpose |
|------|------|---------|
| `GatewaySession` | `GatewaySession.kt:55` | OkHttp WebSocket lifecycle |
| `GatewayClientInfo` | `GatewaySession.kt:34` | Data class: device identity + client metadata sent during connect |
| `GatewayConnectOptions` | `GatewaySession.kt:45` | Data class: connection parameters (URL, auth, caps, role) |
| `GatewayDiscovery` | `GatewayDiscovery.kt` | NsdManager + dnsjava DNS-SD |
| `DeviceIdentityStore` | `DeviceIdentityStore.kt` | Persistent ECDSA key pair |
