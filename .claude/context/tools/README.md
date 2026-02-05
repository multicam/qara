# Tools Context Directory

**Purpose**: Documentation for Claude Code built-in tools and MCP server integrations.

## Built-in Tools Reference

### WebSearch
Real-time web search with source citation.

```typescript
// Usage in prompts
"Use WebSearch to find current information about [topic]"

// Returns search results with:
// - Title and URL
// - Snippet/description
// - Source attribution
```

**Best Practices:**
- Include year in queries for recent information (e.g., "React 19 features 2024")
- Use for current events, documentation, pricing, availability
- Always cite sources in responses

### WebFetch
Retrieve and process web page content.

```typescript
// Usage
WebFetch({ url: "https://example.com", prompt: "Extract the main content" })

// Handles:
// - HTML to markdown conversion
// - Content summarization
// - Specific data extraction
```

**Usage:** Use WebFetch (free, built-in) for content retrieval.

### AskUserQuestion
Interactive user queries with structured options.

```typescript
// Usage
AskUserQuestion({
  questions: [{
    question: "Which approach do you prefer?",
    header: "Approach",
    options: [
      { label: "Option A (Recommended)", description: "Fast, simple" },
      { label: "Option B", description: "More flexible" }
    ],
    multiSelect: false
  }]
})
```

**When to Use:**
- Clarifying ambiguous requirements
- Choosing between valid approaches
- Confirming destructive operations
- Gathering preferences

**When NOT to Use:**
- You can make a reasonable decision
- The choice has minimal impact
- User has already specified preference

### Task (Background Agents)
Launch agents with optional background execution.

```typescript
// Foreground (blocking)
Task({
  subagent_type: "researcher",
  prompt: "Research X",
  description: "Research task"
})

// Background (non-blocking)
Task({
  subagent_type: "researcher",
  prompt: "Research X",
  description: "Research task",
  run_in_background: true  // Returns immediately with output_file
})

// Resume existing agent
Task({
  subagent_type: "researcher",
  prompt: "Continue with findings",
  resume: "agent-id-123"  // Continue from previous state
})
```

**Background Task Patterns:**
- Long-running research while doing other work
- Parallel independent tasks
- Builds/tests running while coding continues

---

## MCP Server Tools

Document MCP tools as they're added:

```markdown
## [MCP Server Name]

**Connection**: `mcp://server-name`

### tool_name
Description of what the tool does.

**Parameters:**
- `param1` (required): Description
- `param2` (optional): Description

**Example:**
```typescript
mcp_tool_name({ param1: "value" })
```
```

---

## Tool Selection Guide

| Need | Tool | Notes |
|------|------|-------|
| Current information | WebSearch | Include year in query |
| Page content | WebFetch | Try first, escalate if blocked |
| User input needed | AskUserQuestion | Use structured options |
| Long-running task | Task (background) | Non-blocking execution |
| Agent continuation | Task (resume) | Pass agent ID |
