# Development Guide - Agent Observability

**Last Updated:** 2025-11-16

---

## 🚀 Quick Start

### Prerequisites

- Bun runtime installed
- Node.js 18+ (for compatibility)
- Claude Code with hooks configured
- Git (for version control)

### Initial Setup

```bash
# 1. Navigate to agent-observability
cd ~/.claude/skills/agent-observability

# 2. Install dependencies
cd apps/server && bun install
cd ../client && bun install

# 3. Set environment variables
export PAI_DIR="$HOME/.claude"
export PAI_AGENT_NAME="your-agent-name"  # Optional, defaults to 'claude'

# 4. Start development servers
# Terminal 1 - Server
cd apps/server
bun run dev

# Terminal 2 - Client
cd apps/client
bun run dev

# 5. Open browser
open http://localhost:5173
```

---

## 📋 Working on the Improvement Plan

### Reading the Plan

1. **Open the plan:** `docs/IMPROVEMENT_PLAN.md`
2. **Find a task:** Look for unchecked `[ ]` items
3. **Check priority:** Focus on 🔴 Critical tasks first
4. **Read requirements:** Understand acceptance criteria
5. **Update status:** Change `[ ]` to `[x]` when complete

### Task Workflow

```bash
# 1. Create a branch for your task
git checkout -b feature/task-5-swimlane-renderer

# 2. Make your changes
# ... code changes ...

# 3. Test your changes
bun test                    # Run tests
bun run dev                 # Test in browser

# 4. Update the plan
# Edit docs/IMPROVEMENT_PLAN.md
# Change [ ] to [x] for completed items

# 5. Commit your changes
git add .
git commit -m "feat: implement SwimLaneRenderer (task 5.1-5.4)

- Created new SwimLaneRenderer class
- Implemented rounded rectangle helper
- Added timestamp-to-X positioning
- Added event bubble layout algorithm

Tasks completed: 5.1, 5.2, 5.3, 5.4"

# 6. Push and create PR (if using GitHub)
git push origin feature/task-5-swimlane-renderer
```

### Updating the Plan

**After completing a task:**

1. Open `docs/IMPROVEMENT_PLAN.md`
2. Find the task checkbox
3. Change `- [ ] **X.Y** Description` to `- [x] **X.Y** Description`
4. Update progress metrics at top
5. Commit the plan update:

```bash
git add docs/IMPROVEMENT_PLAN.md
git commit -m "docs: mark task 5.1-5.4 complete"
```

**Example:**

```markdown
Before:
- [ ] **5.1** Create new swim lane renderer
- [ ] **5.2** Implement rounded rectangle helper

After:
- [x] **5.1** Create new swim lane renderer
- [x] **5.2** Implement rounded rectangle helper
```

---

## 🏗️ Project Structure

```
.claude/skills/agent-observability/
├── apps/
│   ├── server/                     # Bun WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts           # Main server + WebSocket
│   │   │   ├── file-ingest.ts     # Event file watching
│   │   │   ├── types.ts           # TypeScript types
│   │   │   └── theme.ts           # Theme API
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/                     # Vue 3 frontend
│       ├── src/
│       │   ├── components/        # Vue components
│       │   │   ├── AgentSwimLane.vue           # Main swim lane component
│       │   │   ├── AgentSwimLaneContainer.vue  # Wrapper for multiple lanes
│       │   │   ├── EventTimeline.vue           # Event list view
│       │   │   └── LivePulseChart.vue          # Activity chart
│       │   ├── composables/       # Vue composables
│       │   │   ├── useAgentChartData.ts       # Data aggregation (OLD)
│       │   │   ├── useSwimLaneEvents.ts       # Event filtering (NEW - to create)
│       │   │   └── useWebSocket.ts            # WebSocket client
│       │   ├── utils/             # Utilities
│       │   │   ├── chartRenderer.ts           # Canvas rendering (OLD)
│       │   │   └── swimLaneRenderer.ts        # Bubble rendering (NEW - to create)
│       │   ├── App.vue            # Main app component
│       │   └── types.ts           # TypeScript types
│       ├── package.json
│       └── vite.config.ts
├── hooks/
│   └── capture-all-events.ts      # Claude Code hook (symlink to ~/.claude/hooks/)
├── docs/
│   ├── IMPROVEMENT_PLAN.md        # Main improvement plan
│   ├── REVIEW_REPORT_2025-11-16.md # Review findings
│   └── DEVELOPMENT_GUIDE.md       # This file
├── README.md
├── SETUP.md
└── SKILL.md
```

---

## 🎯 Current Sprint Focus

### Sprint 1: Critical Fixes (Week 1)

**Goals:**

1. Fix missing events issue (tasks 1.1-1.4)
2. Make agent name configurable (tasks 2.1-2.4)
3. Start swim lane redesign (tasks 5.1-5.4)

**Priority Order:**

1. Task 1: Event Capture Investigation
2. Task 2: Agent Name Configuration
3. Task 5: Core Architecture - Event Bubble Renderer

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests
cd apps/client
bun test

# Type checking
bun run typecheck

# Linting
bun run lint
```

### Manual Testing

**Test Event Capture:**

```bash
# 1. Trigger a Claude Code event (e.g., use Read tool)

# 2. Check event file
ls -la ~/.claude/history/raw-outputs/$(date +%Y-%m)/

# 3. View latest events
tail -5 ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
```

**Test WebSocket Connection:**

```bash
# 1. Start server
cd apps/server && bun run dev

# 2. Check WebSocket endpoint
curl http://localhost:4000/events/recent

# 3. Open browser console
# Should see WebSocket connection in Network tab
```

**Test Swim Lane Rendering:**

1. Open http://localhost:5173
2. Click agent name in event list
3. Should see swim lane appear
4. Check for:
   - Proper positioning
   - No overlaps
   - Correct colors
   - Smooth animations

---

## 🐛 Debugging

### Enable Debug Logging

**Server:**

```typescript
// apps/server/src/file-ingest.ts
// Uncomment console.log statements
console.log('📖 Reading from position', lastPosition);
```

**Client:**

```typescript
// apps/client/src/components/AgentSwimLane.vue
// Add debug logs in render()
console.log('Rendering', dataPoints.value.length, 'data points');
```

### Common Issues

**Issue: No events appearing**

```bash
# Check if hook is configured
cat ~/.claude/settings.json | grep capture-all-events

# Check if hook is executable
ls -la ~/.claude/hooks/capture-all-events.ts

# Test hook manually
echo '{"session_id":"test","tool_name":"Read"}' | \
  bun ~/.claude/hooks/capture-all-events.ts --event-type PreToolUse

# Check event file
cat ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
```

**Issue: WebSocket not connecting**

```bash
# Check if server is running
lsof -i :4000

# Check for errors in server logs
cd apps/server && bun run dev

# Check browser console for errors
# Open DevTools → Console
```

**Issue: Swim lanes not rendering**

- Check browser console for errors
- Verify canvas element is present in DOM
- Check if events are being received
- Verify time range is correct
- Check if agent name format is valid ("app:session")

---

## 📝 Code Style

### TypeScript

- Use strict mode
- Prefer interfaces over types
- Use descriptive variable names
- Add JSDoc comments for public APIs

```typescript
/**
 * Render event bubbles on the swim lane
 * @param events - Array of events to render
 * @param timeRange - Time range in milliseconds
 */
renderEventBubbles(events: HookEvent[], timeRange: number): void {
  // Implementation
}
```

### Vue Components

- Use `<script setup>` syntax
- TypeScript for all scripts
- Scoped styles
- Props and emits with types

```vue
<script setup lang="ts">
import type { HookEvent } from '../types';

const props = defineProps<{
  events: HookEvent[];
}>();

const emit = defineEmits<{
  select: [event: HookEvent];
}>();
</script>
```

### Canvas Rendering

- Use devicePixelRatio for HiDPI
- Save/restore context state
- Use Path2D for complex shapes
- Optimize for 60fps

```typescript
// Save context before changes
ctx.save();

// Make changes
ctx.fillStyle = '#ff0000';
ctx.fillRect(x, y, width, height);

// Restore context
ctx.restore();
```

---

## 🔧 Useful Commands

### Development

```bash
# Start dev servers
cd apps/server && bun run dev    # Port 4000
cd apps/client && bun run dev    # Port 5173

# Build for production
cd apps/client && bun run build

# Preview production build
cd apps/client && bun run preview
```

### Debugging

```bash
# Watch event files
watch -n 1 'tail -5 ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl'

# Monitor file changes
fswatch ~/.claude/history/raw-outputs/ | while read f; do echo "$(date): $f"; done

# Check WebSocket messages (browser console)
# Network tab → WS → Messages
```

### File Management

```bash
# Check event file sizes
du -h ~/.claude/history/raw-outputs/**/*.jsonl

# Count events today
wc -l ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl

# Find events by type
grep '"hook_event_type":"PreToolUse"' ~/.claude/history/raw-outputs/**/*.jsonl | wc -l
```

---

## 📚 Resources

### Documentation

- [Improvement Plan](./IMPROVEMENT_PLAN.md) - Task checklist
- [Review Report](./REVIEW_REPORT_2025-11-16.md) - Detailed findings
- [README](../README.md) - System overview
- [SETUP](../SETUP.md) - Installation guide

### External Resources

- [Bun Documentation](https://bun.sh/docs)
- [Vue 3 Documentation](https://vuejs.org/)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## 🤝 Contributing

### Before Starting

1. Read the Improvement Plan
2. Check if task is already assigned
3. Understand acceptance criteria
4. Ask questions if unclear

### While Working

1. Keep changes focused on one task
2. Write tests for new features
3. Update documentation
4. Test thoroughly
5. Update the plan when done

### After Completing

1. Mark task complete in plan
2. Commit with descriptive message
3. Update progress metrics
4. Move to next task

---

## ❓ FAQ

**Q: Which tasks should I start with?**

A: Start with 🔴 Critical priority tasks (1-13). Within that, focus on tasks 1-4 first.

**Q: Can I work on multiple tasks at once?**

A: It's better to complete one task fully before starting another. Update the plan as you go.

**Q: What if I get stuck?**

A: Check the Review Report for context. Look at related code. Ask for help if needed.

**Q: How do I test changes to the hook?**

A: Test manually first with echo | bun. Then test with real Claude Code session.

**Q: Should I delete the old chartRenderer code?**

A: No, keep it for now. We'll deprecate it after the new swim lanes are working.

**Q: How do I know if my swim lanes match the reference?**

A: Compare with the screenshot at `/home/jean-marc/Downloads/Screenshot_20251116_083011.png`

---

**Happy coding! 🚀**
