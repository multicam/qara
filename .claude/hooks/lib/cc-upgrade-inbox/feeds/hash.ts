/**
 * feeds/hash.ts
 *
 * Shared djb2 digest used by feeds that need a stable short fingerprint
 * for a human-readable string (e.g. PAI audit recommendations).
 * 8-hex output, deterministic across runs.
 */

export function digest(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}
