#!/usr/bin/env bash
# Local daily reflect using Ollama Gemma 4 instead of Claude API.
# Produces observation files from miner JSON using local inference.
# Saves ~$0.05-0.15/day vs cloud API calls.
#
# Usage: ./scripts/introspect-daily-reflect-local.sh [YYYY-MM-DD]
# Cron:  0 11 * * * cd /home/jean-marc/qara && ./scripts/introspect-daily-reflect-local.sh

set -euo pipefail

DATE="${1:-$(TZ=Australia/Sydney date +%Y-%m-%d)}"
OBS_DIR="$HOME/qara/thoughts/shared/introspection/observations"
OBS_FILE="$OBS_DIR/$DATE.md"
MINER="$HOME/qara/.claude/skills/introspect/tools/introspect-miner.ts"
OLLAMA_URL="http://localhost:11434/api/chat"
MODEL="gemma4:latest"
LOG_PREFIX="[$(date -Iseconds)] daily-reflect-local:"

mkdir -p "$OBS_DIR"

# Skip if observation already exists
if [ -f "$OBS_FILE" ]; then
    echo "$LOG_PREFIX Observation for $DATE already exists, skipping"
    exit 0
fi

# Check Ollama is running
if ! curl -s -o /dev/null -w '' "$OLLAMA_URL" 2>/dev/null; then
    echo "$LOG_PREFIX Ollama not available at $OLLAMA_URL, skipping"
    exit 0
fi

# Run miner
echo "$LOG_PREFIX Running miner for $DATE..."
MINER_JSON=$(bun "$MINER" --mode daily --date "$DATE" 2>/dev/null) || {
    echo "$LOG_PREFIX Miner failed, skipping"
    exit 0
}

# Extract key stats for frontmatter
TOOLS_TOTAL=$(echo "$MINER_JSON" | jq -r '.tool_usage.total // 0')
ERRORS_TOTAL=$(echo "$MINER_JSON" | jq -r '[.tool_usage.by_tool[].errors] | add // 0')
SESSIONS=$(echo "$MINER_JSON" | jq -r '.sessions.count // 0')
CORRECTIONS=$(echo "$MINER_JSON" | jq -r '.corrections | length // 0')

# Skip if no activity
if [ "$TOOLS_TOTAL" -eq 0 ]; then
    echo "$LOG_PREFIX No activity for $DATE, skipping"
    exit 0
fi

# Load yesterday's key metrics for cross-day comparison
YESTERDAY=$(TZ=Australia/Sydney date -d "$DATE - 1 day" +%Y-%m-%d 2>/dev/null || TZ=Australia/Sydney date -v-1d -j -f "%Y-%m-%d" "$DATE" +%Y-%m-%d)
YESTERDAY_OBS="$OBS_DIR/$YESTERDAY.md"
YESTERDAY_CONTEXT=""
if [ -f "$YESTERDAY_OBS" ]; then
    YESTERDAY_TOOLS=$(grep -oP 'tools_total: \K\d+' "$YESTERDAY_OBS" || echo "?")
    YESTERDAY_SESSIONS=$(grep -oP 'sessions: \K\d+' "$YESTERDAY_OBS" || echo "?")
    YESTERDAY_ERRORS=$(grep -oP 'errors_total: \K\d+' "$YESTERDAY_OBS" || echo "?")
    YESTERDAY_CONTEXT="Yesterday ($YESTERDAY): $YESTERDAY_TOOLS tools, $YESTERDAY_SESSIONS sessions, $YESTERDAY_ERRORS errors."
fi

# Truncate JSON for Gemma 4 context (keep under 6K chars for rich analysis)
MINER_TRUNCATED=$(echo "$MINER_JSON" | jq '{
    tool_usage: {total: .tool_usage.total, by_tool: .tool_usage.by_tool, overall_error_rate: .tool_usage.overall_error_rate, anomalies: .tool_usage.anomalies},
    sessions: .sessions,
    security: {total: .security.total, by_decision: .security.by_decision},
    corrections: .corrections,
    git: .git,
    cc_version: .cc_version,
    hint_compliance: .hint_compliance,
    infrastructure_drift: .infrastructure_drift,
    session_traces: (.session_traces // [] | map({session_id, tool_count, error_count, duration_min: ((.duration_ms // 0) / 60000 | floor), tools: (.tools_used // [] | .[:5])}) | sort_by(-.tool_count) | .[:8]),
    recovery_patterns: (.recovery_patterns // [] | length),
    repeated_failures: (.repeated_failures // [] | length),
    mode_metrics: .mode_metrics,
    tdd_metrics: .tdd_metrics
}' 2>/dev/null)

SYSTEM_PROMPT="You are a development analytics observer for the Qara PAI system. Given daily miner JSON, produce 10-18 concise tagged observation bullets. Rules:
- Each line starts with a tag: [tool-usage], [session-quality], [security], [anomaly], [git-activity], [user-correction], [harness-change], [staleness], [hint-compliance]
- Include PERCENTAGES and NUMBERS — raw counts, rates, comparisons
- For [session-quality]: describe the 3-5 largest sessions (tool count, duration, dominant tools, likely activity)
- For [tool-usage]: compute top-3 tool percentages, agent delegation %, Bash %
- For [hint-compliance]: report bash_pct, agent_delegation_pct, bash_retry_rate if present
- For [staleness]: report infrastructure drift if present (expected vs actual counts)
- No preamble, no explanation, no markdown headers — ONLY the bullet list
- Compare to yesterday's metrics when provided — note increases/decreases
- Be SPECIFIC, not generic. 'Read was most used at 31.6%' not 'Read tool was utilized frequently'"

# Call Ollama
echo "$LOG_PREFIX Calling Gemma 4 for interpretation..."
RESPONSE=$(curl -s "$OLLAMA_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg sys "$SYSTEM_PROMPT" --arg json "$MINER_TRUNCATED" --arg yesterday "$YESTERDAY_CONTEXT" '{
        model: "'"$MODEL"'",
        messages: [
            {role: "system", content: $sys},
            {role: "user", content: ("Daily miner output for '"$DATE"':\n" + (if $yesterday != "" then "Context: " + $yesterday + "\n\n" else "\n" end) + $json)}
        ],
        stream: false,
        options: {temperature: 0.3}
    }')" 2>/dev/null | jq -r '.message.content' 2>/dev/null) || {
    echo "$LOG_PREFIX Ollama call failed, skipping"
    exit 0
}

if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "null" ]; then
    echo "$LOG_PREFIX Empty response from Gemma 4, skipping"
    exit 0
fi

# Write observation file
cat > "$OBS_FILE" << EOF
---
date: $DATE
sessions: $SESSIONS
tools_total: $TOOLS_TOTAL
errors_total: $ERRORS_TOTAL
corrections: $CORRECTIONS
generated_by: gemma4-local
---

$RESPONSE
EOF

echo "$LOG_PREFIX Wrote $OBS_FILE ($TOOLS_TOTAL tools, $SESSIONS sessions)"
