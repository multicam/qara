# Interpret Canvas

Read the saved tldraw JSON and compose a visual brief for the active workflow.

## Trigger

This workflow runs when Claude receives an SSE event from the csf-view app (a save or rename was detected).

## Steps

### 1. Read the view file

The SSE event contains `{ name, savedAt }`. Read the corresponding file:

```bash
cat thoughts/shared/views/<name>.json
```

Or use the Read tool on `<repo>/thoughts/shared/views/<name>.json`.

### 2. Parse the tldraw document

The JSON structure:
```json
{
  "name": "my-idea-v2",
  "savedAt": "ISO timestamp",
  "document": {
    "store": {
      "page:xxx": { ... },
      "shape:xxx": { "type": "geo|arrow|text|frame|note|draw", "props": { ... }, "x": N, "y": N, "parentId": "..." },
      "binding:xxx": { "fromId": "shape:arrow", "toId": "shape:target", "props": { "terminal": "start|end" } }
    },
    "schema": { "schemaVersion": 2 }
  }
}
```

### 3. Extract semantic structure

Map tldraw shapes to meaning:

| Shape type | `type` value | Key props | Interpret as |
|------------|-------------|-----------|-------------|
| Frame | `frame` | `props.name`, `props.w`, `props.h` | Screen, page, bounded section |
| Rectangle/Ellipse | `geo` | `props.geo`, `props.richText`, `props.color` | Component, module, entity |
| Text | `text` | `props.richText` | Label, annotation, requirement |
| Arrow | `arrow` | `props.start`, `props.end`, `props.richText` | Flow, relationship, dependency |
| Note | `note` | `props.richText`, `props.color` | Requirement, constraint, question |
| Draw (freehand) | `draw` | — | Emphasis, sketch, annotation |

**Text content:** Shape text is in `props.richText` (ProseMirror format). Extract text from `richText.content[].content[].text`.

**Connections:** Arrows connect shapes via `binding` records. Read `binding.fromId` (arrow) and `binding.toId` (target shape) with `binding.props.terminal` (start/end) to trace flows.

**Hierarchy:** Shapes with `parentId` pointing to another shape are children (e.g., rectangles inside a frame = components of a screen).

**Spatial layout:**
- Top → bottom = flow direction or priority
- Left → right = sequence or timeline
- Nested = containment/composition
- Clustered = related concepts

### 4. Compose the visual brief

Write a concise text summary:
- What screens/components/entities exist
- How they connect (flows, data paths, dependencies)
- What annotations/notes JM wrote
- Spatial groupings and implied hierarchy
- Any questions or open items (sticky notes, "?" marks)

### 5. Feed into active workflow

The visual brief becomes context for whatever workflow is active:
- **Product shaping** → replaces the "what's the idea?" opener; shaping still asks its own questions
- **Architecture discussion** → grounds the conversation in a concrete diagram
- **Debugging** → shows the system JM is reasoning about
- **Any conversation** → gives Claude visual context JM is looking at

### 6. Fresh read each save

Each save is interpreted fresh — no diffing against previous versions. Claude reads the full canvas state each time.
