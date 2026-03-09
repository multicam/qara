#!/usr/bin/env bash
#
# daily-digest.sh — Cron-ready daily PAI health digest
#
# Generates a compact summary of audit logs + version checks.
# Add to crontab:  3 9 * * * /home/jean-marc/qara/scripts/daily-digest.sh
#
# Output goes to stdout (redirect to file or pipe to notification).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
STATE_DIR="$PAI_DIR/state"
DIGEST_DIR="$STATE_DIR/digests"
TODAY=$(date +%Y-%m-%d)

mkdir -p "$DIGEST_DIR"

{
  echo "PAI Daily Digest — $TODAY"
  echo "========================="
  echo

  # Error summary (Factor 9 — compacted errors)
  "$SCRIPT_DIR/audit-log.sh" all --summary -t
  echo

  # Session activity
  CHECKPOINT_FILE="$STATE_DIR/session-checkpoints.jsonl"
  if [[ -f "$CHECKPOINT_FILE" ]]; then
    sessions=$(jq -c "select(.timestamp | startswith(\"$TODAY\"))" "$CHECKPOINT_FILE" 2>/dev/null | wc -l)
    echo "Sessions today: $sessions"
  fi

  # External skill version check
  echo
  echo "=== Skill Versions ==="
  VE_LOCAL=$(grep 'version:' "$HOME/.agents/skills/visual-explainer/SKILL.md" 2>/dev/null | head -1 | sed 's/.*"\(.*\)"/\1/')
  VE_UPSTREAM=$(gh api repos/nicobailon/visual-explainer/releases/latest --jq '.tag_name' 2>/dev/null | sed 's/^v//')
  if [[ -n "$VE_LOCAL" && -n "$VE_UPSTREAM" ]]; then
    if [[ "$VE_LOCAL" == "$VE_UPSTREAM" ]]; then
      echo "visual-explainer: v$VE_LOCAL (up to date)"
    else
      echo "visual-explainer: v$VE_LOCAL → v$VE_UPSTREAM available"
    fi
  fi

  # Log sizes
  echo
  echo "=== Log Sizes ==="
  for f in "$STATE_DIR"/*.jsonl; do
    [[ -f "$f" ]] || continue
    lines=$(wc -l < "$f")
    size=$(du -h "$f" | cut -f1)
    name=$(basename "$f" .jsonl)
    echo "  $name: $lines lines ($size)"
  done

} | tee "$DIGEST_DIR/$TODAY.txt"
