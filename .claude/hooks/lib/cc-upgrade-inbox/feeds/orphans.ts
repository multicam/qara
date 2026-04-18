/**
 * Feed: orphan
 *
 * Wraps context-graph's `findOrphans` output. Emits:
 *   - one `orphan` finding per unreferenced file (no incoming edges)
 *   - one `broken-ref` finding per broken reference (strict)
 *
 * Advisory broken table refs are emitted by the `advisory-refs` feed so the
 * two concerns stay categorised independently in the inbox.
 */

import type { OrphanReport } from '../../context-graph/types';
import type { Finding } from '../types';
import { canonicalizeSource } from '../state';

export interface OrphansFeedInput {
    orphanReport: OrphanReport;
    skillsDir: string;
}

export function orphansFeed(input: OrphansFeedInput): Finding[] {
    const findings: Finding[] = [];

    for (const node of input.orphanReport.unreferencedFiles) {
        const canonical = canonicalizeSource(node.id, input.skillsDir);
        findings.push({
            id: `orphan:${canonical}`,
            feed: 'orphan',
            source: node.id,
            skillName: node.skillName,
            message: `Unreferenced file: ${node.relativePath} (no incoming references)`,
            severity: 'warning',
            tier: 'unsafe', // deletion is destructive — queue for JM review
            data: { relativePath: node.relativePath, kind: node.kind },
        });
    }

    for (const ref of input.orphanReport.brokenReferences) {
        const canonical = canonicalizeSource(ref.source, input.skillsDir);
        findings.push({
            id: `broken-ref:${canonical}:${ref.target}`,
            feed: 'orphan',
            source: ref.source,
            variant: ref.target,
            message: `Broken reference from ${ref.source} → ${ref.target} (line ${ref.lineNumber})`,
            severity: 'error',
            tier: 'unsafe',
            data: { target: ref.target, lineNumber: ref.lineNumber },
        });
    }

    return findings;
}
