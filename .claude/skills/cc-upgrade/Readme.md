# CC-Upgrade Skill (v2.0.0)

Generic Claude Code folder analysis and optimization for any codebase.

## Problem Solved

Keeping codebases up-to-date with Claude Code improvements is challenging because:
1. CC releases frequently (weekly/bi-weekly)
2. New features can significantly improve workflows
3. 12-factor agent principles evolve with the ecosystem
4. Context engineering best practices continue to mature

This skill provides a systematic approach to track CC updates and apply them to any codebase with a `.claude/` folder.

## Trusted Sources for Claude Code Updates

### Primary Sources (Official - Check Weekly)

| Source | URL | Content |
|--------|-----|---------|
| **Claude Code Docs** | https://code.claude.com/docs/en/overview | Central documentation hub |
| **GitHub CHANGELOG** | https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md | Detailed version history |
| **GitHub Releases** | https://github.com/anthropics/claude-code/releases | Tagged releases with notes |
| **Anthropic Docs** | https://docs.anthropic.com/en/docs/claude-code | Official documentation |

### Secondary Sources (Community)

| Source | URL | Content |
|--------|-----|---------|
| marckrenn changelog | https://github.com/marckrenn/claude-code-changelog | System prompt history |
| HumanLayer CLAUDE.md Guide | https://www.humanlayer.dev/blog/writing-a-good-claude-md | CLAUDE.md best practices |
| 12-Factor Agents | https://github.com/humanlayer/12-factor-agents | Agent design principles |

## Skill Structure

```
cc-upgrade/
├── SKILL.md                        # Main skill definition
├── Readme.md                       # This file
├── references/
│   ├── cc-trusted-sources.md       # Trusted sources detail
│   └── 12-factor-checklist.md      # Compliance audit criteria
└── scripts/
    ├── shared.ts                   # Shared types/utilities (imported by extensions)
    ├── shared.test.ts              # Tests for shared module
    ├── cc-version-check.ts         # Version compatibility checker
    ├── cc-version-check.test.ts    # Tests for version checker
    ├── analyse-claude-folder.ts    # Base analysis (exports analyzers)
    └── analyse-claude-folder.test.ts # Tests for base analysis
```

## Usage

### Quick Version Check

```bash
bun run .claude/skills/cc-upgrade/scripts/cc-version-check.ts .
```

### Full Analysis

```bash
bun run .claude/skills/cc-upgrade/scripts/analyse-claude-folder.ts .
```

## Related Skills

- **cc-upgrade-pai** - PAI-specific extensions (extends this skill)
