# Claude Code Hooks

Claude Code hooks in `.claude/hooks/`. All hooks are Bun TypeScript.

## Active Hooks (13 scripts, 10 CC events)

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start.ts` | SessionStart | Loads SKILL.md, session hints, crash recovery, sets tab title |
| `update-tab-titles.ts` | UserPromptSubmit | Sets processing indicator |
| `keyword-router.ts` | UserPromptSubmit | Detects mode keywords, injects skill, activates/deactivates modes |
| `rtk-rewrite.sh` | PreToolUse:Bash | RTK token reduction (60-90% savings) |
| `pre-tool-use-security.ts` | PreToolUse:Bash | Detects dangerous patterns, blocks/approves |
| `pre-tool-use-tdd.ts` | PreToolUse:Write,Edit,MultiEdit | TDD discipline enforcement (RED/GREEN/REFACTOR) |
| `post-tool-use.ts` | PostToolUse | Logs tool execution results for audit trail |
| `post-tool-failure.ts` | PostToolUseFailure | Tracks consecutive failures, escalates at 5+ |
| `subagent-start.ts` | SubagentStart | Logs delegation, increments activeSubagents in mode state |
| `subagent-stop.ts` | SubagentStop | Logs completion, decrements activeSubagents, records deliverables |
| `pre-compact.ts` | PreCompact | Saves checkpoint before context compression |
| `stop-hook.ts` | Stop | Tab title, checkpoint, mode continuation + memory injection |
| `config-change.ts` | ConfigChange | Logs settings changes during a session |

## Shared Utilities

Located in `.claude/hooks/lib/`:

| Utility | Purpose |
|---------|---------|
| `pai-paths.ts` | PAI_DIR, SKILLS_DIR, STATE_DIR path resolution + ensureDir |
| `tab-titles.ts` | generateTabTitle, setTerminalTabTitle |
| `jsonl-utils.ts` | appendJsonl for structured logging |
| `datetime-utils.ts` | getISOTimestamp, getDateString |
| `tdd-state.ts` | TDD state machine (RED/GREEN/REFACTOR) |
| `trace-utils.ts` | classifyTopic for session traces |
| `mode-state.ts` | Execution mode lifecycle (drive/cruise/turbo) |
| `keyword-routes.json` | Declarative keyword-to-skill routing config |
| `working-memory.ts` | Session-scoped 4-file memory (learnings, decisions, issues, problems) |
| `compact-checkpoint.ts` | State snapshot before context compression |
| `prd-utils.ts` | PRD read/write, story tracking for Drive mode |
| `test-macros.ts` | Test helper macros |

## Hook Events Reference (10 of 25 CC events used)

- `SessionStart` - Session begins: loads CORE, hints, crash recovery
- `UserPromptSubmit` - User submits prompt: tab titles + keyword routing
- `PreToolUse` - Before tool execution: RTK rewrite, security check, TDD enforcement
- `PostToolUse` - After tool completes: telemetry logging
- `PostToolUseFailure` - Tool call failed: consecutive failure tracking
- `SubagentStart` - Subagent spawned: delegation tracking
- `SubagentStop` - Subagent completed: deliverable recording
- `PreCompact` - Before context compression: state checkpoint
- `Stop` - Agent stops: tab title, checkpoint, mode continuation
- `ConfigChange` - Settings modified during session
