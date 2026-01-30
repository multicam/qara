#!/usr/bin/env bun
/**
 * Setup Hook - Repository Initialization
 *
 * Runs on `claude --init` or `claude --maintenance`
 *
 * Factor 6 Compliance: Launch/Pause/Resume
 * Ensures consistent PAI directory structure for new repositories.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp } from './lib/datetime-utils';

interface SetupInput {
  session_id: string;
  cwd: string;
  mode: 'init' | 'init-only' | 'maintenance';
}

// Required directories for PAI infrastructure
const REQUIRED_DIRS = [
  '.claude/state',
  '.claude/thoughts',
  '.claude/context/working',
  '.claude/agents',
];

// Template files to create if missing
const TEMPLATE_FILES: Record<string, string> = {
  '.claude/state/session-hierarchy.json': JSON.stringify({
    initialized: '${TIMESTAMP}',
    version: '1.0.0',
    sessions: []
  }, null, 2),
  '.claude/context/working/.gitkeep': '# Working context files go here\n',
};

async function main(): Promise<void> {
  try {
    const inputText = await Bun.stdin.text();
    const input: SetupInput = JSON.parse(inputText);

    const changes: string[] = [];

    // Create required directories
    for (const dir of REQUIRED_DIRS) {
      const fullPath = join(input.cwd, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        changes.push(`Created: ${dir}`);
      }
    }

    // Create template files
    for (const [relativePath, template] of Object.entries(TEMPLATE_FILES)) {
      const fullPath = join(input.cwd, relativePath);
      if (!existsSync(fullPath)) {
        const content = template.replace('${TIMESTAMP}', getISOTimestamp());
        writeFileSync(fullPath, content);
        changes.push(`Created: ${relativePath}`);
      }
    }

    // Mode-specific actions
    if (input.mode === 'maintenance') {
      // Clean up stale lock files
      const lockFile = join(input.cwd, '.claude/state/session.lock');
      if (existsSync(lockFile)) {
        try {
          const lockData = JSON.parse(readFileSync(lockFile, 'utf-8'));
          const lockAge = Date.now() - (lockData.timestamp || 0);
          // Remove locks older than 1 hour
          if (lockAge > 3600000) {
            const { unlinkSync } = await import('fs');
            unlinkSync(lockFile);
            changes.push('Cleaned: stale session lock');
          }
        } catch {
          // Ignore malformed lock files
        }
      }

      // Compact old state files (keep last 100 entries in JSONL files)
      const stateDir = join(input.cwd, '.claude/state');
      if (existsSync(stateDir)) {
        const { readdirSync } = await import('fs');
        const files = readdirSync(stateDir).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
          const filePath = join(stateDir, file);
          try {
            const content = readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(Boolean);
            if (lines.length > 100) {
              const trimmed = lines.slice(-100).join('\n') + '\n';
              writeFileSync(filePath, trimmed);
              changes.push(`Compacted: ${file} (${lines.length} → 100 entries)`);
            }
          } catch {
            // Skip files that can't be processed
          }
        }
      }
    }

    // Log changes to stderr (visible to user)
    if (changes.length > 0) {
      console.error(`\n🔧 Setup hook (${input.mode}):`);
      changes.forEach(c => console.error(`   ✓ ${c}`));
      console.error('');
    } else if (input.mode === 'init') {
      console.error('\n✓ PAI structure already initialized\n');
    }

    // Output success
    console.log(JSON.stringify({ continue: true }));

  } catch (error) {
    console.error('Setup hook error:', error);
    // Fail open - don't block session start
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
