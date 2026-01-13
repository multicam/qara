
#!/bin/bash
# Claude Code statusline with two-line design and semantic color theory
#
# Line 1: Repo/code context (cool blues/cyans)
# Line 2: Session/context info (complementary warm tones)

input=$(cat)

# Extract data from JSON
dir=$(echo "$input" | jq -r '.workspace.current_dir')
dir_name=$(basename "$dir")
model=$(echo "$input" | jq -r '.model.display_name // .model.id')
duration_ms=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

# Git info
if cd "$dir" 2>/dev/null; then
branch=$(git -c core.useBuiltinFSMonitor=false branch --show-current 2>/dev/null)
diff_stats=$(git -c core.useBuiltinFSMonitor=false diff --shortstat 2>/dev/null)

    if [ -n "$diff_stats" ]; then
      lines_added=$(echo "$diff_stats" | sed -n 's/.* \([0-9]*\) insertion.*/\1/p')
      lines_removed=$(echo "$diff_stats" | sed -n 's/.* \([0-9]*\) deletion.*/\1/p')
      [ -z "$lines_added" ] && lines_added=0
      [ -z "$lines_removed" ] && lines_removed=0
    else
      lines_added=0
      lines_removed=0
    fi
else
branch=''
lines_added=0
lines_removed=0
fi

# Context window calculation
# CC 2.1.6+ provides native used_percentage field
# Fallback to manual calculation for older versions
used_pct_native=$(echo "$input" | jq -r '.context_window.used_percentage // null')

if [ "$used_pct_native" != "null" ] && [ "$used_pct_native" != "0" ]; then
    # Use CC 2.1.6+ native percentage (already accounts for effective budget)
    used_pct=$(printf "%.0f" "$used_pct_native")

    # Color based on effective budget usage
    if [ "$used_pct" -lt 60 ]; then
      ctx_color='\033[92m'  # Green: 0-60% of effective budget
      ctx_icon='✅'
    elif [ "$used_pct" -lt 80 ]; then
      ctx_color='\033[93m'  # Yellow: 60-80% of effective budget
      ctx_icon='⚠️ '
    else
      ctx_color='\033[91m'  # Red: 80-100%+ of effective budget
      ctx_icon='🚨'
    fi

    ctx="${ctx_icon} ${used_pct}%"
else
    # Fallback: Manual calculation using 60% effective budget
    # (research shows ~50-60% effective usage of stated capacity)
    usage=$(echo "$input" | jq '.context_window.current_usage')
    if [ "$usage" != "null" ]; then
        current=$(echo "$usage" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')
        size=$(echo "$input" | jq '.context_window.context_window_size')
        effective_budget=$((size * 60 / 100))  # 60% of total capacity
        used_pct=$((current * 100 / effective_budget))

        # Color based on effective budget usage
        if [ "$used_pct" -lt 60 ]; then
          ctx_color='\033[92m'  # Green: 0-60% of effective budget
          ctx_icon='✅'
        elif [ "$used_pct" -lt 80 ]; then
          ctx_color='\033[93m'  # Yellow: 60-80% of effective budget
          ctx_icon='⚠️ '
        else
          ctx_color='\033[91m'  # Red: 80-100%+ of effective budget
          ctx_icon='🚨'
        fi

        # Show used percentage (not remaining)
        ctx="${ctx_icon} ${used_pct}%"
    else
        ctx=''
        ctx_color=''
    fi
fi

# Format session time as human-readable
if [ "$duration_ms" != "0" ] && [ "$duration_ms" != "null" ]; then
total_sec=$((duration_ms / 1000))
hours=$((total_sec / 3600))
minutes=$(((total_sec % 3600) / 60))
seconds=$((total_sec % 60))

    if [ "$hours" -gt 0 ]; then
      session_time="${hours}h ${minutes}m"
    elif [ "$minutes" -gt 0 ]; then
      session_time="${minutes}m ${seconds}s"
    else
      session_time="${seconds}s"
    fi
else
session_time=''
fi

# Format tokens (k for thousands)
format_tokens() {
local tokens=$1
if [ "$tokens" -ge 1000 ]; then
awk -v t="$tokens" 'BEGIN {printf "%.1fk", t/1000}'
else
echo "$tokens"
fi
}

input_fmt=$(format_tokens "$total_input")
output_fmt=$(format_tokens "$total_output")

# ============================================================
# LINE 1: Repo/Code (cool blues)
# ============================================================
line1=$(printf '\033[94m%s\033[0m' "$dir_name")

if [ -n "$branch" ]; then
line1="$line1 $(printf '\033[2m│\033[0m \033[96m%s\033[0m' "$branch")"
fi

if [ "$lines_added" != "0" ] || [ "$lines_removed" != "0" ]; then
line1="$line1 $(printf '\033[2m│\033[0m \033[92m+%s\033[0m \033[91m-%s\033[0m' "$lines_added" "$lines_removed")"
fi

# ============================================================
# LINE 2: Context/Session (warm complementary)
# ============================================================
line2=$(printf '\033[37m%s\033[0m' "$model")

if [ -n "$session_time" ]; then
line2="$line2 $(printf '\033[2m│\033[0m \033[33m%s\033[0m' "$session_time")"
fi

if [ -n "$ctx" ]; then
line2="$line2 $(printf '\033[2m│\033[0m %b%s\033[0m' "$ctx_color" "$ctx")"
fi

if [ "$total_input" != "0" ] || [ "$total_output" != "0" ]; then
# Both dark blue (34)
line2="$line2 $(printf '\033[2m│\033[0m \033[34m↓%s in\033[0m \033[2m/\033[0m \033[34m↑%s out\033[0m' "$input_fmt" "$output_fmt")"
fi

# Output with blank line separator
printf '%b\n\n%b' "$line1" "$line2"

Location: ~/.claude/statusline-command.sh

Settings.json entry:
"statusLine": {
"type": "command",
"command": "~/.claude/statusline-command.sh"
}
