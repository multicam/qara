#!/usr/bin/env bash
#
# audit-log.sh — Query JSONL audit logs from PAI state directory
#
# Usage:
#   ./scripts/audit-log.sh [type] [options]
#
# Types:
#   tools        Tool usage log (default)
#   security     Security check log
#   config       Config change log
#   checkpoints  Session checkpoint log
#   all          All logs combined
#
# Options:
#   -n NUM       Show last NUM entries (default: 20)
#   -s SESSION   Filter by session ID
#   -t           Show only today's entries
#   --errors     Show only errors/blocks
#   --raw        Output raw JSONL without formatting

set -euo pipefail

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
STATE_DIR="$PAI_DIR/state"

LOG_TYPE="${1:-tools}"
shift 2>/dev/null || true

COUNT=20
SESSION=""
TODAY_ONLY=false
ERRORS_ONLY=false
RAW=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n) COUNT="$2"; shift 2 ;;
    -s) SESSION="$2"; shift 2 ;;
    -t) TODAY_ONLY=true; shift ;;
    --errors) ERRORS_ONLY=true; shift ;;
    --raw) RAW=true; shift ;;
    -h|--help)
      head -17 "$0" | tail -15
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

get_log_file() {
  case "$1" in
    tools)       echo "$STATE_DIR/tool-usage.jsonl" ;;
    security)    echo "$STATE_DIR/security-checks.jsonl" ;;
    config)      echo "$STATE_DIR/config-changes.jsonl" ;;
    checkpoints) echo "$STATE_DIR/session-checkpoints.jsonl" ;;
    *) echo "Unknown log type: $1" >&2; return 1 ;;
  esac
}

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: sudo apt install jq" >&2
  exit 1
fi

process_log() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    return 0
  fi

  local filter="."

  if [[ -n "$SESSION" ]]; then
    filter="$filter | select(.session_id == \"$SESSION\")"
  fi

  if [[ "$TODAY_ONLY" == true ]]; then
    local today
    today=$(date +%Y-%m-%d)
    filter="$filter | select(.timestamp | startswith(\"$today\"))"
  fi

  if [[ "$ERRORS_ONLY" == true ]]; then
    filter="$filter | select(.error == true or .decision == \"block\" or .was_error == true)"
  fi

  if [[ "$RAW" == true ]]; then
    tail -n "$COUNT" "$file" | jq -c "$filter" 2>/dev/null
  else
    tail -n "$COUNT" "$file" | jq "$filter" 2>/dev/null
  fi
}

if [[ "$LOG_TYPE" == "all" ]]; then
  for type in tools security config checkpoints; do
    file=$(get_log_file "$type") || continue
    if [[ -f "$file" ]]; then
      echo "=== $type ==="
      process_log "$file"
      echo
    fi
  done
else
  file=$(get_log_file "$LOG_TYPE") || exit 1
  process_log "$file"
fi
