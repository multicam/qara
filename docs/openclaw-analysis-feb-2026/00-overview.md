# OpenClaw — Visual Explainer

**Multi-Channel Personal AI Assistant Gateway** — runs locally, connects you to AI models through any messaging platform.

---

## The Big Picture

```
                         ╔══════════════════════════╗
                         ║     YOU (JM)             ║
                         ╚══════════╤═══════════════╝
                                    │
          ┌─────────┬───────┬───────┼───────┬────────┬─────────┐
          ▼         ▼       ▼       ▼       ▼        ▼         ▼
      WhatsApp  Telegram  Slack  Discord  Signal  iMessage   CLI
          │         │       │       │       │        │         │
          └─────────┴───────┴───────┼───────┴────────┴─────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │     CHANNEL LAYER             │
                    │  Grammy · Bolt · Baileys ...  │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      GATEWAY SERVER           │
                    │   WebSocket + HTTP (Express)  │
                    │   Auth · Routing · Hooks      │
                    │   Config · Sessions · Health  │
                    └───────────────┬───────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ▼                 ▼                  ▼
          ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
          │ AGENT RUNTIME│  │   PLUGINS   │  │    MEMORY    │
          │ Pi Agent Core│  │  50+ exts   │  │ SQLite + Vec │
          │ Tool/Skill   │  │  Hook sys   │  │  LanceDB    │
          │ Sandbox      │  │  Routes     │  │  Embeddings  │
          └──────┬───────┘  └─────────────┘  └──────────────┘
                 │
       ┌─────────┼──────────┬──────────────┐
       ▼         ▼          ▼              ▼
   ┌────────┐ ┌───────┐ ┌────────┐  ┌──────────┐
   │ Claude │ │ GPT-4 │ │ Gemini │  │  Ollama  │
   │Anthropic│ │OpenAI │ │ Google │  │  Local   │
   └────────┘ └───────┘ └────────┘  └──────────┘
```

---

## Source Layout

```
openclaw/
├── src/                     ← Core TypeScript source
│   ├── gateway/             ← Control plane (WebSocket + HTTP server)
│   ├── agents/              ← AI orchestration (Pi Agent runtime)
│   ├── channels/            ← Channel abstraction layer
│   ├── plugins/             ← Plugin registry & lifecycle
│   ├── cli/ + commands/     ← CLI interface (Commander.js)
│   ├── config/              ← YAML config, hot-reload, migrations
│   ├── memory/              ← Embedding storage & search
│   ├── routing/             ← Message routing engine
│   ├── sessions/            ← Session persistence (SQLite)
│   ├── hooks/               ← Event hook system
│   ├── infra/               ← Process mgmt, networking, security
│   ├── telegram/            ← Telegram-specific integration
│   ├── slack/               ← Slack-specific integration
│   ├── acp/                 ← Agent Communication Protocol support
│   ├── auto-reply/          ← Automated reply logic
│   ├── browser/             ← Browser control integration
│   ├── canvas-host/         ← Canvas host service
│   ├── link-understanding/  ← Link preview & parsing
│   ├── media-understanding/ ← Media analysis pipeline
│   ├── node-host/           ← Node host management
│   ├── pairing/             ← Device pairing flows
│   ├── providers/           ← Model provider abstractions
│   ├── shared/              ← Cross-module shared utilities
│   ├── terminal/            ← Terminal integration
│   ├── tui/                 ← Terminal UI components
│   ├── web/                 ← Web-facing endpoints
│   ├── wizard/              ← Setup wizard flows
│   └── ...                  ← Discord, Signal, WhatsApp, etc.
│
├── extensions/              ← Plugin packages (channel + utility)
│   ├── voice-call/          ← Voice calling
│   ├── memory-core/         ← Memory engine
│   ├── memory-lancedb/      ← Vector storage
│   ├── feishu/              ← Feishu/Lark channel
│   ├── matrix/              ← Matrix channel
│   ├── msteams/             ← Microsoft Teams channel
│   ├── nextcloud-talk/      ← Nextcloud Talk channel
│   ├── nostr/               ← Nostr protocol channel
│   ├── tlon/                ← Tlon/Urbit channel
│   ├── twitch/              ← Twitch channel
│   ├── zalo/                ← Zalo channel
│   ├── zalouser/            ← Zalo user channel
│   ├── bluebubbles/         ← BlueBubbles (iMessage) channel
│   ├── llm-task/            ← LLM task utility extension
│   ├── lobster/             ← Lobster utility extension
│   ├── thread-ownership/    ← Thread ownership tracking
│   ├── diagnostics-otel/    ← OpenTelemetry diagnostics
│   ├── copilot-proxy/       ← GitHub Copilot proxy auth
│   ├── google-antigravity-auth/   ← Google Antigravity auth
│   ├── google-gemini-cli-auth/    ← Google Gemini CLI auth
│   ├── minimax-portal-auth/       ← MiniMax portal auth
│   ├── qwen-portal-auth/          ← Qwen portal auth
│   ├── synology-chat/             ← Synology Chat webhook-based channel extension
│   └── [other channels, auth...]  ← Additional channel & auth plugins
│
├── skills/                  ← 52 bundled AI skills
│   ├── coding-agent/        ← Code generation
│   ├── github/              ← GitHub ops
│   ├── spotify-player/      ← Spotify control
│   └── ...
│
├── apps/                    ← Native apps
│   ├── macos/ + ios/        ← Swift/SwiftUI
│   ├── shared/OpenClawKit/  ← Shared Swift package (macOS + iOS)
│   └── android/             ← Kotlin
│
├── Swabble/                 ← Swift voice-wake package
├── packages/                ← Bot packages (clawdbot, moltbot)
├── ui/                      ← Web control panel (React)
├── docs.acp.md              ← Agent Communication Protocol docs
└── openclaw.mjs             ← Entry point
```

---

## Request Lifecycle

```
  "Hey, summarize my emails"
           │
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │ Channel receives │ ──▶ │ Gateway routes   │
  │ (e.g. Telegram)  │     │ to agent session  │
  └──────────────────┘     └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │ Pi Agent spins up │
                           │ • System prompt   │
                           │ • Available tools │
                           │ • Memory context  │
                           └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │ Model call        │
                           │ (Claude/GPT/etc)  │
                           │ with tool use     │
                           └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │ Tool execution    │
                           │ (sandboxed bash,  │
                           │  browser, APIs)   │
                           └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │ Response streamed │
                           │ back to channel   │
                           └──────────────────┘
```

---

## Tech Stack at a Glance

| Layer | Tech |
|---|---|
| **Runtime** | Node.js >=22.12, TypeScript 5.9 |
| **CLI** | Commander.js, @clack/prompts |
| **Server** | Express 5, WebSocket (ws) |
| **AI Core** | Pi Agent Core (Anthropic's framework) |
| **Models** | Anthropic, OpenAI, Gemini, Bedrock, Ollama, LiteLLM |
| **Channels** | Grammy, Bolt, Baileys, discord-api-types, + more |
| **Storage** | SQLite + sqlite-vec, LanceDB, YAML/JSON |
| **UI** | React (web), Lit (components), SwiftUI/Kotlin (native) |
| **Testing** | Vitest (unit, e2e, gateway, extensions, live) |
| **Build** | tsdown + Rolldown |

---

**TL;DR** — OpenClaw is a locally-hosted AI gateway. Messages arrive from any channel (WhatsApp, Telegram, Slack, etc.), get routed through the gateway to an AI agent backed by your choice of model, with 52 skills and a growing extension library (channel adapters, auth providers, and utility plugins) for tools, memory, and platform integrations. Everything runs on your machine.
