# CLI-First Architecture

**Purpose**: Comprehensive guide to building deterministic CLI tools before adding AI orchestration, following Qara's core principle: "Code Before Prompts."

**Last Updated**: 2025-11-19

---

## Table of Contents
1. [The Core Principle](#the-core-principle)
2. [Why CLI-First?](#why-cli-first)
3. [The Three-Step Pattern](#the-three-step-pattern)
4. [CLI Design Best Practices](#cli-design-best-practices)
5. [CLI-First for API Calls](#cli-first-for-api-calls)
6. [When to Apply CLI-First](#when-to-apply-cli-first)
7. [Prompting Layer Responsibilities](#prompting-layer-responsibilities)
8. [Real-World Examples](#real-world-examples)
9. [Anti-Patterns](#anti-patterns)

---

## The Core Principle

> **Build tools that work perfectly without AI, then add AI to make them easier to use.**

AI should orchestrate deterministic tools, not replace them with ad-hoc prompting.

**Key Insight**: Code is cheaper, faster, and more reliable than prompts.

### The Fundamental Pattern
```
Requirements → CLI Tool → Prompting Layer
   (what)      (how)       (orchestration)
```

From CONSTITUTION.md Principle #3:
> **Code Before Prompts**: Write code to solve problems, use prompts to orchestrate code.

---

## Why CLI-First?

### Old Way (Prompt-Driven) ❌
```
User Request → AI generates code/actions ad-hoc → Inconsistent results
```

**Problems:**
- ❌ Inconsistent outputs (prompts drift, model variations)
- ❌ Hard to debug (what exactly happened?)
- ❌ Not reproducible (same request, different results)
- ❌ Difficult to test (prompts change, behavior changes)
- ❌ No version control (prompt changes don't track behavior)
- ❌ Token wasteful (re-explaining same logic every time)
- ❌ Model-dependent (breaks when model changes)

### New Way (CLI-First) ✅
```
User Request → AI uses deterministic CLI → Consistent results
```

**Advantages:**
- ✅ Consistent outputs (same command = same result)
- ✅ Easy to debug (inspect CLI command that was run)
- ✅ Reproducible (CLI commands are deterministic)
- ✅ Testable (test CLI directly, independently of AI)
- ✅ Version controlled (CLI changes are explicit code changes)
- ✅ Token efficient (no re-explaining in prompts)
- ✅ Model agnostic (works with any AI that can call commands)

### Command Line Interfaces Provide

**Discoverability**:
- `--help` shows all commands, options, examples
- Users can explore capabilities without AI

**Scriptability**:
- Commands can be automated in bash/scripts
- Compose with pipes and other Unix tools
- Build complex workflows from simple commands

**Testability**:
- Test CLI independently of AI
- Write unit tests for command logic
- Integration tests for command composition

**Flexibility**:
- Use with or without AI
- Works in scripts, cron jobs, CI/CD
- Human can run directly if AI fails

**Transparency**:
- See exactly what was executed
- Audit trail of commands run
- Understand system behavior

---

## The Three-Step Pattern

### Step 1: Understand Requirements

**Document Everything:**
- What does this tool need to do?
- What inputs does it accept?
- What outputs does it produce?
- What edge cases exist?
- What error conditions might occur?

**Write Specifications First:**
```markdown
# Tool: blog-publish

## Purpose
Publish markdown blog post to production site

## Inputs
- Post file path (required)
- Verify deployment flag (optional)
- Environment (dev/prod, optional, default: prod)

## Outputs
- Success message with live URL
- Exit code 0 on success, 1 on failure

## Edge Cases
- File doesn't exist → Error with helpful message
- Invalid frontmatter → Error listing missing fields
- Deployment verification timeout → Retry 3 times

## Dependencies
- git (for deployment)
- curl (for verification)
- Hugo (for building)
```

### Step 2: Build Deterministic CLI

**Create Command-Line Tool:**
```typescript
#!/usr/bin/env bun
// blog-publish.ts

import { parseArgs } from "util";
import { existsSync } from "fs";
import { exec } from "child_process";

// Full TypeScript implementation with:
// - Input validation
// - Error handling
// - --help documentation
// - Type safety
// - Testability
// - Clean separation from prompts

interface PublishOptions {
  file: string;
  verify?: boolean;
  environment?: "dev" | "prod";
}

function showHelp() {
  console.log(`
Usage: blog-publish <file> [options]

Publish markdown blog post to production site

Arguments:
  file              Path to markdown file (required)

Options:
  --verify          Verify deployment by checking live URL
  --env <env>       Environment: dev or prod (default: prod)
  --help            Show this help message

Examples:
  blog-publish ./posts/my-post.md
  blog-publish ./posts/my-post.md --verify
  blog-publish ./posts/my-post.md --env dev

Exit Codes:
  0    Success
  1    Error (file not found, build failed, etc.)
`);
}

async function publish(options: PublishOptions): Promise<void> {
  // Validate inputs
  if (!existsSync(options.file)) {
    console.error(`Error: File not found: ${options.file}`);
    process.exit(1);
  }

  // Implementation...
  // All logic deterministic, testable, documented
}

// Parse args and execute
const args = parseArgs({
  options: {
    verify: { type: "boolean" },
    env: { type: "string", default: "prod" },
    help: { type: "boolean" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  showHelp();
  process.exit(0);
}

const file = args.positionals[0];
if (!file) {
  console.error("Error: Missing required argument: file");
  showHelp();
  process.exit(1);
}

await publish({
  file,
  verify: args.values.verify,
  environment: args.values.env as "dev" | "prod",
});
```

### Step 3: Wrap with Prompting

**AI Orchestration Layer:**
```markdown
# Writing Skill - Publish Blog Workflow

## When to Use
User says: "publish blog", "push post to production", "deploy article"

## Workflow

1. **Identify post file**
   - Ask user which post or use current file
   - Validate file exists

2. **Execute CLI tool**
   ```bash
   blog-publish ./posts/my-post.md --verify
   ```

3. **Handle results**
   - Success: Show live URL, confirm deployment
   - Error: Parse error message, suggest fix
   - Verification failed: Show retry options

4. **Follow-up actions**
   - Offer to share on social media
   - Suggest next steps (analytics, etc.)
```

**Key Points:**
- AI uses the tool, doesn't replicate it
- AI adds user experience layer
- Tool works independently of AI
- Natural language → structured commands

---

## CLI Design Best Practices

### 1. Command Structure

**Hierarchical, Clear Verbs:**
```bash
# Good: Clear command hierarchy
tool command subcommand --flag value

# Examples:
evals use-case create --name foo
evals test-case add --use-case foo --file test.json
evals run --use-case foo --model claude-3-5-sonnet

blog post create --title "My Post"
blog post publish --file ./posts/my-post.md
blog site build --env prod
```

**Avoid Ambiguous Commands:**
```bash
# Bad: What does "run" do?
tool run file.txt

# Good: Explicit action
tool process file.txt
tool analyze file.txt
```

### 2. Comprehensive --help

**Every Command Needs --help:**
```bash
$ tool --help
Usage: tool <command> [options]

Commands:
  create    Create new resource
  list      List all resources
  update    Update existing resource
  delete    Delete resource

Options:
  --help    Show this help
  --json    Output as JSON
  --verbose Enable verbose logging

Examples:
  tool create --name foo
  tool list --json
  tool update foo --name bar

For command-specific help:
  tool <command> --help
```

### 3. Idempotency

**Same Command = Same Result:**
```bash
# Create command is idempotent
$ tool create --name foo
Created: foo

$ tool create --name foo
Already exists: foo (no changes)

# Not an error - just confirmation
```

**Why Idempotency Matters:**
- Safe to retry on failure
- Scripts can be re-run
- No accidental duplicates
- Predictable behavior

### 4. Output Formats

**Human-Readable by Default:**
```bash
$ tool list
Resources:
  - foo (created: 2025-11-19)
  - bar (created: 2025-11-18)

Total: 2 resources
```

**JSON for Scripting:**
```bash
$ tool list --json
{
  "resources": [
    {"name": "foo", "created": "2025-11-19"},
    {"name": "bar", "created": "2025-11-18"}
  ],
  "total": 2
}
```

**Composable with Unix Tools:**
```bash
# Pipes to jq for filtering
$ tool list --json | jq '.resources[].name'
"foo"
"bar"

# Pipes to grep
$ tool list | grep foo
```

### 5. Progressive Disclosure

**Simple for Common Cases:**
```bash
# Simplest form
$ tool run my-task

# With common option
$ tool run my-task --verbose
```

**Advanced Options Available:**
```bash
# Full control when needed
$ tool run my-task \
  --config custom.json \
  --retries 5 \
  --timeout 30 \
  --output results.json \
  --verbose
```

### 6. Error Handling

**Clear, Actionable Error Messages:**
```bash
# Bad
$ tool run
Error: invalid input

# Good
$ tool run
Error: Missing required argument: <task-name>

Usage: tool run <task-name> [options]

Examples:
  tool run my-task
  tool run my-task --verbose

Run 'tool --help' for more information
```

**Exit Codes:**
```bash
0    Success
1    Generic error
2    Invalid arguments
3    File not found
4    Permission denied
# etc.
```

### 7. Input Validation

**Validate Early, Fail Fast:**
```typescript
// Validate all inputs before execution
function validateArgs(args: Args): ValidationResult {
  const errors: string[] = [];

  if (!args.taskName) {
    errors.push("Missing required argument: task-name");
  }

  if (args.timeout && args.timeout < 0) {
    errors.push("Timeout must be positive number");
  }

  if (args.config && !existsSync(args.config)) {
    errors.push(`Config file not found: ${args.config}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
```

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

### Canonical Example: llcli

**Location:** `~/.claude/bin/llcli/`

The Limitless.ai CLI demonstrates perfect CLI-First API integration.

**Structure:**
```
~/.claude/bin/llcli/
├── llcli.ts          # Main CLI (TypeScript)
├── package.json      # Dependencies
└── README.md         # Full documentation
```

**Usage:**
```bash
# Documented commands
$ llcli --help
$ llcli today --limit 20
$ llcli date 2025-11-17
$ llcli search "keyword" --limit 50

# Clean JSON output (pipes to jq)
$ llcli today | jq '.data.lifelogs[].title'

# Composable with other tools
$ llcli search "consulting" | grep -i "quorum"
```

**Features:**
- ✅ Full --help system
- ✅ Input validation (date formats, required args)
- ✅ Error messages to stderr
- ✅ Exit codes (0 success, 1 error)
- ✅ JSON output to stdout
- ✅ TypeScript with types
- ✅ Environment config (`~/.claude/.env`)
- ✅ Composable (pipes to jq, grep, etc.)

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

## When to Apply CLI-First

### ✅ Apply CLI-First When:

**1. Repeated Operations**
- Task will be performed multiple times
- Want consistent results every time
- *Example*: Publishing blog posts, running evals

**2. Deterministic Results**
- Same input should always produce same output
- No random or probabilistic behavior
- *Example*: Data transformations, file processing

**3. Complex State Management**
- Managing files, databases, configurations
- Need to track changes over time
- *Example*: Evaluation system, content management

**4. Query Requirements**
- Need to search, filter, aggregate data
- Want composable operations (pipes, filters)
- *Example*: Log analysis, data exploration

**5. Version Control**
- Operations should be tracked and reproducible
- Want git history of tool changes
- *Example*: Infrastructure management, deployment scripts

**6. Testing Needs**
- Want to test independently of AI
- Need reliable regression tests
- *Example*: Critical workflows, business logic

**7. User Flexibility**
- Users might want to script or automate
- Need to work without AI
- *Example*: CI/CD integration, scheduled tasks

### ❌ Don't Need CLI-First When:

**1. One-Off Operations**
- Will only be done once or rarely
- No need for reproducibility
- *Example*: Migrating data one time, emergency fix

**2. Simple File Operations**
- Just reading or writing a single file
- No complex logic or validation
- *Example*: Creating README, quick formatting

**3. Pure Computation**
- No state management or side effects
- Simple calculation or transformation
- *Example*: Converting units, basic math

**4. Exploratory Work**
- Still figuring out what you need
- Requirements not clear yet
- *Example*: Prototyping, research, investigation

### Decision Framework

Ask these questions:
1. **Will this be run more than 5 times?** → CLI-First
2. **Do I need the same result every time?** → CLI-First
3. **Will others need to use this?** → CLI-First
4. **Do I need to test this?** → CLI-First
5. **Will requirements change?** → CLI-First (easier to update code than prompts)

If you answered "yes" to 2+ questions → Build CLI tool

---

## Prompting Layer Responsibilities

### The Prompting Layer Should:

**1. Understand User Intent**
```markdown
User: "publish my latest blog post"

AI interprets:
- Intent: Publish blog post
- Target: Most recent post in drafts/
- Action: Run blog-publish CLI
- Verification: Likely wants confirmation
```

**2. Map Intent to CLI Commands**
```markdown
Intent → CLI mapping:
- "publish blog" → blog-publish
- "run evaluations" → evals run
- "check API logs" → llcli today
```

**3. Execute CLI in Correct Order**
```bash
# AI orchestrates sequence
blog-publish ./posts/draft.md --verify
# Wait for result
# If success, proceed
blog-share --url <live-url> --platforms twitter,linkedin
```

**4. Handle Errors and Retry**
```markdown
CLI error: "Deployment verification timeout"

AI response:
- Parse error message
- Explain to user in plain language
- Suggest: "Should I retry with longer timeout?"
- If yes: blog-publish --verify --timeout 60
```

**5. Summarize Results for User**
```markdown
✅ RESULTS:
Blog post "My Title" published successfully
- Live URL: https://site.com/posts/my-title
- Verified deployment: ✓
- Build time: 2.3s
- Content size: 45KB
```

**6. Ask Clarifying Questions**
```markdown
User: "publish post"
AI: Multiple draft posts found:
- draft1.md (updated today)
- draft2.md (updated 3 days ago)

Which post should I publish?
```

### The Prompting Layer Should NOT:

**1. Replicate CLI Functionality**
```bash
# ❌ Bad: AI generates ad-hoc code
AI: Let me write a bash script to deploy...

# ✅ Good: AI uses existing CLI
AI: Running: blog-publish ./posts/my-post.md
```

**2. Generate Solutions Without CLI**
```bash
# ❌ Bad: Ad-hoc curl command in prompt
curl -X POST https://api.service.com/deploy...

# ✅ Good: Use CLI tool
blog-publish --env prod
```

**3. Perform Operations That Should Be CLI**
```bash
# ❌ Bad: AI does file manipulation ad-hoc
AI: Moving files, updating configs manually...

# ✅ Good: CLI tool handles file operations
config-update --add-field new_value
```

**4. Bypass CLI for "Simple" Operations**
```bash
# ❌ Bad: "This is simple, I'll just..."
AI: Let me quickly copy this file...

# ✅ Good: Consistent use of tools
file-tool copy src dest --verify
```

---

## Real-World Examples

### Example 1: Evaluation System

**Before (Prompt-Driven):**
```markdown
AI manually:
- Creates JSON files
- Updates directory structure
- Runs comparisons ad-hoc
- Formats output inconsistently
```

**After (CLI-First):**
```bash
# Create use case
$ evals use-case create --name newsletter-summary

# Add test case
$ evals test-case add \
  --use-case newsletter-summary \
  --file test.json

# Run evaluation
$ evals run \
  --use-case newsletter-summary \
  --model claude-3-5-sonnet \
  --json

# Compare results
$ evals compare \
  --use-case newsletter-summary \
  --models claude-3-5-sonnet,gpt-4
```

**Benefits:**
- Consistent file structure
- Reproducible results
- Version controlled
- Testable independently
- AI just orchestrates

### Example 2: Blog Publishing

**Before (Prompt-Driven):**
```markdown
AI ad-hoc:
- Copies file to blog directory
- Runs Hugo build with varying commands
- Deployment steps inconsistent
- Verification sometimes skipped
```

**After (CLI-First):**
```bash
# Single deterministic command
$ blog-publish ./posts/my-post.md --verify

# Always does:
# 1. Validates frontmatter
# 2. Copies to correct location
# 3. Runs Hugo build
# 4. Deploys via git
# 5. Verifies deployment
# 6. Returns live URL
```

**Benefits:**
- Never miss verification step
- Same process every time
- Easy to add to CI/CD
- Can run manually if needed

### Example 3: API Integration (Limitless.ai)

**Before (Bash Scripts in Prompt):**
```bash
#!/bin/bash
# Various bash scripts embedded in skill prompts
# Different scripts for different skills
# No validation, poor error handling
```

**After (llcli Tool):**
```bash
# Single CLI tool, used across all skills
$ llcli today --limit 20
$ llcli search "keyword"
$ llcli date 2025-11-19

# Composable
$ llcli today | jq '.data.lifelogs[] | select(.duration > 3600)'
```

**Benefits:**
- Reusable across skills
- Type-safe TypeScript
- Comprehensive validation
- Well-documented (--help)
- Independently testable

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Code in Prompts

**Bad:**
```markdown
# In skill workflow
Run this bash command:
  curl -H "X-API-Key: $KEY" https://api.service.com/data | jq '.results'
```

**Why Bad:**
- Not version controlled
- Hard to test
- Can't evolve easily
- Duplicated across skills

**Good:**
```markdown
# In skill workflow
Run: api-tool fetch --limit 50
```

### ❌ Anti-Pattern 2: Skipping to AI

**Bad:**
```
Requirements → AI Prompt (no CLI layer)
```

**Why Bad:**
- Inconsistent results
- Can't test independently
- Behavior changes with model updates
- Hard to debug

**Good:**
```
Requirements → CLI Tool → AI Orchestration
```

### ❌ Anti-Pattern 3: Complex Bash Logic

**Bad:**
```bash
#!/bin/bash
# 200 lines of bash with loops, conditionals
# Embedded in skill prompt
```

**Why Bad:**
- Bash is hard to maintain
- No type safety
- Poor error handling
- Can't test easily

**Good:**
```typescript
// TypeScript CLI with proper structure
// In ~/.claude/bin/tool-name/
```

### ❌ Anti-Pattern 4: One-Off CLI for Simple Tasks

**Bad:**
```bash
# Create CLI for single file read
$ read-file ./data.txt
```

**Why Bad:**
- Overhead not justified
- Simple task doesn't need CLI
- Just adds complexity

**Good:**
```bash
# Direct file operation
$ cat ./data.txt
```

**Rule of Thumb:** Only create CLI if task will be done 5+ times or needs determinism.

### ❌ Anti-Pattern 5: CLI Without --help

**Bad:**
```typescript
// CLI tool with no documentation
// Users have to read code to understand
```

**Why Bad:**
- Not discoverable
- Can't remember syntax
- Hard for new users
- Looks unprofessional

**Good:**
```bash
$ tool --help
# Comprehensive help with examples
```

---

## Quick Reference

### The CLI-First Checklist

Before building anything, ask:
- [ ] Will this be run more than 5 times?
- [ ] Do I need consistent results?
- [ ] Will others use this?
- [ ] Do I need to test this?
- [ ] Is this managing complex state?

If 2+ yes → Build CLI tool

### CLI Tool Must-Haves

Every CLI tool needs:
- [ ] Clear command structure
- [ ] Full --help documentation
- [ ] Input validation
- [ ] Error handling with actionable messages
- [ ] Exit codes (0 success, 1+ errors)
- [ ] Output format (human + JSON)
- [ ] TypeScript implementation
- [ ] README.md with examples
- [ ] Location in `~/.claude/bin/toolname/`
- [ ] Executable (`chmod +x`, shebang)

### The Pattern

```
1. Requirements (what) → Document fully
2. CLI Tool (how) → Build deterministically
3. Prompting (orchestration) → AI wraps CLI
```

**Never skip step 2.**

---

## Related Documentation

- **CONSTITUTION.md** - Founding principle #3 (Code Before Prompts)
- **stack-preferences.md** - TypeScript over Python, Bun for runtimes
- **TESTING.md** - How to test CLI tools independently
- **system-mcp skill** - Example of CLI-First for API integration

---

## Key Takeaways

1. **Build tools that work without AI** - Then add AI for convenience
2. **Code is cheaper than prompts** - Write it once, use it forever
3. **CLI enables testing** - Test tools independently of AI
4. **Version control behavior** - CLI changes are explicit code changes
5. **Determinism is reliability** - Same command = same result
6. **Discoverability matters** - --help makes tools self-documenting
7. **Compose with Unix tools** - Pipes, filters, automation

**The Golden Rule:**
> If you're writing the same logic in prompts multiple times, it should be a CLI tool.
