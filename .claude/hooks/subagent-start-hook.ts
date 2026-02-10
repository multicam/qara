#!/usr/bin/env bun

/**
 * subagent-start-hook.ts - Stub
 *
 * Runs when a subagent session starts.
 * TODO: Implement subagent start tracking.
 */

import { readFileSync } from 'fs';

try {
  const input = readFileSync(0, 'utf-8');
  // Stub: no-op pass-through
  process.exit(0);
} catch {
  process.exit(0);
}
