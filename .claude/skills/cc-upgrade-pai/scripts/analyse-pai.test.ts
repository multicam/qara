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

    it("has 11 modules (4 base + 7 PAI-specific)", () => {
      expect(Object.keys(PAI_MODULES).length).toBe(11);
    });
  });
});
