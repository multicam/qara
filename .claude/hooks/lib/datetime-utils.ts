/**
 * DateTime Utilities
 *
 * Shared functions for timezone-aware date/time formatting.
 * Uses Australia/Sydney timezone for consistency.
 *
 * Note: getLocalTimestamp and getDateParts were removed 2026-04-13
 * (dead exports — tested but never imported by any production code).
 */

/**
 * Get ISO timestamp for logging
 * @returns ISO 8601 formatted timestamp
 */
export function getISOTimestamp(): string {
    return new Date().toISOString();
}
