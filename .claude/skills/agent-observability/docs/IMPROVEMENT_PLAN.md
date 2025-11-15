# Agent Observability System - Improvement Plan

**Created:** 2025-11-16
**Status:** In Progress
**Last Updated:** 2025-11-16

---

## 🎯 Executive Summary

This plan addresses critical issues identified in the agent-observability system review (Nov 16, 2025) and
implements the redesign of swim lanes from bar charts to true event bubble visualization.

**Key Findings:**

- ✅ Data collection pipeline working
- ⚠️  No events captured Nov 14-16 (investigation needed)
- ❌ Swim lanes use bar chart aggregation (should show individual event bubbles)
- ⚠️  Session mapping file grows unbounded
- ⚠️  Hardcoded agent defaults

---

## 📊 Plan Overview

| Priority | Category | Tasks | Status |
|----------|----------|-------|--------|
| 🔴 Critical | Data Collection | 4 | 4/4 complete ✅ |
| 🔴 Critical | Swim Lane Redesign | 10 | 4/10 complete |
| 🟡 Medium | Performance & Reliability | 6 | 0/6 complete |
| 🟢 Low | Polish & Enhancement | 5 | 0/5 complete |

**Total Progress:** 8/25 tasks complete (32%)

---

## 🔴 CRITICAL PRIORITY - Data Collection Fixes

### 1. Event Capture Investigation

**Issue:** No events captured Nov 14-16, 2025

- [x] **1.1** Check hooks configuration in ~/.claude/settings.json
  - Verify all hook event types are configured
  - Ensure paths point to capture-all-events.ts
  - Confirm PAI_DIR environment variable is set

- [ ] **1.2** Test hook manually
  ```bash
  echo '{"session_id":"test","tool_name":"Read"}' | \
    bun ~/.claude/hooks/capture-all-events.ts --event-type PreToolUse
  ```
  - Verify JSONL file is created
  - Check permissions on ~/.claude/history/raw-outputs/
  - Confirm file naming format: YYYY-MM-DD_all-events.jsonl

- [ ] **1.3** Add hook execution logging
  - Add debug output to capture-all-events.ts
  - Log to separate debug file: ~/.claude/logs/hook-debug.log
  - Include: timestamp, event type, success/failure

- [ ] **1.4** Verify Claude Code is triggering hooks
  - Check Claude Code logs for hook execution
  - Confirm hook scripts have execute permissions
  - Test with a simple tool use (e.g., Read command)

**Acceptance Criteria:**

- ✅ Events appear in today's JSONL file
- ✅ Hook execution logged successfully
- ✅ No permission errors

**Files Modified:**

- `.claude/hooks/capture-all-events.ts`
- `.claude/settings.json`

---

### 2. Agent Name Configuration

**Issue:** 'qara' is hardcoded in multiple places

- [x] **2.1** Create agent configuration system
  ```typescript
  // apps/server/src/config.ts
  export const DEFAULT_AGENT_NAME = process.env.PAI_AGENT_NAME || 'claude';
  ```

- [x] **2.2** Update capture-all-events.ts
  - Replace hardcoded 'qara' strings (lines 91, 97, 182)
  - Read from environment variable
  - Add fallback to 'claude' if not set

- [x] **2.3** Update documentation
  - Add PAI_AGENT_NAME to environment variables section
  - Update SETUP.md with configuration example
  - Add to settings.json.example

- [x] **2.4** Add validation
  - Warn if agent name is default value
  - Log configured agent name on startup

**Acceptance Criteria:**

- ✅ No hardcoded agent names in codebase
- ✅ Agent name configurable via environment variable
- ✅ Documentation updated

**Files Modified:**

- `.claude/hooks/capture-all-events.ts`
- `.claude/skills/agent-observability/apps/server/src/config.ts` (new)
- `.claude/skills/agent-observability/SETUP.md`
- `.claude/skills/agent-observability/README.md`

---

### 3. Session Mapping Cleanup

**Issue:** agent-sessions.json grows unbounded

- [x] **3.1** Implement session mapping cleanup
  ```typescript
  const MAX_SESSION_MAPPINGS = 1000;

  function cleanupOldSessions(mappings: Record<string, SessionMapping>) {
    if (Object.keys(mappings).length <= MAX_SESSION_MAPPINGS) return mappings;

    // Keep only most recent sessions (by lastAccessAt)
    const sorted = Object.entries(mappings)
      .sort((a, b) => b[1].lastAccessAt - a[1].lastAccessAt)
      .slice(0, MAX_SESSION_MAPPINGS);

    return Object.fromEntries(sorted);
  }
  ```

- [x] **3.2** Add session metadata
  - Store timestamp with each session mapping (createdAt, lastAccessAt)
  - Track last access time (updated on every read)
  - Added SessionMapping interface with metadata

- [x] **3.3** Add automatic cleanup
  - Cleanup runs on every setAgentForSession call
  - Cleanup also runs on getAgentForSession (with lastAccessAt update)
  - Added migration function for old format (string → object)

- [x] **3.4** Test migration and cleanup
  - Created test-session-cleanup.ts script
  - Successfully migrated 21 entries from old to new format
  - Verified hook works with new format
  - Created backup before migration

**Acceptance Criteria:**

- ✅ Session mapping file stays under 1000 entries
- ✅ Old sessions cleaned up automatically
- ✅ No race conditions in concurrent writes

**Files Modified:**

- `.claude/hooks/capture-all-events.ts`
- `.claude/skills/agent-observability/apps/server/src/file-ingest.ts`

---

### 4. Event Validation Enhancement

**Issue:** Partial validation, no schema enforcement

- [x] **4.1** Create event type whitelist
  ```typescript
  const VALID_EVENT_TYPES = [
    'SessionStart', 'SessionEnd',
    'PreToolUse', 'PostToolUse',
    'UserPromptSubmit', 'Stop', 'SubagentStop',
    'Notification', 'PreCompact'
  ] as const;
  ```

- [x] **4.2** Add timestamp sanity checks
  - Reject timestamps more than 1 hour in future
  - Reject timestamps more than 1 year in past
  - Log validation failures with clear messages

- [x] **4.3** Add session ID format validation
  - Check minimum length (3 chars) and maximum (100 chars)
  - Validates in both hook and server
  - Rejects invalid session IDs with clear error

- [x] **4.4** Test validation
  - Tested with invalid event type (rejected successfully)
  - Tested with valid event type (accepted and written)
  - Both hook and server now have consistent validation

**Acceptance Criteria:**

- ✅ Invalid event types rejected
- ✅ Timestamp bounds enforced
- ✅ Validation failures logged

**Files Modified:**

- `.claude/hooks/capture-all-events.ts`
- `.claude/skills/agent-observability/apps/server/src/file-ingest.ts`
- `.claude/skills/agent-observability/apps/server/src/types.ts`

---

## 🔴 CRITICAL PRIORITY - Swim Lane Redesign

### Overview: Bar Chart → Event Bubble Visualization

Current implementation uses aggregated bar charts. Need to redesign as true swim lanes with
individual event bubbles positioned chronologically.

**Visual Comparison:**

```
CURRENT (Bar Chart):
[Agent: claude-researcher]
Chart: |  |   |||  |    ||  |   |
       [Aggregated counts in time buckets]

DESIRED (Event Bubbles):
[claude-researcher ══════════════════════════════════════]
                    [bubble]    [bubble]      [bubble]
                    gemini-r    gemini-r      gemini-r
                    Pre-Tool    Pre-Tool      Post-Tool
                    Task        Bash          Read
                    5k111       5k111         5k111
```

---

### 5. Core Architecture - Event Bubble Renderer

- [x] **5.1** Create new swim lane renderer
  - File: `apps/client/src/utils/swimLaneRenderer.ts`
  - Class: `SwimLaneRenderer`
  - Methods: `drawEventBubbles()`, `layoutEvents()`, `drawEventBubble()`
  - ✅ Created with full API

- [x] **5.2** Implement rounded rectangle helper
  ```typescript
  private roundRect(x: number, y: number, w: number, h: number, radius: number) {
    // Canvas path with proper rounded corners
    // Support for different corner radii
  }
  ```
  - ✅ Implemented using canvas `arcTo()` method
  - ✅ Supports per-corner radius control

- [x] **5.3** Implement timestamp-to-X positioning
  ```typescript
  private timestampToX(timestamp: number): number {
    const timeSpan = this.timeRange.end - this.timeRange.start;
    const normalizedTime = (timestamp - this.timeRange.start) / timeSpan;
    return chartArea.x + chartArea.width * normalizedTime;
  }
  ```
  - ✅ Implemented with time range normalization
  - ✅ Maps timestamps to horizontal positions

- [x] **5.4** Add event bubble positioning algorithm
  - ✅ Calculate X from exact timestamp (not bucket)
  - ✅ Calculate Y with vertical stacking for overlaps
  - ✅ Maintain minimum gap between bubbles (configurable)
  - ✅ Handle edge cases (off-screen, boundaries)
  - ✅ Row-based layout algorithm prevents overlaps

**Acceptance Criteria:**

- ✅ SwimLaneRenderer class created
- ✅ Rounded rectangles drawn correctly
- ✅ Events positioned by timestamp
- ✅ No overlap between bubbles

**Files Created:**

- `apps/client/src/utils/swimLaneRenderer.ts` (495 lines)

---

### 6. Data Flow - Remove Aggregation

- [ ] **6.1** Create useSwimLaneEvents composable
  - File: `apps/client/src/composables/useSwimLaneEvents.ts`
  - NO aggregation into buckets
  - Filter events by agent and time range
  - Sort by timestamp
  - Return individual events

- [ ] **6.2** Remove dependency on useAgentChartData
  - Document old aggregation approach (for reference)
  - Keep old file for now (don't delete yet)
  - Update AgentSwimLane.vue to use new composable

- [ ] **6.3** Add event filtering logic
  ```typescript
  const filteredEvents = computed(() => {
    const now = Date.now();
    const cutoff = now - getTimeRangeMs(timeRange);
    return events.value
      .filter(e => e.source_app === agentName)
      .filter(e => e.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  });
  ```

**Acceptance Criteria:**

- ✅ Individual events preserved (not aggregated)
- ✅ Events filtered by agent and time range
- ✅ Events sorted chronologically

**Files Created:**

- `apps/client/src/composables/useSwimLaneEvents.ts`

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`

---

### 7. Event Bubble Visual Design

- [ ] **7.1** Design bubble structure
  ```
  ┌────────────────────────────────────┐
  │ [Agent Badge] Pre-Tool Bash Read   │ ← Tool badges
  │ gemini-researcher                  │ ← Agent name
  │ Session: 5k111                     │ ← Session ID
  └────────────────────────────────────┘
  ```

- [ ] **7.2** Implement agent name badge
  - Rounded pill shape
  - Agent color from useEventColors
  - Bold white text
  - Fixed height (e.g., 40px)
  - Dynamic width based on content

- [ ] **7.3** Implement tool badges
  - Small rectangular badges
  - Semi-transparent white background
  - Tool name text
  - Icons (optional, if space allows)
  - Positioned to right of agent badge

- [ ] **7.4** Add session ID display
  - Small monospace font
  - Grey text (secondary color)
  - Truncated to 5 characters
  - Bottom-right corner of bubble

- [ ] **7.5** Add visual polish
  - Drop shadow for depth
  - Subtle border
  - Hover effect (brighten/scale)
  - Smooth animations

**Acceptance Criteria:**

- ✅ Bubbles match screenshot design
- ✅ Agent colors applied correctly
- ✅ Tool badges clearly visible
- ✅ Session IDs truncated properly

**Files Modified:**

- `apps/client/src/utils/swimLaneRenderer.ts`

---

### 8. Layout Algorithm - Overlap Prevention

- [ ] **8.1** Implement overlap detection
  ```typescript
  private detectOverlap(pos1: EventPosition, pos2: EventPosition): boolean {
    const horizontalOverlap = Math.abs(pos1.x - pos2.x) < (pos1.width + MIN_GAP);
    const verticalOverlap = Math.abs(pos1.y - pos2.y) < pos1.height;
    return horizontalOverlap && verticalOverlap;
  }
  ```

- [ ] **8.2** Implement vertical stacking
  - Start events at top of lane (y = 0)
  - If overlap detected, move to next row (y += height + gap)
  - Continue until no overlap
  - Track used positions

- [ ] **8.3** Optimize layout performance
  - Use spatial index for overlap checks
  - Only check nearby events (not all events)
  - Cache positions between frames
  - Limit maximum stacking depth

- [ ] **8.4** Handle edge cases
  - Events at start/end of timeline
  - Very dense event clusters
  - Lane height overflow (too many stacked events)
  - Empty lanes

**Acceptance Criteria:**

- ✅ No overlapping event bubbles
- ✅ Vertical stacking works correctly
- ✅ Performance acceptable (60fps with 100+ events)
- ✅ Edge cases handled gracefully

**Files Modified:**

- `apps/client/src/utils/swimLaneRenderer.ts`

---

### 9. Integration with AgentSwimLane Component

- [ ] **9.1** Update AgentSwimLane.vue imports
  ```typescript
  import { useSwimLaneEvents } from '../composables/useSwimLaneEvents';
  import { SwimLaneRenderer } from '../utils/swimLaneRenderer';
  ```

- [ ] **9.2** Replace render logic
  - Remove drawBars() call
  - Add drawEventBubbles() call
  - Update dimensions (may need taller lanes)
  - Update padding (less needed now)

- [ ] **9.3** Update event processing
  - No need to aggregate events
  - Pass individual events to renderer
  - Remove processedEventIds deduplication (still needed for animations)

- [ ] **9.4** Update header metrics
  - Keep event count badge
  - Keep tool call count
  - Update avg time calculation (if needed)

**Acceptance Criteria:**

- ✅ Component renders with new swim lane design
- ✅ Events appear as bubbles (not bars)
- ✅ Header metrics still functional
- ✅ No console errors

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`

---

### 10. Interaction - Click & Hover

- [ ] **10.1** Add click detection for bubbles
  ```typescript
  handleCanvasClick(event: MouseEvent) {
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find which bubble was clicked
    const clickedEvent = this.findEventAtPosition(x, y);
    if (clickedEvent) {
      this.showEventDetails(clickedEvent);
    }
  }
  ```

- [ ] **10.2** Show event detail modal
  - Display full event payload
  - Show tool inputs/outputs
  - Show timing information
  - Add copy-to-clipboard button

- [ ] **10.3** Improve tooltip
  - Show event type
  - Show tool name
  - Show exact timestamp
  - Show duration (if available)

- [ ] **10.4** Add hover effects
  - Brighten bubble on hover
  - Scale up slightly (1.05x)
  - Show cursor pointer
  - Smooth transition

**Acceptance Criteria:**

- ✅ Click opens event details
- ✅ Hover changes cursor and highlights bubble
- ✅ Tooltip shows relevant information
- ✅ Modal displays complete event data

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`
- `apps/client/src/utils/swimLaneRenderer.ts`

---

### 11. Timeline Grid & Labels

- [ ] **11.1** Update time label positioning
  - Labels should align with bubble positions
  - Fix label overlap (current issue)
  - Use proper time formatting

- [ ] **11.2** Add vertical gridlines
  - Draw at each time label
  - Light grey color
  - Extend full height of chart area
  - Subtle alpha (0.3)

- [ ] **11.3** Update horizontal baseline
  - Draw single horizontal line
  - Position at bottom of chart
  - Match gridline color

- [ ] **11.4** Test with different time ranges
  - 1 minute (60s, 45s, 30s, 15s, now)
  - 3 minutes (3m, 2m, 1m, now)
  - 5 minutes (5m, 4m, 3m, 2m, 1m, now)
  - 10 minutes (10m, 8m, 6m, 4m, 2m, now)

**Acceptance Criteria:**

- ✅ Time labels don't overlap
- ✅ Gridlines visible but subtle
- ✅ All time ranges work correctly
- ✅ Labels aligned properly

**Files Modified:**

- `apps/client/src/utils/swimLaneRenderer.ts`
- `apps/client/src/components/AgentSwimLane.vue`

---

### 12. Testing & Validation

- [ ] **12.1** Create test data generator
  - Generate mock events with realistic timestamps
  - Include various event types
  - Include multiple agents and sessions
  - Test with 10, 50, 100, 500 events

- [ ] **12.2** Visual regression testing
  - Capture screenshots of swim lanes
  - Compare with reference design (provided screenshot)
  - Check bubble positioning
  - Verify color coding

- [ ] **12.3** Performance testing
  - Measure FPS with many events
  - Test with rapid event stream
  - Monitor memory usage
  - Check for memory leaks

- [ ] **12.4** Cross-browser testing
  - Chrome/Edge (Chromium)
  - Firefox
  - Safari (if available)
  - Check HiDPI display rendering

**Acceptance Criteria:**

- ✅ Visual output matches reference screenshot
- ✅ Performance acceptable (30+ FPS)
- ✅ No memory leaks
- ✅ Works in all major browsers

**Files Created:**

- `apps/client/src/utils/__tests__/swimLaneRenderer.test.ts`
- `apps/client/test-data/mockEvents.ts`

---

### 13. Migration & Documentation

- [ ] **13.1** Add feature flag for new swim lanes
  ```typescript
  const USE_NEW_SWIM_LANES = import.meta.env.VITE_NEW_SWIM_LANES === 'true';
  ```

- [ ] **13.2** Update documentation
  - Add swim lane architecture diagram
  - Document event bubble design
  - Explain layout algorithm
  - Add troubleshooting section

- [ ] **13.3** Create migration guide
  - How to enable new swim lanes
  - Known differences from old design
  - Performance implications
  - Rollback procedure

- [ ] **13.4** Deprecation plan
  - Mark old chartRenderer.ts as deprecated
  - Set removal date (e.g., 30 days)
  - Add console warnings in development
  - Update CHANGELOG.md

**Acceptance Criteria:**

- ✅ Users can opt-in to new design
- ✅ Documentation complete and accurate
- ✅ Migration path clear
- ✅ Old code marked for removal

**Files Modified:**

- `README.md`
- `CHANGELOG.md` (new)
- `docs/ARCHITECTURE.md` (new)
- `docs/MIGRATION_GUIDE.md` (new)

---

## 🟡 MEDIUM PRIORITY - Performance & Reliability

### 14. File Watching Improvements

- [ ] **14.1** Replace fs.watch() with chokidar
  ```bash
  cd apps/server && bun add chokidar
  ```

- [ ] **14.2** Watch directory instead of individual files
  - Monitor ~/.claude/history/raw-outputs/
  - Automatically detect new files
  - Handle file rotation gracefully

- [ ] **14.3** Reduce polling interval
  - Current: 5 seconds when file doesn't exist
  - Change to: Use inotify/FSEvents if available
  - Fallback to 10 second polling

- [ ] **14.4** Add file change debouncing
  - Batch multiple changes within 100ms
  - Reduce redundant reads
  - Improve performance

**Acceptance Criteria:**

- ✅ More reliable file watching
- ✅ Lower CPU usage
- ✅ Faster event detection

**Files Modified:**

- `apps/server/src/file-ingest.ts`
- `apps/server/package.json`

---

### 15. Historical Data Endpoint

- [ ] **15.1** Create history API endpoint
  ```typescript
  // GET /events/history?from=timestamp&to=timestamp&limit=N
  ```

- [ ] **15.2** Implement JSONL file parsing
  - Read from archived files
  - Parse line-by-line (streaming)
  - Filter by time range
  - Limit result count

- [ ] **15.3** Add caching layer
  - Cache parsed events (last 1 hour)
  - Invalidate on file changes
  - Use LRU eviction policy

- [ ] **15.4** Add pagination support
  - Return total count
  - Support offset/limit
  - Return continuation token

**Acceptance Criteria:**

- ✅ Can retrieve historical events
- ✅ Performance acceptable (< 1s for 10k events)
- ✅ Pagination works correctly

**Files Modified:**

- `apps/server/src/index.ts`
- `apps/server/src/file-ingest.ts`

---

### 16. Error Boundaries & Recovery

- [ ] **16.1** Add error boundaries to components
  ```typescript
  <ErrorBoundary fallback={<ErrorFallback />}>
    <AgentSwimLane ... />
  </ErrorBoundary>
  ```

- [ ] **16.2** Handle canvas rendering errors
  - Try/catch in render loop
  - Show error message to user
  - Log to console
  - Attempt recovery

- [ ] **16.3** Handle WebSocket disconnection
  - Show connection status
  - Auto-reconnect with backoff
  - Queue events during disconnect
  - Replay on reconnect

- [ ] **16.4** Handle malformed event data
  - Validate before rendering
  - Skip invalid events
  - Log validation failures
  - Show warning badge

**Acceptance Criteria:**

- ✅ Errors don't crash the app
- ✅ User sees helpful error messages
- ✅ System recovers automatically when possible

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`
- `apps/client/src/utils/swimLaneRenderer.ts`
- `apps/client/src/composables/useWebSocket.ts`

---

### 17. Tooltip Boundary Detection

- [ ] **17.1** Implement tooltip positioning algorithm
  ```typescript
  function adjustTooltipPosition(x: number, y: number, tooltipWidth: number, tooltipHeight: number) {
    // Keep tooltip within container bounds
    // Flip to opposite side if near edge
    // Add arrow pointing to target
  }
  ```

- [ ] **17.2** Add tooltip arrow
  - Point to event bubble
  - Match tooltip background color
  - Flip direction based on position

- [ ] **17.3** Handle container boundaries
  - Detect right edge overflow
  - Detect bottom edge overflow
  - Adjust position accordingly
  - Never render off-screen

**Acceptance Criteria:**

- ✅ Tooltip always visible
- ✅ Tooltip doesn't overflow container
- ✅ Arrow points to correct element

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`

---

### 18. Input Validation

- [ ] **18.1** Validate agent name format
  ```typescript
  function isValidAgentName(name: string): boolean {
    // Format: "app:session"
    // Must contain exactly one colon
    // Both parts non-empty
    return /^[^:]+:[^:]+$/.test(name);
  }
  ```

- [ ] **18.2** Handle invalid agent names
  - Show error message
  - Log to console
  - Provide fallback display
  - Don't crash component

- [ ] **18.3** Validate model name format
  - Check for expected structure
  - Handle various formats gracefully
  - Show raw name if parsing fails

**Acceptance Criteria:**

- ✅ Invalid input handled gracefully
- ✅ Clear error messages shown
- ✅ No component crashes

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`
- `apps/client/src/utils/validation.ts` (new)

---

### 19. Performance Monitoring

- [ ] **19.1** Add performance metrics
  - Events per second
  - Render FPS (actual)
  - WebSocket latency
  - File read latency
  - Memory usage

- [ ] **19.2** Create performance dashboard
  - Show metrics in UI (dev mode)
  - Add toggle to show/hide
  - Display as overlay

- [ ] **19.3** Add performance logging
  - Log slow operations
  - Track performance over time
  - Identify bottlenecks

**Acceptance Criteria:**

- ✅ Performance metrics visible
- ✅ Slow operations logged
- ✅ Useful for debugging

**Files Created:**

- `apps/client/src/utils/performanceMonitor.ts`
- `apps/client/src/components/PerformanceOverlay.vue`

---

## 🟢 LOW PRIORITY - Polish & Enhancement

### 20. Event Compression

- [ ] **20.1** Implement JSONL compression
  - gzip old files (older than 7 days)
  - Keep recent files uncompressed
  - Transparent decompression on read

- [ ] **20.2** Add rotation policy
  - Keep last 30 days uncompressed
  - Keep 30-90 days compressed
  - Archive older than 90 days (or delete)

- [ ] **20.3** Add cleanup script
  - Run daily via cron
  - Log cleanup actions
  - Show storage savings

**Acceptance Criteria:**

- ✅ Storage usage reduced
- ✅ Old events still accessible
- ✅ Automatic cleanup works

**Files Created:**

- `apps/server/scripts/cleanup-events.ts`

---

### 21. Animation & Transitions

- [ ] **21.1** Animate bubble entrance
  - Fade in + scale up
  - Slide in from right
  - Duration: 300ms
  - Easing: ease-out

- [ ] **21.2** Animate bubble exit
  - Fade out
  - Scale down
  - Duration: 200ms

- [ ] **21.3** Smooth position changes
  - Interpolate between old/new positions
  - Use easing function
  - Handle rapid changes

- [ ] **21.4** Add pulse effect for new events
  - Expand from center
  - Fade out
  - Color: agent color

**Acceptance Criteria:**

- ✅ Animations smooth (no jank)
- ✅ Entrance/exit polished
- ✅ New event pulse noticeable

**Files Modified:**

- `apps/client/src/utils/swimLaneRenderer.ts`

---

### 22. Zoom & Pan Controls

- [ ] **22.1** Add zoom controls
  - Zoom in/out buttons
  - Mouse wheel zoom
  - Pinch zoom (touch devices)
  - Zoom range: 0.5x to 5x

- [ ] **22.2** Add pan controls
  - Click and drag to pan
  - Touch swipe to pan
  - Show viewport indicator

- [ ] **22.3** Add minimap (optional)
  - Overview of entire timeline
  - Show current viewport
  - Click to jump to position

**Acceptance Criteria:**

- ✅ Zoom works smoothly
- ✅ Pan works smoothly
- ✅ Controls intuitive

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`
- `apps/client/src/utils/swimLaneRenderer.ts`

---

### 23. Export Functionality

- [ ] **23.1** Export swim lane as image
  - Capture canvas as PNG
  - Include full timeline (not just viewport)
  - Download to user's computer

- [ ] **23.2** Export events as CSV
  - Include all visible events
  - Columns: timestamp, agent, event type, tool, session
  - Download to user's computer

- [ ] **23.3** Export events as JSON
  - Include full event payload
  - Pretty-printed
  - Download to user's computer

**Acceptance Criteria:**

- ✅ Export options available
- ✅ Exported data correct
- ✅ File downloads successfully

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`
- `apps/client/src/utils/export.ts` (new)

---

### 24. Keyboard Shortcuts

- [ ] **24.1** Add global shortcuts
  - `Space` - Pause/resume auto-scroll
  - `C` - Clear events
  - `F` - Toggle filters
  - `T` - Toggle theme manager
  - `?` - Show help overlay

- [ ] **24.2** Add swim lane shortcuts
  - `+` / `-` - Zoom in/out
  - Arrow keys - Pan timeline
  - `R` - Reset zoom/pan
  - `E` - Export current view

- [ ] **24.3** Add help overlay
  - List all shortcuts
  - Show/hide with `?` key
  - Searchable
  - Categorized

**Acceptance Criteria:**

- ✅ Shortcuts work as expected
- ✅ Help overlay accessible
- ✅ Intuitive key choices

**Files Created:**

- `apps/client/src/composables/useKeyboardShortcuts.ts`
- `apps/client/src/components/KeyboardShortcutsHelp.vue`

---

### 25. Accessibility Improvements

- [ ] **25.1** Add ARIA labels
  - Label canvas elements
  - Describe what each swim lane shows
  - Add role="img" to canvas

- [ ] **25.2** Add keyboard navigation
  - Tab through event bubbles
  - Enter to open event details
  - Escape to close modals

- [ ] **25.3** Add screen reader support
  - Announce new events
  - Describe swim lane state
  - Provide text alternatives

- [ ] **25.4** Improve color contrast
  - Ensure WCAG AA compliance
  - Test with color blindness simulators
  - Add high contrast theme option

**Acceptance Criteria:**

- ✅ WCAG AA compliant
- ✅ Keyboard navigation works
- ✅ Screen reader friendly

**Files Modified:**

- `apps/client/src/components/AgentSwimLane.vue`
- `apps/client/src/utils/swimLaneRenderer.ts`

---

## 📝 Testing Checklist

### Unit Tests

- [ ] Test swimLaneRenderer.ts functions
- [ ] Test useSwimLaneEvents composable
- [ ] Test event validation logic
- [ ] Test session mapping cleanup

### Integration Tests

- [ ] Test WebSocket event flow
- [ ] Test file watching and ingestion
- [ ] Test event bubble rendering
- [ ] Test time range changes

### E2E Tests

- [ ] Test full user flow (connect → view events → interact)
- [ ] Test with mock event stream
- [ ] Test with real Claude Code session

### Performance Tests

- [ ] Benchmark with 100 events
- [ ] Benchmark with 500 events
- [ ] Benchmark with 1000 events
- [ ] Measure memory usage over time

---

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] All critical tasks completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped

### Deployment

- [ ] Build client: `cd apps/client && bun run build`
- [ ] Test production build locally
- [ ] Deploy server updates
- [ ] Deploy client updates
- [ ] Verify deployment successful

### Post-deployment

- [ ] Monitor for errors
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Create follow-up issues

---

## 📊 Progress Tracking

### Sprint 1: Critical Fixes (Week 1)

**Focus:** Data collection issues + Swim lane architecture

- Tasks 1-6 (Data collection + Core architecture)
- Goal: Events capturing correctly, new swim lane rendering

### Sprint 2: Swim Lane Implementation (Week 2)

**Focus:** Event bubbles + Layout algorithm

- Tasks 7-10 (Visual design + Interaction)
- Goal: Fully functional swim lanes matching design

### Sprint 3: Integration & Testing (Week 3)

**Focus:** Integration + Testing + Documentation

- Tasks 11-13 (Timeline + Testing + Migration)
- Goal: Production-ready implementation

### Sprint 4: Reliability & Polish (Week 4+)

**Focus:** Medium and low priority items

- Tasks 14-25 (Performance + Polish)
- Goal: Polished, performant, production-grade

---

## 🔗 Related Documents

- [README.md](../README.md) - System overview
- [SETUP.md](../SETUP.md) - Installation guide
- [SKILL.md](../SKILL.md) - Skill documentation
- [Original Review Report](./REVIEW_REPORT_2025-11-16.md) - Detailed findings

---

## 📧 Contact & Support

For questions or issues with this plan:

- Review original report: `docs/REVIEW_REPORT_2025-11-16.md`
- Check GitHub issues
- Update this plan as work progresses

---

**Last Updated:** 2025-11-16
**Next Review:** TBD (after Sprint 1 completion)
