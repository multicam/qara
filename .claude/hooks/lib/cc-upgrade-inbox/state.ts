/**
 * cc-upgrade-inbox/state.ts
 *
 * Persisted review state + helpers:
 *   - atomic load/save (temp-file + rename so parallel runs cannot observe
 *     a partial JSON write)
 *   - canonicalizeSource — `skill:<name>:<relPath>` for skill-internal
 *     findings, absolute path otherwise
 *   - detectOrphanedIgnores — meta-finding per ignored ID whose `source`
 *     no longer exists on disk
 *   - isSuppressed — unified check covering ignore-variant,
 *     ignore-type-for-resource, and grandfathered
 *
 * See: thoughts/shared/plans/cc-upgrade-inbox--iterative-review-v1.md
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { dirname, relative, sep, isAbsolute } from 'path';
import {
  emptyInboxState,
  type InboxState,
  type ReviewedKey,
  type Finding,
} from './types';

// ── Persistence ─────────────────────────────────────────────────────────────

/**
 * Load the inbox state from disk. Returns a fresh empty state when the file
 * is missing or the JSON is unreadable — corruption should never block a
 * review, it should just reset the watermark.
 */
export function loadInboxState(filePath: string): InboxState {
  if (!existsSync(filePath)) return emptyInboxState();
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<InboxState>;
    if (parsed.version !== 1) return emptyInboxState();
    return {
      version: 1,
      lastReviewedVersion: parsed.lastReviewedVersion ?? {},
      reviewedKeys: parsed.reviewedKeys ?? [],
      grandfathered: parsed.grandfathered ?? [],
    };
  } catch {
    return emptyInboxState();
  }
}

/**
 * Save the inbox state atomically — write to a sibling `.tmp` file then
 * rename. POSIX rename is atomic so concurrent readers either see the old
 * file or the new one, never a partial JSON tree.
 */
export function saveInboxState(filePath: string, state: InboxState): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, filePath);
}

// ── Canonicalisation ────────────────────────────────────────────────────────

/**
 * Canonicalise a source path.
 *
 * - If the file is inside `skillsDir`, returns `skill:<skillName>:<relPath>`.
 *   This is move-safe for reorganisation within a skill: renaming the
 *   containing skill directory breaks the ID (intentional — it's a
 *   different resource), but reorg within the skill preserves ignore
 *   decisions as long as the file itself isn't moved.
 * - Otherwise returns the absolute path unchanged.
 */
export function canonicalizeSource(absPath: string, skillsDir: string): string {
  if (!isAbsolute(absPath) || !isAbsolute(skillsDir)) return absPath;

  const rel = relative(skillsDir, absPath);
  // If the relative path starts with `..` or is absolute, the file is not
  // under skillsDir.
  if (rel.startsWith('..') || isAbsolute(rel)) return absPath;

  const parts = rel.split(sep);
  if (parts.length < 2) return absPath; // e.g. directly in skillsDir
  const [skillName, ...rest] = parts;
  if (!skillName) return absPath;
  return `skill:${skillName}:${rest.join('/')}`;
}

// ── Suppression ─────────────────────────────────────────────────────────────

/**
 * Is this finding suppressed by persisted state?
 *
 * Suppressed iff:
 *   - its ID is in `grandfathered`, OR
 *   - an `ignore-variant` decision exists for the same ID, OR
 *   - an `ignore-type-for-resource` decision matches the (feed, source) pair.
 */
export function isSuppressed(finding: Finding, state: InboxState): boolean {
  if (state.grandfathered.includes(finding.id)) return true;

  for (const key of state.reviewedKeys) {
    if (key.decision === 'ignore-variant' && key.id === finding.id) return true;
    if (
      key.decision === 'ignore-type-for-resource' &&
      key.feed === finding.feed &&
      key.source === finding.source
    ) {
      return true;
    }
  }

  return false;
}

// ── Orphaned-ignore detection ───────────────────────────────────────────────

/**
 * Produce a meta-finding per ignored decision whose `source` no longer
 * exists on disk. Gives the user a chance to revisit stale suppressions.
 *
 * Only inspects `ignore-variant` and `ignore-type-for-resource` entries —
 * `accepted` entries are historical and not orphan-candidates.
 */
export function detectOrphanedIgnores(
  state: InboxState,
  _skillsDir: string,
): Finding[] {
  const orphans: Finding[] = [];
  for (const key of state.reviewedKeys) {
    if (key.decision !== 'ignore-variant' && key.decision !== 'ignore-type-for-resource') {
      continue;
    }
    const source = key.source;
    if (!source) continue; // ID-only entries can't be orphan-checked
    // Only check concrete filesystem paths — skill:<name>:... canonical IDs
    // are validated separately by a future canonicalisation-health check.
    if (!isAbsolute(source)) continue;
    if (existsSync(source)) continue;

    orphans.push({
      id: `orphaned-ignore:${key.id}`,
      feed: 'orphaned-ignore',
      source,
      message: `Ignored finding ${key.id} references a file that no longer exists (${source}). Re-review?`,
      severity: 'info',
      tier: 'safe',
      data: { ignoredId: key.id, decision: key.decision },
    });
  }
  return orphans;
}

// ── Mutation helpers (immutable) ────────────────────────────────────────────

/** Append a decision — returns a new state, does not mutate the input. */
export function recordDecision(state: InboxState, key: ReviewedKey): InboxState {
  return {
    ...state,
    reviewedKeys: [...state.reviewedKeys, key],
  };
}

/** Clear the grandfathered list — returns a new state. */
export function clearGrandfathered(state: InboxState): InboxState {
  return { ...state, grandfathered: [] };
}
