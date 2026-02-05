/**
 * JSONL Utilities
 *
 * Shared functions for appending to JSONL (JSON Lines) files.
 * Handles directory creation and atomic writes.
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Ensure a directory exists, creating it recursively if needed
 * @param dir Directory path to ensure exists
 */
export function ensureDir(dir: string): void {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

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

/**
 * Truncate a string to a maximum length with ellipsis indicator
 * @param str String to truncate
 * @param maxLen Maximum length (default 500)
 * @returns Truncated string with "[truncated]" suffix if needed
 */
export function truncate(str: string | undefined, maxLen: number = 500): string {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...[truncated]' : str;
}
