# Workflow: Community Pulse

Multi-platform sentiment research — what people say, upvote, share about a topic.

-> **READ:** `../references/platform-queries.md` for platform query templates

## Phase 1: Parse Intent [DETERMINISTIC]

Extract: `topic`, `timeWindow` (default 30 days), `platforms` (default all), `mode`.

| Mode | Platforms | Thread reads | YouTube transcripts | Timeout |
|------|-----------|-------------|---------------------|---------|
| Quick | Reddit + HN | 0 | 0 | 2 min |
| Standard | All 5 | 3-4 | 1 | 4 min |
| Extensive | All 5 | 6-8 | 2-3 | 8 min |

Date boundary:
- WebSearch: `after:YYYY-MM-DD`
- HN Algolia: Unix timestamp for `created_at_i`

Or use the deterministic tool:
```bash
bun ${PAI_DIR}/skills/research/tools/community-pulse.ts --topic "{topic}" --days {N} --platforms reddit,hn,youtube,x,web
```

## Phase 2: Parallel Platform Search [AGENTIC]

Launch ALL searches in a **single message**. Do not serialize.

### Reddit

```
WebSearch("site:reddit.com {topic} after:{date}")
WebSearch("site:reddit.com {topic} best|recommended|experience after:{date}")
```

Thread detail (append `.json` to thread URL):
```
WebFetch({ url: "https://www.reddit.com/r/{sub}/comments/{id}/.json", prompt: "Extract: post title, score, top 10 comments with scores, comment themes" })
```

### Hacker News

```
WebFetch({
  url: "https://hn.algolia.com/api/v1/search?query={topic}&tags=story&numericFilters=created_at_i>{unix}&hitsPerPage=10",
  prompt: "Extract: objectIDs, titles, points, num_comments sorted by points"
})
```

Top 2-3 stories:
```
WebFetch({
  url: "https://hn.algolia.com/api/v1/items/{objectID}",
  prompt: "Extract: title, points, top-level comments, themes"
})
```

### X/Twitter (no free API — lower coverage)

```
WebSearch("site:x.com OR site:twitter.com {topic} after:{date}")
WebSearch("{topic} twitter thread viral after:{date}")
```

Mark X data as **lower-coverage**. WebSearch biases toward viral content (useful signal).

### YouTube

```
WebSearch("site:youtube.com {topic} after:{date}")
```

Extract transcripts for top 1-2 via yt-dlp:
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download -o "/tmp/%(title)s" "{URL}"
```

Read subtitle file. First 15 minutes only.

### General Web

```
WebSearch("{topic} community discussion blog post {year}")
WebSearch("{topic} people are saying opinion {year}")
```

Catches Medium, Substack, podcast notes, minor forums.

## Phase 3: Synthesize [AGENTIC]

Analyze across 5 dimensions:

1. **Dominant Narratives** — 3-5 main themes, grouped by theme not platform
2. **Signal Strength** — rank by engagement; distinguish "many people" from "one viral post"
3. **Sentiment Distribution** — positive/negative/mixed/neutral per theme with quotes
4. **Contrarian Views** — high-upvote comments disagreeing with posts, top comments contradicting titles
5. **Temporal Trends** — increasing/decreasing/stable, inflection points

**Cite specific sources with numbers.** "r/programming (245 upvotes)", "HN (187 points)".

## Phase 4: Structured Output [DETERMINISTIC]

```markdown
# Community Pulse: {topic}
**Period:** {start} to {end} ({N} days)
**Platforms:** {list}
**Mode:** {Quick|Standard|Extensive}

## TL;DR
[2-3 sentences]

## Dominant Narratives

### 1. {Theme}
**Sentiment:** {Positive|Negative|Mixed|Neutral}
**Signal:** {Strong|Moderate|Weak} ({evidence})
**Summary:** [2-3 sentences]
**Voices:**
- "{quote}" — r/{sub} ({score} upvotes)
- "{quote}" — HN ({points} points)

### 2. {Theme}
[same structure]

## Contrarian & Minority Views
- {view} — Source ({engagement})

## Platform Highlights

### Reddit
- Top thread: [{title}]({url}) ({score}, {comments})
- Active subs: r/{sub1}, r/{sub2}

### Hacker News
- Top: [{title}]({url}) ({points})

### X/Twitter
- [limited coverage — no API]

### YouTube
- Top: [{title}]({url}) ({views})

## Trend Signal
{Increasing|Decreasing|Stable|Spiking} — {evidence}

## Confidence
| Dimension | Level | Rationale |
|-----------|-------|-----------|
| Coverage | {H/M/L} | {platforms returning data} |
| Recency | {H/M/L} | {content within window} |
| Signal Quality | {H/M/L} | {engagement vs noise} |

## Sources
- [Source](URL)
```

Save to:
- Working: `${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_pulse-{topic}/`
- Permanent: `${PAI_DIR}/history/research/YYYY-MM/YYYY-MM-DD_pulse-{topic}/README.md`

## Background Execution

"background community pulse on {topic}" → launch with `run_in_background: true`, write to scratchpad, notify on completion.
