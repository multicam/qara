# Workflow: Community Pulse

Multi-platform community sentiment research. What people are actually saying, upvoting, and sharing about a topic.

-> **READ:** `../references/platform-queries.md` for platform-specific query templates and API patterns

## Phase 1: Parse Intent [DETERMINISTIC]

Extract from the user's request:
- **topic**: the subject to research
- **timeWindow**: days to look back (default: 30)
- **platforms**: which to include (default: all — Reddit, HN, X, YouTube, Web)
- **mode**: Quick / Standard / Extensive

| Mode | Platforms | Thread reads | YouTube transcripts | Timeout |
|------|-----------|-------------|---------------------|---------|
| Quick | Reddit + HN | 0 | 0 | 2 min |
| Standard (default) | All 5 | 3-4 top | 1 | 4 min |
| Extensive | All 5 | 6-8 top | 2-3 | 8 min |

Calculate date boundary:
- WebSearch: `after:YYYY-MM-DD` format
- HN Algolia: Unix timestamp for `created_at_i` filter

Or use the deterministic tool:
```bash
bun ${PAI_DIR}/skills/research/tools/community-pulse.ts --topic "{topic}" --days {N} --platforms reddit,hn,youtube,x,web
```

## Phase 2: Parallel Platform Search [AGENTIC]

Launch ALL platform searches in a **single message** using parallel tool calls. Do not serialize.

### Reddit (2 searches + top thread fetches)

```
WebSearch("site:reddit.com {topic} after:{date}")
WebSearch("site:reddit.com {topic} best|recommended|experience after:{date}")
```

For top results, fetch the Reddit JSON endpoint (append `.json` to the thread URL):
```
WebFetch({ url: "https://www.reddit.com/r/{subreddit}/comments/{id}/.json", prompt: "Extract: post title, score, top 10 comments with scores, comment themes" })
```

### Hacker News (1 API fetch + top story fetches)

```
WebFetch({
  url: "https://hn.algolia.com/api/v1/search?query={topic}&tags=story&numericFilters=created_at_i>{unixTimestamp}&hitsPerPage=10",
  prompt: "Extract: objectIDs, titles, points, num_comments for top results sorted by points"
})
```

For top 2-3 stories by points:
```
WebFetch({
  url: "https://hn.algolia.com/api/v1/items/{objectID}",
  prompt: "Extract: title, points, top-level comments text, key themes and opinions"
})
```

### X/Twitter (2 searches — no free API, accepted limitation)

```
WebSearch("site:x.com OR site:twitter.com {topic} after:{date}")
WebSearch("{topic} twitter thread viral after:{date}")
```

Mark X data as **lower-coverage** in output. WebSearch finds high-engagement tweets indexed by search engines, which biases toward viral content (useful signal).

### YouTube (1 search + transcript extraction)

```
WebSearch("site:youtube.com {topic} after:{date}")
```

For top 1-2 results, extract transcripts via yt-dlp:
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download -o "/tmp/%(title)s" "{VIDEO_URL}"
```

Then read the subtitle file. Only extract first 15 minutes of transcript to manage context.

### General Web (1-2 searches)

```
WebSearch("{topic} community discussion blog post {year}")
WebSearch("{topic} people are saying opinion {year}")
```

Catches Medium, Substack, podcast show notes, forums outside the major platforms.

## Phase 3: Synthesize [AGENTIC]

Analyze all collected data across **5 dimensions**:

1. **Dominant Narratives** — What are the 3-5 main things people are saying? Group by theme, not by platform.
2. **Signal Strength** — Rank themes by engagement (upvotes, comments, shares, views). Distinguish "many people mentioned this" from "one viral post about this."
3. **Sentiment Distribution** — For each theme: positive/negative/mixed/neutral with representative quotes.
4. **Contrarian Views** — Minority opinions getting traction. Highly upvoted comments that disagree with the post. Threads where the top comment contradicts the title.
5. **Temporal Trends** — Is discussion increasing, decreasing, or stable? Any inflection points?

**Cite specific sources with numbers.** "On r/programming (245 upvotes)..." or "HN discussion with 187 points..."

## Phase 4: Structured Output [DETERMINISTIC]

```markdown
# Community Pulse: {topic}
**Period:** {start_date} to {end_date} ({N} days)
**Platforms:** {list}
**Mode:** {Quick|Standard|Extensive}

## TL;DR
[2-3 sentence summary]

## Dominant Narratives

### 1. {Theme Name}
**Sentiment:** {Positive|Negative|Mixed|Neutral}
**Signal:** {Strong|Moderate|Weak} ({engagement evidence})
**Summary:** [2-3 sentences]
**Voices:**
- "{quote}" — r/{subreddit} ({score} upvotes)
- "{quote}" — HN ({points} points)

### 2. {Theme Name}
[same structure]

### 3. {Theme Name}
[same structure]

## Contrarian & Minority Views
- {view} — Source ({engagement})

## Platform Highlights

### Reddit
- Top thread: [{title}]({url}) ({score} upvotes, {comments} comments)
- Active subreddits: r/{sub1}, r/{sub2}

### Hacker News
- Top discussion: [{title}]({url}) ({points} points)

### X/Twitter
- Notable tweets found: [limited coverage — no API access]

### YouTube
- Top video: [{title}]({url}) ({views} views)

## Trend Signal
{Increasing|Decreasing|Stable|Spiking} — {evidence}

## Confidence
| Dimension | Level | Rationale |
|-----------|-------|-----------|
| Coverage | {H/M/L} | {which platforms returned good data} |
| Recency | {H/M/L} | {how much content fell within time window} |
| Signal Quality | {H/M/L} | {engagement metrics vs noise} |

## Sources
- [Source 1](URL)
- [Source 2](URL)
```

Save output to:
- **Working:** `${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_pulse-{topic}/`
- **Permanent:** `${PAI_DIR}/history/research/YYYY-MM/YYYY-MM-DD_pulse-{topic}/README.md`

## Background Execution

Supports `run_in_background: true`. When invoked with "background community pulse on {topic}":
1. Launch with background flag
2. Write results to scratchpad
3. Notify when complete
