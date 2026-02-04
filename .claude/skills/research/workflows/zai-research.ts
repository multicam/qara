#!/usr/bin/env bun
/**
 * ZAI Research Workflow
 *
 * Decomposes research queries into 4-6 sub-queries,
 * detects coding-related queries for the coding endpoint,
 * and executes parallel research via GLM-4.7.
 *
 * Usage:
 *   bun zai-research.ts "research query"
 *   bun zai-research.ts --parallel 6 "research query"
 */

import { promptLLM, ZAI_MODELS } from '../../../hooks/lib/llm/zai';

interface ResearchResult {
  query: string;
  result: string | null;
  usedCodingEndpoint: boolean;
  duration: number;
}

interface ResearchConfig {
  parallelQueries: number;
  maxTokensPerQuery: number;
  topic: string;
}

/**
 * Decompose a research topic into focused sub-queries
 */
async function decomposeQuery(topic: string, numQueries: number = 5): Promise<string[]> {
  const prompt = `You are a research query decomposer. Break down the following research topic into ${numQueries} distinct, focused sub-queries that together will provide comprehensive coverage.

Topic: ${topic}

Requirements:
- Each query should explore a different angle or aspect
- Queries should be specific and actionable
- Include a mix of: current state, best practices, alternatives, limitations, examples
- Return ONLY the queries, one per line, no numbering or bullets

Queries:`;

  // Use coding endpoint - GLM-4.7 needs ~2000 tokens for reasoning + response
  const result = await promptLLM(prompt, ZAI_MODELS.GLM_4_7, 2000);

  if (!result) {
    // Fallback: create basic queries
    return [
      `What is ${topic}?`,
      `Best practices for ${topic}`,
      `Common challenges with ${topic}`,
      `${topic} examples and use cases`,
      `Latest developments in ${topic}`,
    ].slice(0, numQueries);
  }

  return result
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, numQueries);
}

/**
 * Execute a single research query
 */
async function executeQuery(query: string): Promise<ResearchResult> {
  const start = Date.now();
  // Always use coding endpoint - required for Coding Plan
  const result = await promptLLM(
    query,
    ZAI_MODELS.GLM_4_7,
    2000 // Higher token limit for research
  );

  return {
    query,
    result,
    usedCodingEndpoint: true, // Always true with Coding Plan
    duration: Date.now() - start,
  };
}

/**
 * Execute parallel research queries
 */
async function executeParallelResearch(queries: string[]): Promise<ResearchResult[]> {
  console.log(`Executing ${queries.length} queries in parallel...`);

  const results = await Promise.all(queries.map(executeQuery));

  return results;
}

/**
 * Synthesize research results into a coherent summary
 */
async function synthesizeResults(
  topic: string,
  results: ResearchResult[]
): Promise<string> {
  const successfulResults = results.filter((r) => r.result !== null);

  if (successfulResults.length === 0) {
    return 'No results were obtained from the research queries.';
  }

  const combinedFindings = successfulResults
    .map((r, i) => `### Query ${i + 1}: ${r.query}\n\n${r.result}`)
    .join('\n\n---\n\n');

  const synthesisPrompt = `You are a research synthesizer. Analyze the following research findings and create a comprehensive summary.

Topic: ${topic}

Research Findings:
${combinedFindings}

Create a synthesis that:
1. Identifies key themes and consensus findings
2. Notes any conflicting information
3. Highlights unique insights from different queries
4. Provides actionable recommendations

Format:
## Executive Summary
[2-3 sentences]

## Key Findings
[Bulleted list of main discoveries]

## Recommendations
[Practical next steps]

## Sources & Confidence
[Note which queries contributed to each finding]`;

  // Use coding endpoint (default) - required for Coding Plan
  const synthesis = await promptLLM(synthesisPrompt, ZAI_MODELS.GLM_4_7, 3000);

  return synthesis || combinedFindings;
}

/**
 * Main research workflow
 */
async function runResearch(config: ResearchConfig): Promise<void> {
  console.log(`\n🔬 ZAI Research: ${config.topic}`);
  console.log(`📊 Parallel queries: ${config.parallelQueries}`);
  console.log('');

  // Step 1: Decompose query
  console.log('1️⃣ Decomposing research topic...');
  const queries = await decomposeQuery(config.topic, config.parallelQueries);
  console.log(`   Generated ${queries.length} sub-queries`);
  queries.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
  console.log('');

  // Step 2: Execute parallel research
  console.log('2️⃣ Executing parallel research...');
  const startTime = Date.now();
  const results = await executeParallelResearch(queries);
  const totalDuration = Date.now() - startTime;

  // Step 3: Report results
  console.log('');
  console.log('3️⃣ Research Results:');
  results.forEach((r, i) => {
    const status = r.result ? '✅' : '❌';
    const endpoint = r.usedCodingEndpoint ? '(coding)' : '(general)';
    console.log(`   ${status} Query ${i + 1} ${endpoint}: ${r.duration}ms`);
  });

  const successCount = results.filter((r) => r.result).length;
  console.log('');
  console.log(`📈 Success: ${successCount}/${results.length} queries`);
  console.log(`⏱️ Total time: ${totalDuration}ms`);
  console.log('');

  // Step 4: Synthesize
  console.log('4️⃣ Synthesizing findings...');
  const synthesis = await synthesizeResults(config.topic, results);
  console.log('');
  console.log('═'.repeat(60));
  console.log('📋 RESEARCH SYNTHESIS');
  console.log('═'.repeat(60));
  console.log('');
  console.log(synthesis);
  console.log('');
  console.log('═'.repeat(60));

  // Metrics
  console.log('');
  console.log('📊 RESEARCH METRICS:');
  console.log(`   - Total Queries: ${queries.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(
    `   - Coding Endpoint Used: ${results.filter((r) => r.usedCodingEndpoint).length}`
  );
  console.log(`   - Total Duration: ${totalDuration}ms`);
  console.log(`   - Avg Query Time: ${Math.round(totalDuration / queries.length)}ms`);
}

// CLI handling
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
ZAI Research Workflow

Usage:
  bun zai-research.ts "research topic"
  bun zai-research.ts --parallel 6 "research topic"

Options:
  --parallel, -p <n>  Number of parallel queries (default: 5, max: 10)
  --help, -h          Show this help

Examples:
  bun zai-research.ts "TypeScript best practices for error handling"
  bun zai-research.ts -p 8 "React Server Components vs Client Components"
`);
    process.exit(0);
  }

  // Parse arguments
  let parallelQueries = 5;
  let topic = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parallel' || args[i] === '-p') {
      parallelQueries = Math.min(10, Math.max(1, parseInt(args[++i], 10) || 5));
    } else {
      topic = args[i];
    }
  }

  if (!topic) {
    console.error('Error: No research topic provided');
    process.exit(1);
  }

  // Check for API key
  if (!process.env.ZAI_API_KEY) {
    console.error('Error: ZAI_API_KEY environment variable is not set');
    console.error('Get your key from: https://z.ai/api-keys');
    process.exit(1);
  }

  await runResearch({
    parallelQueries,
    maxTokensPerQuery: 2000,
    topic,
  });
}

main().catch((error) => {
  console.error('Research failed:', error);
  process.exit(1);
});
