/**
 * Event summarizer using LLM
 * Migrated from Python: utils/summarizer.py
 *
 * Factor 9 Compliance: Compact Errors
 * Pure functions extracted for testability.
 */

import { promptLLM } from './llm/anthropic';

interface EventData {
  hook_event_type?: string;
  payload?: Record<string, unknown>;
}

/**
 * Pure function: Clean LLM response into a proper summary.
 * Removes quotes, trailing periods, takes first line, limits length.
 */
export function cleanSummaryResponse(summary: string): string {
  return summary
    .trim()
    .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
    .replace(/\.$/, '')            // Remove trailing period
    .split('\n')[0]                // Take only first line
    .slice(0, 100);                // Limit length
}

/**
 * Pure function: Truncate payload to max length for LLM prompt.
 */
export function truncatePayload(
  payload: Record<string, unknown>,
  maxLength = 1000
): string {
  const str = JSON.stringify(payload, null, 2);
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

/**
 * Pure function: Build the summary prompt for the LLM.
 */
export function buildSummaryPrompt(eventType: string, payloadStr: string): string {
  return `Generate a one-sentence summary of this Claude Code hook event payload for an engineer monitoring the system.

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
}

/**
 * Generate a concise one-sentence summary of a hook event for engineers.
 * Uses extracted pure functions for testability (Factor 9).
 */
export async function generateEventSummary(
  eventData: EventData
): Promise<string | null> {
  const eventType = eventData.hook_event_type || 'Unknown';
  const payloadStr = truncatePayload(eventData.payload || {});
  const prompt = buildSummaryPrompt(eventType, payloadStr);

  const summary = await promptLLM(prompt);
  return summary ? cleanSummaryResponse(summary) : null;
}
