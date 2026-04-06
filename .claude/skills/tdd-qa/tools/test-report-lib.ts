/**
 * test-report-lib.ts — Types and library functions for test-report CLI.
 *
 * Imported by test-report.ts (CLI) and by tests.
 */

import { existsSync, statSync } from "fs";
import { basename, dirname, join, extname } from "path";
import { parseScenarioFile, parseScenarioDir, type ScenarioManifest } from "./scenario-parser";
import { isTestFile } from "../../../hooks/lib/tdd-state";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  classname: string;
  time: number;
  status: "pass" | "fail" | "skip";
  failure?: string;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
}

export interface CoverageSummary {
  totalLines: number;
  coveredLines: number;
  pct: number;
}

export interface ComparisonResult {
  regressions: TestResult[];
  fixed: TestResult[];
  newTests: TestResult[];
  removed: string[];
  baselineTotal: number;
  currentTotal: number;
  coverageBaseline?: CoverageSummary;
  coverageCurrent?: CoverageSummary;
  coverageDelta?: number;
  gatesPassed: boolean;
  gateFailures: string[];
}

// ─── JUnit XML Parser ────────────────────────────────────────────────────────

export function parseJUnitXML(xml: string): TestSummary {
  const results: TestResult[] = [];

  // Match all testcase elements (self-closing and with children)
  const testcaseRegex =
    /<testcase\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let match: RegExpExecArray | null;

  while ((match = testcaseRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const body = match[2] || "";

    const name = extractAttr(attrs, "name") || "unknown";
    const classname = extractAttr(attrs, "classname") || "";
    const time = parseFloat(extractAttr(attrs, "time") || "0");

    let status: "pass" | "fail" | "skip" = "pass";
    let failure: string | undefined;

    if (body.includes("<failure") || body.includes("<error")) {
      status = "fail";
      const failMatch = body.match(
        /<(?:failure|error)[^>]*>([\s\S]*?)<\/(?:failure|error)>/
      );
      failure = failMatch?.[1]?.trim();
    } else if (body.includes("<skipped")) {
      status = "skip";
    }

    results.push({ name, classname, time, status, failure });
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    skipped: results.filter((r) => r.status === "skip").length,
    results,
  };
}

function extractAttr(attrs: string, name: string): string | null {
  const regex = new RegExp(`(?:^|\\s)${name}="([^"]*)"`, "i");
  const match = attrs.match(regex);
  return match ? decodeXMLEntities(match[1]) : null;
}

function decodeXMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ─── lcov Parser ─────────────────────────────────────────────────────────────

export function parseLcov(content: string): CoverageSummary {
  let totalLines = 0;
  let coveredLines = 0;

  const records = content.split("end_of_record");
  for (const record of records) {
    const lfMatch = record.match(/^LF:(\d+)/m);
    const lhMatch = record.match(/^LH:(\d+)/m);
    if (lfMatch) totalLines += parseInt(lfMatch[1], 10);
    if (lhMatch) coveredLines += parseInt(lhMatch[1], 10);
  }

  return {
    totalLines,
    coveredLines,
    pct: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
  };
}

// ─── Comparator ──────────────────────────────────────────────────────────────

export function compare(
  baseline: TestSummary,
  current: TestSummary,
  coverageBaseline?: CoverageSummary,
  coverageCurrent?: CoverageSummary
): ComparisonResult {
  const baseMap = new Map(
    baseline.results.map((t) => [testKey(t), t])
  );
  const currMap = new Map(
    current.results.map((t) => [testKey(t), t])
  );

  const regressions: TestResult[] = [];
  const fixed: TestResult[] = [];
  const newTests: TestResult[] = [];
  const removed: string[] = [];

  // Check current tests against baseline
  for (const [key, curr] of currMap) {
    const base = baseMap.get(key);
    if (!base) {
      newTests.push(curr);
    } else if (base.status === "pass" && curr.status === "fail") {
      regressions.push(curr);
    } else if (base.status === "fail" && curr.status === "pass") {
      fixed.push(curr);
    }
  }

  // Check for removed tests
  for (const [key] of baseMap) {
    if (!currMap.has(key)) {
      removed.push(key);
    }
  }

  // Coverage delta
  let coverageDelta: number | undefined;
  if (coverageBaseline && coverageCurrent) {
    coverageDelta = coverageCurrent.pct - coverageBaseline.pct;
  }

  // Gate evaluation
  const gateFailures: string[] = [];

  if (regressions.length > 0) {
    gateFailures.push(
      `REGRESSION: ${regressions.length} test(s) that previously passed now fail`
    );
  }

  if (coverageDelta !== undefined && coverageDelta < 0) {
    gateFailures.push(
      `COVERAGE: decreased by ${Math.abs(coverageDelta).toFixed(1)}% (${coverageBaseline!.pct.toFixed(1)}% → ${coverageCurrent!.pct.toFixed(1)}%)`
    );
  }

  return {
    regressions,
    fixed,
    newTests,
    removed,
    baselineTotal: baseline.total,
    currentTotal: current.total,
    coverageBaseline,
    coverageCurrent,
    coverageDelta,
    gatesPassed: gateFailures.length === 0,
    gateFailures,
  };
}

function testKey(t: TestResult): string {
  return `${t.classname}::${t.name}`;
}

// ─── Formatter ───────────────────────────────────────────────────────────────

export function formatReport(result: ComparisonResult): string {
  const lines: string[] = [];

  if (result.regressions.length > 0) {
    lines.push("REGRESSIONS (new failures):");
    for (const r of result.regressions) {
      lines.push(`  ${r.classname} > ${r.name}  [PASS → FAIL]`);
      if (r.failure) {
        lines.push(`    ${r.failure.substring(0, 200)}`);
      }
    }
    lines.push("");
  }

  if (result.fixed.length > 0) {
    lines.push("FIXED (newly passing):");
    for (const f of result.fixed) {
      lines.push(`  ${f.classname} > ${f.name}  [FAIL → PASS]`);
    }
    lines.push("");
  }

  if (result.newTests.length > 0) {
    lines.push(`NEW TESTS: ${result.newTests.length} added`);
    lines.push("");
  }

  if (result.removed.length > 0) {
    lines.push(`REMOVED TESTS: ${result.removed.length} no longer present`);
    lines.push("");
  }

  if (result.coverageBaseline && result.coverageCurrent) {
    const delta = result.coverageDelta!;
    const sign = delta >= 0 ? "+" : "";
    const pass = delta >= 0 ? "PASS" : "FAIL";
    lines.push(
      `COVERAGE: ${result.coverageBaseline.pct.toFixed(1)}% → ${result.coverageCurrent.pct.toFixed(1)}%  Delta: ${sign}${delta.toFixed(1)}%  ${pass}`
    );
    lines.push("");
  }

  lines.push(
    `TESTS: ${result.baselineTotal} baseline → ${result.currentTotal} current`
  );

  if (result.gatesPassed) {
    lines.push("\nGATE RESULT: PASS");
  } else {
    lines.push("\nGATE RESULT: FAIL");
    for (const f of result.gateFailures) {
      lines.push(`  ✗ ${f}`);
    }
  }

  return lines.join("\n");
}

// ─── Affected Test Finder ────────────────────────────────────────────────────

export interface AffectedResult {
  changedFiles: string[];
  affectedTests: string[];
  unmappedFiles: string[];
}

// isTestFile imported from tdd-state.ts — single source of truth for test file detection

/**
 * Find test files affected by changed source files.
 * Uses co-location heuristic: foo.ts → foo.test.ts, foo.integration.test.ts
 */
export function findAffectedTests(changedFiles: string[]): AffectedResult {
  const seen = new Set<string>();
  const unmappedFiles: string[] = [];

  for (const file of changedFiles) {
    // If the changed file IS a test file, include it directly
    if (isTestFile(file)) {
      if (existsSync(file) && !seen.has(file)) {
        seen.add(file);
      } else if (!existsSync(file)) {
        unmappedFiles.push(file);
      }
      continue;
    }

    const dir = dirname(file);
    const ext = extname(file);
    const base = basename(file, ext);
    let found = false;

    // Check co-located test files
    const candidates = [
      join(dir, `${base}.test.ts`),
      join(dir, `${base}.test.js`),
      join(dir, `${base}.integration.test.ts`),
      join(dir, `${base}.integration.test.js`),
    ];

    // Also check src/ → tests/ mirror path (replace first /src/ segment only)
    const srcSegment = dir.startsWith("src/") ? "src/" : dir.includes("/src/") ? "/src/" : null;
    if (srcSegment) {
      const idx = dir.indexOf(srcSegment);
      const mirrorDir = dir.substring(0, idx) + srcSegment.replace("src", "tests") + dir.substring(idx + srcSegment.length);
      candidates.push(
        join(mirrorDir, `${base}.test.ts`),
        join(mirrorDir, `${base}.test.js`),
      );
    }

    for (const candidate of candidates) {
      if (existsSync(candidate) && !seen.has(candidate)) {
        seen.add(candidate);
        found = true;
      }
    }

    if (!found) {
      unmappedFiles.push(file);
    }
  }

  return { changedFiles, affectedTests: [...seen], unmappedFiles };
}

// ─── Scenario Coverage ───────────────────────────────────────────────────────

export interface ScenarioMapping {
  scenario: string;
  priority: string;
  matchedTest: string | null;
}

export interface ScenarioCoverageResult {
  total: number;
  mapped: number;
  unmapped: number;
  mappings: ScenarioMapping[];
  criticalUnmapped: ScenarioMapping[];
  passed: boolean;
}

/**
 * Normalize a string for fuzzy matching: lowercase, strip "scenario:" prefix,
 * collapse whitespace, remove punctuation.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^scenario:\s*/i, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cross-reference parsed scenarios against JUnit XML test case names.
 * Uses fuzzy matching: normalized scenario name must appear as a substring
 * of the normalized test name (or vice versa).
 */
export function scenarioCoverage(
  manifests: ScenarioManifest[],
  testSummary: TestSummary
): ScenarioCoverageResult {
  const testNames = testSummary.results.map((t) => ({
    original: `${t.classname} > ${t.name}`,
    normalized: normalize(`${t.classname} ${t.name}`),
  }));

  const mappings: ScenarioMapping[] = [];

  for (const manifest of manifests) {
    for (const scenario of manifest.scenarios) {
      const scenarioNorm = normalize(scenario.name);
      let matchedTest: string | null = null;

      for (const test of testNames) {
        // One-direction: test name must contain the scenario name (not reverse)
        // Reverse matching is too permissive — short names match everything
        if (test.normalized.includes(scenarioNorm)) {
          matchedTest = test.original;
          break;
        }
      }

      mappings.push({
        scenario: scenario.name,
        priority: scenario.priority,
        matchedTest,
      });
    }
  }

  const mapped = mappings.filter((m) => m.matchedTest !== null).length;
  const criticalUnmapped = mappings.filter(
    (m) => m.matchedTest === null && m.priority === "critical"
  );

  return {
    total: mappings.length,
    mapped,
    unmapped: mappings.length - mapped,
    mappings,
    criticalUnmapped,
    passed: criticalUnmapped.length === 0,
  };
}

export function formatScenarioCoverage(result: ScenarioCoverageResult): string {
  const lines: string[] = [];
  lines.push(`SCENARIO COVERAGE: ${result.mapped}/${result.total} scenarios mapped to tests`);
  lines.push("");

  const unmapped = result.mappings.filter((m) => m.matchedTest === null);
  if (unmapped.length > 0) {
    lines.push("UNMAPPED SCENARIOS:");
    for (const m of unmapped) {
      lines.push(`  [${m.priority}] "${m.scenario}"`);
    }
    lines.push("");
  }

  const mappedEntries = result.mappings.filter((m) => m.matchedTest !== null);
  if (mappedEntries.length > 0) {
    lines.push("MAPPED SCENARIOS:");
    for (const m of mappedEntries) {
      lines.push(`  [${m.priority}] "${m.scenario}" → ${m.matchedTest}`);
    }
    lines.push("");
  }

  if (result.passed) {
    lines.push("GATE RESULT: PASS (all critical scenarios have matching tests)");
  } else {
    lines.push("GATE RESULT: FAIL");
    for (const c of result.criticalUnmapped) {
      lines.push(`  ✗ Critical scenario unmapped: "${c.scenario}"`);
    }
  }

  return lines.join("\n");
}
