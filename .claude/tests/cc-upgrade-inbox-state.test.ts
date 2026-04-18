/**
 * cc-upgrade-inbox state library — unit tests.
 *
 * Covers:
 *   - atomic load/save round-trip
 *   - canonicalizeSource across skill-internal paths
 *   - detectOrphanedIgnores surfaces a meta-finding when an ignored
 *     path-keyed finding's target file no longer exists
 *   - isSuppressed semantics for both ignore modes
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  loadInboxState,
  saveInboxState,
  canonicalizeSource,
  detectOrphanedIgnores,
  isSuppressed,
  recordDecision,
  clearGrandfathered,
} from '../hooks/lib/cc-upgrade-inbox/state';
import {
  emptyInboxState,
  type InboxState,
  type ReviewedKey,
} from '../hooks/lib/cc-upgrade-inbox/types';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'inbox-state-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build an InboxState with a single reviewed key — keeps tests declarative. */
function stateWithReviewed(key: ReviewedKey, grandfathered: string[] = []): InboxState {
  return {
    version: 1,
    lastReviewedVersion: {},
    reviewedKeys: [key],
    grandfathered,
  };
}

describe('loadInboxState / saveInboxState', () => {
  it('returns an empty state when the file does not exist', () => {
    const statePath = join(workDir, 'state.json');
    const state = loadInboxState(statePath);
    expect(state.version).toBe(1);
    expect(state.reviewedKeys).toEqual([]);
    expect(state.grandfathered).toEqual([]);
    expect(state.lastReviewedVersion).toEqual({});
  });

  it('round-trips a populated state through save → load', () => {
    const statePath = join(workDir, 'state.json');
    const original: InboxState = {
      version: 1,
      lastReviewedVersion: { 'cc-feature': '2.1.98' },
      reviewedKeys: [
        {
          id: 'cc-feature:backgroundTasks',
          decision: 'ignore-variant',
          timestamp: '2026-04-18T00:00:00.000Z',
          variant: 'Adds background task support',
        },
      ],
      grandfathered: ['orphan:/some/path.md'],
    };

    saveInboxState(statePath, original);
    const loaded = loadInboxState(statePath);
    expect(loaded).toEqual(original);
  });

  it('writes atomically via temp-file + rename', () => {
    const statePath = join(workDir, 'state.json');
    const state = emptyInboxState();
    state.grandfathered = ['x'];
    saveInboxState(statePath, state);

    expect(existsSync(statePath + '.tmp')).toBe(false);
    expect(existsSync(statePath)).toBe(true);
  });

  it('recovers from corrupt JSON by returning an empty state', () => {
    const statePath = join(workDir, 'state.json');
    writeFileSync(statePath, '{not json');
    const state = loadInboxState(statePath);
    expect(state).toEqual(emptyInboxState());
  });
});

describe('canonicalizeSource', () => {
  it('returns skill:<name>:<relPath> for paths inside a skill directory', () => {
    const skillsDir = join(workDir, 'skills');
    mkdirSync(join(skillsDir, 'review', 'workflows'), { recursive: true });
    const target = join(skillsDir, 'review', 'workflows', 'quality-gates.md');
    writeFileSync(target, '# quality gates');

    const canonical = canonicalizeSource(target, skillsDir);
    expect(canonical).toBe('skill:review:workflows/quality-gates.md');
  });

  it('handles nested reference paths', () => {
    const skillsDir = join(workDir, 'skills');
    mkdirSync(join(skillsDir, 'cc-upgrade', 'references'), { recursive: true });
    const target = join(skillsDir, 'cc-upgrade', 'references', 'external-skills-registry.md');
    writeFileSync(target, '# refs');

    expect(canonicalizeSource(target, skillsDir)).toBe(
      'skill:cc-upgrade:references/external-skills-registry.md',
    );
  });

  it('returns absolute path unchanged for non-skill resources', () => {
    const contextFile = join(workDir, 'context', 'CONSTITUTION.md');
    mkdirSync(join(workDir, 'context'), { recursive: true });
    writeFileSync(contextFile, 'x');
    const skillsDir = join(workDir, 'skills');
    mkdirSync(skillsDir, { recursive: true });

    expect(canonicalizeSource(contextFile, skillsDir)).toBe(contextFile);
  });

  it('is stable when called on the same path twice', () => {
    const skillsDir = join(workDir, 'skills');
    mkdirSync(join(skillsDir, 'review', 'workflows'), { recursive: true });
    const path = join(skillsDir, 'review', 'workflows', 'quality-gates.md');
    writeFileSync(path, 'x');

    const first = canonicalizeSource(path, skillsDir);
    const second = canonicalizeSource(path, skillsDir);
    expect(first).toBe(second);
  });
});

describe('detectOrphanedIgnores', () => {
  it('returns an empty list when every ignored finding still resolves', () => {
    const skillsDir = join(workDir, 'skills');
    mkdirSync(join(skillsDir, 'review', 'workflows'), { recursive: true });
    const target = join(skillsDir, 'review', 'workflows', 'alive.md');
    writeFileSync(target, 'x');

    const state = stateWithReviewed({
      id: 'skill:review:workflows/alive.md',
      decision: 'ignore-variant',
      timestamp: '2026-04-01T00:00:00.000Z',
      source: target,
    });

    expect(detectOrphanedIgnores(state, skillsDir)).toEqual([]);
  });

  it('surfaces an orphaned-ignore finding when the referenced file no longer exists', () => {
    const skillsDir = join(workDir, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    const missing = join(workDir, 'context', 'gone.md');

    const state = stateWithReviewed({
      id: 'orphan:' + missing,
      decision: 'ignore-variant',
      timestamp: '2026-04-01T00:00:00.000Z',
      source: missing,
    });

    const orphans = detectOrphanedIgnores(state, skillsDir);
    expect(orphans.length).toBe(1);
    expect(orphans[0].feed).toBe('orphaned-ignore');
    expect(orphans[0].source).toBe(missing);
    expect(orphans[0].data?.ignoredId).toBe('orphan:' + missing);
  });

  it('ignores accepted decisions (they should not orphan)', () => {
    const skillsDir = join(workDir, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    const missing = join(workDir, 'gone.md');

    const state = stateWithReviewed({
      id: 'orphan:' + missing,
      decision: 'accepted',
      timestamp: '2026-04-01T00:00:00.000Z',
      source: missing,
    });

    expect(detectOrphanedIgnores(state, skillsDir)).toEqual([]);
  });
});

describe('isSuppressed', () => {
  const finding = {
    id: 'cross-skill-unprefixed:skill:review:SKILL.md:impeccable/reference/X.md',
    feed: 'cross-skill-unprefixed' as const,
    source: '/skills/review/SKILL.md',
    skillName: 'review',
    variant: 'impeccable/reference/X.md',
    message: 'example',
    severity: 'warning' as const,
    tier: 'safe' as const,
  };

  it('suppresses an exact variant match', () => {
    const state = stateWithReviewed({
      id: finding.id,
      decision: 'ignore-variant',
      timestamp: 't',
    });
    expect(isSuppressed(finding, state)).toBe(true);
  });

  it('suppresses any variant when ignore-type-for-resource is set', () => {
    const state = stateWithReviewed({
      id: 'type-lock',
      decision: 'ignore-type-for-resource',
      timestamp: 't',
      feed: 'cross-skill-unprefixed',
      source: '/skills/review/SKILL.md',
    });
    expect(isSuppressed(finding, state)).toBe(true);

    // A different variant against the same resource is still suppressed.
    const otherVariant = {
      ...finding,
      id: finding.id + 'v2',
      variant: 'impeccable/reference/Y.md',
    };
    expect(isSuppressed(otherVariant, state)).toBe(true);
  });

  it('does not suppress when nothing matches', () => {
    expect(isSuppressed(finding, emptyInboxState())).toBe(false);
  });

  it('suppresses grandfathered IDs', () => {
    const state: InboxState = { ...emptyInboxState(), grandfathered: [finding.id] };
    expect(isSuppressed(finding, state)).toBe(true);
  });
});

describe('recordDecision', () => {
  it('appends a decision and returns the new state (does not mutate input)', () => {
    const before = emptyInboxState();
    const after = recordDecision(before, {
      id: 'cc-feature:checkpoints',
      decision: 'accepted',
      timestamp: '2026-04-18T00:00:00.000Z',
    });
    expect(before.reviewedKeys.length).toBe(0);
    expect(after.reviewedKeys.length).toBe(1);
    expect(after.reviewedKeys[0].decision).toBe('accepted');
  });
});

describe('clearGrandfathered', () => {
  it('empties the grandfathered list', () => {
    const state: InboxState = { ...emptyInboxState(), grandfathered: ['a', 'b'] };
    const cleared = clearGrandfathered(state);
    expect(cleared.grandfathered).toEqual([]);
    expect(state.grandfathered.length).toBe(2);
  });
});
