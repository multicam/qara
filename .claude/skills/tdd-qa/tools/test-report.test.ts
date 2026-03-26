import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  parseJUnitXML,
  parseLcov,
  compare,
  formatReport,
  findAffectedTests,
  runCLI,
  type TestSummary,
  type CoverageSummary,
} from "./test-report";

// Suppress direct CLI execution during tests
process.env.TEST_REPORT_NO_CLI = "1";

// ─── parseJUnitXML ──────────────────────────────────────────────────────────

describe("parseJUnitXML", () => {
  it("parses empty XML", () => {
    const result = parseJUnitXML("<testsuite></testsuite>");
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("parses passing tests", () => {
    const xml = `
      <testsuite>
        <testcase name="adds numbers" classname="math.test" time="0.01"/>
        <testcase name="subtracts numbers" classname="math.test" time="0.02"/>
      </testsuite>`;
    const result = parseJUnitXML(xml);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("parses failing tests with failure message", () => {
    const xml = `
      <testsuite>
        <testcase name="fails" classname="bad.test" time="0.1">
          <failure message="Expected 1 to be 2">AssertionError: nope</failure>
        </testcase>
      </testsuite>`;
    const result = parseJUnitXML(xml);
    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].failure).toBe("AssertionError: nope");
  });

  it("parses skipped tests", () => {
    const xml = `
      <testsuite>
        <testcase name="todo" classname="pending.test" time="0">
          <skipped/>
        </testcase>
      </testsuite>`;
    const result = parseJUnitXML(xml);
    expect(result.total).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[0].status).toBe("skip");
  });

  it("parses mixed results", () => {
    const xml = `
      <testsuite tests="3" failures="1">
        <testcase name="pass" classname="mix.test" time="0.01"/>
        <testcase name="fail" classname="mix.test" time="0.05">
          <failure>broken</failure>
        </testcase>
        <testcase name="skip" classname="mix.test" time="0">
          <skipped/>
        </testcase>
      </testsuite>`;
    const result = parseJUnitXML(xml);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("handles XML entities in test names", () => {
    const xml = `
      <testsuite>
        <testcase name="handles &lt;script&gt; &amp; &quot;quotes&quot;" classname="escape.test" time="0.01"/>
      </testsuite>`;
    const result = parseJUnitXML(xml);
    expect(result.results[0].name).toBe('handles <script> & "quotes"');
  });

  it("handles error elements (not just failure)", () => {
    const xml = `
      <testsuite>
        <testcase name="throws" classname="error.test" time="0.01">
          <error message="RuntimeError">Stack trace here</error>
        </testcase>
      </testsuite>`;
    const result = parseJUnitXML(xml);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe("fail");
  });

  it("parses nested testsuites", () => {
    const xml = `
      <testsuites>
        <testsuite name="suite1">
          <testcase name="a" classname="s1" time="0.01"/>
        </testsuite>
        <testsuite name="suite2">
          <testcase name="b" classname="s2" time="0.02"/>
        </testsuite>
      </testsuites>`;
    const result = parseJUnitXML(xml);
    expect(result.total).toBe(2);
  });
});

// ─── parseLcov ──────────────────────────────────────────────────────────────

describe("parseLcov", () => {
  it("parses single file coverage", () => {
    const lcov = `SF:src/index.ts
LF:10
LH:8
end_of_record`;
    const result = parseLcov(lcov);
    expect(result.totalLines).toBe(10);
    expect(result.coveredLines).toBe(8);
    expect(result.pct).toBe(80);
  });

  it("parses multi-file coverage", () => {
    const lcov = `SF:src/a.ts
LF:100
LH:90
end_of_record
SF:src/b.ts
LF:50
LH:25
end_of_record`;
    const result = parseLcov(lcov);
    expect(result.totalLines).toBe(150);
    expect(result.coveredLines).toBe(115);
    expect(result.pct).toBeCloseTo(76.67, 1);
  });

  it("handles empty coverage", () => {
    const result = parseLcov("");
    expect(result.totalLines).toBe(0);
    expect(result.coveredLines).toBe(0);
    expect(result.pct).toBe(0);
  });
});

// ─── compare ────────────────────────────────────────────────────────────────

describe("compare", () => {
  const pass = (name: string, cls = "test") =>
    ({ name, classname: cls, time: 0.01, status: "pass" as const });
  const fail = (name: string, cls = "test") =>
    ({ name, classname: cls, time: 0.01, status: "fail" as const, failure: "broken" });

  const makeSummary = (...results: ReturnType<typeof pass>[]): TestSummary => ({
    total: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    skipped: 0,
    results,
  });

  it("detects regressions (pass -> fail)", () => {
    const baseline = makeSummary(pass("a"), pass("b"));
    const current = makeSummary(pass("a"), fail("b"));
    const result = compare(baseline, current);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].name).toBe("b");
    expect(result.gatesPassed).toBe(false);
  });

  it("detects fixed tests (fail -> pass)", () => {
    const baseline = makeSummary(pass("a"), fail("b"));
    const current = makeSummary(pass("a"), pass("b"));
    const result = compare(baseline, current);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0].name).toBe("b");
    expect(result.gatesPassed).toBe(true);
  });

  it("detects new tests", () => {
    const baseline = makeSummary(pass("a"));
    const current = makeSummary(pass("a"), pass("b"));
    const result = compare(baseline, current);
    expect(result.newTests).toHaveLength(1);
    expect(result.gatesPassed).toBe(true);
  });

  it("detects removed tests", () => {
    const baseline = makeSummary(pass("a"), pass("b"));
    const current = makeSummary(pass("a"));
    const result = compare(baseline, current);
    expect(result.removed).toHaveLength(1);
    expect(result.gatesPassed).toBe(true); // Removal alone doesn't fail gate
  });

  it("passes gate with no changes", () => {
    const baseline = makeSummary(pass("a"), pass("b"));
    const current = makeSummary(pass("a"), pass("b"));
    const result = compare(baseline, current);
    expect(result.gatesPassed).toBe(true);
    expect(result.regressions).toHaveLength(0);
  });

  it("detects coverage decrease", () => {
    const baseline = makeSummary(pass("a"));
    const current = makeSummary(pass("a"));
    const covBase: CoverageSummary = { totalLines: 100, coveredLines: 80, pct: 80 };
    const covCurr: CoverageSummary = { totalLines: 100, coveredLines: 70, pct: 70 };
    const result = compare(baseline, current, covBase, covCurr);
    expect(result.coverageDelta).toBe(-10);
    expect(result.gatesPassed).toBe(false);
  });

  it("passes gate with coverage increase", () => {
    const baseline = makeSummary(pass("a"));
    const current = makeSummary(pass("a"));
    const covBase: CoverageSummary = { totalLines: 100, coveredLines: 80, pct: 80 };
    const covCurr: CoverageSummary = { totalLines: 100, coveredLines: 90, pct: 90 };
    const result = compare(baseline, current, covBase, covCurr);
    expect(result.coverageDelta).toBe(10);
    expect(result.gatesPassed).toBe(true);
  });

  it("handles empty baseline (first run)", () => {
    const baseline = makeSummary();
    const current = makeSummary(pass("a"), pass("b"));
    const result = compare(baseline, current);
    expect(result.newTests).toHaveLength(2);
    expect(result.gatesPassed).toBe(true);
  });
});

// ─── formatReport ───────────────────────────────────────────────────────────

describe("formatReport", () => {
  it("formats passing report", () => {
    const report = formatReport({
      regressions: [],
      fixed: [],
      newTests: [],
      removed: [],
      baselineTotal: 5,
      currentTotal: 5,
      gatesPassed: true,
      gateFailures: [],
    });
    expect(report).toContain("GATE RESULT: PASS");
    expect(report).toContain("5 baseline → 5 current");
  });

  it("formats failing report with regressions", () => {
    const report = formatReport({
      regressions: [
        { name: "auth fails", classname: "auth.test", time: 0.01, status: "fail", failure: "timeout" },
      ],
      fixed: [],
      newTests: [],
      removed: [],
      baselineTotal: 10,
      currentTotal: 10,
      gatesPassed: false,
      gateFailures: ["REGRESSION: 1 test(s) that previously passed now fail"],
    });
    expect(report).toContain("GATE RESULT: FAIL");
    expect(report).toContain("REGRESSIONS");
    expect(report).toContain("auth fails");
  });
});

// ─── runCLI ─────────────────────────────────────────────────────────────────

describe("runCLI", () => {
  it("shows help with --help", () => {
    const result = runCLI(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("shows help with no args", () => {
    const result = runCLI([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("errors on unknown command", () => {
    const result = runCLI(["foobar"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("errors on parse without --file", () => {
    const result = runCLI(["parse"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--file is required");
  });

  it("errors on compare without required args", () => {
    const result = runCLI(["compare"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--baseline and --current are required");
  });

  it("errors on affected without --files", () => {
    const result = runCLI(["affected"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--files is required");
  });

  it("affected exits 1 when no tests found", () => {
    const result = runCLI(["affected", "--files", "/nonexistent/path/foo.ts"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("No test files found");
  });
});

// ─── findAffectedTests ─────────────────────────────────────────────────────

describe("findAffectedTests", () => {
  const FIXTURE_DIR = join(tmpdir(), `test-report-fixtures-${process.pid}`);

  beforeAll(() => {
    // Create fixture file structure
    mkdirSync(join(FIXTURE_DIR, "src", "auth"), { recursive: true });
    mkdirSync(join(FIXTURE_DIR, "tests", "auth"), { recursive: true });

    writeFileSync(join(FIXTURE_DIR, "src", "auth", "login.ts"), "export function login() {}");
    writeFileSync(join(FIXTURE_DIR, "src", "auth", "login.test.ts"), "test('login', () => {})");
    writeFileSync(join(FIXTURE_DIR, "src", "auth", "login.integration.test.ts"), "test('login int', () => {})");
    writeFileSync(join(FIXTURE_DIR, "src", "auth", "register.ts"), "export function register() {}");
    // register has NO co-located test
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it("maps source file to co-located unit test", () => {
    const result = findAffectedTests([join(FIXTURE_DIR, "src", "auth", "login.ts")]);
    expect(result.affectedTests).toContain(join(FIXTURE_DIR, "src", "auth", "login.test.ts"));
  });

  it("maps source file to co-located integration test", () => {
    const result = findAffectedTests([join(FIXTURE_DIR, "src", "auth", "login.ts")]);
    expect(result.affectedTests).toContain(join(FIXTURE_DIR, "src", "auth", "login.integration.test.ts"));
  });

  it("returns test file directly when changed file IS a test", () => {
    const testFile = join(FIXTURE_DIR, "src", "auth", "login.test.ts");
    const result = findAffectedTests([testFile]);
    expect(result.affectedTests).toContain(testFile);
    expect(result.unmappedFiles).toHaveLength(0);
  });

  it("adds to unmappedFiles when no test found", () => {
    const result = findAffectedTests([join(FIXTURE_DIR, "src", "auth", "register.ts")]);
    expect(result.affectedTests).toHaveLength(0);
    expect(result.unmappedFiles).toContain(join(FIXTURE_DIR, "src", "auth", "register.ts"));
  });

  it("handles multiple changed files", () => {
    const result = findAffectedTests([
      join(FIXTURE_DIR, "src", "auth", "login.ts"),
      join(FIXTURE_DIR, "src", "auth", "register.ts"),
    ]);
    expect(result.affectedTests.length).toBeGreaterThan(0);
    expect(result.unmappedFiles).toContain(join(FIXTURE_DIR, "src", "auth", "register.ts"));
  });

  it("deduplicates test files", () => {
    const result = findAffectedTests([
      join(FIXTURE_DIR, "src", "auth", "login.ts"),
      join(FIXTURE_DIR, "src", "auth", "login.test.ts"),
    ]);
    const loginTestCount = result.affectedTests.filter(
      (f) => f === join(FIXTURE_DIR, "src", "auth", "login.test.ts")
    ).length;
    expect(loginTestCount).toBe(1);
  });

  it("adds nonexistent test file to unmapped", () => {
    const result = findAffectedTests(["/nonexistent/foo.test.ts"]);
    expect(result.affectedTests).toHaveLength(0);
    expect(result.unmappedFiles).toContain("/nonexistent/foo.test.ts");
  });
});
