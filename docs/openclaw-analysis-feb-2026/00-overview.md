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
          │ Pi Agent Core│  │  38 exts    │  │ SQLite + Vec │
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
│   └── ...                  ← Discord, Signal, WhatsApp, etc.
│
├── extensions/              ← 38 plugin packages
│   ├── voice-call/          ← Voice calling
│   ├── memory-core/         ← Memory engine
│   ├── memory-lancedb/      ← Vector storage
│   └── [channels, auth...]  ← Channel & auth plugins
│
├── skills/                  ← 50+ bundled AI skills
│   ├── coding-agent/        ← Code generation
│   ├── github/              ← GitHub ops
│   ├── spotify-player/      ← Spotify control
│   └── ...
│
├── apps/                    ← Native apps
│   ├── macos/ + ios/        ← Swift/SwiftUI
│   └── android/             ← Kotlin
│
├── ui/                      ← Web control panel (React)
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

**TL;DR** — OpenClaw is a locally-hosted AI gateway. Messages arrive from any channel (WhatsApp, Telegram, Slack, etc.), get routed through the gateway to an AI agent backed by your choice of model, with 50+ skills and 38 extensions for tools, memory, and platform integrations. Everything runs on your machine.
