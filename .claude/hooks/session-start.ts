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

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PAI_DIR, SKILLS_DIR, QARA_DIR, STATE_DIR, getSessionsDir } from './lib/pai-paths';
import { setTerminalTabTitle } from './lib/tab-titles';
import { readTDDStateRaw, clearTDDState, isStateValid } from './lib/tdd-state';
import { loadCheckpoint, clearCheckpoint, formatCheckpointSummary } from './lib/compact-checkpoint';
import { appendJsonl, resolveSessionId } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

const DEBOUNCE_MS = 2000;
const LEDGER_TTL_MS = 86400000; // 24 hours

// Memory warning: CC truncates MEMORY.md at 200 lines OR 25 KB (v2.1.98),
// dropping NEWEST entries first (GitHub #39811). Warn early so older entries
// can be archived before new learnings vanish. Single tunable constant.
const MEMORY_WARN_PCT = 70;
const MEMORY_MAX_LINES = 200;
const MEMORY_MAX_BYTES = 25_000;

/**
 * Check if this is a subagent session
 */
function isSubagentSession(): boolean {
  const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
  return claudeProjectDir.includes('/.claude/agents/') ||
         process.env.CLAUDE_AGENT_TYPE !== undefined;
}

/**
 * Check if we're within the debounce window for the given lockfile.
 * Lockfile path is session-scoped so parallel CC sessions don't collide.
 */
function shouldDebounce(lockfile: string): boolean {
  try {
    if (existsSync(lockfile)) {
      const lockTime = parseInt(readFileSync(lockfile, 'utf-8'), 10);
      if (Date.now() - lockTime < DEBOUNCE_MS) {
        return true;
      }
    }
    writeFileSync(lockfile, Date.now().toString());
    return false;
  } catch {
    try { writeFileSync(lockfile, Date.now().toString()); } catch {}
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
 * Check whether the current project's MEMORY.md is near CC's silent-truncation cap.
 * Returns a formatted <system-reminder> string to emit, or null if under threshold.
 *
 * Pure function — exported for unit testing. Takes paiDir and cwd as params so tests
 * can use fixture directories without touching the live filesystem.
 */
export function checkMemoryBudget(paiDir: string, cwd: string): string | null {
  if (!cwd.startsWith('/')) return null;

  const slug = cwd.replace(/^\//, '').replace(/\//g, '-');
  const memoryPath = join(paiDir, 'projects', `-${slug}`, 'memory', 'MEMORY.md');
  if (!existsSync(memoryPath)) return null;

  let content: string;
  try {
    content = readFileSync(memoryPath, 'utf-8');
  } catch {
    return null;
  }

  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf-8');
  const linePct = (lines / MEMORY_MAX_LINES) * 100;
  const bytePct = (bytes / MEMORY_MAX_BYTES) * 100;
  const worstPct = Math.max(linePct, bytePct);

  if (worstPct < MEMORY_WARN_PCT) return null;

  const kb = Math.round(bytes / 1024);
  const maxKb = Math.round(MEMORY_MAX_BYTES / 1024);
  return `<system-reminder>MEMORY.md is ${lines}/${MEMORY_MAX_LINES} lines, ${kb}/${maxKb} KB (${Math.round(worstPct)}% of budget). CC truncates NEWEST entries first when over cap (GitHub #39811) — move older entries to an archive file before recent learnings vanish. Pattern: mirror DECISIONS.md — create MEMORY-YYYY.md with older content and add "Older entries: [archive](MEMORY-YYYY.md)" at the top of the live file.</system-reminder>`;
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

    // Resolve session id from stdin payload (CC's canonical surface), falling
    // back to CLAUDE_SESSION_ID env or "unknown". Parse defensively — some
    // SessionStart trigger sources may fire without a payload.
    let parsed: Record<string, unknown> = {};
    try {
      const input = readFileSync(0, 'utf-8');
      if (input.trim()) parsed = JSON.parse(input);
    } catch { /* no stdin or malformed — fall through to env/default */ }
    const sessionId = resolveSessionId(parsed);
    const lockfile = join(tmpdir(), `pai-session-start-${sessionId}.lock`);

    // Debounce duplicate events
    if (shouldDebounce(lockfile)) {
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

    // Clean up stale read ledgers (>24h) from previous sessions
    try {
      const sessionsDir = getSessionsDir();
      if (existsSync(sessionsDir)) {
        const now = Date.now();
        for (const dir of readdirSync(sessionsDir)) {
          const ledger = join(sessionsDir, dir, 'files-read.txt');
          if (existsSync(ledger) && now - statSync(ledger).mtimeMs > LEDGER_TTL_MS) {
            unlinkSync(ledger);
          }
        }
      }
    } catch { /* non-critical */ }

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
    const contextLoaded = ['CORE/SKILL.md'];

    // Load session hints from introspection patterns (outputs to stdout if hints exist)
    loadSessionHints();
    const hintsPath = join(QARA_DIR, 'thoughts', 'shared', 'introspection', 'session-hints.md');
    if (existsSync(hintsPath)) contextLoaded.push('session-hints');

    // Memory budget warning (D13) — protects against CC's silent newest-first truncation
    const memWarning = checkMemoryBudget(PAI_DIR, process.env.PWD || process.cwd());
    if (memWarning) {
      console.log(memWarning);
      contextLoaded.push('memory-budget-warning');
    }

    // Log context utilization for introspection pipeline
    try {
      appendJsonl(join(STATE_DIR, 'session-checkpoints.jsonl'), {
        timestamp: getISOTimestamp(),
        session_id: sessionId,
        event: 'context_loaded',
        context_files: contextLoaded,
        context_count: contextLoaded.length,
      });
    } catch { /* non-critical */ }

    // Set initial tab title
    const daName = process.env.DA || 'AI';
    setTerminalTabTitle(`${daName} Ready`);

    process.exit(0);
  } catch (error) {
    console.error('SessionStart error:', error);
    process.exit(0);
  }
}

// Direct-run guard: only invoke main() when executed as the hook, not when
// imported by tests (prevents test imports from firing the real hook).
if (import.meta.path === Bun.main) {
  main();
}
