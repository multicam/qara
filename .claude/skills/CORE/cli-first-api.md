# CLI-First: API Integration Pattern

**Extracted from:** cli-first-guide.md

This document explains the critical CLI-First pattern for API calls: Never write API calls directly in prompts or ad-hoc bash scripts.

---

## CLI-First for API Calls

**CRITICAL PATTERN**: Never write API calls directly in prompts or ad-hoc bash scripts.

### The Problem with Ad-Hoc API Scripts ❌

**Old Way (Bash Script in Prompt):**
```bash
#!/bin/bash
# Embedded in skill prompt - BAD!

API_KEY=$SOME_API_KEY
URL="https://api.service.com/v1/data?date=$1&limit=$2"
curl -H "X-API-Key: $API_KEY" "$URL"
```

**Problems:**
- ❌ No validation of inputs
- ❌ No error handling
- ❌ No documentation (--help)
- ❌ Hard to test independently
- ❌ Difficult to maintain
- ❌ No type safety
- ❌ Code embedded in prompts
- ❌ Can't compose with other tools

### The CLI Tool Solution ✅

**New Way (TypeScript CLI Tool):**
```typescript
#!/usr/bin/env bun
// api-tool.ts - Production-ready CLI

import { parseArgs } from "util";

/**
 * CLI tool for Service API
 *
 * Usage: api-tool <command> [options]
 */

interface FetchOptions {
  date?: string;
  limit?: number;
  search?: string;
}

async function fetchData(options: FetchOptions): Promise<void> {
  // Input validation
  if (options.date && !isValidDate(options.date)) {
    console.error(`Error: Invalid date format: ${options.date}`);
    console.error("Expected format: YYYY-MM-DD");
    process.exit(1);
  }

  // API call with error handling
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Error: API_KEY environment variable not set");
      console.error("Add to ~/.claude/.env: API_KEY=your_key");
      process.exit(1);
    }

    const url = buildUrl(options);
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function isValidDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(date) && !isNaN(Date.parse(date));
}

function buildUrl(options: FetchOptions): string {
  const params = new URLSearchParams();
  if (options.date) params.set("date", options.date);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.search) params.set("q", options.search);

  return `https://api.service.com/v1/data?${params}`;
}

function showHelp() {
  console.log(`
Usage: api-tool <command> [options]

Commands:
  fetch         Fetch data from API
  search        Search resources

Options:
  --date <date>     Date in YYYY-MM-DD format
  --limit <num>     Max results (default: 20)
  --search <term>   Search term
  --help            Show this help

Examples:
  api-tool fetch --date 2025-11-19
  api-tool fetch --limit 50
  api-tool search "keyword" --limit 10
  api-tool fetch --date 2025-11-19 | jq '.data[].title'

Environment:
  API_KEY          Required. Set in ~/.claude/.env

Exit Codes:
  0    Success
  1    Error (invalid input, API failure, etc.)
`);
}

// Main execution
const args = parseArgs({
  options: {
    date: { type: "string" },
    limit: { type: "string" },
    search: { type: "string" },
    help: { type: "boolean" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  showHelp();
  process.exit(0);
}

const command = args.positionals[0];
if (!command) {
  console.error("Error: Missing command");
  showHelp();
  process.exit(1);
}

if (command === "fetch" || command === "search") {
  await fetchData({
    date: args.values.date,
    limit: args.values.limit ? parseInt(args.values.limit) : undefined,
    search: args.values.search,
  });
} else {
  console.error(`Error: Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}
```

**Benefits:**
- ✅ Validated inputs (date formats, required fields)
- ✅ Comprehensive error handling
- ✅ Full --help documentation
- ✅ Type-safe TypeScript
- ✅ Independently testable
- ✅ Version controlled
- ✅ Zero code in prompts
- ✅ Composable (pipes to jq, grep, etc.)
- ✅ Reusable across skills

### CLI Tool Checklist

Every API CLI tool must have:

- [ ] Full --help documentation
- [ ] Input validation with clear errors
- [ ] TypeScript with proper types
- [ ] Error messages to stderr
- [ ] JSON output to stdout
- [ ] Exit codes (0/1)
- [ ] README.md with examples
- [ ] Environment config (API keys in `~/.claude/.env`)
- [ ] Located in `~/.claude/bin/toolname/`
- [ ] Executable with shebang (`#!/usr/bin/env bun`)
- [ ] Composable with Unix tools (pipes, filters)
- [ ] Testable independently of AI

---

**Related Documentation:**
- cli-first-guide.md - Overview and quick reference
- cli-first-patterns.md - The Three-Step Pattern
- cli-first-design.md - CLI Design Best Practices
- cli-first-prompting.md - Prompting Layer Responsibilities
