---
name: cc-upgrade-pai
context: fork
description: PAI-specific Claude Code upgrade analysis. Extends cc-upgrade with PAI repository patterns, delegation workflows, and CORE skill integration. Use when optimizing PAI (Personal AI Infrastructure) codebases.
---

# CC-Upgrade-PAI (v1.0.0)

PAI-specific analysis extending the base `cc-upgrade` skill.

## Prerequisites

**Before running PAI analysis, load base skill context:**

→ READ: `../cc-upgrade/references/cc-trusted-sources.md` for CC feature sources
→ READ: `../cc-upgrade/references/12-factor-checklist.md` for compliance audit

## PAI-Specific Analysis

### 1. PAI Structure Validation

Expected PAI v2.x structure:

```
$PAI_DIR/
├── .claude/
│   ├── context/           # UFC (Universal File-based Context)
│   ├── skills/            # Skills-as-Containers
│   │   └── CORE/          # Core skill (identity, routing)
│   ├── agents/            # Specialized agents
│   ├── commands/          # Slash commands
│   ├── hooks/             # TypeScript hooks
│   │   └── lib/           # Hook libraries
│   └── settings.json
├── CLAUDE.md              # Root context
└── CONSTITUTION.md        # Philosophy doc
```

### 2. CORE Skill Audit

Check CORE skill compliance:

```bash
# Verify CORE skill exists and loads at startup
cat "$PAI_DIR/.claude/skills/CORE/SKILL.md" | head -20
```

Key checks:
- [ ] `context: same` (loads in main conversation)
- [ ] Identity section (name, personality)
- [ ] Workflow routing (→ READ: patterns)
- [ ] Response format tiers
- [ ] Delegation instructions

### 3. Delegation Patterns

PAI requires explicit delegation guidance:

| Pattern | Location | Check |
|---------|----------|-------|
| Parallel agents | `delegation-guide.md` | Task tool with multiple calls |
| Agent hierarchy | `agent-guide.md` | Escalation paths defined |
| Spotcheck pattern | Commands | Post-delegation verification |

### 4. Hook Library Analysis

PAI hooks follow TypeScript patterns:

```
.claude/hooks/
├── lib/
│   ├── llm/           # LLM clients (anthropic, openai)
│   ├── model-router.ts
│   └── context-utils.ts
├── pre-tool-use.ts
├── session-start.ts
└── *.test.ts          # Tests alongside source
```

Check for:
- [ ] TypeScript (not JavaScript)
- [ ] Tests with `bun test`
- [ ] Proper hook output schema (CC 2.1.14)

### 5. Context Engineering (UFC)

PAI uses Universal File-based Context:

| Pattern | Implementation |
|---------|----------------|
| Progressive disclosure | `→ READ:` directives |
| Context routing | Workflow routing in CORE |
| Size limits | <500 lines per file |
| Enforcement | MANDATORY/MUST directives |

## PAI Compliance Report Format

```markdown
# PAI Optimization Report

## Executive Summary
[1-2 sentence PAI-specific assessment]

## Base CC Analysis
[Run cc-upgrade first, summarize results]

## PAI-Specific Findings

### CORE Skill
- Identity: ✅/❌
- Workflow routing: ✅/❌
- Response tiers: ✅/❌
- Delegation: ✅/❌

### Delegation Patterns
| Pattern | Status | Notes |
|---------|--------|-------|

### Hook Library
| Module | Coverage | Notes |
|--------|----------|-------|

### UFC Compliance
| Metric | Value | Target |
|--------|-------|--------|

## PAI-Specific Recommendations
1. [High Priority] ...
2. [Medium Priority] ...
```

## Quick Commands

### Full PAI Audit
```bash
bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts $PAI_DIR
```

### Hook Test Coverage
```bash
cd $PAI_DIR/.claude/hooks && bun test --coverage
```

## Workflow

1. **Run base analysis first:**
   ```
   Use cc-upgrade skill to analyze generic .claude/ structure
   ```

2. **Then run PAI-specific:**
   ```bash
   bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts .
   ```

3. **Check hook coverage:**
   ```bash
   cd .claude/hooks && bun test --coverage
   ```

4. **Generate combined report** using the format above
