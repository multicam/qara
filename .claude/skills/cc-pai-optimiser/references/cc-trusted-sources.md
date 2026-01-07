# Claude Code Trusted Sources

## Primary Sources (Official)

### 1. GitHub Repository
- **URL**: https://github.com/anthropics/claude-code
- **Key Files**:
    - `CHANGELOG.md` - Detailed version history
    - `releases` - Tagged releases with notes
- **Update Frequency**: Check weekly
- **Reliability**: ★★★★★ (Official source of truth)

### 2. Anthropic Documentation
- **URL**: https://docs.claude.com/en/release-notes/overview
- **Content**: API and platform updates affecting Claude Code
- **Update Frequency**: Check weekly
- **Reliability**: ★★★★★

### 3. Anthropic News/Blog
- **URL**: https://www.anthropic.com/news
- **Content**: Major feature announcements, model updates
- **Update Frequency**: Check monthly
- **Reliability**: ★★★★★

### 4. NPM Package
- **URL**: https://www.npmjs.com/package/@anthropic-ai/claude-code
- **Content**: Package versions, dependency updates
- **Update Frequency**: Automatic via `claude --version`
- **Reliability**: ★★★★★

## Secondary Sources (Community)

### 5. ClaudeLog Changelog
- **URL**: https://claudelog.com/claude-code-changelog/
- **Content**: Community-maintained changelog aggregation
- **Update Frequency**: Near real-time
- **Reliability**: ★★★★☆

### 6. DeepWiki Feature Evolution
- **URL**: https://deepwiki.com/anthropics/claude-code/
- **Content**: Detailed feature history and architecture docs
- **Update Frequency**: Weekly
- **Reliability**: ★★★★☆

### 7. Claude Developers Discord
- **URL**: https://humanlayer.dev/discord (via GitHub README)
- **Content**: Community discussions, early feature previews
- **Update Frequency**: Real-time
- **Reliability**: ★★★☆☆ (Verify against official sources)

## Related Resources

### 8. 12-Factor Agents Repository
- **URL**: https://github.com/humanlayer/12-factor-agents
- **Content**: Agent architecture principles
- **Relevance**: Design patterns for PAI optimization
- **Reliability**: ★★★★☆

### 9. Claude Agent SDK Documentation
- **URL**: https://platform.claude.com/docs/en/agent-sdk
- **Content**: SDK for building custom agents
- **Relevance**: Advanced PAI integration patterns
- **Reliability**: ★★★★★

## Update Monitoring Strategy

### Automated Checks
```bash
# Add to cron or CI
#!/bin/bash
# cc-update-check.sh

CURRENT=$(claude --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')
echo "Current CC version: $CURRENT"

# Fetch latest from npm
LATEST=$(npm view @anthropic-ai/claude-code version 2>/dev/null)
echo "Latest CC version: $LATEST"

if [ "$CURRENT" != "$LATEST" ]; then
  echo "⚠️  Update available: $CURRENT → $LATEST"
  echo "Run: claude update"
fi
```

### Manual Review Cadence
| Source | Frequency | Action |
|--------|-----------|--------|
| GitHub CHANGELOG | Weekly | Review new features |
| NPM Package | On each session | Check version |
| Anthropic Blog | Monthly | Major announcements |
| Discord | As needed | Community insights |

## Feature Categories to Track

### High Priority (Core Functionality)
- Model updates (Sonnet, Opus, Haiku versions)
- Context window changes
- Tool/permission system updates
- Subagent capabilities

### Medium Priority (Productivity)
- New slash commands
- UI/UX improvements
- Hook system changes

### Lower Priority (Nice-to-have)
- Theme/styling options
- Terminal integrations
- IDE extensions