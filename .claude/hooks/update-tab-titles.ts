#!/usr/bin/env bun

/**
 * update-tab-titles.ts
 *
 * Updates terminal tab title when user submits a prompt.
 * Sets a processing indicator while Claude is working.
 *
 * Runs on UserPromptSubmit event.
 */

import { readFileSync } from 'fs';
import { setTerminalTabTitle, generateTabTitle } from './lib/tab-titles';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  prompt?: string;
}

async function main() {
  try {
    // Read hook input from stdin
    const input = readFileSync(0, 'utf-8');

    if (!input.trim()) {
      process.exit(0);
    }

    const hookData: HookInput = JSON.parse(input);
    const prompt = hookData.prompt || '';

    if (!prompt) {
      process.exit(0);
    }

    // Generate a short title from the prompt
    const shortTitle = generateTabTitle(prompt);
    
    // Set tab title with processing indicator
    const daName = process.env.DA || 'AI';
    const titleWithEmoji = `♻️ ${daName}: ${shortTitle}`;
    
    setTerminalTabTitle(titleWithEmoji);

    process.exit(0);
  } catch (error) {
    // Silently fail - tab titles are not critical
    process.exit(0);
  }
}

main();
