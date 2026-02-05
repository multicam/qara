#!/usr/bin/env bun

/**
 * stop-hook.ts
 *
 * Stop event hook - triggered when Qara completes a response.
 * Sets terminal tab title based on the last user query.
 */

import { readFileSync } from 'fs';
import { generateTabTitle, setTerminalTabTitle } from './lib/tab-titles';
import { readStdinWithTimeout } from './lib/stdin-utils';

async function main() {
  // Read input from stdin
  let transcriptPath: string;
  try {
    const input = await readStdinWithTimeout(500);
    if (!input) {
      process.exit(0);
    }

    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;

    if (!transcriptPath) {
      process.exit(0);
    }
  } catch {
    process.exit(0);
  }

  // Read the transcript
  let transcript: string;
  try {
    transcript = readFileSync(transcriptPath, 'utf-8');
  } catch {
    process.exit(0);
  }

  // Find last user query for tab title
  const lines = transcript.trim().split('\n');
  let lastUserQuery = '';

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === 'user' && entry.message?.content) {
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
    } catch {
      // Skip invalid JSON
    }
  }

  // Set tab title
  if (lastUserQuery) {
    const title = generateTabTitle(lastUserQuery, '');
    setTerminalTabTitle(title);
  }
}

main().catch(() => {});
