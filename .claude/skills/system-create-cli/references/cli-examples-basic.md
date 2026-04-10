# CLI Generation Examples — Basic

Worked examples 1-6 (Tier 1 and Tier 2). See `cli-examples-advanced.md` for patterns, tier matrix, tests, and docs templates.

---

## Example 1: API Client (Tier 1) — GitHub

**Request:** "Create a CLI for the GitHub API — list repos, create issues, search code"

```
~/.claude/bin/ghcli/
├── ghcli.ts              # ~350 lines
├── package.json
├── tsconfig.json
├── .env.example          # GITHUB_TOKEN=...
├── README.md
└── QUICKSTART.md
```

```bash
ghcli repos --user multicam
ghcli issues create --repo pai --title "Bug fix"
ghcli search "typescript CLI"
ghcli --help
```

Manual `process.argv` parsing, zero deps, typed interfaces, JSON output, `.env` config.

---

## Example 2: File Processor (Tier 1) — md2html

**Request:** "Build a CLI to convert markdown to HTML with frontmatter extraction"

```bash
md2html convert input.md output.html
md2html batch *.md output/
md2html extract-frontmatter post.md
```

```typescript
interface Command {
  name: string;
  args: string[];
  options: Record<string, string>;
}

async function convert(input: string, output: string): Promise<void> { /* ... */ }
async function batch(pattern: string, outputDir: string): Promise<void> { /* ... */ }
async function extractFrontmatter(file: string): Promise<void> { /* ... */ }
```

---

## Example 3: Data Pipeline (Tier 2) — data-cli

**Request:** "Data transformation with multiple formats, validation, and analysis"

```bash
data-cli convert json csv input.json
data-cli validate schema data.json
data-cli analyze stats data.csv
data-cli transform filter --column=status --value=active
```

**Why Tier 2:** 15+ commands across 4 categories, nested options, subcommand grouping.

```typescript
import { Command } from 'commander';

const program = new Command()
  .name('data-cli')
  .description('Data transformation and analysis toolkit')
  .version('1.0.0');

const convert = program.command('convert');
convert
  .command('json <format> <input>')
  .description('Convert JSON to other formats')
  .action(async (format, input) => { /* ... */ });

const validate = program.command('validate');
validate
  .command('schema <input>')
  .option('--schema <file>', 'Schema file')
  .action(async (input, options) => { /* ... */ });

program.parse();
```

---

## Example 4: Simple Automation (Tier 1) — standup

**Request:** "Automate my daily standup report"

```bash
standup generate --yesterday --today --blockers
standup send --slack
standup template
```

```typescript
#!/usr/bin/env bun

interface StandupReport {
  yesterday: string[];
  today: string[];
  blockers: string[];
}

async function generate(options: {
  yesterday?: boolean;
  today?: boolean;
  blockers?: boolean;
}): Promise<StandupReport> { /* ... */ }

const args = process.argv.slice(2);
if (args[0] === 'generate') {
  const report = await generate({
    yesterday: args.includes('--yesterday'),
    today: args.includes('--today'),
    blockers: args.includes('--blockers'),
  });
  console.log(JSON.stringify(report, null, 2));
}
```

---

## Example 5: Database Operations (Tier 2) — pgcli

**Request:** "PostgreSQL CLI — migrations, backups, queries, performance"

```
${PAI_DIR}/bin/pgcli/
├── pgcli.ts              # Commander.js entry
├── lib/
│   ├── migrations.ts
│   ├── backups.ts
│   ├── queries.ts
│   └── performance.ts
└── ...
```

```bash
pgcli migrate up
pgcli migrate down --steps=2
pgcli backup create --compress
pgcli backup restore backup-2024-01.sql
pgcli query run queries/report.sql
pgcli perf analyze --slow-queries
```

Split into `lib/` modules for shared DB connection and testability.

---

## Example 6: HTTP API Client (Tier 1) — notioncli

**Request:** "CLI for the Notion API"

```bash
notioncli pages list
notioncli pages get <page-id>
notioncli pages create --title "New Page"
notioncli databases query <database-id>
```

```typescript
interface NotionConfig {
  apiKey: string;
  apiVersion: string;
}

async function makeRequest(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const config = loadConfig();
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Notion-Version': config.apiVersion,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Notion API error: ${response.status}`);
  return response.json();
}
```

---

Continued in `cli-examples-advanced.md` (patterns, tier matrix, testing, docs templates).
