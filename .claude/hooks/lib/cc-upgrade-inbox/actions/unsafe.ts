/**
 * actions/unsafe.ts — Queue-only handlers for unsafe-tier findings.
 *
 * Unsafe findings are judgement calls, refactors touching >3 files, or
 * have loud side-effects. The review CLI never auto-applies them —
 * instead it appends a Markdown section to `.claude/state/cc-upgrade-action-queue.md`
 * that JM works through directly.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Finding } from '../types';

export interface QueueOptions {
    /** Path to the action queue file. Injectable for tests. */
    queuePath: string;
    /** Override the timestamp used in the section header. */
    now?: Date;
}

export interface QueueResult {
    finding: Finding;
    queuedAt: string;
    queuePath: string;
    sectionBody: string;
}

/**
 * Append a new section for this finding. Each section is self-contained —
 * title, timestamp, feed, source, message, data payload — so JM can
 * resolve them one at a time without cross-referencing anything.
 */
export function queueUnsafeFinding(finding: Finding, opts: QueueOptions): QueueResult {
    const now = opts.now ?? new Date();
    const queuedAt = now.toISOString();
    const sectionBody = formatSection(finding, queuedAt);

    mkdirSync(dirname(opts.queuePath), { recursive: true });
    const existing = existsSync(opts.queuePath) ? readFileSync(opts.queuePath, 'utf-8') : HEADER;
    const next = existing.endsWith('\n') ? existing + '\n' + sectionBody : existing + '\n\n' + sectionBody;
    writeFileSync(opts.queuePath, next);

    return { finding, queuedAt, queuePath: opts.queuePath, sectionBody };
}

const HEADER = `# CC-Upgrade Action Queue\n\n> Unsafe-tier findings parked here by \`/cc-upgrade-review\`. Work through them manually. Each section can be resolved independently.\n\n`;

function formatSection(finding: Finding, queuedAt: string): string {
    const lines: string[] = [];
    lines.push(`## ${finding.id}`);
    lines.push('');
    lines.push(`- **Feed:** ${finding.feed}`);
    lines.push(`- **Severity:** ${finding.severity}`);
    lines.push(`- **Queued:** ${queuedAt}`);
    lines.push(`- **Source:** \`${finding.source}\``);
    if (finding.skillName) lines.push(`- **Skill:** ${finding.skillName}`);
    if (finding.variant) lines.push(`- **Variant:** ${finding.variant}`);
    lines.push('');
    lines.push(`**Message:** ${finding.message}`);
    if (finding.data && Object.keys(finding.data).length > 0) {
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(finding.data, null, 2));
        lines.push('```');
    }
    lines.push('');
    return lines.join('\n');
}
