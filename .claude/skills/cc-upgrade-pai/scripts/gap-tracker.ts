#!/usr/bin/env bun
/**
 * gap-tracker.ts — Living OMC vs PAI capability comparison.
 *
 * CLI for maintaining a manifest of capabilities with PAI/OMC status.
 * Uses filesystem checks to auto-detect PAI features.
 *
 * Usage:
 *   bun gap-tracker.ts scan          # Detect PAI capabilities
 *   bun gap-tracker.ts report        # Generate markdown comparison
 *   bun gap-tracker.ts add --name "X" --category hooks --pai implemented
 *   bun gap-tracker.ts check-omc     # Check OMC repo for new features (gh api)
 *   bun gap-tracker.ts --help
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

type Category = "modes" | "memory" | "hooks" | "agents" | "skills" | "introspection" | "integration";
type Status = "implemented" | "partial" | "planned" | "not-applicable";

interface CapabilityEntry {
  name: string;
  category: Category;
  paiStatus: Status;
  omcStatus: "implemented" | "partial" | "unknown";
  paiEvidence: string;
  notes: string;
}

interface GapManifest {
  lastUpdated: string;
  omcLastChecked: string;
  capabilities: CapabilityEntry[];
}

// ─── Path resolution ────────────────────────────────────────────────────────

const PAI_DIR = process.env.PAI_DIR || join(
  process.env.HOME || require("os").homedir(),
  ".claude"
);

const MANIFEST_PATH = process.env.GAP_MANIFEST_PATH || join(
  import.meta.dir, "..", "references", "gap-manifest.json"
);

// ─── Manifest I/O ───────────────────────────────────────────────────────────

function loadManifest(): GapManifest {
  if (existsSync(MANIFEST_PATH)) {
    try { return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")); }
    catch { /* fall through */ }
  }
  return { lastUpdated: "", omcLastChecked: "", capabilities: [] };
}

function saveManifest(manifest: GapManifest): void {
  manifest.lastUpdated = new Date().toISOString();
  const dir = join(MANIFEST_PATH, "..");
  if (!existsSync(dir)) {
    require("fs").mkdirSync(dir, { recursive: true });
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// ─── Feature checks ────────────────────────────────────────────────────────

interface FeatureCheck {
  name: string;
  category: Category;
  omcStatus: "implemented" | "partial" | "unknown";
  check: (paiDir: string) => { status: Status; evidence: string };
  notes: string;
}

/** Check if a file exists and its content matches a pattern */
function fileContentMatches(path: string, pattern: string | RegExp): boolean {
  if (!existsSync(path)) return false;
  try {
    const content = readFileSync(path, "utf-8");
    return typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
  } catch { return false; }
}

const NOT_APPLICABLE: { status: Status; evidence: string } = { status: "not-applicable", evidence: "" };

const FEATURE_CHECKS: FeatureCheck[] = [
  {
    name: "Persistent Execution Modes",
    category: "modes",
    omcStatus: "implemented",
    notes: "OMC: 5 modes (team/autopilot/ralph/ultrawork/pipeline). PAI: 3 modes (drive/cruise/turbo).",
    check: (p) => {
      const hasLib = existsSync(join(p, ".claude", "hooks", "lib", "mode-state.ts"));
      const hasRouter = existsSync(join(p, ".claude", "hooks", "keyword-router.ts"));
      const modes = ["drive", "cruise", "turbo"].filter(m => existsSync(join(p, ".claude", "skills", m, "SKILL.md")));
      if (hasLib && hasRouter && modes.length === 3) return { status: "implemented", evidence: `mode-state.ts + keyword-router + ${modes.length} mode skills` };
      if (hasLib || hasRouter) return { status: "partial", evidence: `lib:${hasLib}, router:${hasRouter}, modes:${modes.length}` };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Working Memory",
    category: "memory",
    omcStatus: "unknown",
    notes: "PAI-unique: 4-file session-scoped memory (learnings/decisions/issues/problems).",
    check: (p) => {
      const wm = existsSync(join(p, ".claude", "hooks", "lib", "working-memory.ts"));
      if (wm) return { status: "implemented", evidence: "working-memory.ts" };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Checkpoint/Crash Recovery",
    category: "memory",
    omcStatus: "unknown",
    notes: "PAI-unique: compact-checkpoint.ts saves all state before context compression.",
    check: (p) => {
      const cc = existsSync(join(p, ".claude", "hooks", "lib", "compact-checkpoint.ts"));
      if (cc) return { status: "implemented", evidence: "compact-checkpoint.ts" };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Read-Before-Edit Enforcement",
    category: "hooks",
    omcStatus: "unknown",
    notes: "PAI-unique (#42796 defense): session read ledger + edit gate.",
    check: (p) => {
      const path = join(p, ".claude", "hooks", "pre-tool-use-quality.ts");
      if (!existsSync(path)) return NOT_APPLICABLE;
      if (fileContentMatches(path, "files-read")) return { status: "implemented", evidence: "pre-tool-use-quality.ts with read ledger" };
      return { status: "partial", evidence: "quality hook exists but no read-before-edit" };
    },
  },
  {
    name: "Rate Limit Resilience",
    category: "hooks",
    omcStatus: "implemented",
    notes: "OMC: rate limit daemon. PAI: post-tool-failure detection + auto-checkpoint.",
    check: (p) => {
      const path = join(p, ".claude", "hooks", "post-tool-failure.ts");
      if (fileContentMatches(path, /rate|429/)) return { status: "implemented", evidence: "post-tool-failure.ts with rate limit detection" };
      return NOT_APPLICABLE;
    },
  },
  {
    name: "TDD Enforcement",
    category: "hooks",
    omcStatus: "unknown",
    notes: "PAI-unique: RED/GREEN/REFACTOR state machine with hook gating.",
    check: (p) => {
      const tdd = existsSync(join(p, ".claude", "hooks", "pre-tool-use-tdd.ts"));
      if (tdd) return { status: "implemented", evidence: "pre-tool-use-tdd.ts" };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Security Gating",
    category: "hooks",
    omcStatus: "unknown",
    notes: "PAI-unique: 22+ patterns, block/approve/ask decisions.",
    check: (p) => {
      const sec = existsSync(join(p, ".claude", "hooks", "pre-tool-use-security.ts"));
      if (sec) return { status: "implemented", evidence: "pre-tool-use-security.ts" };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Multi-Tier Agent Variants",
    category: "agents",
    omcStatus: "implemented",
    notes: "OMC: 29-32 agents with low/med/high tiers. PAI: 18 agents (13 base + 5 tiered).",
    check: (p) => {
      const agentsDir = join(p, ".claude", "agents");
      if (!existsSync(agentsDir)) return { status: "not-applicable", evidence: "" };
      try {
        const files = readdirSync(agentsDir).filter(f => f.endsWith(".md"));
        const tiered = files.filter(f => /-low\.md$|-high\.md$/.test(f));
        if (tiered.length > 0) return { status: "implemented", evidence: `${files.length} agents (${tiered.length} tiered)` };
        if (files.length > 0) return { status: "partial", evidence: `${files.length} agents, no tiered variants` };
      } catch { /* fall through */ }
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Introspection System",
    category: "introspection",
    omcStatus: "partial",
    notes: "OMC: session search. PAI: 3-cadence mining + synthesis pipeline.",
    check: (p) => {
      const introspect = existsSync(join(p, ".claude", "skills", "introspect", "SKILL.md"));
      if (introspect) return { status: "implemented", evidence: "skills/introspect/ with daily/weekly/monthly cadences" };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Cross-Provider Synthesis",
    category: "integration",
    omcStatus: "implemented",
    notes: "OMC: /ccg (Codex+Gemini+Claude). PAI: Claude subagent + Gemma 4 local.",
    check: (p) => {
      const cp = existsSync(join(p, ".claude", "skills", "cross-provider", "SKILL.md"));
      if (cp) return { status: "implemented", evidence: "skills/cross-provider/" };
      return { status: "not-applicable", evidence: "" };
    },
  },
  {
    name: "Token Optimization",
    category: "integration",
    omcStatus: "implemented",
    notes: "OMC: auto model routing (30-50%). PAI: RTK (60-90% on CLI output).",
    check: (p) => {
      const rtk = existsSync(join(p, ".claude", "hooks", "rtk-rewrite.sh"));
      if (rtk) return { status: "implemented", evidence: "rtk-rewrite.sh" };
      return { status: "not-applicable", evidence: "" };
    },
  },
];

// ─── Commands ───────────────────────────────────────────────────────────────

function cmdScan(): void {
  const manifest = loadManifest();

  for (const check of FEATURE_CHECKS) {
    const { status, evidence } = check.check(PAI_DIR);
    const existing = manifest.capabilities.find(c => c.name === check.name);
    if (existing) {
      existing.paiStatus = status;
      existing.paiEvidence = evidence;
      existing.omcStatus = check.omcStatus;
      existing.notes = check.notes;
    } else {
      manifest.capabilities.push({
        name: check.name,
        category: check.category,
        paiStatus: status,
        omcStatus: check.omcStatus,
        paiEvidence: evidence,
        notes: check.notes,
      });
    }
  }

  saveManifest(manifest);
  console.log(`Scanned ${FEATURE_CHECKS.length} capabilities. Manifest saved.`);
}

function cmdReport(): void {
  const manifest = loadManifest();
  if (manifest.capabilities.length === 0) {
    console.log("No capabilities in manifest. Run `scan` first.");
    return;
  }

  const lines: string[] = [
    "# OMC vs PAI Gap Analysis",
    "",
    `Last updated: ${manifest.lastUpdated}`,
    "",
    "| Capability | Category | PAI | OMC | Evidence |",
    "|------------|----------|-----|-----|----------|",
  ];

  for (const c of manifest.capabilities) {
    lines.push(`| ${c.name} | ${c.category} | ${c.paiStatus} | ${c.omcStatus} | ${c.paiEvidence || "-"} |`);
  }

  const implemented = manifest.capabilities.filter(c => c.paiStatus === "implemented").length;
  const total = manifest.capabilities.length;
  lines.push("", `**PAI coverage: ${implemented}/${total} implemented**`);

  console.log(lines.join("\n"));
}

function cmdAdd(args: string[]): void {
  let name = "", category = "" as Category, pai = "planned" as Status;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) name = args[++i];
    else if (args[i] === "--category" && args[i + 1]) category = args[++i] as Category;
    else if (args[i] === "--pai" && args[i + 1]) pai = args[++i] as Status;
  }
  if (!name || !category) {
    console.error("Usage: gap-tracker add --name <name> --category <cat> --pai <status>");
    process.exit(1);
  }

  const manifest = loadManifest();
  const existing = manifest.capabilities.find(c => c.name === name);
  if (existing) {
    existing.paiStatus = pai;
    existing.category = category;
  } else {
    manifest.capabilities.push({ name, category, paiStatus: pai, omcStatus: "unknown", paiEvidence: "", notes: "" });
  }
  saveManifest(manifest);
  console.log(`Added: ${name} (${category}, ${pai})`);
}

function cmdCheckOmc(): void {
  console.log("OMC check requires `gh` CLI. Run manually:");
  console.log('  gh api repos/Yeachan-Heo/oh-my-claudecode/commits --jq \'.[0:5] | .[] | "\\(.sha[0:7]) \\(.commit.message | split("\\n")[0]) (\\(.commit.author.date[0:10]))"\'');
  const manifest = loadManifest();
  manifest.omcLastChecked = new Date().toISOString();
  saveManifest(manifest);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const USAGE = `Usage: bun gap-tracker.ts <command>

Commands:
  scan          Detect PAI capabilities via filesystem checks
  report        Generate markdown comparison table
  add           Add a capability (--name, --category, --pai)
  check-omc     Check OMC repo for new features
  --help        Show this help`;

const command = process.argv[2];

if (!command || command === "--help" || command === "-h") {
  console.log(USAGE);
  process.exit(0);
}

switch (command) {
  case "scan": cmdScan(); break;
  case "report": cmdReport(); break;
  case "add": cmdAdd(process.argv.slice(3)); break;
  case "check-omc": cmdCheckOmc(); break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log(USAGE);
    process.exit(1);
}
