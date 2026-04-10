# 12-Factor Agents Compliance Checklist

Source: https://github.com/humanlayer/12-factor-agents

## Factor 1: Natural Language to Tool Calls

- [ ] System converts natural language to structured tool calls
- [ ] Tool definitions have clear descriptions
- [ ] Schema validation on tool outputs

```bash
grep -r "tools\|functions\|schema" "$PAI_PATH" --include="*.json" --include="*.md"
```

**Signals:** missing tool schemas -> add; weak descriptions -> improve for LLM selection.

---

## Factor 2: Own Your Prompts

- [ ] Prompts in version-controlled files
- [ ] Prompts modifiable without code changes
- [ ] Prompt versioning/history

```bash
find "$PAI_PATH" -name "*.prompt" -o -name "*prompt*.md" -o -name "CLAUDE.md"
```

**Signals:** hardcoded prompts -> move to `context/`; inline instructions -> extract to CLAUDE.md.

---

## Factor 3: Own Your Context Window

- [ ] Context loading explicit and controlled
- [ ] Progressive disclosure (load only what's needed)
- [ ] Context files <500 lines
- [ ] Loading enforcement mechanism

```bash
find "$PAI_PATH" -name "CLAUDE.md" -exec wc -l {} \; | awk '{sum+=$1; if($1>500) print "Large:", $2} END {print "Total:", sum}'
find "$PAI_PATH/.claude/context" -type d | head -20
```

**Signals:** >500 lines -> split into `references/`; no enforcement -> add hook-based loading; flat -> implement UFC hierarchy.

---

## Factor 4: Tools Are Structured Outputs

- [ ] Tools defined with JSON schemas
- [ ] Tool output validated before use
- [ ] Tool failures handled gracefully

```bash
grep -r "tools\|schema" "$PAI_PATH/.claude" --include="*.json"
```

**Signals:** no schema -> add Zod/JSON Schema; unhandled errors -> try-catch wrappers; missing descriptions -> enhance metadata.

---

## Factor 5: Unify Execution State and Business State

- [ ] Agent state in a single location
- [ ] State inspectable during execution
- [ ] State serializable for pause/resume

```bash
grep -r "state\|context\|memory" "$PAI_PATH/.claude" --include="*.md"
```

**Signals:** scattered state -> consolidate to `working/`; in-memory only -> persist to files; opaque -> add logging.

---

## Factor 6: Launch/Pause/Resume with Simple APIs

- [ ] Agent pausable mid-execution
- [ ] Sessions resumable from checkpoints
- [ ] Clean API for lifecycle management

```bash
grep -r "checkpoint\|resume\|session" "$PAI_PATH" --include="*.md" --include="*.json"
```

**Signals:** no checkpoints -> enable CC checkpoint feature; manual resume -> use `/resume`; lost context -> implement session persistence.

---

## Factor 7: Contact Humans with Tool Calls

- [ ] Agent can request human input
- [ ] Human-in-the-loop points clearly defined
- [ ] Approval workflow for sensitive actions

```bash
grep -r "human\|approval\|confirm\|ask" "$PAI_PATH/.claude" --include="*.md"
```

**Signals:** no human contact -> add confirmation prompts; implicit approval -> make explicit with tools; missing escalation paths.

---

## Factor 8: Own Your Control Flow

- [ ] Agent loop in application code (not framework)
- [ ] Control flow customizable per-task
- [ ] Decision points explicit and logged

```bash
grep -r "loop\|step\|workflow" "$PAI_PATH/.claude/commands" --include="*.md"
```

**Signals:** framework-controlled -> extract to custom code; implicit flow -> document in `commands/`; no logging -> add decision logging.

---

## Factor 9: Compact Errors into Context Window

- [ ] Errors summarized before context insertion
- [ ] Error deduplication
- [ ] Errors include actionable information

```bash
grep -r "error\|catch\|fail" "$PAI_PATH/.claude" --include="*.md"
```

**Signals:** verbose errors -> summarize; repeated -> deduplicate; opaque -> include resolution hints.

---

## Factor 10: Small, Focused Agents

- [ ] Each agent single-purpose
- [ ] Agents <500 lines of configuration
- [ ] Agents composable for complex tasks

```bash
ls -la "$PAI_PATH/.claude/agents/" 2>/dev/null
wc -l "$PAI_PATH/.claude/agents/"*.md 2>/dev/null
```

**Signals:** monolithic -> split by domain; overlapping -> clarify boundaries; no composition -> add orchestration layer.

---

## Factor 11: Trigger from Anywhere

- [ ] Agent triggerable via CLI
- [ ] Agent triggerable via API/webhook
- [ ] Agent triggerable from other agents

```bash
grep -r "trigger\|webhook\|cron\|event" "$PAI_PATH" --include="*.md" --include="*.json"
```

**Signals:** CLI only -> add API endpoints; no scheduling -> add cron triggers; isolated -> enable inter-agent calls.

---

## Factor 12: Stateless Reducer

- [ ] All state external to agent
- [ ] Same input produces same output
- [ ] Horizontally scalable

```bash
grep -r "database\|storage\|persist\|file" "$PAI_PATH/.claude" --include="*.md"
```

**Signals:** internal state -> externalize; non-deterministic -> add seed; singleton -> design for multiple instances.

---

## Compliance Score

Score per factor: 0 = not implemented, 1 = partial, 2 = full.

Weighted factors (high impact = weight 2): F3, F8, F10. All others weight 1.

```
percentage = (weighted_total / (2 * total_weight)) * 100
```
