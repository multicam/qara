# PAI Operational Documentation

This directory contains **operational documentation** for the PAI system - guides, references,
and system explanations for users and agents.

## What's Here

- **System Explanations**: How different PAI systems work (agents, commands, skills, hooks)
- **User Guides**: How to use PAI features (CLI tools, quick reference)
- **API References**: Runtime references for integrations (Fabric patterns/models/strategies)
- **Architecture**: Core system architecture and design

## Looking for Development Documentation?

Development documentation (plans, research, handoffs, decisions, knowledge) has been moved to:

**`/thoughts/global/shared/`**

### Development Doc Categories

- **Plans**: `/thoughts/global/shared/plans/` - Implementation plans and strategies
- **Research**: `/thoughts/global/shared/research/` - Research findings and analysis
- **Knowledge**: `/thoughts/global/shared/knowledge/` - Knowledge gathered during development
- **Handoffs**: `/thoughts/global/shared/handoffs/` - Phase completion documents
- **Decisions**: `/thoughts/global/shared/decisions/` - Architecture Decision Records (ADRs)

## Why the Split?

This organization separates:

1. **Operational docs** (timeless, for runtime use) → stay here
2. **Development docs** (historical, for understanding how PAI was built) → moved to thoughts/

See: `/thoughts/global/shared/research/2025-11-18-documentation-organization-refactor.md` for full rationale.

## Documentation Index

### System References

- `agent-system.md` - How the agent system works
- `architecture.md` - PAI system architecture
- `command-system.md` - Command system functionality
- `hook-system.md` - Hook system functionality
- `skills-system.md` - Skills system functionality
- `ufc-context-system.md` - UFC context system
- `pai-context-loading.md` - Context loading mechanism
- `auto-documentation.md` - Documentation automation

### User Guides

- `CLI-TOOLS.md` - Modern CLI tools guide (fd, ripgrep, ast-grep, bat)
- `QUICK-REFERENCE.md` - Quick reference card

### API References

- `fabric-model-reference.md` - Fabric models
- `fabric-patterns-reference.md` - Fabric patterns
- `fabric-strategies-reference.md` - Fabric strategies
