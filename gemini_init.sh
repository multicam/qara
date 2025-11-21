#!/bin/bash
# gemini_init.sh
# Use this script to load the Qara context into the Gemini CLI session.
# Usage: ./gemini_init.sh | xclip -selection clipboard (or just copy output)

echo "=== LOADING QARA CONTEXT FOR GEMINI ==="
echo ""
echo ">>> READING GEMINI.md (Tooling & Bridges)"
cat GEMINI.md
echo ""
echo "--------------------------------------------------------------------------------"
echo ""
echo ">>> READING CORE SKILL (Identity & Constitution)"
cat .claude/skills/CORE/SKILL.md
echo ""
echo "=== CONTEXT LOAD COMPLETE ==="
