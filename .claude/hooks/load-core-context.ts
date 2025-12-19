#!/home/jean-marc/.bun/bin/bun

/**
 * load-core-context.ts
 *
 * Loads PAI core context (SKILL.md) at session start.
 * Outputs as <system-reminder> for Claude to process.
 *
 * This hook runs BEFORE initialize-pai-session.ts in SessionStart.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PAI_DIR, SKILLS_DIR } from './lib/pai-paths';

async function main() {
  try {
    // Check if this is a subagent session - if so, skip loading main context
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // Subagents have their own context - don't load main SKILL.md
      process.exit(0);
    }

    // Path to core skill file
    const skillPath = join(SKILLS_DIR, 'CORE', 'SKILL.md');

    if (!existsSync(skillPath)) {
      console.error(`⚠️ SKILL.md not found at: ${skillPath}`);
      process.exit(0);
    }

    // Read the skill content
    const skillContent = readFileSync(skillPath, 'utf-8');

    // Output as system-reminder for Claude to process
    console.log(`<system-reminder>
${skillContent}
</system-reminder>`);

    process.exit(0);
  } catch (error) {
    console.error('load-core-context error:', error);
    process.exit(0); // Always exit 0 to not block Claude Code
  }
}

main();
