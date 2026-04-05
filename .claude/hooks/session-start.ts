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
import { SKILLS_DIR, QARA_DIR, getSessionId } from './lib/pai-paths';
import { setTerminalTabTitle } from './lib/tab-titles';
import { readTDDStateRaw, clearTDDState, isStateValid } from './lib/tdd-state';
import { loadCheckpoint, clearCheckpoint, formatCheckpointSummary } from './lib/compact-checkpoint';

const DEBOUNCE_MS = 2000;
const sessionId = getSessionId();
const LOCKFILE = join(tmpdir(), `pai-session-start-${sessionId}.lock`);

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

/**
 * Load active hints from session-hints.md and output as system-reminder.
 * Extracts only the ## Active Hints section to keep the reminder focused.
 * Fails silently — hints are advisory and must never block session start.
 */
function loadSessionHints(): void {
  try {
    const hintsPath = join(QARA_DIR, 'thoughts', 'shared', 'introspection', 'session-hints.md');
    if (!existsSync(hintsPath)) {
      return;
    }

    const content = readFileSync(hintsPath, 'utf-8');

    // Extract the ## Active Hints section
    const match = content.match(/## Active Hints\n([\s\S]*?)(?=\n## |\s*$)/);
    if (!match) {
      return;
    }

    const hintsSection = match[1].trim();
    if (!hintsSection) {
      return;
    }

    console.log(`<system-reminder>\n## Session Hints (from introspection patterns)\n\n${hintsSection}\n</system-reminder>`);
  } catch {
    // Hints are advisory — never let a failure here surface to the user
  }
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

    // Clean up stale TDD state from dead sessions
    try {
      const stale = readTDDStateRaw();
      if (stale && !isStateValid(stale)) {
        clearTDDState();
        console.error('Cleaned up stale TDD state from previous session');
      }
    } catch {
      // Non-critical — don't let cleanup failure block session start
    }

    // Check for crash recovery: checkpoint from a previous session with active mode
    try {
      const checkpoint = loadCheckpoint(sessionId);
      if (checkpoint && checkpoint.mode?.active) {
        const summary = formatCheckpointSummary(checkpoint);
        console.log(`<system-reminder>CRASH RECOVERY: Found checkpoint from ${checkpoint.savedAt}.\n\n${summary}\n\nA previous session had an active ${checkpoint.mode.name} mode. Review the state above and decide whether to resume or start fresh.</system-reminder>`);
        clearCheckpoint(sessionId);
      }
    } catch {
      // Non-critical — don't let recovery check block session start
    }

    // Load core context (outputs to stdout)
    loadCoreContext();

    // Load session hints from introspection patterns (outputs to stdout if hints exist)
    loadSessionHints();

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
