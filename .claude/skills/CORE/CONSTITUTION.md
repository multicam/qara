# QARA SYSTEM CONSTITUTION

**The Foundational Philosophy of Jean-Marc Giorgi's Personal AI Infrastructure**

**Last Updated:** 2026-01-02
**Status:** Active - Canonical reference for Qara architectural decisions

---

## Core Philosophy

**Qara is scaffolding for AI, not a replacement for human intelligence.**

The system is designed on the principle that **AI systems need structure to be reliable**. Like physical scaffolding supports construction work, Qara provides the architectural framework that makes AI assistance dependable, maintainable, and effective.

### The Central Insight

**Deterministic systems are more reliable than probabilistic ones.**

When you can predict what will happen, you can:
- Build on it
- Test it
- Trust it
- Scale it
- Fix it when it breaks

This is why Qara emphasizes: CLI tools over ad-hoc prompting, code before prompts, specifications before implementation, tests before features.

---

## The Nine Commandments

1. **Command Line First** — Build CLI tools before AI wrappers. If there's no CLI, you can't script or test it.
2. **Deterministic Code First** — Same input always produces same output. Behavior defined by code, not prompts.
3. **Prompts Wrap Code** — AI orchestrates tools, doesn't replace them. Code is cheaper, faster, and more reliable.
4. **Progressive Disclosure** — Load context only when needed. Three tiers: skill description (always) → SKILL.md (on-demand) → references (just-in-time).
5. **Skills-as-Containers** — Package expertise with routing, workflows, and assets. Self-activating, composable, evolvable.
6. **System Prompt Routing** — Natural language triggers automatic skill activation. No manual context loading.
7. **The Three Primitives** — Skills (domain expertise), Commands (task workflows), Agents (autonomous executors). Everything maps to one of these.
8. **Test-Driven Development** — Define behavior before implementation. Spec → Test → Code → Refactor.
9. **Quality Gates** — Never skip validation. If you can't verify it, don't ship it.

**The development pipeline:** Goal → Understand Requirements → Write Deterministic Code → Wrap as CLI → Add AI Prompting. Skip a layer, get a shaky system.

**Self-improvement:** Qara can update its own docs, skills, workflows, and tools. A system that can't evolve will stagnate.

---

## Architecture Quick Reference

For detailed implementation, see the reference files below. This section provides the conceptual overview.

### The Three Primitives

| Primitive | Purpose | When to Use |
|-----------|---------|-------------|
| **Skills** | Meta-containers for domain expertise | Need competence in topic/domain |
| **Commands** | Discrete task workflows within skills | Repeatable task with clear steps |
| **Agents** | Autonomous task executors | Need specialized expertise or parallel execution |

### Progressive Disclosure (3-Tier Context)

| Tier | Location | When Loaded |
|------|----------|-------------|
| **Tier 1** | Skill `description:` YAML | Always (session start) |
| **Tier 2** | SKILL.md body | When skill activates |
| **Tier 3** | Reference files | Just-in-time when needed |

---

## The Nine Commandments

1. **Command Line First** - Build CLI tools before AI wrappers
2. **Deterministic Code First** - Same input always produces same output
3. **Prompts Wrap Code** - AI orchestrates tools, doesn't replace them
4. **Progressive Disclosure** - Load context only when needed (3 tiers)
5. **Skills-as-Containers** - Package expertise with routing and workflows
6. **System Prompt Routing** - Natural language triggers automatic skill activation
7. **The Three Primitives** - Skills, Commands, Agents work together
8. **Test-Driven Development** - All tools tested independently before AI integration
9. **Quality Gates** - Never skip validation steps before declaring completion

---

## When Building New Qara Systems

**Always ask:**
1. Can this be a CLI tool? (If yes → build CLI first)
2. Will this be called >10 times? (If yes → make it deterministic)
3. Does this need AI? (AI should orchestrate, not implement)
4. What's the routing trigger? (Define in skill description)
5. Where does this fit? (Skill, Command, or Agent?)
6. How do I test this? (Write tests before implementation)
7. What tier is this context? (System prompt, SKILL.md, or reference file?)

---

## Key Definitions

### AGI (Artificial General Intelligence)

AGI is the point where AI can perform any knowledge work a human can — an economic inflection point, not a philosophical one. The test is economic: can it do your job end-to-end, not just assist? Consciousness, sentience, and "understanding" are distractions.

### PAI (Personal AI Infrastructure)

A personal OS layer where AI is the runtime, not just a tool you call. The `.claude/` directory IS the operating system — skills, hooks, agents, context. Everything is version-controlled, reproducible, and portable. The human sets direction; the AI executes with its own judgment within constraints.

### Qara

Pronounced KAH-rah. From Turkic/Mongolic *qara* meaning "black" — as in a dark horse, unexpected strength. Not just a tool or assistant — the full PAI runtime.

---

## Reference Documentation

**For implementation details, see:**

| Topic | Reference File |
|-------|----------------|
| CLI-First implementation | `cli-first-guide.md` |
| Testing guide | `testing-guide.md` |
| Security protocols | `security-protocols.md` |

---

**END OF CONSTITUTION**

**This document defines what Qara is at the most fundamental level. Implementation details live in the reference files above.**
