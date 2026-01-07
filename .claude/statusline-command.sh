#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Get Digital Assistant configuration from environment
DA_NAME="${DA:-Assistant}"  # Assistant name
DA_COLOR="${DA_COLOR:-purple}"  # Color for the assistant name

# Extract data from JSON input
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
model_name=$(echo "$input" | jq -r '.model.display_name')

# Get directory name
dir_name=$(basename "$current_dir")

# Cache file and lock file for ccusage data
CACHE_FILE="/tmp/.claude_ccusage_cache"
LOCK_FILE="/tmp/.claude_ccusage.lock"
CACHE_AGE=30   # 30 seconds for more real-time updates

# Count items from specified directories
claude_dir="${PAI_DIR:-$HOME/.claude}"
commands_count=0
fobs_count=0
fabric_count=0

# Count commands (optimized - direct ls instead of find)
if [ -d "$claude_dir/commands" ]; then
    commands_count=$(ls -1 "$claude_dir/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# Count services from services directory
services_names_raw=""

# Count Services (optimized - count .md files directly)
services_dir="${HOME}/Projects/FoundryServices/Services"
if [ -d "$services_dir" ]; then
    fobs_count=$(ls -1 "$services_dir/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# Count Fabric patterns (optimized - count subdirectories)
# Use bundled PAI fabric if available, fallback to system-wide installation
fabric_patterns_dir="$claude_dir/skills/fabric/fabric-repo/patterns"
if [ ! -d "$fabric_patterns_dir" ]; then
    fabric_patterns_dir="${HOME}/.config/fabric/patterns"
fi
if [ -d "$fabric_patterns_dir" ]; then
    # Count immediate subdirectories only (fd is 13-23x faster than find)
    fabric_count=$(fd -t d --max-depth 1 . "$fabric_patterns_dir" 2>/dev/null | wc -l | tr -d ' ')
fi

# Get cached ccusage data - SAFE VERSION without background processes
daily_tokens=""
daily_cost=""

# Check if cache exists and load it
if [ -f "$CACHE_FILE" ]; then
    # Always load cache data first (if it exists)
    source "$CACHE_FILE"
fi

# If cache is stale, missing, or we have no data, update it SYNCHRONOUSLY with timeout
cache_needs_update=false
if [ ! -f "$CACHE_FILE" ] || [ -z "$daily_tokens" ]; then
    cache_needs_update=true
elif [ -f "$CACHE_FILE" ]; then
    cache_age=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || echo 0)))
    if [ $cache_age -ge $CACHE_AGE ]; then
        cache_needs_update=true
    fi
fi

if [ "$cache_needs_update" = true ]; then
    # Try to acquire lock (non-blocking)
    if mkdir "$LOCK_FILE" 2>/dev/null; then
        # We got the lock - update cache with timeout
        if command -v bunx >/dev/null 2>&1; then
            # Get TODAY's usage only, not cumulative total
            TODAY_FILTER=$(date +"%Y%m%d")
            # Run ccusage with date filter for today only (15 seconds timeout - ccusage needs time to fetch pricing data)
            # Check if gtimeout is available (macOS), otherwise try timeout (Linux)
            if command -v gtimeout >/dev/null 2>&1; then
                ccusage_output=$(gtimeout 15 bunx ccusage --since $TODAY_FILTER --until $TODAY_FILTER 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "^│ Total" | head -1)
            elif command -v timeout >/dev/null 2>&1; then
                ccusage_output=$(timeout 15 bunx ccusage --since $TODAY_FILTER --until $TODAY_FILTER 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "^│ Total" | head -1)
            else
                # Fallback without timeout (but faster than before)
                ccusage_output=$(bunx ccusage --since $TODAY_FILTER --until $TODAY_FILTER 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "^│ Total" | head -1)
            fi

            if [ -n "$ccusage_output" ]; then
                # Extract Total Tokens column (field 8) - this includes input, output, cache create, and cache read
                daily_total=$(echo "$ccusage_output" | awk -F'│' '{print $8}' | sed 's/[^0-9]//g' | head -c 15)
                # Extract cost (field 9), keep the dollar sign
                daily_cost=$(echo "$ccusage_output" | awk -F'│' '{print $9}' | sed 's/^ *//;s/ *$//')

                if [ -n "$daily_total" ]; then
                    # Format with thousands separator
                    daily_tokens=$(printf "%'d" "$daily_total" 2>/dev/null || echo "$daily_total")

                    # Write to cache file (properly escape dollar sign)
                    echo "daily_tokens=\"$daily_tokens\"" > "$CACHE_FILE"
                    # Use printf to properly escape the dollar sign in the cost
                    printf "daily_cost=\"%s\"\n" "${daily_cost//$/\\$}" >> "$CACHE_FILE"
                    # Add timestamp for debugging
                    echo "cache_updated=\"$(date)\"" >> "$CACHE_FILE"
                fi
            fi
        fi

        # Always remove lock when done
        rmdir "$LOCK_FILE" 2>/dev/null
    else
        # Someone else is updating - check if lock is stale (older than 30 seconds)
        if [ -d "$LOCK_FILE" ]; then
            lock_age=$(($(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || echo 0)))
            if [ $lock_age -gt 30 ]; then
                # Stale lock - remove it and try again
                rmdir "$LOCK_FILE" 2>/dev/null
            fi
        fi

        # Just use cached data if available
        if [ -f "$CACHE_FILE" ]; then
            source "$CACHE_FILE"
        fi
    fi
fi

# Tokyo Night Storm Color Scheme
BACKGROUND='\033[48;2;36;40;59m'
BRIGHT_PURPLE='\033[38;2;187;154;247m'
BRIGHT_BLUE='\033[38;2;122;162;247m'
DARK_BLUE='\033[38;2;100;140;200m'
BRIGHT_GREEN='\033[38;2;158;206;106m'
DARK_GREEN='\033[38;2;130;170;90m'
BRIGHT_ORANGE='\033[38;2;255;158;100m'
BRIGHT_RED='\033[38;2;247;118;142m'
BRIGHT_CYAN='\033[38;2;125;207;255m'
BRIGHT_MAGENTA='\033[38;2;187;154;247m'
BRIGHT_YELLOW='\033[38;2;224;175;104m'

# Map DA_COLOR to actual ANSI color code
case "$DA_COLOR" in
    "purple") DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;
    "blue") DA_DISPLAY_COLOR="$BRIGHT_BLUE" ;;
    "green") DA_DISPLAY_COLOR="$BRIGHT_GREEN" ;;
    "cyan") DA_DISPLAY_COLOR="$BRIGHT_CYAN" ;;
    "magenta") DA_DISPLAY_COLOR="$BRIGHT_MAGENTA" ;;
    "yellow") DA_DISPLAY_COLOR="$BRIGHT_YELLOW" ;;
    "red") DA_DISPLAY_COLOR="$BRIGHT_RED" ;;
    "orange") DA_DISPLAY_COLOR="$BRIGHT_ORANGE" ;;
    *) DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;  # Default to purple
esac

# Line-specific colors
LINE1_PRIMARY="$BRIGHT_PURPLE"
LINE1_ACCENT='\033[38;2;160;130;210m'
MODEL_PURPLE='\033[38;2;138;99;210m'

LINE2_PRIMARY="$DARK_BLUE"
LINE2_ACCENT='\033[38;2;110;150;210m'

LINE3_PRIMARY="$DARK_GREEN"
LINE3_ACCENT='\033[38;2;140;180;100m'
COST_COLOR="$LINE3_ACCENT"
TOKENS_COLOR='\033[38;2;169;177;214m'

SEPARATOR_COLOR='\033[38;2;140;152;180m'
DIR_COLOR='\033[38;2;135;206;250m'

# Service colors
SVC_PRIMARY="$BRIGHT_BLUE"
SVC_SECONDARY="$LINE2_ACCENT"
SVC_DEFAULT="$LINE2_PRIMARY"

RESET='\033[0m'

# Format service names (if any)
services_formatted=""

# Output the full 2-line statusline
# LINE 1 - PURPLE theme with all counts
printf "${DA_DISPLAY_COLOR}${DA_NAME}${RESET}${LINE1_PRIMARY} here, running on ${MODEL_PURPLE}🧠 ${model_name}${RESET}${LINE1_PRIMARY} in ${DIR_COLOR}📁 ${dir_name}${RESET}${LINE1_PRIMARY}, wielding: ${RESET}${LINE1_PRIMARY}🔧 ${fobs_count} Services${RESET}${LINE1_PRIMARY}, ${RESET}${LINE1_PRIMARY}⚙️ ${commands_count} Commands${RESET}${LINE1_PRIMARY}, and ${RESET}${LINE1_PRIMARY}📚 ${fabric_count} Patterns${RESET}\n"

# LINE 2 - GREEN theme with tokens and cost (show cached or N/A)
# If we have cached data but it's empty, still show N/A
tokens_display="${daily_tokens:-N/A}"
cost_display="${daily_cost:-N/A}"
if [ -z "$daily_tokens" ]; then tokens_display="N/A"; fi
if [ -z "$daily_cost" ]; then cost_display="N/A"; fi

printf "${LINE3_PRIMARY}💎 Total Tokens${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${LINE3_ACCENT}${tokens_display}${RESET}${LINE3_PRIMARY}  Total Cost${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${COST_COLOR}${cost_display}${RESET}\n"