/**
 * context-graph/cli.ts tests
 *
 * Tests CLI command dispatch, output formatting, JSON mode, and error handling.
 * Runs against qara's real .claude/ directory for integration coverage.
 */

import { describe, it, expect } from "bun:test";
import { join } from "path";
import { spawn } from "child_process";

const CLI = join(import.meta.dir, "cli.ts");
const PAI_DIR = join(import.meta.dir, "..", "..", ".."); // .claude/

async function runCLI(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn("bun", ["run", CLI, ...args], {
      cwd: import.meta.dir,
      env: { ...process.env, PAI_DIR },
    });
    let stdout = "",
      stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({ stdout, stderr, exitCode: 124 });
    }, 30000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

describe("context-graph CLI", () => {
  describe("help", () => {
    it("shows usage with --help", async () => {
      const result = await runCLI("--help");
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("scan");
      expect(result.stdout).toContain("orphans");
      expect(result.stdout).toContain("impact");
      expect(result.stdout).toContain("cycles");
      expect(result.stdout).toContain("dot");
      expect(result.stdout).toContain("audit");
    });

    it("shows usage with no args", async () => {
      const result = await runCLI();
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });
  });

  describe("scan", () => {
    it("outputs node and edge counts", async () => {
      const result = await runCLI("scan", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Context Graph:");
      expect(result.stdout).toContain("nodes");
      expect(result.stdout).toContain("edges");
      expect(result.stdout).toContain("By tier:");
    });

    it("outputs JSON with --json flag", async () => {
      const result = await runCLI("scan", "--json", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data.nodeCount).toBeGreaterThan(0);
      expect(data.edgeCount).toBeGreaterThan(0);
      expect(data.tiers).toBeDefined();
      expect(data.skills).toBeInstanceOf(Array);
    });
  });

  describe("orphans", () => {
    it("reports on unreferenced files and broken references", async () => {
      const result = await runCLI("orphans", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      // Output should contain either "No unreferenced files" or "Unreferenced files"
      const hasUnreferenced = result.stdout.includes("Unreferenced files") || result.stdout.includes("No unreferenced files");
      expect(hasUnreferenced).toBe(true);
      // Same for broken references
      const hasBroken = result.stdout.includes("Broken references") || result.stdout.includes("No broken references");
      expect(hasBroken).toBe(true);
    });

    it("outputs JSON with --json flag", async () => {
      const result = await runCLI("orphans", "--json", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data.unreferencedFiles).toBeInstanceOf(Array);
      expect(data.brokenReferences).toBeInstanceOf(Array);
    });
  });

  describe("cycles", () => {
    it("reports on circular dependencies", async () => {
      const result = await runCLI("cycles", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      const hasCycles = result.stdout.includes("circular dependency") || result.stdout.includes("No circular dependencies");
      expect(hasCycles).toBe(true);
    });

    it("outputs JSON with --json flag", async () => {
      const result = await runCLI("cycles", "--json", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data).toBeInstanceOf(Array);
    });
  });

  describe("impact", () => {
    it("shows dependents for a known file", async () => {
      const result = await runCLI("impact", "skills/CORE/SKILL.md", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Impact analysis for:");
    });

    it("outputs JSON with --json flag", async () => {
      const result = await runCLI("impact", "skills/CORE/SKILL.md", "--json", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data.directDependents).toBeInstanceOf(Array);
      expect(data.transitiveDependents).toBeInstanceOf(Array);
      expect(data.affectedSkills).toBeInstanceOf(Array);
    });

    it("errors without file argument", async () => {
      const result = await runCLI("impact", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Usage:");
    });
  });

  describe("dot", () => {
    it("outputs valid DOT format", async () => {
      const result = await runCLI("dot", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("digraph context {");
      expect(result.stdout).toContain("rankdir=LR");
      expect(result.stdout).toContain("}");
    });
  });

  describe("audit", () => {
    it("runs full audit report", async () => {
      const result = await runCLI("audit", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("CONTEXT GRAPH AUDIT");
      expect(result.stdout).toContain("Context Graph:");
    });

    it("outputs JSON with --json flag", async () => {
      const result = await runCLI("audit", "--json", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data.scan).toBeDefined();
      expect(data.orphans).toBeDefined();
      expect(data.cycles).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("errors on unknown command", async () => {
      const result = await runCLI("frobnicate", "--pai-dir", PAI_DIR);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Unknown command");
    });
  });
});
