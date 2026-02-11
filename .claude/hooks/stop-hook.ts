#!/usr/bin/env bun

/**
 * stop-hook.ts
 *
 * Stop event hook - triggered when Qara completes a response.
 * Sets terminal tab title based on the last user query.
 */

import { openSync, readSync, fstatSync, closeSync } from 'fs';
import { generateTabTitle, setTerminalTabTitle } from './lib/tab-titles';
import { readStdinWithTimeout } from './lib/stdin-utils';

const TAIL_BYTES = 32_768; // Read last 32KB -- enough for recent user messages

/**
 * Read the last N bytes of a file without loading the whole thing.
 */
function readTail(filePath: string, bytes: number): string {
  const fd = openSync(filePath, 'r');
  try {
    const { size } = fstatSync(fd);
    const start = Math.max(0, size - bytes);
    const len = size - start;
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, start);
    return buf.toString('utf-8');
  } finally {
    closeSync(fd);
  }
}

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

  // Read only the tail of the transcript
  let tail: string;
  try {
    tail = readTail(transcriptPath, TAIL_BYTES);
  } catch {
    process.exit(0);
  }

  // Find last user query for tab title
  const lines = tail.trim().split('\n');
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
      // Skip invalid/partial JSON (first line may be truncated)
    }
  }

  // Set tab title
  if (lastUserQuery) {
    const title = generateTabTitle(lastUserQuery);
    setTerminalTabTitle(title);
  }
}

main().catch(() => {});
