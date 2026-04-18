# review-inbox — iterative review of every audit feed

Unifies 8 existing audit feeds + 1 new obsolescence detector into one inbox with persistent state. Replaces the old "pick the terminal spam back up every Monday" loop with stable, suppressible, tiered decisions.

## When to use

- Monthly evolve (`introspect/workflows/monthly-evolve.md` step 3)
- After a `bun run .claude/skills/cc-upgrade-pai/scripts/analyse-pai.ts .` that surfaces new recommendations
- Any time the user says *cc upgrade review*, *review inbox*, *audit inbox*

## Sources

| Feed | Upstream | Tier |
|---|---|---|
| `cc-feature` | `cc-feature-sync.ts` changelog diff | safe |
| `orphan` | `context-graph findOrphans` unreferenced files | unsafe |
| `broken-ref` | `context-graph findOrphans` broken refs | unsafe |
| `advisory-table-ref` | `extractAdvisoryBrokenTableRefs` | safe |
| `cross-skill-unprefixed` | `validateCrossSkillRefs` | safe |
| `skill-outdated` | `skill-pulse-lib` upstream check (skips `maintenance: local`) | safe |
| `skill-stale` | `skill-pulse-lib` 90-day stale | unsafe |
| `pai-audit` | `analyse-pai` recommendations | unsafe |
| `external-skills` | `analyse-external-skills` recommendations | unsafe |
| `feature-unused` | `cc-version-check` `[OK] [    ]` entries | unsafe |
| `obsolescence` | new detector (hooks, MCP, features unused 180d, CLAUDE.md dups) | unsafe |
| `orphaned-ignore` | meta-check surfacing stale suppressions | safe |

## Invocation

```bash
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts            # interactive plan
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts --dry-run  # no writes
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts --accept-safe
bun run .claude/hooks/lib/cc-upgrade-inbox/review-cli.ts --queue-unsafe
```

## Flow (interactive)

1. CLI prints JSON plan grouped by feed.
2. For each group with `bulkEligible: true` (≥5 findings), call `AskUserQuestion` with bulk options: `accept-all`, `ignore-all-variants`, `ignore-all-type`, `review-each`.
3. For non-bulk groups or `review-each`, loop finding-by-finding: `accept`, `ignore-variant`, `ignore-type`, `skip`.
4. Safe-tier `accept` → `applySafeFinding` writes in place. Unsafe-tier `accept` → append to `action-queue.md`.
5. Decisions persist via `saveInboxState` so future runs suppress them.

## First-run grandfather

Every non-obsolescence finding on the first invocation is grandfathered (silently acknowledged) so JM doesn't face 60-100 pre-existing items. Obsolescence findings are exempt — they carry high-signal accumulated context. Subsequent runs surface only genuinely new findings (or obsolescence updates).

## Decisions — two ignore modes

- **`ignore-variant`** — suppress exactly this finding ID. Future variants against the same resource still surface.
- **`ignore-type-for-resource`** — suppress every variant of this (feed, resource) pair. Useful when the whole resource is deliberately non-standard.

## State locations

- `~/.claude/state/cc-upgrade-inbox.json` — `{ version, lastReviewedVersion, reviewedKeys, grandfathered }`
- `~/.claude/state/cc-upgrade-action-queue.md` — unsafe-tier queue, one section per finding
- `~/.claude/state/cc-upgrade-first-seen.json` — per-feature first-seen-unused (obsolescence sub-check 3)

## Canonicalisation

Findings inside a skill use ID form `skill:<skillName>:<relPath>` — survives file moves within a skill's subdirectories. Renaming the skill itself (or moving out of the skill) generates a new ID and re-surfaces the finding, which is the correct behaviour for a path-keyed decision.

## Orphaned-ignore meta-finding

If a user ignored a finding whose source file was later deleted, the ignore entry becomes orphaned. Every inbox run detects these and emits an `orphaned-ignore` finding so JM can revisit and clean up the stale decision.
