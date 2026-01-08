/**
 * Event summarizer using LLM
 * Migrated from Python: utils/summarizer.py
 */

import { promptLLM } from './llm/anthropic';

interface EventData {
  hook_event_type?: string;
  payload?: Record<string, unknown>;
}

/**
 * Generate a concise one-sentence summary of a hook event for engineers.
 */
export async function generateEventSummary(
  eventData: EventData
): Promise<string | null> {
  const eventType = eventData.hook_event_type || 'Unknown';
  let payloadStr = JSON.stringify(eventData.payload || {}, null, 2);

  // Truncate if too long
  if (payloadStr.length > 1000) {
    payloadStr = payloadStr.slice(0, 1000) + '...';
  }

  const prompt = `Generate a one-sentence summary of this Claude Code hook event payload for an engineer monitoring the system.

Event Type: ${eventType}
Payload:
${payloadStr}

Requirements:
- ONE sentence only (no period at the end)
- Focus on the key action or information in the payload
- Be specific and technical
- Keep under 15 words
- Use present tense
- No quotes or formatting
- Return ONLY the summary text

Examples:
- Reads configuration file from project root
- Executes npm install to update dependencies
- Searches web for React documentation
- Edits database schema to add user table
- Agent responds with implementation plan

Generate the summary based on the payload:`;

  const summary = await promptLLM(prompt);
  if (!summary) return null;

  // Clean up the response
  return summary
    .trim()
    .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
    .replace(/\.$/, '')            // Remove trailing period
    .split('\n')[0]                // Take only first line
    .slice(0, 100);                // Limit length
}
