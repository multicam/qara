/**
 * cc-upgrade-inbox review orchestration — integration tests.
 *
 * Covers:
 *   - aggregation (suppression, grouping, bulk-eligibility)
 *   - safe-tier accept (dry-run diffs + real apply)
 *   - unsafe-tier queue (action-queue.md section)
 *   - bulk decision routing
 *   - full review-cli loop over a synthetic state directory (ignore
 *     persistence across two invocations)
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { aggregateFindings, BULK_THRESHOLD } from '../hooks/lib/cc-upgrade-inbox/aggregate';
import {
    applyCcFeatureAccept,
    applyCrossSkillRefRewrite,
    applySafeFinding,
} from '../hooks/lib/cc-upgrade-inbox/actions/safe';
import { queueUnsafeFinding } from '../hooks/lib/cc-upgrade-inbox/actions/unsafe';
import {
    applyBulkDecision,
    applyAccept,
    buildPlan,
    gatherAllFindings,
} from '../hooks/lib/cc-upgrade-inbox/review-cli';
import { emptyInboxState } from '../hooks/lib/cc-upgrade-inbox/types';
import {
    loadInboxState,
    saveInboxState,
    recordDecision,
} from '../hooks/lib/cc-upgrade-inbox/state';
import type { Finding, InboxState } from '../hooks/lib/cc-upgrade-inbox/types';

// Suppress CLI side effects from transitive imports.
process.env.CC_UPGRADE_REVIEW_NO_CLI = '1';
process.env.CC_FEATURE_SYNC_NO_CLI = '1';

let workDir: string;

beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'inbox-review-'));
});

afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
});

// ── Fixture helpers ────────────────────────────────────────────────────────

function makeFinding(
    feed: Finding['feed'],
    id: string,
    overrides: Partial<Finding> = {},
): Finding {
    return {
        id,
        feed,
        source: `/fake/${id}`,
        message: `test finding ${id}`,
        severity: 'info',
        tier: 'safe',
        ...overrides,
    };
}

/** Seed a minimal cc-version-check.ts fixture and return its path. */
function writeCcVersionCheckFixture(existing: 'existing' | 'newFlag' = 'existing'): string {
    const filePath = join(workDir, 'cc-version-check.ts');
    writeFileSync(
        filePath,
        `export const FEATURE_REQUIREMENTS = {\n    ${existing}: { minVersion: '${existing === 'newFlag' ? '9.9.9' : '2.0.0'}', description: 'x' },\n};\n`,
    );
    return filePath;
}

function newFlagFinding(): Finding {
    return makeFinding('cc-feature', 'cc-feature:newFlag', {
        data: { version: '9.9.9', suggestedKey: 'newFlag', description: 'Shiny new' },
    });
}

// ── aggregateFindings ──────────────────────────────────────────────────────

describe('aggregateFindings', () => {
    it('groups by feed and marks bulk-eligible groups', () => {
        const findings: Finding[] = [];
        for (let i = 0; i < BULK_THRESHOLD; i++) {
            findings.push(makeFinding('cc-feature', `cc-feature:f${i}`));
        }
        findings.push(makeFinding('orphan', 'orphan:x', { tier: 'unsafe' }));

        const agg = aggregateFindings(findings, emptyInboxState());
        const ccGroup = agg.groups.find(g => g.feed === 'cc-feature');
        const orphanGroup = agg.groups.find(g => g.feed === 'orphan');

        expect(ccGroup?.bulkEligible).toBe(true);
        expect(orphanGroup?.bulkEligible).toBe(false);
    });

    it('suppresses findings the user has already ignored', () => {
        const finding = makeFinding('cc-feature', 'cc-feature:x');
        const state: InboxState = {
            ...emptyInboxState(),
            reviewedKeys: [
                { id: finding.id, decision: 'ignore-variant', timestamp: 't' },
            ],
        };
        const agg = aggregateFindings([finding], state);
        expect(agg.allFindings).toEqual([]);
        expect(agg.suppressed.length).toBe(1);
    });

    it('deduplicates by ID', () => {
        const a = makeFinding('cc-feature', 'cc-feature:x');
        const b = makeFinding('cc-feature', 'cc-feature:x');
        const agg = aggregateFindings([a, b], emptyInboxState());
        expect(agg.allFindings.length).toBe(1);
    });
});

// ── Safe-tier: cc-feature append ───────────────────────────────────────────

describe('applyCcFeatureAccept', () => {
    it('dry-run computes the diff without writing', () => {
        const filePath = writeCcVersionCheckFixture();
        const report = applyCcFeatureAccept(newFlagFinding(), {
            dryRun: true,
            ccVersionCheckPath: filePath,
        });
        expect(report.applied).toBe(false);
        expect(report.after).toContain("newFlag: { minVersion: '9.9.9',");
        expect(readFileSync(filePath, 'utf-8')).not.toContain('newFlag');
    });

    it('write mode mutates the file', () => {
        const filePath = writeCcVersionCheckFixture();
        applyCcFeatureAccept(newFlagFinding(), { ccVersionCheckPath: filePath });
        expect(readFileSync(filePath, 'utf-8')).toContain("newFlag: { minVersion: '9.9.9',");
    });

    it('is idempotent — will not re-append an existing key', () => {
        const filePath = writeCcVersionCheckFixture('newFlag');
        const report = applyCcFeatureAccept(newFlagFinding(), { ccVersionCheckPath: filePath });
        expect(report.applied).toBe(false);
        expect(report.error).toMatch(/already present/i);
    });
});

// ── Safe-tier: cross-skill ref rewrite ─────────────────────────────────────

describe('applyCrossSkillRefRewrite', () => {
    it('rewrites unprefixed table ref to `../<ref>`', () => {
        const filePath = join(workDir, 'SKILL.md');
        writeFileSync(filePath, '| Topic | `impeccable/reference/X.md` |\n');

        const finding = makeFinding('cross-skill-unprefixed', 'x', {
            source: filePath,
            variant: 'impeccable/reference/X.md',
            data: { ref: 'impeccable/reference/X.md' },
        });

        applyCrossSkillRefRewrite(finding, {});
        expect(readFileSync(filePath, 'utf-8')).toContain('`../impeccable/reference/X.md`');
    });

    it('reports an error when the pattern is not present', () => {
        const filePath = join(workDir, 'SKILL.md');
        writeFileSync(filePath, 'nothing to rewrite here');

        const finding = makeFinding('cross-skill-unprefixed', 'x', {
            source: filePath,
            data: { ref: 'nope/nope.md' },
        });

        const report = applyCrossSkillRefRewrite(finding, {});
        expect(report.applied).toBe(false);
        expect(report.error).toBeDefined();
    });
});

// ── Unsafe-tier: queue ─────────────────────────────────────────────────────

describe('queueUnsafeFinding', () => {
    it('writes a new section to the action queue file', () => {
        const queuePath = join(workDir, 'action-queue.md');
        const finding = makeFinding('orphan', 'orphan:x', {
            tier: 'unsafe',
            severity: 'warning',
        });

        queueUnsafeFinding(finding, { queuePath, now: new Date('2026-04-18T00:00:00Z') });

        const content = readFileSync(queuePath, 'utf-8');
        expect(content).toContain('# CC-Upgrade Action Queue');
        expect(content).toContain('## orphan:x');
        expect(content).toContain('**Feed:** orphan');
    });

    it('appends instead of overwriting on subsequent calls', () => {
        const queuePath = join(workDir, 'action-queue.md');
        const a = makeFinding('orphan', 'a', { tier: 'unsafe' });
        const b = makeFinding('orphan', 'b', { tier: 'unsafe' });
        queueUnsafeFinding(a, { queuePath });
        queueUnsafeFinding(b, { queuePath });
        const content = readFileSync(queuePath, 'utf-8');
        expect(content).toContain('## a');
        expect(content).toContain('## b');
    });
});

// ── Dispatcher + applyAccept ───────────────────────────────────────────────

describe('applyAccept', () => {
    it('routes safe-tier to applySafeFinding', () => {
        const filePath = join(workDir, 'SKILL.md');
        writeFileSync(filePath, '| `impeccable/reference/X.md` |');
        const finding = makeFinding('cross-skill-unprefixed', 'x', {
            tier: 'safe',
            source: filePath,
            data: { ref: 'impeccable/reference/X.md' },
        });
        const queuePath = join(workDir, 'action-queue.md');
        const report = applyAccept(finding, queuePath);
        expect(report.applied).toBe(true);
        expect(existsSync(queuePath)).toBe(false); // safe path did not touch queue
    });

    it('routes unsafe-tier to queueUnsafeFinding', () => {
        const queuePath = join(workDir, 'action-queue.md');
        const finding = makeFinding('orphan', 'orphan:x', { tier: 'unsafe' });
        applyAccept(finding, queuePath);
        expect(existsSync(queuePath)).toBe(true);
    });
});

// ── Bulk decision routing ──────────────────────────────────────────────────

describe('applyBulkDecision', () => {
    it('ignore-all-variants records one ignore per finding', () => {
        const findings = Array.from({ length: 3 }, (_, i) =>
            makeFinding('cc-feature', `cc-feature:f${i}`),
        );
        const group = { feed: 'cc-feature' as const, findings, bulkEligible: false };
        const { state } = applyBulkDecision(
            group,
            'ignore-all-variants',
            emptyInboxState(),
            join(workDir, 'queue.md'),
        );
        expect(state.reviewedKeys.filter(k => k.decision === 'ignore-variant').length).toBe(3);
    });

    it('ignore-all-type records one ignore-type key per (feed, source) pair', () => {
        const findings = [
            makeFinding('cc-feature', 'f1', { source: '/a' }),
            makeFinding('cc-feature', 'f2', { source: '/a' }),
        ];
        const group = { feed: 'cc-feature' as const, findings, bulkEligible: false };
        const { state } = applyBulkDecision(
            group,
            'ignore-all-type',
            emptyInboxState(),
            join(workDir, 'queue.md'),
        );
        expect(state.reviewedKeys.every(k => k.decision === 'ignore-type-for-resource')).toBe(true);
    });

    it('review-each returns the original state untouched', () => {
        const finding = makeFinding('cc-feature', 'f1');
        const group = { feed: 'cc-feature' as const, findings: [finding], bulkEligible: false };
        const { state, applied } = applyBulkDecision(
            group,
            'review-each',
            emptyInboxState(),
            join(workDir, 'queue.md'),
        );
        expect(state).toEqual(emptyInboxState());
        expect(applied).toEqual([]);
    });
});

// ── buildPlan ──────────────────────────────────────────────────────────────

describe('buildPlan', () => {
    it('aggregates totals and preserves group metadata', () => {
        const groups = [
            { feed: 'cc-feature' as const, findings: [makeFinding('cc-feature', 'a')], bulkEligible: false },
        ];
        const plan = buildPlan(groups, ['warning 1']);
        expect(plan.totalFindings).toBe(1);
        expect(plan.warnings).toEqual(['warning 1']);
        expect(plan.groups[0].count).toBe(1);
    });
});

// ── Ignore persistence across two invocations (the acceptance test) ────────

describe('ignore persists across invocations', () => {
    it('a finding ignored on run 1 is not returned on run 2', () => {
        const statePath = join(workDir, 'inbox.json');

        // Run 1: finding present, user ignores it.
        const findings: Finding[] = [makeFinding('cc-feature', 'cc-feature:flag1')];
        let state = loadInboxState(statePath);
        const agg1 = aggregateFindings(findings, state);
        expect(agg1.allFindings.length).toBe(1);
        state = recordDecision(state, {
            id: 'cc-feature:flag1',
            decision: 'ignore-variant',
            timestamp: new Date().toISOString(),
        });
        saveInboxState(statePath, state);

        // Run 2: same feed emits same finding, but it's suppressed now.
        const stateRun2 = loadInboxState(statePath);
        const agg2 = aggregateFindings(findings, stateRun2);
        expect(agg2.allFindings).toEqual([]);
        expect(agg2.suppressed.length).toBe(1);
    });
});

// ── gatherAllFindings injection path ───────────────────────────────────────

describe('gatherAllFindings (injected)', () => {
    it('returns injected findings when provided, bypassing real feeds', async () => {
        const injected = [makeFinding('cc-feature', 'inj:1')];
        const result = await gatherAllFindings(emptyInboxState(), {
            injected: { rawFindings: injected },
        });
        expect(result.findings).toEqual(injected);
        expect(result.warnings).toEqual([]);
    });
});

// Keep `applySafeFinding` type-checked — the dispatcher test at applyAccept
// exercises it indirectly, but an explicit call guards against accidental
// removal from the public surface.
describe('applySafeFinding dispatcher', () => {
    it('returns an error DiffReport for unknown feeds', () => {
        const finding = makeFinding('pai-audit', 'pai-audit:x');
        const report = applySafeFinding(finding);
        expect(report.applied).toBe(false);
        expect(report.error).toMatch(/No safe-tier handler/);
    });
});
