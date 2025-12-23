# PAI Master Context

## What This Is

This is your Personal AI Infrastructure (PAI) master context file.
All AI agents should read this file first to understand your system.

## System Architecture

**Location:** This PAI system lives at: `$PAI_DIR`

**Structure:**

- `$PAI_DIR/context/` - All knowledge and context
- `$PAI_DIR/agents/` - Specialized AI personas
- `$PAI_DIR/commands/` - Reusable workflows
- `$PAI_DIR/hooks/` - Event-based automation

## Core Principles

1. **System over Intelligence**: Good architecture > raw model capability
2. **Text as Primitive**: All configuration in markdown/text
3. **Solve Once, Reuse Forever**: Every solution becomes a module

## MANDATORY: How to Use This System

**YOU MUST FOLLOW THESE STEPS FOR EVERY TASK:**

1. **READ** this file completely before any action
2. **LOAD** relevant context from subdirectories
3. **ACTIVATE** appropriate agents for the task
4. **EXECUTE** using available commands

⚠️ FAILURE TO FOLLOW THIS PROTOCOL WILL RESULT IN INCORRECT OUTPUTS

For detailed reference documentation, see: `$PAI_DIR/context/references/`

## Active Projects

See: `$PAI_DIR/context/projects/` for project-specific contexts

## Tools and Capabilities

See: `$PAI_DIR/context/tools/CLAUDE.md` for available tools

---

**Last Updated:** $(date +%Y-%m-%d)
**Version:** 1.0
