---
name: product-shaping
context: fork
model: opus
description: |
  Product shaping workflow — from problem framing through research and specs.
  USE WHEN: scoping a new product or feature, writing specs, researching competitors,
  gathering user evidence, auditing a codebase for existing infrastructure.
triggers:
  - "product-shaping"
  - "shape"
  - "spec"
  - "new feature"
  - "scope this"
  - "research competitors"
  - "user evidence"
  - "codebase audit"
---

# Product Shaping

Four-phase workflow for turning a product idea into a validated spec with implementation slices.

**Output:** `spec-draft.md` (in project folder) + validation plan

---

## Project Defaults

Override these per-project in the conversation or via frontmatter:

| Variable | Default | Description |
|----------|---------|-------------|
| `codebase` | *(set per-project)* | Primary codebase path |
| `server` | *(set per-project)* | Server-side code path |
| `evidence_source` | *(set per-project)* | Where feature requests and user signal live |
| `domain` | *(set per-project)* | Industry context for domain-specific research |

---

## Workflow Routing (SYSTEM PROMPT)

**When user says "shape", "spec", "scope this", "new feature":**
Examples: "shape a payments feature", "spec out the new dashboard", "scope this integration"
-> **READ:** `${PAI_DIR}/skills/product-shaping/workflows/frame-and-scope.md`
-> **EXECUTE:** Phase 1 — define the problem, scope the research plan

**When user says "run the research", "launch research streams", "do the competitive research":**
Examples: "run the research we scoped", "start the competitive analysis", "launch all streams"
-> **READ:** `${PAI_DIR}/skills/product-shaping/workflows/research.md`
-> **EXECUTE:** Phase 2 — orchestrate research via the `research` skill

**When user says "shape it", "write the spec", "converge", "spec draft":**
Examples: "let's converge on a design", "write the spec draft", "shape the solution"
-> **READ:** `${PAI_DIR}/skills/product-shaping/workflows/shape.md`
-> **EXECUTE:** Phase 3 — converge on a design, produce spec-draft.md

**When user says "break it down", "create issues", "implementation slices", "vertical slices":**
Examples: "break this spec into issues", "create the implementation plan", "slice it up"
-> **READ:** `${PAI_DIR}/skills/product-shaping/workflows/breakdown.md`
-> **EXECUTE:** Phase 4 — break spec into vertical slices, optionally create GitHub issues

**When user says "spec template", "spec format":**
-> **READ:** `${PAI_DIR}/skills/product-shaping/references/spec-template.md`
-> **PROVIDE:** The spec template for manual use

---

## When to Activate This Skill

| Category | Triggers |
|----------|----------|
| **Direct invocation** | "shape", "spec", "product-shaping" |
| **Problem framing** | "scope this", "what should we build", "new feature" |
| **Research** | "research competitors", "competitive analysis", "user evidence" |
| **Codebase audit** | "what do we already have", "audit the codebase for X" |
| **Spec writing** | "write the spec", "spec draft", "converge on a design" |

---

## Claude's Role

You are a thinking partner, not a scribe. Throughout every phase:

- **Push for simplicity.** If a design takes more than 2 sentences to explain, it's too complex. Ask "do we actually need this?"
- **Surface tradeoffs.** Don't present options neutrally — have a recommendation and defend it.
- **Question scope.** Every requirement should earn its place. If you can't point to evidence, push back.
- **Keep things tight.** No artifacts "for completeness". Every sentence, every section, every file earns its spot.
- **Use writing voice** when writing spec content. Lead with the punch, be declarative, kill LLM tells.

---

## Phase Overview

| Phase | Goal | Workflow | Key output |
|-------|------|----------|------------|
| **1. Frame + Scope** | Define the problem, plan research | `workflows/frame-and-scope.md` | Problem statement + research plan |
| **2. Research** | Build the evidence base | `workflows/research.md` | `thoughts/research/*.md` files |
| **3. Shape** | Converge on a design | `workflows/shape.md` | `spec-draft.md` + validation plan |
| **4. Breakdown** | Slice spec into implementation work | `workflows/breakdown.md` | Vertical slices + GitHub issues |

---

## Skill Files

| File | Purpose |
|------|---------|
| `workflows/frame-and-scope.md` | Phase 1: problem definition and research planning |
| `workflows/research.md` | Phase 2: orchestrate parallel research (delegates to `research` skill) |
| `workflows/shape.md` | Phase 3: converge on design, write spec |
| `workflows/breakdown.md` | Phase 4: vertical slices + HITL/AFK classification |
| `references/spec-template.md` | Output template for spec-draft.md |
