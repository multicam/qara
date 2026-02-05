#!/usr/bin/env bun

/**
 * session-start.ts
 *
 * Unified SessionStart hook - runs at the start of every Claude Code session.
 *
 * What it does:
 * 1. Skips for subagent sessions
 * 2. Debounces duplicate SessionStart events (IDE can fire multiple)
 * 3. Loads SKILL.md and outputs as <system-reminder>
 * 4. Sets initial terminal tab title
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SKILLS_DIR } from './lib/pai-paths';
import { setTerminalTabTitle } from './lib/tab-titles';

const DEBOUNCE_MS = 2000;
const LOCKFILE = join(tmpdir(), 'pai-session-start.lock');

/**
 * Check if this is a subagent session
 */
function isSubagentSession(): boolean {
  const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
  return claudeProjectDir.includes('/.claude/agents/') ||
         process.env.CLAUDE_AGENT_TYPE !== undefined;
}

/**
 * Check if we're within the debounce window
 */
function shouldDebounce(): boolean {
  try {
    if (existsSync(LOCKFILE)) {
      const lockTime = parseInt(readFileSync(LOCKFILE, 'utf-8'), 10);
      if (Date.now() - lockTime < DEBOUNCE_MS) {
        return true;
      }
    }
    writeFileSync(LOCKFILE, Date.now().toString());
    return false;
  } catch {
    try { writeFileSync(LOCKFILE, Date.now().toString()); } catch {}
    return false;
  }
}

/**
 * Load and output SKILL.md as system-reminder
 */
function loadCoreContext(): void {
  const skillPath = join(SKILLS_DIR, 'CORE', 'SKILL.md');

  if (!existsSync(skillPath)) {
    console.error(`SKILL.md not found at: ${skillPath}`);
    return;
  }

  const skillContent = readFileSync(skillPath, 'utf-8');
  console.log(`<system-reminder>\n${skillContent}\n</system-reminder>`);
}

async function main() {
  try {
    // Skip for subagents
    if (isSubagentSession()) {
      process.exit(0);
    }

    // Debounce duplicate events
    if (shouldDebounce()) {
      console.error('Debouncing duplicate SessionStart');
      process.exit(0);
    }

    // Load core context (outputs to stdout)
    loadCoreContext();

    // Set initial tab title
    const daName = process.env.DA || 'AI';
    setTerminalTabTitle(`${daName} Ready`);

    process.exit(0);
  } catch (error) {
    console.error('SessionStart error:', error);
    process.exit(0);
  }
}

main();
