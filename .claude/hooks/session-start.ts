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
 * 4. Suggests relevant skills based on session context
 * 5. Sets initial terminal tab title
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PAI_DIR, SKILLS_DIR, STATE_DIR, ensureDir } from './lib/pai-paths';
import { setTerminalTabTitle } from './lib/tab-titles';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

interface SkillSuggestion {
  pattern: string[];
  skill: string;
  description: string;
}

const SKILL_SUGGESTIONS: SkillSuggestion[] = [
  {
    pattern: ['scrape', 'fetch content', 'pull from url', 'web data', 'brightdata'],
    skill: '/brightdata',
    description: 'for scraping difficult URLs with bot detection'
  },
  {
    pattern: ['research', 'analyze content', 'find information', 'multi-source'],
    skill: '/research',
    description: 'for multi-source parallel research'
  },
  {
    pattern: ['ui', 'frontend', 'component', 'interface', 'design', 'react', 'vue'],
    skill: '/frontend-design',
    description: 'for polished, distinctive interfaces'
  },
  {
    pattern: ['cli', 'command line', 'terminal tool', 'command tool'],
    skill: '/system-create-cli',
    description: 'for production-quality TypeScript CLIs'
  },
  {
    pattern: ['optimize pai', 'cc features', 'audit repo', '12-factor'],
    skill: '/cc-pai-optimiser',
    description: 'for PAI optimization and CC feature adoption'
  },
  {
    pattern: ['story', 'narrative', 'explain as', 'summary'],
    skill: '/story-explanation',
    description: 'for compelling story-format explanations'
  },
  {
    pattern: ['hook', 'event', 'automation'],
    skill: '/hook-authoring',
    description: 'for creating Claude Code hooks'
  },
  {
    pattern: ['create skill', 'new skill', 'skill framework'],
    skill: '/system-create-skill',
    description: 'for creating new PAI skills'
  }
];

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

/**
 * Log skill suggestions for metrics tracking
 */
function logSkillSuggestions(skills: SkillSuggestion[], sessionId: string): void {
  const logFile = join(STATE_DIR, "skill-suggestions.jsonl");
  ensureDir(STATE_DIR);

  skills.forEach(skill => {
    const entry = {
      timestamp: getISOTimestamp(),
      skill_name: skill.skill.replace('/', ''),
      session_id: sessionId,
      suggested_by: "auto",
      reason: `Matched patterns: ${skill.pattern.join(", ")}`,
    };

    appendJsonl(logFile, entry);
  });
}

/**
 * Analyze session context and suggest relevant skills
 */
function suggestSkills(sessionId: string): void {
  // Check for context clues in the current directory
  const cwd = process.cwd();

  // Read package.json if exists
  let context = '';
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      context += JSON.stringify(packageJson).toLowerCase();
    } catch {}
  }

  // Check for session context file
  const sessionContextPath = join(PAI_DIR, 'context', 'working', 'session-context.md');
  if (existsSync(sessionContextPath)) {
    try {
      context += readFileSync(sessionContextPath, 'utf-8').toLowerCase();
    } catch {}
  }

  // Check current directory name
  context += cwd.toLowerCase();

  // Match skills
  const matches = SKILL_SUGGESTIONS.filter(suggestion =>
    suggestion.pattern.some(pattern => context.includes(pattern))
  );

  if (matches.length > 0) {
    // Log suggestions for metrics
    logSkillSuggestions(matches, sessionId);

    console.error('\n💡 RELEVANT SKILLS FOR THIS SESSION:\n');
    matches.forEach(s => {
      console.error(`   ${s.skill} - ${s.description}`);
    });
    console.error('');
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

    // Get session ID for tracking
    const sessionId = process.env.CLAUDE_SESSION_ID ||
                      process.env.SESSION_ID ||
                      `session-${Date.now()}`;

    // Load core context (outputs to stdout)
    loadCoreContext();

    // Suggest relevant skills based on context
    suggestSkills(sessionId);

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
