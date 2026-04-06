#!/usr/bin/env bun
/**
 * test-report.ts — Deterministic test result comparator (CLI entry point)
 *
 * Parses JUnit XML and lcov files, compares baselines, enforces quality gates.
 * Exit code 0 = all gates pass. Exit code 1 = regression or gate failure.
 *
 * Usage:
 *   bun run test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml
 *   bun run test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml \
 *     --coverage-baseline .coverage-baseline/lcov.info --coverage-current .coverage/lcov.info
 *   bun run test-report.ts parse --file results.xml
 *
 * Library functions live in test-report-lib.ts.
 */

import { readFileSync, statSync } from "fs";
import { parseScenarioFile, parseScenarioDir, type ScenarioManifest } from "./scenario-parser";
import {
  parseJUnitXML,
  parseLcov,
  compare,
  formatReport,
  findAffectedTests,
  scenarioCoverage,
  formatScenarioCoverage,
  type TestSummary,
  type CoverageSummary,
  type ComparisonResult,
  type TestResult,
  type AffectedResult,
  type ScenarioMapping,
  type ScenarioCoverageResult,
} from "./test-report-lib";

// Re-export everything for backward compatibility — importers of test-report.ts
// get the full public API without changes.
export * from "./test-report-lib";

// ─── CLI ─────────────────────────────────────────────────────────────────────

export const USAGE = `Usage:
  test-report compare --baseline <xml> --current <xml> [--coverage-baseline <lcov> --coverage-current <lcov>]
  test-report parse --file <xml>
  test-report affected --files <path1,path2,...>
  test-report scenario-coverage --specs <dir-or-file> --results <junit-xml>`;

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

    const lines = [...result.affectedTests];
    if (result.unmappedFiles.length > 0) {
      lines.push(`# unmapped: ${result.unmappedFiles.join(", ")}`);
    }
    return { exitCode: 0, stdout: lines.join("\n"), stderr: "" };
  }

  if (command === "scenario-coverage") {
    const specsIdx = args.indexOf("--specs");
    const resultsIdx = args.indexOf("--results");

    if (specsIdx === -1 || !args[specsIdx + 1] || resultsIdx === -1 || !args[resultsIdx + 1]) {
      return { exitCode: 1, stdout: "", stderr: "Error: --specs and --results are required for scenario-coverage" };
    }

    const specsPath = args[specsIdx + 1];
    const resultsPath = args[resultsIdx + 1];

    let manifests: ScenarioManifest[];
    try {
      if (statSync(specsPath).isDirectory()) {
        manifests = parseScenarioDir(specsPath);
      } else {
        const content = readFileSync(specsPath, "utf-8");
        manifests = [parseScenarioFile(content, specsPath)];
      }
    } catch {
      return { exitCode: 1, stdout: "", stderr: `Error: cannot read specs at ${specsPath}` };
    }

    const xml = readFileSync(resultsPath, "utf-8");
    const testSummary = parseJUnitXML(xml);
    const result = scenarioCoverage(manifests, testSummary);

    return {
      exitCode: result.passed ? 0 : 1,
      stdout: formatScenarioCoverage(result),
      stderr: "",
    };
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
