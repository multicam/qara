---
name: react-best-practices
context: fork
description: |
  React best practices reference and improvement workflow for TGDS Office codebase.
  Tracks which rules from 3 compiled guides have been applied, which are not applicable,
  and which remain to be checked. Guides agents through improvement rounds systematically.

  USE WHEN: user says "apply react best practices", "next round of improvements",
  "react improvements", "study react best practices", "what react rules are left",
  "run a best practices pass", "react cleanup round", or similar.
---

# React Best Practices

Reference and workflow skill for applying React best practices to the TGDS Office codebase (Next.js 15, React 18, JavaScript — NOT TypeScript, NOT React 19, NOT RSC/App Router).

This skill compiles rules from 3 external guides, tracks application status, and guides agents through improvement rounds without re-doing already-applied work.

## Workflow Routing (SYSTEM PROMPT)

**When user requests a new improvement round:**
Examples: "apply react best practices", "next round of improvements", "react improvements", "run a best practices pass", "react cleanup round"
→ **READ:** `${PAI_DIR}/skills/react-best-practices/workflows/improvement-round.md`
→ **READ:** `${PAI_DIR}/skills/react-best-practices/references/rules-status.md`
→ **EXECUTE:** Identify pending rules, scan codebase for violations, apply fixes

**When user wants to study or review the rules:**
Examples: "study react best practices", "what react rules are left", "show me pending rules", "what has been applied", "review best practices status"
→ **READ:** `${PAI_DIR}/skills/react-best-practices/references/rules-status.md`
→ **EXECUTE:** Summarize current status, highlight pending rules with code examples

**When user wants to check a specific rule:**
Examples: "check rerender-memo rule", "is rerender-defer-reads applied", "did we apply X"
→ **READ:** `${PAI_DIR}/skills/react-best-practices/references/rules-status.md`
→ **EXECUTE:** Find the specific rule, report its status and description

---

## When to Activate This Skill

### Direct Requests
- "apply react best practices"
- "next round of improvements"
- "react improvements"
- "react cleanup round"
- "run a best practices pass"
- "study react best practices"
- "what react rules are left"
- "what hasn't been applied yet"
- "show pending react rules"

### Context Clues
- User mentions "another round" after previous improvement sessions
- User asks about specific rule IDs (e.g., "rerender-memo", "js-cache-property-access")
- User asks "what did we do last time" in context of React refactoring
- User wants to improve performance or reduce re-renders

### Feature-Specific Triggers
- For improvement rounds: "apply", "next round", "cleanup", "pass"
- For status review: "what's left", "pending", "already applied", "status"
- For specific rules: any rule ID from references/rules-status.md

### Examples
- "Let's do another round of react best practices"
- "What react rules haven't we applied yet?"
- "Apply react best practices to the codebase"
- "Time for another improvement round"
- "Check if rerender-defer-reads is applied anywhere"

### Anti-Patterns (When NOT to Activate)
- General JavaScript improvements unrelated to React patterns
- TypeScript or React 19 questions (not applicable to this codebase)
- Server Components / RSC patterns (this codebase uses Pages Router)

---

## Core Capabilities

1. **Status Tracking** - Knows which rules are applied, not applicable, or pending
2. **Codebase Scanning** - Identifies specific files/components violating pending rules
3. **Guided Application** - Applies rules one at a time with before/after examples
4. **Context Awareness** - Never re-applies already-done rules, never suggests inapplicable ones

---

## Codebase Constraints (Critical)

These constraints filter which rules apply:

- **Framework**: Next.js 15, Pages Router (no App Router, no RSC, no SSR)
- **Language**: JavaScript (no TypeScript, no type annotations)
- **React version**: React 18 (no React 19 APIs like `use()`, `useOptimistic`, etc.)
- **Rendering**: Static export (`output: 'export'`) — no SSR, no hydration concerns
- **UI**: Blueprint.js + TailwindCSS
- **State**: Local state + global store pattern (no Redux, no Zustand)

---

## Extended Context

### Workflow Documentation
- `workflows/improvement-round.md` - Step-by-step process for running an improvement round

### Reference Documentation
- `references/rules-status.md` - Complete rules tracker (applied / not-applicable / pending) with code examples

---

## Examples

**Starting a new round:**
> "Let's do another round of react best practices on the codebase"
→ Reads rules-status.md → Identifies first 3-5 pending rules → Scans codebase → Applies fixes

**Checking status:**
> "What react rules have we already applied?"
→ Reads rules-status.md → Lists all APPLIED rules with round numbers

**Targeted check:**
> "Have we applied rerender-defer-reads anywhere?"
→ Reads rules-status.md → Reports status, description, and code example for that rule
