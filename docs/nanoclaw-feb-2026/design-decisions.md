# NanoClaw Design Decisions

Key architectural choices and why they were made.

## 1. Filesystem IPC over Sockets

**Choice:** JSON files with atomic write-then-rename instead of Unix sockets, TCP, or gRPC.

**Why:**
- Debuggable — `ls` and `cat` to inspect pending messages
- Auditable — failed files moved to `ipc/errors/` for post-mortem
- No connection management — no reconnect logic, no keepalives
- Atomic on Linux/macOS — `rename()` is a single syscall, host never sees partial files
- Works across Docker mount boundaries without socket forwarding

**Trade-off:** 1s polling latency on IPC watcher. Acceptable for chat.

## 2. One Container Per Group

**Choice:** Each WhatsApp group gets its own Docker container with isolated filesystem, session, and IPC namespace.

**Why:**
- Security isolation — compromised agent can't access another group's data
- Session continuity — each group has its own Claude conversation history
- Resource limits — one runaway agent doesn't block others (max 5 concurrent)
- Persona separation — each group's `CLAUDE.md` defines different behavior

**Trade-off:** Higher resource usage than a shared process. Mitigated by 30min idle timeout and concurrency cap.

## 3. SQLite as Message Bus

**Choice:** WhatsApp messages stored in SQLite, polled every 2s by the message loop.

**Why:**
- Crash recovery — messages survive process restarts
- Deduplication — dual-cursor system prevents double-processing
- Queryable history — agents can search past conversations
- Single-writer simplicity — no need for Redis, RabbitMQ, etc.

**Trade-off:** 2s latency floor on message processing. Acceptable for chat UX.

## 4. Dual-Cursor Deduplication

**Choice:** Two timestamp cursors: `lastTimestamp` (global) and `lastAgentTimestamp` (per-group).

**Why:**
- `lastTimestamp` advances immediately → prevents re-scanning on next poll
- `lastAgentTimestamp` advances only after successful agent delivery → enables retry on failure
- Crash recovery: if process dies between cursor updates, messages are re-delivered (at-least-once)

## 5. Secrets via Stdin, Never Mounted

**Choice:** API keys passed as JSON in container stdin, immediately stripped from logs. Never mounted as files or set in `process.env`.

**Why:**
- Bash subprocess isolation — `unset` hook in SDK prevents `env` leak
- No file on disk inside container — can't be read by agent tools
- No Docker env vars — can't be seen via `docker inspect`

## 6. Sentinel-Delimited Streaming

**Choice:** Agent results wrapped in `---NANOCLAW_OUTPUT_START---` / `---NANOCLAW_OUTPUT_END---` markers on stdout.

**Why:**
- Real-time streaming — host parses results as they arrive, no buffering
- Multiple results per run — agent swarms and multi-step tasks emit multiple sentinel pairs
- Clean separation from debug output — SDK logs go to stderr

## 7. Long-Lived Containers with Idle Timeout

**Choice:** Containers stay alive for 30min after last activity. Follow-up messages pipe into the running container via IPC input files.

**Why:**
- Session continuity — Claude maintains conversation context across messages
- Fast response — no cold start for follow-up messages
- Resource cleanup — idle containers are killed automatically

## 8. Main Group as Admin

**Choice:** The `main` group folder has elevated privileges: can message any chat, register new groups, and sees the full project directory.

**Why:**
- Self-administration — the primary chat can manage the system
- Bootstrap — first group needs to be able to register others
- Project access — main agent can modify NanoClaw's own code

**All other groups** are sandboxed to their own folder and can only message their own chat.

## 9. Polling over Webhooks

**Choice:** Three polling loops (messages 2s, IPC 1s, scheduler 60s) instead of event-driven webhooks.

**Why:**
- No external dependencies — no webhook server, no ngrok, no public IP needed
- Simplicity — `setInterval` + SQLite query is trivial to reason about
- Reliability — polling recovers automatically from transient failures
- Baileys constraint — WhatsApp Web protocol doesn't offer webhooks anyway

## 10. Per-Group CLAUDE.md Personas

**Choice:** Each group directory contains a `CLAUDE.md` that defines the agent's persona, capabilities, and instructions for that group.

**Why:**
- Persona isolation — family chat gets a different personality than work chat
- Capability scoping — some groups get browser tools, others don't
- User-editable — group members can customize behavior by editing the file
- `global/CLAUDE.md` injected into all groups for shared baseline behavior
