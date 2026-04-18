---
name: design-research
context: same
description: |
  Design research: mood boards, competitive analysis, inspiration. Collects references, extracts patterns, produces research briefs.
  USE WHEN: "mood board", "competitive analysis", "design research", "inspiration", "find references".
version: 1.0.0
user-invocable: true
argument-hint: "[moodboard|competitive|inspiration] [target]"
---

Design research and inspiration collection. Three modes: moodboard (visual references + pattern extraction), competitive (competitor analysis), inspiration (direction-based reference gathering). Produces structured research briefs that feed into shape's design brief.

Fills the research/inspiration lifecycle gap in the design pipeline.

## Workflow Routing (SYSTEM PROMPT)

Three modes. Select by argument or infer from phrasing.

- Argument `moodboard` OR phrasing "mood board / visual reference / collect references / extract patterns from" → `## Mode: moodboard`
- Argument `competitive` OR phrasing "competitive analysis / competitor design / how does X compare" → `## Mode: competitive`
- Argument `inspiration` OR phrasing "inspiration / what does X look like / design direction / find references for" → `## Mode: inspiration`

If intent is ambiguous, ask which mode.

## MANDATORY PREPARATION

Design Context must be loaded (see CORE's Design Context Session Guard). Design research produces generic output without project context — brand, audience, product type. If not loaded, run `/impeccable teach` first.

Additionally gather:
- **Project type** — web app, marketing site, component library, other
- **Design direction** — any existing brand words or personality direction
- **Constraints** — technical (framework), audience (technical level), platform

---

## Mode: moodboard

Collect visual references and extract design patterns from 3-5 URLs or screenshots.

### Process

1. **Frame scope** — what are we researching? A specific page type (landing, dashboard, pricing), a visual direction (premium, playful, editorial), or a complete brand?

2. **Capture** — for each URL:
   - Use devtools-mcp to open and take full-page screenshot
   - Extract computed styles: color palette, typography, spacing, border radius, shadows
   - Note distinctive patterns: layout approach, illustration style, photo treatment, animation approach

3. **Extract patterns** — across all references, identify:
   - **Color patterns** — common palette structures, accent usage, neutral treatment
   - **Typography patterns** — font pairing approaches, size scales, weight distribution
   - **Layout patterns** — grid approaches, content density, whitespace philosophy
   - **Motion patterns** — animation style, timing, interactive feedback approach
   - **Tone patterns** — copy voice, personality signals, emotional register

4. **Synthesize** — group findings into actionable design directions.

### Output: Pattern Synthesis

For each pattern cluster found across references:
- Pattern name and description
- Which references exhibit it (with specific examples)
- How it could apply to the current project
- Trade-offs and considerations

---

## Mode: competitive

Analyze 2-5 competitor products for design patterns, commonalities, and differentiators.

### Process

1. **Frame scope** — which competitors? What dimensions to compare? (visual design, IA, interaction patterns, content strategy, onboarding)

2. **Analyze each competitor** — for each:
   - Use devtools-mcp to screenshot key screens (home, pricing, dashboard, mobile)
   - Extract visual tokens (colors, typography, spacing)
   - Map IA structure (navigation, hierarchy, content organization)
   - Document interaction patterns (onboarding flow, CTAs, state transitions)
   - Note distinctive design choices and personality signals

3. **Cross-competitor synthesis:**
   - **Common patterns** — what do most competitors do? (table stakes)
   - **Differentiators** — what makes each unique?
   - **Gaps** — what is nobody doing well? (opportunity)
   - **Visual language norms** — shared conventions for this product category

### Output: Competitive Landscape Matrix

| Dimension | Competitor A | Competitor B | Competitor C | Common? | Opportunity? |
|-----------|-------------|-------------|-------------|---------|-------------|
| Color approach | | | | | |
| Typography | | | | | |
| IA structure | | | | | |
| Onboarding | | | | | |
| Personality | | | | | |
| Key differentiator | | | | | |

Plus: summary of table stakes (must-haves), opportunities (gaps to exploit), and risks (patterns to avoid).

---

## Mode: inspiration

Given a design direction keyword, pull references from Diderot vault + web search.

### Process

1. **Frame direction** — user provides a direction keyword or phrase (e.g., "brutalist", "editorial", "cinematic", "Japanese minimalism", "retro-futurism"). Clarify if ambiguous.

2. **Diderot search** — use the `/diderot` skill (not direct file search) to run semantic search against the knowledge vault:
   - Search for the direction keyword and related terms
   - Pull any relevant design notes, case studies, or pattern analyses
   - Note any existing project decisions related to this direction

3. **Web search** — find:
   - Real-world examples of this design direction
   - Design system references (color, typography, layout patterns)
   - Articles analyzing the aesthetic principles
   - Tools or resources for achieving the look

4. **Curate** — select the 5-8 most relevant and actionable references. For each, annotate:
   - What makes it a good reference
   - Specific elements to borrow (color approach, type pairing, layout strategy)
   - How it translates to the current project's constraints

### Output: Curated Reference Collection

For each reference:
- Source (URL, Diderot note path, or image)
- Annotation (what's relevant, what to borrow)
- Applicability to current project (high/medium/low)
- Specific extractable elements (colors, fonts, layout, motion)

---

## Research Brief Format

Every mode produces a structured research brief with both machine-consumable sections and a human-readable summary:

### Structure

```markdown
# Research Brief — [Topic]

## 1. Scope
What was researched and why. Connection to current project.

## 2. References Collected
| # | Source | Type | Annotation |
|---|--------|------|------------|
| 1 | URL/path | website/note/screenshot | Why it's relevant |

## 3. Pattern Extraction
### Colors
[Findings with specific values]

### Typography
[Findings with specific values]

### Layout
[Findings with specific patterns]

### Motion & Interaction
[Findings]

### Tone & Personality
[Findings]

## 4. Design Direction Recommendations
2-3 directions with rationale:
- Direction A: [name] — [1-2 sentence rationale]. Risk: [consideration].
- Direction B: [name] — [rationale]. Risk: [consideration].

## 5. Hand-off Notes
Which sections of shape's design brief this research informs:
- Design Direction → shape's "Design Direction" section
- Typography patterns → shape's "Content Requirements"
- Layout patterns → shape's "Layout Strategy"
- Competitive gaps → shape's "Open Questions"
```

---

## Hand-off

Research briefs feed directly into downstream skills:
- `/shape` — design brief uses research output (direction, patterns, references)
- `/design-it-twice` — constraints derived from competitive analysis
- `/design-system generate` — brand tokens from moodboard extraction
- `/impeccable teach` — research can inform the design context document

**Non-goals:**
- Don't build screens. Research describes direction; implementation is downstream.
- Don't make design decisions. Research presents options; the user decides.
- Don't skip the Context Gathering Protocol. Generic research = generic design.

Doctrine: `../impeccable/reference/{typography, color-and-contrast, spatial-design}.md` for pattern classification.
