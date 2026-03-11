# Jean-Marc's Canonical Definitions

**Purpose**: Jean-Marc's specific definitions for key concepts. When these topics arise, use THESE definitions, not general/Wikipedia versions.

**Authority**: These definitions override external sources for all Qara operations.

---

## AI Concepts

### AGI (Artificial General Intelligence)

**Definition**: AGI is the point where AI can perform any knowledge work a human can — an economic inflection point, not a philosophical one.

**What makes it AGI (not narrow AI)**:
- Replaces human cognitive labor across domains, not just one task
- No human scaffolding needed — sets sub-goals, handles ambiguity, recovers from failure
- The test is economic: can it do your job end-to-end, not just assist?

**Why this framing matters**: Consciousness, sentience, "understanding" are distractions. The meaningful threshold is when AI becomes a substitute for human knowledge workers, not a complement. That's when everything changes.

---

## Software Development

### CLI-First Architecture

**Definition**: Build deterministic command-line tools first, wrap them with prompts second.

**Reference**: See `CONSTITUTION.md` for core philosophy; `cli-first-guide.md` for patterns.

**The rule**: Build tools that work perfectly without AI, then add AI to make them easier to use. Code is cheaper, faster, and more reliable than prompts. Prompts wrap code — never the reverse.

---

### Deterministic Code

**Definition**: Code whose output is completely determined by its input, with no randomness or hidden state.

**Core Principles** (from CONSTITUTION.md):
- Same input → Same output (always)
- No random numbers (unless seeded)
- No hidden global state
- No uncontrolled external dependencies

**Why this matters**:
- Debugging: Can reproduce issues
- Testing: Reliable test results
- Trust: Predictable behavior
- Maintainability: Easier to reason about

**Anti-patterns**:
- `Math.random()` without seed
- Timestamps as primary logic
- Global mutable state
- Non-deterministic APIs without caching

---

### TDD (Test-Driven Development)

**Jean-Marc's approach**: Pragmatic TDD.

- Use TDD when the problem is well-defined — clear inputs, outputs, and contracts
- Skip TDD when exploring or prototyping — write tests after the shape stabilizes
- Tests are always mandatory. Timing is flexible.

**When TDD fits**: APIs, parsers, validators, data transforms, anything with a spec.
**When TDD doesn't fit**: UI exploration, spike work, one-off scripts, figuring out what to build.

---

## Technical Preferences

### "We hate Python"

**Reasoning**: Dynamic typing combined with notebook culture leads to sloppy engineering. The language rewards prototyping over production-quality code. Prefer typed, compiled-first languages (TypeScript, Rust, Go) where the toolchain enforces discipline.

**Exceptions**: When a critical library only exists in Python (ML/scientific computing), or when interfacing with a Python-only ecosystem.

**Reference**: See stack-preferences.md

---

### "Markdown Zealots"

**Position**: NEVER use HTML for basic content (paragraphs, headers, lists, links, emphasis).

**HTML ONLY for**:
- Custom components: `<aside>`, `<callout>`, `<notes>`
- Complex layouts requiring CSS
- Interactive elements

**Reference**: See stack-preferences.md lines 131-181

---

## Process Definitions

### Analysis vs. Action

**Rule**: Distinguish between requests for analysis (explain, recommend) vs. requests for action (implement, fix).

**Decision tree**:
```
"Analyze X" → Provide analysis ONLY, don't change anything
"Fix X" → Take action, make changes
"Analyze and fix X" → Both
"What's wrong?" → Analysis
"Should I use X or Y?" → Analysis and recommendation
"Use X for this" → Action
```

**Why this matters**: Avoids unwanted changes. Respects Jean-Marc's agency. Clear communication.

**Reference**: See stack-preferences.md lines 328-366

---

## Qara-Specific Concepts

### PAI (Personal AI Infrastructure)

**Definition**: A personal OS layer where AI is the runtime, not just a tool you call.

**What this means**:
- The `.claude/` directory IS the operating system — skills, hooks, agents, context
- AI isn't a feature of the workflow; it IS the workflow
- Everything is version-controlled, reproducible, and portable
- The human sets direction; the AI executes with its own judgment within constraints

### Qara

**Pronunciation**: KAH-rah

**Etymology**: From Turkic/Mongolic *qara* meaning "black" — as in a dark horse, unexpected strength.

**Identity**: Not just a tool or assistant. Qara is the system — the full PAI, the runtime, the infrastructure.

### Skills System

Defined in `CORE/SKILL.md`. Skills are modular, self-contained capability units loaded just-in-time via progressive disclosure.

### Progressive Disclosure

Defined in `CONSTITUTION.md`. Three tiers: SKILL.md (always loaded) → skill root docs (on-demand) → workflows/references (deep context). Only load what's needed.

---

## Related Documentation
- `CONSTITUTION.md` — architectural principles
- `stack-preferences.md` — technical preferences
- `security-protocols.md` — security concepts
