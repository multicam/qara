# Feature: Research Tools

## Context
community-pulse.ts fetches and parses data from 5 platforms (Reddit, HN, X, YouTube, web) for community sentiment research. Query generation and date arithmetic are pure logic; HN Algolia is the only direct API call.

## Scenarios

### Scenario: Generate Reddit search queries
- **Given** topic "Claude Code" and date boundary "2026-03-06"
- **When** query generator runs for Reddit
- **Then** output contains `site:reddit.com Claude Code after:2026-03-06`
- **And** output contains a second query with `best|recommended|experience`
- **Priority:** critical

### Scenario: Generate HN Algolia API URL
- **Given** topic "TDD" and unix timestamp 1772826839
- **When** HN search URL is generated
- **Then** URL contains `query=TDD` (URL-encoded)
- **And** URL contains `numericFilters=created_at_i>1772826839`
- **And** URL contains `hitsPerPage=10`
- **Priority:** critical

### Scenario: Calculate date boundary from days
- **Given** current date and lookback of 20 days
- **When** date config is computed
- **Then** isoDate is 20 days before today in YYYY-MM-DD format
- **And** unixTimestamp matches the same boundary as epoch seconds
- **Priority:** critical

### Scenario: Fetch HN stories and sort by points
- **Given** HN Algolia returns 10 stories with varying point counts
- **When** HN fetch completes
- **Then** stories are sorted by points descending
- **And** each story has objectID, title, points, discussionUrl, detailApiUrl
- **Priority:** critical

### Scenario: Handle HN API failure gracefully
- **Given** HN Algolia returns HTTP 500
- **When** HN fetch runs
- **Then** result has `error: "HN Algolia returned 500"`
- **And** data array is empty
- **And** no exception is thrown
- **Priority:** important

### Scenario: CLI outputs full JSON structure
- **Given** topic "AI testing", days 30, platforms reddit,hn
- **When** CLI runs with those args
- **Then** output is valid JSON with config.topic, config.days, config.dateRange
- **And** results.reddit has queries array
- **And** results.hn has data array (from API)
- **Priority:** critical

### Scenario: Platform filtering
- **Given** platforms flag is "hn,web" (excluding reddit, x, youtube)
- **When** CLI runs
- **Then** results object has keys "hn" and "web" only
- **And** reddit, x, youtube are absent
- **Priority:** important

## Out of Scope
- Testing actual network calls to Reddit, X, YouTube (WebSearch-dependent)
- Testing yt-dlp transcript extraction
- Rate limiting or retry logic

## Acceptance Criteria
- [ ] All query generators tested with exact output matching
- [ ] Date arithmetic tested across timezone boundaries
- [ ] HN API mocked for success and failure paths
- [ ] CLI JSON structure validated
