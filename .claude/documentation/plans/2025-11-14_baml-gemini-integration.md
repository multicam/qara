# BAML Skills + Gemini Research Integration Plan

**Date:** 2025-11-14

**Status:** Planning Phase

**Author:** Qara

**Estimated Time:** 24 hours (3 focused days)

## Executive Summary

This document outlines a comprehensive plan to integrate BAML (Boundary AI Markup Language)
structured output capabilities with the existing Gemini research infrastructure in the PAI system.
The integration will provide type-safe, schema-validated research outputs with confidence scoring
and source attribution.

## Table of Contents

1. [Current Infrastructure Assessment](#current-infrastructure-assessment)
2. [Integration Architecture](#integration-architecture)
3. [BAML Project Structure](#baml-project-structure)
4. [Research Schema Definitions](#research-schema-definitions)
5. [Gemini Enhancement Strategy](#gemini-enhancement-strategy)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Configuration Requirements](#configuration-requirements)
8. [Expected Benefits](#expected-benefits)
9. [Quick Start Guide](#quick-start-guide)

## Current Infrastructure Assessment

### Existing Components

**Installed Tools:**

- BAML CLI: v0.212.0 (`/usr/bin/baml`)
- Gemini CLI: Available (`/usr/local/bin/gemini`)
- Bun runtime: Latest
- Python with uv: Available

**Current Agents:**

- `architect.md` - System design and PRD creation
- `engineer.md` - Code implementation
- `designer.md` - UX/UI design
- `researcher.md` - General research coordination
- `claude-researcher.md` - Claude WebSearch research
- `gemini-researcher.md` - Gemini multi-perspective research

**Research Infrastructure:**

- Parallel agent execution (3/9/24 agent modes)
- Quick/Standard/Extensive research modes
- Multi-source validation
- Timeout management (2/3/10 minute timeouts)
- Scratchpad → History archival pattern

**API Integrations:**

- Anthropic Claude API (ANTHROPIC_API_KEY)
- Google Gemini API (GOOGLE_API_KEY)
- OpenAI API (OPENAI_API_KEY)
- Perplexity API (PERPLEXITY_API_KEY)

### Integration Opportunities

1. **BAML Structured Outputs** - Replace manual research synthesis with schema-validated extraction
2. **Type Safety** - Full TypeScript/Python type hints for research data
3. **Confidence Scoring** - Automated confidence level assignment based on multi-source agreement
4. **Source Attribution** - Structured source tracking with URLs, dates, and types
5. **Quality Metrics** - Measurable research quality with schema validation
6. **Agent Observability** - Enhanced logging with structured research schemas

## Integration Architecture

### High-Level Overview

```text
User Research Request
    ↓
Research Skill (conduct-research)
    ↓
Query Decomposition (3/9/24 variations)
    ↓
Parallel Agent Execution
    ├── perplexity-researcher → Raw Output
    ├── claude-researcher → Raw Output
    └── gemini-researcher → Raw Output
    ↓
BAML Structured Extraction (NEW)
    ├── ExtractResearchFindings()
    └── SynthesizeMultiAgentResearch()
    ↓
ComprehensiveResearch Schema
    ├── Executive Summary
    ├── Findings by Topic
    ├── Confidence Levels
    ├── Source Attribution
    └── Recommendations
    ↓
Return to User (Type-Safe)
```

### Key Architectural Decisions

**1. BAML Project Location:**

- Root: `${PAI_DIR}/baml/`
- Generated clients: `${PAI_DIR}/baml/baml_client/{typescript,python}/`
- BAML sources: `${PAI_DIR}/baml/baml_src/`

**2. Integration Strategy:**

- Non-breaking: Existing research skill continues to work
- Gradual migration: New `baml-research` skill alongside existing `research` skill
- Opt-in: Users can choose BAML-powered or traditional research

**3. Language Choice:**

- Primary: TypeScript (for Bun-based hooks and agents)
- Secondary: Python (for compatibility with existing Python utilities)
- Both: BAML generates clients for both languages

## BAML Project Structure

### Directory Layout

```text
${PAI_DIR}/
├── baml/                                   # BAML project root
│   ├── baml_src/                           # BAML source files
│   │   ├── generators.baml                 # Code generation config
│   │   ├── clients.baml                    # LLM client definitions
│   │   ├── types.baml                      # Shared type definitions
│   │   └── functions/                      # BAML function definitions
│   │       ├── research.baml               # Research extraction schemas
│   │       ├── analysis.baml               # Analysis schemas
│   │       ├── extraction.baml             # Data extraction schemas
│   │       └── synthesis.baml              # Information synthesis schemas
│   ├── baml_client/                        # Generated client code
│   │   ├── typescript/                     # TS generated code
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── python/                         # Python generated code
│   │       ├── __init__.py
│   │       └── types.py
│   ├── lib/                                # Helper modules
│   │   ├── gemini-baml-wrapper.ts          # Gemini + BAML integration
│   │   ├── research-orchestrator.ts        # Research coordination
│   │   └── confidence-calculator.ts        # Confidence scoring logic
│   ├── tests/                              # Test files
│   │   ├── test_research_extraction.ts     # TypeScript tests
│   │   └── test_synthesis.py               # Python tests
│   ├── package.json                        # TypeScript dependencies
│   ├── requirements.txt                    # Python dependencies
│   ├── tsconfig.json                       # TypeScript config
│   └── README.md                           # BAML project documentation
│
├── skills/
│   ├── baml-research/                      # NEW: BAML-powered research skill
│   │   ├── SKILL.md                        # Skill definition
│   │   ├── workflows/
│   │   │   ├── structured-research.md      # BAML research workflow
│   │   │   └── confidence-scoring.md       # Confidence calculation guide
│   │   └── examples/
│   │       ├── usage-examples.md
│   │       └── sample-outputs.json
│   │
│   ├── baml-extraction/                    # NEW: Structured data extraction
│   │   ├── SKILL.md
│   │   ├── workflows/
│   │   │   └── extract-data.md
│   │   └── examples/
│   │       └── extraction-examples.md
│   │
│   └── research/                           # EXISTING: Optionally enhanced
│       ├── SKILL.md
│       └── workflows/
│           └── conduct.md                  # Can reference BAML functions
```

### File: `${PAI_DIR}/baml/baml_src/generators.baml`

```baml
generator lang_typescript {
  output_type typescript
  output_dir "../baml_client/typescript"
  version "0.212.0"
}

generator lang_python {
  output_type python/pydantic
  output_dir "../baml_client/python"
  version "0.212.0"
}

generator openapi {
  output_type rest/openapi
  output_dir "../baml_client/openapi"
  version "0.212.0"
  on_generate "echo '\n✅ OpenAPI spec generated at baml_client/openapi/openapi.yaml'"
}
```

### File: `${PAI_DIR}/baml/baml_src/clients.baml`

```baml
// LLM client definitions for BAML functions

client<llm> Claude {
  provider anthropic
  options {
    model "claude-sonnet-4-5-20250929"
    api_key env.ANTHROPIC_API_KEY
    temperature 0.7
    max_tokens 4096
  }
}

client<llm> Gemini {
  provider google-ai
  options {
    model "gemini-2.0-flash-exp"
    api_key env.GOOGLE_API_KEY
    temperature 0.7
    max_output_tokens 4096
  }
}

client<llm> GPT4 {
  provider openai
  options {
    model "gpt-4-turbo-preview"
    api_key env.OPENAI_API_KEY
    temperature 0.7
    max_tokens 4096
  }
}

// Fallback strategy for reliability
client<llm> Resilient {
  provider fallback
  options {
    strategy [Claude, Gemini, GPT4]
  }
}
```

## Research Schema Definitions

### File: `${PAI_DIR}/baml/baml_src/types.baml`

```baml
// Core research types

enum ConfidenceLevel {
  HIGH        // Multiple sources, corroborated
  MEDIUM      // Single reliable source
  LOW         // Needs verification
  SPECULATIVE // Theoretical or unconfirmed
}

enum SourceType {
  ACADEMIC_PAPER
  NEWS_ARTICLE
  OFFICIAL_DOCUMENTATION
  BLOG_POST
  SOCIAL_MEDIA
  EXPERT_OPINION
  TECHNICAL_REPORT
  VIDEO
  PODCAST
  OTHER
}

class Source {
  title string @description("Title or description of the source")
  url string? @description("URL if available")
  type SourceType @description("Type of source")
  date string? @description("Publication date if available (YYYY-MM-DD)")
  author string? @description("Author or organization")
  excerpt string? @description("Relevant excerpt from source")
}

class ResearchFinding {
  finding string @description("The actual finding or fact discovered")
  confidence ConfidenceLevel @description("Confidence level in this finding")
  sources Source[] @description("Sources supporting this finding")
  contradictions string[] @description("Any contradictory information found")
  context string? @description("Additional context or caveats")
  tags string[] @description("Tags for categorization")
}

class ResearchSection {
  topic string @description("The topic or aspect covered")
  summary string @description("Summary of findings for this topic")
  key_findings ResearchFinding[] @description("Key findings with sources")
  gaps string[] @description("Identified knowledge gaps or uncertainties")
}

class ResearchMetadata {
  research_question string @description("The original research question")
  research_mode string @description("Quick/Standard/Extensive")
  total_agents int @description("Number of agents used")
  agent_types string[] @description("Types of agents (perplexity, claude, gemini)")
  total_queries int @description("Total number of queries executed")
  research_duration_seconds int? @description("Time taken for research")
  research_date string @description("Date research was conducted (YYYY-MM-DD)")
}

class ComprehensiveResearch {
  metadata ResearchMetadata @description("Research execution metadata")
  executive_summary string @description("High-level overview of all findings")
  sections ResearchSection[] @description("Organized research findings by topic")
  methodology string @description("How the research was conducted")
  overall_confidence ConfidenceLevel @description("Overall confidence in research")
  limitations string[] @description("Limitations and caveats")
  recommendations string[] @description("Actionable recommendations based on findings")
  total_sources int @description("Total number of unique sources consulted")
  conflicting_information string[] @description("Areas where sources disagree")
}
```

### Confidence Level Assignment Rules

**HIGH Confidence:**

- 3+ independent sources agree
- Academic papers or official documentation
- Recent and corroborated information
- Expert consensus

**MEDIUM Confidence:**

- 2 sources agree
- Single detailed authoritative source
- Technical reports or analysis
- Reasonable inference from reliable data

**LOW Confidence:**

- Single source mention
- Limited detail or context
- Older information without recent confirmation
- Secondary sources

**SPECULATIVE Confidence:**

- Theoretical or unconfirmed
- No source agreement
- Future predictions
- Opinions without supporting evidence

## Gemini Enhancement Strategy

### File: `${PAI_DIR}/baml/baml_src/functions/research.baml`

```baml
// Research extraction and synthesis functions

function ExtractResearchFindings(
  raw_research string @description("Raw research output from any agent"),
  research_query string @description("The original research query"),
  agent_type string @description("Type of agent: perplexity/claude/gemini")
) -> ResearchSection {
  client Gemini
  prompt #"
    You are analyzing research output from a {{ agent_type }} agent
    to extract structured findings.

    Research Query: {{ research_query }}

    Raw Research Output:
    {{ raw_research }}

    Extract and structure this research into organized findings with:
    1. Clear topic identification
    2. Individual findings with confidence levels
    3. Source attribution where available (URLs, titles, authors, dates)
    4. Contradictions or uncertainties noted
    5. Tags for categorization

    Confidence Level Guidelines:
    - HIGH: Multiple independent sources agree, or authoritative source
    - MEDIUM: Single reliable source with detail
    - LOW: Limited sourcing, needs verification
    - SPECULATIVE: Theoretical, unconfirmed, or opinion-based

    For sources, extract:
    - Exact titles or descriptions
    - URLs when mentioned
    - Publication dates (YYYY-MM-DD format if available)
    - Authors or organizations
    - Brief relevant excerpts (1-2 sentences)

    {{ ctx.output_format }}
  "#
}

function SynthesizeMultiAgentResearch(
  agent_outputs string[] @description("Outputs from multiple research agents"),
  research_question string @description("The original research question"),
  research_metadata string @description("JSON metadata about research execution")
) -> ComprehensiveResearch {
  client Claude
  prompt #"
    You are synthesizing research from {{ agent_outputs.length }} parallel research agents.

    Research Question: {{ research_question }}

    Research Metadata: {{ research_metadata }}

    Agent Outputs:
    {% for output in agent_outputs %}

    --- Agent {{ loop.index }} ---
    {{ output }}

    {% endfor %}

    Synthesize these diverse perspectives into a comprehensive research report:

    1. **Identify Common Themes**: Findings mentioned by multiple agents
    2. **Unique Insights**: Valuable findings from individual agents
    3. **Contradictions**: Flag disagreements with source attribution
    4. **Confidence Assignment**: Based on multi-source agreement
       - HIGH: 3+ agents agree, or strong authoritative sources
       - MEDIUM: 2 agents agree, or detailed single analysis
       - LOW: Single agent mention, limited detail
       - SPECULATIVE: Theoretical, no agent agreement
    5. **Topic Organization**: Group findings into logical sections
    6. **Source Attribution**: Track which agents/sources provided each finding
    7. **Recommendations**: Actionable conclusions based on evidence
    8. **Knowledge Gaps**: Areas needing further research

    Executive Summary Requirements:
    - 2-3 paragraph overview
    - Highlight most important findings
    - Note overall confidence level
    - Mention key limitations

    {{ ctx.output_format }}
  "#
}

function QuickResearchExtraction(
  perplexity_output string @description("Output from perplexity-researcher"),
  claude_output string @description("Output from claude-researcher"),
  gemini_output string @description("Output from gemini-researcher"),
  query string @description("Research query")
) -> ComprehensiveResearch {
  client Gemini
  prompt #"
    Quick research synthesis from 3 specialized agents.

    Query: {{ query }}

    === Perplexity (Web/Current Information) ===
    {{ perplexity_output }}

    === Claude (Academic/Detailed Analysis) ===
    {{ claude_output }}

    === Gemini (Multi-Perspective Synthesis) ===
    {{ gemini_output }}

    Synthesize these three perspectives:

    1. Identify key agreements across all three agents
    2. Note unique insights from each agent type
    3. Flag any contradictions or disagreements
    4. Assign confidence levels:
       - HIGH: All 3 agents agree
       - MEDIUM: 2 agents agree
       - LOW: Single agent mention
    5. Extract source attribution from each output
    6. Provide 1-2 actionable recommendations

    Keep synthesis concise - this is quick research mode.
    Focus on speed and clarity over exhaustive detail.

    {{ ctx.output_format }}
  "#
}

function ValidateResearchQuality(
  research ComprehensiveResearch @description("Research to validate")
) -> ResearchQualityReport {
  client Claude
  prompt #"
    Analyze this research report for quality and completeness.

    Research Report:
    {{ research }}

    Assess:
    1. Source quality and diversity
    2. Confidence level justification
    3. Completeness of coverage
    4. Contradiction resolution
    5. Actionability of recommendations

    Provide quality score (0-100) and improvement suggestions.

    {{ ctx.output_format }}
  "#
}
```

### Additional BAML Type for Quality Validation

```baml
class ResearchQualityReport {
  overall_score int @description("Quality score 0-100")
  source_quality_score int @description("Source quality 0-100")
  confidence_justification_score int @description("How well confidence is justified 0-100")
  coverage_score int @description("Completeness of coverage 0-100")
  strengths string[] @description("What the research does well")
  weaknesses string[] @description("Areas for improvement")
  improvement_suggestions string[] @description("Specific suggestions")
}
```

## Implementation Roadmap

### Phase 1: BAML Infrastructure Setup (Day 1 - 4 hours)

**Goal:** Initialize BAML project with working code generation

**Tasks:**

1. Create BAML project structure in `${PAI_DIR}/baml/`
2. Configure generators for TypeScript and Python
3. Set up LLM client definitions
4. Define core research types
5. Generate initial client code
6. Test basic BAML function execution

**Commands:**

```bash
cd ${PAI_DIR}
mkdir -p baml/baml_src/functions
cd baml

# Initialize BAML project (if needed)
baml init

# Create generators.baml
cat > baml_src/generators.baml <<'EOF'
generator lang_typescript {
  output_type typescript
  output_dir "../baml_client/typescript"
  version "0.212.0"
}

generator lang_python {
  output_type python/pydantic
  output_dir "../baml_client/python"
  version "0.212.0"
}
EOF

# Create clients.baml (copy from section above)
# Create types.baml (copy from section above)

# Generate clients
baml generate

# Set up TypeScript dependencies
cat > package.json <<'EOF'
{
  "name": "pai-baml-client",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@boundaryml/baml": "^0.212.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8.3"
  }
}
EOF

bun install

# Set up Python dependencies
cat > requirements.txt <<'EOF'
baml-py>=0.212.0
pydantic>=2.0.0
python-dotenv>=1.0.0
EOF

uv pip install -r requirements.txt
```

**Validation:**

```bash
# Test TypeScript client generation
ls -la baml_client/typescript/

# Test Python client generation
ls -la baml_client/python/

# Verify types are accessible
bun run -e "import { b } from './baml_client/typescript/index.js'; console.log('✅ BAML client loaded')"
```

**Success Criteria:**

- BAML generates TypeScript client successfully
- BAML generates Python client successfully
- Type definitions accessible in both languages
- No generation errors

**Files Created:**

- `${PAI_DIR}/baml/baml_src/generators.baml`
- `${PAI_DIR}/baml/baml_src/clients.baml`
- `${PAI_DIR}/baml/baml_src/types.baml`
- `${PAI_DIR}/baml/package.json`
- `${PAI_DIR}/baml/requirements.txt`
- `${PAI_DIR}/baml/baml_client/typescript/` (generated)
- `${PAI_DIR}/baml/baml_client/python/` (generated)

---

### Phase 2: Core BAML Research Functions (Day 1-2 - 6 hours)

**Goal:** Implement and test research extraction and synthesis functions

**Tasks:**

1. Implement `ExtractResearchFindings` function
2. Implement `SynthesizeMultiAgentResearch` function
3. Implement `QuickResearchExtraction` function
4. Create TypeScript test harness
5. Create Python test harness
6. Validate output schemas

**Implementation:**

```bash
cd ${PAI_DIR}/baml

# Create research.baml (copy from section above)
cat > baml_src/functions/research.baml <<'EOF'
# Copy research.baml content from above section
EOF

# Regenerate clients with new functions
baml generate

# Create test file
cat > tests/test_research_extraction.ts <<'EOF'
#!/usr/bin/env bun
import { b } from '../baml_client/typescript';

// Test with sample research output
const sampleResearch = `
Recent developments in quantum computing show significant progress.
Google announced quantum supremacy in 2024 with their Willow chip.
IBM is focusing on error correction with quantum error mitigation.
Multiple sources report 95% error reduction compared to 2023.
`;

async function testExtraction() {
  try {
    const result = await b.ExtractResearchFindings(
      sampleResearch,
      "Latest quantum computing developments",
      "gemini"
    );

    console.log('✅ Research extraction successful');
    console.log('Topic:', result.topic);
    console.log('Findings:', result.key_findings.length);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testExtraction();
EOF

chmod +x tests/test_research_extraction.ts
```

**Testing:**

```bash
# Run TypeScript test
bun run tests/test_research_extraction.ts

# Expected output:
# ✅ Research extraction successful
# Topic: Quantum Computing Developments
# Findings: 3
# [Structured JSON output]
```

**Success Criteria:**

- Functions execute without errors
- Output conforms to ComprehensiveResearch schema
- Confidence levels assigned correctly
- Source attribution preserved
- TypeScript types validate

**Files Created:**

- `${PAI_DIR}/baml/baml_src/functions/research.baml`
- `${PAI_DIR}/baml/tests/test_research_extraction.ts`
- `${PAI_DIR}/baml/tests/test_synthesis.py`

---

### Phase 3: Gemini Research Integration (Day 2-3 - 8 hours)

**Goal:** Integrate BAML with gemini-researcher agent and research skill

**Tasks:**

1. Create Gemini + BAML wrapper module
2. Update `gemini-researcher.md` agent definition (optional - create v2)
3. Create `baml-research` skill
4. Update research workflow documentation
5. Test end-to-end: User query → Agents → BAML → Output

**Implementation:**

**File: `${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts`**

```typescript
#!/usr/bin/env bun
/**
 * Gemini CLI + BAML Integration
 * Combines fast Gemini searches with structured BAML extraction
 */

import { $ } from 'bun';
import { b } from '../baml_client/typescript';

export interface GeminiBAMLConfig {
  query: string;
  numVariations?: number;  // 3, 9, or 24
  mode?: 'quick' | 'standard' | 'extensive';
  timeout?: number;  // milliseconds
}

/**
 * Decompose query into N variations for parallel execution
 */
async function decomposeQuery(query: string, numVariations: number): Promise<string[]> {
  const prompt = `Break down this research question into ${numVariations} focused sub-questions.
Each sub-question should explore a different angle or aspect.
Ensure no duplication of efforts.

Research Question: ${query}

Return ONLY the ${numVariations} sub-questions, one per line.`;

  const result = await $`gemini "${prompt}"`.text();
  const variations = result.trim().split('\n')
    .filter(line => line.trim().length > 0)
    .slice(0, numVariations);

  return variations;
}

/**
 * Execute parallel Gemini searches
 */
async function executeParallelSearches(variations: string[]): Promise<string[]> {
  const searches = variations.map(async (variation) => {
    try {
      const result = await $`gemini "${variation}"`.text();
      return result;
    } catch (error) {
      console.error(`❌ Gemini search failed for: ${variation.slice(0, 50)}...`);
      return `[Search failed: ${error}]`;
    }
  });

  return Promise.all(searches);
}

/**
 * Main research function with BAML extraction
 */
export async function researchWithGeminiBAML(
  config: GeminiBAMLConfig
): Promise<any> {  // Returns ComprehensiveResearch type from BAML
  const startTime = Date.now();
  const numVariations = config.numVariations || 5;

  console.log(`🔬 Starting ${config.mode || 'standard'} research with ${numVariations} agents`);

  // Step 1: Decompose query
  console.log('📋 Decomposing query into variations...');
  const variations = await decomposeQuery(config.query, numVariations);
  console.log(`✅ Generated ${variations.length} query variations`);

  // Step 2: Execute parallel Gemini searches
  console.log('🚀 Launching parallel Gemini searches...');
  const rawOutputs = await executeParallelSearches(variations);
  console.log(`✅ Received ${rawOutputs.length} search results`);

  // Step 3: BAML structured extraction and synthesis
  console.log('🧠 Synthesizing with BAML...');
  const metadata = JSON.stringify({
    research_question: config.query,
    research_mode: config.mode || 'standard',
    total_agents: numVariations,
    agent_types: ['gemini'],
    total_queries: numVariations,
    research_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
    research_date: new Date().toISOString().split('T')[0]
  });

  const research = await b.SynthesizeMultiAgentResearch(
    rawOutputs,
    config.query,
    metadata
  );

  console.log('✅ BAML synthesis complete');
  console.log(`📊 Total sources: ${research.total_sources}`);
  console.log(`🎯 Overall confidence: ${research.overall_confidence}`);

  return research;
}

// CLI execution support
if (import.meta.main) {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: ./gemini-baml-wrapper.ts "your research query"');
    process.exit(1);
  }

  const result = await researchWithGeminiBAML({
    query,
    mode: 'standard',
    numVariations: 5
  });

  console.log('\n📄 RESEARCH RESULTS:\n');
  console.log(JSON.stringify(result, null, 2));
}
```

**File: `${PAI_DIR}/skills/baml-research/SKILL.md`**

```markdown
---
name: baml-research
description: BAML-powered structured research with type-safe outputs, confidence scoring, and source attribution. Provides guaranteed schema compliance for research data.
---

# BAML-Powered Research Skill

## Overview

This skill enhances the standard research workflow with BAML (Boundary AI Markup Language)
structured outputs, providing:

- Type-safe research data
- Confidence level scoring
- Structured source attribution
- Schema-validated outputs
- Quality metrics

## When to Use

Use this skill when you need:

- Structured research data for further processing
- Confidence scores for findings
- Systematic source tracking
- Type-safe integration with other systems
- Quality metrics and validation

## Execution

**Invoke the wrapper directly:**

```bash
${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts "your research question"
```

**Or use from TypeScript/Python:**

```typescript
import { researchWithGeminiBAML } from '${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts';

const result = await researchWithGeminiBAML({
  query: "Latest developments in quantum computing",
  mode: "standard",
  numVariations: 9
});

// Result is type-safe ComprehensiveResearch object
console.log(result.executive_summary);
console.log(result.sections[0].key_findings);
```

## Output Schema

See `${PAI_DIR}/baml/baml_src/types.baml` for complete schema definitions.

**Key types:**

- `ComprehensiveResearch` - Top-level research report
- `ResearchSection` - Findings organized by topic
- `ResearchFinding` - Individual finding with confidence and sources
- `Source` - Source attribution (title, URL, date, author)
- `ConfidenceLevel` - HIGH, MEDIUM, LOW, SPECULATIVE

## Benefits Over Standard Research

| Feature | Standard Research | BAML Research |
|---------|------------------|---------------|
| Output Format | Unstructured markdown | Structured JSON schema |
| Type Safety | None | Full TypeScript/Python types |
| Confidence Scoring | Manual | Automated schema-based |
| Source Attribution | Text mentions | Structured Source objects |
| Quality Validation | Manual | Schema validation |
| IDE Support | None | Full autocomplete |
| Testing | Manual inspection | Type-safe unit tests |
| Observability | Text logging | Structured data logging |

**Testing End-to-End:**

```bash
# Test the complete workflow
cd ${PAI_DIR}/baml/lib
./gemini-baml-wrapper.ts "What are the best practices for TypeScript error handling?"

# Expected output:
# 🔬 Starting standard research with 5 agents
# 📋 Decomposing query into variations...
# ✅ Generated 5 query variations
# 🚀 Launching parallel Gemini searches...
# ✅ Received 5 search results
# 🧠 Synthesizing with BAML...
# ✅ BAML synthesis complete
# 📊 Total sources: 12
# 🎯 Overall confidence: HIGH
# [Structured JSON output]
```

**Success Criteria:**

- Wrapper executes without errors
- Query decomposition produces N variations
- Parallel Gemini searches complete
- BAML synthesis returns ComprehensiveResearch
- Output validates against schema
- Confidence levels assigned correctly
- Sources extracted and structured

**Files Created:**

- `${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts`
- `${PAI_DIR}/skills/baml-research/SKILL.md`
- `${PAI_DIR}/skills/baml-research/workflows/structured-research.md`
- `${PAI_DIR}/skills/baml-research/examples/usage-examples.md`

---

### Phase 4: Advanced BAML Skills (Day 3+ - 12 hours, optional)

**Goal:** Create additional BAML-powered skills beyond research

**Skills to Implement:**

1. **baml-extraction** - Extract structured data from unstructured text
2. **baml-analysis** - Structured code/document analysis
3. **baml-synthesis** - Multi-source information synthesis
4. **baml-validation** - Quality validation and scoring

**Example: baml-extraction Skill**

```baml
// File: ${PAI_DIR}/baml/baml_src/functions/extraction.baml

class ContactInfo {
  name string @description("Full name")
  email string? @description("Email address")
  phone string? @description("Phone number")
  company string? @description("Company or organization")
  role string? @description("Job title or role")
  linkedin string? @description("LinkedIn profile URL")
  location string? @description("Location or address")
}

function ExtractContacts(text string) -> ContactInfo[] {
  client Claude
  prompt #"
    Extract all contact information from this text.
    Return structured contact objects for each person mentioned.
    Include all available fields (name, email, phone, company, role, etc.)

    Text: {{ text }}

    {{ ctx.output_format }}
  "#
}

class TechnicalSpec {
  product_name string
  version string?
  features string[]
  requirements string[]
  performance_metrics map<string, string>
  compatibility string[]
  pricing string?
}

function ExtractTechnicalSpecs(documentation string) -> TechnicalSpec {
  client Claude
  prompt #"
    Extract technical specifications from this product documentation.
    Structure all features, requirements, metrics, and compatibility info.

    Documentation: {{ documentation }}

    {{ ctx.output_format }}
  "#
}
```

**Integration Opportunities:**

1. **Hook Integration:**
   - Use BAML extraction in `capture-all-events.ts` for structured event logging
   - Use BAML analysis in `stop-hook.ts` for session summaries
   - Use BAML synthesis in documentation hooks for README generation

2. **Agent Integration:**
   - `architect` agent uses BAML for PRD structure
   - `engineer` agent uses BAML for code review structure
   - `designer` agent uses BAML for design spec extraction

3. **Observability Integration:**
   - Log BAML schemas in agent-observability system
   - Track research quality metrics over time
   - Analyze confidence score distributions

---

## Configuration Requirements

### Environment Variables

**File: `${PAI_DIR}/.env`**

```bash
# No new API keys required - BAML uses existing keys

# Already configured:
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
OPENAI_API_KEY=your_openai_key

# PAI Directory (ensure this is set)
PAI_DIR=/home/jean-marc/qara/.claude
```

### Dependencies

**TypeScript (`${PAI_DIR}/baml/package.json`):**

```json
{
  "name": "pai-baml-client",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@boundaryml/baml": "^0.212.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.8.3",
    "@types/node": "^24.10.1"
  },
  "scripts": {
    "generate": "baml generate",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

**Python (`${PAI_DIR}/baml/requirements.txt`):**

```txt
baml-py>=0.212.0
pydantic>=2.0.0
python-dotenv>=1.0.0
```

### TypeScript Configuration

**File: `${PAI_DIR}/baml/tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@baml/*": ["./baml_client/typescript/*"]
    }
  },
  "include": [
    "lib/**/*",
    "tests/**/*",
    "baml_client/typescript/**/*"
  ]
}
```

## Expected Benefits

### Performance

- **Speed:** ~100-200ms BAML overhead (minimal impact on 30-60 second research time)
- **Parallelization:** Better async/await patterns with type-safe BAML client
- **Caching:** BAML can cache LLM responses for identical queries (future optimization)

### Quality

- **Schema Compliance:** Guaranteed output structure, no parsing errors
- **Type Safety:** Catch structural errors at compile time
- **Consistency:** Same schema across quick/standard/extensive modes
- **Validation:** Built-in schema validation for all outputs

### Developer Experience

- **IDE Support:** Full autocomplete for research data structures
- **Debugging:** Clear type errors instead of runtime parsing failures
- **Testing:** Easy to write type-safe unit tests
- **Maintainability:** Prompts separated from code logic in BAML files

### Observability

- **Structured Logging:** Agent observability can log structured schemas
- **Quality Metrics:** Track confidence score distributions over time
- **Source Analysis:** Analyze which source types are most valuable
- **Performance Tracking:** Measure BAML function execution times

### Quantified Benefits

| Metric | Before (Manual) | After (BAML) | Improvement |
|--------|----------------|--------------|-------------|
| Output Structure | Unstructured | Schema-validated | 100% compliance |
| Type Safety | None | Full TS/Python | Zero parsing errors |
| Confidence Scoring | Manual | Automated | Consistent standards |
| Source Attribution | Text mentions | Structured objects | Programmatic access |
| Testing Effort | Manual inspection | Unit tests | 80% reduction |
| IDE Support | None | Full autocomplete | N/A (new capability) |
| Quality Metrics | None | Tracked | N/A (new capability) |

## Quick Start Guide

### Option A: Infrastructure-First (Recommended)

```bash
# 1. Set up BAML project
cd ${PAI_DIR}
mkdir -p baml/baml_src/functions
cd baml
baml init

# 2. Copy configuration files
# - generators.baml
# - clients.baml
# - types.baml

# 3. Generate clients
baml generate

# 4. Install dependencies
bun install
uv pip install -r requirements.txt

# 5. Test basic function
bun run tests/test_research_extraction.ts
```

### Option B: Prototype-First

```bash
# 1. Create minimal BAML project
cd ${PAI_DIR}/baml
echo 'generator lang_typescript { output_type typescript; output_dir "client"; }' > test.baml

# 2. Test one BAML function
# Create simple extraction function
# Test with sample data
# Validate output

# 3. Expand once proven
```

### Option C: Gradual Migration

```bash
# 1. Keep existing research skill running
# 2. Create baml-research skill alongside
# 3. Test both in parallel
# 4. Compare outputs
# 5. Migrate once BAML version proves stable
```

### First Commands to Run

```bash
# Initialize BAML project
cd ${PAI_DIR}
mkdir -p baml/baml_src/functions
cd baml
baml init

# Generate initial client
baml generate

# Verify installation
ls -la baml_client/typescript/
ls -la baml_client/python/
```

## Success Metrics

### Phase 1 Success Metrics

- [ ] BAML project initialized
- [ ] TypeScript client generated
- [ ] Python client generated
- [ ] Type definitions accessible
- [ ] Basic function test passes

### Phase 2 Success Metrics

- [ ] Research extraction function works
- [ ] Synthesis function works
- [ ] Quick research function works
- [ ] Output validates against schema
- [ ] Confidence levels assigned correctly

### Phase 3 Success Metrics

- [ ] Gemini wrapper executes end-to-end
- [ ] Query decomposition produces variations
- [ ] Parallel searches complete
- [ ] BAML synthesis returns valid schema
- [ ] baml-research skill documented
- [ ] Integration test passes

### Phase 4 Success Metrics

- [ ] Additional BAML skills created
- [ ] Hook integration implemented
- [ ] Agent integration implemented
- [ ] Observability integration working
- [ ] Documentation complete

## Troubleshooting

### Common Issues

**Issue: BAML generation fails**

```bash
# Solution: Verify BAML syntax
baml validate

# Check for syntax errors in .baml files
# Ensure all types are defined before use
```

**Issue: TypeScript import errors**

```bash
# Solution: Verify tsconfig.json paths
cat tsconfig.json | grep paths

# Regenerate BAML client
baml generate

# Check generated files exist
ls baml_client/typescript/
```

**Issue: Confidence levels incorrect**

```text
Solution: Review prompt instructions in research.baml
Ensure confidence assignment rules are clear
Test with known multi-source examples
Validate against manual confidence assessment
```

**Issue: Source attribution missing**

```text
Solution: Update ExtractResearchFindings prompt
Add explicit instruction to extract URLs, titles, dates
Test with research output containing clear sources
Verify Source schema includes all needed fields
```

### Getting Help

- BAML Documentation: <https://docs.boundaryml.com>
- BAML GitHub: <https://github.com/BoundaryML/baml>
- PAI Documentation: `${PAI_DIR}/documentation/`

## Appendix

### File Checklist

**Phase 1 Files:**

- [ ] `${PAI_DIR}/baml/baml_src/generators.baml`
- [ ] `${PAI_DIR}/baml/baml_src/clients.baml`
- [ ] `${PAI_DIR}/baml/baml_src/types.baml`
- [ ] `${PAI_DIR}/baml/package.json`
- [ ] `${PAI_DIR}/baml/requirements.txt`
- [ ] `${PAI_DIR}/baml/tsconfig.json`

**Phase 2 Files:**

- [ ] `${PAI_DIR}/baml/baml_src/functions/research.baml`
- [ ] `${PAI_DIR}/baml/tests/test_research_extraction.ts`
- [ ] `${PAI_DIR}/baml/tests/test_synthesis.py`

**Phase 3 Files:**

- [ ] `${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts`
- [ ] `${PAI_DIR}/skills/baml-research/SKILL.md`
- [ ] `${PAI_DIR}/skills/baml-research/workflows/structured-research.md`
- [ ] `${PAI_DIR}/skills/baml-research/examples/usage-examples.md`

**Phase 4 Files (Optional):**

- [ ] `${PAI_DIR}/baml/baml_src/functions/extraction.baml`
- [ ] `${PAI_DIR}/baml/baml_src/functions/analysis.baml`
- [ ] `${PAI_DIR}/baml/baml_src/functions/synthesis.baml`
- [ ] `${PAI_DIR}/skills/baml-extraction/SKILL.md`
- [ ] `${PAI_DIR}/skills/baml-analysis/SKILL.md`

### Command Reference

```bash
# BAML Commands
baml init                  # Initialize BAML project
baml generate             # Generate client code
baml validate             # Validate BAML syntax
baml test                 # Run BAML tests
baml format               # Format BAML files

# Testing Commands
bun run tests/test_research_extraction.ts    # Test research extraction
uv run pytest tests/test_synthesis.py        # Test Python synthesis

# Integration Commands
${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts "query"   # Run BAML research
```

### References

- [BAML Documentation](https://docs.boundaryml.com)
- [PAI Research Skill](${PAI_DIR}/skills/research/SKILL.md)
- [Gemini Researcher Agent](${PAI_DIR}/agents/gemini-researcher.md)
- [Agent Observability](${PAI_DIR}/skills/agent-observability/SKILL.md)

---

**Document Version:** 1.0.0

**Last Updated:** 2025-11-14

**Status:** Planning Phase - Ready for Implementation

**Next Action:** Begin Phase 1 - BAML Infrastructure Setup
