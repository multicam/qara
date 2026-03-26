# Project Catalog — tdd-qa Scope

Maps all tracked projects to their tdd-qa treatment level.

## Treatment Levels

| Level | What it means | Gets setup doc? | Backtest loop? | Bombadil? |
|-------|---------------|-----------------|----------------|-----------|
| **Active** | JM writes code here daily | Yes (TDD-QA-SETUP.md in repo) | Yes | Yes |
| **Own/Dormant** | JM's repo, not actively developed | Quick-activate template below | On demand | No |
| **Reference** | Third-party, read-only review | No | No | No |

---

## Active Projects (full tdd-qa setup)

| Project | Path | Stack | Setup doc |
|---------|------|-------|-----------|
| **Qara** | `~/qara` | Bun, TypeScript | Built-in (skill lives here) |
| **tgds-schoolyard** | `/media/ssdev/tgds/tgds-schoolyard` | SvelteKit, Vitest, pnpm | `TDD-QA-SETUP.md` |
| **tgds-office** | `/media/ssdev/tgds/tgds-office` | Next.js, Vitest, pnpm | `TDD-QA-SETUP.md` |
| **tgds-website** | `/media/ssdev/tgds/tgds-website` | Gatsby, Vitest, pnpm | `TDD-QA-SETUP.md` |

---

## JM's Own Repos — work/ (multicam)

Dormant or experimental. Activate on demand using the quick-activate template below.

| Repo | Has pkg | Has tests | Has .claude | Notes |
|------|---------|-----------|-------------|-------|
| ai-sveltekit-openai | Yes | No | No | SvelteKit + OpenAI template |
| binchicken | No | No | No | |
| db-workbooks | No | No | No | Database workbooks |
| dev-external | — | — | — | External dev resources |
| doc-themes-agent | No | No | No | Documentation agent |
| growth-agents | No | No | No | Growth automation |
| node-api-ensemble | Yes | Yes | No | Node API — has tests, candidate for activation |
| notebooks | — | — | — | Jupyter notebooks |
| pub-external | — | — | — | Public external resources |
| right-now | No | No | No | |
| sk-edge | Yes | No | No | SvelteKit edge |
| sveltekit-multiservices | No | Yes | No | Multi-service SvelteKit — has tests |
| svelte-trading-dashboards | Yes | No | No | Trading dashboards |
| synthetic-order-book | No | No | No | Order book simulator |
| token-gated-app | Yes | No | No | Token-gated web app |
| webflow-dev-proxy | — | — | — | Webflow dev proxy |
| webflow-svelte-monorepo | — | — | — | Webflow + Svelte |
| widsurf-app | No | No | No | |

---

## Reference Libraries (read-only)

### /media/ssdev/work/ — Notable for testing patterns

| Repo | Why it's interesting |
|------|---------------------|
| `12-factor-agents` | Agent architecture patterns, testing philosophy |
| `anthropic-cookbook` | Anthropic API usage patterns and examples |
| `awesome-mcp-servers` | MCP server catalog |
| `claude-agents` | Claude agent patterns |
| `continuous-claude` / `Continuous-Claude-v2` | Continuous AI development patterns |
| `fabric` | AI prompt engineering framework |
| `mastra` | AI agent framework with testing |
| `skills` (mattpocock) | Upstream skill patterns — tdd-qa adapted from here |
| `agent-skills` / `Agent-Skills-for-Context-Engineering` | Context engineering patterns |
| `compound-engineering-plugin` | Compound AI engineering |

### /media/ssdev/dev/ — Notable for testing patterns

| Repo | Why it's interesting |
|------|---------------------|
| `goose` | Block's open-source coding agent (Stripe Minions forked from this) |
| `onlook` | Visual editor with testing infrastructure |
| `openai-cookbook` | OpenAI patterns and examples |
| `BlockNote` | Rich text editor with comprehensive tests |
| `lexical` | Meta's text editor — excellent test architecture |
| `pixijs` | Game engine — performance testing patterns |
| `plate` | Editor framework with extensive test suite |
| `supervision` | CV library — Python testing patterns |
| `ultralytics` | YOLO — ML testing patterns |

---

## Quick-Activate Template

For any JM-owned repo that needs tdd-qa:

```bash
cd /path/to/repo

# 1. Create specs dir
mkdir -p specs

# 2. Detect test runner and add JUnit XML
if [ -f "vitest.config.js" ] || [ -f "vitest.config.ts" ] || [ -f "vitest.config.mjs" ]; then
  echo "Vitest detected — add junit reporter to vitest config"
  echo "  reporters: ['default', 'junit'],"
  echo "  outputFile: { junit: '.test-current.xml' },"
elif [ -f "bunfig.toml" ] || grep -q '"bun"' package.json 2>/dev/null; then
  echo "Bun detected — use: bun test --reporter=junit --reporter-outfile=.test-current.xml"
else
  echo "Unknown runner — check package.json for test command"
fi

# 3. Add gitignore entries
cat >> .gitignore << 'GITIGNORE'

# tdd-qa baselines
.test-baseline.xml
.test-current.xml
.coverage/
traces/
GITIGNORE

# 4. Add scripts (manually — adapt to your package manager)
echo "Add to package.json scripts:"
echo '  "test:junit": "...(see above)..."'
echo '  "test:baseline": "pnpm test:junit && cp .test-current.xml .test-baseline.xml"'
echo '  "test:backtest": "pnpm test:junit && bun run ~/qara/.claude/skills/tdd-qa/tools/test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml"'
```

This is intentionally manual — dormant repos don't warrant a full setup doc. Copy the template, adapt the runner config, and you're live.

---

## When to Promote a Repo

Move a repo from Dormant → Active when:
1. JM starts writing code in it regularly
2. It has (or needs) a test suite
3. It would benefit from scenario specs and backtest loops

Promotion means: create a `TDD-QA-SETUP.md` in the repo root using the TGDS setup docs as templates.
