/**
 * OpenAI LLM utility for hooks
 * Migrated from Python: utils/llm/oai.py
 *
 * Note: Gracefully handles missing openai package.
 */

// Dynamic import to handle missing SDK gracefully
let OpenAI: any = null;
let sdkAvailable = false;

try {
  OpenAI = require('openai').default;
  sdkAvailable = true;
} catch {
  // SDK not installed - functions will return null
}

let client: any = null;

function getClient(): any {
  if (!sdkAvailable) {
    throw new Error('OpenAI SDK not installed. Run: bun add openai');
  }
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

/**
 * Check if the OpenAI SDK is available.
 */
export function isConfigured(): boolean {
  return sdkAvailable && !!process.env.OPENAI_API_KEY;
}

/**
 * Send a prompt to OpenAI and get a response.
 */
export async function promptLLM(
  prompt: string,
  model: string = 'gpt-4o-mini',
  maxTokens: number = 150
): Promise<string | null> {
  if (!sdkAvailable) {
    console.error('OpenAI SDK not installed');
    return null;
  }
  try {
    const response = await getClient().chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenAI prompt failed:', error);
    return null;
  }
}

/**
 * Send a prompt with streaming response.
 */
export async function promptLLMStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  model: string = 'gpt-4o-mini',
  maxTokens: number = 150
): Promise<string | null> {
  if (!sdkAvailable) {
    console.error('OpenAI SDK not installed');
    return null;
  }
  try {
    const stream = await getClient().chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullText += content;
        onChunk(content);
      }
    }
    return fullText;
  } catch (error) {
    console.error('OpenAI stream failed:', error);
    return null;
  }
}
