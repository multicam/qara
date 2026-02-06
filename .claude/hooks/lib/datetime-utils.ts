/**
 * DateTime Utilities
 *
 * Shared functions for timezone-aware date/time formatting.
 * Centralizes Sydney/AEDT timezone handling used across hooks.
 */

const TIMEZONE = 'Australia/Sydney';

/**
 * Get Sydney timestamp string (AEDT format)
 * @returns Formatted timestamp like "2025-01-11 08:00:00 AEDT"
 */
export function getAEDTTimestamp(): string {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-AU', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    const hours = parts.find(p => p.type === 'hour')!.value;
    const minutes = parts.find(p => p.type === 'minute')!.value;
    const seconds = parts.find(p => p.type === 'second')!.value;

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} AEDT`;
}

/**
 * Get date components for file path organization
 * @returns Object with year, month, day as zero-padded strings
 */
export function getDateParts(): { year: string; month: string; day: string; yearMonth: string } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-AU', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;

    return {
        year,
        month,
        day,
        yearMonth: `${year}-${month}`
    };
}

/**
 * Get ISO timestamp for logging
 * @returns ISO 8601 formatted timestamp
 */
export function getISOTimestamp(): string {
    return new Date().toISOString();
}
