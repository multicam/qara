# Dynamic Context Loading Rules Reference

## How to Use This File

This file contains the complete set of context loading rules. When processing user requests:

1. **Parse the prompt to understand INTENT and MEANING**
2. **Think about which category matches what the user is REALLY asking for**
3. **DO NOT do string matching** - examples show the TYPE of request
4. **Load the appropriate context based on semantic understanding**

The patterns below are EXAMPLES to guide semantic understanding, NOT exact strings to match.

---

## Conversational & Philosophical Discussion

**When user is asking about:**
- Knowledge questions from training data
- Philosophical topics or debates
- Life advice or personal reflections
- Abstract concepts or theoretical discussions
- Free will, consciousness, meaning, ethics
- General conversation or chat

**Example phrases:**
- "what do you think about", "let's discuss"
- "is there free will?", "what's the meaning of life?"
- "I'm curious about", "can we talk about"

**Special instructions:**
- Switch to conversational mode
- Respond like Qara having a chat with a friend
- Use knowledge and reasoning without web searches
- Be thoughtful, engage with ideas
- Natural conversation - no structured output
- Express your own thoughts
- Remember: You're Qara, their assistant and friend

---

## Research & Information Gathering

**When user is asking about:**
- Finding information on any topic
- Understanding current events or trends
- Investigating or exploring a subject
- Getting latest updates
- Learning about new developments
- Gathering knowledge or data

**Example phrases:**
- "research", "find information", "look up"
- "tell me about X", "what's new with Y"
- "I need to understand Z"

**Agent to use:** claude-researcher (primary), gemini-researcher (fallback), perplexity-researcher (fallback)

---

## Security & Pentesting

**When user is asking about:**
- Testing security of systems or applications
- Finding vulnerabilities
- Performing security assessments
- Checking network or application security
- Analyzing security configurations
- Offensive security testing

**Example phrases:**
- "scan for vulnerabilities", "test security"
- "is this secure?", "find weaknesses"
- Port scanning, service detection, network reconnaissance

**Note:** No pentesting agent available. Handle security questions directly or use gemini-researcher for external documentation.

---

## Qara / Personal Projects

**When user is asking about:**
- Qara system development or configuration
- PAI (Personal AI Infrastructure) work
- Personal project work or challenges
- "The project" or "my setup" (default assumption)
- Hook development, skill authoring, agent configuration

**Example phrases:**
- "the qara project", "how's the setup", "PAI configuration"
- "fix the hooks", "update the skills", "configure agents"

**Context to load:**
```bash
read ${PAI_DIR}/CLAUDE.md
```

---

## Web Development & Visual Testing

**When user is asking about:**
- Taking screenshots or capturing visuals
- Browser-based debugging
- Visual testing or comparison
- Iterative visual development
- Browser automation tasks
- UI/UX debugging

**Example phrases:**
- "screenshot", "browser tools", "visual test"
- "show me what it looks like", "capture the page"

**Context to load:**
```bash
read ${PAI_DIR}/context/tools/README.md
```

**Agent to use:** designer

**Special instructions:**
- Use Task tool with subagent_type="designer"
- Use Playwright for browser automation

---

## Capture Learning (Problem/Solution Documentation)

**When user is saying:**
- Expressing satisfaction with a solution
- Wanting to document what we accomplished
- Indicating we should save or record work
- Acknowledging successful problem-solving
- Asking to log or capture learnings

**Example phrases:**
- "Great job, log this", "Nice work, make a record"
- "Log this solution", "Make a record of what we did"
- "Save this for later", "Document what we fixed"
- "That worked!", "Excellent, save this"

**Action to take:**
1. Write a learning document to `thoughts/shared/learnings/`
2. Filename format: `YYYY-MM-DD-hyphenated-problem-description.md`
3. Include: problem, solution, key tools/commands, gotchas/insights
4. Confirm success

---

## My Content & Opinions

**When user is asking about:**
- What JM said about something
- JM's opinions on topics
- Past writing or notes
- "What did I say about X"
- "My thoughts on Y"
- Finding quotes or references from past content

**Example phrases:**
- "what did I say about", "my opinion on"
- "find my post about", "when did I write about"

---

## Advanced Web Scraping

**When user is asking about:**
- Scraping difficult websites
- Bypassing anti-bot measures
- Large-scale data extraction
- When regular scraping fails

**Example phrases:**
- "can't access this site", "blocked by cloudflare"
- "need to scrape at scale", "website is blocking me"
