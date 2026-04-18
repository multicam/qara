/**
 * actions/safe.ts — Auto-apply handlers for safe-tier findings.
 *
 * Per-type handlers (one function per FeedType that has a deterministic
 * auto-edit). Each returns a DiffReport describing what would change so
 * callers can dry-run before applying.
 *
 * Handlers:
 *   - cc-feature            → append a FEATURE_REQUIREMENTS entry to
 *                             cc-version-check.ts
 *   - cross-skill-unprefixed → rewrite `<skill>/<rest>` to `../<skill>/<rest>`
 *   - advisory-table-ref    → same rewriter (same root cause)
 *   - skill-outdated        → exec `npx skills update <name>`
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import type { Finding } from '../types';

export interface DiffReport {
    finding: Finding;
    file?: string;
    before?: string;
    after?: string;
    command?: string;
    applied: boolean;
    error?: string;
}

export interface ApplyOptions {
    /** When true, compute diffs but do not write or exec. */
    dryRun?: boolean;
    /**
     * Path to cc-version-check.ts (injectable for testing). Defaults to
     * the canonical repo location.
     */
    ccVersionCheckPath?: string;
}

/**
 * Shared text-edit report builder: writes when not dryRun, returns a
 * DiffReport either way. Factoring this out keeps each text-rewrite
 * handler focused on computing `after`.
 */
function textEditReport(
    finding: Finding,
    filePath: string,
    before: string,
    after: string,
    opts: ApplyOptions,
): DiffReport {
    if (!opts.dryRun) writeFileSync(filePath, after);
    return { finding, file: filePath, before, after, applied: !opts.dryRun };
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

export function applySafeFinding(finding: Finding, opts: ApplyOptions = {}): DiffReport {
    switch (finding.feed) {
        case 'cc-feature':
            return applyCcFeatureAccept(finding, opts);
        case 'cross-skill-unprefixed':
        case 'advisory-table-ref':
            return applyCrossSkillRefRewrite(finding, opts);
        case 'skill-outdated':
            return applySkillUpdate(finding, opts);
        default:
            return {
                finding,
                applied: false,
                error: `No safe-tier handler registered for feed ${finding.feed}`,
            };
    }
}

// ── cc-feature → append to FEATURE_REQUIREMENTS ─────────────────────────────

const DEFAULT_CC_VERSION_CHECK = '.claude/skills/cc-upgrade/scripts/cc-version-check.ts';

export function applyCcFeatureAccept(finding: Finding, opts: ApplyOptions): DiffReport {
    const filePath = opts.ccVersionCheckPath ?? DEFAULT_CC_VERSION_CHECK;
    if (!existsSync(filePath)) {
        return { finding, applied: false, error: `File not found: ${filePath}` };
    }

    const data = finding.data as
        | { version?: string; suggestedKey?: string; description?: string }
        | undefined;
    const key = data?.suggestedKey;
    const version = data?.version;
    const description = data?.description;

    if (!key || !version || !description) {
        return { finding, applied: false, error: 'Missing cc-feature payload' };
    }

    const before = readFileSync(filePath, 'utf-8');
    if (before.includes(`${key}: {`)) {
        return { finding, file: filePath, before, after: before, applied: false, error: 'Key already present' };
    }

    // Append before the closing `};` of the FEATURE_REQUIREMENTS map.
    const closeIdx = findFeatureRequirementsClose(before);
    if (closeIdx < 0) {
        return { finding, applied: false, error: 'Could not locate FEATURE_REQUIREMENTS block' };
    }

    const escDesc = description.replace(/'/g, "\\'");
    const entry = `    ${key}: { minVersion: '${version}', description: '${escDesc}' },\n`;
    const after = before.slice(0, closeIdx) + entry + before.slice(closeIdx);
    return textEditReport(finding, filePath, before, after, opts);
}

/**
 * Locate the `};` that closes the FEATURE_REQUIREMENTS record definition.
 * Returns the index of the first char of that `};` or -1 when not found.
 */
function findFeatureRequirementsClose(content: string): number {
    const anchor = 'FEATURE_REQUIREMENTS';
    const anchorIdx = content.indexOf(anchor);
    if (anchorIdx < 0) return -1;
    const openIdx = content.indexOf('{', anchorIdx);
    if (openIdx < 0) return -1;

    let depth = 0;
    for (let i = openIdx; i < content.length; i++) {
        const c = content[i];
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

// ── cross-skill-unprefixed / advisory-table-ref → rewrite ──────────────────

export function applyCrossSkillRefRewrite(finding: Finding, opts: ApplyOptions): DiffReport {
    const filePath = finding.source;
    if (!existsSync(filePath)) {
        return { finding, applied: false, error: `File not found: ${filePath}` };
    }
    const ref = (finding.data?.ref as string | undefined) ?? finding.variant;
    if (!ref) return { finding, applied: false, error: 'No ref to rewrite' };

    const before = readFileSync(filePath, 'utf-8');
    const backtickRef = '`' + ref + '`';
    if (!before.includes(backtickRef)) {
        return {
            finding,
            file: filePath,
            before,
            after: before,
            applied: false,
            error: 'Ref pattern not found in file',
        };
    }
    const after = before.split(backtickRef).join('`../' + ref + '`');
    return textEditReport(finding, filePath, before, after, opts);
}

// ── skill-outdated → `npx skills update <name>` ────────────────────────────

export function applySkillUpdate(finding: Finding, opts: ApplyOptions): DiffReport {
    const name = finding.source;
    const command = `npx skills update ${name}`;
    if (opts.dryRun) return { finding, command, applied: false };
    try {
        execSync(command, { stdio: 'pipe', timeout: 60_000 });
        return { finding, command, applied: true };
    } catch (err) {
        return { finding, command, applied: false, error: err instanceof Error ? err.message : String(err) };
    }
}
