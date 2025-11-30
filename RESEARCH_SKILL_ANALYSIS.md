`# Research Skill Analysis

**Date:** 2024-11-29  
**Analyzed by:** Cascade AI  
**Skill Location:** `/home/jean-marc/qara/.claude/skills/research/`

---

## Executive Summary

The research skill is a **comprehensive, multi-layered research orchestration system** that provides parallel web research, content extraction, and knowledge synthesis capabilities. It's designed around a philosophy of **speed through parallelization** and **intelligent escalation** through multiple service layers.

**Key Strengths:**
- ✅ Parallel multi-agent research architecture (3 modes: quick/standard/extensive)
- ✅ Multiple researcher types (Claude, Perplexity, Gemini)
- ✅ 3-layer content retrieval escalation (Built-in → BrightData → Apify)
- ✅ 242+ Fabric patterns for content processing
- ✅ Comprehensive workflow routing system

**Key Weaknesses:**
- ⚠️ Complex configuration with multiple optional API keys
- ⚠️ Inconsistent TypeScript/Bash implementations in workflows
- ⚠️ Some workflows are executable scripts, others are documentation
- ⚠️ Heavy reliance on external services (Perplexity, Gemini, BrightData, Apify)

---

## Architecture Overview

### 1. Core Skill Structure

```
.claude/skills/research/
├── SKILL.md                    # Main skill definition and routing logic
└── workflows/                  # 10 specialized workflow files
    ├── conduct.md              # Multi-source parallel research (CORE)
    ├── claude-research.md      # Claude WebSearch research
    ├── perplexity-research.md  # Perplexity API research
    ├── retrieve.md             # 3-layer content retrieval
    ├── youtube-extraction.md   # YouTube via Fabric
    ├── web-scraping.md         # Web scraping guide
    ├── fabric.md               # Fabric pattern selection
    ├── enhance.md              # Content enhancement
    ├── extract-knowledge.md    # Knowledge extraction
    └── interview-research.md   # Interview prep
```

### 2. Agent Ecosystem

**Researcher Agents:**
- `claude-researcher.md` - Uses Claude's built-in WebSearch (FREE)
- `perplexity-researcher.md` - Uses Perplexity API (requires API key)
- `gemini-researcher.md` - Uses Gemini API (requires API key)
- `web-search-researcher.md` - Generic web search
- `researcher.md` - Base researcher template

**Discovery Pattern:** Workflows discover available researchers using `*-researcher` glob pattern

---

## Three Research Modes

### Quick Research (1 agent per type)
- **Activation:** User says "quick research"
- **Agents:** 1 of each available researcher type
- **Timeout:** 2 minutes
- **Use Case:** Simple queries, straightforward questions
- **Speed:** ~15-20 seconds

### Standard Research (3 agents per type) - DEFAULT
- **Activation:** Default for most research requests
- **Agents:** 3 of each available researcher type
- **Timeout:** 3 minutes
- **Use Case:** Most research needs, comprehensive coverage
- **Speed:** ~30 seconds

### Extensive Research (8 agents per type)
- **Activation:** User says "extensive research"
- **Agents:** 8 of each available researcher type
- **Timeout:** 10 minutes
- **Use Case:** Deep-dive research, comprehensive reports
- **Speed:** ~45-60 seconds
- **Special:** Uses UltraThink for creative query angle generation

---

## Workflow Analysis

### 1. Multi-Source Research (`conduct.md`)

**Purpose:** Orchestrate parallel research across multiple researcher agents

**Architecture:**
```typescript
// Parallel agent launch pattern
Task({ subagent_type: "claude-researcher", description: "Query 1 [claude-researcher-1]" })
Task({ subagent_type: "claude-researcher", description: "Query 2 [claude-researcher-2]" })
Task({ subagent_type: "claude-researcher", description: "Query 3 [claude-researcher-3]" })
Task({ subagent_type: "perplexity-researcher", description: "Query 4 [perplexity-researcher-1]" })
// ... continues for all researcher types
```

**Key Features:**
- Query decomposition (1/3/8 per researcher type based on mode)
- Instance ID tracking for observability (`[researcher-type-N]`)
- Hard timeouts (2/3/10 minutes)
- Synthesis with confidence levels (High/Medium/Low)
- Research metrics calculation

**Strengths:**
- ✅ True parallelization (all agents in single message)
- ✅ Comprehensive synthesis with source attribution
- ✅ Timeout enforcement prevents hanging
- ✅ Metrics tracking (queries, services, output size)

**Weaknesses:**
- ⚠️ Complex orchestration logic
- ⚠️ Requires multiple API keys for full functionality
- ⚠️ No graceful degradation if some researchers unavailable

### 2. Claude Research (`claude-research.md`)

**Purpose:** Free research using Claude's built-in WebSearch

**Implementation:** TypeScript/Bun executable script

**Features:**
- Query decomposition (4-8 sub-queries)
- Automatic query generation based on intent
- No API keys required (FREE)

**Strengths:**
- ✅ No external dependencies
- ✅ Always available
- ✅ Good for general research

**Weaknesses:**
- ⚠️ Limited to Claude's WebSearch capabilities
- ⚠️ No parallel execution in script itself
- ⚠️ Relies on claude-researcher agent for actual execution

### 3. Perplexity Research (`perplexity-research.md`)

**Purpose:** Fast web search with Perplexity API

**Implementation:** TypeScript/Bun executable script

**Features:**
- Query decomposition using Perplexity API
- Parallel search execution
- Citation tracking
- Follow-up searches for recent queries

**Strengths:**
- ✅ Fast web search
- ✅ Good citation support
- ✅ Handles recent/current events well

**Weaknesses:**
- ⚠️ Requires PERPLEXITY_API_KEY
- ⚠️ API costs
- ⚠️ Script implementation may not integrate with agent system

### 4. Content Retrieval (`retrieve.md`)

**Purpose:** Intelligent 3-layer content retrieval escalation

**Architecture:**
```
Layer 1: Built-in Tools (WebFetch, WebSearch)
    ↓ (If blocked/CAPTCHA/rate-limited)
Layer 2: BrightData MCP (CAPTCHA bypass, residential proxies)
    ↓ (If specialized scraping needed)
Layer 3: Apify MCP (RAG browser, specialized Actors)
```

**Strengths:**
- ✅ Intelligent escalation strategy
- ✅ Handles bot detection, CAPTCHAs, rate limiting
- ✅ Clear decision tree for layer selection
- ✅ Comprehensive error handling

**Weaknesses:**
- ⚠️ Requires BRIGHTDATA_API_KEY for Layer 2
- ⚠️ Requires Apify account for Layer 3
- ⚠️ Cost increases with layer escalation
- ⚠️ Only activates when user indicates difficulty

**Layer Comparison:**

| Feature | Layer 1 | Layer 2 | Layer 3 |
|---------|---------|---------|---------|
| Speed | Fast (<5s) | Medium (10-30s) | Slower (30-60s) |
| Bot Detection | ❌ | ✅ | ✅ |
| CAPTCHA | ❌ | ✅ | ✅ |
| JavaScript | ⚠️ Limited | ✅ Full | ✅ Full |
| Batch Ops | Manual | ✅ Up to 10 | ✅ Unlimited |
| Cost | Free | Paid | Paid |

### 5. Fabric Pattern Selection (`fabric.md`)

**Purpose:** Auto-select best pattern from 242+ Fabric patterns

**Pattern Categories:**
- Threat Modeling & Security (15 patterns)
- Summarization (20 patterns)
- Extraction (30+ patterns)
- Analysis (35+ patterns)
- Creation (50+ patterns)
- Improvement (10 patterns)
- Rating/Judgment (8 patterns)

**Strengths:**
- ✅ Comprehensive pattern library
- ✅ Clear decision matrix for pattern selection
- ✅ Supports multiple input types (URL, YouTube, file, text)
- ✅ No API keys required (uses local Fabric CLI)

**Weaknesses:**
- ⚠️ Requires Fabric CLI installation
- ⚠️ Requires fabric-repo clone
- ⚠️ Pattern selection logic is manual (no automation)

### 6. YouTube Extraction (`youtube-extraction.md`)

**Purpose:** Extract content from YouTube videos

**Implementation:** Simple wrapper around Fabric CLI

```bash
fabric -y "YOUTUBE_URL"
fabric -y "YOUTUBE_URL" -p extract_wisdom
```

**Strengths:**
- ✅ Extremely simple
- ✅ Handles download, transcription, extraction automatically
- ✅ No API keys required

**Weaknesses:**
- ⚠️ Relies entirely on Fabric CLI
- ⚠️ No error handling documented

### 7. Web Scraping (`web-scraping.md`)

**Purpose:** Guide for web scraping best practices

**Implementation:** Documentation only (not executable)

**Content:**
- Decision tree (WebFetch → BrightData → Apify)
- Common tasks (extract links, scrape listings, crawl pages)
- Best practices and rate limiting

**Strengths:**
- ✅ Clear guidance
- ✅ Ethical scraping practices

**Weaknesses:**
- ⚠️ Just documentation, no implementation
- ⚠️ Duplicates retrieve.md content

### 8. Knowledge Extraction (`extract-knowledge.md`)

**Purpose:** Extract structured knowledge from any source

**Features:**
- Auto-detect source type (YouTube, URL, PDF, text)
- Domain analysis (security, business, research, wisdom, general)
- Domain-specific extraction strategies
- Structured output format

**Strengths:**
- ✅ Comprehensive extraction logic
- ✅ Domain-specific intelligence
- ✅ Quality rating system

**Weaknesses:**
- ⚠️ Relies on PAI MCP services (may not exist)
- ⚠️ Complex implementation requirements
- ⚠️ No executable implementation

### 9. Content Enhancement (`enhance.md`)

**Purpose:** Enhance blog posts with formatting

**Features:**
- Link verification and addition
- Image enhancement (dimensions, clickable)
- Code block syntax highlighting
- Content structure (aside, callout, tutorial tags)

**Strengths:**
- ✅ Specific use case (blog enhancement)
- ✅ Clear formatting rules

**Weaknesses:**
- ⚠️ Very specific to blog workflow
- ⚠️ May not belong in research skill
- ⚠️ No implementation provided

### 10. Interview Research (`interview-research.md`)

**Purpose:** Prepare interview questions using Tyler Cowen/Shannon principles

**Features:**
- Research protocol (5 areas: recent activity, tech innovation, social media, competition, future)
- Tyler Cowen question principles
- Shannon surprise principle
- Question transformation examples

**Strengths:**
- ✅ Unique methodology (Cowen + Shannon)
- ✅ Comprehensive research areas
- ✅ Good question examples

**Weaknesses:**
- ⚠️ Relies on /conduct-research command
- ⚠️ No automation of question generation
- ⚠️ Niche use case

---

## API Key Requirements

### Required for Full Functionality

| Feature | API Key | Source |
|---------|---------|--------|
| Perplexity Research | `PERPLEXITY_API_KEY` | https://perplexity.ai/settings/api |
| Gemini Research | `GOOGLE_API_KEY` | https://aistudio.google.com/app/apikey |
| BrightData Scraping | `BRIGHTDATA_API_KEY` | https://brightdata.com |
| Apify Actors | Apify account | https://apify.com |

### Works Without API Keys

- ✅ Claude-based research (WebSearch/WebFetch)
- ✅ Basic web fetching
- ✅ Fabric patterns (if Fabric CLI installed)
- ✅ YouTube extraction (via Fabric)

---

## Integration Points

### 1. Hook System

**Metadata Extraction:** `/home/jean-marc/qara/.claude/hooks/lib/metadata-extraction.ts`
- Captures research events
- Tracks agent instance IDs
- Logs to JSONL for observability

**Stop Hook:** `/home/jean-marc/qara/.claude/hooks/stop-hook.ts`
- Extracts completion messages
- Triggers voice notifications
- Processes research metrics

### 2. Agent System

**Agent Discovery:**
- Workflows use `*-researcher` pattern to find available agents
- Dynamic agent selection based on availability
- Instance ID tracking: `[agent-type-N]`

**Agent Coordination:**
- All agents launched in parallel (single message, multiple Task calls)
- Each agent gets focused sub-question
- Timeout enforcement at workflow level

### 3. File Organization

**Scratchpad Pattern:**
```
${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_research-[topic]/
├── raw-outputs/
├── synthesis-notes.md
└── draft-report.md
```

**History Pattern:**
```
${PAI_DIR}/history/research/YYYY-MM/YYYY-MM-DD_[topic]/
├── README.md
├── research-report.md
└── metadata.json
```

---

## Strengths & Weaknesses

### Major Strengths

1. **Parallel Architecture**
   - True parallelization through single-message multi-Task pattern
   - Dramatic speed improvement (5-10 min → <1 min)
   - Scales across multiple researcher types

2. **Intelligent Escalation**
   - 3-layer retrieval system handles edge cases
   - Clear decision trees for tool selection
   - Graceful degradation when services unavailable

3. **Comprehensive Coverage**
   - Multiple research modes (quick/standard/extensive)
   - Multiple researcher types (Claude/Perplexity/Gemini)
   - 242+ Fabric patterns for content processing

4. **Timeout Enforcement**
   - Hard timeouts prevent hanging (2/3/10 minutes)
   - Proceeds with partial results
   - Timely results prioritized over completeness

5. **Source Attribution**
   - Confidence levels (High/Medium/Low)
   - Source tracking for each finding
   - Conflict identification

### Major Weaknesses

1. **Complexity**
   - Multiple API keys required for full functionality
   - Complex orchestration logic in conduct.md
   - Steep learning curve for new users

2. **Inconsistent Implementation**
   - Some workflows are executable TypeScript scripts
   - Others are documentation/guides
   - No clear pattern for which should be which

3. **External Dependencies**
   - Heavy reliance on external services (Perplexity, Gemini, BrightData, Apify)
   - Fabric CLI required for many features
   - No graceful degradation if services unavailable

4. **Cost Implications**
   - Multiple paid API services
   - No cost tracking or budgeting
   - Escalation layers increase costs

5. **Workflow Overlap**
   - retrieve.md and web-scraping.md overlap significantly
   - enhance.md may not belong in research skill
   - Some workflows too specific (interview-research.md)

6. **Testing & Validation**
   - No test suite visible
   - No validation of API key presence before use
   - No error handling examples

---

## Recommendations

### High Priority

1. **Consolidate Overlapping Workflows**
   - Merge retrieve.md and web-scraping.md
   - Move enhance.md to a content/blog skill
   - Consider moving interview-research.md to a separate skill

2. **Standardize Implementation**
   - Decide: executable scripts vs. documentation
   - If executable, ensure all use same runtime (Bun/TypeScript)
   - If documentation, clearly mark as such

3. **Add API Key Validation**
   - Check for required API keys before workflow execution
   - Provide clear error messages when keys missing
   - Document fallback behavior

4. **Improve Error Handling**
   - Add retry logic for failed API calls
   - Graceful degradation when services unavailable
   - Better error messages for users

### Medium Priority

5. **Add Cost Tracking**
   - Track API usage per research session
   - Estimate costs before extensive research
   - Budget limits for expensive operations

6. **Enhance Observability**
   - Structured logging for all workflows
   - Performance metrics (time, tokens, costs)
   - Success/failure rates per researcher type

7. **Create Test Suite**
   - Unit tests for query decomposition
   - Integration tests for agent coordination
   - End-to-end tests for full research workflows

8. **Documentation Improvements**
   - Add architecture diagrams
   - Create troubleshooting guide
   - Document common failure modes

### Low Priority

9. **Optimize Query Decomposition**
   - Use LLM for smarter query generation
   - Learn from successful query patterns
   - Avoid redundant queries across agents

10. **Add Caching**
    - Cache research results by query hash
    - Avoid duplicate API calls
    - Configurable TTL for cache entries

---

## Usage Patterns

### Typical User Flow

1. **User Request:** "Research quantum computing developments"

2. **Skill Activation:** SKILL.md routes to `conduct.md` workflow

3. **Mode Selection:** Standard mode (3 agents per type)

4. **Query Decomposition:**
   - Generate 3 queries per available researcher type
   - Optimize queries for each researcher's strengths

5. **Parallel Execution:**
   - Launch all agents in single message
   - Each agent: 1 query + 1 follow-up max
   - 3-minute timeout

6. **Synthesis:**
   - Collect results from all agents
   - Identify high/medium/low confidence findings
   - Cross-validate across sources
   - Calculate metrics

7. **Output:**
   - Structured report with source attribution
   - Research metrics (queries, services, output size)
   - Voice notification via stop-hook

### Edge Cases

**No API Keys Available:**
- Falls back to Claude-only research
- Uses WebSearch/WebFetch exclusively
- Reduced coverage but still functional

**Timeout Exceeded:**
- Proceeds with partial results
- Notes non-responsive agents
- Prioritizes timely results over completeness

**Content Retrieval Blocked:**
- Escalates through layers (1→2→3)
- Documents which layers used
- Reports if all layers fail

---

## Metrics & Performance

### Speed Benchmarks (from documentation)

| Mode | Agents | Expected Time | Actual Time |
|------|--------|---------------|-------------|
| Quick | 1 per type | ~15-20s | Not measured |
| Standard | 3 per type | ~30s | Not measured |
| Extensive | 8 per type | ~45-60s | Not measured |

**Old Sequential Approach:** 5-10 minutes

### Coverage

**Researcher Types:** 3-5 (Claude, Perplexity, Gemini, Web-Search, base Researcher)

**Fabric Patterns:** 242+

**Retrieval Layers:** 3 (Built-in, BrightData, Apify)

**Workflows:** 10 specialized workflows

---

## Security & Privacy Considerations

### API Key Storage
- Keys stored in `~/.claude/.env`
- Not committed to version control
- Loaded at runtime

### Data Handling
- Research results stored in scratchpad (temporary)
- Archived to history (permanent)
- No encryption mentioned

### External Services
- Multiple third-party APIs (Perplexity, Gemini, BrightData, Apify)
- Data sent to external services
- No mention of data retention policies

### Ethical Scraping
- Respects robots.txt
- Rate limiting guidance
- CAPTCHA bypass only when necessary

---

## Conclusion

The research skill is a **sophisticated, well-architected system** for parallel web research and content extraction. Its core strength is the **parallel multi-agent architecture** that dramatically reduces research time through true parallelization.

**Best suited for:**
- Comprehensive research requiring multiple perspectives
- Time-sensitive research (need results in <1 minute)
- Complex queries requiring decomposition
- Content extraction from difficult sources

**Not ideal for:**
- Simple single-query research (overkill)
- Budget-constrained scenarios (requires multiple paid APIs)
- Offline or air-gapped environments (heavy external dependencies)

**Overall Assessment:** 8/10
- Excellent architecture and parallelization
- Comprehensive feature set
- Some complexity and cost concerns
- Would benefit from consolidation and standardization

---

## Appendix: File Inventory

### Core Files
- `SKILL.md` - Main skill definition (233 lines)
- `workflows/conduct.md` - Multi-source research (507 lines)
- `workflows/claude-research.md` - Claude research (107 lines)
- `workflows/perplexity-research.md` - Perplexity research (256 lines)
- `workflows/retrieve.md` - Content retrieval (509 lines)
- `workflows/fabric.md` - Fabric patterns (388 lines)
- `workflows/youtube-extraction.md` - YouTube extraction (77 lines)
- `workflows/web-scraping.md` - Web scraping (72 lines)
- `workflows/extract-knowledge.md` - Knowledge extraction (160 lines)
- `workflows/enhance.md` - Content enhancement (83 lines)
- `workflows/interview-research.md` - Interview prep (113 lines)

### Agent Files
- `agents/claude-researcher.md` (77 lines)
- `agents/perplexity-researcher.md` (80 lines)
- `agents/gemini-researcher.md` (167 lines)
- `agents/web-search-researcher.md`
- `agents/researcher.md`

### Total Lines of Code/Documentation
- Workflows: ~2,505 lines
- Agents: ~400+ lines
- **Total: ~3,000+ lines**

---

**Analysis Complete**
