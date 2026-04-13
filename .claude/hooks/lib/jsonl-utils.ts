/**
 * JSONL Utilities + Hook Helpers
 *
 * Shared functions for appending to JSONL files, parsing hook stdin,
 * and resolving session IDs. Used by all 17+ hooks.
 */

import { readFileSync, appendFileSync } from 'fs';
import { dirname } from 'path';
import { ensureDir, getSessionId } from './pai-paths';

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
 * Resolve session ID from parsed hook data, falling back to env/default.
 * Replaces the 6-hook pattern: parsed.session_id || getSessionId().
 */
export function resolveSessionId(data: Record<string, unknown>): string {
    return (data?.session_id as string) || getSessionId();
}
