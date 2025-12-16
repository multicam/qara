/**
 * Stdin Utilities
 * 
 * Shared functions for reading hook input from stdin.
 * Used by multiple hooks that receive JSON input from Claude Code.
 */

/**
 * Standard hook input interface from Claude Code
 */
export interface HookInput {
  session_id: string;
  prompt?: string;
  transcript_path?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  [key: string]: any;
}

/**
 * Read stdin as text using Bun's native API
 * 
 * @returns Promise resolving to stdin content as string
 */
export async function readStdin(): Promise<string> {
  return await Bun.stdin.text();
}

/**
 * Read and parse JSON from stdin
 * 
 * @returns Promise resolving to parsed HookInput
 * @throws Error if stdin is empty or invalid JSON
 */
export async function readHookInput(): Promise<HookInput> {
  const text = await Bun.stdin.text();
  if (!text.trim()) {
    throw new Error('Empty stdin');
  }
  return JSON.parse(text);
}

/**
 * Read stdin with streaming (for large inputs or timeouts)
 * 
 * @param timeoutMs Maximum time to wait for input (default: 5000ms)
 * @returns Promise resolving to stdin content
 */
export async function readStdinWithTimeout(timeoutMs: number = 5000): Promise<string> {
  const reader = Bun.stdin.stream().getReader();
  const chunks: Uint8Array[] = [];
  const decoder = new TextDecoder();
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Stdin read timeout')), timeoutMs);
  });

  try {
    while (true) {
      const result = await Promise.race([
        reader.read(),
        timeoutPromise
      ]);
      
      if (result.done) break;
      if (result.value) chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.map(chunk => decoder.decode(chunk)).join('');
}

/**
 * Simple delay utility
 * 
 * @param ms Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
