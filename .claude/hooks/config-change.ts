#!/usr/bin/env bun

/**
 * config-change.ts
 *
 * ConfigChange hook - logs settings changes during a session.
 * Audit trail for configuration modifications (CC 2.1.x).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { STATE_DIR, getSessionId } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) return;

    const parsed = JSON.parse(input);

    appendJsonl(join(STATE_DIR, 'config-changes.jsonl'), {
      timestamp: getISOTimestamp(),
      source: parsed.config_source || 'unknown',
      session_id: parsed.session_id || getSessionId(),
    });
  } catch {
    // Non-critical — fail silently
  }
}

main();
