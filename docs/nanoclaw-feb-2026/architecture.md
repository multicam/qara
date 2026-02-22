# NanoClaw Architecture

Personal Claude assistant running on WhatsApp. Single Node.js process connects to WhatsApp, routes messages to Claude Agent SDK running inside isolated Docker containers — one per group.

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NanoClaw Architecture                        │
│              Personal Claude Assistant on WhatsApp                   │
└─────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   WhatsApp   │
                         │   (Baileys)  │
                         └──────┬───────┘
                                │ messages.upsert
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                    HOST PROCESS  (single Node.js)                  │
│                                                                    │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐     │
│  │  WhatsApp    │───▶│   SQLite DB  │◀───│  Task Scheduler   │     │
│  │  Channel     │    │              │    │  (polls every 60s)│     │
│  │              │    │  messages    │    │                   │     │
│  │  whatsapp.ts │    │  chats       │    │  cron / interval  │     │
│  └──────────────┘    │  sessions    │    │  / one-shot tasks │     │
│         ▲            │  tasks       │    └────────┬──────────┘     │
│         │            └──────┬───────┘             │                │
│         │                   │                     │                │
│         │            ┌──────▼───────┐             │                │
│         │            │ Message Loop │             │                │
│         │            │ (polls 2s)   │             │                │
│         │            │              │             │                │
│         │            │ ① getNew     │             │                │
│         │            │ ② trigger?   │             │                │
│         │            │   @Andy...   │             │                │
│         │            └──────┬───────┘             │                │
│         │                   │                     │                │
│         │            ┌──────▼───────────────────────────────┐      │
│         │            │         GroupQueue                    │      │
│         │            │   max 5 concurrent containers        │      │
│         │            │   per-group state + retry backoff    │      │
│         │            └──────┬──────────────┬────────────────┘      │
│         │                   │              │                       │
│         │            ┌──────▼──────┐ ┌─────▼──────┐               │
│         │            │  Group A    │ │  Group B   │  ...          │
│         │            └──────┬──────┘ └─────┬──────┘               │
│         │                   │              │                       │
│  ┌──────┴───────┐    ┌──────▼──────────────▼────────────────┐      │
│  │  IPC Watcher │◀───│      Container Runner                │      │
│  │  (polls 1s)  │    │  spawn Docker + pipe stdin/stdout    │      │
│  │              │    └──────────────────────────────────────┘      │
│  │  reads JSON  │           │ stdin: ContainerInput JSON          │
│  │  from ipc/   │           │ stdout: sentinel-wrapped results    │
│  └──────────────┘           ▼                                      │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
          ════════════════════╪═════════════════ Docker boundary
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│                    CONTAINER  (per group, isolated)                 │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                  Agent Runner (Node.js)                   │      │
│  │                                                           │      │
│  │   Reads ContainerInput from stdin                         │      │
│  │   Calls Claude Agent SDK  query()                         │      │
│  │   Polls /workspace/ipc/input/ for follow-up messages      │      │
│  │   Streams results via sentinel markers to stdout          │      │
│  └──────────┬────────────────────────────────────────────────┘      │
│             │                                                       │
│  ┌──────────▼──────────┐    ┌─────────────────────────────┐        │
│  │  Claude Agent SDK   │───▶│  MCP Server (IPC bridge)    │        │
│  │                     │    │                              │        │
│  │  Tools:             │    │  send_message  → ipc/messages│        │
│  │  • Bash             │    │  schedule_task → ipc/tasks   │        │
│  │  • Read/Write/Edit  │    │  register_group              │        │
│  │  • Web tools        │    │  refresh_groups              │        │
│  │  • Task (swarms)    │    │                              │        │
│  │  • mcp__nanoclaw__* │    │  Atomic: write .tmp → rename │        │
│  └─────────────────────┘    └──────────────────────────────┘        │
│                                                                     │
│  Mount isolation:                                                   │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  /workspace/group   ← groups/{name}/     (read-write)   │       │
│  │  /workspace/global  ← groups/global/     (read-only)    │       │
│  │  /workspace/ipc     ← data/ipc/{name}/   (read-write)   │       │
│  │  /home/node/.claude ← data/sessions/{name}/.claude/     │       │
│  │                                                          │       │
│  │  Main group only:                                        │       │
│  │  /workspace/project ← full project root  (read-write)   │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Message Lifecycle

```
User sends "@Andy hello"
  │
  ▼
WhatsApp ──store──▶ SQLite
  │
  ▼ (2s poll)
Message Loop ──trigger match──▶ GroupQueue
  │
  ▼
Container spawned (or message piped to existing)
  │
  ▼
Claude Agent SDK processes, calls tools
  │
  ├──▶ MCP send_message ──▶ ipc/messages/ ──▶ IPC Watcher ──▶ WhatsApp
  │    (mid-conversation replies)
  │
  └──▶ Final result via stdout sentinels ──▶ Container Runner ──▶ WhatsApp
       (end of turn)

Container stays alive 30min idle, reuses session on follow-up
```

## Security Model

```
┌─────────────────────────────┐
│   Security Model            │
│                             │
│  • Secrets via stdin only,  │
│    never mounted as files   │
│  • Bash hook strips API     │
│    keys from subprocess env │
│  • IPC auth: group can only │
│    message its own chat     │
│  • Main group = admin       │
│    (can msg any chat)       │
└─────────────────────────────┘
```
