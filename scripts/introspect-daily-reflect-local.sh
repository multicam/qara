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
MODEL="gemma4"
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

# Truncate JSON for Gemma 4 context (keep under 4K chars for reliable processing)
MINER_TRUNCATED=$(echo "$MINER_JSON" | jq '{
    tool_usage: {total: .tool_usage.total, by_tool: .tool_usage.by_tool, overall_error_rate: .tool_usage.overall_error_rate, anomalies: .tool_usage.anomalies},
    sessions: .sessions,
    security: {total: .security.total, by_decision: .security.by_decision},
    corrections: (.corrections | length),
    git: .git,
    cc_version: .cc_version
}' 2>/dev/null)

SYSTEM_PROMPT="You are a development analytics observer for the Qara PAI system. Given daily miner JSON, produce 5-12 concise tagged observation bullets. Each observation is one line starting with a tag from: [tool-usage], [session-quality], [security], [anomaly], [git-activity], [user-correction], [harness-change]. Include percentages where relevant. No preamble, no explanation — just the bullet list."

# Call Ollama
echo "$LOG_PREFIX Calling Gemma 4 for interpretation..."
RESPONSE=$(curl -s "$OLLAMA_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg sys "$SYSTEM_PROMPT" --arg json "$MINER_TRUNCATED" '{
        model: "'"$MODEL"'",
        messages: [
            {role: "system", content: $sys},
            {role: "user", content: ("Daily miner output for '"$DATE"':\n\n" + $json)}
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
