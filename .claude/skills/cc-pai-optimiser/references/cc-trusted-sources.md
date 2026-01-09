# Claude Code Trusted Sources (Updated 2025-01)

## Primary Sources (Official)

### 1. GitHub Repository
- **URL**: https://github.com/anthropics/claude-code
- **Key Files**:
    - `CHANGELOG.md` - Detailed version history
    - `releases` - Tagged releases with notes
- **Update Frequency**: Check weekly
- **Reliability**: Highest (Official source of truth)

### 2. Anthropic Documentation
- **URL**: https://docs.anthropic.com/en/docs/claude-code
- **Content**: Official Claude Code documentation, API reference
- **Update Frequency**: Check weekly
- **Reliability**: Highest

### 3. Anthropic News/Blog
- **URL**: https://www.anthropic.com/news
- **Content**: Major feature announcements, model updates
- **Update Frequency**: Check monthly
- **Reliability**: Highest

### 4. NPM Package
- **URL**: https://www.npmjs.com/package/@anthropic-ai/claude-code
- **Content**: Package versions, dependency updates
- **Update Frequency**: Automatic via `claude --version`
- **Reliability**: Highest

## Secondary Sources (Community)

### 5. marckrenn Claude Code Changelog
- **URL**: https://github.com/marckrenn/claude-code-changelog
- **Content**: Community-maintained system prompt history and changelog
- **Key File**: `cc-prompt.md` - Current system prompt
- **Update Frequency**: Near real-time
- **Reliability**: High (verified against official)

### 6. ClaudeLog Changelog
- **URL**: https://claudelog.com/claude-code-changelog/
- **Content**: Community changelog aggregation
- **Update Frequency**: Near real-time
- **Reliability**: Medium-High

### 7. DeepWiki Feature Evolution
- **URL**: https://deepwiki.com/anthropics/claude-code/
- **Content**: Detailed feature history and architecture docs
- **Update Frequency**: Weekly
- **Reliability**: Medium-High

### 8. Claude Developers Discord
- **URL**: https://humanlayer.dev/discord
- **Content**: Community discussions, early feature previews
- **Update Frequency**: Real-time
- **Reliability**: Medium (Verify against official sources)

## Related Resources

### 9. 12-Factor Agents Repository
- **URL**: https://github.com/humanlayer/12-factor-agents
- **Content**: Agent architecture principles
- **Relevance**: Design patterns for PAI optimization
- **Reliability**: High

### 10. Claude Agent SDK Documentation
- **URL**: https://docs.anthropic.com/en/docs/agent-sdk
- **Content**: SDK for building custom agents
- **Relevance**: Advanced PAI integration patterns
- **Reliability**: Highest

## Update Monitoring Strategy

### Automated Checks
```bash
#!/bin/bash
# cc-update-check.sh - Add to cron

CURRENT=$(claude --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')
echo "Current CC version: $CURRENT"

# Fetch latest from npm
LATEST=$(npm view @anthropic-ai/claude-code version 2>/dev/null)
echo "Latest CC version: $LATEST"

if [ "$CURRENT" != "$LATEST" ]; then
  echo "Update available: $CURRENT -> $LATEST"
  echo "Run: claude update"
fi
```

### Manual Review Cadence
| Source | Frequency | Action |
|--------|-----------|--------|
| GitHub CHANGELOG | Weekly | Review new features |
| NPM Package | Each session | `claude --version` |
| Anthropic Blog | Monthly | Major announcements |
| Discord | As needed | Community insights |

## Feature Categories to Track

### Critical (Core Functionality)
- Model updates (Sonnet 4, Opus 4.5, Haiku)
- Context window changes
- Tool/permission system updates
- Subagent capabilities
- Hooks system changes

### High Priority (Productivity)
- New slash commands
- Skill tool enhancements
- Task tool improvements
- Plan mode features

### Medium Priority (Enhancement)
- UI/UX improvements
- IDE integrations
- Terminal features

### Lower Priority (Nice-to-have)
- Theme/styling options
- Documentation updates

## CC 2.1.x Key Features

| Feature | Version | Description |
|---------|---------|-------------|
| Model routing | 2.1.0+ | Per-task model selection (haiku/sonnet/opus) |
| Skill invocation | 2.1.0+ | Skill tool for user-defined skills |
| Background tasks | 2.1.0+ | run_in_background for async agents |
| Task resume | 2.1.0+ | Resume agents via agent ID |
| Status line | 2.1.0+ | Custom status line in settings.json |
| Enhanced hooks | 2.1.0+ | Hooks in settings.json (replaces hooks.json) |
| WebSearch | 2.1.0+ | Built-in web search tool |
| AskUserQuestion | 2.1.0+ | Interactive questions with options |
