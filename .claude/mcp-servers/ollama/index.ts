#!/usr/bin/env bun
/**
 * MCP Server for Ollama Local LLM Integration
 *
 * Exposes local Ollama models as tools for Claude Code.
 * Enables hybrid workflows: Claude orchestrates, local models assist.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "deepseek-r1:latest";

// Tool definitions
const tools: Tool[] = [
  {
    name: "ollama_chat",
    description: `Chat with a local Ollama model. Use for quick questions, second opinions, or offloading simple tasks. Default model: ${DEFAULT_MODEL}`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The message to send to the model",
        },
        model: {
          type: "string",
          description: `Model to use (default: ${DEFAULT_MODEL}). Available: deepseek-r1, qwen3-vl, gemma2:2b`,
        },
        system: {
          type: "string",
          description: "Optional system prompt to set context",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "ollama_analyze_code",
    description: "Analyze code using a local model. Provide code directly or specify a file path. Good for security review, complexity analysis, or understanding unfamiliar code.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Code to analyze (provide this OR file_path)",
        },
        file_path: {
          type: "string",
          description: "Path to file to analyze (provide this OR code)",
        },
        focus: {
          type: "string",
          description: "What to focus on: security, performance, readability, bugs, all",
          enum: ["security", "performance", "readability", "bugs", "all"],
        },
        model: {
          type: "string",
          description: "Model to use (default: deepseek-r1)",
        },
      },
      required: [],
    },
  },
  {
    name: "ollama_review_diff",
    description: "Review a code diff or changes using a local model. Useful for PR review assistance.",
    inputSchema: {
      type: "object",
      properties: {
        diff: {
          type: "string",
          description: "The diff content to review",
        },
        context: {
          type: "string",
          description: "Additional context about the changes",
        },
        model: {
          type: "string",
          description: "Model to use (default: deepseek-r1)",
        },
      },
      required: ["diff"],
    },
  },
  {
    name: "ollama_explain",
    description: "Get a clear explanation of code, concepts, or errors from a local model.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Code, error message, or concept to explain",
        },
        audience: {
          type: "string",
          description: "Target audience level",
          enum: ["beginner", "intermediate", "expert"],
        },
        model: {
          type: "string",
          description: "Model to use (default: deepseek-r1)",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "ollama_generate",
    description: "Generate code, tests, or documentation using a local model.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "What to generate (e.g., 'unit tests for auth module', 'TypeScript interface from JSON')",
        },
        context: {
          type: "string",
          description: "Relevant code or context to inform generation",
        },
        language: {
          type: "string",
          description: "Target programming language",
        },
        model: {
          type: "string",
          description: "Model to use (default: deepseek-r1)",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "ollama_models",
    description: "List available Ollama models on this machine.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Ollama API helpers
interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

interface OllamaModel {
  name: string;
  size: number;
  details: {
    parameter_size?: string;
    quantization_level?: string;
  };
}

async function ollamaChat(
  model: string,
  messages: OllamaMessage[],
  options: { temperature?: number; num_ctx?: number } = {}
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_ctx: options.num_ctx ?? 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  return data.message.content;
}

async function listModels(): Promise<OllamaModel[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.status}`);
  }
  const data = (await response.json()) as { models: OllamaModel[] };
  return data.models;
}

async function readFile(path: string): Promise<string> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${path}`);
  }
  return await file.text();
}

// Tool handlers
async function handleOllamaChat(args: {
  prompt: string;
  model?: string;
  system?: string;
}): Promise<string> {
  const model = args.model || DEFAULT_MODEL;
  const messages: OllamaMessage[] = [];

  if (args.system) {
    messages.push({ role: "system", content: args.system });
  }
  messages.push({ role: "user", content: args.prompt });

  return await ollamaChat(model, messages);
}

async function handleAnalyzeCode(args: {
  code?: string;
  file_path?: string;
  focus?: string;
  model?: string;
}): Promise<string> {
  let code = args.code;

  if (!code && args.file_path) {
    code = await readFile(args.file_path);
  }

  if (!code) {
    return "Error: Please provide either 'code' or 'file_path'";
  }

  const focus = args.focus || "all";
  const model = args.model || DEFAULT_MODEL;

  const focusPrompts: Record<string, string> = {
    security: "Focus on security vulnerabilities, injection risks, authentication issues, and data exposure.",
    performance: "Focus on performance bottlenecks, memory leaks, inefficient algorithms, and optimization opportunities.",
    readability: "Focus on code clarity, naming conventions, structure, and maintainability.",
    bugs: "Focus on potential bugs, edge cases, null/undefined handling, and logic errors.",
    all: "Analyze for security, performance, readability, and potential bugs.",
  };

  const systemPrompt = `You are an expert code analyst. ${focusPrompts[focus]}
Be concise and actionable. Format findings as:
- [SEVERITY] Issue: description
- Location: where in the code
- Fix: how to address it`;

  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Analyze this code:\n\n\`\`\`\n${code}\n\`\`\`` },
  ];

  return await ollamaChat(model, messages);
}

async function handleReviewDiff(args: {
  diff: string;
  context?: string;
  model?: string;
}): Promise<string> {
  const model = args.model || DEFAULT_MODEL;

  const systemPrompt = `You are an expert code reviewer. Review the diff and provide:
1. Summary of changes
2. Potential issues or bugs
3. Suggestions for improvement
4. Security considerations if relevant
Be concise and constructive.`;

  let userPrompt = `Review this diff:\n\n\`\`\`diff\n${args.diff}\n\`\`\``;
  if (args.context) {
    userPrompt += `\n\nContext: ${args.context}`;
  }

  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await ollamaChat(model, messages);
}

async function handleExplain(args: {
  content: string;
  audience?: string;
  model?: string;
}): Promise<string> {
  const model = args.model || DEFAULT_MODEL;
  const audience = args.audience || "intermediate";

  const audiencePrompts: Record<string, string> = {
    beginner: "Explain as if to someone new to programming. Use simple terms and analogies.",
    intermediate: "Explain clearly with technical accuracy. Assume familiarity with basic concepts.",
    expert: "Be concise and technical. Focus on nuances and advanced implications.",
  };

  const systemPrompt = `You are a patient and clear technical educator. ${audiencePrompts[audience]}`;

  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Explain this:\n\n${args.content}` },
  ];

  return await ollamaChat(model, messages);
}

async function handleGenerate(args: {
  task: string;
  context?: string;
  language?: string;
  model?: string;
}): Promise<string> {
  const model = args.model || DEFAULT_MODEL;

  let systemPrompt = "You are an expert programmer. Generate clean, well-documented code.";
  if (args.language) {
    systemPrompt += ` Use ${args.language}.`;
  }
  systemPrompt += " Only output the code, no explanations unless specifically asked.";

  let userPrompt = args.task;
  if (args.context) {
    userPrompt += `\n\nContext:\n${args.context}`;
  }

  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return await ollamaChat(model, messages);
}

async function handleListModels(): Promise<string> {
  const models = await listModels();

  if (models.length === 0) {
    return "No models found. Run 'ollama pull <model>' to download one.";
  }

  const formatted = models.map((m) => {
    const size = (m.size / 1e9).toFixed(1);
    const params = m.details.parameter_size || "unknown";
    const quant = m.details.quantization_level || "";
    return `- ${m.name} (${size}GB, ${params}${quant ? ", " + quant : ""})`;
  });

  return `Available Ollama models:\n${formatted.join("\n")}`;
}

// Main server setup
const server = new Server(
  {
    name: "ollama",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "ollama_chat":
        result = await handleOllamaChat(args as Parameters<typeof handleOllamaChat>[0]);
        break;
      case "ollama_analyze_code":
        result = await handleAnalyzeCode(args as Parameters<typeof handleAnalyzeCode>[0]);
        break;
      case "ollama_review_diff":
        result = await handleReviewDiff(args as Parameters<typeof handleReviewDiff>[0]);
        break;
      case "ollama_explain":
        result = await handleExplain(args as Parameters<typeof handleExplain>[0]);
        break;
      case "ollama_generate":
        result = await handleGenerate(args as Parameters<typeof handleGenerate>[0]);
        break;
      case "ollama_models":
        result = await handleListModels();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ollama MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
