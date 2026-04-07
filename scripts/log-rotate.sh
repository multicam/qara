#!/usr/bin/env bash
#
# log-rotate.sh — Rotate PAI state JSONL logs
#
# Keeps the last 7 days of entries, archives older data to gzipped files.
# Designed for cron:  0 4 * * * /home/jean-marc/qara/scripts/log-rotate.sh
#
# Factor 11 (Trigger Anywhere) — automated maintenance without human intervention.

set -euo pipefail

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
STATE_DIR="$PAI_DIR/state"
ARCHIVE_DIR="$STATE_DIR/archive"
RETENTION_DAYS=7
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%dT%H:%M:%S)
TODAY=$(date +%Y-%m-%d)
SIZE_THRESHOLD=$((1 * 1024 * 1024))  # 1MB — only rotate files above this

mkdir -p "$ARCHIVE_DIR"

rotated=0
skipped=0

for f in "$STATE_DIR"/*.jsonl; do
    [[ -f "$f" ]] || continue

    name=$(basename "$f" .jsonl)
    size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")

    # Skip small files
    if (( size < SIZE_THRESHOLD )); then
        skipped=$((skipped + 1))
        continue
    fi

    # Separate old entries (before cutoff) from recent entries
    # Expects JSONL with a "timestamp" field — if not present, keeps the line
    # Archives are grouped by ENTRY date (not rotation date) so the miner
    # can load the correct archive file for any given target date.
    tmp_recent=$(mktemp)

    # jq filters: keep lines with timestamp >= cutoff, archive the rest by entry date
    if command -v jq &>/dev/null; then
        jq -c "select(.timestamp >= \"$CUTOFF\")" "$f" > "$tmp_recent" 2>/dev/null || cp "$f" "$tmp_recent"
        # Group old entries by their actual date and archive each separately
        jq -rc "select(.timestamp < \"$CUTOFF\") | .timestamp[:10]" "$f" 2>/dev/null | sort -u | while read -r entry_date; do
            archive_file="$ARCHIVE_DIR/${name}_${entry_date}.jsonl.gz"
            jq -c "select(.timestamp >= \"${entry_date}T00:00:00\" and .timestamp < \"${entry_date}T24:00:00\")" "$f" 2>/dev/null | gzip >> "$archive_file" || true
        done
    else
        # Fallback: no jq — just compress files over threshold
        archive_file="$ARCHIVE_DIR/${name}_${TODAY}.jsonl.gz"
        gzip -c "$f" > "$archive_file"
        : > "$tmp_recent"
    fi

    # Only replace if we actually reduced the file
    recent_size=$(stat -c%s "$tmp_recent" 2>/dev/null || stat -f%z "$tmp_recent")
    if (( recent_size < size )); then
        mv "$tmp_recent" "$f"
        rotated=$((rotated + 1))
        echo "Rotated $name: $(numfmt --to=iec "$size") → $(numfmt --to=iec "$recent_size")"
    else
        rm "$tmp_recent"
        skipped=$((skipped + 1))
    fi
done

# Clean up archives older than 90 days
find "$ARCHIVE_DIR" -name "*.jsonl.gz" -mtime +90 -delete 2>/dev/null || true

echo "Log rotation complete: $rotated rotated, $skipped skipped"
