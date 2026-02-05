# Retrieve Workflow

Intelligent content retrieval system for DIFFICULT content retrieval. Uses built-in tools (WebFetch, WebSearch). USE ONLY WHEN user indicates difficulty: 'can't get this', 'having trouble', 'site is blocking', 'protected site', 'keeps giving CAPTCHA', 'won't let me scrape'. DO NOT use for simple 'read this page' or 'get content from' without indication of difficulty.

## Load Full PAI Context

**Before starting any task with this skill, load complete PAI context:**

`Skill("CORE")` or `read ${PAI_DIR}/skills/CORE/SKILL.md`

This provides access to:
- Stack preferences and tool configurations
- Security rules and repository safety protocols
- Response format requirements
- Personal preferences and operating instructions

## When to Use This Skill

**IMPORTANT:** This skill is for CHALLENGING content retrieval only, not routine fetching.

**DO USE this skill when user indicates difficulty:**
- "I can't get this content"
- "Having trouble retrieving this"
- "Site is blocking me"
- "Protected site" / "CloudFlare protected"
- "Keeps giving me CAPTCHA"
- "Won't let me scrape this"
- "Bot detection blocking me"
- "Rate limited when trying to get this"
- "Tried to fetch but failed"
- "Need advanced scraping for this"

**DO NOT use this skill for simple requests:**
- "Read this page" -> Use WebFetch directly
- "Get content from [URL]" -> Use WebFetch directly
- "What does this site say" -> Use WebFetch directly
- "Fetch this article" -> Use WebFetch directly
- "Check this URL" -> Use WebFetch directly

**Simple rule:** Only activate when user signals DIFFICULTY, not for routine content requests.

**NOT for research questions** - use the research skill instead for "research X" or "find information about X"

## Retrieval Strategy

### WebFetch Tool

**Best for:** Simple HTML pages, public content, one-off fetches

**Usage:**
```typescript
// Fetch and extract specific information
WebFetch({
  url: "https://example.com/page",
  prompt: "Extract the main article content and author name"
})
```

### WebSearch Tool

**Best for:** Finding content when you have keywords but not URLs

**Usage:**
```typescript
// Search for content, get URLs, then fetch them
WebSearch({
  query: "latest React 19 features documentation",
  allowed_domains: ["react.dev"]
})
```

## Error Handling

**When WebFetch fails:**
- HTTP 403 (Forbidden)
- HTTP 429 (Rate Limited)
- HTTP 503 (Service Unavailable)
- Empty content returned
- CAPTCHA challenge detected
- Bot detection messages

**Strategies:**
- Try alternative URLs for the same content
- Use WebSearch to find cached/mirrored versions
- Try fetching with a different prompt
- Report to user if site is inaccessible

## Scratchpad -> History Pattern

**Working Directory (Scratchpad):** `${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_retrieve-[site-or-topic]/`

**Process:**

1. **Scratchpad (Working Files - Temporary):**
   - Create timestamped directory for each retrieval task
   - Store raw scraped content (HTML, markdown, JSON)
   - Keep intermediate processing notes
   - Save error logs and retry attempts
   - Draft extracted data and transformations

2. **History (Permanent Archive):**
   - Move to `${PAI_DIR}/history/research/YYYY-MM-DD_[description]/` when complete
   - Include: `README.md`, final extracted content, metadata
   - Archive for future reference and reuse

3. **Verification (MANDATORY):**
   - Check if hooks captured output to history automatically
   - If hooks failed, manually save to history
   - Confirm all files present in history directory

## Quick Reference

- Always try WebFetch first
- Use WebSearch to find alternative sources if blocked
- Document what was tried and why it failed
- Save valuable retrieved content to history, not scratchpad
