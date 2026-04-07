#!/usr/bin/env bash
# Weekly TGDS code scanner using local Gemma 4 via Ollama.
# Scans recent git diffs across all TGDS repos for issues.
# Output: thoughts/shared/tgds-reviews/YYYY-MM-DD.md
#
# Usage: ./scripts/tgds-code-scan.sh [--lookback N]
# Cron:  0 8 * * 0 /home/jean-marc/qara/scripts/tgds-code-scan.sh

set -uo pipefail
# Don't use -e: git log | head causes SIGPIPE (141) which is normal truncation

TGDS_DIR="/media/ssdev/tgds"
OUTPUT_DIR="$HOME/qara/thoughts/shared/tgds-reviews"
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"
OLLAMA_URL="http://localhost:11434/api/chat"
MODEL="gemma4"
# Parse --lookback N flag, default 7 days
LOOKBACK=7
while [[ $# -gt 0 ]]; do
    case "$1" in
        --lookback) LOOKBACK="$2"; shift 2 ;;
        *) shift ;;
    esac
done
LOG_PREFIX="[$(date -Iseconds)] tgds-scan:"

mkdir -p "$OUTPUT_DIR"

if [ -f "$OUTPUT_FILE" ]; then
    echo "$LOG_PREFIX Scan for $DATE already exists, skipping"
    exit 0
fi

if ! curl -s -o /dev/null -w '' http://localhost:11434/api/tags 2>/dev/null; then
    echo "$LOG_PREFIX Ollama not available, skipping"
    exit 0
fi

echo "$LOG_PREFIX Scanning $TGDS_DIR (lookback: ${LOOKBACK} days)..."

SCAN_RESULTS=""
REPOS_SCANNED=0
REPOS_WITH_CHANGES=0
ISSUES_FOUND=0

for repo_dir in "$TGDS_DIR"/*/; do
    repo_name=$(basename "$repo_dir")

    # Skip non-git dirs, archives, configs
    [ ! -d "$repo_dir/.git" ] && continue

    # Get recent diff (truncate via dd to avoid SIGPIPE)
    DIFF=$(cd "$repo_dir" && git log --all --since="${LOOKBACK} days ago" -p --diff-filter=ACMR -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.svelte' '*.vue' 2>/dev/null | head -c 3000 || true)

    REPOS_SCANNED=$((REPOS_SCANNED + 1))

    [ -z "$DIFF" ] && continue

    REPOS_WITH_CHANGES=$((REPOS_WITH_CHANGES + 1))

    # Build JSON payload via temp file (git diffs break inline jq)
    TMPFILE=$(mktemp)
    jq -n --arg diff "$DIFF" --arg repo "$repo_name" '{
        model: "'"$MODEL"'",
        messages: [
            {role: "system", content: "You are a code reviewer. Given a git diff, list issues found. Focus on: bugs, security, unused code, missing error handling. Max 5 bullets. If the code looks fine, say \"No issues found.\" Be concise."},
            {role: "user", content: ("Review recent changes in " + $repo + ":\n\n" + $diff)}
        ],
        stream: false,
        options: {temperature: 0.2}
    }' > "$TMPFILE" 2>/dev/null

    REVIEW=$(curl -s "$OLLAMA_URL" \
        -H "Content-Type: application/json" \
        -d @"$TMPFILE" 2>/dev/null | jq -r '.message.content' 2>/dev/null)
    rm -f "$TMPFILE"

    [ -z "$REVIEW" ] || [ "$REVIEW" = "null" ] && REVIEW="(Gemma 4 returned no response)"

    # Count issues (lines starting with - or *)
    REPO_ISSUES=$(echo "$REVIEW" | grep -c '^\s*[-*]' || true)
    ISSUES_FOUND=$((ISSUES_FOUND + REPO_ISSUES))

    SCAN_RESULTS="${SCAN_RESULTS}
### ${repo_name}

${REVIEW}

---
"

    echo "$LOG_PREFIX  $repo_name: $REPO_ISSUES issues"
done

# Write report
cat > "$OUTPUT_FILE" << EOF
---
date: $DATE
repos_scanned: $REPOS_SCANNED
repos_with_changes: $REPOS_WITH_CHANGES
issues_found: $ISSUES_FOUND
lookback_days: $LOOKBACK
generated_by: gemma4-local
---

# TGDS Weekly Code Scan — $DATE

**Repos scanned:** $REPOS_SCANNED | **With changes:** $REPOS_WITH_CHANGES | **Issues flagged:** $ISSUES_FOUND
$SCAN_RESULTS
EOF

echo "$LOG_PREFIX Done. $REPOS_SCANNED repos scanned, $REPOS_WITH_CHANGES with changes, $ISSUES_FOUND issues. Wrote $OUTPUT_FILE"
