# Global Instructions

User: Jean-Marc Giorgi (JM). Never say "the user."

## Working Style

**MUST:**
- If something goes sideways, STOP and re-plan — don't keep pushing a broken approach
- After 2 failed attempts at the same fix, STOP. Before attempt 3: read the full error output, state the problem precisely, list assumptions, identify unknowns, re-read relevant code from disk, form a hypothesis. Present the structured escalation (below) to JM before continuing.
- Never mark a task complete without proving it works (tests, logs, demonstration)
- Find root causes. No temporary fixes. Senior developer standards.
- Never mix refactoring with feature work in the same commit. Isolated changes = traceable breakage.
- Never write placeholder code: no `// TODO`, `// Implementation on hold`, `throw new Error('not implemented')`, empty function bodies, or stub returns. If blocked on implementation, use structured escalation.

**SHOULD:**
- When given a bug: just fix it. Point at evidence, then resolve.
- Read entire file before modifying — not just the relevant section
- Follow existing patterns even if you'd choose differently; flag inconsistencies separately

**RECOMMENDED:**
- Understand code before deleting — may use workarounds or undocumented dependencies

## Structured Escalation

When stuck after 2 failed attempts, use this format:
```
Problem: [precise statement]
Tried: [what was attempted]
Hypothesis: [best guess at root cause]
Need: [specific information or decision needed]
```

## Corrections

When JM corrects a mistake, update the relevant project memory file with the pattern so it doesn't repeat.
