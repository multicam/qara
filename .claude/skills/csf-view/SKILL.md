---
name: csf-view
context: same
description: |
  Visual canvas (tldraw) for communicating designs, ideas, and flows to Claude.
  Saves canvas state as JSON to thoughts/shared/views/. Claude reads and
  interprets the visual context for any active workflow.
  USE WHEN: "csf-view", "open canvas", "visual shaping", "tldraw", "draw it"
---

## Workflow Routing (SYSTEM PROMPT)

**When user says "csf-view", "open canvas", "/csf-view", "launch tldraw":**
→ **READ:** `${PAI_DIR}/skills/csf-view/workflows/launch.md`
→ **EXECUTE:** Start the csf-view app, open browser, arm SSE listener

**When Claude receives an SSE event from csf-view (save detected):**
→ **READ:** `${PAI_DIR}/skills/csf-view/workflows/interpret.md`
→ **EXECUTE:** Read JSON, compose visual brief, feed to active workflow

## When to Activate This Skill

1. **Core Skill Name** — "csf-view", "canvas"
2. **Action Verbs** — "open canvas", "launch tldraw", "start visual"
3. **Modifiers** — "quick sketch", "visual brainstorm"
4. **Prepositions** — "draw on canvas", "sketch for this idea"
5. **Synonyms** — "whiteboard", "diagram", "wireframe"
6. **Use Case** — Visual thinking, communicating designs to Claude
7. **Result-Oriented** — "show me what I drew", "read my canvas"
8. **Tool Specific** — "tldraw", "csf-view"

## Architecture

```
┌─────────────────┐     save      ┌──────────────────┐     SSE event    ┌───────────────┐
│  tldraw canvas   │ ──────────→  │  Bun API :7201   │ ──────────────→  │  Claude Code   │
│  (browser)       │              │  writes JSON +    │                  │  reads JSON,   │
│  tlview.localhost│  ←────────── │  serves built UI  │                  │  interprets    │
│  :1111 (portless)│     load     │  + pushes SSE     │                  │  visual context│
└─────────────────┘              └──────────────────┘                  └───────────────┘
                                        │
                                        ▼
                              thoughts/shared/views/<name>.json
```

## How It Works

1. JM draws on the tldraw canvas in the browser
2. Ctrl+S (or 💾 Save button) → Bun server writes JSON to `thoughts/shared/views/<name>.json`
3. Server pushes SSE event → Claude receives notification via background `curl`
4. Claude reads the JSON, interprets shapes semantically, uses context in active workflow

## Versioning

- **Save** overwrites the current file: `<name>.json`
- **v+ button** saves as next version: `<name>-v1.json`, `<name>-v2.json`, etc. Previous versions stay on disk.
- **Rename** (click filename in info bar) renames on disk and resets version counter.
- URL reflects current file: `http://tlview.localhost:1111?file=<name>`

## UI Components

- **InfoPanel** (top center): project name / editable filename / last saved time
- **SaveToolbar** (top right): v+ button + 💾 Save button
- **Qara aesthetic**: Instrument Sans/Serif/JetBrains Mono fonts, warm neutral palette

## Interpreting the Canvas

Claude reads the tldraw document and maps shapes to meaning:
- **Frames** → screens, pages, bounded sections
- **Geo shapes (rectangle, ellipse)** → components, modules, entities
- **Text** → labels, requirements, annotations
- **Arrows** → flows, relationships, dependencies (read bindings for connections)
- **Notes** → requirements, constraints, open questions
- **Groups** → feature clusters, bounded contexts
- **Spatial layout** → top→bottom = flow, left→right = sequence, nested = containment

## Scope

- Views path is **relative to the calling repo**: `<repo>/thoughts/shared/views/`
- One instance per project — `VIEWS_DIR` env var scopes the server
- Only `document` portion persisted (no viewport/selection noise)
- Fresh read each save — no diffing

## Running Modes

- **Production** (from any repo): `bun run ~/Code/csf-view/server.ts` — serves built frontend from `dist/` + API, single process on `:7201`
- **Dev** (when working on csf-view): `cd ~/Code/csf-view && bun run dev` — Vite HMR + API server
- If `dist/` is stale: `cd ~/Code/csf-view && bun run build`

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Server status + active `viewsDir` |
| POST | `/api/save` | Save tldraw document to `<views-dir>/<name>.json` + push SSE |
| GET | `/api/load?name=` | Load a saved view |
| GET | `/api/list` | List all view filenames in views dir |
| POST | `/api/rename` | Rename a view file (updates name inside JSON) |
| GET | `/events` | SSE stream — push on save/rename |

## App Location

Web app source: `~/Code/csf-view`
