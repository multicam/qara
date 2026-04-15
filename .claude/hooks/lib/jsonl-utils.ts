/**
 * JSONL Utilities + Hook Helpers
 *
 * Shared functions for appending to JSONL files, parsing hook stdin,
 * and resolving session IDs. Used by all 17+ hooks.
 */

import { readFileSync, appendFileSync } from 'fs';
import { dirname } from 'path';
import { ensureDir } from './pai-paths';

/**
 * Append a JSON object as a line to a JSONL file
 * Creates parent directories if they don't exist
 *
 * @param filepath Path to the JSONL file
 * @param entry Object to serialize and append
 */
export function appendJsonl(filepath: string, entry: object): void {
    ensureDir(dirname(filepath));
    appendFileSync(filepath, JSON.stringify(entry) + '\n');
}

const TRUNCATION_SUFFIX = '...[truncated]';

/**
 * Truncate a string to a maximum length with ellipsis indicator.
 * Total output (including suffix) never exceeds maxLen.
 * @param str String to truncate
 * @param maxLen Maximum total length (default 500)
 * @returns Truncated string with suffix if room, hard-truncated otherwise
 */
export function truncate(str: string | undefined, maxLen: number = 500): string {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    if (maxLen <= TRUNCATION_SUFFIX.length) return str.substring(0, maxLen);
    return str.substring(0, maxLen - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
}

/**
 * Parse hook stdin as JSON. Returns null if stdin is empty or unparseable.
 * Replaces the 12-hook pattern: readFileSync(0) + trim check + JSON.parse.
 */
export function parseStdin<T = Record<string, unknown>>(): T | null {
    try {
        const input = readFileSync(0, 'utf-8');
        if (!input.trim()) return null;
        return JSON.parse(input) as T;
    } catch {
        return null;
    }
}

/**
 * Resolve session ID from parsed hook data.
 *
 * Priority:
 *   1. `data.session_id` (stdin payload — CC's canonical source)
 *   2. `CLAUDE_SESSION_ID` or `SESSION_ID` env var, IF set to a real value
 *   3. Literal 'unknown' sentinel — but with a stderr warning first
 *
 * The env-var step used to go through `getSessionId()`, which silently
 * returned `'unknown'` when the env was unset (CC does NOT export
 * `CLAUDE_SESSION_ID` to hook subprocesses). That behavior made every
 * hook log `session_id: "unknown"` — parallel sessions trampled each
 * other in `state/sessions/unknown/`. Commit b05d443 routed the stdin
 * path through hooks; this function now refuses to let 'unknown' sneak
 * in as a silent env value — it must be an explicit last resort with
 * a visible warning.
 */
export function resolveSessionId(data: Record<string, unknown>): string {
    const fromData = data?.session_id;
    if (typeof fromData === 'string' && fromData.length > 0) return fromData;

    const fromEnv = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID;
    if (fromEnv && fromEnv.length > 0 && fromEnv !== 'unknown') return fromEnv;

    console.error(
        '[resolveSessionId] session_id missing from stdin payload and ' +
        'CLAUDE_SESSION_ID/SESSION_ID env unset (or literal "unknown"). ' +
        'Falling back to "unknown" — collisions in state/sessions/unknown/ possible.'
    );
    return 'unknown';
}
