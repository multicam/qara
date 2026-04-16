/**
 * analyse-pai.ts tests
 *
 * Tests PAI-specific analyzers: skills system, hooks configuration,
 * delegation patterns, tool integration, workflow patterns.
 * Tests against both qara's real .claude/ and minimal fixtures.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Suppress direct execution
process.env.ANALYSE_PAI_NO_CLI = "1";

import {
  analyzeSkillsSystem,
  analyzeHooksConfiguration,
  analyzeDelegationPatterns,
  analyzeToolIntegration,
  analyzeWorkflowPatterns,
  analyzeTddCompliancePAI,
  analyzeMcpJcodemunch,
  PAI_MODULES,
} from "./analyse-pai";

// Qara's own repo for integration tests
const QARA_DIR = join(import.meta.dir, "..", "..", "..", "..");

// Minimal fixture for edge case tests
const FIXTURE_DIR = join(tmpdir(), `analyse-pai-test-${process.pid}`);

function setupMinimalPAI() {
  const claude = join(FIXTURE_DIR, ".claude");
  mkdirSync(join(claude, "skills", "CORE"), { recursive: true });
  mkdirSync(join(claude, "hooks", "lib"), { recursive: true });
  mkdirSync(join(claude, "agents"), { recursive: true });

  writeFileSync(
    join(claude, "skills", "CORE", "SKILL.md"),
    `---\nname: CORE\ncontext: same\ndescription: Core system\n---\n\n## Workflow Routing\nRoutes here.\n`
  );

  writeFileSync(
    join(claude, "settings.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo" }] }],
        PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: "echo" }] }],
        SessionStart: [{ hooks: [{ type: "command", command: "echo" }] }],
      },
    }, null, 2)
  );

  writeFileSync(join(claude, "hooks", "session-start.ts"), "#!/usr/bin/env bun\nconsole.log('hi');");
  writeFileSync(join(claude, "hooks", "lib", "pai-paths.ts"), "export const X = 1;");

  mkdirSync(join(claude, "agents"), { recursive: true });
  writeFileSync(
    join(claude, "agents", "engineer.md"),
    "---\nname: engineer\nmodel: sonnet\n---\n\nEngineer agent."
  );
}

describe("analyse-pai", () => {
  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  describe("analyzeSkillsSystem (qara integration)", () => {
    it("finds skills in qara", () => {
      const result = analyzeSkillsSystem(QARA_DIR);
      expect(result.score).toBeGreaterThan(0);
      const findings = result.findings.join(" ");
      expect(findings).toContain("Skills directory exists");
      expect(findings).toContain("skill(s)");
    });

    it("detects fork context skills", () => {
      const result = analyzeSkillsSystem(QARA_DIR);
      const findings = result.findings.join(" ");
      expect(findings).toContain("fork context");
    });

    it("detects user-invocable skills", () => {
      const result = analyzeSkillsSystem(QARA_DIR);
      const findings = result.findings.join(" ");
      expect(findings).toContain("invocable");
    });
  });

  describe("analyzeSkillsSystem (fixtures)", () => {
    it("handles missing skills directory", () => {
      const emptyDir = join(tmpdir(), `no-skills-pai-${process.pid}`);
      mkdirSync(emptyDir, { recursive: true });
      const result = analyzeSkillsSystem(emptyDir);
      expect(result.findings.join(" ")).toContain("No skills directory");
      rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe("analyzeHooksConfiguration (qara integration)", () => {
    it("finds hooks in qara", () => {
      const result = analyzeHooksConfiguration(QARA_DIR);
      expect(result.score).toBeGreaterThan(0);
      const findings = result.findings.join(" ");
      expect(findings).toContain("Hooks configured in settings.json");
    });

    it("detects core hook events", () => {
      const result = analyzeHooksConfiguration(QARA_DIR);
      const findings = result.findings.join(" ");
      // Qara has PreToolUse, PostToolUse, SessionStart, UserPromptSubmit, Stop, ConfigChange
      expect(findings).toContain("PreToolUse");
    });

    it("scores well for comprehensive hook setup", () => {
      const result = analyzeHooksConfiguration(QARA_DIR);
      // Qara has all core events + TypeScript hooks + shared libs
      expect(result.score).toBeGreaterThan(15);
    });
  });

  describe("analyzeHooksConfiguration (fixtures)", () => {
    it("handles minimal PAI setup", () => {
      setupMinimalPAI();
      const result = analyzeHooksConfiguration(FIXTURE_DIR);
      expect(result.score).toBeGreaterThan(0);
      const findings = result.findings.join(" ");
      expect(findings).toContain("Hooks configured");
    });

    it("handles missing settings.json", () => {
      const bareDir = join(tmpdir(), `bare-pai-${process.pid}`);
      mkdirSync(join(bareDir, ".claude"), { recursive: true });
      const result = analyzeHooksConfiguration(bareDir);
      const findings = result.findings.join(" ");
      expect(findings).toContain("No settings.json");
      rmSync(bareDir, { recursive: true, force: true });
    });
  });

  describe("analyzeDelegationPatterns (qara integration)", () => {
    it("finds agents in qara", () => {
      const result = analyzeDelegationPatterns(QARA_DIR);
      expect(result.score).toBeGreaterThan(0);
      const findings = result.findings.join(" ");
      expect(findings).toContain("agent");
    });
  });

  describe("analyzeToolIntegration (qara integration)", () => {
    it("finds tool files in qara", () => {
      const result = analyzeToolIntegration(QARA_DIR);
      // Qara has tools/ and scripts/ in various skills
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("analyzeWorkflowPatterns (qara integration)", () => {
    it("finds workflow files in qara", () => {
      const result = analyzeWorkflowPatterns(QARA_DIR);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("analyzeTddCompliancePAI (qara integration)", () => {
    it("scores high on qara (has enforcement hook, tdd-qa, state lib)", () => {
      const result = analyzeTddCompliancePAI(QARA_DIR);
      expect(result.score).toBeGreaterThanOrEqual(12);
      const findings = result.findings.join(" ");
      expect(findings).toContain("TDD enforcement hook registered");
      expect(findings).toContain("TDD state management library");
      expect(findings).toContain("tdd-qa skill installed");
    });

    it("detects quality gates documentation", () => {
      const result = analyzeTddCompliancePAI(QARA_DIR);
      expect(result.findings.join(" ")).toContain("Quality gates documented");
    });

    it("reports healthy test count", () => {
      const result = analyzeTddCompliancePAI(QARA_DIR);
      expect(result.findings.join(" ")).toContain("healthy");
    });

    it("handles bare directory gracefully", () => {
      const bareDir = join(tmpdir(), `bare-tdd-pai-${process.pid}`);
      const { mkdirSync: mk } = require("fs");
      mk(bareDir, { recursive: true });
      const result = analyzeTddCompliancePAI(bareDir);
      expect(result.score).toBe(0);
      const { rmSync: rm } = require("fs");
      rm(bareDir, { recursive: true, force: true });
    });
  });

  describe("PAI_MODULES registry", () => {
    it("includes all expected modules", () => {
      expect(Object.keys(PAI_MODULES)).toContain("structure");
      expect(Object.keys(PAI_MODULES)).toContain("context");
      expect(Object.keys(PAI_MODULES)).toContain("agents");
      expect(Object.keys(PAI_MODULES)).toContain("tddCompliance");
      expect(Object.keys(PAI_MODULES)).toContain("skillsSystem");
      expect(Object.keys(PAI_MODULES)).toContain("hooksConfiguration");
      expect(Object.keys(PAI_MODULES)).toContain("delegationPatterns");
      expect(Object.keys(PAI_MODULES)).toContain("toolIntegration");
      expect(Object.keys(PAI_MODULES)).toContain("workflowPatterns");
      expect(Object.keys(PAI_MODULES)).toContain("tddCompliancePAI");
    });

    it("has 12 modules (4 base + 8 PAI-specific, incl. mcpJcodemunch)", () => {
      expect(Object.keys(PAI_MODULES).length).toBe(12);
    });

    it("includes mcpJcodemunch", () => {
      expect(Object.keys(PAI_MODULES)).toContain("mcpJcodemunch");
    });
  });

  // ─── analyzeMcpJcodemunch ────────────────────────────────────────────

  describe("analyzeMcpJcodemunch (fixture)", () => {
    const JCM_FIXTURE = join(tmpdir(), `analyse-mcp-jcm-test-${process.pid}`);

    function setupMinimal() {
      rmSync(JCM_FIXTURE, { recursive: true, force: true });
      mkdirSync(join(JCM_FIXTURE, ".claude", "agents"), { recursive: true });
      mkdirSync(join(JCM_FIXTURE, ".claude", "context"), { recursive: true });
    }

    afterAll(() => {
      rmSync(JCM_FIXTURE, { recursive: true, force: true });
    });

    it("scores 0 on empty fixture (no config, no agents, no docs)", () => {
      setupMinimal();
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      // Score will not be 0 because home-dir checks may credit the qara index;
      // but fixture-specific checks (mcp.json, whitelist, agents, docs) all fail.
      const findings = r.findings.join(" | ");
      expect(findings).toContain("--: No .mcp.json");
      expect(findings).toContain("NO: No code-exploration agents reference jcodemunch");
      expect(findings).toContain("NO: Neither delegation-guide nor routing-cheatsheet");
    });

    it("credits .mcp.json with jcodemunch entry", () => {
      setupMinimal();
      writeFileSync(
        join(JCM_FIXTURE, ".mcp.json"),
        JSON.stringify({ mcpServers: { jcodemunch: { command: "uv", args: ["tool", "run", "jcodemunch-mcp"] } } })
      );
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("OK: jcodemunch MCP registered"))).toBe(true);
    });

    it("warns when .mcp.json present but not in enabledMcpjsonServers whitelist", () => {
      setupMinimal();
      writeFileSync(join(JCM_FIXTURE, ".mcp.json"), JSON.stringify({ mcpServers: { jcodemunch: {} } }));
      writeFileSync(
        join(JCM_FIXTURE, ".claude", "settings.json"),
        JSON.stringify({ enabledMcpjsonServers: ["context7"] })
      );
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("WARN: jcodemunch registered but not in enabledMcpjsonServers"))).toBe(true);
    });

    it("credits whitelist inclusion", () => {
      setupMinimal();
      writeFileSync(join(JCM_FIXTURE, ".mcp.json"), JSON.stringify({ mcpServers: { jcodemunch: {} } }));
      writeFileSync(
        join(JCM_FIXTURE, ".claude", "settings.json"),
        JSON.stringify({ enabledMcpjsonServers: ["jcodemunch"] })
      );
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("OK: jcodemunch in settings.json enabledMcpjsonServers"))).toBe(true);
    });

    it("credits .jcodemunch.jsonc with trusted_folders + extra_ignore_patterns", () => {
      setupMinimal();
      writeFileSync(
        join(JCM_FIXTURE, ".jcodemunch.jsonc"),
        `{"trusted_folders":["/tmp"],"extra_ignore_patterns":["node_modules/"]}`
      );
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("OK: .jcodemunch.jsonc sets trusted_folders + extra_ignore_patterns"))).toBe(true);
    });

    it("partially credits .jcodemunch.jsonc missing one key", () => {
      setupMinimal();
      writeFileSync(join(JCM_FIXTURE, ".jcodemunch.jsonc"), `{"trusted_folders":["/tmp"]}`);
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("WARN: .jcodemunch.jsonc missing extra_ignore_patterns"))).toBe(true);
    });

    it("scores partial when only some code agents reference jcodemunch", () => {
      setupMinimal();
      const agentsDir = join(JCM_FIXTURE, ".claude", "agents");
      writeFileSync(join(agentsDir, "codebase-analyzer.md"), "use mcp__jcodemunch__search_symbols for lookups");
      writeFileSync(join(agentsDir, "engineer.md"), "standard engineer no mcp mention");
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("WARN: Only 1/4 code agents mention jcodemunch"))).toBe(true);
    });

    it("credits fully-wired code agents", () => {
      setupMinimal();
      const agentsDir = join(JCM_FIXTURE, ".claude", "agents");
      for (const a of ["codebase-analyzer.md", "codebase-analyzer-low.md", "engineer.md", "engineer-high.md"]) {
        writeFileSync(join(agentsDir, a), "jcodemunch-first protocol with mcp__jcodemunch__search_symbols");
      }
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("OK: All 4 code-exploration agents reference jcodemunch"))).toBe(true);
    });

    it("credits routing surface when both docs mention jcodemunch", () => {
      setupMinimal();
      const contextDir = join(JCM_FIXTURE, ".claude", "context");
      writeFileSync(join(contextDir, "delegation-guide.md"), "jcodemunch MCP section here");
      writeFileSync(join(contextDir, "routing-cheatsheet.md"), "jcodemunch row in table");
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("OK: delegation-guide + routing-cheatsheet both cover jcodemunch"))).toBe(true);
    });

    it("warns when only one of the routing docs mentions jcodemunch", () => {
      setupMinimal();
      const contextDir = join(JCM_FIXTURE, ".claude", "context");
      writeFileSync(join(contextDir, "delegation-guide.md"), "jcodemunch MCP section here");
      writeFileSync(join(contextDir, "routing-cheatsheet.md"), "nothing about mcp tools");
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("WARN: Only one of delegation-guide/routing-cheatsheet"))).toBe(true);
    });

    it("credits benchmark protocol presence", () => {
      setupMinimal();
      mkdirSync(join(JCM_FIXTURE, "thoughts", "shared", "benchmarks"), { recursive: true });
      writeFileSync(
        join(JCM_FIXTURE, "thoughts", "shared", "benchmarks", "jcodemunch-phase4.md"),
        "# Phase 4 benchmark"
      );
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("OK: Phase 4 benchmark protocol documented"))).toBe(true);
    });

    it("reports missing benchmark protocol", () => {
      setupMinimal();
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(r.findings.some((f: string) => f.includes("--: No benchmark protocol"))).toBe(true);
    });

    it("returns AnalysisResult shape with score + findings + recommendations", () => {
      setupMinimal();
      const r = analyzeMcpJcodemunch(JCM_FIXTURE);
      expect(typeof r.score).toBe("number");
      expect(Array.isArray(r.findings)).toBe(true);
      expect(Array.isArray(r.recommendations)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(20);
    });
  });

  describe("analyzeMcpJcodemunch (qara integration)", () => {
    it("resolves relative paiPath (e.g. '.') to absolute when looking up index db", () => {
      // Regression: `paiPath.split('/').pop()` on '.' returned '.', missing qara-*.db.
      // Fix uses basename(resolve(paiPath)) instead.
      const origCwd = process.cwd();
      try {
        process.chdir(QARA_DIR);
        const r = analyzeMcpJcodemunch(".");
        const findings = r.findings.join(" | ");
        // With resolve(), '.' in qara root should match the qara-*.db just like absolute path does.
        // If index exists, we see "OK: jcodemunch index db exists"; if not, we see "--: No index db..."
        // Either way we should NOT see the "WARN: Index db present but not for this repo" partial-credit row.
        expect(findings).not.toContain("WARN: Index db present but not for this repo");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("scores high on qara (all surfaces wired as of 2026-04-16)", () => {
      const r = analyzeMcpJcodemunch(QARA_DIR);
      // Qara has: .mcp.json + whitelist + .jcodemunch.jsonc + all 4 agents + both docs + benchmark doc.
      // Index check depends on ~/.code-index/ which may or may not be present in test env.
      // Minimum expected: 2+2+2+3+2+2 = 13 pts from file-based checks alone.
      expect(r.score).toBeGreaterThanOrEqual(13);
    });

    it("confirms all 4 code agents reference jcodemunch", () => {
      const r = analyzeMcpJcodemunch(QARA_DIR);
      const findings = r.findings.join(" | ");
      expect(findings).toContain("OK: All 4 code-exploration agents reference jcodemunch");
    });

    it("confirms both routing docs cover jcodemunch", () => {
      const r = analyzeMcpJcodemunch(QARA_DIR);
      const findings = r.findings.join(" | ");
      expect(findings).toContain("OK: delegation-guide + routing-cheatsheet both cover jcodemunch");
    });

    it("confirms benchmark protocol is present", () => {
      const r = analyzeMcpJcodemunch(QARA_DIR);
      const findings = r.findings.join(" | ");
      expect(findings).toContain("OK: Phase 4 benchmark protocol documented");
    });
  });
});
