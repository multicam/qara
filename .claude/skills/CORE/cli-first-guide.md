# CLI-First Implementation Guide

**Purpose**: Practical patterns and best practices for building deterministic CLI tools that AI can orchestrate.

**When to read**: Building a new CLI tool, refactoring prompts to CLI-First, or integrating external APIs.

---

## Overview

The CLI-First pattern is fundamental to Qara's architecture: build deterministic command-line tools that work independently, then wrap them with AI orchestration for natural language interaction.

**Core Principle:**
> If you're writing the same logic in prompts multiple times, it should be a CLI tool.

---

## Documentation Structure

This guide is split into focused sections for easier navigation:

### Core Pattern
**[cli-first-patterns.md](./cli-first-patterns.md)** - The Three-Step Pattern
- Step 1: Understand Requirements
- Step 2: Build Deterministic CLI
- Step 3: Wrap with Prompting

### Design Principles
**[cli-first-design.md](./cli-first-design.md)** - CLI Design Best Practices
- Command Structure
- Comprehensive --help
- Idempotency
- Output Formats
- Progressive Disclosure
- Error Handling
- Input Validation

### API Integration
**[cli-first-api.md](./cli-first-api.md)** - CLI-First for API Calls
- Why ad-hoc API scripts fail
- Production-ready CLI tool pattern
- API integration checklist

### AI Orchestration
**[cli-first-prompting.md](./cli-first-prompting.md)** - Prompting Layer Responsibilities
- What prompting should do
- What prompting should NOT do
- Clear boundaries between code and AI

---

## Quick Reference

### The CLI-First Checklist

Before building anything, ask:
- [ ] Will this be run more than 5 times?
- [ ] Do I need consistent results?
- [ ] Will others use this?
- [ ] Do I need to test this?
- [ ] Is this managing complex state?

If 2+ yes → Build CLI tool

### CLI Tool Must-Haves

Every CLI tool needs:
- [ ] Clear command structure
- [ ] Full --help documentation
- [ ] Input validation
- [ ] Error handling with actionable messages
- [ ] Exit codes (0 success, 1+ errors)
- [ ] Output format (human + JSON)
- [ ] TypeScript implementation
- [ ] README.md with examples
- [ ] Location in `~/.claude/bin/toolname/`
- [ ] Executable (`chmod +x`, shebang)

### The Pattern

```
1. Requirements (what) → Document fully
2. CLI Tool (how) → Build deterministically
3. Prompting (orchestration) → AI wraps CLI
```

**Never skip step 2.**

---

## Quick Examples

**Before (Prompt-Driven):** AI manually creates JSON, runs inconsistent commands, formats output differently each time.

**After (CLI-First):**
```bash
# Evaluation system
evals run --use-case newsletter-summary --model claude-3-5-sonnet --json

# Blog publishing
blog-publish ./posts/my-post.md --verify

# API integration
llcli --date today --json | jq '.items'
```

**Benefits:** Reproducible, testable, version-controlled, AI just orchestrates.

---

## Related Documentation

- **CONSTITUTION.md** - Core CLI-First principle
- **stack-preferences.md** - TypeScript over Python, Bun for runtimes
- **testing-guide.md** - How to test CLI tools

---

## Key Takeaways

1. **Build tools that work without AI** - Then add AI for convenience
2. **Code is cheaper than prompts** - Write it once, use it forever
3. **CLI enables testing** - Test tools independently of AI
4. **Version control behavior** - CLI changes are explicit code changes
5. **Determinism is reliability** - Same command = same result
6. **Discoverability matters** - --help makes tools self-documenting
7. **Compose with Unix tools** - Pipes, filters, automation
