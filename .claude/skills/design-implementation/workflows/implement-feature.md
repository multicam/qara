# Implement Feature Workflow

Core workflow for automated UI feature implementation.

**Triggers:** "implement next feature", "implement the [feature]", "build the [component]", "implement feature from [file path]".

---

## Steps

### 1. Parse Feature Specification

Source types: verbal description, file path (`thoughts/features/` or plan file), Figma link, current plan file.

Extract: feature name (for history dir), components to create/modify, design reference, acceptance criteria.

### 2. Setup Environment

```bash
bun ${SKILL_DIR}/tools/server-manager.ts status
bun ${SKILL_DIR}/tools/server-manager.ts start
bun ${SKILL_DIR}/tools/server-manager.ts wait-ready
```

### 3. Launch Browser (capture "before" state)

```bash
bun ${SKILL_DIR}/tools/playwright-runner.ts capture \
  --url http://localhost:${PORT} \
  --output-dir ${SKILL_DIR}/history/${FEATURE_ID}
```

### 4. Implement Feature

Delegate to `impeccable` skill or implement directly:
- Create/modify component files
- Add imports
- Style with Tailwind (or project CSS system)
- Wire up to page/route
- Add state management if needed

Wait for HMR after each file save (configurable delay, default 2s).

### 5. Verify Implementation

```bash
bun ${SKILL_DIR}/tools/playwright-runner.ts full \
  --url http://localhost:${PORT} \
  --output-dir ${SKILL_DIR}/history/${FEATURE_ID}
```

Read `capture.json`:

| Check | Pass Criteria |
|-------|---------------|
| Console errors | Zero errors |
| Network failures | Zero 4xx/5xx |
| TypeScript | `bun tsc --noEmit` passes |
| Visual match | Claude vision confirms match to spec |

### 6. Evaluate Results

```
IF all checks pass:
  → Mark feature complete
  → Generate completion report
  → Proceed to next feature (if any)

IF checks fail:
  → Enter fix-errors workflow
  → Track iteration count
```

### 7. Iteration Loop

```
WHILE errors exist AND iteration < maxIterations:
  1. Categorize errors (console/TS/network/visual)
  2. Apply fix via Edit
  3. Wait for HMR
  4. Re-verify
  5. iteration++

IF iteration >= maxIterations:
  → Escalate with detailed report
  → Ask Jean-Marc for guidance
```

---

## State Management

Update `state.json` at each step:

```json
{
  "currentFeature": "hero-section",
  "iteration": 0,
  "status": "implementing",
  "errors": [],
  "lastScreenshot": null
}
```

**Status values:** `idle` | `implementing` | `verifying` | `fixing` | `complete` | `escalated`.

---

## Completion Report

Generate `history/${FEATURE_ID}/report.md`:

```markdown
# Feature Implementation Report

**Feature:** ${FEATURE_NAME}
**Status:** Complete | Escalated
**Iterations:** ${COUNT}
**Duration:** ${TIME}

## Changes Made
- Created: ${FILES_CREATED}
- Modified: ${FILES_MODIFIED}

## Verification Results
- Console: ${PASS/FAIL}
- Network: ${PASS/FAIL}
- TypeScript: ${PASS/FAIL}
- Visual: ${PASS/FAIL}

## Screenshots
- Before: history/${FEATURE_ID}/before.png
- After: history/${FEATURE_ID}/iteration-${N}.png

## Notes
${ANY_ISSUES_OR_OBSERVATIONS}
```

---

## Integration Points

| Skill/Agent | Usage |
|-------------|-------|
| `impeccable` | Delegate complex component design |
| `fix-errors` workflow | Handle verification failures |
| `engineer` agent | Escalate complex bugs |
