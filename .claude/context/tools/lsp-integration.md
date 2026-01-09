# LSP Integration Guide

**Purpose**: Language Server Protocol integration for enhanced code intelligence in Claude Code.

## Overview

LSP provides Claude Code with real-time code intelligence:
- Go to definition
- Find references
- Type information
- Diagnostics (errors/warnings)
- Code completion context

## Enabling LSP

LSP support is automatic when language servers are available in the environment.

### Supported Languages

| Language | Server | Auto-detect |
|----------|--------|-------------|
| TypeScript/JavaScript | typescript-language-server | Yes |
| Python | pyright, pylsp | Yes |
| Rust | rust-analyzer | Yes |
| Go | gopls | Yes |

### Manual Configuration

If auto-detect fails, ensure the language server is in PATH:

```bash
# TypeScript
bun add -g typescript-language-server typescript

# Python
uv tool install pyright

# Rust
rustup component add rust-analyzer
```

## Benefits for Code Tasks

### 1. Accurate Symbol Resolution
```
"Find all usages of AuthService"
→ LSP provides exact references, not just text matches
```

### 2. Type-Aware Refactoring
```
"Rename userId to customerId"
→ LSP ensures all typed references are updated
```

### 3. Import Resolution
```
"Add this function to the file"
→ LSP suggests correct import paths
```

### 4. Error Detection
```
"What's wrong with this code?"
→ LSP provides real-time diagnostics
```

## When LSP Helps Most

**Complex Codebases:**
- Large monorepos with many modules
- TypeScript projects with extensive type usage
- Projects with complex import structures

**Refactoring Tasks:**
- Renaming symbols across files
- Moving functions between modules
- Updating interfaces

**Navigation:**
- Finding implementations of interfaces
- Tracing call hierarchies
- Understanding type relationships

## Current Limitations

1. **Setup Required**: Language servers must be installed
2. **Project Awareness**: Works best with properly configured projects (tsconfig.json, etc.)
3. **Memory Usage**: Large projects may have higher memory consumption

## Verification

To check if LSP is active:
1. Open a file in VS Code / IDE with Claude Code
2. Claude Code will use LSP information automatically when available
3. More precise find/replace operations indicate LSP is working

## Troubleshooting

**LSP not working?**
1. Verify language server is installed: `which typescript-language-server`
2. Check project has proper config (tsconfig.json for TS)
3. Restart Claude Code session

**Slow responses?**
- LSP indexing large projects takes time on first load
- Consider excluding node_modules in LSP config
