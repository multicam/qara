# CLI-First: The Three-Step Pattern

**Extracted from:** cli-first-guide.md

This document details the fundamental three-step pattern for implementing CLI-First solutions.

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

/**
 * CLI tool for publishing blog posts
 *
 * Usage: blog-publish <file> [options]
 */

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

**AI Orchestration Layer (in skill workflow):**
```markdown
## Workflow: Publish Blog Post

### When to Use
User says: "publish blog", "push post to production", "deploy article"

### Steps

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

**Related Documentation:**
- cli-first-guide.md - Overview and quick reference
- cli-first-design.md - CLI Design Best Practices
- cli-first-api.md - CLI-First for API Calls
- cli-first-prompting.md - Prompting Layer Responsibilities
