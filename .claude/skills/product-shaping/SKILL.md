---
name: product-shaping
description: |
    Product shaping workflow -- from problem framing through research and specs.
    Use when: (1) scoping a new product or feature, (2) writing specs for a feature, (3) researching competitors for a product decision, (4) gathering user evidence form asana/slack, (5) auditing the codebase for existing infrastructure.
triggers: ["product-shaping"], "shape", "spec", "new feature", "scope this", "research competitors", "user evidence", "codebase audit"

---

# Product Shaping

Three-phases workflow for turning a product idea into a validated spec with a clear validatioon plan.

**Output:** spec-draft.md (local) + validation plan (what to build/test to increase confidence)

## Trigger

User says "shape", "spec", "new feature", or starts scoping a new product investment.

---

`codebase`: /media/ssdev/tgds
`server`: ~/server
---

## Claude's Role

You are a thinking partner, not a scribe. Throughout every phase:

- **Push for simplicity.** If a design take mare than 2 sentences to explain, it's too complex. Ask "do we actually need this?"
- **Surface tradeoffs.** Don't present options neutrally -- have a recommendation and defend it.
- **Question scope.** Every requirement should earn its place. If you can't point to evidence, push back.
- **Keep things tight.** No artifacts "for completeness". Every sentence, every section, every file earns its spot.
- **Use 'writing voice'** when writing spec content. Lead with the punch, be declarative, kill LLM tells.

---

## Phase 1: Frame + Scope Research

*Goal: define the problem statement and decide research to do.*

### Define the problem

Ask and push on:

1. **What's  the job to be done?** Not the feature description -- what are we trying to accomplish?
2. **Why now?** What changed that makes this worth investing in?
3. **What does success look like?** If we ship this perfectly, what's different in 6 months?
4. **Who is the first customer?** Partner, associate, or end-user?
5. **What's the appetite?** Big bet, or small bet? This constrains the shape.
6. **What we can do with this beyond the feature?** Think leverage -- can we re-use this in other projects or features? Use it against competitors that lack it? Unlock a vertical? Always push: "If we build this, what does it unlock?"

Push hard here:
- **Is this unique product thinking?** Is this just replicating what exists, or pushing the boundaries of what's possible?
- **Why are we building this?** Don’t accept the framing at face value. Make JM defend the problem. 

Don't proceed until you can state the problem in one sentence and JM agrees it's right.

### Scope the research 

Once the problem is defined, propose a research plan. Use AskUserQuestion with multiSelect to let Teddy pick which streams to run:

**Always offer these options:**
- Competitive research (how do other platforms solve this?)
- Codebase exploration (what does TGDS already have?)
- External API/docs review &relevant third-party API documentation)
- Asana extracts (what's in progress, what's blocked, what's done?)

**Also recommend streams Claude thinks would be valuable** based on the framing. Be specific:
- his touches payments — I'd recommend reviewing Eway docs for API patterns
- Construction domain — I'd suggest domain learning on lien waiver workflows before designing
- There's an existing API — I should audit the codebase to see what's reusable

### Agree on search keywords

Before launching research, discuss keywords with JM. The same problem has multiple terms — customers, sales 3 reps, and engineers all describe it differently. Propose a keyword list and ask JM to refine. These keywords drive searches, diderot note searches, and codebase exploration.

---

### Phase 2: Research

*Goal: build the evidence base. AI does 80% of the work here.*
*Output: research files in the project's `thoughts/research/` folder.

### Executions

Launch all selected streams simultaneously. Maximise parallelisation - use as many concurrent sub-agents as possible. use `model: "opus"` far all research agents (Opus 4.6 produces significantly better research and synthesis than smaller models).

**Every research stream must produce a file.** All findings go into the project's `thoughts/research/` folder as - standalone markdown files. This ensures future sessions can reference structured research instead of re-doing it.

| Stream | Output file |
|--------|-------------|
| Competitive research | `thoughts/research/competitive.md` |
| Codebase exploration | `thoughts/research/codebase.md` |
| External API/docs review | `thoughts/research/api.md` |
| Asana extracts | `thoughts/research/asana.md` |

#### Competitors

How do others solve this job to be done?

- Launch one agent per platform in parallel (6-10 agents) with `run_in_background: true, model: "opus"`
- Each agent: 3-5 web searches + 2-4 page fetches
- Give each agent the framing from Phase 1 so they search with the right lens
- Each agent writes `thoughts/research/{platform-name}.md`
- After all complete, synthesize into `thoughts/research/best-practices.md` : patterns, anti-patterns, how they handle our open questions

**Gotcha** Review sites return 403 on WebFetch, use gemini-researcher as fallback.

#### User Evidence

What are the user saying about the problem? Use the Asana dumps for feature requests.

#### System Audit

What does TGDS already have that's relevant?

Most TGDS code is in the `codebase` and `server` folder. Use codebase-analyser agent to audit the codebase and generate a report in `thoughts/research/codebase-analysis.md` 

- Existing user flows this feature touches 
- Data models, API surfaces, DB schemas 
- Integration points
- What can be reused vs. what's net new
- Internal docs, diderot, prior art 

### After research completes

Present a synthesis to JM. Don't dump raw findings — distill into: 
1. Key patterns from competitors (what the best platforms do, what to avoid)
2. Customer signal strength (how many deals, what stage, attributed quotes) 
3. what TGDS already has (what's reusable, what's missing) 
4. Initial list of open questions the research surfaced

---

## Phase 3: Shape

*Goal: converge on a design through conversation.*
*Output: ‘spec-draft.md’ (local) + validation plan.* 

This is conversational, not template-driven. The shape emerges from iterating with JM on the research. 

Claude's job:

1. **Present research synthesis** as a starting point 
2. **Ask pointed questions** that force design decisions: "Should this be a new API or extend the existing one? " "Do you need X or is that scope creep?” 
3. **Surface competitor patterns** when relevant: "Stripe does X, Unit does Y — which fits our constraints?" 
4. **Track requirements** using R-notation (R0, R1, R2...). Ground each in evidence. Challenge any that can't be grounded. 
5. **Mine all docs for closed questions** — things already decided in internal or users reports. Don't re-litigate settled decisions. 
6. **Track open questions** — things we need customer input or internal alignment on.

### when multiple shapes emerge

Sometimes the conversation naturally produces 2-3 distinct approaches. When that happens, capture them with a lightweight comparison:

|                    | Shape A: [Name] | Shape B: [Name] | Shape C: [Name] |
|--------------------|---|---|---|
| **Key idea**       | | | |
| **Reuse**          | | | |
| **Trade-off**      | | | |
| **Recommendation** | | | |

Not required. If the conversation converges on one shape, document the decision rationale and move on.

### Spec Format

Write locally to "spec-draft.md’ in the project folder. Use ‘writing-voice' for tone. Keep it tight — 2@ lines max for context, ideally less. Readable in 2 minutes.

```markdown
# [Feature Name] 

## Context 
[High-level context. <=20 lines. Problem statement, why now, who it's for.] 

## Principles
[Design principles and kq requirements that constrain the solution. These are the non-negotiable truths the design must respect.] 

## Design 
[The proposed design. High-level architecture: endpoints, happy path, flow diagram if helpful. "What" not "How"]

## Alternatives
[Other shapes considered, if any. Why they were rejected]

## Open Questions
[What we still need to figure out. For each: why it matters.]

## Closed Questions
[Decisions already made, with source]

## Validation Plan
[What open question would make us change our mind? 
What's the most valuable next step to build a prototype, feature, document, or validate a hypothesis?]

```

