/**
 * e2e-freeze.ts tests
 *
 * Tests the E2E spec freezing tool: .draft.spec.ts -> .spec.ts rename
 * with validation (exists, correct extension, no target conflict).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";

const TOOL = join(import.meta.dir, "e2e-freeze.ts");
const FIXTURE_DIR = join(tmpdir(), `e2e-freeze-test-${process.pid}`);

async function runFreeze(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn("bun", ["run", TOOL, ...args], {
      cwd: FIXTURE_DIR,
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
    }, 10000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

describe("e2e-freeze.ts", () => {
  beforeEach(() => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  describe("help", () => {
    it("shows help with --help", async () => {
      const result = await runFreeze("--help");
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("shows help with no args", async () => {
      const result = await runFreeze();
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });
  });

  describe("freezing", () => {
    it("renames .draft.spec.ts to .spec.ts", async () => {
      const draft = join(FIXTURE_DIR, "login.draft.spec.ts");
      writeFileSync(draft, "test('login', () => {});");

      const result = await runFreeze(draft);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("FROZEN:");
      expect(result.stdout).toContain("login.draft.spec.ts");
      expect(result.stdout).toContain("login.spec.ts");
      expect(result.stdout).toContain("1 frozen, 0 skipped");

      expect(existsSync(draft)).toBe(false);
      expect(existsSync(join(FIXTURE_DIR, "login.spec.ts"))).toBe(true);
    });

    it("freezes multiple files", async () => {
      const files = ["a.draft.spec.ts", "b.draft.spec.ts", "c.draft.spec.ts"];
      for (const f of files) {
        writeFileSync(join(FIXTURE_DIR, f), "test");
      }

      const result = await runFreeze(
        ...files.map((f) => join(FIXTURE_DIR, f))
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("3 frozen, 0 skipped");

      for (const f of files) {
        const target = f.replace(".draft.spec.ts", ".spec.ts");
        expect(existsSync(join(FIXTURE_DIR, f))).toBe(false);
        expect(existsSync(join(FIXTURE_DIR, target))).toBe(true);
      }
    });
  });

  describe("validation", () => {
    it("skips non-.draft.spec.ts files", async () => {
      const file = join(FIXTURE_DIR, "login.spec.ts");
      writeFileSync(file, "test");

      const result = await runFreeze(file);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("SKIP:");
      expect(result.stderr).toContain("not a .draft.spec.ts");
      expect(result.stdout).toContain("0 frozen, 1 skipped");
    });

    it("skips nonexistent files", async () => {
      const file = join(FIXTURE_DIR, "ghost.draft.spec.ts");

      const result = await runFreeze(file);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("SKIP:");
      expect(result.stderr).toContain("file not found");
    });

    it("skips when target already exists", async () => {
      const draft = join(FIXTURE_DIR, "login.draft.spec.ts");
      const target = join(FIXTURE_DIR, "login.spec.ts");
      writeFileSync(draft, "draft");
      writeFileSync(target, "frozen");

      const result = await runFreeze(draft);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("SKIP:");
      expect(result.stderr).toContain("already exists");

      // Neither file should be modified
      expect(existsSync(draft)).toBe(true);
      expect(existsSync(target)).toBe(true);
    });

    it("reports mixed results correctly", async () => {
      const good = join(FIXTURE_DIR, "ok.draft.spec.ts");
      const bad = join(FIXTURE_DIR, "nope.ts");
      writeFileSync(good, "test");
      writeFileSync(bad, "test");

      const result = await runFreeze(good, bad);
      expect(result.exitCode).toBe(1); // errors > 0
      expect(result.stdout).toContain("1 frozen, 1 skipped");
    });
  });
});
