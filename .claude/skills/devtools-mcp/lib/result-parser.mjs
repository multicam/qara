#!/usr/bin/env node

/**
 * result-parser.mjs
 *
 * Extracts and validates JSON from Claude MCP output
 * - Finds JSON blocks in markdown
 * - Handles multiple blocks
 * - Validates structure
 * - Returns structured result
 */

/**
 * Extract JSON blocks from text
 *
 * @param {string} text - Text with potential JSON blocks
 * @returns {Array<string>} - Found JSON strings
 */
function extractJsonBlocks(text) {
  const blocks = [];

  // Match ```json ... ``` blocks
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }

  // Also try to find bare JSON objects/arrays
  if (blocks.length === 0) {
    const bareJsonRegex = /(\{[\s\S]*\}|\[[\s\S]*\])/;
    const bareMatch = text.match(bareJsonRegex);
    if (bareMatch) {
      blocks.push(bareMatch[1].trim());
    }
  }

  return blocks;
}

/**
 * Parse JSON safely
 *
 * @param {string} jsonString - JSON string
 * @returns {Object|null} - Parsed object or null
 */
function parseJsonSafe(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Validate result structure
 *
 * @param {Object} result - Parsed result
 * @returns {boolean} - Is valid
 */
function validateResultStructure(result) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  // Check for common result fields
  const hasPassedField = 'passed' in result;
  const hasResultsField = 'results' in result;
  const hasSummaryField = 'summary' in result;

  // At least one of these should exist
  return hasPassedField || hasResultsField || hasSummaryField;
}

/**
 * Parse result from Claude MCP output
 *
 * @param {string} output - Raw Claude output
 * @returns {Object} - Parsed result
 */
export function parseResult(output) {
  if (!output || typeof output !== 'string') {
    return {
      success: false,
      error: 'No output provided',
      rawOutput: output,
    };
  }

  // Extract JSON blocks
  const jsonBlocks = extractJsonBlocks(output);

  if (jsonBlocks.length === 0) {
    return {
      success: false,
      error: 'No JSON found in output',
      rawOutput: output,
    };
  }

  // Try to parse each block
  for (const block of jsonBlocks) {
    const parsed = parseJsonSafe(block);

    if (parsed && validateResultStructure(parsed)) {
      return {
        success: true,
        result: parsed,
        rawOutput: output,
      };
    }
  }

  return {
    success: false,
    error: 'Found JSON but structure is invalid',
    jsonBlocks,
    rawOutput: output,
  };
}

/**
 * Parse multiple results from output
 * (for workflows that return multiple test results)
 *
 * @param {string} output - Raw Claude output
 * @returns {Array<Object>} - Array of parsed results
 */
export function parseMultipleResults(output) {
  const jsonBlocks = extractJsonBlocks(output);
  const results = [];

  for (const block of jsonBlocks) {
    const parsed = parseJsonSafe(block);
    if (parsed) {
      results.push({
        success: true,
        result: parsed,
      });
    }
  }

  return results;
}

/**
 * Extract summary from result
 *
 * @param {Object} result - Parsed result
 * @returns {Object} - Summary
 */
export function extractSummary(result) {
  if (!result || !result.result) {
    return {
      passed: false,
      total: 0,
      failed: 0,
      errors: [],
    };
  }

  const data = result.result;

  return {
    passed: data.passed ?? false,
    total: data.totalTests ?? data.total ?? 0,
    failed: data.failedTests ?? data.failed ?? 0,
    errors: data.errors ?? [],
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Format result for display
 *
 * @param {Object} parsedResult - Result from parseResult
 * @returns {string} - Formatted output
 */
export function formatResult(parsedResult) {
  const lines = [];

  if (!parsedResult.success) {
    lines.push('❌ Result Parsing Failed\n');
    lines.push(`Error: ${parsedResult.error}\n`);

    if (parsedResult.jsonBlocks) {
      lines.push('Found JSON blocks but they were invalid:');
      parsedResult.jsonBlocks.forEach((block, i) => {
        lines.push(`\n--- Block ${i + 1} ---`);
        lines.push(block.substring(0, 200));
        if (block.length > 200) {
          lines.push('...');
        }
      });
    }

    return lines.join('\n');
  }

  // Extract summary
  const summary = extractSummary(parsedResult);

  // Format based on passed/failed
  if (summary.passed) {
    lines.push('✅ Tests Passed\n');
  } else {
    lines.push('❌ Tests Failed\n');
  }

  lines.push(`Total: ${summary.total}`);
  lines.push(`Failed: ${summary.failed}`);

  if (summary.errors && summary.errors.length > 0) {
    lines.push(`\n**Errors:**`);
    summary.errors.forEach((error, i) => {
      lines.push(`${i + 1}. ${error}`);
    });
  }

  if (summary.timestamp) {
    lines.push(`\nTimestamp: ${summary.timestamp}`);
  }

  return lines.join('\n');
}

/**
 * Save result to file
 *
 * @param {Object} parsedResult - Result from parseResult
 * @param {string} filePath - Output file path
 */
export async function saveResult(parsedResult, filePath) {
  const { writeFile } = await import('fs/promises');

  const output = {
    success: parsedResult.success,
    timestamp: new Date().toISOString(),
    result: parsedResult.result,
    error: parsedResult.error,
  };

  await writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const exampleOutput = `
# Smoke Test Results

Here are the test results:

\`\`\`json
{
  "passed": false,
  "totalTests": 3,
  "failedTests": 1,
  "results": [
    { "page": "/", "passed": true },
    { "page": "/about/", "passed": false, "error": "Console error found" },
    { "page": "/contact/", "passed": true }
  ],
  "errors": ["TypeError on /about/"],
  "timestamp": "2026-02-12T09:00:00Z"
}
\`\`\`

The test found issues on the about page.
`;

  const parsed = parseResult(exampleOutput);
  console.log(formatResult(parsed));
}
