#!/usr/bin/env bun
/**
 * scenario-parser.ts — Deterministic markdown scenario parser
 *
 * Extracts structured ScenarioManifest data from specs/*.md files
 * following the scenario-format.md template (Given/When/Then + Priority).
 *
 * CLI: bun scenario-parser.ts <file-or-dir> [--json]
 * Library: import { parseScenarioFile, parseScenarioDir } from './scenario-parser'
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StepKeyword = "Given" | "When" | "Then" | "And";
export type Priority = "critical" | "important" | "nice-to-have";

export interface ScenarioStep {
  keyword: StepKeyword;
  text: string;
}

export interface Scenario {
  name: string;
  steps: ScenarioStep[];
  priority: Priority;
}

export interface ScenarioManifest {
  feature: string;
  context: string;
  scenarios: Scenario[];
  outOfScope: string[];
  acceptanceCriteria: string[];
  sourceFile: string;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

const STEP_RE = /^-\s+\*\*(Given|When|Then|And)\*\*\s+(.+)$/;
const PRIORITY_RE = /^-\s+\*\*Priority:\*\*\s*(critical|important|nice-to-have)/i;
const FEATURE_RE = /^#\s+Feature:\s*(.+)$/;
const H2_RE = /^##\s+(.+)$/;
const H3_SCENARIO_RE = /^###\s+Scenario:\s*(.+)$/;
const LIST_ITEM_RE = /^-\s+(?:\[.\]\s+)?(.+)$/;

/**
 * Parse a single scenario spec file into a structured manifest.
 */
export function parseScenarioFile(
  content: string,
  sourceFile: string
): ScenarioManifest {
  const lines = content.split("\n");

  let feature = "";
  let context = "";
  const scenarios: Scenario[] = [];
  const outOfScope: string[] = [];
  const acceptanceCriteria: string[] = [];

  let currentSection: "none" | "context" | "scenarios" | "out-of-scope" | "acceptance" = "none";
  let currentScenario: Scenario | null = null;
  const contextLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Feature heading
    const featureMatch = trimmed.match(FEATURE_RE);
    if (featureMatch) {
      feature = featureMatch[1].trim();
      continue;
    }

    // H2 section headers
    const h2Match = trimmed.match(H2_RE);
    if (h2Match) {
      // Flush any pending scenario
      if (currentScenario) {
        scenarios.push(currentScenario);
        currentScenario = null;
      }

      const sectionName = h2Match[1].trim().toLowerCase();
      if (sectionName === "context") {
        currentSection = "context";
      } else if (sectionName === "scenarios") {
        currentSection = "scenarios";
      } else if (sectionName === "out of scope") {
        currentSection = "out-of-scope";
      } else if (sectionName === "acceptance criteria") {
        currentSection = "acceptance";
      } else {
        currentSection = "none";
      }
      continue;
    }

    // H3 scenario header (only within scenarios section)
    const scenarioMatch = trimmed.match(H3_SCENARIO_RE);
    if (scenarioMatch && currentSection === "scenarios") {
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      currentScenario = {
        name: scenarioMatch[1].trim(),
        steps: [],
        priority: "important", // default if omitted
      };
      continue;
    }

    // Context section — collect paragraph lines
    if (currentSection === "context") {
      if (trimmed) contextLines.push(trimmed);
      continue;
    }

    // Scenarios section — parse steps and priority
    if (currentSection === "scenarios" && currentScenario) {
      const priorityMatch = trimmed.match(PRIORITY_RE);
      if (priorityMatch) {
        currentScenario.priority = priorityMatch[1].toLowerCase() as Priority;
        continue;
      }

      const stepMatch = trimmed.match(STEP_RE);
      if (stepMatch) {
        currentScenario.steps.push({
          keyword: stepMatch[1] as StepKeyword,
          text: stepMatch[2].trim(),
        });
        continue;
      }
    }

    // Out of scope — collect list items
    if (currentSection === "out-of-scope") {
      const listMatch = trimmed.match(LIST_ITEM_RE);
      if (listMatch) {
        outOfScope.push(listMatch[1].trim());
      } else if (trimmed) {
        outOfScope.push(trimmed);
      }
      continue;
    }

    // Acceptance criteria — collect list items
    if (currentSection === "acceptance") {
      const listMatch = trimmed.match(LIST_ITEM_RE);
      if (listMatch) {
        acceptanceCriteria.push(listMatch[1].trim());
      }
      continue;
    }
  }

  // Flush last scenario
  if (currentScenario) {
    scenarios.push(currentScenario);
  }

  context = contextLines.join(" ");

  return {
    feature,
    context,
    scenarios,
    outOfScope,
    acceptanceCriteria,
    sourceFile,
  };
}

/**
 * Parse all .md files in a directory (excluding README.md).
 */
export function parseScenarioDir(dirPath: string): ScenarioManifest[] {
  const files = readdirSync(dirPath)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();

  return files.map((f) => {
    const fullPath = join(dirPath, f);
    const content = readFileSync(fullPath, "utf-8");
    return parseScenarioFile(content, fullPath);
  });
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export const USAGE = `Usage: bun scenario-parser.ts <file-or-dir> [--json]

Parse scenario spec files into structured manifests.

  <file>   Parse a single .md file
  <dir>    Parse all .md files in directory (excluding README.md)
  --json   Output raw JSON (default: human-readable summary)

Examples:
  bun scenario-parser.ts specs/user-auth.md
  bun scenario-parser.ts specs/
  bun scenario-parser.ts specs/ --json`;

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runCLI(args: string[]): CLIResult {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { exitCode: 0, stdout: USAGE, stderr: "" };
  }

  const target = args[0];
  const jsonMode = args.includes("--json");

  let manifests: ScenarioManifest[];

  try {
    const stat = statSync(target);
    if (stat.isDirectory()) {
      manifests = parseScenarioDir(target);
    } else {
      const content = readFileSync(target, "utf-8");
      manifests = [parseScenarioFile(content, target)];
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Error: ${msg}` };
  }

  if (jsonMode) {
    return { exitCode: 0, stdout: JSON.stringify(manifests, null, 2), stderr: "" };
  }

  // Human-readable summary
  const lines: string[] = [];
  for (const m of manifests) {
    lines.push(`\n# ${m.feature || "(no feature name)"}`);
    lines.push(`  Source: ${m.sourceFile}`);
    if (m.context) lines.push(`  Context: ${m.context}`);
    lines.push(`  Scenarios: ${m.scenarios.length}`);
    for (const s of m.scenarios) {
      lines.push(`    - [${s.priority}] ${s.name} (${s.steps.length} steps)`);
    }
    if (m.outOfScope.length > 0) {
      lines.push(`  Out of scope: ${m.outOfScope.length} items`);
    }
    if (m.acceptanceCriteria.length > 0) {
      lines.push(`  Acceptance criteria: ${m.acceptanceCriteria.length} items`);
    }
  }
  return { exitCode: 0, stdout: lines.join("\n"), stderr: "" };
}

// Direct execution guard — same pattern as test-report.ts and tdd-state.ts
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("scenario-parser.ts");
if (isDirectExecution && !process.env.SCENARIO_PARSER_NO_CLI) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const result = runCLI(args);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.exitCode);
  }
}
