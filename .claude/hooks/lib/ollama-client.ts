/**
 * ollama-client — Shared TypeScript client for Ollama local LLM inference.
 *
 * Provides typed interfaces for chat, generate, and embed operations.
 * Used by introspection tools, code scanners, and MCP integrations.
 * Fails gracefully when Ollama is not running.
 *
 * Known issue — embed():
 *   /api/embed can return HTTP 500 "model failed to load" even when the
 *   endpoint is reachable and VRAM is available. Root cause is typically
 *   a corrupted nomic-embed-text blob or a stale Ollama server state,
 *   not our code. Recovery (run outside Claude Code):
 *     ollama rm nomic-embed-text && ollama pull nomic-embed-text
 *     # or: systemctl restart ollama
 *   No production code currently depends on embed() — tests mock fetch
 *   so CI stays green regardless of the local Ollama's embed health.
 */

const DEFAULT_ENDPOINT = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma4:latest';
const DEFAULT_TIMEOUT_MS = 30_000;

interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    images?: string[]; // base64-encoded for vision
}

interface OllamaChatOptions {
    model?: string;
    messages: OllamaMessage[];
    endpoint?: string;
    timeout?: number;
    temperature?: number;
    stream?: false;
}

interface OllamaChatResponse {
    message: { role: string; content: string };
    total_duration?: number;
    eval_count?: number;
}

interface OllamaEmbedOptions {
    model?: string;
    input: string;
    endpoint?: string;
    timeout?: number;
}

interface OllamaEmbedResponse {
    embeddings: number[][];
}

async function isAvailable(endpoint: string = DEFAULT_ENDPOINT): Promise<boolean> {
    try {
        const res = await fetch(`${endpoint}/api/tags`, {
            signal: AbortSignal.timeout(2000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function chat(options: OllamaChatOptions): Promise<string> {
    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const res = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: options.model || DEFAULT_MODEL,
            messages: options.messages,
            stream: false,
            options: {
                ...(options.temperature !== undefined && { temperature: options.temperature }),
            },
        }),
        signal: AbortSignal.timeout(options.timeout || DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Ollama chat failed: ${res.status}`);
    const data = (await res.json()) as OllamaChatResponse;
    return data.message.content;
}

async function embed(options: OllamaEmbedOptions): Promise<number[]> {
    const endpoint = options.endpoint || DEFAULT_ENDPOINT;
    const res = await fetch(`${endpoint}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: options.model || 'nomic-embed-text',
            input: options.input,
        }),
        signal: AbortSignal.timeout(options.timeout || DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Ollama embed failed: ${res.status}`);
    const data = (await res.json()) as OllamaEmbedResponse;
    return data.embeddings[0];
}

export {
    isAvailable,
    chat,
    embed,
    DEFAULT_ENDPOINT,
    DEFAULT_MODEL,
    type OllamaMessage,
    type OllamaChatOptions,
    type OllamaChatResponse,
    type OllamaEmbedOptions,
};
