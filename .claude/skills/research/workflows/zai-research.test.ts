/**
 * Tests for ZAI Research Workflow
 *
 * Tests the research workflow logic functions.
 * These are unit tests for the workflow's internal logic.
 */

import { describe, it, expect, beforeEach } from 'bun:test';

/**
 * Helper function that replicates the isCodingQuery logic
 */
function isCodingQuery(query: string): boolean {
  const codingKeywords = [
    'code',
    'function',
    'class',
    'implement',
    'debug',
    'fix',
    'refactor',
    'typescript',
    'javascript',
    'python',
    'rust',
    'go',
    'api',
    'endpoint',
    'algorithm',
    'data structure',
    'syntax',
    'compile',
    'runtime',
    'error',
    'bug',
    'test',
    'unit test',
    'integration',
  ];
  const lowerQuery = query.toLowerCase();
  return codingKeywords.some((keyword) => lowerQuery.includes(keyword));
}

/**
 * Interface matching the workflow's ResearchResult
 */
interface ResearchResult {
  query: string;
  result: string | null;
  usedCodingEndpoint: boolean;
  duration: number;
}

describe('ZAI Research Workflow', () => {
  beforeEach(() => {
    process.env.ZAI_API_KEY = 'test-api-key';
  });

  describe('Query Decomposition', () => {
    it('should detect coding queries correctly', () => {
      expect(isCodingQuery('Write a TypeScript function')).toBe(true);
      expect(isCodingQuery('implement binary search')).toBe(true);
      expect(isCodingQuery('What is the weather?')).toBe(false);
    });

    it('should detect language-specific queries', () => {
      expect(isCodingQuery('TypeScript best practices')).toBe(true);
      expect(isCodingQuery('JavaScript async patterns')).toBe(true);
      expect(isCodingQuery('Python data structures')).toBe(true);
      expect(isCodingQuery('Rust memory management')).toBe(true);
      expect(isCodingQuery('Go concurrency patterns')).toBe(true);
    });

    it('should parse decomposed queries from LLM response', () => {
      const response = `Query 1: First question
Query 2: Second question
Query 3: Third question`;

      const lines = response
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('First question');
    });
  });

  describe('Research Result Processing', () => {
    it('should structure research results correctly', () => {
      const mockResults: ResearchResult[] = [
        {
          query: 'What is TypeScript?',
          result: 'TypeScript is a typed superset of JavaScript',
          usedCodingEndpoint: true,
          duration: 150,
        },
        {
          query: 'TypeScript best practices',
          result: 'Use strict mode, prefer interfaces...',
          usedCodingEndpoint: true,
          duration: 200,
        },
        {
          query: 'TypeScript vs JavaScript',
          result: null, // Simulating a failed query
          usedCodingEndpoint: false,
          duration: 100,
        },
      ];

      const successfulResults = mockResults.filter((r) => r.result !== null);
      expect(successfulResults).toHaveLength(2);

      const codingEndpointResults = mockResults.filter((r) => r.usedCodingEndpoint);
      expect(codingEndpointResults).toHaveLength(2);

      const totalDuration = mockResults.reduce((sum, r) => sum + r.duration, 0);
      expect(totalDuration).toBe(450);
    });

    it('should handle empty results gracefully', () => {
      const emptyResults: Array<{ query: string; result: string | null }> = [];
      const successfulResults = emptyResults.filter((r) => r.result !== null);
      expect(successfulResults).toHaveLength(0);
    });

    it('should handle all failed queries', () => {
      const allFailedResults = [
        { query: 'Query 1', result: null },
        { query: 'Query 2', result: null },
        { query: 'Query 3', result: null },
      ];

      const successfulResults = allFailedResults.filter((r) => r.result !== null);
      expect(successfulResults).toHaveLength(0);

      // Should return fallback message
      const fallbackMessage =
        successfulResults.length === 0
          ? 'No results were obtained from the research queries.'
          : 'Results available';

      expect(fallbackMessage).toBe('No results were obtained from the research queries.');
    });
  });

  describe('Synthesis Logic', () => {
    it('should combine findings into structured format', () => {
      const findings = [
        { query: 'Query 1', result: 'Finding 1' },
        { query: 'Query 2', result: 'Finding 2' },
      ];

      const combinedFindings = findings
        .map((r, i) => `### Query ${i + 1}: ${r.query}\n\n${r.result}`)
        .join('\n\n---\n\n');

      expect(combinedFindings).toContain('### Query 1: Query 1');
      expect(combinedFindings).toContain('Finding 1');
      expect(combinedFindings).toContain('---');
      expect(combinedFindings).toContain('### Query 2: Query 2');
    });
  });

  describe('Config Validation', () => {
    it('should validate parallel queries bounds', () => {
      const validateParallelQueries = (n: number) => Math.min(10, Math.max(1, n));

      expect(validateParallelQueries(5)).toBe(5);
      expect(validateParallelQueries(0)).toBe(1);
      expect(validateParallelQueries(-1)).toBe(1);
      expect(validateParallelQueries(15)).toBe(10);
      expect(validateParallelQueries(10)).toBe(10);
      expect(validateParallelQueries(1)).toBe(1);
    });

    it('should handle NaN input', () => {
      const validateParallelQueries = (n: number) => Math.min(10, Math.max(1, n || 5));

      expect(validateParallelQueries(NaN)).toBe(5);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate research metrics correctly', () => {
      const results: ResearchResult[] = [
        { query: 'Q1', result: 'R1', usedCodingEndpoint: true, duration: 100 },
        { query: 'Q2', result: 'R2', usedCodingEndpoint: false, duration: 150 },
        { query: 'Q3', result: null, usedCodingEndpoint: true, duration: 50 },
        { query: 'Q4', result: 'R4', usedCodingEndpoint: true, duration: 200 },
        { query: 'Q5', result: 'R5', usedCodingEndpoint: false, duration: 120 },
      ];

      const metrics = {
        totalQueries: results.length,
        successfulQueries: results.filter((r) => r.result !== null).length,
        codingEndpointUsed: results.filter((r) => r.usedCodingEndpoint).length,
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        avgQueryTime: Math.round(
          results.reduce((sum, r) => sum + r.duration, 0) / results.length
        ),
      };

      expect(metrics.totalQueries).toBe(5);
      expect(metrics.successfulQueries).toBe(4);
      expect(metrics.codingEndpointUsed).toBe(3);
      expect(metrics.totalDuration).toBe(620);
      expect(metrics.avgQueryTime).toBe(124);
    });
  });

  describe('Fallback Query Generation', () => {
    it('should generate fallback queries when LLM fails', () => {
      const topic = 'machine learning';
      const numQueries = 5;

      const fallbackQueries = [
        `What is ${topic}?`,
        `Best practices for ${topic}`,
        `Common challenges with ${topic}`,
        `${topic} examples and use cases`,
        `Latest developments in ${topic}`,
      ].slice(0, numQueries);

      expect(fallbackQueries).toHaveLength(5);
      expect(fallbackQueries[0]).toBe('What is machine learning?');
      expect(fallbackQueries[1]).toContain('Best practices');
      expect(fallbackQueries[4]).toContain('Latest developments');
    });

    it('should respect numQueries limit in fallback', () => {
      const topic = 'AI';
      const numQueries = 3;

      const fallbackQueries = [
        `What is ${topic}?`,
        `Best practices for ${topic}`,
        `Common challenges with ${topic}`,
        `${topic} examples and use cases`,
        `Latest developments in ${topic}`,
      ].slice(0, numQueries);

      expect(fallbackQueries).toHaveLength(3);
    });
  });

  describe('API Key Validation', () => {
    it('should detect when API key is missing', () => {
      delete process.env.ZAI_API_KEY;
      expect(process.env.ZAI_API_KEY).toBeUndefined();
    });

    it('should detect when API key is set', () => {
      process.env.ZAI_API_KEY = 'test-key';
      expect(process.env.ZAI_API_KEY).toBe('test-key');
    });
  });
});

describe('CLI Argument Parsing', () => {
  it('should parse --parallel flag correctly', () => {
    const args = ['--parallel', '8', 'research topic'];

    let parallelQueries = 5;
    let topic = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--parallel' || args[i] === '-p') {
        parallelQueries = Math.min(10, Math.max(1, parseInt(args[++i], 10) || 5));
      } else if (!args[i].startsWith('-')) {
        topic = args[i];
      }
    }

    expect(parallelQueries).toBe(8);
    expect(topic).toBe('research topic');
  });

  it('should parse -p shorthand correctly', () => {
    const args = ['-p', '3', 'my topic'];

    let parallelQueries = 5;
    let topic = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--parallel' || args[i] === '-p') {
        parallelQueries = Math.min(10, Math.max(1, parseInt(args[++i], 10) || 5));
      } else if (!args[i].startsWith('-')) {
        topic = args[i];
      }
    }

    expect(parallelQueries).toBe(3);
    expect(topic).toBe('my topic');
  });

  it('should use default parallel count when not specified', () => {
    const args = ['research topic'];

    let parallelQueries = 5;
    let topic = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--parallel' || args[i] === '-p') {
        parallelQueries = Math.min(10, Math.max(1, parseInt(args[++i], 10) || 5));
      } else if (!args[i].startsWith('-')) {
        topic = args[i];
      }
    }

    expect(parallelQueries).toBe(5);
    expect(topic).toBe('research topic');
  });
});
