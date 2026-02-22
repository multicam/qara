# NanoClaw Data Flow

How data moves through the system, step by step.

## Inbound Message Flow

```
WhatsApp Cloud
     │
     │  WebSocket (Baileys)
     ▼
┌─────────────────┐
│  whatsapp.ts    │
│  messages.upsert│
│                 │
│  ① LID→phone   │  Translate new WhatsApp JID format
│  ② metadata     │  Store chat info for ALL chats
│  ③ filter       │  Only store content for registered groups
│  ④ storeMessage │  Write to SQLite messages table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite DB      │
│  messages table  │
│                 │
│  chat_jid       │
│  sender         │
│  content        │
│  timestamp      │
│  is_bot_message │
└────────┬────────┘
         │
         │  Polled every 2s
         ▼
┌─────────────────┐
│  Message Loop   │
│  index.ts:298   │
│                 │
│  ① getNewMessages(jids, lastTimestamp)
│  ② For each group with new messages:
│  │  ├─ Main group? → always process
│  │  └─ Other group? → check TRIGGER_PATTERN
│  │     └─ /^@Andy\b/i
│  ③ Get all pending: getMessagesSince(lastAgentTimestamp)
│  ④ Format message batch
│  ⑤ Dispatch to GroupQueue
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GroupQueue      │
│  group-queue.ts │
│                 │
│  Container already running?
│  ├─ YES → pipe message to ipc/input/
│  └─ NO  → enqueue, respect max 5 concurrent
│           wait for slot → spawn container
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Container Runner               │
│  container-runner.ts:214        │
│                                 │
│  ① buildVolumeMounts()          │
│  ② docker run nanoclaw-agent    │
│  ③ Write ContainerInput to stdin│
│  ④ Parse stdout for sentinels   │
└────────┬────────────────────────┘
         │
         │  Docker boundary
         ▼
┌─────────────────────────────────┐
│  Agent Runner (in container)    │
│  container/agent-runner         │
│                                 │
│  ① Read stdin → ContainerInput  │
│  ② Extract secrets to sdkEnv    │
│  ③ Claude Agent SDK query()     │
│  ④ SDK reads CLAUDE.md          │
│  ⑤ SDK processes with tools     │
│  ⑥ Result → stdout sentinels    │
└─────────────────────────────────┘
```

## Outbound Response Flow

Two paths for responses to reach WhatsApp:

### Path A: Mid-Conversation (MCP Tool)

```
Claude SDK calls mcp__nanoclaw__send_message
     │
     ▼
┌──────────────────────┐
│  MCP Server          │
│  ipc-mcp-stdio.ts    │
│                      │
│  Write JSON to       │
│  /workspace/ipc/     │
│  messages/{uuid}.json│
│  (atomic: .tmp→rename)
└──────────┬───────────┘
           │
           │  Docker mount = data/ipc/{group}/messages/
           │
           ▼
┌──────────────────────┐
│  IPC Watcher         │
│  ipc.ts (polls 1s)   │
│                      │
│  ① Read JSON file    │
│  ② Auth check:       │
│  │  main → any chat  │
│  │  other → own only │
│  ③ channel.send()    │
│  ④ Delete JSON file  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  WhatsApp Channel    │
│  whatsapp.ts         │
│                      │
│  sendMessage(jid,txt)│
└──────────────────────┘
```

### Path B: Final Result (Stdout Sentinels)

```
Agent Runner writes to stdout:
  ---NANOCLAW_OUTPUT_START---
  {"text":"Here's your reminder..."}
  ---NANOCLAW_OUTPUT_END---
     │
     │  Docker stdout pipe
     ▼
┌──────────────────────┐
│  Container Runner    │
│  container-runner.ts │
│                      │
│  ① Accumulate in     │
│     parseBuffer      │
│  ② Scan for sentinel │
│     pairs            │
│  ③ Parse JSON        │
│  ④ onOutput callback │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  WhatsApp Channel    │
│  whatsapp.ts         │
│                      │
│  sendMessage(jid,txt)│
└──────────────────────┘
```

## Scheduled Task Flow

```
┌──────────────────────┐
│  Task Scheduler      │
│  task-scheduler.ts   │
│  (polls every 60s)   │
│                      │
│  SELECT * FROM       │
│  scheduled_tasks     │
│  WHERE status='active│
│  AND next_run <= now │
└──────────┬───────────┘
           │
           │  Due tasks found
           ▼
┌──────────────────────┐
│  GroupQueue           │
│  enqueueTask()       │
│                      │
│  Tasks prioritized   │
│  over messages       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Container Runner    │
│  isScheduledTask:true│
│                      │
│  Agent gets task     │
│  prompt prepended    │
│  with schedule notice│
└──────────┬───────────┘
           │
           │  After completion
           ▼
┌──────────────────────┐
│  updateTaskAfterRun()│
│                      │
│  ① Log to            │
│    task_run_logs     │
│  ② Compute next_run  │
│    from cron/interval│
│  ③ Update            │
│    scheduled_tasks   │
└──────────────────────┘
```

## Follow-Up Message Flow (Container Already Running)

```
User sends another message while container is alive
     │
     ▼
SQLite → Message Loop → GroupQueue.sendMessage()
     │
     │  Writes JSON to data/ipc/{group}/input/{uuid}.json
     │
     ▼
Agent Runner (polling /workspace/ipc/input/ every 500ms)
     │
     │  Reads JSON, pushes into MessageStream
     │
     ▼
Claude SDK receives as new user turn
     │
     │  Continues same session (no cold start)
     ▼
Response via Path A or Path B
```

## IPC Task Operations

Container agents can manage tasks and groups via IPC:

```
Agent calls MCP tool → JSON written to ipc/tasks/
     │
     ▼
IPC Watcher processTaskIpc() dispatches by type:
  ├─ schedule_task   → INSERT into scheduled_tasks
  ├─ pause_task      → SET status='paused'
  ├─ resume_task     → SET status='active', recompute next_run
  ├─ cancel_task     → SET status='cancelled'
  ├─ refresh_groups  → reload registered_groups from DB
  └─ register_group  → INSERT into registered_groups, create folder
```
