/**
 * JSONL Utilities
 *
 * Shared functions for appending to JSONL (JSON Lines) files.
 * Handles directory creation and atomic writes.
 */

import { appendFileSync } from 'fs';
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
