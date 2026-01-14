# Agent Lens Phase 2 - Activation Guide

## Phase 2 Components Created

All new components are ready! Here's what's been built:

### Core Components
1. ✅ `DualPaneLayout.vue` - Resizable dual-pane container
2. ✅ `SessionTimeline.vue` - Hierarchical process timeline
3. ✅ `HierarchicalEvent.vue` - Nested event visualization
4. ✅ `MetricsPanel.vue` - Metrics and event details display
5. ✅ `AppAgentLens.vue` - New main app with dual-pane layout

### Theme
6. ✅ `theme-agent-lens-oled` - OLED-optimized dark theme added to `themes.css`

## How to Activate Agent Lens UI

### Option 1: Quick Test (Recommended)

**Edit main.ts to use the new App:**

```typescript
// File: apps/client/src/main.ts

import { createApp } from 'vue'
import './styles/main.css'
import './styles/themes.css'
import './styles/compact.css'
import AppAgentLens from './AppAgentLens.vue' // Changed from './App.vue'

createApp(AppAgentLens).mount('#app')
```

### Option 2: Keep Both (Side-by-side comparison)

**Rename files:**
```bash
cd apps/client/src
mv App.vue AppLegacy.vue
mv AppAgentLens.vue App.vue
```

This way you can switch back by reversing the rename.

### Option 3: Route-based switching

Add a query parameter to toggle between views (more complex, not needed for testing).

## Testing Checklist

### Visual Verification

1. **Start the dev server:**
   ```bash
   cd ~/.claude/skills/agent-observability/apps/client
   bun run dev
   ```

2. **Open browser:** http://localhost:5173

3. **Verify dual-pane layout:**
   - [ ] Left pane shows "Process Timeline"
   - [ ] Right pane shows "Results & Metrics" with tabs
   - [ ] Resizer between panes works (drag to adjust)
   - [ ] Pane widths are constrained (25%-60%)

4. **Verify hierarchy visualization:**
   - [ ] Events show parent-child nesting with indentation
   - [ ] PostToolUse events are nested under PreToolUse
   - [ ] Collapse/expand icons appear for events with children
   - [ ] Clicking collapse icon hides/shows children
   - [ ] "Collapse All" and "Expand All" buttons work

5. **Verify theme:**
   - [ ] Background is dark gray (#0A0A0A), not pure black
   - [ ] Text is off-white (#F5F5F5), not pure white
   - [ ] Purple accent color (#BBA0FF) appears on interactive elements
   - [ ] Borders are subtle but visible
   - [ ] No harsh contrast or visual vibration

6. **Verify metrics:**
   - [ ] Metrics cards show correct counts
   - [ ] Click an event in left pane, verify it highlights
   - [ ] Right pane shows event details when event is selected
   - [ ] Context percentage bar appears if context data exists

7. **Verify tabs:**
   - [ ] Click "Metrics", "Legacy View", and "HITL" tabs
   - [ ] Content switches correctly
   - [ ] Legacy view shows old swim lane interface
   - [ ] HITL tab shows placeholder (Phase 3)

### Functional Verification

8. **Event interaction:**
   - [ ] Click event in timeline, verify it highlights (purple border)
   - [ ] Click different event, verify selection changes
   - [ ] Expand event with children, verify nesting indentation
   - [ ] Collapse event, verify children hide

9. **Resize behavior:**
   - [ ] Drag resizer left/right
   - [ ] Verify content reflows smoothly
   - [ ] Verify scrollbars appear when needed
   - [ ] Verify minimum widths are enforced

10. **Filter integration:**
    - [ ] Click "Filters" button in header
    - [ ] Apply filter, verify timeline updates
    - [ ] Clear filter, verify all events return

## Known Limitations (Expected)

- HITL interface is placeholder (Phase 3)
- Token/cost metrics show N/A (Phase 4 - needs calculation logic)
- Some old events may not have hierarchy (pre-Phase 1)

## Reverting to Old UI

If you need to go back to the original interface:

```typescript
// File: apps/client/src/main.ts

import App from './App.vue' // Revert to original
// import AppAgentLens from './AppAgentLens.vue' // Comment out new

createApp(App).mount('#app')
```

Or use git to restore:
```bash
git checkout apps/client/src/main.ts
```

## Next Steps After Testing

Once you verify Phase 2 works:

1. Decide if you want to make it the default (rename AppAgentLens.vue → App.vue)
2. Report any UI issues or improvements needed
3. Proceed to Phase 3 (HITL) or Phase 4 (Metrics calculations)

---

**Created:** 2026-01-14
**Status:** Ready for testing
**Phase:** 2 of 6
