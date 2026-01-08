/**
 * OpenAI LLM utility for hooks
 * Migrated from Python: utils/llm/oai.py
 */

import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

/**
 * Send a prompt to OpenAI and get a response.
 */
export async function promptLLM(
  prompt: string,
  model: string = 'gpt-4o-mini',
  maxTokens: number = 150
): Promise<string | null> {
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
