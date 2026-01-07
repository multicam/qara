/**
 * Transcript Utilities
 *
 * Shared functions for reading and parsing Claude Code transcript files.
 * Used by stop-hook.ts, subagent-stop-hook.ts, and other hooks.
 */

import { readFileSync, existsSync } from 'fs';
import { delay } from './stdin-utils';

/**
 * Convert Claude message content (string or array) to plain text
 * Handles both simple string content and complex content arrays
 */
export function contentToText(content: any): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text' && item.text) return item.text;
        if (item?.type === 'tool_result' && item.content) {
          return contentToText(item.content);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (content?.type === 'text' && content.text) {
    return content.text;
  }

  return '';
}

/**
 * Task result with agent type information
 */
export interface TaskResult {
  result: string | null;
  agentType: string | null;
}

/**
 * Completion message extracted from task output
 */
export interface CompletionMessage {
  message: string | null;
  agentType: string | null;
}

/**
 * Find Task result in transcript with retry logic
 * 
 * @param transcriptPath Path to the transcript JSONL file
 * @param maxAttempts Maximum number of retry attempts
 * @returns TaskResult with result text and agent type
 */
export async function findTaskResult(
  transcriptPath: string,
  maxAttempts: number = 10
): Promise<TaskResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(100 * attempt);
    }

    if (!existsSync(transcriptPath)) {
      continue;
    }

    try {
      const transcript = readFileSync(transcriptPath, 'utf-8');
      const lines = transcript.trim().split('\n');

      // Search from the end backwards
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);

          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content) {
              if (content.type === 'tool_use' && content.name === 'Task') {
                // Found Task invocation, look for result
                for (let j = i + 1; j < lines.length; j++) {
                  const resultEntry = JSON.parse(lines[j]);
                  if (resultEntry.type === 'user' && resultEntry.message?.content) {
                    for (const resultContent of resultEntry.message.content) {
                      if (resultContent.type === 'tool_result' && 
                          resultContent.tool_use_id === content.id) {
                        const taskOutput = resultContent.content;
                        
                        let agentType = 'default';
                        const agentMatch = taskOutput.match(/Sub-agent\s+(\w+)\s+completed/i);
                        if (agentMatch) {
                          agentType = agentMatch[1].toLowerCase();
                        }
                        
                        return { result: taskOutput, agentType };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          // Invalid JSON line, skip
        }
      }
    } catch (e) {
      // Error reading file, will retry
    }
  }

  return { result: null, agentType: null };
}

/**
 * Extract completion message from task output
 * 
 * @param taskOutput Raw task output string
 * @returns CompletionMessage with extracted message and agent type
 */
export function extractCompletionMessage(taskOutput: string): CompletionMessage {
  // Check for CUSTOM COMPLETED line
  const customCompletedMatch = taskOutput.match(
    /(?:🗣️\s*)?(?:\*+)?CUSTOM\s+COMPLETED:\s*(?:\*+)?\s*(.+?)(?:\n|$)/im
  );

  if (customCompletedMatch) {
    let customText = customCompletedMatch[1].trim()
      .replace(/\[.*?\]/g, '')
      .replace(/\*+/g, '')
      .trim();

    const wordCount = customText.split(/\s+/).length;
    if (customText && wordCount <= 8) {
      let agentType = extractAgentType(taskOutput);
      return { message: customText, agentType };
    }
  }

  // Check for standard COMPLETED line
  const completedMatch = taskOutput.match(
    /(?:🎯\s*)?(?:\*+)?COMPLETED:\s*(?:\*+)?\s*(.+?)(?:\n|$)/im
  );

  if (completedMatch) {
    let message = completedMatch[1].trim()
      .replace(/\[.*?\]/g, '')
      .replace(/\*+/g, '')
      .trim();

    const wordCount = message.split(/\s+/).length;
    if (message && wordCount <= 12) {
      let agentType = extractAgentType(taskOutput);
      return { message, agentType };
    }
  }

  return { message: null, agentType: extractAgentType(taskOutput) };
}

/**
 * Extract agent type from task output
 */
function extractAgentType(taskOutput: string): string | null {
  const patterns = [
    /\[AGENT:(\w+)\]/i,
    /Sub-agent\s+(\w+)\s+completed/i,
    /(\w+)\s+Agent\s+completed/i,
  ];

  for (const pattern of patterns) {
    const match = taskOutput.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Get last user query from transcript
 * 
 * @param transcriptPath Path to transcript file
 * @returns Last user query or null
 */
export function getLastUserQuery(transcriptPath: string): string | null {
  if (!existsSync(transcriptPath)) {
    return null;
  }

  try {
    const transcript = readFileSync(transcriptPath, 'utf-8');
    const lines = transcript.trim().split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'user' && entry.message?.content) {
          for (const content of entry.message.content) {
            if (content.type === 'text' && content.text) {
              return content.text;
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  } catch (e) {
    // Error reading file
  }

  return null;
}
