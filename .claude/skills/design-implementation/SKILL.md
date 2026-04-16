---
name: design-implementation
context: fork
description: |
  Automated UI dev loop: dev server + browser + implement + verify + fix. Iterates up to 5 times.
  USE WHEN: "implement next feature", "verify the UI", "fix the errors".
---

## Workflow Routing

| Intent | Workflow |
|--------|----------|
| "implement feature", "build the X" | `workflows/implement-feature.md` |
| "verify", "check", "screenshot" | `workflows/verify-visual.md` |
| "fix errors", "fix the issues" | `workflows/fix-errors.md` |
| "start server", "stop server" | `workflows/manage-server.md` |

---

## Quick Start

```bash
"implement the login form based on the Figma design"
"implement the feature described in thoughts/features/hero-section.md"
"implement next feature --headless"
"verify the current implementation"
```

---

## Configuration

Edit `config.json` in this skill directory:

```json
{
  "browser": {
    "headless": false,
    "viewport": { "width": 1280, "height": 720 }
  },
  "server": {
    "port": "auto",
    "startCommand": "auto",
    "hmrDelay": 2000
  },
  "iteration": {
    "maxIterations": 5,
    "layoutTolerance": 0.95
  },
  "figma": {
    "enabled": true
  }
}
```

---

## Tools

| Tool | Purpose |
|------|---------|
| `tools/playwright-runner.ts` | Browser automation (screenshot, console, network) |
| `tools/server-manager.ts` | Dev server lifecycle (start, stop, detect port) |

---

## State Tracking

`state.json` tracks current feature progress:

```json
{
  "currentFeature": "hero-section",
  "iteration": 2,
  "status": "fixing",
  "errors": ["console: Failed to load image"],
  "lastScreenshot": "history/hero-section/iteration-2.png"
}
```

---

## Integration

| Skill/Agent | When Used |
|-------------|-----------|
| `impeccable` | Initial implementation |
| `engineer` agent | Escalate complex bugs |

---

## History

Each feature creates artifacts in `history/{feature-id}/`:
- `spec.md` — original feature specification
- `iteration-{n}.png` — screenshots per iteration
- `figma-reference.png` — design reference (if Figma link provided)
- `errors.log` — captured errors
- `report.md` — final completion report

**Note:** `history/` is gitignored.
