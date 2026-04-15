# AI CLI Patterns

Patterns for CLIs that integrate with Claude or expose tools to Claude.

## Table of Contents

- [Section A — Claude-wrapping CLI](#section-a--claude-wrapping-cli)
- [Section B — MCP server exposure](#section-b--mcp-server-exposure)
- [Section C — Plugin-bundled distribution](#section-c--plugin-bundled-distribution)

---

## Section A — Claude-wrapping CLI

**When to use:** your CLI orchestrates Claude to do work — code reviewer, file summarizer, test writer, PR describer.

**Install:**

```bash
bun add @anthropic-ai/claude-agent-sdk
```

**Minimal example (complete, runnable):**

```typescript
#!/usr/bin/env bun
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const prompt = process.argv[2] ?? "Summarize this file";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ["Read", "Grep"],
      permissionMode: "default",
    },
  })) {
    if (message.type === "text") process.stdout.write(message.text);
  }
}

const isDirectRun = import.meta.path === Bun.main;
if (isDirectRun) main().catch((err) => { console.error(err); process.exit(1); });
```

**Notes:**

- Prompt caching is built into the SDK — repeated calls on same context are cached automatically.
- Pass `resume: "session-id"` in options for session continuity across invocations.
- Cost: every `query()` call hits the Anthropic API. For tight loops or batch operations, use Gemma 4 local instead (see below).
- Model defaults to `claude-sonnet-4-6`; override with `options.model`.

**Gemma 4 local fallback** — for cost-sensitive loops, import from the shared lib:

```typescript
import { chat } from "${PAI_DIR}/hooks/lib/ollama-client.ts";

// route to Gemma when --local flag is set
if (args.includes("--local")) {
  const reply = await chat("gemma4:latest", prompt);
  process.stdout.write(reply);
} else {
  // Claude path above
}
```

---

## Section B — MCP server exposure

**When to use:** your CLI wraps a data source (vault, database, REST API) and you want Claude to call it as a tool. Claude invokes the server; the server is not interactive.

**Install:**

```bash
bun add @modelcontextprotocol/sdk
```

**Minimal example — stdio transport:**

```typescript
#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "my-tool", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read_note",
      description: "Read a note by name",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", description: "Note name" } },
        required: ["name"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "read_note") {
    const { name } = request.params.arguments as { name: string };
    return { content: [{ type: "text", text: `Contents of ${name}` }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Graceful shutdown (see patterns.md Pattern 8)
process.on("SIGINT", async () => { await server.close(); process.exit(0); });
process.on("SIGTERM", async () => { await server.close(); process.exit(0); });

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Wire into Claude Code via `.mcp.json`:**

```json
{
  "mcpServers": {
    "my-tool": {
      "command": "bun",
      "args": ["/path/to/my-cli/server.ts"]
    }
  }
}
```

---

## Section C — Plugin-bundled distribution

**When to use:** you want the CLI shipped alongside skills or hooks as a Claude Code plugin, so end users install one unit and get both the skill and the binary.

**Minimum `plugin.json` manifest** (at `.claude-plugin/plugin.json`):

```json
{
  "name": "my-plugin",
  "description": "One-line description of what this plugin does",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

**`bin/` directory convention:** executables placed in `bin/` are added to the Bash tool's `PATH` when the plugin is enabled. Name them without extension or with a `.sh`/`.ts` extension if using a shebang.

**Local test:**

```bash
claude --plugin-dir ./my-plugin
```

**Canonical source:** https://code.claude.com/docs/en/plugins

**Qara note:** PAI skills are not distributed as plugins (they live in-repo). Use this pattern only when packaging a skill for distribution to other Claude Code users outside this repo.
