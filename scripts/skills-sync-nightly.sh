#!/usr/bin/env bash
# Nightly external skills sync.
#
# 1. Updates CLI-tracked skills via `npx skills update -y`
# 2. Detects changes per-skill (structural + Gemma semantic) BEFORE updating mirror
# 3. Atomically mirrors ~/.agents/skills into qara/.claude/skills-external
# 4. Auto-commits benign changes (chore); writes review artifact for flagged ones
#
# Cron: 0 2 * * * /home/jean-marc/qara/scripts/skills-sync-nightly.sh >> ~/.claude/state/digests/skills-sync.log 2>&1

set -euo pipefail

REPO_ROOT="/home/jean-marc/qara"
UPSTREAM_DIR="$HOME/.agents/skills"
MIRROR_DIR="$REPO_ROOT/.claude/skills-external"
REVIEW_DIR="$REPO_ROOT/thoughts/shared/introspection"
REVIEW_FILE="$REVIEW_DIR/skills-review-$(TZ=Australia/Sydney date +%Y-%m-%d).md"
LOG_PREFIX="[$(date -Iseconds)] skills-sync:"
HELPER="$REPO_ROOT/.claude/skills/cc-upgrade-pai/scripts/skills-sync-nightly-helpers.ts"

# Skills excluded from sync. JM's decisions:
#   (2026-04-15)
#   - 5 deprecated by impeccable v2.1.1: arrange, frontend-design, normalize, onboard, teach-impeccable
#   - 4 found redundant with impeccable: extract (impeccable extract subcommand), delight, distill, overdrive
#   (2026-04-16, design-skills consolidation plan v1.2)
#   - 3 merged into `tune` local skill (bolder, quieter, colorize are intensity dials)
#   - 1 absorbed into impeccable-typeset local wrapper (typeset)
# These live in ~/.agents/skills (CLI cache) but must not reach the repo mirror
# at skills-external/, and must not get symlinked into .claude/skills/.
EXCLUDED_SKILLS=(
    arrange
    frontend-design
    normalize
    onboard
    teach-impeccable
    extract
    delight
    distill
    overdrive
    bolder
    quieter
    colorize
    typeset
)

# Build rsync --exclude flags
RSYNC_EXCLUDES=()
for s in "${EXCLUDED_SKILLS[@]}"; do
    RSYNC_EXCLUDES+=(--exclude="$s/" --exclude="$s")
done
# Preserve PAI-local metadata: `.claude-plugin/plugin.json` carries the
# `maintenance: "local"` flag for skills deliberately not upstream-tracked
# (see DECISIONS.md 2026-04-15, 2026-04-18). Without this exclude, nightly
# rsync wipes the file and skill-pulse-check reverts to false-positive
# "no repository URL" errors.
RSYNC_EXCLUDES+=(--exclude=".claude-plugin/")

# Helper for the detection loop (bash's `for` should skip excluded dirs)
is_excluded() {
    local name="$1"
    for s in "${EXCLUDED_SKILLS[@]}"; do
        [ "$s" = "$name" ] && return 0
    done
    return 1
}

mkdir -p "$REVIEW_DIR"
cd "$REPO_ROOT"

echo "$LOG_PREFIX starting nightly sync"

# 1. Update upstream (idempotent; non-interactive). Non-fatal on failure.
if ! npx skills update -y >/dev/null 2>&1; then
    echo "$LOG_PREFIX npx skills update: no updates or CLI error (continuing)"
fi

# 2. Detect per skill — compare upstream state against current mirror state.
declare -A DETECT_RESULTS
CHANGED_SKILLS=()

for skill_dir in "$UPSTREAM_DIR"/*/; do
    skill_name=$(basename "$skill_dir")
    old_dir="$MIRROR_DIR/$skill_name"
    new_dir="${skill_dir%/}"

    # Skip excluded skills (deprecated or redundant)
    if is_excluded "$skill_name"; then
        continue
    fi

    # Quick short-circuit: if directories are byte-identical, skip detection.
    if [ -d "$old_dir" ] && diff -qr "$old_dir" "$new_dir" >/dev/null 2>&1; then
        continue
    fi

    DETECT_JSON=$(bun "$HELPER" detect --old "$old_dir" --new "$new_dir" 2>/dev/null \
        || echo '{"flagged":false,"reasons":[],"structuralChanges":[],"semanticChange":null}')
    DETECT_RESULTS["$skill_name"]="$DETECT_JSON"
    CHANGED_SKILLS+=("$skill_name")
done

if [ ${#CHANGED_SKILLS[@]} -eq 0 ]; then
    echo "$LOG_PREFIX no upstream changes"
    echo "$LOG_PREFIX done"
    exit 0
fi

# 3. Bulk-mirror upstream into the repo (single atomic operation).
# --delete removes anything in mirror that's not in upstream OR excluded → keeps ghosts out.
rsync -a --delete "${RSYNC_EXCLUDES[@]}" "$UPSTREAM_DIR/" "$MIRROR_DIR/"

# 3b. Reap broken symlinks in `.claude/skills/` (activation layer).
# npx skills install/uninstall churn can leave dangling `.claude/skills/<name>`
# pointing into `~/.agents/skills/` after a skill is pruned. These fail the
# skills-validation test and are invisible to rsync (which manages the mirror
# at `skills-external/`, not the activation symlinks here). Only touch symlinks
# whose target is non-existent — never a real dir or a valid symlink.
REAPED=0
for link in "$REPO_ROOT/.claude/skills/"*; do
    [ -L "$link" ] || continue
    [ -e "$link" ] && continue
    echo "$LOG_PREFIX reaping broken symlink: $(basename "$link") -> $(readlink "$link")"
    rm -f "$link"
    REAPED=$((REAPED + 1))
done
if [ "$REAPED" -gt 0 ]; then
    git add -u ".claude/skills/"
    git commit -m "chore(skills): reap $REAPED broken activation symlink(s)" --no-verify -q || true
fi

# 4. Per-skill: commit benign OR write review entry.
FLAGGED_ANY=0
CLEAN_ANY=0

for skill_name in "${CHANGED_SKILLS[@]}"; do
    DETECT_JSON="${DETECT_RESULTS[$skill_name]}"
    FLAGGED=$(echo "$DETECT_JSON" | jq -r '.flagged // false')

    if [ "$FLAGGED" = "true" ]; then
        echo "$LOG_PREFIX flagged: $skill_name"
        FLAGGED_ANY=1
        DIFF_EXCERPT=$(git diff --no-color -- ".claude/skills-external/$skill_name/SKILL.md" 2>/dev/null | head -80)
        bun "$HELPER" render \
            --name "$skill_name" \
            --detect "$DETECT_JSON" \
            --diff "$DIFF_EXCERPT" \
            >> "$REVIEW_FILE"
        # Leave uncommitted; Claude weekly review will commit/branch/reject.
    else
        SHA_SHORT=$(find "$MIRROR_DIR/$skill_name" -type f -exec sha256sum {} + | sha256sum | cut -c1-8)
        git add ".claude/skills-external/$skill_name"
        git commit -m "chore(skills-external): sync $skill_name@$SHA_SHORT" --no-verify -q || true
        echo "$LOG_PREFIX auto-committed: $skill_name@$SHA_SHORT"
        CLEAN_ANY=1
    fi
done

if [ "$FLAGGED_ANY" -eq 1 ]; then
    echo "$LOG_PREFIX review required: $REVIEW_FILE"
fi

echo "$LOG_PREFIX done"
