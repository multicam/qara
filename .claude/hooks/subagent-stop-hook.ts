#!/usr/bin/env bun

/**
 * subagent-stop-hook.ts - Stub
 *
 * Runs when a subagent session ends.
 * TODO: Implement subagent stop tracking.
 */

import { readFileSync } from 'fs';

try {
  const input = readFileSync(0, 'utf-8');
  // Stub: no-op pass-through
  process.exit(0);
} catch {
  process.exit(0);
}
