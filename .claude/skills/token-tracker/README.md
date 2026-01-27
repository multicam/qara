# Token Tracker Skill

Track and graph token usage data across all your subscriptions and API keys. Like toktop but simpler and extended to all accounts you use in opencode.

## ✨ New: Auto-Config from OpenCode .env

The token-tracker now **automatically piggybacks on OpenCode's `.env` file**! No manual configuration needed if you already have API keys in your OpenCode setup.

### How It Works

If you have API keys in `/path/to/qara/.claude/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_API_KEY=AIza...
```

Token-tracker automatically:
1. Detects your .env file
2. Extracts all `*_API_KEY` and `*_API_TOKEN` entries
3. Creates tracking sources automatically
4. Uses your existing keys without re-entering them

**No duplicate work needed!**

## Quick Start

```bash
cd .claude/skills/token-tracker

# Option 1: Use OpenCode .env (automatic)
bun run track

# Option 2: Configure manually
bun run configure

# Option 3: View reports
bun run report

# Option 4: Generate graphs
bun run graph line 30
```

## Features

- **🔄 Auto-Config**: Piggybacks on OpenCode's `.env` - no setup needed!
- **Multi-Source Tracking**: Anthropic, OpenAI, OpenCode sessions, custom services
- **Historical Data**: Store and query usage over time
- **Visual Graphs**: SVG line charts, bar charts, pie charts
- **Comprehensive Reports**: Statistics, trends, cost analysis
- **Flexible Configuration**: Easy API key management
- **Cost Estimation**: Track token costs across services

## Usage

### 1. Track Usage (Automatic from .env)

```bash
cd .claude/skills/token-tracker
bun run track
```

If you have OpenCode's `.env` file, it will automatically:
- Detect all API keys
- Create tracking sources
- Fetch current usage
- Store in `state/usage-data.json`

**Output:**
```
📊 Token Tracker - Fetching Usage Data
==================================================
No manual config found, using .env file
Fetching from 2 source(s)...

Fetching: Anthropic (.env)...
  ✓ 1,950 tokens
  ✓ $0.0065

Fetching: Openai (.env)...
  ✓ 1,750 tokens
  ✓ $0.0087

✅ Usage data updated successfully!
```

### 2. Manual Configuration (Optional)

If you want to add sources not in `.env` or customize settings:

```bash
bun run configure
```

Options:
1. Add new source (Anthropic, OpenAI, OpenCode, custom)
2. Update existing source (change API keys, toggle enable/disable)
3. Remove source
4. List configured sources
5. Exit

### 3. View Reports

```bash
bun run report
```

Displays comprehensive usage summary including:
- Total tokens and costs
- Usage by service and model
- Daily averages and trends
- Peak/lowest usage days
- Visualization references

### 4. Generate Graphs

```bash
# Line graph (trend over time)
bun run graph line 30

# Bar chart (comparison by service)
bun run graph bar

# Pie chart (distribution)
bun run graph pie
```

## Supported Services

### Auto-Detected from .env
The token-tracker automatically detects any `*_API_KEY` or `*_API_TOKEN` in your `.env`:

- `ANTHROPIC_API_KEY` → Anthropic tracking
- `OPENAI_API_KEY` → OpenAI tracking
- `PERPLEXITY_API_KEY` → Perplexity tracking
- `GOOGLE_API_KEY` → Google tracking
- `REPLICATE_API_TOKEN` → Replicate tracking
- `BRIGHTDATA_API_KEY` → BrightData tracking
- Any custom `*_API_KEY` → Custom service tracking

### Manual Configuration
You can also manually configure:
- Anthropic (Claude)
- OpenAI (GPT)
- OpenCode (local sessions)
- Custom services (user-provided endpoint)

## Data Storage

```
state/
├── config.json           # Manual API configurations (optional)
├── usage-data.json       # Historical usage records
├── graphs/              # Generated visualizations
│   ├── usage-trend-YYYY-MM-DD.svg
│   ├── usage-bar-YYYY-MM-DD.svg
│   └── usage-pie-YYYY-MM-DD.svg
└── reports/             # Generated reports
    └── report-YYYY-MM-DD.txt
```

## Integration with OpenCode

### Piggybacking on .env
Token-tracker automatically reads OpenCode's `.env` file at:
```
/home/jean-marc/qara/.claude/.env
```

This means:
- ✅ No duplicate API key entry
- ✅ Uses your existing security setup
- ✅ Single source of truth for credentials
- ✅ Automatic detection of new services

### Skill Integration
The token-tracker skill integrates with PAI skill system. From any OpenCode session:

```
User: "track tokens"
→ Routes to track-usage workflow
→ Auto-detects .env sources
→ Collects and stores usage data

User: "show my token report"
→ Routes to show-report workflow
→ Displays comprehensive statistics

User: "graph my token consumption"
→ Routes to generate-graph workflow
→ Creates SVG visualization
```

## Security

### API Keys
- **Auto-detection** reads from OpenCode's `.env` (no duplication)
- **Manual config** stores in `state/config.json` (optional)
- **Never commit** `.env` or `config.json` to version control
- Add to `.gitignore`: `.claude/skills/token-tracker/state/config.json`

### File Permissions
```bash
# .env is already secured by OpenCode
chmod 700 state/
chmod 600 state/config.json
chmod 644 state/usage-data.json
```

## Troubleshooting

### "No sources configured"
**Solution 1:** Ensure OpenCode's `.env` exists and has API keys
```bash
cat ~/.claude/.env | grep API_KEY
```

**Solution 2:** Run manual configuration
```bash
bun run configure
```

### "No usage data found"
Run tracking first:
```bash
bun run track
```

### API key validation failed
- Verify key is correct (check `.env` file)
- Check key has read/usage permissions
- Ensure account has usage available
- For OpenAI: The usage endpoint may be restricted

### "Failed to fetch from .env"
Check file path:
```bash
# Should exist:
ls -la ~/.claude/.env

# Token-tracker looks here:
/home/jean-marc/qara/.claude/.env
```

## Advanced: Manual + Auto Configuration

You can use both `.env` (auto) and `config.json` (manual):

**Priority:**
1. Manual sources (`state/config.json`) - highest priority
2. Auto-detected sources (`.env`) - fallback

This means you can:
- Override specific services with manual config
- Add new services not in `.env`
- Mix auto-detected and manually configured sources

## Development

```bash
# Install dependencies (uses Bun)
bun install

# Run tests
bun test

# Run workflows directly
bun workflows/track-usage.js
bun workflows/show-report.js
bun workflows/generate-graph.js line 30
```

## License

MIT License - See LICENSE file for details
