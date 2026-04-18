/**
 * cc-upgrade-inbox/types.ts
 *
 * Type definitions for the iterative review inbox that unifies findings
 * from cc-feature-sync, skill-pulse, analyse-pai, context-graph orphans,
 * cross-skill ref validation, advisory table refs, external-skills audit,
 * and a new obsolescence detector.
 *
 * See: thoughts/shared/plans/cc-upgrade-inbox--iterative-review-v1.md
 */

/** One of the 8 audit feeds + 1 meta-check that emits findings. */
export type FeedType =
  | 'cc-feature'
  | 'orphan'
  | 'advisory-table-ref'
  | 'cross-skill-unprefixed'
  | 'skill-outdated'
  | 'pai-audit'
  | 'external-skills'
  | 'feature-unused'
  | 'obsolescence'
  | 'orphaned-ignore';

/**
 * Severity — maps loosely to finding impact. Used only for sort order and
 * display. Not enforced as policy.
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * Tier — dictates accept semantics. `safe` auto-applies in-session.
 * `unsafe` appends to action-queue.md for out-of-session review.
 */
export type Tier = 'safe' | 'unsafe';

/**
 * Normalised shape every feed emits.
 *
 * `id` is the stable key used for ignore/grandfather state. For findings
 * inside a skill the canonical form is `skill:<skillName>:<relPath>`
 * (survives file moves within the skill). For findings outside skills the
 * form is `<feedType>:<absolutePath>` or a feed-specific form.
 */
export interface Finding {
  /** Stable canonical ID — see canonicalizeSource(). */
  id: string;
  /** Which feed emitted this finding. */
  feed: FeedType;
  /** Resource the finding attaches to (absolute path, or feed-specific). */
  source: string;
  /** Skill name when `source` is inside a skill, else undefined. */
  skillName?: string;
  /**
   * Optional variant suffix — when the same (feed, source) pair can emit
   * multiple distinct findings, the variant disambiguates them.
   * Example: advisory-table-ref finding includes the ref string as variant
   * so separate unresolved refs in one file are tracked independently.
   */
  variant?: string;
  /** Human-readable message for AskUserQuestion prompts. */
  message: string;
  severity: Severity;
  tier: Tier;
  /** Feed-specific payload the action handlers consume. */
  data?: Record<string, unknown>;
}

/** Decision the user made about a surfaced finding. */
export type Decision =
  | 'ignore-variant'           // stop asking about this specific variant
  | 'ignore-type-for-resource' // stop asking about this feed+resource pair
  | 'accepted';                // accepted (action taken or queued)

/** Persisted record of a past decision. */
export interface ReviewedKey {
  id: string;
  decision: Decision;
  timestamp: string;
  /** Variant content at ignore time — used by orphaned-ignore detection. */
  variant?: string;
  /**
   * When decision is `ignore-type-for-resource`, this records the
   * (feed, source) pair the user silenced. Other variants against the same
   * pair should also be suppressed.
   */
  feed?: FeedType;
  source?: string;
}

/**
 * Persisted baseline per-feed. The exact semantics of the value depend on
 * the feed — for cc-feature it's a CC version, for skill-outdated it's a
 * per-skill upstream SHA map serialised as JSON, etc.
 */
export type FeedBaselines = Partial<Record<FeedType, string>>;

/** On-disk shape of the inbox state file. */
export interface InboxState {
  version: 1;
  /** Per-feed last-reviewed watermark. */
  lastReviewedVersion: FeedBaselines;
  /** Every explicit user decision, newest last. */
  reviewedKeys: ReviewedKey[];
  /**
   * IDs deferred at first-run that should be cleared on next run
   * (decision X: obsolescence findings are exempt from grandfathering).
   */
  grandfathered: string[];
}

/** Freshly-constructed empty state. */
export function emptyInboxState(): InboxState {
  return {
    version: 1,
    lastReviewedVersion: {},
    reviewedKeys: [],
    grandfathered: [],
  };
}
