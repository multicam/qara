/**
 * tdd-qa Skill Tests
 *
 * Covers:
 * - Skill structure validation (SKILL.md, workflows, references, tools)
 * - test-report.ts: JUnit XML parsing, lcov parsing, comparison, gates, formatting
 *
 * Run with: bun test ./.claude/tests/tdd-qa.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Suppress CLI auto-execution during tests
process.env.TEST_REPORT_NO_CLI = "1";

import {
  parseJUnitXML,
  parseLcov,
  compare,
  formatReport,
  runCLI,
  USAGE,
  type TestSummary,
  type CoverageSummary,
} from "../skills/tdd-qa/tools/test-report";

const SKILL_DIR = join(homedir(), "qara", ".claude", "skills", "tdd-qa");

// =============================================================================
// SECTION 1: Skill Structure
// =============================================================================

describe("tdd-qa Skill Structure", () => {
  it("should have SKILL.md", () => {
    expect(existsSync(join(SKILL_DIR, "SKILL.md"))).toBe(true);
  });

  it("should have valid frontmatter with name matching directory", () => {
    const content = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf-8");
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    expect(nameMatch?.[1].trim()).toBe("tdd-qa");
  });

  it("should have context: fork", () => {
    const content = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf-8");
    expect(content).toMatch(/^context:\s*fork/m);
  });

  it("should have Workflow Routing section as first section", () => {
    const content = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf-8");
    const afterFrontmatter = content.replace(/^---[\s\S]*?---\n*/, "");
    expect(afterFrontmatter.trimStart().startsWith("## Workflow Routing")).toBe(
      true
    );
  });

  it("should have When to Activate section with 8 categories", () => {
    const content = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf-8");
    expect(content).toContain("When to Activate This Skill");
    // Check all 8 categories present
    for (const cat of [
      "Core Skill Name",
      "Action Verbs",
      "Modifiers",
      "Prepositions",
      "Synonyms",
      "Use Case",
      "Result-Oriented",
      "Tool/Method Specific",
    ]) {
      expect(content).toContain(cat);
    }
  });

  it("should have all 7 workflows", () => {
    const workflows = [
      "init-project.md",
      "write-scenarios.md",
      "tdd-cycle.md",
      "run-pyramid.md",
      "backtest.md",
      "e2e-verify.md",
      "explore-bombadil.md",
    ];
    for (const wf of workflows) {
      expect(existsSync(join(SKILL_DIR, "workflows", wf))).toBe(true);
    }
  });

  it("should have all 6 references", () => {
    const refs = [
      "scenario-format.md",
      "test-layers.md",
      "quality-gates.md",
      "blueprint-pattern.md",
      "cross-project-config.md",
      "setup-guide.md",
    ];
    for (const ref of refs) {
      expect(existsSync(join(SKILL_DIR, "references", ref))).toBe(true);
    }
  });

  it("should have test-report.ts tool", () => {
    expect(existsSync(join(SKILL_DIR, "tools", "test-report.ts"))).toBe(true);
  });

  it("should have executable test-report.ts", () => {
    const content = readFileSync(
      join(SKILL_DIR, "tools", "test-report.ts"),
      "utf-8"
    );
    expect(content.startsWith("#!/usr/bin/env bun")).toBe(true);
  });

  it("should not contain TODO placeholders", () => {
    const allFiles = [
      ...readdirSync(join(SKILL_DIR, "workflows")).map((f) =>
        join(SKILL_DIR, "workflows", f)
      ),
      ...readdirSync(join(SKILL_DIR, "references")).map((f) =>
        join(SKILL_DIR, "references", f)
      ),
      join(SKILL_DIR, "SKILL.md"),
    ];
    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      expect(content).not.toContain("[TODO]");
      expect(content).not.toContain("TODO:");
    }
  });

  it("all workflows should be routed in SKILL.md", () => {
    const skillContent = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf-8");
    const workflows = readdirSync(join(SKILL_DIR, "workflows"));
    for (const wf of workflows) {
      const baseName = wf.replace(".md", "");
      expect(skillContent).toContain(baseName);
    }
  });
});

// =============================================================================
// SECTION 2: JUnit XML Parser
// =============================================================================

describe("parseJUnitXML", () => {
  it("should parse self-closing testcase elements", () => {
    const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="suite">
    <testcase name="test1" classname="MyClass" time="0.01" />
    <testcase name="test2" classname="MyClass" time="0.02" />
  </testsuite>
</testsuites>`;

    const result = parseJUnitXML(xml);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.results[0].name).toBe("test1");
    expect(result.results[0].classname).toBe("MyClass");
    expect(result.results[0].time).toBe(0.01);
    expect(result.results[0].status).toBe("pass");
  });

  it("should parse failing tests with failure messages", () => {
    const xml = `<testsuites>
  <testsuite>
    <testcase name="fails" classname="Suite">
      <failure message="expected true">AssertionError: expected true got false</failure>
    </testcase>
  </testsuite>
</testsuites>`;

    const result = parseJUnitXML(xml);
    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].failure).toContain("AssertionError");
  });

  it("should parse skipped tests", () => {
    const xml = `<testsuites>
  <testsuite>
    <testcase name="skipped" classname="Suite">
      <skipped />
    </testcase>
  </testsuite>
</testsuites>`;

    const result = parseJUnitXML(xml);
    expect(result.total).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[0].status).toBe("skip");
  });

  it("should parse error elements as failures", () => {
    const xml = `<testsuites>
  <testsuite>
    <testcase name="errors" classname="Suite">
      <error message="timeout">TimeoutError: exceeded 5000ms</error>
    </testcase>
  </testsuite>
</testsuites>`;

    const result = parseJUnitXML(xml);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].failure).toContain("TimeoutError");
  });

  it("should decode XML entities in names", () => {
    const xml = `<testsuites>
  <testsuite>
    <testcase name="test &amp; verify &lt;things&gt;" classname="A &gt; B" time="0" />
  </testsuite>
</testsuites>`;

    const result = parseJUnitXML(xml);
    expect(result.results[0].name).toBe("test & verify <things>");
    expect(result.results[0].classname).toBe("A > B");
  });

  it("should handle empty XML with no testcases", () => {
    const xml = `<testsuites></testsuites>`;
    const result = parseJUnitXML(xml);
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("should parse real bun test JUnit output", () => {
    // Use the actual JUnit XML we generated earlier
    const xmlPath = "/tmp/test-junit-check.xml";
    if (existsSync(xmlPath)) {
      const xml = readFileSync(xmlPath, "utf-8");
      const result = parseJUnitXML(xml);
      expect(result.total).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
      expect(result.results[0].classname).toBeDefined();
    }
  });

  it("should handle mixed pass/fail/skip in one suite", () => {
    const xml = `<testsuites>
  <testsuite>
    <testcase name="passes" classname="Mix" time="0.1" />
    <testcase name="fails" classname="Mix" time="0.2">
      <failure>bad</failure>
    </testcase>
    <testcase name="skips" classname="Mix" time="0">
      <skipped />
    </testcase>
  </testsuite>
</testsuites>`;

    const result = parseJUnitXML(xml);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
  });
});

// =============================================================================
// SECTION 3: lcov Parser
// =============================================================================

describe("parseLcov", () => {
  it("should parse standard lcov output", () => {
    const lcov = `SF:src/auth.ts
LF:100
LH:80
end_of_record
SF:src/utils.ts
LF:50
LH:50
end_of_record`;

    const result = parseLcov(lcov);
    expect(result.totalLines).toBe(150);
    expect(result.coveredLines).toBe(130);
    expect(result.pct).toBeCloseTo(86.67, 1);
  });

  it("should handle empty lcov", () => {
    const result = parseLcov("");
    expect(result.totalLines).toBe(0);
    expect(result.coveredLines).toBe(0);
    expect(result.pct).toBe(0);
  });

  it("should handle lcov with zero total lines", () => {
    const lcov = `SF:empty.ts
end_of_record`;

    const result = parseLcov(lcov);
    expect(result.pct).toBe(0);
  });

  it("should handle 100% coverage", () => {
    const lcov = `SF:perfect.ts
LF:50
LH:50
end_of_record`;

    const result = parseLcov(lcov);
    expect(result.pct).toBe(100);
  });

  it("should handle 0% coverage", () => {
    const lcov = `SF:untested.ts
LF:100
LH:0
end_of_record`;

    const result = parseLcov(lcov);
    expect(result.pct).toBe(0);
  });
});

// =============================================================================
// SECTION 4: Comparator
// =============================================================================

describe("compare", () => {
  const makeResult = (
    name: string,
    classname: string,
    status: "pass" | "fail" | "skip"
  ) => ({ name, classname, time: 0, status });

  it("should detect regressions (pass → fail)", () => {
    const baseline: TestSummary = {
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      results: [
        makeResult("testA", "Suite", "pass"),
        makeResult("testB", "Suite", "pass"),
      ],
    };
    const current: TestSummary = {
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      results: [
        makeResult("testA", "Suite", "pass"),
        makeResult("testB", "Suite", "fail"),
      ],
    };

    const result = compare(baseline, current);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].name).toBe("testB");
    expect(result.gatesPassed).toBe(false);
    expect(result.gateFailures[0]).toContain("REGRESSION");
  });

  it("should detect fixed tests (fail → pass)", () => {
    const baseline: TestSummary = {
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      results: [makeResult("broken", "Suite", "fail")],
    };
    const current: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("broken", "Suite", "pass")],
    };

    const result = compare(baseline, current);
    expect(result.fixed).toHaveLength(1);
    expect(result.regressions).toHaveLength(0);
    expect(result.gatesPassed).toBe(true);
  });

  it("should detect new tests", () => {
    const baseline: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("existing", "Suite", "pass")],
    };
    const current: TestSummary = {
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      results: [
        makeResult("existing", "Suite", "pass"),
        makeResult("brand-new", "Suite", "pass"),
      ],
    };

    const result = compare(baseline, current);
    expect(result.newTests).toHaveLength(1);
    expect(result.newTests[0].name).toBe("brand-new");
    expect(result.gatesPassed).toBe(true);
  });

  it("should detect removed tests", () => {
    const baseline: TestSummary = {
      total: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      results: [
        makeResult("keepMe", "Suite", "pass"),
        makeResult("removeMe", "Suite", "pass"),
      ],
    };
    const current: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("keepMe", "Suite", "pass")],
    };

    const result = compare(baseline, current);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]).toContain("removeMe");
    expect(result.gatesPassed).toBe(true); // removing tests is not a gate failure
  });

  it("should detect coverage decrease", () => {
    const baseline: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("t", "S", "pass")],
    };
    const current = { ...baseline };

    const covBaseline: CoverageSummary = {
      totalLines: 100,
      coveredLines: 80,
      pct: 80,
    };
    const covCurrent: CoverageSummary = {
      totalLines: 100,
      coveredLines: 70,
      pct: 70,
    };

    const result = compare(baseline, current, covBaseline, covCurrent);
    expect(result.coverageDelta).toBe(-10);
    expect(result.gatesPassed).toBe(false);
    expect(result.gateFailures[0]).toContain("COVERAGE");
  });

  it("should pass when coverage increases", () => {
    const baseline: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("t", "S", "pass")],
    };
    const current = { ...baseline };

    const covBaseline: CoverageSummary = {
      totalLines: 100,
      coveredLines: 80,
      pct: 80,
    };
    const covCurrent: CoverageSummary = {
      totalLines: 100,
      coveredLines: 90,
      pct: 90,
    };

    const result = compare(baseline, current, covBaseline, covCurrent);
    expect(result.coverageDelta).toBe(10);
    expect(result.gatesPassed).toBe(true);
  });

  it("should fail on both regression AND coverage decrease", () => {
    const baseline: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("t", "S", "pass")],
    };
    const current: TestSummary = {
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      results: [makeResult("t", "S", "fail")],
    };

    const covBaseline: CoverageSummary = {
      totalLines: 100,
      coveredLines: 80,
      pct: 80,
    };
    const covCurrent: CoverageSummary = {
      totalLines: 100,
      coveredLines: 70,
      pct: 70,
    };

    const result = compare(baseline, current, covBaseline, covCurrent);
    expect(result.gatesPassed).toBe(false);
    expect(result.gateFailures).toHaveLength(2);
  });

  it("should handle comparison without coverage data", () => {
    const baseline: TestSummary = {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      results: [makeResult("t", "S", "pass")],
    };

    const result = compare(baseline, baseline);
    expect(result.coverageDelta).toBeUndefined();
    expect(result.gatesPassed).toBe(true);
  });

  it("should handle identical baselines", () => {
    const summary: TestSummary = {
      total: 3,
      passed: 2,
      failed: 1,
      skipped: 0,
      results: [
        makeResult("a", "S", "pass"),
        makeResult("b", "S", "pass"),
        makeResult("c", "S", "fail"),
      ],
    };

    const result = compare(summary, summary);
    expect(result.regressions).toHaveLength(0);
    expect(result.fixed).toHaveLength(0);
    expect(result.newTests).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.gatesPassed).toBe(true);
  });
});

// =============================================================================
// SECTION 5: Report Formatter
// =============================================================================

describe("formatReport", () => {
  const makeResult = (
    name: string,
    classname: string,
    status: "pass" | "fail" | "skip"
  ) => ({ name, classname, time: 0, status });

  it("should format a passing report", () => {
    const report = formatReport({
      regressions: [],
      fixed: [],
      newTests: [],
      removed: [],
      baselineTotal: 10,
      currentTotal: 10,
      gatesPassed: true,
      gateFailures: [],
    });

    expect(report).toContain("GATE RESULT: PASS");
    expect(report).toContain("10 baseline → 10 current");
  });

  it("should format regressions", () => {
    const report = formatReport({
      regressions: [
        {
          name: "loginTest",
          classname: "Auth",
          time: 0,
          status: "fail",
          failure: "Expected 200 got 401",
        },
      ],
      fixed: [],
      newTests: [],
      removed: [],
      baselineTotal: 5,
      currentTotal: 5,
      gatesPassed: false,
      gateFailures: ["REGRESSION: 1 test(s) that previously passed now fail"],
    });

    expect(report).toContain("REGRESSIONS (new failures):");
    expect(report).toContain("Auth > loginTest  [PASS → FAIL]");
    expect(report).toContain("Expected 200 got 401");
    expect(report).toContain("GATE RESULT: FAIL");
  });

  it("should format fixed tests", () => {
    const report = formatReport({
      regressions: [],
      fixed: [makeResult("wasbroken", "Suite", "pass")],
      newTests: [],
      removed: [],
      baselineTotal: 1,
      currentTotal: 1,
      gatesPassed: true,
      gateFailures: [],
    });

    expect(report).toContain("FIXED (newly passing):");
    expect(report).toContain("wasbroken  [FAIL → PASS]");
  });

  it("should format coverage delta", () => {
    const report = formatReport({
      regressions: [],
      fixed: [],
      newTests: [],
      removed: [],
      baselineTotal: 10,
      currentTotal: 10,
      coverageBaseline: { totalLines: 100, coveredLines: 80, pct: 80 },
      coverageCurrent: { totalLines: 100, coveredLines: 85, pct: 85 },
      coverageDelta: 5,
      gatesPassed: true,
      gateFailures: [],
    });

    expect(report).toContain("COVERAGE: 80.0% → 85.0%  Delta: +5.0%  PASS");
  });

  it("should format negative coverage delta as FAIL", () => {
    const report = formatReport({
      regressions: [],
      fixed: [],
      newTests: [],
      removed: [],
      baselineTotal: 10,
      currentTotal: 10,
      coverageBaseline: { totalLines: 100, coveredLines: 80, pct: 80 },
      coverageCurrent: { totalLines: 100, coveredLines: 70, pct: 70 },
      coverageDelta: -10,
      gatesPassed: false,
      gateFailures: ["COVERAGE: decreased by 10.0%"],
    });

    expect(report).toContain("Delta: -10.0%  FAIL");
  });

  it("should format new and removed test counts", () => {
    const report = formatReport({
      regressions: [],
      fixed: [],
      newTests: [makeResult("new1", "S", "pass"), makeResult("new2", "S", "pass")],
      removed: ["S::old1", "S::old2", "S::old3"],
      baselineTotal: 5,
      currentTotal: 4,
      gatesPassed: true,
      gateFailures: [],
    });

    expect(report).toContain("NEW TESTS: 2 added");
    expect(report).toContain("REMOVED TESTS: 3 no longer present");
  });
});

// =============================================================================
// SECTION 6: CLI (in-process runCLI function)
// =============================================================================

describe("runCLI", () => {
  it("should show usage with --help", () => {
    const result = runCLI(["--help"]);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("compare");
    expect(result.stdout).toContain("parse");
    expect(result.exitCode).toBe(0);
  });

  it("should show usage with -h", () => {
    const result = runCLI(["-h"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(USAGE);
  });

  it("should show usage with no args", () => {
    const result = runCLI([]);
    expect(result.stdout).toContain("Usage:");
    expect(result.exitCode).toBe(0);
  });

  it("should error on unknown command", () => {
    const result = runCLI(["bogus"]);
    expect(result.stderr).toContain("Unknown command: bogus");
    expect(result.exitCode).toBe(1);
  });

  it("should error when parse --file is missing", () => {
    const result = runCLI(["parse"]);
    expect(result.stderr).toContain("--file is required");
    expect(result.exitCode).toBe(1);
  });

  it("should parse a JUnit XML file", () => {
    const xmlPath = "/tmp/test-junit-check.xml";
    if (!existsSync(xmlPath)) return;

    const result = runCLI(["parse", "--file", xmlPath]);
    expect(result.stdout).toContain("Tests:");
    expect(result.stdout).toContain("pass");
    expect(result.exitCode).toBe(0);
  });

  it("should return exit 1 for parse with failing tests", () => {
    // Write a temp XML with a failing test
    const tmpXml = "/tmp/test-cli-fail.xml";
    const xml = `<testsuites><testsuite><testcase name="fails" classname="S"><failure>bad</failure></testcase></testsuite></testsuites>`;
    require("fs").writeFileSync(tmpXml, xml);

    const result = runCLI(["parse", "--file", tmpXml]);
    expect(result.stdout).toContain("1 fail");
    expect(result.exitCode).toBe(1);
  });

  it("should error when compare --baseline or --current is missing", () => {
    const result = runCLI(["compare", "--baseline", "/tmp/test-junit-check.xml"]);
    expect(result.stderr).toContain("--baseline and --current are required");
    expect(result.exitCode).toBe(1);
  });

  it("should error when compare has --current but no --baseline", () => {
    const result = runCLI(["compare", "--current", "/tmp/test-junit-check.xml"]);
    expect(result.stderr).toContain("--baseline and --current are required");
    expect(result.exitCode).toBe(1);
  });

  it("should compare two identical XML files and pass", () => {
    const xmlPath = "/tmp/test-junit-check.xml";
    if (!existsSync(xmlPath)) return;

    const result = runCLI(["compare", "--baseline", xmlPath, "--current", xmlPath]);
    expect(result.stdout).toContain("GATE RESULT: PASS");
    expect(result.exitCode).toBe(0);
  });

  it("should compare with lcov coverage files", () => {
    const baseLcov = "/tmp/test-base.lcov";
    const currLcov = "/tmp/test-curr.lcov";
    const xmlPath = "/tmp/test-junit-check.xml";
    if (!existsSync(xmlPath)) return;

    require("fs").writeFileSync(baseLcov, "SF:a.ts\nLF:100\nLH:80\nend_of_record\n");
    require("fs").writeFileSync(currLcov, "SF:a.ts\nLF:100\nLH:85\nend_of_record\n");

    const result = runCLI([
      "compare", "--baseline", xmlPath, "--current", xmlPath,
      "--coverage-baseline", baseLcov, "--coverage-current", currLcov,
    ]);
    expect(result.stdout).toContain("COVERAGE:");
    expect(result.stdout).toContain("+5.0%");
    expect(result.stdout).toContain("GATE RESULT: PASS");
    expect(result.exitCode).toBe(0);
  });

  it("should compare without coverage args", () => {
    const xmlPath = "/tmp/test-junit-check.xml";
    if (!existsSync(xmlPath)) return;

    const result = runCLI(["compare", "--baseline", xmlPath, "--current", xmlPath]);
    expect(result.stdout).not.toContain("COVERAGE:");
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// SECTION 7: Integration — Real JUnit XML from bun test
// =============================================================================

describe("Integration: parse real bun test output", () => {
  it("should parse the JUnit XML generated by bun test", () => {
    const xmlPath = "/tmp/test-junit-check.xml";
    if (!existsSync(xmlPath)) {
      // Skip gracefully if the file doesn't exist
      return;
    }

    const xml = readFileSync(xmlPath, "utf-8");
    const summary = parseJUnitXML(xml);

    // We know from earlier that pai-validation has 65 tests
    expect(summary.total).toBeGreaterThanOrEqual(10);
    expect(summary.failed).toBe(0);

    // Compare with itself should show zero regressions
    const result = compare(summary, summary);
    expect(result.regressions).toHaveLength(0);
    expect(result.gatesPassed).toBe(true);

    const report = formatReport(result);
    expect(report).toContain("GATE RESULT: PASS");
  });
});
