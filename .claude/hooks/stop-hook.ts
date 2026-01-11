#!/usr/bin/env bun

/**
 * stop-hook.ts
 *
 * Main Stop event hook - triggered when Qara completes a response.
 * Extracts COMPLETED lines, sets tab titles, and handles agent task results.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { generateTabTitle, setTerminalTabTitle, setTabTitleSync } from './lib/tab-titles';
import { readStdinWithTimeout } from './lib/stdin-utils';
import { contentToText } from './lib/transcript-utils';
import { trackErrorAndSuggestRecovery, logCheckpointEvent } from './lib/checkpoint-utils';

// Error compaction types and utilities (12-Factor #9)
interface ErrorSummary {
  totalErrors: number;
  uniqueTypes: string[];
  errors: Array<{
    type: string;
    message: string;
    count: number;
    firstOccurrence: string;
  }>;
  sessionId?: string;
  timestamp: string;
}

function extractAndCompactErrors(transcript: string): ErrorSummary | null {
  const lines = transcript.trim().split('\n');
  const errorMap = new Map<string, { type: string; message: string; count: number; firstOccurrence: string }>();

  const errorPatterns = [
    /Error:\s*(.+)/i,
    /TypeError:\s*(.+)/i,
    /ReferenceError:\s*(.+)/i,
    /SyntaxError:\s*(.+)/i,
    /Failed:\s*(.+)/i,
    /❌\s*(.+)/,
    /error\[E\d+\]:\s*(.+)/i,  // Rust-style errors
    /Exception:\s*(.+)/i,
    /ENOENT:\s*(.+)/i,
    /EACCES:\s*(.+)/i,
  ];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const content = contentToText(entry.message?.content || '');

      for (const pattern of errorPatterns) {
        const matches = content.matchAll(new RegExp(pattern, 'gi'));
        for (const match of matches) {
          const errorMessage = match[1]?.trim() || match[0];
          const errorType = pattern.source.split(':')[0].replace(/[\\[\]]/g, '');
          const key = `${errorType}:${errorMessage.slice(0, 100)}`;

          if (errorMap.has(key)) {
            const existing = errorMap.get(key)!;
            existing.count++;
          } else {
            errorMap.set(key, {
              type: errorType,
              message: errorMessage.slice(0, 200),
              count: 1,
              firstOccurrence: entry.timestamp || new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  }

  if (errorMap.size === 0) return null;

  const errors = Array.from(errorMap.values()).sort((a, b) => b.count - a.count);
  const uniqueTypes = [...new Set(errors.map(e => e.type))];

  return {
    totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
    uniqueTypes,
    errors: errors.slice(0, 10), // Top 10 errors
    timestamp: new Date().toISOString()
  };
}

function saveErrorSummary(summary: ErrorSummary, sessionId: string): void {
  const paiDir = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
  const errorDir = `${paiDir}/state/errors`;

  if (!existsSync(errorDir)) {
    mkdirSync(errorDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `${errorDir}/${date}_errors.jsonl`;

  summary.sessionId = sessionId;
  writeFileSync(filename, JSON.stringify(summary) + '\n', { flag: 'a' });
}


// Intelligent response generator - prioritizes custom COMPLETED messages
function generateIntelligentResponse(userQuery: string, assistantResponse: string, completedLine: string): string {
  // Clean the completed line
  const cleanCompleted = completedLine
    .replace(/\*+/g, '')
    .replace(/\[AGENT:\w+\]\s*/i, '')
    .trim();

  // If the completed line has meaningful custom content (not generic), use it
  const genericPhrases = [
    'completed successfully',
    'task completed',
    'done successfully',
    'finished successfully',
    'completed the task',
    'completed your request'
  ];

  const isGenericCompleted = genericPhrases.some(phrase =>
    cleanCompleted.toLowerCase() === phrase ||
    cleanCompleted.toLowerCase() === `${phrase}.`
  );

  // If we have a custom, non-generic completed message, prefer it
  if (!isGenericCompleted && cleanCompleted.length > 10) {
    return cleanCompleted;
  }

  // Extract key information from the full response
  const responseLC = assistantResponse.toLowerCase();
  const queryLC = userQuery.toLowerCase();

  // Only apply shortcuts for very specific simple cases

  // Simple thanks acknowledgment - high priority
  if (queryLC.match(/^(thank|thanks|awesome|great|good job|well done)[\s!?.]*$/i)) {
    return "You're welcome!";
  }

  // Simple math calculations - ONLY if it's just a calculation
  if (queryLC.match(/^\s*\d+\s*[\+\-\*\/]\s*\d+\s*\??$/)) {
    const resultMatch = assistantResponse.match(/=\s*(-?\d+(?:\.\d+)?)|(?:equals?|is)\s+(-?\d+(?:\.\d+)?)/i);
    if (resultMatch) {
      return resultMatch[1] || resultMatch[2];
    }
  }

  // Very simple yes/no - ONLY if the query is extremely simple
  if (queryLC.match(/^(is|are|was|were)\s+\w+\s+\w+\??$/i)) {
    if (cleanCompleted.toLowerCase() === 'yes' || cleanCompleted.toLowerCase() === 'no') {
      return cleanCompleted;
    }
  }

  // Simple time query - ONLY if asking for just the time
  if (queryLC.match(/^what\s+time\s+is\s+it\??$/i)) {
    const timeMatch = assistantResponse.match(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/i);
    if (timeMatch) {
      return timeMatch[0];
    }
  }

  // For all other cases, use the actual completed message
  // This ensures custom messages are preserved
  return cleanCompleted;
}

async function main() {
  // Log that hook was triggered
  const timestamp = new Date().toISOString();
  console.error(`\n🎬 STOP-HOOK TRIGGERED AT ${timestamp}`);

  // Read input from stdin using shared utility
  let transcriptPath: string;
  try {
    const input = await readStdinWithTimeout(500);
    if (!input) {
      console.error('❌ No input received');
      process.exit(0);
    }

    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;
    console.error(`📁 Transcript path: ${transcriptPath}`);

    if (!transcriptPath) {
      console.error('❌ No transcript_path in input');
      process.exit(0);
    }
  } catch (e) {
    console.error(`❌ Error reading/parsing input: ${e}`);
    process.exit(0);
  }

  // Read the transcript
  let transcript;
  try {
    transcript = readFileSync(transcriptPath, 'utf-8');
    console.error(`📜 Transcript loaded: ${transcript.split('\n').length} lines`);
  } catch (e) {
    console.error(`❌ Error reading transcript: ${e}`);
    process.exit(0);
  }

  // Parse the JSON lines to find what happened in this session
  const lines = transcript.trim().split('\n');

  // Get the last user query for context
  let lastUserQuery = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === 'user' && entry.message?.content) {
        // Extract text from user message
        const content = entry.message.content;
        if (typeof content === 'string') {
          lastUserQuery = content;
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text' && item.text) {
              lastUserQuery = item.text;
              break;
            }
          }
        }
        if (lastUserQuery) break;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // First, check if the LAST assistant message contains a Task tool or a COMPLETED line
  let isAgentTask = false;
  let taskResult = '';
  let agentType = '';

  // Find the last assistant message
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);

      if (entry.type === 'assistant' && entry.message?.content) {
        // Check if this assistant message contains a Task tool_use
        let foundTask = false;
        const contentArray = Array.isArray(entry.message.content) ? entry.message.content : [entry.message.content];
        for (const content of contentArray) {
          if (content?.type === 'tool_use' && content.name === 'Task') {
            // This is an agent task - find its result
            foundTask = true;
            agentType = content.input?.subagent_type || '';

            // Find the corresponding tool_result
            for (let j = i + 1; j < lines.length; j++) {
              const resultEntry = JSON.parse(lines[j]);
              if (resultEntry.type === 'user' && resultEntry.message?.content) {
                const resultContentArray = Array.isArray(resultEntry.message.content)
                  ? resultEntry.message.content
                  : [resultEntry.message.content];
                for (const resultContent of resultContentArray) {
                  if (resultContent?.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                    taskResult = contentToText(resultContent.content);
                    isAgentTask = true;
                    break;
                  }
                }
              }
              if (taskResult) break;
            }
            break;
          }
        }

        // We found the last assistant message, stop looking
        break;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // Generate the announcement
  let message = '';
  let qaraHasCustomCompleted = false;

  // ALWAYS check Qara's response FIRST (even when agents are used)
  const lastResponse = lines[lines.length - 1];
  try {
    const entry = JSON.parse(lastResponse);
    if (entry.type === 'assistant' && entry.message?.content) {
      const content = contentToText(entry.message.content);

      // First, look for CUSTOM COMPLETED line (voice-optimized)
      const customCompletedMatch = content.match(/🗣️\s*CUSTOM\s+COMPLETED:\s*(.+?)(?:\n|$)/im);

      if (customCompletedMatch) {
        // Get the custom voice response
        let customText = customCompletedMatch[1].trim()
          .replace(/\[.*?\]/g, '') // Remove bracketed text like [Optional: ...]
          .replace(/\*+/g, '') // Remove asterisks
          .trim();

        // Use custom completed if it's under 8 words
        const wordCount = customText.split(/\s+/).length;
        if (customText && wordCount <= 8) {
          message = customText;
          qaraHasCustomCompleted = true;
          console.error(`🗣️ QARA CUSTOM VOICE: ${message}`);
        } else {
          // Custom completed too long, fall back to regular COMPLETED
          const completedMatch = content.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);
          if (completedMatch) {
            let completedText = completedMatch[1].trim();
            message = generateIntelligentResponse(lastUserQuery, content, completedText);
            console.error(`🎯 QARA FALLBACK (custom too long): ${message}`);
          }
        }
      } else if (!isAgentTask) {
        // No CUSTOM COMPLETED and no agent - look for regular COMPLETED line
        const completedMatch = content.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);

        if (completedMatch) {
          // Get the raw text after the colon
          let completedText = completedMatch[1].trim();

          // Generate intelligent response
          message = generateIntelligentResponse(lastUserQuery, content, completedText);

          console.error(`🎯 QARA INTELLIGENT: ${message}`);
        } else {
          // No COMPLETED line found - don't send anything
          console.error('⚠️ No COMPLETED line found');
        }
      }
    }
  } catch (e) {
    console.error('⚠️ Error parsing Qara response:', e);
  }

  // If Qara didn't provide a CUSTOM COMPLETED and an agent was used, check agent's response
  if (!message && isAgentTask && taskResult) {
    // First, try to find CUSTOM COMPLETED line in agent response
    const customCompletedMatch = taskResult.match(/🗣️\s*CUSTOM\s+COMPLETED:\s*(.+?)(?:\n|$)/im);

    if (customCompletedMatch) {
      // Get the custom voice response
      let customText = customCompletedMatch[1].trim()
        .replace(/\[.*?\]/g, '') // Remove bracketed text
        .replace(/\*+/g, '') // Remove asterisks
        .replace(/\[AGENT:\w+\]\s*/i, '') // Remove agent tags
        .trim();

      // Use custom completed if it's under 8 words
      const wordCount = customText.split(/\s+/).length;
      if (customText && wordCount <= 8) {
        message = customText;
        console.error(`🗣️ AGENT CUSTOM VOICE (fallback): ${message}`);
      } else {
        // Custom completed too long, fall back to regular COMPLETED
        const completedMatch = taskResult.match(/🎯\s*COMPLETED:\s*(.+?)$/im);
        if (completedMatch) {
          let completedText = completedMatch[1].trim()
            .replace(/\*+/g, '')
            .replace(/\[AGENT:\w+\]\s*/i, '')
            .trim();
          message = generateIntelligentResponse(lastUserQuery, taskResult, completedText);
          console.error(`🎯 AGENT FALLBACK (custom too long): ${message}`);
        }
      }
    } else {
      // No CUSTOM COMPLETED, look for regular COMPLETED line
      const completedMatch = taskResult.match(/🎯\s*COMPLETED:\s*(.+?)$/im);

      if (completedMatch) {
        // Get exactly what the agent said after COMPLETED:
        let completedText = completedMatch[1].trim();

        // Remove markdown formatting
        completedText = completedText
          .replace(/\*+/g, '')  // Remove asterisks
          .replace(/\[AGENT:\w+\]\s*/i, '') // Remove agent tags
          .trim();

        // Generate intelligent response for agent tasks
        message = generateIntelligentResponse(lastUserQuery, taskResult, completedText);

        console.error(`🎯 AGENT INTELLIGENT (fallback): ${message}`);
      }
    }
  }

  // Voice notification removed - voice server is no longer used

  // ALWAYS set tab title to override any previous titles (like "dynamic requirements")
  // Generate a meaningful title even if we don't have a voice message
  let tabTitle = message || '';

  // If we don't have a message, generate a title from the last user query or completed task
  if (!tabTitle && lastUserQuery) {
    // Try to extract a completed line from the last assistant response
    try {
      const lastResponse = lines[lines.length - 1];
      const entry = JSON.parse(lastResponse);
      if (entry.type === 'assistant' && entry.message?.content) {
        const content = contentToText(entry.message.content);
        const completedMatch = content.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);
        if (completedMatch) {
          tabTitle = completedMatch[1].trim()
            .replace(/\*+/g, '')
            .replace(/\[.*?\]/g, '')
            .trim();
        }
      }
    } catch (e) {}

    // Fall back to generating a title from the user query
    if (!tabTitle) {
      tabTitle = generateTabTitle(lastUserQuery, '');
    }
  }

  // Set tab title to override "dynamic requirements" or any other previous title
  if (tabTitle) {
    setTabTitleSync(tabTitle);
    console.error(`\n🏷️ Tab title set to: "${tabTitle}"`);
  }

  console.error(`📝 User query: ${lastUserQuery || 'No query found'}`);
  console.error(`✅ Message: ${message || 'No completion message'}`)

  // Final tab title override as the very last action - use the actual completion message
  if (message) {
    const finalTabTitle = message.slice(0, 50); // Limit to 50 chars for tab title
    setTerminalTabTitle(finalTabTitle);
  }

  // Error compaction (12-Factor #9) - extract and save error summary
  try {
    const errorSummary = extractAndCompactErrors(transcript);
    if (errorSummary) {
      // Extract session ID from transcript path
      const sessionMatch = transcriptPath.match(/session_([a-zA-Z0-9]+)/);
      const sessionId = sessionMatch ? sessionMatch[1] : 'unknown';

      saveErrorSummary(errorSummary, sessionId);
      console.error(`🔴 Error compaction: ${errorSummary.totalErrors} errors (${errorSummary.uniqueTypes.length} types) saved`);

      // Check for recovery suggestions (Factor 6: checkpoint integration)
      if (errorSummary.errors.length > 0) {
        const topError = errorSummary.errors[0];
        const suggestion = trackErrorAndSuggestRecovery(topError.type, topError.count);
        if (suggestion) {
          console.error(`💡 Recovery suggestion: ${suggestion}`);
          logCheckpointEvent('error_threshold', {
            error_count: topError.count,
            suggestion,
            context: { error_type: topError.type, message: topError.message }
          });
        }
      }
    }
  } catch (e) {
    console.error(`⚠️ Error compaction failed: ${e}`);
  }

  console.error(`🎬 STOP-HOOK COMPLETED SUCCESSFULLY at ${new Date().toISOString()}\n`);
}

main().catch(() => {});