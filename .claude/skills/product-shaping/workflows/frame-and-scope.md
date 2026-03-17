---
description: "Phase 1 — Define the problem and scope the research plan"
---

# Phase 1: Frame + Scope Research

**Goal:** Define the problem statement and decide what research to run.

---

## Define the Problem

Ask and push on:

1. **What's the job to be done?** Not the feature description — what are we trying to accomplish?
2. **Why now?** What changed that makes this worth investing in?
3. **What does success look like?** If we ship this perfectly, what's different in 6 months?
4. **Who is the first customer?** Partner, associate, or end-user?
5. **What's the appetite?** Big bet or small bet? This constrains the shape.
6. **What does this unlock beyond the feature?** Think leverage — can we reuse this elsewhere? Use it against competitors? Unlock a vertical? Always push: "If we build this, what does it unlock?"

Push hard here:

- **Is this unique product thinking?** Is this replicating what exists, or pushing boundaries?
- **Why are we building this?** Don't accept the framing at face value. Make JM defend the problem.

**Do not proceed until you can state the problem in one sentence and JM agrees it's right.**

---

## Scope the Research

Once the problem is defined, propose a research plan. Use `AskUserQuestion` with `multiSelect: true` to let JM pick which streams to run.

### Always offer these options:

- **Competitive research** — how do other platforms solve this?
- **Codebase exploration** — what does the existing system already have?
- **External API/docs review** — relevant third-party API documentation
- **User evidence** — feature requests, support tickets, deal notes from `evidence_source`

### Also recommend streams Claude thinks would be valuable

Be specific based on the framing:

- "This touches payments — I'd recommend reviewing payment gateway docs for API patterns"
- "Construction domain — I'd suggest domain learning on lien waiver workflows before designing"
- "There's an existing API — I should audit the codebase to see what's reusable"

---

## Agree on Search Keywords

Before launching research, discuss keywords with JM. The same problem has multiple terms — customers, sales reps, and engineers all describe it differently.

1. Propose a keyword list based on the problem framing
2. Ask JM to refine
3. These keywords drive web searches, internal doc searches, and codebase exploration

---

## Exit Criteria

Phase 1 is complete when:

- [ ] Problem statement agreed (one sentence)
- [ ] Research streams selected
- [ ] Keywords agreed
- [ ] Ready to launch Phase 2
