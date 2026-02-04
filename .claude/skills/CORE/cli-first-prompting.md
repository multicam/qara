# CLI-First: Prompting Layer Responsibilities

**Extracted from:** cli-first-guide.md

This document defines the boundaries between CLI tools and AI prompting layers, clarifying what should be in deterministic code vs. orchestration prompts.

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

**Related Documentation:**
- cli-first-guide.md - Overview and quick reference
- cli-first-patterns.md - The Three-Step Pattern
- cli-first-design.md - CLI Design Best Practices
- cli-first-api.md - CLI-First for API Calls
