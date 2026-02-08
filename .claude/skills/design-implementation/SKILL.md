---
name: design-implementation
context: fork
description: |
  Automated UI development loop: dev server + browser + implement + verify + fix.
  Launches dev server, implements via frontend-design skill, checks for errors
  (console, TypeScript, network), and iterates up to 5 times.
  USE WHEN: "implement next feature", "implement [description]", "verify the UI".
  NOT for one-off design/code tasks — use frontend-design directly for those.
  6. Reports completion or escalates with detailed report

  **Triggers:**
  - "implement next feature", "implement the hero section"
  - "verify this implementation", "check the UI"
  - "fix the errors", "iterate on this"
  - "start dev server", "manage server"
---

## Workflow Routing

| Intent | Workflow |
|--------|----------|
| "implement feature", "build the X" | `workflows/implement-feature.md` |
| "verify", "check", "screenshot" | `workflows/verify-visual.md` |
| "fix errors", "fix the issues" | `workflows/fix-errors.md` |
| "start server", "stop server" | `workflows/manage-server.md` |
| "test interactions", "click test" | `workflows/test-interactions.md` |

---

## Quick Start

```bash
# Basic usage
"implement the login form based on the Figma design"

# With specific file
"implement the feature described in thoughts/features/hero-section.md"

# Headless mode (CI/testing)
"implement next feature --headless"

# Just verify current state
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
| `frontend-design` | Initial implementation |
| `engineer` agent | Escalate complex bugs |
| `design-iterator` agent | Multiple visual refinements |

---

## History

Each feature creates artifacts in `history/{feature-id}/`:
- `spec.md` - Original feature specification
- `iteration-{n}.png` - Screenshots per iteration
- `figma-reference.png` - Design reference (if Figma link provided)
- `errors.log` - Captured errors
- `report.md` - Final completion report

**Note:** `history/` is gitignored.
