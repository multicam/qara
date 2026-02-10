#!/usr/bin/env bun

/**
 * capture-all-events.ts - Stub
 *
 * Logs all hook events to JSONL for observability.
 * TODO: Implement event capture logic.
 */

import { readFileSync } from 'fs';

try {
  const input = readFileSync(0, 'utf-8');
  // Stub: no-op pass-through
  process.exit(0);
} catch {
  process.exit(0);
}
