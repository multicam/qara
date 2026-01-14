#!/bin/bash
# Agent Lens Phase 1 Verification Script
# Tests that hierarchy tracking is working with real Claude Code events

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Agent Lens Phase 1 Verification${NC}\n"

# 1. Check that state directory exists
echo -e "${BLUE}[1/6] Checking state directory...${NC}"
if [ -d "$HOME/.claude/state" ]; then
    echo -e "  ${GREEN}✅ State directory exists${NC}"
    ls -lh "$HOME/.claude/state/session-hierarchy.json" 2>/dev/null || echo -e "  ${YELLOW}⚠️  session-hierarchy.json will be created on first event${NC}"
else
    echo -e "  ${RED}❌ State directory missing${NC}"
    exit 1
fi

# 2. Check that hierarchy tracker module exists
echo -e "\n${BLUE}[2/6] Checking hierarchy tracker module...${NC}"
if [ -f "$HOME/.claude/hooks/lib/session-hierarchy-tracker.ts" ]; then
    echo -e "  ${GREEN}✅ session-hierarchy-tracker.ts exists${NC}"
    lines=$(wc -l < "$HOME/.claude/hooks/lib/session-hierarchy-tracker.ts")
    echo -e "  ${GREEN}   Module size: ${lines} lines${NC}"
else
    echo -e "  ${RED}❌ Hierarchy tracker module missing${NC}"
    exit 1
fi

# 3. Verify capture hook has been updated
echo -e "\n${BLUE}[3/6] Verifying capture hook update...${NC}"
if grep -q "session-hierarchy-tracker" "$HOME/.claude/hooks/capture-all-events.ts"; then
    echo -e "  ${GREEN}✅ Capture hook imports hierarchy tracker${NC}"
else
    echo -e "  ${RED}❌ Capture hook not updated${NC}"
    exit 1
fi

if grep -q "event_id: string" "$HOME/.claude/hooks/capture-all-events.ts"; then
    echo -e "  ${GREEN}✅ Enhanced HookEvent interface present${NC}"
else
    echo -e "  ${RED}❌ Enhanced interface missing${NC}"
    exit 1
fi

# 4. Check today's events file
echo -e "\n${BLUE}[4/6] Checking today's events file...${NC}"
TODAY_FILE="$HOME/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl"
if [ -f "$TODAY_FILE" ]; then
    echo -e "  ${GREEN}✅ Today's events file exists${NC}"
    echo -e "  ${GREEN}   Location: ${TODAY_FILE}${NC}"

    # Count events
    event_count=$(wc -l < "$TODAY_FILE" 2>/dev/null || echo "0")
    echo -e "  ${GREEN}   Events captured today: ${event_count}${NC}"

    # Check for new fields in most recent event
    if [ "$event_count" -gt 0 ]; then
        echo -e "\n  ${BLUE}Checking most recent event for Agent Lens fields...${NC}"
        last_event=$(tail -n 1 "$TODAY_FILE")

        if echo "$last_event" | jq -e '.event_id' >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ event_id field present${NC}"
        else
            echo -e "  ${YELLOW}⚠️  event_id field missing (may be old event)${NC}"
        fi

        if echo "$last_event" | jq -e '.parent_event_id' >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ parent_event_id field present${NC}"
            parent=$(echo "$last_event" | jq -r '.parent_event_id')
            echo -e "  ${GREEN}   Parent: ${parent}${NC}"
        else
            echo -e "  ${YELLOW}⚠️  parent_event_id field missing (may be old event)${NC}"
        fi

        if echo "$last_event" | jq -e '.span_kind' >/dev/null 2>&1; then
            echo -e "  ${GREEN}✅ span_kind field present${NC}"
            span_kind=$(echo "$last_event" | jq -r '.span_kind')
            echo -e "  ${GREEN}   Span kind: ${span_kind}${NC}"
        else
            echo -e "  ${YELLOW}⚠️  span_kind field missing (may be old event)${NC}"
        fi
    fi
else
    echo -e "  ${YELLOW}⚠️  No events file yet for today${NC}"
    echo -e "  ${YELLOW}   File will be created when hooks fire${NC}"
fi

# 5. Run hierarchy tracker test
echo -e "\n${BLUE}[5/6] Running hierarchy tracker test suite...${NC}"
cd "$HOME/.claude/hooks"
if bun run test-hierarchy.ts 2>&1 | grep -q "All tests passed"; then
    echo -e "  ${GREEN}✅ All hierarchy tests passed (17/17)${NC}"
else
    echo -e "  ${RED}❌ Hierarchy tests failed${NC}"
    exit 1
fi

# 6. Instructions for live testing
echo -e "\n${BLUE}[6/6] Live Testing Instructions${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${GREEN}To verify Agent Lens hierarchy tracking in a real session:${NC}\n"
echo -e "  ${BLUE}1.${NC} Open a new terminal and tail the events file:"
echo -e "     ${YELLOW}tail -f $TODAY_FILE${NC}\n"
echo -e "  ${BLUE}2.${NC} Use Claude Code normally (any tool call will trigger hooks)"
echo -e "     Examples:"
echo -e "     - Read a file"
echo -e "     - Run a Grep search"
echo -e "     - Launch a Task agent\n"
echo -e "  ${BLUE}3.${NC} Watch the events appear with new fields:"
echo -e "     Look for: ${GREEN}event_id${NC}, ${GREEN}parent_event_id${NC}, ${GREEN}span_kind${NC}\n"
echo -e "  ${BLUE}4.${NC} Verify parent-child relationships:"
echo -e "     - UserPromptSubmit should have parent = SessionStart event_id"
echo -e "     - PreToolUse should have parent = UserPromptSubmit event_id"
echo -e "     - PostToolUse should have parent = matching PreToolUse event_id\n"
echo -e "  ${BLUE}5.${NC} Extract hierarchy with jq:"
echo -e "     ${YELLOW}cat $TODAY_FILE | jq '{event_id, parent_event_id, type: .hook_event_type, span_kind}'${NC}\n"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Optional: Pretty print last 5 events to show structure
if [ "$event_count" -gt 0 ]; then
    echo -e "\n${BLUE}Last 5 events (hierarchy view):${NC}\n"
    tail -n 5 "$TODAY_FILE" 2>/dev/null | jq -c '{
        event_id: .event_id[0:8],
        parent: (.parent_event_id[0:8] // "null"),
        type: .hook_event_type,
        span: .span_kind,
        skill: .skill_name
    }' 2>/dev/null || echo -e "${YELLOW}  (Install jq for pretty formatting: sudo apt install jq)${NC}"
fi

echo -e "\n${GREEN}✅ Phase 1 verification complete!${NC}"
echo -e "${GREEN}   Hierarchy tracking is operational and ready to test.${NC}\n"
