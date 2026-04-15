# Workflow: Create an MCP Server CLI

Scaffold a CLI that exposes tools for Claude to invoke via the Model Context Protocol. Claude calls in; your server handles the request and returns data.

---

## Step 1: Confirm tool list

Write out each tool Claude needs to call. Example:

- `read_note(name: string) → string`
- `search_notes(query: string) → string[]`
- `list_notes() → string[]`

Each becomes one entry in `ListToolsRequestSchema` and one case in `CallToolRequestSchema`.

---

## Step 2: Create project directory

```bash
mkdir -p "${PAI_DIR}/bin/<name>-mcp"
cd "${PAI_DIR}/bin/<name>-mcp"
```

---

## Step 3: Initialize and install MCP SDK

```bash
bun init -y
bun add @modelcontextprotocol/sdk
```

---

## Step 4: Draft `server.ts` from Section B pattern

Copy the minimal example from `references/ai-cli-patterns.md` Section B.

Set:

```typescript
const SERVER_NAME = "<name>-mcp";
const SERVER_VERSION = "1.0.0";
```

---

## Step 5: Declare tools with JSON Schema

For each tool, add to `ListToolsRequestSchema` handler:

```typescript
{
  name: "tool_name",
  description: "One-sentence description Claude will see",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "What this param does" },
    },
    required: ["param1"],
  },
}
```

Keep descriptions precise — Claude uses them to decide when to call the tool.

---

## Step 6: Implement request handlers

In `CallToolRequestSchema` handler, add a case per tool:

```typescript
switch (request.params.name) {
  case "read_note": {
    const { name } = request.params.arguments as { name: string };
    const content = await readNote(name); // your logic
    return { content: [{ type: "text", text: content }] };
  }
  default:
    throw new Error(`Unknown tool: ${request.params.name}`);
}
```

Return `{ isError: true, content: [...] }` for expected business errors (not thrown errors).

---

## Step 7: Add graceful shutdown

Per `patterns.md` Pattern 8:

```typescript
process.on("SIGINT", async () => { await server.close(); process.exit(0); });
process.on("SIGTERM", async () => { await server.close(); process.exit(0); });
```

---

## Step 8: Generate `.mcp.json` snippet

Create `README.md` with an "Installation" section:

```markdown
## Installation in Claude Code

Add to your `.mcp.json` at the project root (CC's canonical project-scope location; `.claude/mcp.json` is NOT read by CC):

\`\`\`json
{
  "mcpServers": {
    "<name>-mcp": {
      "command": "bun",
      "args": ["${PAI_DIR}/bin/<name>-mcp/server.ts"]
    }
  }
}
\`\`\`

Restart Claude Code after adding the entry.
```

---

## Step 9: Generate README

README must include:

- What tools this MCP server exposes
- Installation snippet from Step 8
- Example Claude prompts that trigger each tool
- Required env vars / config (paths from `${PAI_DIR}/.env` per Pattern 1)

---

## Step 10: Verify

```bash
# Server starts without error and exits cleanly on Ctrl-C
bun run server.ts &
sleep 1 && kill %1  # SIGTERM — expect clean shutdown

# MCP handshake (requires Claude Code with MCP debug mode)
claude --mcp-debug
# Claude should list your server's tools in the tool panel
```

If the server hangs on SIGTERM, check that `server.close()` resolves; add a timeout fallback:

```typescript
setTimeout(() => process.exit(0), 3000);
```
