#!/bin/bash

# Start Agent Lens Dashboard (Server + Client)
# Server: http://localhost:4000 (WebSocket: ws://localhost:4000/stream)
# Client: http://localhost:5173
#
# NOTE: This script maintained for backward compatibility
# Prefer using: start-agent-lens.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LENS_DIR="$HOME/.claude/skills/agent-lens/apps"
BUN="$HOME/.bun/bin/bun"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${PURPLE}👁️  Starting Agent Lens Dashboard${NC}"

# Check if bun exists
if [ ! -f "$BUN" ]; then
    echo -e "${RED}❌ Bun not found at $BUN${NC}"
    exit 1
fi

# Check if directories exist
if [ ! -d "$LENS_DIR/server" ]; then
    echo -e "${RED}❌ Server directory not found: $LENS_DIR/server${NC}"
    exit 1
fi

if [ ! -d "$LENS_DIR/client" ]; then
    echo -e "${RED}❌ Client directory not found: $LENS_DIR/client${NC}"
    exit 1
fi

# Kill any existing processes on ports 4000 and 5173
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
lsof -ti:4000 | xargs -r kill 2>/dev/null
lsof -ti:5173 | xargs -r kill 2>/dev/null

# Start server in background
echo -e "${GREEN}📡 Starting server on port 4000...${NC}"
cd "$LENS_DIR/server"
$BUN run dev &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Start client in background
echo -e "${GREEN}🖥️  Starting client on port 5173...${NC}"
cd "$LENS_DIR/client"
$BUN run dev &
CLIENT_PID=$!

echo ""
echo -e "${PURPLE}✅ Agent Lens Dashboard started!${NC}"
echo -e "   ${BLUE}Server:${NC} http://localhost:4000"
echo -e "   ${BLUE}Client:${NC} http://localhost:5173"
echo -e "   ${BLUE}WebSocket:${NC} ws://localhost:4000/stream"
echo ""
echo -e "Press Ctrl+C to stop both services"

# Trap Ctrl+C to kill both processes
trap "echo -e '\n${RED}Stopping services...${NC}'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both processes
wait
