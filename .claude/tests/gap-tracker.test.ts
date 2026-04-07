/**
 * Tests for gap-tracker.ts — living OMC vs PAI capability comparison.
 *
 * Tests manifest read/write, filesystem-based capability scanning,
 * and report generation.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), `gap-tracker-test-${process.pid}`);
const MANIFEST_PATH = join(TEST_DIR, "gap-manifest.json");
const SCRIPT_PATH = join(import.meta.dir, "..", "skills", "cc-upgrade-pai", "scripts", "gap-tracker.ts");

async function runTracker(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", SCRIPT_PATH, ...args], {
    stdout: "pipe", stderr: "pipe",
    env: { ...process.env, GAP_MANIFEST_PATH: MANIFEST_PATH, PAI_DIR: TEST_DIR },
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

beforeAll(() => {
  // Build a minimal PAI structure for scanning
  mkdirSync(join(TEST_DIR, ".claude", "hooks", "lib"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".claude", "skills", "drive"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".claude", "skills", "cruise"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".claude", "skills", "turbo"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".claude", "agents"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".claude", "skills", "introspect"), { recursive: true });

  writeFileSync(join(TEST_DIR, ".claude", "hooks", "lib", "mode-state.ts"), "export function readModeState() {}");
  writeFileSync(join(TEST_DIR, ".claude", "hooks", "keyword-router.ts"), "// router");
  writeFileSync(join(TEST_DIR, ".claude", "hooks", "lib", "working-memory.ts"), "// memory");
  writeFileSync(join(TEST_DIR, ".claude", "hooks", "lib", "compact-checkpoint.ts"), "// checkpoint");
  writeFileSync(join(TEST_DIR, ".claude", "hooks", "pre-tool-use-quality.ts"), "// quality");
  writeFileSync(join(TEST_DIR, ".claude", "hooks", "post-tool-failure.ts"), "// failures");
  writeFileSync(join(TEST_DIR, ".claude", "skills", "drive", "SKILL.md"), "# Drive");
  writeFileSync(join(TEST_DIR, ".claude", "skills", "cruise", "SKILL.md"), "# Cruise");
  writeFileSync(join(TEST_DIR, ".claude", "skills", "turbo", "SKILL.md"), "# Turbo");
  writeFileSync(join(TEST_DIR, ".claude", "skills", "introspect", "SKILL.md"), "# Introspect");
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("gap-tracker CLI", () => {
  it("should show help with --help", async () => {
    const r = await runTracker(["--help"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("scan");
    expect(r.stdout).toContain("report");
  });

  it("should scan and create manifest", async () => {
    const r = await runTracker(["scan"]);
    expect(r.exitCode).toBe(0);
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    expect(manifest.capabilities).toBeInstanceOf(Array);
    expect(manifest.capabilities.length).toBeGreaterThan(0);
    expect(manifest.lastUpdated).toBeTruthy();
  });

  it("should detect persistent execution modes", async () => {
    await runTracker(["scan"]);
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    const modes = manifest.capabilities.find((c: any) => c.name === "Persistent Execution Modes");
    expect(modes).toBeDefined();
    expect(modes.paiStatus).toBe("implemented");
  });

  it("should detect working memory", async () => {
    await runTracker(["scan"]);
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    const wm = manifest.capabilities.find((c: any) => c.name === "Working Memory");
    expect(wm).toBeDefined();
    expect(wm.paiStatus).toBe("implemented");
  });

  it("should generate a markdown report", async () => {
    await runTracker(["scan"]);
    const r = await runTracker(["report"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("PAI");
    expect(r.stdout).toContain("OMC");
    expect(r.stdout).toContain("|"); // table format
  });

  it("should add a capability manually", async () => {
    await runTracker(["scan"]); // ensure manifest exists
    const r = await runTracker(["add", "--name", "Test Feature", "--category", "hooks", "--pai", "planned"]);
    expect(r.exitCode).toBe(0);
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    const tf = manifest.capabilities.find((c: any) => c.name === "Test Feature");
    expect(tf).toBeDefined();
    expect(tf.paiStatus).toBe("planned");
    expect(tf.category).toBe("hooks");
  });
});
