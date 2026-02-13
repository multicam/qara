# Dynamic Context Loading Rules Reference

## How to Use This File

This file contains the complete set of context loading rules. When processing user requests:

1. **Parse the prompt to understand INTENT and MEANING**
2. **Think about which category matches what the user is REALLY asking for**
3. **DO NOT do string matching** - examples show the TYPE of request
4. **Load the appropriate context based on semantic understanding**

The patterns below are EXAMPLES to guide semantic understanding, NOT exact strings to match.

---

## Alma Company

**When user is asking about:**
- Alma
- Alma security program
- Etc.

**Example phrases:**
- "Let's add context for Alma about..."

**Context to load:**
```bash
read ${PAI_DIR}/context/projects/Alma.md
```

---

## Live Conversation Recording (Limitless.ai)

**When user is asking about:**
- Live conversations
- In-person conversation
- What was talked about in a meeting
- What was talked about while walking or chatting

**Example phrases:**
- "I had a conversation the other day"
- "I had a meeting yesterday"
- "We talked about something at dinner"
- "At our lunch on July 9th"

**Command to use:**
```bash
read ${PAI_DIR}/commands/get-life-log.md
```

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

**Agent to use:** researcher

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

**Agent to use:** pentester

---

## Financial & Analytics

**When user is asking about:**
- Personal or business expenses
- Bills and utilities
- Budget analysis
- Financial tracking
- Spending patterns
- Income and costs

**Example phrases:**
- "PG&E bill", "expenses", "spending", "budget"
- "how much am I paying", "financial analysis"

**Context to load:**
```bash
read ${PAI_DIR}/context/life/expenses.md
read ${PAI_DIR}/context/life/finances/
```

**Special instructions:**
- Use the answer-finance-question command directly
- Parse financial PDFs and extract specific data

---

## Health & Wellness

**When user is asking about:**
- Health tracking or metrics
- Medical information or conditions
- Fitness and exercise
- Nutrition and diet
- Sleep patterns
- Mental health
- Wellness goals
- Medical appointments or records

**Example phrases:**
- "my health", "track my fitness", "medical records"
- "sleep data", "nutrition plan", "wellness goals"

**Context to load:**
```bash
read ${PAI_DIR}/Projects/Life/Health/CLAUDE.md
```

---

## Benefits & Perks Optimization

**When user is asking about:**
- Benefits they're not using
- Credit card perks or rewards
- Membership benefits
- Subscription perks
- Insurance benefits
- Employer benefits
- Maximizing value from memberships
- Restaurants they can go to (dining credits)
- Hotel bookings or travel perks
- Lounge access

**Example phrases:**
- "benefits I'm not using", "credit card perks"
- "restaurants I can go to", "where can I eat"
- "Resy restaurants", "hotel credits"
- "am I getting value from", "unused credits"

**Context to load:**
```bash
read ${PAI_DIR}/context/benefits/CLAUDE.md
```

---

## Unsupervised Learning Business

**When user is asking about:**
- The Unsupervised Learning business
- Newsletter metrics or performance
- Company operations or challenges
- Business metrics (when no specific company mentioned)
- Podcast, membership, or sponsorship matters
- "The company" or "my business" (default assumption)

**Example phrases:**
- "newsletter subscribers", "company performance"
- "how's the business", "company challenges"

**Context to load:**
```bash
read ${PAI_DIR}/context/unsupervised-learning/CLAUDE.md
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
read ${PAI_DIR}/context/tools/CLAUDE.md
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
1. Run capture-learning command:
   ```bash
   bun ${PAI_DIR}/commands/capture-learning.ts "[problem]" "[solution]"
   ```
2. File will be created in `${PAI_DIR}/context/learnings/`
3. Filename format: `YYYY-MM-DD-HHMM:SS-hyphenated-problem-description.md`
4. Confirm success

**Important:**
- Extract the problem from what we were working on
- Summarize the solution implemented
- Include key tools, commands, or techniques
- Note any gotchas or insights

---

## My Content & Opinions

**When user is asking about:**
- What Daniel said about something
- Daniel's opinions on topics
- Past blog posts or writing
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
