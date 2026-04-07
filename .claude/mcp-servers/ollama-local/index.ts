#!/usr/bin/env bun
/**
 * ollama-local MCP server — Exposes local Ollama models to Claude Code.
 *
 * Tools:
 *   ollama_chat       — General chat with configurable model
 *   ollama_summarize  — Summarize text using local model
 *   ollama_classify   — Classify text into categories
 *   ollama_review     — Quick code review of a diff or snippet
 *
 * Transport: stdio (Claude Code manages lifecycle)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma4';

function textResult(text: string) {
    return { content: [{ type: 'text' as const, text }] };
}

async function ollamaChat(
    model: string,
    messages: Array<{ role: string; content: string }>,
    temperature: number = 0.3,
): Promise<string> {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, options: { temperature } }),
        signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json() as { message: { content: string } };
    return data.message.content;
}

const server = new McpServer({
    name: 'ollama-local',
    version: '1.0.0',
});

server.tool(
    'ollama_chat',
    'Chat with a local Ollama model. Use for quick questions, analysis, or generation that does not require cloud-level reasoning.',
    {
        prompt: z.string().describe('The user message to send'),
        system: z.string().optional().describe('Optional system prompt'),
        model: z.string().optional().describe('Ollama model name (default: gemma4)'),
    },
    async ({ prompt, system, model }) => {
        const messages: Array<{ role: string; content: string }> = [];
        if (system) messages.push({ role: 'system', content: system });
        messages.push({ role: 'user', content: prompt });
        const result = await ollamaChat(model || DEFAULT_MODEL, messages);
        return textResult(result);
    },
);

server.tool(
    'ollama_summarize',
    'Summarize text using a local model. Useful for condensing large file contents, logs, or documentation before deciding whether to read in full.',
    {
        text: z.string().describe('Text to summarize'),
        max_bullets: z.number().optional().describe('Maximum bullet points (default: 5)'),
        model: z.string().optional().describe('Ollama model name (default: gemma4)'),
    },
    async ({ text, max_bullets, model }) => {
        const n = max_bullets || 5;
        const result = await ollamaChat(model || DEFAULT_MODEL, [
            { role: 'system', content: `Summarize the following text in at most ${n} concise bullet points. No preamble.` },
            { role: 'user', content: text.slice(0, 8000) },
        ], 0.2);
        return textResult(result);
    },
);

server.tool(
    'ollama_classify',
    'Classify text into one of the provided categories using a local model. Fast, zero-cost classification.',
    {
        text: z.string().describe('Text to classify'),
        categories: z.array(z.string()).describe('List of category labels'),
        model: z.string().optional().describe('Ollama model name (default: gemma4)'),
    },
    async ({ text, categories, model }) => {
        const result = await ollamaChat(model || DEFAULT_MODEL, [
            { role: 'system', content: `Classify the following text into exactly one of these categories: ${categories.join(', ')}. Reply with just the category name, nothing else.` },
            { role: 'user', content: text.slice(0, 4000) },
        ], 0.1);
        return textResult(result.trim());
    },
);

server.tool(
    'ollama_review',
    'Quick code review of a diff or snippet using a local model. Flags obvious bugs, security issues, unused variables. Max 5 bullets.',
    {
        code: z.string().describe('Code diff or snippet to review'),
        context: z.string().optional().describe('Optional context about the code'),
        model: z.string().optional().describe('Ollama model name (default: gemma4)'),
    },
    async ({ code, context, model }) => {
        const messages: Array<{ role: string; content: string }> = [
            { role: 'system', content: 'You are a code reviewer. Flag obvious bugs, security issues, unused variables, missing error handling. Max 5 bullets. If clean, say "No issues found." No preamble.' },
        ];
        if (context) messages.push({ role: 'user', content: `Context: ${context}` });
        messages.push({ role: 'user', content: code.slice(0, 6000) });
        const result = await ollamaChat(model || DEFAULT_MODEL, messages, 0.2);
        return textResult(result);
    },
);

server.tool(
    'ollama_analyze_image',
    'Analyze an image file using local Gemma 4 vision. Use for screenshot analysis, visual regression checks, or describing image contents without cloud API costs.',
    {
        image_path: z.string().describe('Absolute path to the image file (PNG/JPEG/WebP)'),
        prompt: z.string().optional().describe('Custom analysis prompt (default: webpage screenshot analysis)'),
        model: z.string().optional().describe('Ollama model name (default: gemma4)'),
    },
    async ({ image_path, prompt, model }) => {
        const { readFileSync, existsSync } = await import('fs');
        if (!existsSync(image_path)) {
            return textResult(`Error: file not found: ${image_path}`);
        }
        const b64 = readFileSync(image_path).toString('base64');
        const analysisPrompt = prompt || 'Analyze this webpage screenshot. Flag: layout breaks, overlapping elements, text readability issues, broken images, dark mode contrast problems. If everything looks fine, say "No visual issues." Max 5 bullets. No preamble.';
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || DEFAULT_MODEL,
                messages: [{ role: 'user', content: analysisPrompt, images: [b64] }],
                stream: false,
                options: { temperature: 0.2 },
            }),
            signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) throw new Error(`Ollama vision error: ${res.status}`);
        const data = await res.json() as { message: { content: string } };
        return textResult(data.message.content);
    },
);

const transport = new StdioServerTransport();
await server.connect(transport);