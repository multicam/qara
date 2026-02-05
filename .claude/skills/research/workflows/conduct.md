---
description: Comprehensive multi-source research - Qara loads and invokes researcher commands
globs: ""
alwaysApply: false
---

# 🔬 COMPREHENSIVE RESEARCH WORKFLOW FOR QARA

**YOU (Qara) are reading this because a research request was detected by the load-context hook.**

This command provides instructions for YOU to orchestrate comprehensive multi-source research by directly invoking researcher commands (NOT spawning new Claude Code sessions).

## 🎯 YOUR MISSION

When a user asks for research, YOU must deliver **FAST RESULTS** through massive parallelization:

## 🏷️ AGENT INSTANCE IDS (For Observability)

**When launching parallel agents of the same type, assign unique instance IDs for tracking:**

Format: `[agent-type-N]` where N is the sequence number (1, 2, 3, etc.)

**How to assign:**
1. For each researcher type, maintain a counter (starts at 0)
2. When launching an agent, increment the counter and create instance ID
3. Include the instance ID in the Task description: `"Query description [perplexity-researcher-1]"`

**Example:**
```typescript
// Launching 3 perplexity-researchers:
Task({
  subagent_type: "perplexity-researcher",
  description: "Quantum computing breakthroughs [perplexity-researcher-1]",
  prompt: "Research recent breakthroughs..."
})
Task({
  subagent_type: "perplexity-researcher",
  description: "Quantum computing applications [perplexity-researcher-2]",
  prompt: "Research practical applications..."
})
Task({
  subagent_type: "perplexity-researcher",
  description: "Quantum computing companies [perplexity-researcher-3]",
  prompt: "Research leading companies..."
})
```

**Why this matters:**
- Hooks automatically capture these IDs to JSONL logs
- Enables distinguishing parallel agents in observability dashboard
- Helps debug specific agent failures or performance issues
- Optional but recommended for extensive research (8+ agents per type)

**THREE RESEARCH MODES:**

1. **Quick Research: 1 agent per researcher type**
    - Automatically uses all available *-researcher agents (1 of each)
    - Use when user says "quick research" or simple queries
    - Fastest mode: ~15-20 seconds

2. **Standard Research: 3 agents per researcher type**
    - Automatically uses all available *-researcher agents (3 of each)
    - Default mode for most research requests
    - Balanced coverage: ~30 seconds

3. **Extensive Research: 8 agents per researcher type**
    - Automatically uses all available *-researcher agents (8 of each)
    - Use when user says "extensive research"
    - Exhaustive coverage: ~45-60 seconds

**Workflow for all modes:**
1. Decompose question into focused sub-questions (appropriate to mode)
2. Launch all agents in parallel (SINGLE message with multiple Task calls)
3. Each agent does ONE query + ONE follow-up max
4. Collect results as they complete
5. Synthesize findings into comprehensive report
6. Report back using mandatory response format

**Speed Strategy:**
- Each agent handles a specific angle/sub-question
- Parallel execution = results in under 1 minute
- Follow-up queries only when critical information is missing

## 🔥 EXTENSIVE RESEARCH MODE (24 AGENTS)

**ACTIVATION:** User says "extensive research" or "do extensive research on X" or "deep research"

**WORKFLOW:**

### Step 0: Generate Creative Research Angles

**Use UltraThink to generate diverse research angles (8 per researcher type):**

Think deeply and extensively about the research topic:
- Explore multiple unusual perspectives and domains
- Question all assumptions about what's relevant
- Make unexpected connections across different fields
- Consider edge cases, controversies, and emerging trends
- Think about historical context, future implications, and cross-disciplinary angles
- What questions would experts from different fields ask?

Generate 8 unique research angles per researcher type. Each should be distinct, creative, and explore a different facet of the topic. Mix different types: technical, historical, practical, controversial, emerging, comparative, etc.

Organize them by researcher type with 8 queries each, optimizing queries for each researcher's specific strengths and capabilities.

### Step 1: Launch All Research Agents in Parallel (8 per type)

**CRITICAL: Use a SINGLE message with all Task tool calls (8 per researcher type)**

```typescript
// For EACH researcher type discovered (matching pattern *-researcher):
// Launch 8 agents of that type with optimized queries
// Include instance IDs in descriptions: [researcher-type-N]

// Example for researcher type A (with instance IDs):
Task({ subagent_type: "[researcher-type-A]", description: "Query 1 [researcher-type-A-1]", prompt: "..." })
Task({ subagent_type: "[researcher-type-A]", description: "Query 2 [researcher-type-A-2]", prompt: "..." })
// ... (8 total for this researcher type: [researcher-type-A-3] through [researcher-type-A-8])

// Example for researcher type B (with instance IDs):
Task({ subagent_type: "[researcher-type-B]", description: "Query 9 [researcher-type-B-1]", prompt: "..." })
Task({ subagent_type: "[researcher-type-B]", description: "Query 10 [researcher-type-B-2]", prompt: "..." })
// ... (8 total for this researcher type: [researcher-type-B-3] through [researcher-type-B-8])

// Continue for ALL available *-researcher agents (8 of each type with instance IDs)
```

**Each agent prompt should:**
- Include the specific creative query angle
- **Instruct: "Do 1-2 focused searches and return findings. YOU HAVE UP TO 3 MINUTES - return results as soon as you have useful findings."**
- Keep it concise but thorough
- Agents should return as soon as they have substantive findings (don't artificially wait)

### Step 2: Wait for Agents to Complete (UP TO 10 MINUTES FOR EXTENSIVE)

**CRITICAL TIMEOUT RULE: After 10 minutes from launch, proceed with synthesis using only the agents that have returned results.**

- Each agent has up to 10 minutes to complete their research (extensive mode)
- Agents should return as soon as they have substantive findings
- **HARD TIMEOUT: 10 minutes** - After 10 minutes from launch, DO NOT wait longer
- Proceed with synthesis using whatever results have been returned
- Note which agents didn't respond in your final report
- **TIMELY RESULTS > PERFECT COMPLETENESS**

### Step 3: Synthesize Extensive Research Results

**Enhanced synthesis requirements for extensive research:**
- Identify themes across all research angles (8 per researcher type)
- Cross-validate findings from multiple agents and perspectives
- Highlight unique insights from each agent type
- Map coverage across different domains/aspects
- Identify gaps or conflicting information
- Calculate comprehensive metrics (8 per type, ~16+ queries per type, all available services)

**Report structure:**
```markdown
## Executive Summary
[1-2 paragraph overview of comprehensive findings]

## Key Findings by Domain
### [Domain 1]
**High Confidence (5+ sources):**
- Finding with extensive corroboration

**Medium Confidence (2-4 sources):**
- Finding with moderate corroboration

### [Domain 2]
...

## Unique Insights
**From Perplexity Research (Web/Current):**
- Novel findings from broad web search

**From Claude Research (Academic/Detailed):**
- Deep analytical insights

**From Gemini Research (Multi-Perspective):**
- Cross-domain connections and synthesis

## Coverage Map
- Aspects covered: [list]
- Perspectives explored: [list]
- Time periods analyzed: [list]

## Conflicting Information & Uncertainties
[Note any disagreements or gaps]

## Research Metrics
- Total Agents: [N] (8 per researcher type)
- Total Queries: ~[2N]+ (each agent 1-2 queries)
- Services Used: [Count] ([List all researcher services used])
- Total Output: ~[X] words
- Confidence Level: [High/Medium] ([%])
```

## 🚀 QUICK RESEARCH WORKFLOW (1 AGENT PER TYPE)

**ACTIVATION:** User says "quick research" or simple/straightforward queries

**Workflow:**

### Step 1: Identify Core Angles (1 per researcher type)

Break the question into focused sub-questions - one optimized for each available researcher type (discovered via *-researcher pattern). Tailor each query to leverage that researcher's specific strengths and data sources.

### Step 2: Launch All Researcher Agents in Parallel (1 of each)

```typescript
// SINGLE message with 1 Task call per available researcher type
// For each *-researcher agent discovered, launch 1 agent with optimized query

Task({ subagent_type: "[researcher-type-A]", description: "...", prompt: "..." })
Task({ subagent_type: "[researcher-type-B]", description: "...", prompt: "..." })
Task({ subagent_type: "[researcher-type-C]", description: "...", prompt: "..." })
// ... continue for ALL available *-researcher agents (1 of each type)
```

### Step 3: Quick Synthesis (2 MINUTE TIMEOUT)

**CRITICAL TIMEOUT RULE: After 2 minutes from launch, proceed with synthesis using only the agents that have returned results.**

- Each agent has up to 2 minutes (quick mode)
- **HARD TIMEOUT: 2 minutes from launch** - Do NOT wait longer
- Synthesize perspectives that returned into cohesive answer
- Note any non-responsive agents in report
- Report with standard format

## 📋 STANDARD RESEARCH WORKFLOW (3 AGENTS PER TYPE)

**ACTIVATION:** Default mode for most research requests

**Workflow:**

### Step 1: Decompose Question & Launch All Research Agents

**Step 1a: Break Down the Research Question**

Decompose the user's question into specific sub-questions (3 per researcher type discovered via *-researcher pattern).

Each question should:
- Cover different angles of the topic
- Target specific aspects to investigate
- Explore related areas that provide context
- Consider edge cases or controversies
- Be optimized for each researcher's specific strengths and data sources

**Step 1b: Launch All Research Agents in Parallel (3 of each type)**

Use the **Task tool** - SINGLE message with all Task calls:

```typescript
// For EACH researcher type discovered (matching pattern *-researcher):
// Launch 3 agents of that type with optimized queries
// Include instance IDs in descriptions: [researcher-type-N]

// Example for researcher type A (3 agents with instance IDs):
Task({ subagent_type: "[researcher-type-A]", description: "Query 1 [researcher-type-A-1]", prompt: "..." })
Task({ subagent_type: "[researcher-type-A]", description: "Query 2 [researcher-type-A-2]", prompt: "..." })
Task({ subagent_type: "[researcher-type-A]", description: "Query 3 [researcher-type-A-3]", prompt: "..." })

// Example for researcher type B (3 agents with instance IDs):
Task({ subagent_type: "[researcher-type-B]", description: "Query 4 [researcher-type-B-1]", prompt: "..." })
Task({ subagent_type: "[researcher-type-B]", description: "Query 5 [researcher-type-B-2]", prompt: "..." })
Task({ subagent_type: "[researcher-type-B]", description: "Query 6 [researcher-type-B-3]", prompt: "..." })

// Continue for ALL available *-researcher agents (3 of each type with instance IDs)
```

**CRITICAL RULES FOR SPEED:**
1. ✅ **Launch ALL agents in ONE message** (parallel execution)
2. ✅ **Each agent gets ONE specific sub-question** (focused research)
3. ✅ **3 agents per researcher type** (balanced coverage across all available types)
4. ✅ **Each agent does 1 query + 1 follow-up max** (quick cycles)
5. ✅ **Results return in ~30 seconds** (parallel processing)
6. ❌ **DON'T launch sequentially** (kills speed benefit)
7. ❌ **DON'T give broad questions** (forces multiple iterations)

### Step 2: Collect Results (UP TO 3 MINUTES FOR STANDARD)

**CRITICAL TIMEOUT RULE: After 3 minutes from launch, proceed with synthesis using only the agents that have returned results.**

- Each agent has up to 3 minutes to complete their research (standard mode)
- **Typical time:** Most agents return in 30-120 seconds
- **HARD TIMEOUT: 3 minutes** - After 3 minutes from launch, DO NOT wait longer
- Proceed with synthesis using whatever results have been returned
- Note which agents didn't respond in your final report
- **TIMELY RESULTS > PERFECT COMPLETENESS**

Each agent returns:
- Focused findings from their specific sub-question
- Source citations
- Confidence indicators
- Quick insights

### Step 3: Synthesize Results

Create a comprehensive report that:

**A. Identifies Confidence Levels:**
- **HIGH CONFIDENCE**: Findings corroborated by multiple sources
- **MEDIUM CONFIDENCE**: Found by one source, seems reliable
- **LOW CONFIDENCE**: Single source, needs verification

**B. Structures Information:**
```markdown
## Key Findings

### [Topic Area 1]
**High Confidence:**
- Finding X (Sources: perplexity-research, claude-research)
- Finding Y (Sources: perplexity-research, claude-research)

**Medium Confidence:**
- Finding Z (Source: claude-research)

### [Topic Area 2]
...

## Source Attribution
- **Perplexity-Research**: [summary of unique contributions]
- **Claude-Research**: [summary of unique contributions]

## Conflicting Information
- [Note any disagreements between sources]
```

**C. Calculate Research Metrics:**
- **Total Queries**: Count all queries across all research commands
- **Services Used**: List unique services (Perplexity API, Claude WebSearch, etc.)
- **Total Output**: Estimated character/word count of all research
- **Confidence Level**: Overall confidence percentage
- **Result**: 1-2 sentence answer to the research question

### Step 4: Return Results Using MANDATORY Format

📅 [current date from `date` command]
**📋 SUMMARY:** Research coordination and key findings overview
**🔍 ANALYSIS:** Synthesis of multi-source research results
**⚡ ACTIONS:** Which research commands executed, research strategies used
**✅ RESULTS:** Complete synthesized findings with source attribution
**📊 STATUS:** Research coverage, confidence levels, data quality
**➡️ NEXT:** Recommended follow-up research or verification needed
**🎯 COMPLETED:** Completed multi-source [topic] research
**🗣️ CUSTOM COMPLETED:** [Optional: Voice-optimized under 8 words]

**📈 RESEARCH METRICS:**
- **Total Queries:** [X] (Primary: [Y], Secondary: [Z])
- **Services Used:** [N] (List: [service1, service2])
- **Total Output:** [~X words/characters]
- **Confidence Level:** [High/Medium/Low] ([percentage]%)
- **Result:** [Brief summary answer]

## 🔄 AGENT RESUME DETECTION

**Before launching new research agents, check for resumable agents:**

When starting any research workflow, first check if there are stale running agents that can be resumed:

```typescript
import { findResumableAgents } from './hooks/lib/agent-state-utils';

// Check for resumable agents before launching new ones
const resumable = findResumableAgents({
  sessionId: process.env.SESSION_ID,
  topic: researchTopic,  // Optional: filter by topic keyword
  staleThresholdMs: 5 * 60 * 1000  // Consider running > 5 min as stale
});

if (resumable.length > 0) {
  console.log(`Found ${resumable.length} resumable agents:`);
  resumable.forEach(agent => {
    console.log(`  - ${agent.agent_type}: ${agent.description} (started ${agent.start_time})`);
  });
  // Offer to resume or start fresh
}
```

**Resume criteria:**
- Agent has `status="running"`
- Agent's `start_time` is older than stale threshold (5 min default)
- These are likely orphaned agents from crashed sessions

**Resume workflow:**
1. Check for resumable agents matching current topic
2. If found, offer user choice: resume existing or start fresh
3. Resume using `resume: agent_id` parameter in Task call
4. Fresh start: proceed with normal research workflow

---

## 🚨 CRITICAL RULES FOR QARA

### ⏱️ TIMEOUT RULES (MOST IMPORTANT):
**After the timeout period, STOP WAITING and synthesize with whatever results you have.**
- **Quick (1 per type): 2 minute timeout**
- **Standard (3 per type): 3 minute timeout**
- **Extensive (8 per type): 10 minute timeout**
- ✅ Proceed with partial results after timeout
- ✅ Note non-responsive agents in final report
- ✅ TIMELY RESULTS > COMPLETENESS
- ❌ DO NOT wait indefinitely for slow/failed agents
- ❌ DO NOT let one slow agent block the entire research

### MODE SELECTION:
- **QUICK:** User says "quick research" → 1 agent per researcher type → **2 min timeout**
- **STANDARD:** Default for most requests → 3 agents per researcher type → **3 min timeout**
- **EXTENSIVE:** User says "extensive research" → 8 agents per researcher type → **10 min timeout**

### QUICK RESEARCH (1 agent per type):
1. **FOCUSED ANGLES** - One per available researcher type
2. **LAUNCH ALL RESEARCHER AGENTS IN PARALLEL** - SINGLE message with 1 Task call per type
3. **OPTIMIZE per agent** - Tailor queries to each researcher's specific strengths
4. **FAST RESULTS** - ~15-20 seconds

### STANDARD RESEARCH (3 agents per type):
1. **LAUNCH ALL RESEARCHER AGENTS IN PARALLEL** - Use a SINGLE message with all Task tool calls
2. **DECOMPOSE the question** - Create focused sub-questions (3 per researcher type)
3. **ONE QUERY + ONE FOLLOW-UP per agent** - Quick, focused research cycles
4. **BALANCE across agent types** - 3 agents per discovered researcher type
5. **WAIT for ALL agents** (~30 seconds) before synthesizing
6. **SYNTHESIZE results** - Don't just concatenate outputs
7. **USE the mandatory response format** - This triggers voice notifications
8. **CALCULATE accurate metrics** - Count queries, agents, output size
9. **ATTRIBUTE sources** - Show which agent/method found each insight
10. **MARK confidence levels** - Based on multi-source agreement

### EXTENSIVE RESEARCH (8 agents per type):
1. **DETECT "extensive research" request** - Activate extensive mode
2. **USE UltraThink** - Generate diverse query angles through deep thinking (8 per type)
3. **LAUNCH ALL RESEARCHER AGENTS IN PARALLEL** - 8 per type (SINGLE message)
4. **ORGANIZE queries by agent type** - Optimize each group for that agent's strengths
5. **WAIT for ALL agents** (30-60 seconds) - Parallel execution
6. **ENHANCED SYNTHESIS** - Comprehensive cross-validation and domain mapping
7. **COMPREHENSIVE METRICS** - Total agents, queries, extensive output
8. **COVERAGE MAP** - Show aspects, perspectives, and domains explored

**SPEED CHECKLIST:**
- ✅ Launched agents in ONE message? (parallel execution)
- ✅ Each agent has ONE focused sub-question?
- ✅ Using all available researcher types for broad coverage?
- ✅ Agents instructed to do 1 query + 1 follow-up max?
- ✅ Expected results in under 1 minute?

## 🚧 HANDLING BLOCKED OR FAILED CRAWLS

If research commands report being blocked, encountering CAPTCHAs, or facing bot detection, note this in your synthesis and recommend using the retrieve workflow for alternative content retrieval strategies.

## 💡 EXAMPLE EXECUTION

### Example 1: Standard Research (3 agents per type)

**User asks:** "Research the latest developments in quantum computing"

**Your workflow:**
1. ✅ Recognize research intent (hook loaded this command)
2. ✅ **Decompose into focused sub-questions (3 per researcher type):**
    - Create 3 questions optimized for each available researcher type
    - Each question tailored to that researcher's specific strengths
    - Cover different angles: breakthroughs, applications, news, companies, research state, algorithms, limitations, advantages, cryptography, etc.

3. ✅ **Launch ALL researcher agents in PARALLEL (ONE message with all Task calls):**
   ```
   // 3 agents per researcher type (with instance IDs)
   Task([researcher-type-A], "Query 1 [researcher-type-A-1] optimized for this type")
   Task([researcher-type-A], "Query 2 [researcher-type-A-2] optimized for this type")
   Task([researcher-type-A], "Query 3 [researcher-type-A-3] optimized for this type")

   Task([researcher-type-B], "Query 4 [researcher-type-B-1] optimized for this type")
   // ... continue for all available researcher types (3 each with instance IDs)
   ```

4. ✅ **Wait for ALL agents to complete** (~30 seconds)
5. ✅ **Synthesize their findings:**
    - Common themes → High confidence
    - Unique insights → Medium confidence
    - Disagreements → Note and flag
6. ✅ **Calculate metrics** (total agents, ~2x queries per agent, all services, output size, confidence %)
7. ✅ **Return comprehensive report** with mandatory format
8. ✅ **Voice notification** automatically triggered by your 🎯 COMPLETED line

**Result:** User gets comprehensive quantum computing research from parallel agents (3 per researcher type) in ~30 seconds, with balanced multi-source validation, source attribution, and confidence levels.

### Example 2: Extensive Research (8 agents per type)

**User asks:** "Do extensive research on AI consciousness and sentience"

**Your workflow:**
1. ✅ Recognize **"extensive research"** trigger
2. ✅ **Use UltraThink** to generate diverse query angles (8 per researcher type):
    - Think deeply about AI consciousness research from multiple perspectives
    - Generate unique research angles covering: neuroscience, philosophy, computer science, ethics, current AI capabilities, theoretical frameworks, controversies, tests/metrics, historical context, future implications, cross-cultural perspectives, etc.

3. ✅ **Organize creative queries by researcher type (8 each):**
    - For each available researcher type, create 8 queries optimized for that researcher's specific strengths
    - Tailor questions to leverage each researcher's unique data sources and capabilities
    - Cover complementary angles across all researcher types

4. ✅ **Launch ALL researcher agents in PARALLEL (ONE message with all Task calls - 8 per type)**

5. ✅ **Wait for ALL agents** (30-60 seconds)

6. ✅ **Enhanced synthesis with domain mapping:**
    - Executive summary of comprehensive findings
    - Key findings organized by domain (philosophy, neuroscience, AI, ethics)
    - Unique insights from each agent type
    - Coverage map showing all perspectives explored
    - High-confidence findings (multiple sources agree)
    - Conflicting theories and uncertainties

7. ✅ **Comprehensive metrics** (total agents, ~2x queries per agent, extensive cross-validation)

8. ✅ **Voice notification** automatically triggered

**Result:** User gets exhaustive AI consciousness research from parallel agents (8 per type) covering philosophy, neuroscience, computer science, ethics, and more - with extensive cross-validation and domain coverage mapping in under 1 minute.

## 🔄 BENEFITS OF THIS ARCHITECTURE

**Why parallel agent execution delivers speed:**
1. ✅ **All researchers working simultaneously** - Not sequential, truly parallel
2. ✅ **Results in under 1 minute** - Each agent does 1-2 quick searches
3. ✅ **Complete coverage** - Multiple perspectives from all available services
4. ✅ **Focused research** - Each agent has ONE specific sub-question
5. ✅ **No iteration delays** - All agents launch at once in ONE message
6. ✅ **Multi-source validation** - High confidence from cross-agent agreement

**Speed Comparison:**
- ❌ **Old way:** Sequential searches → 5-10 minutes
- ✅ **New way:** Parallel agents (all available types) → Under 1 minute

**This is the correct architecture. Use it for FAST research.**

---

## 🌙 BACKGROUND EXECUTION MODE

**ACTIVATION:** User says "background research", "research while I work", "async research", or "start research and continue"

**Purpose:** Launch research agents that run in the background while the user continues with other tasks. Results are collected when ready.

### When to Use Background Mode

✅ **Good for:**
- Long-running extensive research (8+ agents)
- Research not blocking immediate work
- Gathering information for later synthesis
- Multiple independent research topics

❌ **Not good for:**
- Questions needing immediate answers
- Research that blocks next steps
- Quick lookups or simple questions

### Background Research Workflow

**Step 1: Launch with `run_in_background: true`**

```typescript
// Launch all research agents in background
const researchTasks = [
  Task({
    subagent_type: "perplexity-researcher",
    description: "Background: [topic] [perplexity-researcher-1]",
    prompt: "Research [topic]. Return findings when complete.",
    run_in_background: true  // KEY: Returns immediately with output_file
  }),
  Task({
    subagent_type: "claude-researcher",
    description: "Background: [topic] [claude-researcher-1]",
    prompt: "Research [topic]. Return findings when complete.",
    run_in_background: true
  }),
  // ... more agents
];
```

**Step 2: Return Output File Paths to User**

```markdown
📋 **Background Research Launched**

I've started research on [topic] with [N] agents running in background.

**Output files to check when ready:**
- `/path/to/output-1.txt` (perplexity-researcher)
- `/path/to/output-2.txt` (claude-researcher)
- ... more files

**Check progress:** `tail -f [output_file]`
**Get results:** Read files or ask me to synthesize when ready
```

**Step 3: Continue Other Work**

User can continue with other tasks while research runs.

**Step 4: Synthesize When Ready**

When user asks for results:
1. Read all output files
2. Check for completion markers
3. Synthesize findings using standard format

### Background Mode Response Format

📋 **SUMMARY:** Launched [N] background research agents on [topic]
**🔍 ANALYSIS:** Agents deployed: [list agent types]
**⚡ ACTIONS:** Launched parallel background research
**✅ RESULTS:** Output files: [list paths]
**📊 STATUS:** Research running in background - not blocking
**➡️ NEXT:** Continue other work, check results when needed
**🎯 COMPLETED:** Background research on [topic] launched

### Resume Detection for Background Research

Before launching new background research, check for existing:

```typescript
// Check for resumable agents on this topic
const resumable = findResumableAgents({
  sessionId: currentSessionId,
  topic: researchTopic,
  staleThresholdMs: 5 * 60 * 1000  // 5 minutes
});

if (resumable.length > 0) {
  // Notify user about existing research
  console.log(`Found ${resumable.length} existing research agents on similar topic`);
  // Offer to resume or start fresh
}
```
