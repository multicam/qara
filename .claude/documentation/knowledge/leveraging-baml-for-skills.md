# Leveraging BAML for Skills Development

**Last Updated:** 2025-11-14

**Author:** Qara (via gemini-researcher)

**Status:** Comprehensive Knowledge Base

## Table of Contents

1. [Introduction to BAML](#introduction-to-baml)
2. [Why BAML for Skills](#why-baml-for-skills)
3. [BAML Fundamentals](#baml-fundamentals)
4. [Function Composition and Workflows](#function-composition-and-workflows)
5. [Type System and Schema Design](#type-system-and-schema-design)
6. [Integration Patterns](#integration-patterns)
7. [Skills Development Patterns](#skills-development-patterns)
8. [Advanced Techniques](#advanced-techniques)
9. [Best Practices](#best-practices)
10. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
11. [Performance Considerations](#performance-considerations)
12. [Real-World Examples](#real-world-examples)
13. [Testing Strategies](#testing-strategies)
14. [BAML vs Alternatives](#baml-vs-alternatives)
15. [Future Directions](#future-directions)

## Introduction to BAML

### What is BAML?

BAML (Boundary AI Markup Language) is a domain-specific language designed to create **reliable, structured
interfaces** to Large Language Models (LLMs). It addresses one of the fundamental challenges in LLM application
development: transforming unstructured text outputs into type-safe, validated data structures.

**Core Philosophy:**

- **Separation of Concerns**: Prompts and schemas are defined separately from application logic
- **Type Safety**: Generated clients provide compile-time type checking
- **Multi-Language**: Generate TypeScript, Python, and other language clients from single source
- **Validation**: Automatic schema validation of LLM outputs
- **Versioning**: Track prompt and schema changes as code

### The Problem BAML Solves

**Without BAML:**

```typescript
// Manual parsing - fragile, error-prone
const response = await llm.complete("Extract contact info from: ...");
const parsed = JSON.parse(response);  // May fail
const email = parsed.email;  // No type checking
```

**With BAML:**

```typescript
// Type-safe, validated output
const contact = await b.ExtractContact(text);
const email = contact.email;  // TypeScript knows this is string | null
```

## Why BAML for Skills

### Benefits for PAI Skills System

**1. Structured Skill Outputs**

Skills can return guaranteed schemas instead of unstructured text:

- Research skill returns `ComprehensiveResearch` type
- Extraction skill returns `ContactInfo[]` type
- Analysis skill returns `CodeReview` type

**2. Type-Safe Agent Coordination**

When agents pass data between each other, types ensure compatibility:

```typescript
// Architect agent produces PRD
const prd: ProductRequirementDoc = await b.GeneratePRD(idea);

// Engineer agent consumes PRD (type-checked)
const implementation = await b.ImplementFeature(prd.features[0]);
```

**3. Quality Assurance**

Schema validation catches malformed outputs immediately:

- Missing required fields detected at runtime
- Enum validation ensures valid confidence levels
- Type mismatches caught before they propagate

**4. Developer Experience**

- IDE autocomplete for all skill outputs
- Compile-time error detection
- Self-documenting interfaces
- Easier testing and debugging

**5. Observability**

Structured outputs enable better logging:

- Log schemas to agent-observability system
- Track confidence score distributions
- Analyze skill quality over time
- Generate metrics from structured data

## BAML Fundamentals

### Core Concepts

#### 1. Types and Classes

```baml
// Enums for constrained values
enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
  SPECULATIVE
}

// Classes for structured data
class ResearchFinding {
  finding string @description("The actual finding")
  confidence ConfidenceLevel
  sources Source[]
  tags string[]
}
```

#### 2. Functions

```baml
function ExtractFindings(
  raw_text string,
  query string
) -> ResearchFinding[] {
  client Claude
  prompt #"
    Extract structured findings from this research:
    {{ raw_text }}

    Original query: {{ query }}

    {{ ctx.output_format }}
  "#
}
```

#### 3. Clients

```baml
client<llm> Claude {
  provider anthropic
  options {
    model "claude-sonnet-4-5-20250929"
    api_key env.ANTHROPIC_API_KEY
    temperature 0.7
  }
}
```

#### 4. Generators

```baml
generator lang_typescript {
  output_type typescript
  output_dir "../baml_client/typescript"
}

generator lang_python {
  output_type python/pydantic
  output_dir "../baml_client/python"
}
```

### BAML Syntax Essentials

**String Templates:**

```baml
prompt #"
  Process this text: {{ input_text }}
  Context: {{ context }}
  {{ ctx.output_format }}
"#
```

**Loops in Prompts:**

```baml
prompt #"
  {% for item in items %}
  - {{ item.name }}: {{ item.description }}
  {% endfor %}
"#
```

**Conditionals:**

```baml
prompt #"
  {% if include_examples %}
  Here are some examples:
  {{ examples }}
  {% endif %}
"#
```

**Optional Fields:**

```baml
class Contact {
  name string
  email string?  // Optional - can be null
  phone string?
}
```

**Arrays:**

```baml
class Report {
  findings ResearchFinding[]  // Array of findings
  tags string[]  // Array of strings
}
```

**Maps/Dictionaries:**

```baml
class Metrics {
  scores map<string, int>  // Key-value pairs
  metadata map<string, string>
}
```

## Function Composition and Workflows

### Orchestration Philosophy

**BAML functions are building blocks, not complete workflows.** Complex tasks require orchestration in a host
language (TypeScript/Python), where you:

1. Control execution flow
2. Handle errors and retries
3. Transform data between steps
4. Implement business logic
5. Coordinate multiple BAML functions

### The Decompose → Parallelize → Synthesize Pattern

This is the core pattern demonstrated in the `gemini-baml-wrapper.ts` example:

**Pattern Structure:**

```text
User Query
    ↓
[Decompose] Break into N sub-queries (TypeScript)
    ↓
[Parallelize] Execute N parallel searches (TypeScript + Gemini CLI)
    ↓
[Synthesize] Combine into structured output (BAML function)
    ↓
Type-Safe Result
```

**Implementation:**

```typescript
export async function researchWithGeminiBAML(config: GeminiBAMLConfig) {
  // STEP 1: Decompose (TypeScript orchestration)
  const variations = await decomposeQuery(config.query, config.numVariations);

  // STEP 2: Parallelize (TypeScript async/await)
  const rawOutputs = await Promise.all(
    variations.map(v => $`gemini "${v}"`.text())
  );

  // STEP 3: Synthesize (BAML function - structured output)
  const research = await b.SynthesizeMultiAgentResearch(
    rawOutputs,
    config.query,
    metadata
  );

  return research;  // Type: ComprehensiveResearch
}
```

**Why This Pattern Works:**

- **Decompose**: Breaks complexity into manageable pieces
- **Parallelize**: Executes independent tasks simultaneously (speed)
- **Synthesize**: Aggregates results with guaranteed structure (BAML)

### Chaining BAML Functions

**Sequential Composition:**

```typescript
async function runFullResearchWorkflow(query: string) {
  // Step 1: Research with BAML
  const research = await b.SynthesizeMultiAgentResearch(rawOutputs, query, metadata);

  // Step 2: Validate with another BAML function
  const qualityReport = await b.ValidateResearchQuality(research);

  // Step 3: Generate recommendations with yet another BAML function
  const recommendations = await b.GenerateActionItems(research);

  return { research, qualityReport, recommendations };
}
```

**Conditional Execution:**

```typescript
async function adaptiveResearch(query: string) {
  // Initial research
  const initialResearch = await b.QuickResearch(query);

  // Check quality
  const quality = await b.AssessResearchQuality(initialResearch);

  // If quality is low, do deeper research
  if (quality.overall_score < 70) {
    const deeperResearch = await b.ExtensiveResearch(query);
    return deeperResearch;
  }

  return initialResearch;
}
```

**Error Recovery Patterns:**

```typescript
async function resilientExtraction(text: string) {
  try {
    // Try primary extraction
    return await b.ExtractContacts(text);
  } catch (error) {
    // Fallback to simpler extraction
    console.warn('Primary extraction failed, using fallback');
    return await b.SimpleContactExtraction(text);
  }
}
```

### Managing Function Dependencies

**Explicit Data Flow:**

```typescript
interface ResearchPipeline {
  stage1_decomposition: string[];
  stage2_raw_outputs: string[];
  stage3_structured_output: ComprehensiveResearch;
  stage4_quality_report: ResearchQualityReport;
}

async function explicitPipeline(query: string): Promise<ResearchPipeline> {
  const stage1 = await decomposeQuery(query, 5);
  const stage2 = await executeParallelSearches(stage1);
  const stage3 = await b.SynthesizeMultiAgentResearch(stage2, query, metadata);
  const stage4 = await b.ValidateResearchQuality(stage3);

  return { stage1_decomposition: stage1, stage2_raw_outputs: stage2, stage3_structured_output: stage3, stage4_quality_report: stage4 };
}
```

**Benefits:**

- Clear data lineage
- Easy debugging (inspect each stage)
- Type safety at each step
- Testable intermediate states

## Type System and Schema Design

### Designing Effective BAML Types

**Principle 1: Start with the End in Mind**

Design your types based on how they'll be used, not just what data exists:

```baml
// ❌ BAD: Dumps all data without structure
class ResearchOutput {
  text string
  metadata string
}

// ✅ GOOD: Structured for consumption
class ComprehensiveResearch {
  executive_summary string
  sections ResearchSection[]
  overall_confidence ConfidenceLevel
  recommendations string[]
}
```

**Principle 2: Use Enums for Constrained Values**

```baml
// ✅ Enums prevent invalid values
enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
  SPECULATIVE
}

// ❌ String allows typos and inconsistency
class Finding {
  confidence string  // Could be "high", "High", "very high", etc.
}
```

**Principle 3: Make Optionality Explicit**

```baml
class Source {
  title string          // Required - will fail if missing
  url string?           // Optional - can be null
  author string?        // Optional
  date string?          // Optional
}
```

**Principle 4: Nest Related Data**

```baml
// ✅ GOOD: Related data grouped
class ResearchFinding {
  finding string
  confidence ConfidenceLevel
  sources Source[]         // Sources are nested
  contradictions string[]
}

// ❌ BAD: Flat structure loses relationships
class FlatFinding {
  finding string
  confidence string
  source_urls string[]  // Lost connection between source fields
  source_titles string[]
  source_authors string[]
}
```

### Advanced Type Patterns

**Discriminated Unions (via Enums):**

```baml
enum TaskType {
  RESEARCH
  EXTRACTION
  ANALYSIS
  SYNTHESIS
}

class Task {
  type TaskType
  description string
  priority int
  // Different logic based on type in host language
}
```

**Recursive Structures:**

```baml
class CodeElement {
  name string
  type string  // "function", "class", "module"
  children CodeElement[]  // Recursive - elements can contain elements
  metadata map<string, string>
}
```

**Validation Through Types:**

```baml
enum EmailValidation {
  VALID
  INVALID_FORMAT
  DISPOSABLE_DOMAIN
  UNKNOWN
}

class Contact {
  email string
  email_validation EmailValidation
}
```

## Integration Patterns

### TypeScript/Bun Integration

**Pattern 1: Skill Wrapper**

```typescript
// File: ${PAI_DIR}/skills/baml-extraction/lib/contact-extractor.ts

import { b } from '@/baml_client/typescript';

export interface ExtractionConfig {
  text: string;
  extractionType: 'contacts' | 'events' | 'specs';
}

export async function extractWithBAML(config: ExtractionConfig) {
  switch (config.extractionType) {
    case 'contacts':
      return await b.ExtractContacts(config.text);
    case 'events':
      return await b.ExtractEvents(config.text);
    case 'specs':
      return await b.ExtractTechnicalSpecs(config.text);
    default:
      throw new Error(`Unknown extraction type: ${config.extractionType}`);
  }
}
```

**Pattern 2: Agent Integration**

```typescript
// File: ${PAI_DIR}/agents/research-agent.ts

import { researchWithGeminiBAML } from '@/baml/lib/gemini-baml-wrapper';

export async function handleResearchRequest(query: string, mode: string) {
  const numVariations = mode === 'quick' ? 3 : mode === 'extensive' ? 24 : 9;

  const research = await researchWithGeminiBAML({
    query,
    numVariations,
    mode: mode as 'quick' | 'standard' | 'extensive'
  });

  // research is type-safe ComprehensiveResearch
  console.log(`Found ${research.total_sources} sources`);
  console.log(`Confidence: ${research.overall_confidence}`);

  return formatResearchForUser(research);
}
```

**Pattern 3: Hook Integration**

```typescript
// File: ${PAI_DIR}/hooks/capture-structured-events.ts

import { b } from '@/baml/baml_client/typescript';

async function captureEvent(hookData: any) {
  // Use BAML to extract structured data from hook event
  const structuredEvent = await b.ExtractHookEvent(JSON.stringify(hookData));

  // Now save with guaranteed schema
  await saveToDatabase(structuredEvent);
}
```

### Python Integration

**Pattern 1: Python Script with BAML**

```python
# File: ${PAI_DIR}/baml/scripts/analyze_research.py

from baml_client.python import b
import json

async def analyze_research_quality(research_file: str):
    """Analyze research quality using BAML validation."""
    with open(research_file, 'r') as f:
        research_data = json.load(f)

    # Validate and score research
    quality_report = await b.ValidateResearchQuality(research_data)

    print(f"Overall Score: {quality_report.overall_score}/100")
    print(f"Strengths: {', '.join(quality_report.strengths)}")

    if quality_report.overall_score < 70:
        print("⚠️  Research needs improvement")
        for suggestion in quality_report.improvement_suggestions:
            print(f"  - {suggestion}")

    return quality_report
```

**Pattern 2: Hybrid TypeScript/Python Workflow**

```bash
# TypeScript does research (fast with Bun)
bun run ${PAI_DIR}/baml/lib/gemini-baml-wrapper.ts "query" > research.json

# Python does analysis (rich data science ecosystem)
uv run ${PAI_DIR}/baml/scripts/analyze_research.py research.json
```

### CLI Tool Integration

**BAML Function as CLI Tool:**

```typescript
#!/usr/bin/env bun
// File: ${PAI_DIR}/baml/cli/extract-contacts.ts

import { b } from '../baml_client/typescript';
import { readFileSync } from 'fs';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: extract-contacts.ts <file>');
    process.exit(1);
  }

  const text = readFileSync(filePath, 'utf-8');
  const contacts = await b.ExtractContacts(text);

  console.log(JSON.stringify(contacts, null, 2));
}

main();
```

Usage:

```bash
./extract-contacts.ts document.txt | jq '.[] | .email'
```

## Skills Development Patterns

### Pattern 1: Simple Extraction Skill

**Use Case:** Extract structured data from unstructured text

**BAML Definition:**

```baml
// File: ${PAI_DIR}/baml/baml_src/functions/extraction.baml

class TechnicalSpec {
  product_name string
  version string?
  features string[]
  requirements string[]
  performance_metrics map<string, string>
  pricing string?
}

function ExtractTechnicalSpecs(documentation string) -> TechnicalSpec {
  client Claude
  prompt #"
    Extract technical specifications from this documentation.

    Documentation:
    {{ documentation }}

    Extract all features, requirements, performance metrics, and pricing.
    For performance_metrics, use a map with metric names as keys and values as strings.

    {{ ctx.output_format }}
  "#
}
```

**Skill Wrapper:**

```typescript
// File: ${PAI_DIR}/skills/baml-extraction/lib/spec-extractor.ts

import { b } from '@/baml/baml_client/typescript';

export async function extractSpecs(docPath: string) {
  const doc = await readFile(docPath, 'utf-8');
  const specs = await b.ExtractTechnicalSpecs(doc);
  return specs;
}
```

### Pattern 2: Multi-Step Analysis Skill

**Use Case:** Analyze code with multiple passes

**BAML Definitions:**

```baml
// File: ${PAI_DIR}/baml/baml_src/functions/analysis.baml

class CodeIssue {
  severity string  // "critical", "major", "minor"
  category string  // "security", "performance", "maintainability"
  description string
  location string  // file:line
  suggestion string
}

class CodeReview {
  overall_quality_score int  // 0-100
  issues CodeIssue[]
  positive_aspects string[]
  refactoring_opportunities string[]
}

function AnalyzeCodeSecurity(code string, language string) -> CodeIssue[] {
  client Claude
  prompt #"
    Analyze this {{ language }} code for security issues only.

    Code:
    {{ code }}

    Focus on:
    - SQL injection vulnerabilities
    - XSS vulnerabilities
    - Authentication/authorization issues
    - Sensitive data exposure
    - Input validation

    {{ ctx.output_format }}
  "#
}

function AnalyzeCodePerformance(code string, language string) -> CodeIssue[] {
  client Claude
  prompt #"
    Analyze this {{ language }} code for performance issues only.

    Code:
    {{ code }}

    Focus on:
    - Algorithmic complexity
    - Memory leaks
    - Unnecessary loops or operations
    - Database query optimization
    - Caching opportunities

    {{ ctx.output_format }}
  "#
}

function SynthesizeCodeReview(
  security_issues CodeIssue[],
  performance_issues CodeIssue[],
  code string
) -> CodeReview {
  client Claude
  prompt #"
    Create a comprehensive code review report.

    Security Issues: {{ security_issues }}
    Performance Issues: {{ performance_issues }}

    Original Code: {{ code }}

    Synthesize into a complete review with:
    - Overall quality score (0-100)
    - All issues combined and prioritized
    - Positive aspects of the code
    - Refactoring opportunities

    {{ ctx.output_format }}
  "#
}
```

**Orchestration:**

```typescript
// File: ${PAI_DIR}/skills/baml-analysis/lib/code-reviewer.ts

import { b } from '@/baml/baml_client/typescript';

export async function comprehensiveCodeReview(code: string, language: string) {
  // Parallel analysis
  const [securityIssues, performanceIssues] = await Promise.all([
    b.AnalyzeCodeSecurity(code, language),
    b.AnalyzeCodePerformance(code, language)
  ]);

  // Synthesis
  const review = await b.SynthesizeCodeReview(securityIssues, performanceIssues, code);

  return review;
}
```

### Pattern 3: Iterative Refinement Skill

**Use Case:** Generate content with quality checks and refinement

**BAML Definitions:**

```baml
class DocumentDraft {
  content string
  estimated_quality int  // 0-100
  issues string[]
}

class FinalDocument {
  content string
  quality_score int
  improvements_made string[]
}

function GenerateDocumentDraft(
  topic string,
  requirements string
) -> DocumentDraft {
  client Claude
  prompt #"
    Generate a document draft on: {{ topic }}

    Requirements: {{ requirements }}

    After generating, self-assess quality (0-100) and list any issues.

    {{ ctx.output_format }}
  "#
}

function RefineDocument(
  draft string,
  issues string[]
) -> FinalDocument {
  client Claude
  prompt #"
    Refine this document draft by addressing these issues:

    Draft: {{ draft }}

    Issues to fix:
    {% for issue in issues %}
    - {{ issue }}
    {% endfor %}

    Produce final document with quality score and list of improvements made.

    {{ ctx.output_format }}
  "#
}
```

**Orchestration with Iteration:**

```typescript
export async function generateQualityDocument(topic: string, requirements: string) {
  let draft = await b.GenerateDocumentDraft(topic, requirements);

  // Iteratively refine until quality is acceptable
  let iterations = 0;
  const maxIterations = 3;

  while (draft.estimated_quality < 85 && iterations < maxIterations) {
    console.log(`Quality: ${draft.estimated_quality}, refining... (iteration ${iterations + 1})`);

    const refined = await b.RefineDocument(draft.content, draft.issues);

    if (refined.quality_score <= draft.estimated_quality) {
      // No improvement, stop
      break;
    }

    draft = {
      content: refined.content,
      estimated_quality: refined.quality_score,
      issues: []  // Assume refined version has no major issues
    };

    iterations++;
  }

  return draft;
}
```

## Advanced Techniques

### Fallback Strategies

**Client-Level Fallback:**

```baml
client<llm> Resilient {
  provider fallback
  options {
    strategy [Claude, Gemini, GPT4]
  }
}

function ExtractData(text string) -> Data {
  client Resilient  // Will try Claude, then Gemini, then GPT4
  prompt #"..."#
}
```

**Function-Level Fallback:**

```typescript
async function extractWithFallback(text: string) {
  try {
    // Try primary detailed extraction
    return await b.ExtractContactsDetailed(text);
  } catch (error) {
    console.warn('Detailed extraction failed, using simple extraction');
    try {
      return await b.ExtractContactsSimple(text);
    } catch (error2) {
      console.error('All extraction methods failed');
      return { contacts: [], error: 'Extraction failed' };
    }
  }
}
```

### Streaming and Partial Results

**BAML + Streaming Pattern:**

```typescript
// Use streaming for initial response, then structure with BAML
async function streamThenStructure(query: string) {
  let accumulatedText = '';

  // Stream raw text
  const stream = await geminiStream(query);
  for await (const chunk of stream) {
    accumulatedText += chunk;
    console.log(chunk);  // Show progress to user
  }

  // Structure the complete response
  const structured = await b.ExtractResearchFindings(accumulatedText, query, 'gemini');

  return structured;
}
```

### Caching Expensive BAML Calls

```typescript
import { createHash } from 'crypto';

const cache = new Map<string, any>();

function cacheKey(func: string, ...args: any[]): string {
  const str = JSON.stringify({ func, args });
  return createHash('sha256').update(str).digest('hex');
}

async function cachedBAMLCall<T>(
  func: () => Promise<T>,
  funcName: string,
  ...args: any[]
): Promise<T> {
  const key = cacheKey(funcName, ...args);

  if (cache.has(key)) {
    console.log(`✅ Cache hit for ${funcName}`);
    return cache.get(key);
  }

  console.log(`🔄 Cache miss for ${funcName}, executing...`);
  const result = await func();
  cache.set(key, result);

  return result;
}

// Usage
const research = await cachedBAMLCall(
  () => b.SynthesizeMultiAgentResearch(outputs, query, metadata),
  'SynthesizeMultiAgentResearch',
  outputs,
  query,
  metadata
);
```

### Batch Processing

```typescript
async function batchExtractContacts(documents: string[]) {
  // Process in parallel batches of 5
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(doc => b.ExtractContacts(doc))
    );
    results.push(...batchResults);

    console.log(`Processed ${Math.min(i + batchSize, documents.length)}/${documents.length}`);
  }

  return results;
}
```

## Best Practices

### 1. Prompt Engineering in BAML

**Provide Clear Instructions:**

```baml
function ExtractFindings(text string) -> Finding[] {
  client Claude
  prompt #"
    Extract research findings from this text.

    INSTRUCTIONS:
    1. Each finding should be a distinct fact or insight
    2. Assign confidence levels based on:
       - HIGH: Multiple sources or authoritative source
       - MEDIUM: Single reliable source
       - LOW: Limited evidence
    3. Extract exact source citations (URLs, titles, dates)
    4. Flag contradictory information

    Text to analyze:
    {{ text }}

    {{ ctx.output_format }}
  "#
}
```

**Use Examples When Needed:**

```baml
prompt #"
  Extract contact information from this text.

  EXAMPLES:
  Input: "Email John at john@example.com or call (555) 123-4567"
  Output: {name: "John", email: "john@example.com", phone: "(555) 123-4567"}

  Input: "Contact: jane.doe@corp.com"
  Output: {name: null, email: "jane.doe@corp.com", phone: null}

  Now extract from:
  {{ text }}

  {{ ctx.output_format }}
"#
```

**Leverage `{{ ctx.output_format }}`:**

This special variable tells the LLM the expected output schema. Always include it:

```baml
prompt #"
  Your instructions here...

  {{ ctx.output_format }}  // ← Critical for schema adherence
"#
```

### 2. Error Handling

**Always Handle BAML Errors:**

```typescript
try {
  const result = await b.ExtractContacts(text);
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('BAML validation failed:', error.message);
    // Maybe try again with different prompt
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited, waiting...');
    await sleep(5000);
    return await b.ExtractContacts(text);  // Retry
  } else {
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

### 3. Testing BAML Functions

**Unit Test Individual Functions:**

```typescript
// File: ${PAI_DIR}/baml/tests/test_extraction.ts

import { b } from '../baml_client/typescript';
import { expect, test } from 'bun:test';

test('ExtractContacts extracts email correctly', async () => {
  const text = 'Contact John Doe at john.doe@example.com';
  const contacts = await b.ExtractContacts(text);

  expect(contacts.length).toBe(1);
  expect(contacts[0].email).toBe('john.doe@example.com');
  expect(contacts[0].name).toBe('John Doe');
});

test('ExtractContacts handles no contacts gracefully', async () => {
  const text = 'This text has no contact information.';
  const contacts = await b.ExtractContacts(text);

  expect(contacts.length).toBe(0);
});
```

**Integration Test Workflows:**

```typescript
test('Full research workflow produces valid output', async () => {
  const research = await researchWithGeminiBAML({
    query: 'Latest TypeScript features',
    mode: 'quick',
    numVariations: 3
  });

  expect(research.metadata.total_agents).toBe(3);
  expect(research.executive_summary).toBeTruthy();
  expect(research.sections.length).toBeGreaterThan(0);
  expect(['HIGH', 'MEDIUM', 'LOW', 'SPECULATIVE']).toContain(research.overall_confidence);
});
```

### 4. Documentation

**Document Your BAML Functions:**

```baml
/// Extracts contact information from unstructured text.
///
/// This function identifies names, emails, phone numbers, companies,
/// and roles. It handles various text formats including emails,
/// business cards, and web pages.
///
/// @param text - The unstructured text to extract contacts from
/// @returns Array of ContactInfo objects with all identified contacts
///
/// Example:
/// ```typescript
/// const contacts = await b.ExtractContacts(emailBody);
/// console.log(contacts[0].email);  // "john@example.com"
/// ```
function ExtractContacts(text string) -> ContactInfo[] {
  // ... implementation
}
```

### 5. Version Control

**Track BAML Changes in Git:**

```bash
# BAML files are code - version them
git add baml/baml_src/functions/research.baml
git commit -m "feat: add confidence scoring to research extraction"
```

**Use Semantic Versioning for Breaking Changes:**

```baml
// v1: Original schema
class ContactInfo {
  email string
}

// v2: Added optional fields (non-breaking)
class ContactInfo {
  email string
  phone string?
  name string?
}

// v3: Changed email to required array (BREAKING)
class ContactInfoV3 {
  emails string[]  // ← Breaking change, increment major version
  phone string?
  name string?
}
```

### 6. Performance Optimization

**Use Appropriate Model for Task:**

```baml
// Use faster model for simple tasks
client<llm> FastGemini {
  provider google-ai
  options {
    model "gemini-2.0-flash-exp"  // Fast and cheap
  }
}

// Use powerful model for complex tasks
client<llm> PowerfulClaude {
  provider anthropic
  options {
    model "claude-opus-4-20250514"  // Slow but very capable
  }
}

function SimpleExtraction(text string) -> Contact {
  client FastGemini  // ← Use fast model
  // ...
}

function ComplexAnalysis(code string) -> DetailedReview {
  client PowerfulClaude  // ← Use powerful model
  // ...
}
```

**Parallelize Independent BAML Calls:**

```typescript
// ✅ GOOD: Parallel execution
const [security, performance, style] = await Promise.all([
  b.AnalyzeCodeSecurity(code),
  b.AnalyzeCodePerformance(code),
  b.AnalyzeCodeStyle(code)
]);

// ❌ BAD: Sequential execution
const security = await b.AnalyzeCodeSecurity(code);
const performance = await b.AnalyzeCodePerformance(code);
const style = await b.AnalyzeCodeStyle(code);
```

## Common Pitfalls and Solutions

### Pitfall 1: Overly Broad Functions

**Problem:**

```baml
function AnalyzeEverything(text string) -> CompleteAnalysis {
  // Trying to do too much in one function
}
```

**Solution:**

Break into focused functions:

```baml
function AnalyzeSentiment(text string) -> SentimentAnalysis {}
function ExtractEntities(text string) -> Entity[] {}
function SummarizeText(text string) -> Summary {}
```

Then compose in host language:

```typescript
const [sentiment, entities, summary] = await Promise.all([
  b.AnalyzeSentiment(text),
  b.ExtractEntities(text),
  b.SummarizeText(text)
]);
```

### Pitfall 2: Missing `{{ ctx.output_format }}`

**Problem:**

```baml
prompt #"
  Extract contacts from: {{ text }}
  // ← Missing ctx.output_format!
"#
```

**Result:** LLM doesn't know the expected schema, outputs unstructured text.

**Solution:**

```baml
prompt #"
  Extract contacts from: {{ text }}
  {{ ctx.output_format }}  // ← Always include this
"#
```

### Pitfall 3: Not Handling Optional Fields

**Problem:**

```typescript
const contact = await b.ExtractContact(text);
const email = contact.email.toLowerCase();  // ← Crashes if email is null
```

**Solution:**

```typescript
const contact = await b.ExtractContact(text);
const email = contact.email?.toLowerCase() ?? 'no email';  // ← Handle null
```

### Pitfall 4: Ignoring Validation Errors

**Problem:**

```typescript
try {
  return await b.ExtractData(text);
} catch (error) {
  // Silently fail - data is lost!
  return null;
}
```

**Solution:**

```typescript
try {
  return await b.ExtractData(text);
} catch (error) {
  console.error('BAML extraction failed:', error);
  // Log error for debugging
  logToObservability(error);
  // Maybe try fallback
  return await b.SimpleExtract(text);
}
```

### Pitfall 5: Not Testing with Real Data

**Problem:**

```typescript
// Only testing with perfect data
test('works with clean data', async () => {
  const result = await b.Extract('Name: John, Email: john@example.com');
  expect(result.name).toBe('John');
});
```

**Solution:**

```typescript
// Test with messy, real-world data
test('handles messy real-world data', async () => {
  const messyText = `
    Hi there! You can reach me at john.doe@company.com (sometimes),
    or try my backup: j.doe@gmail.com. Phone is like (555) 123-4567
    but I don't answer usually lol
  `;

  const result = await b.Extract(messyText);
  expect(result.emails.length).toBeGreaterThan(0);
  // Don't expect perfection, just reasonable extraction
});
```

## Performance Considerations

### Benchmarking BAML Functions

```typescript
async function benchmarkBAML() {
  const testCases = generateTestData(100);

  const start = Date.now();

  for (const testCase of testCases) {
    await b.ExtractContacts(testCase);
  }

  const duration = Date.now() - start;
  const avgTime = duration / testCases.length;

  console.log(`Processed ${testCases.length} cases in ${duration}ms`);
  console.log(`Average time per extraction: ${avgTime}ms`);
}
```

### Optimizing for Speed

**1. Use Faster Models for Simple Tasks:**

- Gemini Flash: ~100-500ms
- Claude Haiku: ~200-800ms
- GPT-3.5: ~300-1000ms

**2. Batch Where Possible:**

```typescript
// Process 10 documents in parallel
await Promise.all(documents.map(doc => b.Extract(doc)));
```

**3. Cache Expensive Operations:**

```typescript
const cached = new Map();

async function cachedResearch(query: string) {
  if (cached.has(query)) return cached.get(query);

  const result = await b.Research(query);
  cached.set(query, result);
  return result;
}
```

**4. Use Streaming for Long Operations:**

Show progress to user while BAML processes:

```typescript
console.log('Starting research...');
const rawOutput = await longRunningResearch();

console.log('Structuring results with BAML...');
const structured = await b.SynthesizeResearch(rawOutput);

console.log('Done!');
```

### Monitoring Performance

```typescript
async function monitoredBAMLCall<T>(
  func: () => Promise<T>,
  funcName: string
): Promise<T> {
  const start = Date.now();

  try {
    const result = await func();
    const duration = Date.now() - start;

    // Log to observability
    logMetric({
      function: funcName,
      duration_ms: duration,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    logMetric({
      function: funcName,
      duration_ms: duration,
      success: false,
      error: error.message
    });

    throw error;
  }
}

// Usage
const result = await monitoredBAMLCall(
  () => b.ExtractContacts(text),
  'ExtractContacts'
);
```

## Real-World Examples

### Example 1: Research Aggregation Skill

**Goal:** Aggregate research from multiple sources with structured output

**Implementation:**

```typescript
// File: ${PAI_DIR}/skills/baml-research/lib/aggregator.ts

import { b } from '@/baml/baml_client/typescript';
import { $ } from 'bun';

export async function aggregateResearch(topic: string) {
  // Step 1: Get raw research from multiple sources
  const [geminiOutput, webOutput, dbOutput] = await Promise.all([
    $`gemini "Research: ${topic}"`.text(),
    fetchWebResearch(topic),
    queryInternalDB(topic)
  ]);

  // Step 2: Extract structured findings from each source
  const [geminiFindings, webFindings, dbFindings] = await Promise.all([
    b.ExtractResearchFindings(geminiOutput, topic, 'gemini'),
    b.ExtractResearchFindings(webOutput, topic, 'web'),
    b.ExtractResearchFindings(dbOutput, topic, 'database')
  ]);

  // Step 3: Synthesize all findings
  const metadata = JSON.stringify({
    research_question: topic,
    research_mode: 'aggregated',
    total_agents: 3,
    agent_types: ['gemini', 'web', 'database'],
    total_queries: 3,
    research_date: new Date().toISOString().split('T')[0]
  });

  const comprehensive = await b.SynthesizeMultiAgentResearch(
    [geminiOutput, webOutput, dbOutput],
    topic,
    metadata
  );

  return comprehensive;
}
```

### Example 2: Code Review Skill

**Goal:** Multi-faceted code review with structured issues

**Implementation:**

```typescript
// File: ${PAI_DIR}/skills/baml-analysis/lib/code-reviewer.ts

import { b } from '@/baml/baml_client/typescript';

interface ReviewOptions {
  includeSecurity: boolean;
  includePerformance: boolean;
  includeStyle: boolean;
  language: string;
}

export async function reviewCode(
  code: string,
  options: ReviewOptions
) {
  const analyses: Promise<any>[] = [];

  if (options.includeSecurity) {
    analyses.push(b.AnalyzeCodeSecurity(code, options.language));
  }

  if (options.includePerformance) {
    analyses.push(b.AnalyzeCodePerformance(code, options.language));
  }

  if (options.includeStyle) {
    analyses.push(b.AnalyzeCodeStyle(code, options.language));
  }

  // Run all analyses in parallel
  const results = await Promise.all(analyses);

  // Flatten all issues
  const allIssues = results.flat();

  // Synthesize final review
  const review = await b.CreateComprehensiveReview(allIssues, code);

  return review;
}
```

### Example 3: Document Generation with Quality Control

**Goal:** Generate documents with iterative quality improvement

**Implementation:**

```typescript
// File: ${PAI_DIR}/skills/baml-synthesis/lib/document-generator.ts

import { b } from '@/baml/baml_client/typescript';

export async function generateQualityDocument(
  topic: string,
  requirements: string,
  minQuality: number = 85
) {
  // Initial draft
  let draft = await b.GenerateDocumentDraft(topic, requirements);

  console.log(`Initial draft quality: ${draft.estimated_quality}`);

  // Iterative refinement
  let iterations = 0;
  const maxIterations = 3;

  while (draft.estimated_quality < minQuality && iterations < maxIterations) {
    console.log(`Refining (iteration ${iterations + 1})...`);

    const refined = await b.RefineDocument(draft.content, draft.issues);

    if (refined.quality_score <= draft.estimated_quality) {
      console.log('No improvement, stopping refinement');
      break;
    }

    draft = {
      content: refined.content,
      estimated_quality: refined.quality_score,
      issues: []
    };

    iterations++;
  }

  console.log(`Final quality: ${draft.estimated_quality} (${iterations} refinements)`);

  return {
    document: draft.content,
    quality: draft.estimated_quality,
    iterations
  };
}
```

## Testing Strategies

### Unit Testing BAML Functions

```typescript
// File: ${PAI_DIR}/baml/tests/test_extraction.ts

import { b } from '../baml_client/typescript';
import { describe, expect, test } from 'bun:test';

describe('ExtractContacts', () => {
  test('extracts simple contact info', async () => {
    const text = 'Email me at john@example.com';
    const contacts = await b.ExtractContacts(text);

    expect(contacts.length).toBe(1);
    expect(contacts[0].email).toBe('john@example.com');
  });

  test('handles multiple contacts', async () => {
    const text = `
      Contact John at john@example.com or Jane at jane@example.com
    `;
    const contacts = await b.ExtractContacts(text);

    expect(contacts.length).toBe(2);
  });

  test('returns empty array for no contacts', async () => {
    const text = 'This has no contact information';
    const contacts = await b.ExtractContacts(text);

    expect(contacts.length).toBe(0);
  });

  test('handles malformed email gracefully', async () => {
    const text = 'Email: invalid@email@com';
    const contacts = await b.ExtractContacts(text);

    // Should either skip it or mark as invalid
    expect(contacts.length).toBeGreaterThanOrEqual(0);
  });
});
```

### Integration Testing Workflows

```typescript
// File: ${PAI_DIR}/baml/tests/integration/test_research_workflow.ts

import { researchWithGeminiBAML } from '../../lib/gemini-baml-wrapper';
import { describe, expect, test } from 'bun:test';

describe('Research Workflow Integration', () => {
  test('quick research mode works end-to-end', async () => {
    const result = await researchWithGeminiBAML({
      query: 'TypeScript 5.0 new features',
      mode: 'quick',
      numVariations: 3
    });

    // Validate structure
    expect(result.metadata.total_agents).toBe(3);
    expect(result.metadata.research_mode).toBe('quick');
    expect(result.executive_summary).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);

    // Validate confidence is valid enum value
    expect(['HIGH', 'MEDIUM', 'LOW', 'SPECULATIVE']).toContain(
      result.overall_confidence
    );

    // Validate sections have findings
    for (const section of result.sections) {
      expect(section.key_findings.length).toBeGreaterThan(0);
    }
  }, { timeout: 60000 });  // 60 second timeout for actual API calls
});
```

### Property-Based Testing

```typescript
// File: ${PAI_DIR}/baml/tests/property_tests.ts

import { b } from '../baml_client/typescript';
import fc from 'fast-check';

test('ExtractContacts always returns valid ContactInfo array', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (randomText) => {
      const contacts = await b.ExtractContacts(randomText);

      // Should always return array
      expect(Array.isArray(contacts)).toBe(true);

      // Each contact should have valid structure
      for (const contact of contacts) {
        // Email is either null or valid string
        expect(typeof contact.email === 'string' || contact.email === null).toBe(true);

        // Name is either null or valid string
        expect(typeof contact.name === 'string' || contact.name === null).toBe(true);
      }
    })
  );
});
```

### Snapshot Testing

```typescript
// File: ${PAI_DIR}/baml/tests/snapshots/test_extraction_snapshots.ts

import { b } from '../../baml_client/typescript';
import { test, expect } from 'bun:test';

test('ExtractContacts snapshot', async () => {
  const sampleText = `
    Contact Information:
    John Doe - john.doe@example.com
    Jane Smith - jane.smith@company.com, (555) 123-4567
  `;

  const result = await b.ExtractContacts(sampleText);

  // Save/compare against snapshot
  expect(result).toMatchSnapshot();
});
```

## BAML vs Alternatives

### Comparison Matrix

| Feature | BAML | JSON Mode | Function Calling | Instructor | Pydantic AI |
|---------|------|-----------|------------------|------------|-------------|
| Type Safety | ✅ Full | ⚠️ Partial | ✅ Full | ✅ Full | ✅ Full |
| Multi-Language | ✅ Yes | ❌ No | ❌ No | ❌ Python only | ❌ Python only |
| Schema Validation | ✅ Automatic | ❌ Manual | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| Prompt Versioning | ✅ Built-in | ❌ No | ❌ No | ❌ No | ❌ No |
| Provider Support | ✅ Multi | ✅ OpenAI | ✅ OpenAI/Anthropic | ✅ Multi | ⚠️ Limited |
| Learning Curve | ⚠️ Medium | ✅ Low | ⚠️ Medium | ⚠️ Medium | ⚠️ Medium |
| Code Generation | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| IDE Support | ✅ Full | ⚠️ Partial | ✅ Full | ✅ Full | ✅ Full |

### When to Use BAML

**✅ Use BAML When:**

- You need type-safe structured outputs
- You're building multi-language systems (TypeScript + Python)
- You want to version control prompts separately from code
- You need to switch LLM providers easily
- You want compile-time error detection
- You're building production-grade agent systems

**❌ Consider Alternatives When:**

- You only need simple JSON outputs (use JSON mode)
- You're prototyping quickly (use JSON mode or function calling)
- You're Python-only and love Pydantic (use Instructor)
- You don't want to learn a new DSL (use function calling)

### Migration Strategies

**From JSON Mode to BAML:**

Before:

```typescript
const response = await llm.complete(prompt, { response_format: { type: 'json' } });
const data = JSON.parse(response);  // No type safety
```

After:

```baml
function Extract(text string) -> Data {
  client Claude
  prompt #"{{ text }} {{ ctx.output_format }}"#
}
```

```typescript
const data = await b.Extract(text);  // Type-safe!
```

**From Function Calling to BAML:**

Before:

```typescript
const response = await openai.chat.completions.create({
  functions: [{
    name: 'extract_contact',
    parameters: { type: 'object', properties: { ... } }
  }]
});
const contact = JSON.parse(response.choices[0].message.function_call.arguments);
```

After:

```baml
function ExtractContact(text string) -> Contact {
  // ...
}
```

```typescript
const contact = await b.ExtractContact(text);
```

## Future Directions

### Emerging BAML Patterns

**1. Multi-Modal Inputs:**

```baml
// Future: BAML with image inputs
function AnalyzeImage(
  image_url string,
  question string
) -> ImageAnalysis {
  client GeminiVision
  prompt #"
    Analyze this image: {{ image_url }}
    Answer: {{ question }}
    {{ ctx.output_format }}
  "#
}
```

**2. Streaming Structured Outputs:**

```typescript
// Future: Stream structured objects as they're generated
const stream = b.ResearchStream(query);

for await (const finding of stream) {
  console.log(`New finding: ${finding.title}`);
  // finding is type-safe ResearchFinding
}
```

**3. Agentic Workflows:**

```baml
// Future: BAML-native agent loops
agent ResearchAgent {
  tools [SearchTool, AnalyzeTool, SynthesisTool]
  max_iterations 10

  function Research(query string) -> ComprehensiveResearch {
    // BAML orchestrates multi-step agent workflow
  }
}
```

### PAI System Evolution

**1. BAML-Native Agents:**

All agents return structured BAML types:

- `architect-agent` → `PRD` type
- `engineer-agent` → `Implementation` type
- `designer-agent` → `DesignSpec` type

**2. Cross-Agent Type Safety:**

```typescript
// Architect produces PRD
const prd = await architectAgent.generatePRD(idea);

// Engineer consumes PRD (type-checked)
const implementation = await engineerAgent.implement(prd);

// Designer creates UI from implementation (type-checked)
const design = await designerAgent.design(implementation);
```

**3. Observability with Structured Schemas:**

Log all agent outputs as structured BAML types:

```typescript
await logToObservability({
  agent: 'researcher',
  output: research,  // Structured ComprehensiveResearch type
  schema: 'ComprehensiveResearch',
  timestamp: Date.now()
});
```

Query and analyze with type safety:

```typescript
const allResearch = await queryObservability<ComprehensiveResearch>({
  agent: 'researcher',
  schema: 'ComprehensiveResearch',
  timeRange: 'last_7_days'
});

// Type-safe aggregation
const avgConfidence = allResearch
  .map(r => r.overall_confidence)
  .reduce((acc, val) => acc + val, 0) / allResearch.length;
```

## Conclusion

BAML represents a paradigm shift in building reliable AI agent systems. By providing:

- **Type-safe structured outputs** that eliminate parsing errors
- **Schema validation** that catches issues immediately
- **Multi-language support** that enables polyglot architectures
- **Prompt versioning** that treats prompts as code
- **IDE integration** that provides full autocomplete

BAML enables the PAI system to build production-grade AI skills with confidence, maintainability, and observability.

The patterns and practices in this document provide a foundation for leveraging BAML across all PAI skills, from
simple extraction tasks to complex multi-agent research workflows.

As the PAI system evolves, BAML will enable increasingly sophisticated agent coordination, with type safety and
structured data flowing seamlessly between agents, skills, and the observability infrastructure.

---

**Next Steps:**

1. Review the [BAML Integration Plan](../plans/2025-11-14_baml-gemini-integration.md)
2. Start with Phase 1: BAML Infrastructure Setup
3. Implement a simple extraction skill as proof-of-concept
4. Gradually migrate existing skills to BAML
5. Build new skills with BAML from the start

**Resources:**

- [BAML Documentation](https://docs.boundaryml.com)
- [PAI BAML Project](${PAI_DIR}/baml/)
- [BAML Research Skill](${PAI_DIR}/skills/baml-research/)
- [Agent Observability](${PAI_DIR}/skills/agent-observability/)

**Document Version:** 1.0.0

**Last Updated:** 2025-11-14

**Research Source:** gemini-researcher agent (extensive mode)
