# Dynamic Context Loading Rules

Match by semantic intent, not string patterns. Examples illustrate the TYPE of request.

---

## Conversational / Philosophical

**Intent:** knowledge from training, philosophy, life advice, abstract concepts, general chat.

**Examples:** "what do you think about", "let's discuss", "is there free will?", "I'm curious about"

**Action:** Conversational mode. Use reasoning without web searches. Natural tone, no structured output.

---

## Research / Information Gathering

**Intent:** finding info, current events, investigation, latest updates, learning.

**Examples:** "research", "look up", "tell me about X", "what's new with Y"

**Agent:** `claude-researcher` (primary), `gemini-researcher` (fallback)

---

## Security / Pentesting

**Intent:** vulnerability testing, security assessments, offensive security, port scanning.

**Examples:** "scan for vulnerabilities", "test security", "find weaknesses"

**Action:** No pentesting agent. Handle directly or use `gemini-researcher` for external docs.

---

## Qara / Personal Projects (Default)

**Intent:** Qara system dev, PAI configuration, hooks, skills, agents. Default assumption for "the project", "my setup".

**Examples:** "the qara project", "fix the hooks", "update the skills"

**Load:** `${PAI_DIR}/CLAUDE.md`

---

## Web Dev / Visual Testing

**Intent:** screenshots, browser debugging, visual testing, UI/UX debugging.

**Examples:** "screenshot", "browser tools", "show me what it looks like"

**Load:** `${PAI_DIR}/context/tools/README.md`

**Agent:** `designer` via Task tool (`subagent_type="designer"`). Use Playwright for browser automation.

---

## Capture Learning

**Intent:** user satisfied with solution, wants to document/save the work.

**Examples:** "log this", "save this for later", "document what we fixed", "that worked!"

**Action:**
1. Write to `thoughts/shared/learnings/`
2. Filename: `YYYY-MM-DD-hyphenated-problem-description.md`
3. Include: problem, solution, key tools/commands, gotchas/insights
4. Confirm success

---

## User's Content / Opinions

**Intent:** what JM said/wrote/thinks about a topic, past writing, references.

**Examples:** "what did I say about", "my opinion on", "find my post about"

---

## Advanced Web Scraping

**Intent:** difficult sites, anti-bot bypass, large-scale extraction, when regular scraping fails.

**Examples:** "can't access this site", "blocked by cloudflare", "need to scrape at scale"
