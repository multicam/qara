# Agent Observability System Review Report

**Date:** 2025-11-16
**Reviewer:** Claude (Sonnet 4.5)
**Status:** Complete

---

## 🎯 Executive Summary

Comprehensive review of the agent-observability system covering recent changes, data collection
mechanisms, event reporting, and visualization code (swim lanes). System is functional with good
architecture, but identified critical gaps requiring immediate attention.

**Key Findings:**

- ✅ **Data Collection:** Working pipeline with validation
- ⚠️  **Event Capture:** No events recorded Nov 14-16 (requires investigation)
- ❌ **Swim Lanes:** Architectural mismatch - uses bar charts instead of event bubbles
- ⚠️  **Session Mapping:** Unbounded growth risk
- ⚠️  **Configuration:** Hardcoded agent defaults

---

## 📋 Review Scope

This review covered:

1. Recent git changes (commits fe1824f, ce2a1f0, da18450)
2. Data collection pipeline (capture-all-events.ts → file-ingest.ts → WebSocket)
3. Event reporting mechanisms
4. Visualization code (swim lanes)
5. Comparison with reference design

---

## 🔍 Recent Changes Analysis

### Commit: fe1824f - "made observability work fixed tokens and costs"

**Date:** Nov 13, 2025

**Changes:**

- ✅ Enhanced logging throughout file-ingest.ts
- ✅ Added file polling mechanism (5s interval) for missing files
- ✅ Improved console output with emojis
- ✅ Fixed file watching initialization flow
- ✅ Added detailed event parsing logs

**Assessment:** Good improvements for debuggability and reliability.

### Commit: ce2a1f0 - "update port references from 3001 to 4000"

**Date:** Nov 16, 2025

**Changes:**

- ✅ Updated documentation (README.md, SETUP.md, SKILL.md)
- ✅ Changed port from 3001 → 4000

**Assessment:** Documentation now accurate.

### Commit: da18450 - "update timezone references from PST to AEDT"

**Changes:**

- ✅ Switched from PST to AEDT (Australia/Sydney)
- ✅ Added event validation

**Assessment:** Proper timezone handling implemented.

---

## ⚡ Data Collection & Reporting Analysis

### ✅ Strengths

**1. Hook System (capture-all-events.ts)**

- Captures all Claude Code hook events
- Comprehensive event validation
- Multiple agent detection methods:
  - Task tool's `subagent_type` parameter
  - `CLAUDE_CODE_AGENT` environment variable
  - Payload `agent_type` field
  - CWD path extraction (`/agents/designer/`)
  - Session mapping file persistence
- AEDT timezone support with Intl.DateTimeFormat
- JSONL format (human-readable, grep-able)
- Daily file rotation
- Silent failure (doesn't block Claude Code)

**2. Server File Ingestion (file-ingest.ts)**

- In-memory buffer (1000 events)
- File watching with fs.watch()
- Incremental reading with position tracking
- Event validation before buffering
- Automatic file polling when files don't exist
- WebSocket broadcasting
- Auto-incrementing event IDs

**3. WebSocket Server (index.ts)**

- Bun server on port 4000
- CORS enabled for development
- Initial event batch (50 events) on connection
- Real-time broadcasting
- Client tracking
- REST endpoints for filters and recent events

### ⚠️  Critical Gaps

**1. Missing Events (Nov 14-16)**

```bash
# Files exist:
2025-11-12_all-events.jsonl (589KB)
2025-11-13_all-events.jsonl (675KB)

# Missing:
2025-11-14_all-events.jsonl
2025-11-15_all-events.jsonl
2025-11-16_all-events.jsonl
```

**Possible Causes:**

- Hooks not configured in settings.json
- Claude Code not running on those days
- Hook execution failures (no logging to verify)
- Permission issues

**Required Action:** Investigate immediately (see Improvement Plan task 1)

**2. Session Mapping File Growth**

```typescript
// ~/.claude/agent-sessions.json grows unbounded
// No cleanup mechanism
// No size limit
// Potential for corruption with concurrent writes
```

**Risk:** File can grow very large over time, slowing down reads/writes.

**Required Action:** Implement cleanup (see Improvement Plan task 3)

**3. Hardcoded Agent Name**

```typescript
// Lines with hardcoded 'qara':
// capture-all-events.ts:91
return mappings[sessionId] || 'qara';

// capture-all-events.ts:97
return 'qara';

// capture-all-events.ts:182
agentName = 'qara';
setAgentForSession(sessionId, 'qara');
```

**Issue:** Not configurable for other users.

**Required Action:** Use environment variable (see Improvement Plan task 2)

**4. Agent Detection Fragility**

Five fallback mechanisms suggest uncertainty in detection logic:

1. Task tool subagent_type
2. Stop/SubagentStop events reset to 'qara'
3. CLAUDE_CODE_AGENT env variable
4. Payload agent_type field
5. CWD path extraction

**Issue:** Complex logic, multiple paths, hardcoded defaults.

**5. File Watching Limitations**

```typescript
// Issues with fs.watch():
// - Platform-dependent behavior
// - Can miss rapid writes
// - No handling of file truncation
// - 5-second polling wasteful
```

**Required Action:** Use chokidar library (see Improvement Plan task 14)

**6. In-Memory Buffer Limits**

```typescript
const MAX_EVENTS = 1000;
```

**Trade-offs:**

- ✅ Good: Memory efficient
- ⚠️  Problem: Loses older events
- ⚠️  Problem: Clients only get 50 events on reconnect
- ❌ Missing: No historical data endpoint

**Required Action:** Add history API (see Improvement Plan task 15)

**7. Partial Event Validation**

Validates structure but not:

- Payload schema
- Event type whitelist
- Timestamp sanity
- Session ID format
- Source app name validity

**Required Action:** Enhanced validation (see Improvement Plan task 4)

---

## 🎨 Swim Lane Visualization - Critical Finding

### ❌ Architectural Mismatch

**Current Implementation: Bar Chart Approach**

The existing swim lanes aggregate events into time buckets and display vertical bars representing
event counts.

```typescript
// chartRenderer.ts:149-331
dataPoints.forEach((point, index) => {
  const barHeight = (point.count / maxValue) * chartArea.height;
  // Draws vertical BAR with height = event count
});
```

**Visual Output:**

- Vertical bars showing activity levels
- Icons on bars showing event types
- Aggregated counts per time bucket
- ❌ Individual events NOT visible
- ❌ No chronological event nodes

**Desired Implementation: True Swim Lane (from screenshot)**

Reference screenshot shows individual event bubbles positioned chronologically:

```
[claude-researcher ══════════════════════════════════════]
                    [bubble]    [bubble]      [bubble]
                    gemini-r    gemini-r      gemini-r
                    Pre-Tool    Pre-Tool      Post-Tool
                    Task        Bash          Read
                    5k111       5k111         5k111
```

**Visual Structure:**

- Individual event bubbles/nodes
- Agent name in colored badge
- Tool badges (Pre-Tool, Bash, etc.)
- Session ID (truncated)
- Positioned by exact timestamp
- Multiple events visible simultaneously

### Detailed Comparison

| Aspect | Current (Bar Chart) | Desired (Swim Lane) |
|--------|-------------------|---------------------|
| Data Aggregation | ✅ Groups into buckets | ❌ Individual events |
| Visual Element | Vertical bars | Rounded pill bubbles |
| Positioning | By bucket index | By exact timestamp |
| Multiple Events | Taller bar | Multiple nodes |
| Event Details | Icons + count | Full info per node |
| Layout | Vertical height | Horizontal position |

### Why This Matters

**Current approach:**

- Good for showing activity patterns
- Good for seeing event density
- ❌ Bad for seeing individual events
- ❌ Bad for debugging specific issues
- ❌ Doesn't match reference design

**Desired approach:**

- ✅ See every individual event
- ✅ Understand event chronology
- ✅ Identify specific tool calls
- ✅ Track agent behavior over time
- ✅ Matches reference design

### Required Changes

**Complete redesign needed:**

1. **Data structure:** Remove aggregation, keep individual events
2. **Rendering:** Draw rounded pill bubbles, not bars
3. **Positioning:** Calculate X from timestamp, not bucket
4. **Layout:** Handle overlapping events with vertical stacking
5. **Interaction:** Click bubbles for details

See Improvement Plan tasks 5-13 for detailed implementation roadmap.

---

## 🔧 Component Analysis

### capture-all-events.ts Hook

**Purpose:** Capture all Claude Code events to JSONL files

**Strengths:**

- ✅ Comprehensive event capture
- ✅ Validation before writing
- ✅ Multiple agent detection methods
- ✅ Silent failure (doesn't block Claude Code)
- ✅ Executable permissions confirmed

**Issues:**

- ⚠️  Hardcoded 'qara' agent name (3 locations)
- ⚠️  Session mapping file grows unbounded
- ⚠️  No logging for debugging hook issues

**Location:** `/home/jean-marc/.claude/hooks/capture-all-events.ts`

### file-ingest.ts Server

**Purpose:** Watch JSONL files and stream events via WebSocket

**Strengths:**

- ✅ In-memory buffer (1000 events)
- ✅ Incremental file reading
- ✅ Event validation
- ✅ File polling when missing
- ✅ Good logging

**Issues:**

- ⚠️  fs.watch() platform-dependent
- ⚠️  5-second polling wasteful
- ⚠️  No historical data access
- ⚠️  Watches single file (not directory)

**Location:** `.claude/skills/agent-observability/apps/server/src/file-ingest.ts`

### AgentSwimLane.vue Component

**Purpose:** Display agent activity timeline

**Strengths:**

- ✅ FPS limiting (30 FPS)
- ✅ Resize observer
- ✅ Event deduplication
- ✅ Performance optimized
- ✅ Theme-aware

**Issues:**

- ❌ Uses bar chart (not event bubbles)
- ⚠️  Aggregates events (loses individuality)
- ⚠️  Time labels may overlap
- ⚠️  Tooltip positioning issues
- ⚠️  Agent name parsing assumptions

**Location:** `.claude/skills/agent-observability/apps/client/src/components/AgentSwimLane.vue`

### chartRenderer.ts Renderer

**Purpose:** Draw charts on canvas

**Strengths:**

- ✅ HiDPI support
- ✅ Proper canvas scaling
- ✅ Lucide icon rendering
- ✅ Event type colors
- ✅ Gradient backgrounds

**Issues:**

- ❌ Designed for bar charts (not swim lanes)
- ⚠️  Complex icon drawing code
- ⚠️  Label staggering may not work
- ⚠️  No bubble rendering support

**Location:** `.claude/skills/agent-observability/apps/client/src/utils/chartRenderer.ts`

---

## 📊 System Health

### Overall Assessment

| Component | Status | Severity |
|-----------|--------|----------|
| Event Capture | ⚠️  Partial | HIGH |
| File Watching | ✅ Working | MEDIUM |
| WebSocket Streaming | ✅ Working | LOW |
| Event Validation | ✅ Working | LOW |
| Swim Lane Rendering | ❌ Wrong Design | HIGH |
| Agent Detection | ⚠️  Fragile | MEDIUM |
| Documentation | ✅ Good | LOW |

### Priority Issues

**🔴 Critical (Fix Immediately)**

1. Missing events (Nov 14-16) - investigate root cause
2. Swim lane redesign - implement event bubbles
3. Hardcoded agent name - make configurable
4. Session mapping growth - implement cleanup

**🟡 Medium (Fix Soon)**

5. File watching reliability - use chokidar
6. Historical data access - add API endpoint
7. Error boundaries - prevent crashes
8. Tooltip positioning - fix overflow

**🟢 Low (Future Enhancement)**

9. Event compression - reduce storage
10. Animation polish - smooth transitions
11. Zoom/pan controls - better navigation
12. Accessibility - WCAG compliance

---

## 🚀 Next Steps

1. **Read Improvement Plan:** See `docs/IMPROVEMENT_PLAN.md`
2. **Start Sprint 1:** Focus on critical data collection issues
3. **Prototype New Swim Lanes:** Build proof-of-concept
4. **Test Thoroughly:** Ensure no regressions
5. **Document Changes:** Update README and SETUP

---

## 📚 References

- **Improvement Plan:** `docs/IMPROVEMENT_PLAN.md`
- **README:** `README.md`
- **Setup Guide:** `SETUP.md`
- **Skill Documentation:** `SKILL.md`
- **Reference Screenshot:** `/home/jean-marc/Downloads/Screenshot_20251116_083011.png`

---

## 👤 Reviewer Notes

This review was conducted by analyzing:

- Git commit history and diffs
- Source code for all components
- Reference design screenshot
- Current system behavior
- Event file structure

Testing was limited to static analysis and file system inspection. No runtime testing was performed.

Recommendations are based on industry best practices, observed issues, and the reference design
provided by the user.

---

**Report Status:** Complete
**Next Review:** After Sprint 1 completion (estimated 1 week)
