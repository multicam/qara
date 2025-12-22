# CC-PAI Optimizer Skill

A Claude skill for reviewing and optimizing Personal AI Infrastructure (PAI) codebases as Claude Code evolves.

## Problem Solved

Keeping PAI systems up-to-date with Claude Code improvements is challenging because:
1. CC releases frequently (weekly/bi-weekly)
2. New features can significantly improve PAI workflows
3. 12-factor agent principles evolve with the ecosystem
4. Context engineering best practices continue to mature

This skill provides a systematic approach to track CC updates and apply them to PAI codebases.

## Trusted Sources for Claude Code Updates

### Primary Sources (Official - Check Weekly)

| Source | URL | Content |
|--------|-----|---------|
| **GitHub CHANGELOG** | https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md | Detailed version history |
| **GitHub Releases** | https://github.com/anthropics/claude-code/releases | Tagged releases with notes |
| **Anthropic Docs** | https://docs.claude.com/en/release-notes/overview | Platform-wide updates |
| **NPM Package** | https://www.npmjs.com/package/@anthropic-ai/claude-code | Package versions |

### Secondary Sources (Community - Verify Against Official)

| Source | URL | Content |
|--------|-----|---------|
| ClaudeLog | https://claudelog.com/claude-code-changelog/ | Aggregated changelog |
| DeepWiki | https://deepwiki.com/anthropics/claude-code/ | Feature architecture docs |
| Discord | https://humanlayer.dev/discord | Community discussions |

### Related Resources

| Source | URL | Relevance |
|--------|-----|-----------|
| 12-Factor Agents | https://github.com/humanlayer/12-factor-agents | Agent design principles |
| Claude Agent SDK | https://platform.claude.com/docs/en/agent-sdk | Custom agent building |

## Skill Structure

```
cc-pai-optimiser/
├── SKILL.md                              # Main skill file
├── references/
│   ├── cc-trusted-sources.md            # Trusted sources detail
│   └── 12-factor-checklist.md           # Compliance audit criteria
└── scripts/
    ├── cc-version-check.js              # Version compatibility checker
    └── analyse-pai.js                   # PAI analysis tool
```

## Usage

### Quick Version Check

```bash
# Check CC version compatibility with your PAI
cd ${PAI_DIR}/skills/cc-pai-optimiser
bun run scripts/cc-version-check.js ${PAI_PATH}
```

### Full PAI Analysis

```bash
# Run comprehensive PAI audit
cd ${PAI_DIR}/skills/cc-pai-optimiser
bun run scripts/analyse-pai.js ${PAI_DIR}/..
```

### Manual Workflow

1. **Gather CC Updates**
    - Check GitHub CHANGELOG for new features
    - Note version requirements for each feature

2. **Audit PAI Structure**
    - Run analysis scripts
    - Check 12-factor compliance

3. **Generate Upgrade Plan**
    - Prioritize by impact and effort
    - Create implementation snippets

## Key Claude Code Features to Track

| Feature | Min Version | PAI Impact |
|---------|-------------|------------|
| Subagents | 1.0.80 | Parallel task delegation |
| Checkpoints | 2.0.0 | Code state rollback |
| Hooks | 1.0.85 | Event automation |
| Skills | 2.0.40 | Reusable capabilities |
| Plan Mode | 2.0.50 | Structured execution |
| LSP | 2.0.74 | Code intelligence |
| Chrome Integration | 2.0.72 | Browser control |

## 12-Factor Agent Principles for PAI

The skill audits against these factors (see `references/12-factor-checklist.md`):

1. **Natural Language to Tool Calls** - Schema definitions
2. **Own Your Prompts** - Version-controlled prompts
3. **Own Your Context Window** - UFC implementation ⭐
4. **Tools Are Structured Outputs** - JSON schemas
5. **Unify Execution State** - Centralized state
6. **Launch/Pause/Resume** - Checkpoint support
7. **Contact Humans with Tools** - HITL patterns
8. **Own Your Control Flow** - Custom logic ⭐
9. **Compact Errors** - Error summarization
10. **Small Focused Agents** - Single-purpose ⭐
11. **Trigger from Anywhere** - Multi-channel
12. **Stateless Reducer** - External state

⭐ = High-impact factors for PAI optimization

## Update Monitoring Strategy

### Automated (Recommended)

```bash
#!/bin/bash
# Add to weekly cron
CURRENT=$(claude --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')
LOCATION=$(which claude)
LATEST=$(npm view @anthropic-ai/claude-code version 2>/dev/null)

if [ "$CURRENT" != "$LATEST" ]; then
  echo "CC Update: $CURRENT → $LATEST"
  # Optionally: trigger PAI analysis
fi
```

### Manual Cadence

| Check | Frequency | Action |
|-------|-----------|--------|
| `claude --version` | Each session | Quick version check |
| GitHub CHANGELOG | Weekly | Feature review |
| Anthropic Blog | Monthly | Major announcements |
| Run full analysis | Monthly | Comprehensive audit |

## Integration with Existing PAI

When using this skill to optimize an existing PAI:

1. **Preserve** - Don't break existing context loading (Layers 1-4)
2. **Enhance** - Add new CC features incrementally
3. **Validate** - Test context hydration after changes
4. **Document** - Update CLAUDE.md files with changes

## Output Example

When running the skill, expect reports like:

```
╔══════════════════════════════════════════════════════════════╗
║              PAI OPTIMIZATION ANALYSIS                       ║
╚══════════════════════════════════════════════════════════════╝

📅 Generated: 2025-12-23T10:30:00Z
📁 PAI Path: /home/user/my-pai
📊 Overall Score: 62/80 (78%)

Progress: [███████████████░░░░░] 78%

─── STRUCTURE (8/10) ───
  ✅ .claude exists
  ✅ .claude/context exists
  ✅ .claude/agents exists
  ⚪ .claude/hooks not present (optional)

─── RECOMMENDATIONS ───
📌 contextManagement:
   • Split 2 oversized context files
   • Add context loading enforcement

📌 toolIntegration:
   • Add descriptions to all MCP servers
```

## Installation

Installation is implicit, ~/.claude/skills is symlinked