# Feature: Hook System

## Context
19 hooks across 14 CC events manage session lifecycle, security enforcement, TDD discipline, quality checks, logging, tab titles, subagent tracking, context compaction, permission denial handling, stop failures, task creation, config tracking, and prompt-injection defense on external-content tools (WebFetch/WebSearch). Each hook is individually tested — these scenarios cover cross-hook behavior and edge cases.

## Scenarios

### Scenario: Session start loads CORE context
- **Given** a fresh Claude Code session (not a subagent)
- **When** SessionStart hook fires
- **Then** stdout contains CORE SKILL.md wrapped in `<system-reminder>`
- **And** terminal tab title is set to "{DA} Ready"
- **Priority:** critical

### Scenario: Session start skips for subagents
- **Given** a session with `CLAUDE_AGENT_TYPE` env var set
- **When** SessionStart hook fires
- **Then** hook exits immediately with no output
- **Priority:** critical

### Scenario: Session start debounces duplicate events
- **Given** SessionStart fired less than 2 seconds ago (lockfile exists)
- **When** SessionStart fires again
- **Then** second invocation exits without loading context
- **Priority:** important

### Scenario: Stale TDD state cleaned on session start
- **Given** a tdd-mode.json exists from a crashed previous session (different sessionId, expired TTL)
- **When** a new session starts
- **Then** the stale state file is deleted
- **And** no TDD enforcement is active in the new session
- **Priority:** critical

### Scenario: Security hook blocks destructive commands
- **Given** a Bash tool call with `rm -rf /`
- **When** PreToolUse:Bash fires
- **Then** hook outputs `permissionDecision: "deny"`
- **And** the command is logged to security-checks.jsonl
- **Priority:** critical

### Scenario: TDD enforcement blocks source edits in RED phase
- **Given** TDD mode is active with phase RED
- **When** agent attempts to Write a `.ts` source file (not a test file)
- **Then** hook outputs `permissionDecision: "deny"` with reason containing "RED"
- **Priority:** critical

### Scenario: TDD enforcement allows test edits in RED phase
- **Given** TDD mode is active with phase RED
- **When** agent attempts to Write a `.test.ts` file
- **Then** hook allows the operation (no deny output)
- **Priority:** critical

### Scenario: Post-tool-use logs all tool calls
- **Given** any tool call completes
- **When** PostToolUse hook fires
- **Then** tool name, duration, and session ID are appended to tool-usage.jsonl
- **Priority:** important

### Scenario: Stop hook extracts checkpoint
- **Given** a session ends (Stop event)
- **When** stop-hook fires
- **Then** conversation checkpoint is logged
- **And** terminal tab title is cleared
- **Priority:** important

### Scenario: Config change triggers tracking
- **Given** settings.json is modified
- **When** ConfigChange hook fires
- **Then** the change is logged to config-changes.jsonl
- **Priority:** nice-to-have

## Out of Scope
- Testing Claude Code's hook execution engine itself
- Testing Bun runtime behavior
- Network-dependent hook behavior

## Acceptance Criteria
- [ ] All critical scenarios pass
- [ ] No regressions in existing 1511 tests
- [ ] Cross-hook integration test covers session lifecycle
