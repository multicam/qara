---
name: story-explanation
context: fork
model: sonnet
description: |
  Create new narrative summaries from content. Formats: 3-part story, n-length with
  inline links, abridged 5-line, or comprehensive. Uses UltraThink for creative framing.
  USE WHEN: "explain as a story", "narrative summary", "story-format explanation".
  NOT for editing existing text — use humaniser to remove AI patterns from written text.
---

# Story Explanation - Narrative Summary with Creative Analysis

## Core Philosophy

Use extended thinking to analyze multiple narrative framings, then select the BEST one and present it in a compelling story format. Generic summaries use obvious framing without exploring alternatives — this skill counters mode collapse by deliberately exploring diverse angles before committing to one. Voice is first person, casual, direct, genuinely curious.

## Workflow Routing

This skill contains multiple workflows for different story explanation formats.

### Available Workflows

1. **`workflows/create.md`** - Main 3-part narrative (default)
   - **Use when:** User wants standard story explanation format
   - **Triggers:** "create story explanation", "story explanation", default workflow
   - **Output:** 3-part format (opening 15-25 words → body 5-15 sentences → closing 15-25 words)

2. **`workflows/create-with-links.md`** - N-length format with inline source links
   - **Use when:** User wants comprehensive narrative with source attribution
   - **Triggers:** "story explanation with links", "narrative with sources", "with inline citations"
   - **Output:** N sentences (default 25) with inline links after each sentence

3. **`workflows/create-abridged.md`** - Ultra-concise 5-line format (5-12 words per line)
   - **Use when:** User wants abbreviated format from URL, YouTube, or text
   - **Triggers:** "create abridged story explanation", "5-line summary", command: `/create-abridged-story-explanation`
   - **Output:** 5 lines with strict word limits

4. **`workflows/cse.md`** - Comprehensive explanation
   - **Use when:** User wants detailed narrative explanation
   - **Triggers:** "run CSE", "explain this story", command: `/cse`
   - **Output:** Complete narrative explanation

5. **`workflows/cse5.md`** - Clean 5-line numbered format
   - **Use when:** User wants scannable, numbered breakdown
   - **Triggers:** "explain in 5 lines", "CSE5", command: `/cse5`
   - **Output:** 5 numbered lines, one concept per line

### Routing Decision Tree

```
User request → Analyze intent:

├─ "with links" OR "inline sources" OR "with citations"
│  └─> workflows/create-with-links.md (N-length format with inline links)
│
├─ "abridged" OR "5-12 words per line"
│  └─> workflows/create-abridged.md
│
├─ "CSE5" OR "5 lines" OR "numbered"
│  └─> workflows/cse5.md
│
├─ "CSE" OR "comprehensive explanation"
│  └─> workflows/cse.md
│
└─ Default OR "story explanation"
   └─> workflows/create.md (3-part narrative)
```

### Command Routing
- `/create-story-explanation` → `workflows/create.md`
- `/create-story-output-links` → `workflows/create-with-links.md`
- `/create-abridged-story-explanation` → `workflows/create-abridged.md`
- `/cse` → `workflows/cse.md`
- `/cse5` → `workflows/cse5.md`

## UltraThink Protocol

Before writing, use extended thinking to explore the content across multiple narrative dimensions. This is not optional — it is the mechanism that produces non-obvious, high-quality framings.

1. Generate 5+ distinct narrative framings: vary the hook, emphasis, structure (chronological, problem-solution, comparison), and "wow" factor for each
2. Evaluate each framing on: hook strength, shareability, conversational naturalness, and how clearly it conveys significance
3. Select the single most compelling angle — the one a reader would most want to pass on
4. Proceed to write only after selection is complete

This replaces mode collapse with deliberate creative exploration. The goal is to find the framing that would make someone stop and say "I get it now."

## The Process

1. **Determine format** from user request using the routing decision tree above
2. **Extract content** via the appropriate method:
   - YouTube: `yt-dlp --write-auto-sub --sub-lang en --skip-download -o "/tmp/%(title)s" "URL"`, then read subtitle file
   - URLs/articles: `WebFetch(url, "Extract full content of this article")`
   - Other: paste text or read from files
3. **Run UltraThink Protocol** — explore 5+ framings, evaluate, select the best
4. **Write output** in the selected format using conversational voice
5. **Save to scratchpad** at `${PAI_DIR}/scratchpad/${CLAUDE_SESSION_ID}/story-explanation-[topic]/`

## Output Formats & Voice

**Full guide:** `references/voice-style-guide.md`

- **3-Part Narrative:** Opening (15-25 words) → Body (5-15 sentences) → Closing (15-25 words)
- **N-Length with Links:** User-specified sentences with inline source attribution
- **Conversational voice:** First person, casual, direct, genuinely curious
- **Avoid:** Cliches ("game-changer", "paradigm shift"), journalistic tone, extrapolation beyond the input

## File Organization

Working files (content, analysis, drafts, final output) go to scratchpad. Archive to history only when the analytical approach itself is exceptionally valuable for future reference.

**Full details:** `references/file-organization.md`

## Related Skills

**Use `research` instead when:** the goal is comprehensive analysis with multiple sources, or analytical extraction is preferred over narrative storytelling.

**Do not use** `social`, `writing`, or `media` as companion skills — they do not exist in this system.
