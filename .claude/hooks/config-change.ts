#!/usr/bin/env bun

/**
 * config-change.ts
 *
 * ConfigChange hook - logs settings changes during a session.
 * Audit trail for configuration modifications (CC 2.1.x).
 */

import { join } from 'path';
import { STATE_DIR } from './lib/pai-paths';
import { appendJsonl, parseStdin, resolveSessionId } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

function main() {
  try {
    const parsed = parseStdin();
    if (!parsed) return;

    appendJsonl(join(STATE_DIR, 'config-changes.jsonl'), {
      timestamp: getISOTimestamp(),
      source: (parsed.config_source as string) || 'unknown',
      session_id: resolveSessionId(parsed),
    });
  } catch {
    // Non-critical — fail silently
  }
}

main();
