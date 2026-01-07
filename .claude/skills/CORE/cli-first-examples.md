# CLI-First Real-World Examples

**Purpose**: Concrete examples of CLI-First architecture in practice, showing before/after transformations and common anti-patterns to avoid.

**When to read**: Looking for practical inspiration, migrating from prompt-driven to CLI-First, or evaluating whether to build a CLI tool.

---

## Table of Contents
1. [Real-World Examples](#real-world-examples)
2. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
3. [Migration Patterns](#migration-patterns)
4. [Canonical Examples in Qara](#canonical-examples-in-qara)

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
- ✅ Consistent file structure
- ✅ Reproducible results
- ✅ Version controlled
- ✅ Testable independently
- ✅ AI just orchestrates

**Workflow Integration:**
```markdown
## Workflow: Run Evaluation

User says: "run evals for newsletter-summary"

Steps:
1. Validate use case exists
2. Run: `evals run --use-case newsletter-summary --model claude-3-5-sonnet`
3. Parse JSON output
4. Present results to user in readable format
5. Offer to compare with other models
```

---

### Example 2: Blog Publishing

**Before (Prompt-Driven):**
```markdown
AI ad-hoc:
- Copies file to blog directory (sometimes wrong location)
- Runs Hugo build with varying commands
- Deployment steps inconsistent
- Verification sometimes skipped
- No clear success/failure feedback
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
- ✅ Never miss verification step
- ✅ Same process every time
- ✅ Easy to add to CI/CD
- ✅ Can run manually if needed
- ✅ Clear success/failure messages

**Implementation:**
```typescript
#!/usr/bin/env bun
// blog-publish.ts

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
  buildTime?: number;
}

async function publish(file: string, verify: boolean): Promise<PublishResult> {
  // Step 1: Validate frontmatter
  const frontmatter = await parseFrontmatter(file);
  if (!frontmatter.title || !frontmatter.date) {
    return {
      success: false,
      error: "Missing required frontmatter fields: title, date"
    };
  }

  // Step 2: Copy to correct location
  const destPath = `./content/posts/${frontmatter.slug}.md`;
  await copyFile(file, destPath);

  // Step 3: Build with Hugo
  const buildStart = Date.now();
  const buildResult = await exec("hugo --minify");
  const buildTime = Date.now() - buildStart;

  if (buildResult.code !== 0) {
    return {
      success: false,
      error: `Hugo build failed: ${buildResult.stderr}`
    };
  }

  // Step 4: Deploy via git
  await exec("git add public/");
  await exec(`git commit -m "Publish: ${frontmatter.title}"`);
  await exec("git push origin main");

  const url = `https://site.com/posts/${frontmatter.slug}`;

  // Step 5: Verify deployment (if requested)
  if (verify) {
    const verified = await verifyDeployment(url);
    if (!verified) {
      return {
        success: false,
        error: "Deployment verification failed - site not responding",
        url
      };
    }
  }

  return {
    success: true,
    url,
    buildTime
  };
}
```

---

### Example 3: API Integration (Limitless.ai)

**Before (Bash Scripts in Prompt):**
```bash
#!/bin/bash
# fetch-limitless.sh - embedded in multiple skill prompts
# Different scripts for different skills
# No validation, poor error handling

API_KEY=$LIMITLESS_API_KEY
DATE=$1
LIMIT=${2:-20}

curl -s -H "X-API-Key: $API_KEY" \
  "https://api.limitless.ai/v1/lifelogs?date=$DATE&limit=$LIMIT"
```

**Problems:**
- ❌ Duplicated across 3 different skills
- ❌ No date format validation
- ❌ No error handling (silent failures)
- ❌ Hard-coded URL
- ❌ Can't compose with other tools
- ❌ No help documentation

**After (llcli Tool):**
```bash
# Single CLI tool, used across all skills
$ llcli today --limit 20
$ llcli search "keyword"
$ llcli date 2025-11-19

# Composable
$ llcli today | jq '.data.lifelogs[] | select(.duration > 3600)'
$ llcli search "consulting" | grep -i "quorum"
```

**Implementation:**
```typescript
#!/usr/bin/env bun
// llcli.ts - Limitless.ai CLI tool

import { parseArgs } from "util";

interface LifelogOptions {
  date?: string;
  limit?: number;
  search?: string;
}

async function fetchLifelogs(options: LifelogOptions): Promise<void> {
  // Validate date format
  if (options.date && !isValidDate(options.date)) {
    console.error("Error: Invalid date format. Use YYYY-MM-DD");
    process.exit(1);
  }

  // Get API key from environment
  const apiKey = process.env.LIMITLESS_API_KEY;
  if (!apiKey) {
    console.error("Error: LIMITLESS_API_KEY not set in ~/.claude/.env");
    process.exit(1);
  }

  // Build URL
  const url = new URL("https://api.limitless.ai/v1/lifelogs");
  if (options.date) url.searchParams.set("date", options.date);
  if (options.limit) url.searchParams.set("limit", String(options.limit));
  if (options.search) url.searchParams.set("q", options.search);

  // Fetch with error handling
  try {
    const response = await fetch(url.toString(), {
      headers: { "X-API-Key": apiKey }
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
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

// Parse and execute
const args = parseArgs({
  options: {
    limit: { type: "string" },
    help: { type: "boolean" }
  },
  allowPositionals: true
});

if (args.values.help) {
  showHelp();
  process.exit(0);
}

const command = args.positionals[0];
const query = args.positionals[1];

if (command === "today") {
  await fetchLifelogs({ limit: parseInt(args.values.limit || "20") });
} else if (command === "date" && query) {
  await fetchLifelogs({ date: query, limit: parseInt(args.values.limit || "20") });
} else if (command === "search" && query) {
  await fetchLifelogs({ search: query, limit: parseInt(args.values.limit || "50") });
} else {
  console.error("Error: Invalid command");
  showHelp();
  process.exit(1);
}
```

**Benefits:**
- ✅ Reusable across all skills
- ✅ Type-safe TypeScript
- ✅ Comprehensive validation
- ✅ Well-documented (--help)
- ✅ Independently testable
- ✅ Composable with jq, grep
- ✅ Single source of truth

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Code in Prompts

**Bad:**
```markdown
# In skill workflow
Run this bash command:
  curl -H "X-API-Key: $KEY" https://api.service.com/data | jq '.results'
```

**Why Bad:**
- Not version controlled (prompt changes don't show code changes)
- Hard to test (can't test prompt independently)
- Can't evolve easily (changing logic means changing prompts)
- Duplicated across skills (same code in multiple places)
- No validation or error handling

**Good:**
```markdown
# In skill workflow
Run: api-tool fetch --limit 50
```

**Why Good:**
- Version controlled (git tracks tool changes)
- Testable (test tool directly)
- Easy to evolve (update tool, prompts stay same)
- Reusable (one tool, many skills)
- Validated, error-handled

---

### ❌ Anti-Pattern 2: Skipping to AI

**Bad:**
```
Requirements → AI Prompt (no CLI layer)
```

**Why Bad:**
- Inconsistent results (prompts drift, models vary)
- Can't test independently (tied to AI model)
- Behavior changes with model updates
- Hard to debug (what exactly happened?)
- No reproducibility

**Example:**
```markdown
User: "process these files"

AI: *generates ad-hoc code to process files*
  - Different approach each time
  - No validation
  - No error handling
  - Can't reproduce
```

**Good:**
```
Requirements → CLI Tool → AI Orchestration
```

**Why Good:**
- Consistent results (deterministic CLI)
- Testable independently
- Behavior explicit in code
- Easy to debug (inspect command)
- Fully reproducible

**Example:**
```markdown
User: "process these files"

AI: Running: file-processor batch --validate --output results/

CLI tool:
  - Same validation every time
  - Same error handling
  - Same output format
  - Reproducible
```

---

### ❌ Anti-Pattern 3: Complex Bash Logic

**Bad:**
```bash
#!/bin/bash
# 200 lines of bash with loops, conditionals
# Embedded in skill prompt

for file in *.md; do
  if grep -q "draft: true" "$file"; then
    echo "Skipping draft: $file"
  else
    title=$(grep "title:" "$file" | cut -d: -f2)
    # ... 50 more lines of bash string manipulation
  fi
done
```

**Why Bad:**
- Bash is hard to maintain (string manipulation nightmare)
- No type safety (everything is a string)
- Poor error handling (silent failures)
- Can't test easily (no unit tests for bash)
- Hard to read (bash syntax is cryptic)

**Good:**
```typescript
#!/usr/bin/env bun
// post-processor.ts - TypeScript CLI with proper structure

interface PostMetadata {
  title: string;
  draft: boolean;
  date: Date;
}

function parsePost(file: string): PostMetadata {
  const content = readFileSync(file, "utf-8");
  const frontmatter = parseFrontmatter(content);
  
  return {
    title: frontmatter.title,
    draft: frontmatter.draft === true,
    date: new Date(frontmatter.date)
  };
}

async function processPosts(directory: string): Promise<void> {
  const files = readdirSync(directory).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const post = parsePost(path.join(directory, file));
    
    if (post.draft) {
      console.log(`Skipping draft: ${file}`);
      continue;
    }
    
    await processPublishedPost(post, file);
  }
}
```

**Why Good:**
- TypeScript is maintainable (clear types, IDE support)
- Type safety (catch errors at compile time)
- Good error handling (try/catch, explicit errors)
- Testable (unit tests for functions)
- Readable (clear intent, good names)

---

### ❌ Anti-Pattern 4: One-Off CLI for Simple Tasks

**Bad:**
```bash
# Create CLI for single file read
#!/usr/bin/env bun
// read-file.ts

import { readFileSync } from "fs";

const file = process.argv[2];
console.log(readFileSync(file, "utf-8"));
```

**Why Bad:**
- Overhead not justified (simple task doesn't need CLI)
- Just adds complexity (wrapper around cat)
- Maintenance burden (another tool to maintain)
- Doesn't add value (cat already exists)

**Good:**
```bash
# Direct file operation
$ cat ./data.txt
```

**Rule of Thumb:** Only create CLI if task will be done 5+ times or needs determinism/validation.

---

### ❌ Anti-Pattern 5: CLI Without --help

**Bad:**
```typescript
#!/usr/bin/env bun
// mystery-tool.ts - No documentation

const arg1 = process.argv[2];
const arg2 = process.argv[3];

// ... does something ...
// Users have to read code to understand
```

**Why Bad:**
- Not discoverable (how do I use this?)
- Can't remember syntax (which arg is which?)
- Hard for new users (no onboarding)
- Looks unprofessional (incomplete tool)

**Good:**
```typescript
#!/usr/bin/env bun
// documented-tool.ts

function showHelp() {
  console.log(`
Usage: documented-tool <action> <target> [options]

Actions:
  create    Create new resource
  update    Update existing resource
  delete    Delete resource

Options:
  --verbose    Enable verbose logging
  --help       Show this help

Examples:
  documented-tool create my-resource
  documented-tool update my-resource --verbose
  documented-tool delete my-resource

Exit Codes:
  0    Success
  1    Error
`);
}

const args = parseArgs({
  options: {
    help: { type: "boolean" },
    verbose: { type: "boolean" }
  },
  allowPositionals: true
});

if (args.values.help) {
  showHelp();
  process.exit(0);
}
```

**Why Good:**
- Discoverable (--help shows everything)
- Easy to remember (examples provided)
- User-friendly (clear documentation)
- Professional (complete tool)

---

## Migration Patterns

### Pattern 1: Bash Script → TypeScript CLI

**Before:**
```bash
#!/bin/bash
# deploy.sh

git pull origin main
npm install
npm run build
pm2 restart app
```

**After:**
```typescript
#!/usr/bin/env bun
// deploy.ts

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface DeployResult {
  success: boolean;
  steps: string[];
  errors: string[];
}

async function deploy(): Promise<DeployResult> {
  const result: DeployResult = {
    success: true,
    steps: [],
    errors: []
  };

  try {
    // Step 1: Pull latest
    await execAsync("git pull origin main");
    result.steps.push("✓ Pulled latest code");

    // Step 2: Install dependencies
    await execAsync("npm install");
    result.steps.push("✓ Installed dependencies");

    // Step 3: Build
    await execAsync("npm run build");
    result.steps.push("✓ Built application");

    // Step 4: Restart
    await execAsync("pm2 restart app");
    result.steps.push("✓ Restarted application");

  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

// Execute and report
const result = await deploy();

if (result.success) {
  console.log("Deployment successful:");
  result.steps.forEach(step => console.log(`  ${step}`));
  process.exit(0);
} else {
  console.error("Deployment failed:");
  result.errors.forEach(err => console.error(`  ✗ ${err}`));
  process.exit(1);
}
```

---

## Canonical Examples in Qara

### llcli - Limitless.ai API

**Location:** `~/.claude/bin/llcli/`

Perfect example of CLI-First API integration.

**Features:**
- ✅ TypeScript with full types
- ✅ Comprehensive --help
- ✅ Input validation (dates, limits)
- ✅ Error handling (API errors, network failures)
- ✅ JSON output (pipes to jq)
- ✅ Environment config (.env)
- ✅ Composable (grep, awk, etc.)

**Usage:**
```bash
llcli today
llcli date 2025-11-19
llcli search "consulting" --limit 50
llcli today | jq '.data.lifelogs[].title'
```

---

## Key Lessons

### When to Build CLI

✅ **Build when:**
- Task runs >5 times
- Need consistent results
- Managing state/files
- Want automation
- Need testing

❌ **Skip when:**
- One-off task
- Simple file operation
- Pure computation

### What Makes a Good CLI

1. **Clear command structure** - Hierarchical, verb-based
2. **Comprehensive --help** - Examples, options, exit codes
3. **Input validation** - Fail fast with clear errors
4. **Output formats** - Human-readable + JSON
5. **Error handling** - Actionable error messages
6. **Composability** - Works with pipes, filters
7. **Documentation** - README with examples

### The Pattern Always Works

```
Requirements → CLI Tool → AI Orchestration
```

Never skip the middle step.

---

## Related Documentation

- **CONSTITUTION.md** - Core CLI-First principle
- **cli-first-guide.md** - Implementation patterns and best practices
- **stack-preferences.md** - TypeScript over Python, Bun runtime
- **testing-guide.md** - Testing CLI tools independently
