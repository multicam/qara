# Platform Query Reference

Query templates, API patterns, and known limitations for community pulse research.

## Date Filter Syntax

| Platform | Syntax | Precision |
|----------|--------|-----------|
| WebSearch (Google) | `after:YYYY-MM-DD` | Approximate (~days) |
| HN Algolia | `numericFilters=created_at_i>{unix_timestamp}` | Exact (seconds) |
| Reddit .json | No native date filter — rely on WebSearch for discovery | N/A |
| YouTube | `after:YYYY-MM-DD` via WebSearch | Approximate |

## Reddit

### Discovery
```
site:reddit.com {topic} after:{date}
site:reddit.com {topic} best|recommended|experience after:{date}
```

### Thread JSON
Append `.json` to any Reddit URL to get structured data:
```
https://www.reddit.com/r/{subreddit}/comments/{id}/{slug}.json
```

Response is an array of two listings:
- `[0]` = the post (title, score, selftext, author)
- `[1]` = comments tree (each has body, score, replies)

### Rate Limits
- No API key needed for `.json` endpoints
- Rate limited to ~10 requests/minute without auth
- If blocked (429), fall back to WebFetch on the regular URL

### Subreddit Discovery
Extract subreddit names from WebSearch URLs. Common patterns:
- Programming: r/programming, r/webdev, r/typescript, r/node, r/svelte
- AI/ML: r/MachineLearning, r/LocalLLaMA, r/ClaudeAI, r/ChatGPT
- General: r/technology, r/AskProgramming

## Hacker News (Algolia API)

### Search Stories
```
https://hn.algolia.com/api/v1/search?query={topic}&tags=story&numericFilters=created_at_i>{unix}&hitsPerPage=10
```

Response fields: `hits[].objectID`, `.title`, `.points`, `.num_comments`, `.url`, `.created_at_i`

### Get Full Discussion
```
https://hn.algolia.com/api/v1/items/{objectID}
```

Response: full comment tree with `children[]`, each has `.text`, `.author`, `.points`

### Notes
- Public API, no authentication required
- No rate limit documented (be reasonable — max 10 requests per search)
- Returns stories sorted by relevance by default; sort by date with `search_by_date` endpoint:
  ```
  https://hn.algolia.com/api/v1/search_by_date?query={topic}&tags=story&numericFilters=created_at_i>{unix}
  ```

## X / Twitter

### Discovery (WebSearch only)
```
site:x.com OR site:twitter.com {topic} after:{date}
{topic} twitter thread viral after:{date}
```

### Limitations
- **No free API** — Twitter/X API requires paid access ($100/mo minimum)
- WebFetch on individual tweets is unreliable (X blocks scraping)
- WebSearch finds tweets indexed by Google — biased toward high-engagement content
- **Always mark X data as "limited coverage" in output**

### What works
- Google-indexed viral tweets and threads
- Blog posts and articles that embed tweets
- Nitter mirrors (when available)

## YouTube

### Discovery
```
site:youtube.com {topic} after:{date}
```

### Transcript Extraction
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download -o "/tmp/%(title)s" "{VIDEO_URL}"
```

The subtitle file will be at `/tmp/{title}.en.vtt` (WebVTT format).

### Notes
- Only extract first 15 minutes of transcript to manage context window
- Auto-generated subtitles have no punctuation — the LLM handles parsing
- Some videos have no subtitles (geo-restricted, music-only) — skip these
- View counts from WebSearch results are approximate

## General Web

### Discovery
```
{topic} community discussion blog post {year}
{topic} people are saying opinion {year}
{topic} review experience {year}
```

### Good Sources
- Medium / Substack articles
- Dev.to posts
- Podcast show notes (often transcribed)
- Stack Overflow discussions
- GitHub Discussions
- Product Hunt comments

## Unix Timestamp Calculation

For "last N days":
```typescript
const daysAgo = 30;
const unixTimestamp = Math.floor((Date.now() - daysAgo * 86400 * 1000) / 1000);
const isoDate = new Date(Date.now() - daysAgo * 86400 * 1000).toISOString().split('T')[0];
```
