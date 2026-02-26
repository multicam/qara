You are executing the story-explanation skill to generate a TECHNICAL NARRATIVE using Gemini 3 Pro for deep reasoning on complex technical content.

**CRITICAL DISTINCTION:**

This workflow is for **TECHNICAL storytelling** (algorithms, systems, engineering evolution), NOT general narratives:

- **Regular story-explanation workflows**: Human-centric stories, creative narratives, general audiences, UltraThink
- **THIS workflow (technical-storytelling-gemini-3)**: Technical narratives, engineering journeys, algorithm evolution, technical audiences, Gemini 3 Pro

**WHEN TO USE THIS WORKFLOW:**
- Explaining how distributed consensus algorithms evolved (Paxos → Raft)
- Narrating architecture migration journeys (monolith → microservices)
- Algorithm development stories (PageRank, Transformer architecture)
- Technical debugging narratives (finding complex race conditions)
- Research breakthrough stories (AlphaFold protein folding)
- Engineering decision explanations (why React chose virtual DOM)
- System architecture evolution (how Kubernetes components evolved together)

**WHEN TO USE REGULAR WORKFLOWS:**
- Business decision stories
- Team conflict narratives
- Product launch stories
- Human-centric content

---

**PARSE USER REQUEST:**

Analyze the user's request to determine:

1. **Technical content source:**
   - Research papers (arXiv, ACM, IEEE)?
   - Technical documentation (architecture docs, RFCs)?
   - Code repositories (implementations, pull requests)?
   - Engineering blog posts (technical deep dives)?
   - Conference talks (technical presentations)?
   - Multiple sources requiring synthesis?

2. **Technical narrative type:**
   - Algorithm evolution story (how concept developed over time)
   - Engineering decision journey (why choices were made)
   - System architecture explanation (how components work together)
   - Technical problem-solving narrative (debugging complex systems)
   - Technology breakthrough story (research to production)

3. **Story length:**
   - Did user specify length? (e.g., "15 sentences", "detailed technical narrative")
   - Default: 10-15 sentences for technical depth

4. **Audience technical level:**
   - Did user specify? (e.g., "for senior engineers", "distributed systems experts")
   - Default: Technical professionals who value accuracy + narrative

---

**WORKFLOW:**

## STEP 1: Gather Technical Content

**If research paper URLs (arXiv, ACM, IEEE):**
```bash
# Download and extract paper content
llm -m gemini-3-pro-preview "Extract the complete technical content from this research paper, including:
- Abstract and introduction
- Key algorithms and mathematical formulations
- Methodology and implementation details
- Results and evaluation
- Related work and evolution context

Paper URL: [URL]"
```

**If technical documentation:**
```typescript
WebFetch(url, "Extract complete technical documentation including architecture diagrams, design decisions, and implementation details")
```

**If code repository:**
- Read relevant source files
- Extract commit history for evolution narrative
- Collect pull request discussions for decision context

**If engineering blog posts:**
```typescript
WebFetch(url, "Extract technical deep dive content including problem statement, solution evolution, and implementation details")
```

**If multiple technical sources:**
- Gather all papers, docs, code, blog posts
- Prepare for cross-source synthesis
- Map technical evolution across sources

## STEP 2: Create Technical Scratchpad

```bash
mkdir -p ${PAI_DIR}/scratchpad/$(date +%Y-%m-%d-%H%M%S)_technical-storytelling-[topic]/
```

Save:
- `raw-technical-content.md` - Extracted papers, docs, code
- `technical-timeline.md` - Chronological evolution of concepts
- `key-decisions.md` - Engineering choices and reasoning
- `technical-accuracy-notes.md` - Mathematical/algorithmic verification

## STEP 3: Gemini 3 Pro Technical Analysis

Use Gemini 3 Pro's deep reasoning for technical narrative framing:

```bash
llm -m gemini-3-pro-preview "TECHNICAL NARRATIVE ANALYSIS MODE:

You are analyzing technical content to create a compelling narrative that maintains complete technical accuracy while telling an engaging story.

CONTENT TYPE: [algorithm evolution / engineering journey / system architecture / debugging narrative / breakthrough story]

DEEP REASONING PROTOCOL:

1. TECHNICAL CHRONOLOGY:
   - What was the original problem or limitation?
   - What early attempts were made? (with technical details)
   - What were the breakthrough insights? (mathematical or algorithmic)
   - How did the solution evolve over time?
   - What is the current state of the art?

2. ENGINEERING REASONING:
   - WHY were specific design decisions made?
   - What tradeoffs were considered? (performance vs complexity, consistency vs availability, etc.)
   - What constraints shaped the solution? (hardware, theoretical, practical)
   - How did understanding deepen over iterations?
   - What were the key technical inflection points?

3. MATHEMATICAL/ALGORITHMIC PRECISION:
   - Verify correctness of algorithms and formulas
   - Ensure time/space complexity is accurate
   - Validate system properties (consistency, availability, partition tolerance)
   - Check that technical claims are precise and verifiable

4. NARRATIVE ARC IDENTIFICATION:
   - What's the compelling story in this technical evolution?
   - Where's the dramatic tension? (unsolved problem, failed approaches, breakthrough moment)
   - What's the human element? (engineers struggling, insights emerging, paradigms shifting)
   - How does understanding build progressively?
   - What's the "aha!" moment that changed everything?

5. TECHNICAL AUDIENCE FRAMING:
   - How would a senior engineer want this explained?
   - What level of detail preserves accuracy without overwhelming?
   - Which technical specifics are critical vs nice-to-have?
   - What would make technical readers think "finally, someone explained this properly"?

6. DANIEL'S TECHNICAL VOICE:
   - First person, but technically precise
   - Casual explanation of complex concepts
   - Genuine curiosity about HOW and WHY things work
   - Connect technical details to bigger picture
   - Accessible WITHOUT sacrificing accuracy

7. STORY STRUCTURE OPTIONS:
   - Problem → Failed Attempts → Breakthrough → Impact
   - Simple → Complex → Simple Again (abstractions emerging)
   - Single Insight → Cascading Implications
   - Chronological Evolution with Deepening Understanding
   - Comparison (Old Way → New Way, Why Change Matters)

8. TECHNICAL ACCURACY VALIDATION:
   - Are algorithms described correctly?
   - Are time/space complexities accurate?
   - Are system properties (CAP theorem, consistency models) precise?
   - Are mathematical formulations correct?
   - Are tradeoffs explained accurately?

9. COMPELLING TECHNICAL HOOK:
   - What technical insight would make engineers lean forward?
   - What's surprising or counterintuitive?
   - What conventional wisdom gets challenged?
   - What elegant solution emerged from complex problem?

10. BEST TECHNICAL FRAMING:
   - Which narrative angle is most compelling AND accurate?
   - Does it honor the technical complexity while making it accessible?
   - Would experts appreciate the precision AND the storytelling?
   - Does it capture both the WHAT and the WHY?

SELECT THE SINGLE BEST TECHNICAL FRAMING that:
- Maintains complete technical accuracy (algorithms, math, systems)
- Builds clear narrative arc (problem → evolution → breakthrough → impact)
- Explains WHY engineering decisions were made
- Shows how understanding deepened over time
- Makes technical concepts accessible WITHOUT losing precision
- Would make technical professionals excited to share
- Feels natural in Daniel's voice (first person, curious, precise)

TECHNICAL CONTENT TO ANALYZE:
[PASTE PAPERS, DOCS, CODE, ARCHITECTURE]"
```

Save Gemini 3 analysis output to:
- `gemini-technical-analysis.md` in scratchpad

---

**Continued in:** `technical-storytelling-gemini-3-execution.md` (Steps 4–9: Technical Accuracy Verification, Narrative Generation, Validation, Formatting, Saving, and Presentation)
