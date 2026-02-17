/**
 * PAI Path Resolution - Single Source of Truth
 *
 * This module provides consistent path resolution across all PAI hooks.
 * It handles PAI_DIR detection whether set explicitly or defaulting to ~/.claude
 *
 * Usage in hooks:
 *   import { PAI_DIR, HOOKS_DIR, SKILLS_DIR } from './lib/pai-paths';
 */

import { homedir } from 'os';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

/**
 * Smart PAI_DIR detection with fallback
 * Priority:
 * 1. PAI_DIR environment variable (if set)
 * 2. ~/.claude (standard location)
 */
export const PAI_DIR = process.env.PAI_DIR
    ? resolve(process.env.PAI_DIR)
    : resolve(homedir(), '.claude');

/**
 * Common PAI directories
 */
export const HOOKS_DIR = join(PAI_DIR, 'hooks');
export const SKILLS_DIR = join(PAI_DIR, 'skills');
export const AGENTS_DIR = join(PAI_DIR, 'agents');
export const HISTORY_DIR = join(PAI_DIR, 'history');
export const COMMANDS_DIR = join(PAI_DIR, 'commands');
export const STATE_DIR = join(PAI_DIR, 'state');

// Qara-specific directories (outside PAI_DIR)
export const QARA_DIR = resolve(homedir(), 'qara');
export const THOUGHTS_DIR = join(QARA_DIR, 'thoughts');
export const MEMORY_DIR = join(THOUGHTS_DIR, 'memory');

/**
 * Validate PAI directory structure on first import.
 * Logs warnings but does NOT exit — let the importing hook handle errors gracefully.
 */
function validatePAIStructure(): void {
    if (!existsSync(PAI_DIR)) {
        console.error(`Warning: PAI_DIR does not exist: ${PAI_DIR}`);
    } else if (!existsSync(HOOKS_DIR)) {
        console.error(`Warning: PAI hooks directory not found: ${HOOKS_DIR}`);
    }
}

// Run validation on module import (warns only, never crashes)
validatePAIStructure();

/**
 * Helper to get history file path with date-based organization
 */
export function getHistoryFilePath(subdir: string, filename: string): string {
    const formatter = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;

    return join(HISTORY_DIR, subdir, `${year}-${month}`, filename);
}

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
 * Load .env file from PAI_DIR into process.env
 * Only sets variables that aren't already set (environment takes precedence)
 */
export function loadEnv(): void {
    const envPath = join(PAI_DIR, '.env');
    if (!existsSync(envPath)) {
        return;
    }

    try {
        const envContent = readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;

            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match) {
                const [, key, value] = match;
                // Only set if not already in environment
                if (!process.env[key]) {
                    // Strip surrounding quotes and handle $HOME expansion
                    const unquoted = value.replace(/^["'](.*)["']$/, '$1');
                    const expandedValue = unquoted.replace(/\$HOME/g, homedir());
                    process.env[key] = expandedValue;
                }
            }
        }
    } catch (error) {
        console.error(`Warning: Failed to load ${envPath}:`, error);
    }
}

// Auto-load .env on module import
loadEnv();
