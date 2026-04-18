#!/usr/bin/env bun
/**
 * cc-feature-sync.ts
 * Fetch the CC CHANGELOG.md from GitHub, parse new feature entries,
 * compare against FEATURE_REQUIREMENTS in cc-version-check.ts, and
 * output features not yet tracked.
 *
 * Usage: bun cc-feature-sync.ts [--verbose]
 */

import { FEATURE_REQUIREMENTS } from './cc-version-check';

// --- Types ---

interface ChangelogEntry {
    version: string;
    date: string | null;
    features: string[];
    raw: string;
}

interface FeatureSyncReport {
    timestamp: string;
    changelogVersion: string | null;
    trackedFeatureCount: number;
    newCandidates: NewFeatureCandidate[];
    versionGaps: string[];
    summary: string;
}

interface NewFeatureCandidate {
    version: string;
    description: string;
    suggestedKey: string;
}

// --- Constants ---

const CHANGELOG_URL = 'https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md';

// Keywords that indicate a significant new feature (not a bugfix)
const FEATURE_KEYWORDS = [
    'add', 'adds', 'added', 'introduce', 'introduces', 'introduced',
    'new', 'support', 'supports', 'enable', 'enables', 'implement',
    'implements', 'feature', 'launch', 'launches',
];

const BUGFIX_KEYWORDS = [
    'fix', 'fixes', 'fixed', 'bug', 'patch', 'correct', 'corrects',
    'corrected', 'resolve', 'resolves', 'resolved', 'revert',
];

// --- Helpers ---

function isVerbose(): boolean {
    return process.argv.includes('--verbose');
}

function log(msg: string): void {
    if (isVerbose()) console.error(`[verbose] ${msg}`);
}

function isBugfix(line: string): boolean {
    const lower = line.toLowerCase();
    return BUGFIX_KEYWORDS.some(kw => lower.includes(kw));
}

function isFeatureLine(line: string): boolean {
    const lower = line.toLowerCase();
    return FEATURE_KEYWORDS.some(kw => lower.includes(kw)) && !isBugfix(line);
}

/**
 * Convert a feature description line to a camelCase key suggestion.
 * e.g. "Add background task support" -> "backgroundTaskSupport"
 */
function toSuggestedKey(description: string): string {
    const stopWords = new Set(['a', 'an', 'the', 'for', 'and', 'or', 'in', 'on', 'at', 'to', 'of', 'with', 'add', 'adds', 'new', 'support', 'enable', 'introduce']);
    const words = description
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0 && !stopWords.has(w.toLowerCase()))
        .slice(0, 4);

    if (words.length === 0) return 'unknownFeature';

    return words
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
}

// --- Changelog Parsing ---

function parseChangelog(content: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    // Match version headings like "## [1.2.3]" or "## 1.2.3" or "## v1.2.3"
    const versionPattern = /^##\s+(?:\[)?v?(\d+\.\d+\.\d+[^\]\s]*)/m;
    const sections = content.split(/^(?=##\s+(?:\[)?v?\d+\.\d+)/m);

    for (const section of sections) {
        if (!section.trim()) continue;

        const headerMatch = section.match(versionPattern);
        if (!headerMatch) continue;

        const version = headerMatch[1];
        const dateMatch = section.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : null;

        // Extract bullet lines (- or *) that look like features
        const lines = section.split('\n');
        const features: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;
            const text = trimmed.replace(/^[-*]\s+/, '').trim();
            if (text.length < 10) continue;
            if (isFeatureLine(text)) {
                features.push(text);
            }
        }

        entries.push({ version, date, features, raw: section });
    }

    return entries;
}

// --- Gap Analysis ---

function getTrackedVersions(): Set<string> {
    const versions = new Set<string>();
    for (const req of Object.values(FEATURE_REQUIREMENTS)) {
        versions.add(req.minVersion);
    }
    return versions;
}

function getTrackedDescriptions(): Set<string> {
    const descs = new Set<string>();
    for (const req of Object.values(FEATURE_REQUIREMENTS)) {
        descs.add(req.description.toLowerCase());
    }
    return descs;
}

function findNewCandidates(entries: ChangelogEntry[]): NewFeatureCandidate[] {
    const trackedDescriptions = getTrackedDescriptions();
    const candidates: NewFeatureCandidate[] = [];

    for (const entry of entries) {
        for (const feature of entry.features) {
            const lowerFeature = feature.toLowerCase();

            // Skip if a tracked description is a substring match (rough dedup)
            const alreadyTracked = [...trackedDescriptions].some(desc => {
                const keywords = desc.split(/\s+/).filter(w => w.length > 4);
                return keywords.length > 0 && keywords.every(kw => lowerFeature.includes(kw));
            });

            if (!alreadyTracked) {
                candidates.push({
                    version: entry.version,
                    description: feature,
                    suggestedKey: toSuggestedKey(feature),
                });
            }
        }
    }

    return candidates;
}

function findVersionGaps(entries: ChangelogEntry[]): string[] {
    const trackedVersions = getTrackedVersions();
    const changelogVersions = entries.map(e => e.version);
    const gaps: string[] = [];

    for (const version of changelogVersions) {
        if (!trackedVersions.has(version)) {
            gaps.push(version);
        }
    }

    return gaps;
}

// --- Baseline filtering ---

/**
 * Parse a semver-ish version string into a tuple of numeric components.
 * Accepts `v1.2.3`, `1.2.3`, or `1.2.3-rc1` (prerelease suffix ignored).
 * Shared with cc-version-check's compareVersions — kept local to avoid a
 * cross-script import cycle.
 */
function parseVer(v: string): number[] {
    return v.replace(/^v/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
}

function compareVer(a: string, b: string): number {
    const aa = parseVer(a);
    const bb = parseVer(b);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
        const av = aa[i] || 0;
        const bv = bb[i] || 0;
        if (av > bv) return 1;
        if (av < bv) return -1;
    }
    return 0;
}

/**
 * Return changelog entries with version strictly greater than `baseline`.
 * Used by `--since-baseline <v>` to surface only what's new since the last
 * review. When baseline is empty string or null, returns entries unchanged.
 */
export function filterSinceBaseline(
    entries: ChangelogEntry[],
    baseline: string | null,
): ChangelogEntry[] {
    if (!baseline) return entries;
    return entries.filter(e => compareVer(e.version, baseline) > 0);
}

// --- Fetch ---

async function fetchChangelog(): Promise<string | null> {
    log(`Fetching: ${CHANGELOG_URL}`);
    try {
        const response = await fetch(CHANGELOG_URL, {
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            console.error(`[error] CHANGELOG fetch failed: HTTP ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.text();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[error] CHANGELOG fetch error: ${msg}`);
        return null;
    }
}

// --- Report Formatting ---

function formatReport(report: FeatureSyncReport): string {
    const lines: string[] = [];

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push('║           CC FEATURE SYNC REPORT                             ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`Generated: ${report.timestamp}`);
    lines.push(`Changelog latest version: ${report.changelogVersion ?? 'unknown'}`);
    lines.push(`Tracked features in FEATURE_REQUIREMENTS: ${report.trackedFeatureCount}\n`);

    if (report.versionGaps.length > 0) {
        lines.push(`--- VERSION GAPS (${report.versionGaps.length} changelog versions not tracked) ---\n`);
        for (const v of report.versionGaps.slice(0, 20)) {
            lines.push(`  v${v}`);
        }
        if (report.versionGaps.length > 20) {
            lines.push(`  ... and ${report.versionGaps.length - 20} more`);
        }
        lines.push('');
    } else {
        lines.push('All changelog versions have tracked entries.\n');
    }

    if (report.newCandidates.length > 0) {
        lines.push(`--- NEW FEATURE CANDIDATES (${report.newCandidates.length} untracked features) ---\n`);
        for (const c of report.newCandidates) {
            lines.push(`v${c.version}  [${c.suggestedKey}]`);
            lines.push(`         ${c.description}`);
        }
        lines.push('');
        lines.push('--- SUGGESTED ADDITIONS TO FEATURE_REQUIREMENTS ---\n');
        lines.push('Add these entries to cc-version-check.ts:\n');
        for (const c of report.newCandidates) {
            lines.push(`    ${c.suggestedKey}: { minVersion: '${c.version}', description: '${c.description.replace(/'/g, "\\'")}' },`);
        }
    } else {
        lines.push('No untracked feature candidates found.\n');
    }

    lines.push(`\n--- SUMMARY ---\n${report.summary}`);

    return lines.join('\n');
}

// --- Main ---

/**
 * Extract `--since-baseline <version>` from argv. Returns the version string
 * or null when the flag is absent. `=` form (`--since-baseline=2.1.98`) is
 * also supported.
 */
export function parseBaselineArg(argv: string[]): string | null {
    const eqForm = argv.find(a => a.startsWith('--since-baseline='));
    if (eqForm) return eqForm.slice('--since-baseline='.length) || null;
    const idx = argv.indexOf('--since-baseline');
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return null;
}

async function main(): Promise<void> {
    const useJson = process.argv.includes('--json');
    const jsonOnly = process.argv.includes('--json-only');
    const baseline = parseBaselineArg(process.argv);

    if (!jsonOnly) console.log('Fetching CC CHANGELOG.md from GitHub...\n');

    const content = await fetchChangelog();

    if (!content) {
        if (!jsonOnly) {
            console.error('[warn] Could not fetch changelog — operating in offline mode');
            console.log('\n--- TRACKED FEATURES (local only, no remote data) ---\n');
            const keys = Object.keys(FEATURE_REQUIREMENTS);
            for (const key of keys) {
                const req = FEATURE_REQUIREMENTS[key];
                console.log(`  ${key.padEnd(28)} v${req.minVersion}+  ${req.description}`);
            }
        } else {
            // In json-only mode emit an empty report so callers have valid JSON.
            const emptyReport: FeatureSyncReport = {
                timestamp: new Date().toISOString(),
                changelogVersion: null,
                trackedFeatureCount: Object.keys(FEATURE_REQUIREMENTS).length,
                newCandidates: [],
                versionGaps: [],
                summary: 'offline: could not fetch changelog',
            };
            console.log(JSON.stringify(emptyReport, null, 2));
        }
        process.exit(0);
    }

    const allEntries = parseChangelog(content);
    log(`Parsed ${allEntries.length} changelog sections`);
    const entries = filterSinceBaseline(allEntries, baseline);
    if (baseline) log(`Filtered to ${entries.length} entries since baseline v${baseline}`);

    // Latest version always taken from the full set — baseline filtering only
    // narrows the candidates/gaps we emit, not the "what's the newest CC" fact.
    const latestVersion = allEntries[0]?.version ?? null;
    const newCandidates = findNewCandidates(entries);
    const versionGaps = findVersionGaps(entries);

    const baselineNote = baseline ? ` (since v${baseline})` : '';
    const summary = [
        `${entries.length} changelog sections parsed${baselineNote}.`,
        `${versionGaps.length} versions in changelog not covered by FEATURE_REQUIREMENTS.`,
        `${newCandidates.length} potential new features not yet tracked.`,
        newCandidates.length > 0
            ? 'Review suggested additions above and update cc-version-check.ts as needed.'
            : 'FEATURE_REQUIREMENTS appears up to date.',
    ].join(' ');

    const report: FeatureSyncReport = {
        timestamp: new Date().toISOString(),
        changelogVersion: latestVersion,
        trackedFeatureCount: Object.keys(FEATURE_REQUIREMENTS).length,
        newCandidates,
        versionGaps,
        summary,
    };

    if (jsonOnly) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    console.log(formatReport(report));

    if (useJson) {
        console.log('\n--- JSON OUTPUT ---\n');
        console.log(JSON.stringify(report, null, 2));
    }
}

// Exports for testing (pure functions)
export {
    parseChangelog,
    isFeatureLine,
    isBugfix,
    toSuggestedKey,
    findNewCandidates,
    findVersionGaps,
    formatReport,
    type ChangelogEntry,
    type FeatureSyncReport,
    type NewFeatureCandidate,
};

// Note: `filterSinceBaseline` and `parseBaselineArg` are exported inline where defined.

// Direct execution guard
const isDirectExecution =
    import.meta.path === Bun.main || process.argv[1]?.endsWith('cc-feature-sync.ts');
if (isDirectExecution && !process.env.CC_FEATURE_SYNC_NO_CLI) {
    main().catch(err => {
        console.error('[fatal]', err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
}
