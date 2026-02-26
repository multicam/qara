# CLI Generation Examples — Basic Examples

Detailed examples demonstrating CLI creation for different tiers and use cases. This file covers Examples 1–6 (Tier 1 and Tier 2 concrete implementations).

For common patterns, tier decision matrix, testing examples, and documentation templates see: `cli-examples-advanced.md`

---

## Example 1: API Client CLI (Tier 1)

**User Request:**
"Create a CLI for the GitHub API that can list repos, create issues, and search code"

**Generated Structure:**
```
~/.claude/bin/ghcli/
├── ghcli.ts              # 350 lines, complete implementation
├── package.json          # Bun + TypeScript
├── tsconfig.json         # Strict mode
├── .env.example          # GITHUB_TOKEN=your_token
├── README.md             # Full documentation
└── QUICKSTART.md         # Common use cases
```

**Usage:**
```bash
ghcli repos --user multicam
ghcli issues create --repo pai --title "Bug fix"
ghcli search "typescript CLI"
ghcli --help
```

**Key Features:**
- Manual argument parsing (process.argv)
- Zero framework dependencies
- Type-safe interfaces
- Comprehensive error handling
- JSON output (composable)
- Configuration via .env
- Complete documentation

---

## Example 2: File Processor (Tier 1)

**User Request:**
"Build a CLI to convert markdown files to HTML with frontmatter extraction"

**Generated Structure:**
```
${PAI_DIR}/bin/md2html/
├── md2html.ts
├── package.json
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
md2html convert input.md output.html
md2html batch *.md output/
md2html extract-frontmatter post.md
```

**Implementation Highlights:**
```typescript
// Type-safe command interface
interface Command {
  name: string;
  args: string[];
  options: Record<string, string>;
}

// Clean function separation
async function convert(input: string, output: string): Promise<void> {
  // Implementation
}

async function batch(pattern: string, outputDir: string): Promise<void> {
  // Implementation
}

async function extractFrontmatter(file: string): Promise<void> {
  // Implementation
}
```

---

## Example 3: Data Pipeline (Tier 2)

**User Request:**
"Create a CLI for data transformation with multiple formats, validation, and analysis commands"

**Generated Structure:**
```
${PAI_DIR}/bin/data-cli/
├── data-cli.ts           # Commander.js with subcommands
├── package.json
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
data-cli convert json csv input.json
data-cli validate schema data.json
data-cli analyze stats data.csv
data-cli transform filter --column=status --value=active
```

**Why Tier 2:**
- 15+ commands across 4 categories
- Complex nested options
- Subcommand grouping needed
- Auto-generated help text
- Multiple output formats

**Implementation with Commander:**
```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('data-cli')
  .description('Data transformation and analysis toolkit')
  .version('1.0.0');

// Convert commands
const convert = program.command('convert');
convert
  .command('json <format> <input>')
  .description('Convert JSON to other formats')
  .action(async (format, input) => {
    // Implementation
  });

// Validate commands
const validate = program.command('validate');
validate
  .command('schema <input>')
  .option('--schema <file>', 'Schema file')
  .action(async (input, options) => {
    // Implementation
  });

program.parse();
```

---

## Example 4: Simple Automation (Tier 1)

**User Request:**
"Create a CLI to automate my daily standup report"

**Generated Structure:**
```
${PAI_DIR}/bin/standup/
├── standup.ts
├── package.json
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
standup generate --yesterday --today --blockers
standup send --slack
standup template
```

**Implementation:**
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
}): Promise<StandupReport> {
  // Implementation
}

async function send(report: StandupReport, channel: string): Promise<void> {
  // Implementation
}

// Main CLI logic
const args = process.argv.slice(2);
const command = args[0];

if (command === 'generate') {
  const report = await generate({
    yesterday: args.includes('--yesterday'),
    today: args.includes('--today'),
    blockers: args.includes('--blockers'),
  });
  console.log(JSON.stringify(report, null, 2));
}
```

---

## Example 5: Database Operations (Tier 2)

**User Request:**
"Create a CLI for PostgreSQL operations - migrations, backups, queries, performance analysis"

**Generated Structure:**
```
${PAI_DIR}/bin/pgcli/
├── pgcli.ts              # Commander.js
├── lib/
│   ├── migrations.ts
│   ├── backups.ts
│   ├── queries.ts
│   └── performance.ts
├── package.json
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
pgcli migrate up
pgcli migrate down --steps=2
pgcli backup create --compress
pgcli backup restore backup-2024-01.sql
pgcli query run queries/report.sql
pgcli perf analyze --slow-queries
```

**Why Separate Modules:**
- Complex domain logic
- Shared database connection
- Better testability
- Cleaner separation

---

## Example 6: HTTP API Client (Tier 1)

**User Request:**
"Create a CLI for the Notion API"

**Generated Structure:**
```
${PAI_DIR}/bin/notioncli/
├── notioncli.ts
├── package.json
├── .env.example
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
notioncli pages list
notioncli pages get <page-id>
notioncli pages create --title "New Page"
notioncli databases query <database-id>
```

**Pattern (llcli-style):**
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

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`);
  }

  return response.json();
}
```

---

**Continued in:** `cli-examples-advanced.md` (Common Patterns, Tier Decision Matrix, Testing Examples, Documentation Examples)
