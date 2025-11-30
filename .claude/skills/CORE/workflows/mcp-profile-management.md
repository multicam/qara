# MCP Profile Management (LEGACY System)

**Purpose**: Reference documentation for LEGACY MCP profile switching system. For modern web scraping, see system-mcp skill (TypeScript wrappers).

**Status**: LEGACY - Profile system not currently implemented in Qara fork.

---

## ⚠️ Important Note

This is the **LEGACY MCP profile switching system** from the upstream Personal AI Infrastructure template. 

**Current Qara Status**:
- MCP configuration: Empty (23 bytes in `~/.claude/.mcp.json`)
- Profile system: Not implemented
- **Recommended**: Use system-mcp skill with TypeScript wrappers instead

---

## 🎯 Trigger Phrases (LEGACY)

These phrases reference the old profile system:
- "switch MCP" / "change MCP profile"
- "chrome MCP" / "dev MCP" / "security profile"
- "what MCP profiles exist" / "available profiles"
- "load research profile" / "swap MCP"

**Current Response**: "Profile system not implemented. Use system-mcp skill for web scraping."

---

## 📋 What Profile System Was (Reference)

### Concept
The upstream PAI template had multiple `.mcp-{profile}.json` files:
- `.mcp-dev.json` - Development tools
- `.mcp-chrome.json` - Browser automation
- `.mcp-security.json` - Security scanning
- `.mcp-research.json` - Search and documentation

**Switching**: Symlink `.mcp.json` to desired profile, restart Claude Code.

### Why It Existed
- Different task types need different tool sets
- Reduce tool clutter when not needed
- Optimize context window usage
- Isolate tool dependencies

---

## 🔄 Modern Alternative: system-mcp Skill

**Recommended Approach**: Use TypeScript wrappers instead of MCP protocol.

**Location**: `~/.claude/skills/system-mcp/`

**Advantages**:
- Direct API calls (faster, no MCP overhead)
- Filter results in code (99% token savings)
- More control over data
- Easier to test and debug
- No profile switching needed

**Example Usage**:
```typescript
// Direct API call with filtering
import { BrightDataAPI } from './bright-data-wrapper.ts';

const results = await BrightDataAPI.scrape({
  url: 'https://example.com',
  filter: ['title', 'price'],  // Only extract what you need
});
```

**See**: system-mcp skill documentation for complete guide.

---

## 🛠️ How to Add MCP Servers (If Needed)

### 1. Edit .mcp.json
```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "API_KEY": "${ENV_VAR_NAME}"
      }
    }
  }
}
```

### 2. Store API Keys in .env
```bash
# ~/.claude/.env (gitignored)
MCP_SERVER_API_KEY=your_key_here
```

### 3. Restart Claude Code
Required after `.mcp.json` changes for servers to load.

---

## 📦 Example MCP Server Configurations

### httpx (Web Stack Analysis)
```json
{
  "mcpServers": {
    "httpx": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-httpx"]
    }
  }
}
```

### Playwright (Browser Automation)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

### Filesystem (File Operations)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
    }
  }
}
```

---

## 🔄 LEGACY Profile Switching (For Reference)

### If You Wanted to Implement Profiles

**Step 1: Create Profile Files**
```bash
cd ~/.claude

# Create different profile configs
cp .mcp.json .mcp-dev.json
cp .mcp.json .mcp-chrome.json
cp .mcp.json .mcp-security.json
```

**Step 2: Edit Each Profile**
Add relevant servers to each profile file.

**Step 3: Create Switch Script**
```bash
#!/bin/bash
# switch-mcp-profile.sh

PROFILE=$1
SOURCE=~/.claude/.mcp-${PROFILE}.json
TARGET=~/.claude/.mcp.json

if [ ! -f "$SOURCE" ]; then
  echo "Profile $PROFILE does not exist"
  exit 1
fi

# Backup current
cp $TARGET ${TARGET}.backup

# Switch to new profile
cp $SOURCE $TARGET

echo "Switched to $PROFILE profile"
echo "Restart Claude Code for changes to take effect"
```

**Step 4: Use**
```bash
./switch-mcp-profile.sh dev
# Restart Claude Code
```

---

## 🚨 Why We Don't Use This

### Problems with MCP Protocol Approach
1. **Token Overhead**: Returns full HTML/data (wastes context)
2. **Slow**: HTTP calls through MCP protocol
3. **Limited Control**: Can't filter before return
4. **Hard to Test**: Requires MCP server running
5. **Profile Complexity**: Switching and restarting is friction

### TypeScript Wrapper Advantages
1. **Direct API Calls**: Faster, no protocol overhead
2. **Pre-filtering**: Extract only what you need (99% token savings)
3. **Easy Testing**: Regular TypeScript functions
4. **Better Debugging**: Standard error handling
5. **No Profiles Needed**: All tools available, use what you need

---

## 📊 Comparison

| Feature | MCP Servers | TypeScript Wrappers |
|---------|-------------|---------------------|
| Speed | Slower (protocol overhead) | Fast (direct API) |
| Tokens | High (full data return) | Low (filter first) |
| Control | Limited | Full control |
| Testing | Requires server | Standard testing |
| Profiles | Need switching | No switching |
| Maintenance | External server | Your code |

**Winner**: TypeScript wrappers for most use cases.

---

## 🎯 When to Use MCP vs Wrappers

### Use MCP Servers When:
- Tool already has good MCP server implementation
- Don't need filtering (small data returns)
- Want standardized tool interface
- Tool changes frequently (wrapper maintenance burden)

### Use TypeScript Wrappers When:
- Need to filter large data
- Want direct API control
- Performance matters
- Token usage matters
- Want easy testing/debugging

**For Qara**: Wrappers preferred for web scraping (Bright Data, Apify).

---

## 🔗 Related Documentation
- See `mcp-guide.md` for two-tier MCP strategy
- See `system-mcp/` skill for TypeScript wrapper examples
- See `.mcp.json` for current MCP configuration
- See `TOOLS.md` for complete tool inventory

---

## 📝 Current Qara Configuration

**MCP Servers**: None configured
**Profile System**: Not implemented
**Web Scraping**: Use system-mcp skill

**To Add MCP Servers**:
1. Edit `~/.claude/.mcp.json`
2. Add server configuration
3. Store API keys in `~/.claude/.env`
4. Restart Claude Code

**Recommendation**: Start with TypeScript wrappers, add MCP servers only if specific need arises.

---

## 🔄 Migration Path

**If You Have MCP Servers to Add**:

1. **Evaluate**: Do I need MCP or can I use wrapper?
2. **Test**: Try wrapper approach first
3. **Measure**: Check token usage and speed
4. **Decide**: Use MCP only if wrapper doesn't work
5. **Implement**: Add to `.mcp.json` if needed

**For Web Scraping**: system-mcp skill is ready to use.

---

**Remember**: MCP profile switching is LEGACY. Modern approach is TypeScript wrappers for direct API control and token efficiency.
