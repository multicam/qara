# NanoClaw Documentation — February 2026

Visual and technical explainer of the NanoClaw architecture.

## Documents

| File | Contents |
|------|----------|
| [architecture.md](architecture.md) | Full ASCII architecture diagram, message lifecycle, security model |
| [components.md](components.md) | Every component with file paths, line numbers, function references |
| [data-flow.md](data-flow.md) | Step-by-step data flow diagrams: inbound, outbound, scheduled tasks, follow-ups, IPC |
| [design-decisions.md](design-decisions.md) | 10 key architectural choices and their rationale |

## One-Liner

Single Node.js process connects to WhatsApp via Baileys, stores messages in SQLite, polls for triggers, spawns isolated Docker containers running Claude Agent SDK per group, communicates via filesystem IPC with atomic JSON files.
