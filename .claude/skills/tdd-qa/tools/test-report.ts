#!/usr/bin/env bun
/**
 * test-report.ts — Deterministic test result comparator
 *
 * Parses JUnit XML and lcov files, compares baselines, enforces quality gates.
 * Exit code 0 = all gates pass. Exit code 1 = regression or gate failure.
 *
 * Usage:
 *   bun run test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml
 *   bun run test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml \
 *     --coverage-baseline .coverage-baseline/lcov.info --coverage-current .coverage/lcov.info
 *   bun run test-report.ts parse --file results.xml
 */

import { readFileSync, existsSync } from "fs";
import { basename, dirname, join, extname } from "path";

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
  const regex = new RegExp(`${name}="([^"]*)"`, "i");
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

const TEST_EXTENSIONS = [".test.ts", ".test.js", ".spec.ts", ".spec.js", ".integration.test.ts", ".integration.test.js"];

function isTestFilePath(filePath: string): boolean {
  const name = basename(filePath);
  return TEST_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
    name.endsWith(".draft.spec.ts") ||
    name.endsWith(".bombadil.ts");
}

/**
 * Find test files affected by changed source files.
 * Uses co-location heuristic: foo.ts → foo.test.ts, foo.integration.test.ts
 */
export function findAffectedTests(changedFiles: string[]): AffectedResult {
  const affectedTests: string[] = [];
  const unmappedFiles: string[] = [];

  for (const file of changedFiles) {
    // If the changed file IS a test file, include it directly
    if (isTestFilePath(file)) {
      if (existsSync(file) && !affectedTests.includes(file)) {
        affectedTests.push(file);
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

    // Also check src/ → tests/ mirror path
    if (dir.includes("/src/") || dir.startsWith("src/")) {
      const mirrorDir = dir.replace(/\/src\/|^src\//, "/tests/").replace(/^\//, "");
      candidates.push(
        join(mirrorDir, `${base}.test.ts`),
        join(mirrorDir, `${base}.test.js`),
      );
    }

    for (const candidate of candidates) {
      if (existsSync(candidate) && !affectedTests.includes(candidate)) {
        affectedTests.push(candidate);
        found = true;
      }
    }

    if (!found) {
      unmappedFiles.push(file);
    }
  }

  return { changedFiles, affectedTests, unmappedFiles };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export const USAGE = `Usage:
  test-report compare --baseline <xml> --current <xml> [--coverage-baseline <lcov> --coverage-current <lcov>]
  test-report parse --file <xml>
  test-report affected --files <path1,path2,...>`;

export interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runCLI(args: string[]): CLIResult {
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    return { exitCode: 0, stdout: USAGE, stderr: "" };
  }

  if (command === "parse") {
    const fileIdx = args.indexOf("--file");
    if (fileIdx === -1 || !args[fileIdx + 1]) {
      return { exitCode: 1, stdout: "", stderr: "Error: --file is required for parse command" };
    }
    const xml = readFileSync(args[fileIdx + 1], "utf-8");
    const summary = parseJUnitXML(xml);
    const msg = `Tests: ${summary.total} total, ${summary.passed} pass, ${summary.failed} fail, ${summary.skipped} skip`;
    return { exitCode: summary.failed > 0 ? 1 : 0, stdout: msg, stderr: "" };
  }

  if (command === "compare") {
    const baselineIdx = args.indexOf("--baseline");
    const currentIdx = args.indexOf("--current");

    if (
      baselineIdx === -1 ||
      !args[baselineIdx + 1] ||
      currentIdx === -1 ||
      !args[currentIdx + 1]
    ) {
      return { exitCode: 1, stdout: "", stderr: "Error: --baseline and --current are required for compare" };
    }

    const baselineXml = readFileSync(args[baselineIdx + 1], "utf-8");
    const currentXml = readFileSync(args[currentIdx + 1], "utf-8");

    const baseline = parseJUnitXML(baselineXml);
    const current = parseJUnitXML(currentXml);

    let covBaseline: CoverageSummary | undefined;
    let covCurrent: CoverageSummary | undefined;

    const covBaseIdx = args.indexOf("--coverage-baseline");
    const covCurrIdx = args.indexOf("--coverage-current");
    if (
      covBaseIdx !== -1 &&
      args[covBaseIdx + 1] &&
      covCurrIdx !== -1 &&
      args[covCurrIdx + 1]
    ) {
      covBaseline = parseLcov(readFileSync(args[covBaseIdx + 1], "utf-8"));
      covCurrent = parseLcov(readFileSync(args[covCurrIdx + 1], "utf-8"));
    }

    const result = compare(baseline, current, covBaseline, covCurrent);
    return { exitCode: result.gatesPassed ? 0 : 1, stdout: formatReport(result), stderr: "" };
  }

  if (command === "affected") {
    const filesIdx = args.indexOf("--files");
    if (filesIdx === -1 || !args[filesIdx + 1]) {
      return { exitCode: 1, stdout: "", stderr: "Error: --files is required for affected command" };
    }
    const files = args[filesIdx + 1].split(",").map((f) => f.trim()).filter(Boolean);
    const result = findAffectedTests(files);

    if (result.affectedTests.length === 0) {
      const msg = result.unmappedFiles.length > 0
        ? `No test files found for: ${result.unmappedFiles.join(", ")}`
        : "No test files found";
      return { exitCode: 1, stdout: msg, stderr: "" };
    }

    const lines = result.affectedTests;
    if (result.unmappedFiles.length > 0) {
      lines.push(`# unmapped: ${result.unmappedFiles.join(", ")}`);
    }
    return { exitCode: 0, stdout: lines.join("\n"), stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: ${command}\n${USAGE}` };
}

// Thin wrapper for direct execution
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("test-report.ts");
if (isDirectExecution && !process.env.TEST_REPORT_NO_CLI) {
  const result = runCLI(process.argv.slice(2));
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(result.exitCode);
}
