# Agent Lens Logging - Roadmap & Opportunities

> **Status:** Active | **Last Updated:** 2026-02-01 | **Version:** 1.0

This document tracks logging improvements for the Agent Lens server. It records completed work, current priorities, and future opportunities for making console logs more informative and useful.

---

## 📊 Quick Status

| Category | Completed | In Progress | Planned |
|----------|-----------|-------------|---------|
| **Level 1: Visual Polish** | ✅ 100% | - | - |
| **Level 2: Live Metrics** | ✅ 80% | - | 20% |
| **Level 3: Dashboards** | - | - | 100% |
| **Level 4: Interactive** | - | - | 100% |

---

## ✅ Completed (v1.0)

### Level 1: Visual Polish
- [x] **picocolors integration** - Zero-dependency terminal styling
- [x] **Event type colors** - Cyan (sessions), Magenta (tools), Green (user), Yellow (agents)
- [x] **ASCII art banner** - Startup banner with box-drawing characters
- [x] **Structured config display** - Configuration in aligned table format
- [x] **Log level icons** - ● ✓ ⚠ ✖ ○ for info/success/warn/error/debug

**Files:** `src/logger.ts`, `src/config.ts`, `src/index.ts`, `src/file-ingest.ts`

### Level 2: Live Metrics (Quick Wins)
- [x] **Real-time status line** - Updates every 500ms
  - Events count (`ev:N`)
  - Sessions count (`ses:N`)
  - Active agents (`ag:N`)
  - Memory usage (`mem:N.MB`)
  - Events per second (`eps:N`)
  - Uptime (`up:Ns`)
- [x] **Compact event format** - Single-line scannable output
  - Timestamp `[HH:MM:SS]`
  - Event type (color-coded, padded)
  - Agent icon + name
  - Tool icon + name
  - Result summary (lines/results/edits)
- [x] **Tool icons** - 📖 Read, ✏️ Edit, 🔍 Grep, 📁 Glob, 🚀 Task, ⌨️ Bash, 🌐 WebSearch, 📝 Write, ❓ AskUserQuestion, ⚡ Skill, 📋 EnterPlanMode, ✅ ExitPlanMode
- [x] **Agent icons** - 🔍 Explore, 🔧 engineer, 🎨 designer, 📚 researcher, 📊 codebase-analyzer, 📍 codebase-locator, 🌐 web-search-researcher, 🔬 claude-researcher, ♊ gemini-researcher, 🧠 perplexity-researcher, ⚙️ general-purpose, 🤖 zai-coder, 🔎 zai-researcher, 💭 thoughts-analyzer
- [x] **Session summary** - Graceful shutdown displays totals
- [x] **Tool result summaries**
  - Read: `→ N lines`
  - Grep: `→ N results`
  - Edit: `→ +N -N`

**Example Output:**
```
[14:23:45] PreToolUse     🔍 Explore      🔍 Grep     "async.*fetch"
[14:23:47] PostToolUse    🔍 Explore      🔍 Grep     → 15 results
[14:23:52] PreToolUse     🔍 Explore      📖 Read     src/api.ts
[14:23:53] PostToolUse    🔍 Explore      📖 Read     → 156 lines
```

---

## 🚧 Recommended Next Steps

### Immediate (Low Effort, High Impact)

#### 1. Event Type Filter Toggle
**Effort:** 15 min | **Impact:** High

Add keyboard toggles to filter event types in real-time:
- Press `t` to toggle tool events (PreToolUse/PostToolUse)
- Press `s` to toggle session events
- Press `a` to toggle agent events
- Press `e` to toggle errors only
- Press `q` to quit

**Implementation:**
```typescript
// Use readline or keypress library
import readline from 'readline';
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.name === 't') toggleFilter('tools');
  if (key.name === 'q') process.exit(0);
});
```

#### 2. Highlight Suspicious Patterns
**Effort:** 20 min | **Impact:** Medium

Flag potentially problematic events:
- Long-running tools (>30s)
- Repeated errors (same error 3+ times)
- High-volume agents (>100 events/min)
- Circular references (already detected, not highlighted)

**Example:**
```
⚡ HIGHLIGHT: Long-running tool: Read (45s)
⚡ HIGHLIGHT: Repeated error: "ENOENT" (4 times)
⚡ HIGHLIGHT: High-volume agent: Explore (128 events/min)
```

#### 3. Error Aggregation
**Effort:** 30 min | **Impact:** High

Track and display error/warning counts by type:

**Example display (every 30 events):**
```
┌─────────────────────────────────────────┐
│  Errors this session: 3                 │
├─────────────────────────────────────────┤
│  ⚠️  Invalid event: source_app    (2)   │
│  ⚠️  Circular reference          (1)   │
└─────────────────────────────────────────┘
```

---

## 📋 Medium-Term Opportunities

### 4. Tool Usage Statistics
**Effort:** 1 hour | **Impact:** High

Show real-time tool usage rankings:

```
Top Tools (this session):
  📖 Read           42 calls  ████████████████████
  🔍 Grep           18 calls  ████████
  ✏️ Edit            7 calls  ███
  🚀 Task           12 calls  ██████
  ⌨️ Bash            5 calls  ██
```

**Implementation:**
- Track tool call counts in `StatusLine` class
- Add ASCII bar graph rendering
- Update with status line (every 5s)

### 5. Agent Activity Dashboard
**Effort:** 1.5 hours | **Impact:** High

Display currently active agents with their state:

```
╔═════════════════════════════════════════════════════════╗
║  Active Agents                                           ║
╠═════════════════════════════════════════════════════════╣
║  🔍 Explore      │ 3 tools │ 12 events │ running 45s   ║
║  🔧 engineer     │ 1 tool  │  4 events │ running 12s   ║
║  📚 researcher   │ 2 tools │  8 events │ running 23s   ║
╚═════════════════════════════════════════════════════════╝
```

**Implementation:**
- Track agent start/stop via `Task`/`Stop` events
- Track tool counts per agent
- Display agents active in last 60s

### 6. Timeline Visualization
**Effort:** 2 hours | **Impact:** Medium

Show events in a compact horizontal timeline:

```
00:00 ═══════════════════════════════════════════► SessionStart
00:01 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━► PreToolUse:Grep
00:02 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━► PostToolUse:Grep
00:05 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━► PreToolUse:Read
00:06 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━► PostToolUse:Read
```

**Implementation:**
- Calculate relative timestamps
- Use Unicode box-drawing for lines
- Color by event type

---

## 🚀 Long-Term / Advanced

### 7. Interactive Terminal UI (blessed)
**Effort:** 4+ hours | **Impact:** Very High

Full terminal dashboard with multiple panels:

```
┌──────────────────────────────────────────────────────────────┐
│  🔮 Agent Lens v2.0           [ev:847] [ses:3] [eps:2.3]     │
├─────────────────────┬────────────────────────────────────────┤
│  Active Agents      │  Event Stream (last 20)                │
│  ├─ 🔍 Explore 45s  │  [14:23:45] PreToolUse  Grep           │
│  ├─ 🔧 engineer 12s │  [14:23:47] PostToolUse → 15 results   │
│  └─ 📚 research 23s │  [14:23:52] PreToolUse  Read           │
│                     │  [14:23:53] PostToolUse → 156 lines   │
├─────────────────────┼────────────────────────────────────────┤
│  Top Tools          │  Tool Usage Graph                      │
│  📖 Read  42        │  Read    ████████████████████ 42       │
│  🔍 Grep  18        │  Grep    ████████             18       │
│  🚀 Task  12        │  Task    ██████               12       │
├─────────────────────┴────────────────────────────────────────┤
│  Press [q] to quit | [t] toggle tools | [s] toggle sessions │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:** Use `blessed` or `blessed-contrib`

### 8. Hierarchy/Tree View
**Effort:** 2 hours | **Impact:** Medium

Show parent-child event relationships:

```
SessionStart: "explore codebase"
├─► Task(launch: Explore)
│  ├─► PreToolUse: Grep "pattern"
│  └─► PostToolUse: Grep → 15 results
├─► Task(launch: codebase-analyzer)
│  ├─► PreToolUse: Read src/index.ts
│  └─► PostToolUse: Read → 234 lines
└─► Stop
```

### 9. Persistent Log Files
**Effort:** 1 hour | **Impact:** Medium

Write formatted logs to file for later analysis:
- JSONL format for machine parsing
- Pretty-printed text for human reading
- Daily rotation
- Configurable retention

---

## 🎯 Priority Matrix

| Feature | Effort | Impact | Priority | Status |
|---------|--------|--------|----------|--------|
| Status line | ✅ Done | High | ✅ Done | ✅ Complete |
| Compact events | ✅ Done | High | ✅ Done | ✅ Complete |
| Filter toggles | Low | High | 🔴 P0 | Planned |
| Error aggregation | Low | High | 🔴 P0 | Planned |
| Tool stats | Medium | High | 🟡 P1 | Planned |
| Agent dashboard | Medium | High | 🟡 P1 | Planned |
| Timeline | Medium | Medium | 🟢 P2 | Planned |
| Tree view | Medium | Medium | 🟢 P2 | Planned |
| Full TUI | High | Very High | 🟢 P2 | Planned |
| Persisted logs | Low | Medium | 🟢 P2 | Planned |
| Highlight patterns | Low | Medium | 🟢 P2 | Planned |

**Legend:** 🔴 P0 = Do next, 🟡 P1 = Soon, 🟢 P2 = Later

---

## 📁 Files Changed

| File | Changes | Date |
|------|---------|------|
| `src/logger.ts` | Created - All logging functionality | 2026-02-01 |
| `src/index.ts` | Updated - Use compact format, graceful shutdown | 2026-02-01 |
| `src/file-ingest.ts` | Updated - Use new logger methods | 2026-02-01 |
| `src/config.ts` | Updated - Use new config display | 2026-02-01 |
| `package.json` | Added picocolors@1.1.1 | 2026-02-01 |
| `LOGGING_ROADMAP.md` | Created - This document | 2026-02-01 |

---

## 🔧 Technical Notes

### Dependencies
- `picocolors@1.1.1` - Zero-dependency terminal coloring

### Architecture
- `StatusLine` class tracks metrics and renders status bar
- `log` object provides typed logging methods
- Status updates via `setInterval` every 500ms
- Events tracked via `statusLine.trackEvent(event)`

### Performance
- Minimal overhead: ~1-2ms per event
- Status line: single `process.stdout.write()` (no newline)
- Memory: O(events) for last 60s (EPS calculation only)

---

## 📝 Changelog

### v1.0 - 2026-02-01
- ✅ Initial visual polish (colors, icons, boxes)
- ✅ Real-time status line (ev/ses/ag/mem/eps/up)
- ✅ Compact event format with timestamps
- ✅ Tool and agent icons
- ✅ Session summary on shutdown
- ✅ Tool result summaries

### v1.1 - TBD
- [ ] Filter toggles (keyboard shortcuts)
- [ ] Error aggregation display
- [ ] Tool usage statistics
- [ ] Agent activity dashboard

---

## 🔗 References

- [picocolors](https://github.com/alexeyraspopov/picocolors) - Terminal styling
- [blessed](https://github.com/chjj/blessed) - Terminal UI library
- [blessed-contrib](https://github.com/yaronn/blessed-contrib) - Dashboard widgets
- [cli-spinners](https://github.com/sindresorhus/cli-spinners) - Spinner animations
- [ora](https://github.com/sindresorhus/ora) - Elegant terminal spinners
