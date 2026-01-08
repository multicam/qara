/**
 * Anthropic LLM utility for hooks
 * Migrated from Python: utils/llm/anth.py
 */

import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Send a prompt to Claude and get a response.
 */
export async function promptLLM(
  prompt: string,
  model: string = 'claude-3-haiku-20240307',
  maxTokens: number = 150
): Promise<string | null> {
  try {
    const response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return null;
  } catch (error) {
    console.error('LLM prompt failed:', error);
    return null;
  }
}

/**
 * Send a prompt with streaming response.
 */
export async function promptLLMStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  model: string = 'claude-3-haiku-20240307',
  maxTokens: number = 150
): Promise<string | null> {
  try {
    const stream = await getClient().messages.stream({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullText += chunk;
        onChunk(chunk);
      }
    }
    return fullText;
  } catch (error) {
    console.error('LLM stream failed:', error);
    return null;
  }
}
