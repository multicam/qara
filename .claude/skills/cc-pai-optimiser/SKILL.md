---
name: cc-pai-optimiser
context: fork
description: Review and optimize PAI (Personal AI Infrastructure) codebases as Claude Code evolves. Use when analyzing PAI repositories against 12-factor agent principles, checking for Claude Code feature compatibility, auditing context management patterns, or generating upgrade recommendations. Triggers on requests involving PAI optimization, Claude Code feature adoption, agent architecture review, or context engineering improvements.
---

# CC-PAI Optimizer (v2.1.12)

Review and optimize PAI codebases by tracking Claude Code evolution and applying 12-factor agent principles.

## Core Workflow

### 1. Gather Latest Claude Code Features

Before any optimization, fetch current CC capabilities from trusted sources:

```bash
# Check current version
claude --version

# Trusted sources
CC_SOURCES=(
  "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md"
  "https://github.com/anthropics/claude-code/releases"
  "https://docs.anthropic.com/en/docs/claude-code"
  "https://github.com/marckrenn/claude-code-changelog/blob/main/cc-prompt.md"
  "https://skills.sh/anthropics/skills/frontend-design"
)
```

Reference `references/cc-trusted-sources.md` for complete source list and update frequency recommendations.

### 1b. Gather Latest Z.AI/ZAI Features

Also track Z.AI model evolution:

```bash
# Trusted ZAI sources
ZAI_SOURCES=(
  "https://z.ai/model-api"
  "https://docs.z.ai/guides/llm"
  "https://docs.z.ai/guides/llm/glm-4.7"
  "https://docs.z.ai/guides/llm/glm-4-32b-0414-128k"
)
```

### 2. Load PAI Repository

```bash
# Discover PAI structure
ls -la "$PAI_DIR/.claude/"
```

### 3. Run Analysis Pipeline

Execute analysis in this order:

1. **Structure Analysis** - Directory layout and required files
2. **Skills System Audit** - SKILL.md format, context types, invocability
3. **Hooks Configuration** - settings.json hooks, lifecycle events
4. **Context Engineering Audit** - UFC patterns, progressive disclosure
5. **Delegation Patterns** - Multi-agent workflows
6. **12-Factor Compliance** - Agent principles audit
7. **Upgrade Plan Generation** - Prioritized recommendations

## Analysis Modules

### Structure Analysis

Expected PAI v2.x structure:

```
.claude/
├── context/           # Context files (CLAUDE.md)
├── skills/            # Skill definitions (replaces rules/)
│   └── */SKILL.md    # Each skill with frontmatter
├── agents/            # Agent configurations
├── commands/          # Reusable workflows
├── hooks/             # Hook scripts
├── state/             # State persistence
└── settings.json      # CC configuration with hooks
```

### Skills System Analysis

Check for proper SKILL.md format:

```yaml
---
name: skill-name
context: fork|same
description: What this skill does
---
```

Key checks:
- All skills have SKILL.md with frontmatter
- `context: fork` for isolated execution (subagent)
- `context: same` for main conversation
- references/, scripts/, workflows/ subdirectories

### Hooks Configuration (CC 2.1.x)

Hooks are now in settings.json:

```json
{
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "SessionStart": [...],
    "SessionEnd": [...],
    "UserPromptSubmit": [...],
    "Stop": [...],
    "SubagentStop": [...]
  }
}
```

### Feature Gap Analysis

Compare PAI implementation against CC capabilities:

| CC Feature | Min Version | Check Location | Optimization Signal |
|------------|-------------|----------------|---------------------|
| Subagents | 1.0.80 | `.claude/agents/` | Missing parallel execution |
| Checkpoints | 2.0.0 | `/rewind` usage | No rollback safety |
| Hooks | 2.1.0 | `settings.json` | Missing automation |
| Skills | 2.0.40 | `.claude/skills/` | No reusable capabilities |
| Plan Mode | 2.0.50 | Commands | Missing planning phase |
| Model routing | 2.1.0 | Task tool usage | No per-task model selection |
| Status line | 2.1.0 | `settings.json` | No custom status |
| Context % | 2.1.6 | Status line | Not using native percentage |
| additionalContext | 2.1.9 | PreToolUse hooks | No context injection to model |
| plansDirectory | 2.1.9 | `settings.json` | Using default plans location |
| Session ID | 2.1.9 | Skills | No session tracking in skills |
| ZAI integration | PAI-custom | `hooks/lib/llm/zai.ts` | No ZAI model routing |

### ZAI/Z.AI Model Integration Analysis

Check ZAI integration status:

| Component | Check Location | Optimization Signal |
|-----------|----------------|---------------------|
| ZAI client | `hooks/lib/llm/zai.ts` | Missing JWT auth, model selection |
| Model router | `hooks/lib/model-router.ts` | No ZAI task routing |
| zai-researcher | `agents/zai-researcher.md` | Not using GLM-4-32B for research |
| zai-coder | `agents/zai-coder.md` | Not leveraging thinking modes |
| CLI tool | `~/.local/bin/zai` | Missing model selection |

#### ZAI Model Availability (Jan 2026)

**Coding Plan ($3/mo):**
- `glm-4.7` - Flagship agentic coding (200K ctx, 128K output)
- `glm-4.7-flash` - Free tier general-purpose

**Pay-as-you-go:**
- `glm-4.7-flashx` - Mid-tier fast coding
- `glm-4-32b-0414-128k` - Research ($0.1/M tokens, 128K ctx)
- `glm-4.6v` - Vision/multimodal

### 12-Factor Compliance Check

Reference `references/12-factor-checklist.md` for complete audit criteria.

Key factors to validate:

1. **Factor 3 - Own Context Window**: Is context hydration explicit and controlled?
2. **Factor 8 - Own Control Flow**: Is agent loop logic in application code?
3. **Factor 10 - Small Focused Agents**: Are agents single-purpose?
4. **Factor 12 - Stateless Reducer**: Is state externalized?

## Output Format

Generate report as:

```markdown
# PAI Optimization Report

## Executive Summary
[1-2 sentence overall assessment]

## CC Feature Adoption
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|

## Skills System
[SKILL.md format compliance, context types]

## Hooks Configuration
[settings.json hooks audit]

## ZAI Integration Status
| Component | Status | Model(s) | Notes |
|-----------|--------|----------|-------|
| zai.ts client | ✅/❌ | glm-4.7 | JWT auth, model info |
| model-router.ts | ✅/❌ | Task routing | ZAI task types |
| zai-researcher | ✅/❌ | glm-4.7-flash | Research optimized |
| zai-coder | ✅/❌ | glm-4.7 | Thinking modes |
| CLI tool | ✅/❌ | All models | Model selection |

## External Skills Sync
| Skill | Upstream | Status |
|-------|----------|--------|
| frontend-design | skills.sh | ✅/❌ |

## 12-Factor Compliance
[Factor-by-factor status]

## Context Engineering
[UFC audit results]

## Recommended Upgrades
1. [High Priority] ...
2. [Medium Priority] ...

## Implementation Snippets
[Ready-to-use code for top recommendations]
```

## Quick Commands

### Full Audit
```bash
cd ${PAI_DIR}/skills/cc-pai-optimiser
bun run scripts/analyse-pai.js ${PAI_DIR}/..
```

### Version Check
```bash
cd ${PAI_DIR}/skills/cc-pai-optimiser
bun run scripts/cc-version-check.js ${PAI_DIR}/..
```

## Version Tracking

Track CC versions against PAI compatibility:

```javascript
// Key CC 2.1.x features
const CC_2_1_FEATURES = {
  // 2.1.0
  modelRouting: "2.1.0",      // Per-task model selection
  skillInvocation: "2.1.0",   // Skill tool
  backgroundTasks: "2.1.0",   // run_in_background
  taskResume: "2.1.0",        // Resume via agent ID
  statusLine: "2.1.0",        // Custom status line
  settingsJsonHooks: "2.1.0", // Hooks in settings.json
  webSearch: "2.1.0",         // Built-in WebSearch
  askUserQuestion: "2.1.0",   // Interactive questions
  // 2.1.3
  mergedSkillsCommands: "2.1.3", // Unified slash commands and skills
  releaseChannelToggle: "2.1.3", // stable/latest in /config
  enhancedDoctor: "2.1.3",       // /doctor detects unreachable rules
  extendedHookTimeout: "2.1.3",  // Hook timeout: 60s → 10 min
  // 2.1.4
  disableBackgroundTasks: "2.1.4", // CLAUDE_CODE_DISABLE_BACKGROUND_TASKS env var
  // 2.1.5
  tmpDirOverride: "2.1.5",     // CLAUDE_CODE_TMPDIR env var
  // 2.1.6
  configSearch: "2.1.6",       // Search in /config command
  statsDateFiltering: "2.1.6", // /stats date range filtering
  nestedSkillDiscovery: "2.1.6", // Auto-discovery from nested .claude/skills
  contextWindowPercentage: "2.1.6", // used_percentage in status line input
  // 2.1.7
  turnDurationToggle: "2.1.7", // showTurnDuration setting
  permissionFeedback: "2.1.7", // Feedback on permission prompts
  mcpToolSearchAuto: "2.1.7",  // Auto-defer MCP tools >10% context
  // 2.1.9
  additionalContext: "2.1.9",  // PreToolUse hooks return context to model
  plansDirectory: "2.1.9",     // Custom plan file location
  sessionIdSubstitution: "2.1.9", // ${CLAUDE_SESSION_ID} in skills
  mcpAutoThreshold: "2.1.9",   // auto:N syntax for MCP tool threshold
  // 2.1.10
  // (no new features - bug fixes only)
  // 2.1.11
  mcpConnectionFix: "2.1.11",  // Fixed excessive HTTP/SSE MCP reconnection
  // 2.1.12
  messageRenderingFix: "2.1.12", // Fixed message rendering bug
};
```

## External Skill Tracking

Ensure these skills are synchronized with upstream sources:

### Frontend Design Skill
**Source:** https://skills.sh/anthropics/skills/frontend-design
**Location:** `skills/frontend-design/SKILL.md`

Check for updates:
```bash
# Fetch latest from skills.sh
curl -s "https://skills.sh/anthropics/skills/frontend-design" | \
  grep -A 100 "SKILL.md"
```

### Z.AI Model Documentation
**Source:** https://docs.z.ai/guides/llm
**Location:** `hooks/lib/llm/zai.ts`, `agents/zai-*.md`

Check for model updates:
```bash
# Verify available models
source ~/.claude/.env && zai --help
```

## ZAI Version Tracking

```javascript
// Z.AI GLM Model Evolution
const ZAI_MODELS = {
  // GLM-4.7 Family (Dec 2025)
  "glm-4.7": {
    release: "2025-12-22",
    params: "355B total / 32B activated (MoE)",
    context: 200000,
    maxOutput: 128000,
    codingPlan: true,
    benchmarks: {
      swebench: "73.8%",
      livecodebench: "84.9%",
      terminalbench: "41%",
    },
    features: ["thinking-modes", "interleaved", "retention-based", "tool-invocation"],
  },
  "glm-4.7-flashx": {
    release: "2025-12-22",
    params: "~30B (MoE, lightweight)",
    context: 200000,
    maxOutput: 128000,
    codingPlan: false, // Requires pay-as-you-go
  },
  "glm-4.7-flash": {
    release: "2026-01-19",
    params: "~30B total / ~3B activated (MoE)",
    context: 200000,
    maxOutput: 128000,
    codingPlan: true, // Free tier
    bestFor: ["general-purpose", "chinese-writing", "translation", "long-text"],
  },
  // GLM-4 Foundation
  "glm-4-32b-0414-128k": {
    release: "2025-04-14",
    params: "32B",
    context: 128000,
    maxOutput: 16000,
    codingPlan: false, // $0.1/M tokens
    bestFor: ["qa-services", "information-extraction", "financial-analysis", "research"],
    webSearch: true,
    functionCalling: true,
  },
  "glm-4.6v": {
    release: "2025",
    params: "unknown",
    context: 8000,
    maxOutput: 4000,
    codingPlan: false,
    multimodal: true,
  },
};

// ZAI API Evolution
const ZAI_API_FEATURES = {
  // Authentication
  jwtAuth: "2024-01", // JWT token auth with {id}.{secret} format
  // Endpoints
  codingEndpoint: "2025-12", // /api/coding/paas/v4/chat/completions
  generalEndpoint: "2024-01", // /api/paas/v4/chat/completions
  // Features
  thinkingModes: "2025-12", // Interleaved, Retention-Based, Round-Level
  contextCaching: "2025-12", // Performance optimization
  structuredOutput: "2025-12", // JSON responses
  webSearchJina: "2025-04", // $0.01 per search via Jina AI
};
```

See `scripts/cc-version-check.js` for automated compatibility checking.
