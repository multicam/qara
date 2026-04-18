# cc-upgrade-review: Iterative Audit Inbox

Unifies every audit feed (cc-feature-sync, skill-pulse, analyse-pai, context-graph orphans, cross-skill-refs, advisory table refs, external-skills, feature-unused, obsolescence) into one review inbox with persistent state.

> See the workflow guide: `.claude/skills/cc-upgrade-pai/workflows/review-inbox.md`
> See the design plan: `thoughts/shared/plans/cc-upgrade-inbox--iterative-review-v1.md`

## Invocation

```bash
# Interactive plan (default): prints JSON for the agent to drive AskUserQuestion
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts

# Dry run (plan only — no state writes, no file edits)
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts --dry-run

# Auto-accept every safe-tier finding (idempotent, records decisions)
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts --accept-safe

# Queue every unsafe-tier finding to action-queue.md for JM's review
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts --queue-unsafe
```

## Interactive flow (when invoked by Claude)

1. Run the CLI in default mode — collect `plan.groups[]` (one group per feed).
2. For each group with `bulkEligible: true`, use **AskUserQuestion** with bulk options: `accept-all`, `ignore-all-variants`, `ignore-all-type`, `review-each`.
3. For `review-each` (or non-bulk groups), loop finding-by-finding with options: `accept`, `ignore-variant`, `ignore-type`, `skip`.
4. Apply decisions via `applyAccept` and record via `recordDecision` / `saveInboxState`.
5. Output: finding counts per feed, safe-tier diff summary, action-queue section count.

## State

- `~/.claude/state/cc-upgrade-inbox.json` — `{ lastReviewedVersion, reviewedKeys, grandfathered }`
- `~/.claude/state/cc-upgrade-action-queue.md` — unsafe-tier sections
- `~/.claude/state/cc-upgrade-first-seen.json` — per-feature first-seen-unused dates (obsolescence sub-check 3)

## Grandfather rule

First invocation grandfathers every non-obsolescence finding so JM doesn't drown in 60-100 pre-existing items. Obsolescence findings are exempt — they carry high-signal accumulated context that shouldn't be silently archived.

## Safety tiers

- **Safe:** `cc-feature` (append FEATURE_REQUIREMENTS), `cross-skill-unprefixed`, `advisory-table-ref`, `skill-outdated` (`npx skills update`).
- **Unsafe:** `orphan` (deletion), `pai-audit` / `external-skills` recommendations, `feature-unused`, `obsolescence`, skill-stale. These queue to `action-queue.md`.
