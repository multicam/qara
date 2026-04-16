/**
 * Tests for keyword-router.ts
 *
 * Tests keyword detection, sanitization, context-window filtering,
 * mode activation/deactivation, and edge cases.
 *
 * Uses test-macros.ts runHook() for subprocess-based testing.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Isolated PAI_DIR
const TEST_PAI_DIR = join(tmpdir(), `keyword-router-test-${process.pid}`);
const TEST_STATE_DIR = join(TEST_PAI_DIR, "state");
const TEST_HOOKS_DIR = join(TEST_PAI_DIR, "hooks");
const TEST_SKILLS_DIR = join(TEST_PAI_DIR, "skills");
const MODE_STATE_FILE = join(TEST_STATE_DIR, "mode-state.json");

// The hook script path (actual source, not test copy)
const HOOK_SCRIPT = join(import.meta.dir, "..", "hooks", "keyword-router.ts");

// Helper: run the hook as subprocess with given input
async function runRouter(input: object): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PAI_DIR: TEST_PAI_DIR,
      MODE_STATE_NO_CLI: "1",
      CLAUDE_SESSION_ID: "test-session",
    },
    cwd: join(import.meta.dir, "..", "hooks"),
  });

  const inputStr = JSON.stringify(input);
  proc.stdin.write(inputStr);
  proc.stdin.end();

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

// Helper: create a minimal skill SKILL.md
function createSkill(name: string, content: string): void {
  const dir = join(TEST_SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
}

describe("Keyword Router", () => {
  beforeEach(() => {
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    mkdirSync(TEST_HOOKS_DIR, { recursive: true });
    mkdirSync(TEST_SKILLS_DIR, { recursive: true });
    // Create test skills
    createSkill("drive", "# Drive Mode\nPRD-driven iteration loop.");
    createSkill("cruise", "# Cruise Mode\nPhased autonomous execution.");
    createSkill("turbo", "# Turbo Mode\nParallel agent dispatch.");
    // Clean mode state
    if (existsSync(MODE_STATE_FILE)) rmSync(MODE_STATE_FILE);
  });

  afterEach(() => {
    if (existsSync(MODE_STATE_FILE)) rmSync(MODE_STATE_FILE);
  });

  // ─── Basic Keyword Detection ─────────────────────────────────────────────

  describe("keyword detection", () => {
    it("should detect 'drive' keyword and inject skill", async () => {
      const result = await runRouter({ prompt: "drive: implement user auth" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Drive Mode");
      expect(result.stdout).toContain("system-reminder");
    });

    it("should detect 'cruise' keyword", async () => {
      const result = await runRouter({ prompt: "cruise: explore the codebase" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Cruise Mode");
    });

    it("should detect 'turbo' keyword", async () => {
      const result = await runRouter({ prompt: "turbo: refactor all modules" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Turbo Mode");
    });

    it("should produce no output for unmatched prompts", async () => {
      const result = await runRouter({ prompt: "fix the bug in auth.ts" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should detect 'stop mode' keyword", async () => {
      // First activate a mode
      await runRouter({ prompt: "drive: start work" });
      // Then stop it
      const result = await runRouter({ prompt: "stop mode" });
      expect(result.exitCode).toBe(0);
      // Mode state should be cleared
      expect(existsSync(MODE_STATE_FILE)).toBe(false);
    });
  });

  // ─── Sanitization ────────────────────────────────────────────────────────

  describe("sanitization", () => {
    it("should not match keywords inside URLs", async () => {
      const result = await runRouter({ prompt: "check https://example.com/drive/api" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should not match keywords inside code blocks", async () => {
      const result = await runRouter({ prompt: "look at this:\n```\nconst mode = 'drive';\n```" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should not match keywords inside file paths", async () => {
      const result = await runRouter({ prompt: "read /home/user/drive/config.ts" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should not match keywords inside quoted strings", async () => {
      const result = await runRouter({ prompt: 'the variable is called "drive_mode"' });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });
  });

  // ─── Context Window (Informational vs Actionable) ────────────────────────

  describe("context window", () => {
    it("should skip informational mentions with 'what is'", async () => {
      const result = await runRouter({ prompt: "what is drive mode and how does it work?" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should skip informational mentions with 'explain'", async () => {
      const result = await runRouter({ prompt: "explain how cruise mode operates" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should skip informational mentions with 'how does'", async () => {
      const result = await runRouter({ prompt: "how does turbo mode work internally?" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should match actionable drive command", async () => {
      const result = await runRouter({ prompt: "drive: build the new feature" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Drive Mode");
    });
  });

  // ─── Mode Activation ────────────────────────────────────────────────────

  describe("mode activation", () => {
    it("should create mode-state.json when activating drive", async () => {
      await runRouter({ prompt: "drive: implement feature X" });
      expect(existsSync(MODE_STATE_FILE)).toBe(true);
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.mode).toBe("drive");
      expect(state.active).toBe(true);
      expect(state.taskContext).toContain("implement feature X");
    });

    it("should set maxIterations from route defaults", async () => {
      await runRouter({ prompt: "cruise: explore things" });
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.maxIterations).toBe(20); // cruise default
    });

    // ─── planPath detection (plan-aware cruise migration Phase 1) ──────────

    it("should set planPath when cruise is activated with a plan file", async () => {
      await runRouter({ prompt: "cruise: implement thoughts/shared/plans/foo-plan.md" });
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.mode).toBe("cruise");
      expect(state.planPath).toContain("thoughts/shared/plans/foo-plan.md");
    });

    it("should leave planPath null when cruise is activated without a plan file", async () => {
      await runRouter({ prompt: "cruise: explore things" });
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.mode).toBe("cruise");
      expect(state.planPath).toBeNull();
    });

    it("should not set prdPath when activating cruise without a PRD (bug fix)", async () => {
      await runRouter({ prompt: "cruise: explore things" });
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.mode).toBe("cruise");
      expect(state.prdPath).toBeNull();
    });

    it("should still set prdPath when activating drive (regression guard)", async () => {
      await runRouter({ prompt: "drive: implement auth feature" });
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.mode).toBe("drive");
      expect(state.prdPath).toContain("prd.json");
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle empty prompt gracefully", async () => {
      const result = await runRouter({ prompt: "" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should handle missing prompt field", async () => {
      const result = await runRouter({ session_id: "test" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should handle malformed JSON input", async () => {
      const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: TEST_PAI_DIR, MODE_STATE_NO_CLI: "1" },
        cwd: join(import.meta.dir, "..", "hooks"),
      });
      proc.stdin.write("not json");
      proc.stdin.end();
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0); // Must never exit(1)
    });

    it("should handle empty input", async () => {
      const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: TEST_PAI_DIR, MODE_STATE_NO_CLI: "1" },
        cwd: join(import.meta.dir, "..", "hooks"),
      });
      proc.stdin.write("");
      proc.stdin.end();
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });

    it("should use first match when multiple keywords present", async () => {
      const result = await runRouter({ prompt: "drive: use turbo mode for this" });
      expect(result.exitCode).toBe(0);
      // "drive" appears first, should win
      expect(result.stdout).toContain("Drive Mode");
    });
  });

  // ─── Design-skill routes (Phase 3: tune consolidation) ───────────────────

  describe("design-skill routes", () => {
    beforeEach(() => {
      createSkill("tune", "# Tune Skill\nVisual intensity dispatcher (bolder/quieter/colorize).");
    });

    it("should route 'too loud' to tune (quieter mode inferred)", async () => {
      const result = await runRouter({ prompt: "the hero section is too loud" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Tune Skill");
    });

    it("should route 'too bland' to tune (bolder mode inferred)", async () => {
      const result = await runRouter({ prompt: "this landing page feels too bland" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Tune Skill");
    });

    it("should route 'too gray' to tune (colorize mode inferred)", async () => {
      const result = await runRouter({ prompt: "the dashboard looks too gray" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Tune Skill");
    });

    it("should route 'make it bolder' to tune", async () => {
      const result = await runRouter({ prompt: "make it bolder and more memorable" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Tune Skill");
    });

    it("should route 'tone it down' to tune (quieter)", async () => {
      const result = await runRouter({ prompt: "tone it down a bit" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Tune Skill");
    });

    it("should route 'needs more color' to tune (colorize)", async () => {
      const result = await runRouter({ prompt: "this interface needs more color" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Tune Skill");
    });

    it("should NOT route informational 'what is bolder' to tune", async () => {
      const result = await runRouter({ prompt: "what is too bold in this design" });
      expect(result.exitCode).toBe(0);
      // "what is" triggers the informational filter
      expect(result.stdout).toBe("");
    });
  });

  // ─── Typography routes (Phase 4: impeccable-typeset wrapper) ────────────

  describe("impeccable-typeset routes", () => {
    beforeEach(() => {
      createSkill("impeccable-typeset", "# Typeset Wrapper\nTypography diagnosis per impeccable/reference/typography.md.");
    });

    it("should route 'fix the typography' to impeccable-typeset", async () => {
      const result = await runRouter({ prompt: "fix the typography on this page" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Typeset Wrapper");
    });

    it("should route 'fonts look wrong' to impeccable-typeset", async () => {
      const result = await runRouter({ prompt: "the fonts look wrong here" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Typeset Wrapper");
    });

    it("should route 'type hierarchy broken' to impeccable-typeset", async () => {
      const result = await runRouter({ prompt: "the type hierarchy broken" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Typeset Wrapper");
    });

    it("should route 'readability issues' to impeccable-typeset", async () => {
      const result = await runRouter({ prompt: "there are readability issues" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Typeset Wrapper");
    });
  });

  // ─── Design-system routes (replaces tokens) ──────────────────────────────

  describe("design-system routes", () => {
    beforeEach(() => {
      createSkill("design-system", "# Design System\nCreate, consume, extract, enforce design systems.");
    });

    it("should route 'design tokens' to design-system", async () => {
      const result = await runRouter({ prompt: "extract design tokens from this repo" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Design System");
    });

    it("should route 'design system' to design-system", async () => {
      const result = await runRouter({ prompt: "we need to build a design system here" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Design System");
    });

    it("should route 'hardcoded colors' to design-system", async () => {
      const result = await runRouter({ prompt: "these hardcoded colors are everywhere" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Design System");
    });
  });

  // ─── Flows routes + shape-vs-flows disambiguation (Phase 6) ─────────────

  describe("flows routes", () => {
    beforeEach(() => {
      createSkill("flows", "# Flows Skill\nProduct-scoped user journey and IA work.");
      createSkill("shape", "# Shape Skill\nFeature-scoped UX planning.");
    });

    it("should route 'user journey' to flows", async () => {
      const result = await runRouter({ prompt: "map the user journey for signup" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Flows Skill");
    });

    it("should route 'information architecture' to flows", async () => {
      const result = await runRouter({ prompt: "audit the information architecture" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Flows Skill");
    });

    it("should route 'site map' to flows", async () => {
      const result = await runRouter({ prompt: "draw the sitemap for this product" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Flows Skill");
    });

    it("should route 'menu hierarchy' to flows", async () => {
      const result = await runRouter({ prompt: "the menu hierarchy needs work" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Flows Skill");
    });

    // Disambiguation: shape-related triggers (not routed by router, but must not leak to flows)
    it("should NOT route 'plan this feature' to flows", async () => {
      const result = await runRouter({ prompt: "plan the UX for this button feature" });
      expect(result.exitCode).toBe(0);
      // Neither flows nor shape routes match this phrasing — expect empty output
      expect(result.stdout).toBe("");
    });
  });

  // ─── Review routes (absorbs critique, audit, state phrases) ─────────────

  describe("review routes", () => {
    beforeEach(() => {
      createSkill("review", "# Review Skill\nCombined UX + technical design review.");
    });

    it("should route 'empty state' to review", async () => {
      const result = await runRouter({ prompt: "how should I design the empty state" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Review Skill");
    });

    it("should route 'loading state' to review", async () => {
      const result = await runRouter({ prompt: "add a loading state to the dashboard" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Review Skill");
    });

    it("should route 'skeleton screen' to review", async () => {
      const result = await runRouter({ prompt: "design the skeleton screen" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Review Skill");
    });

    it("should route 'error state' to review", async () => {
      const result = await runRouter({ prompt: "improve the error state appearance" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Review Skill");
    });

    it("should route 'critique' to review", async () => {
      const result = await runRouter({ prompt: "critique this design" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Review Skill");
    });

    it("should route 'audit' to review", async () => {
      const result = await runRouter({ prompt: "audit the accessibility" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Review Skill");
    });
  });

  // ─── Enhance routes ─────────────────────────────────────────────────────

  describe("enhance routes", () => {
    beforeEach(() => {
      createSkill("enhance", "# Enhance Skill\nLayout, motion, responsive, performance improvements.");
    });

    it("should route 'fix the layout' to enhance", async () => {
      const result = await runRouter({ prompt: "fix the layout on this page" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Enhance Skill");
    });

    it("should route 'add animation' to enhance", async () => {
      const result = await runRouter({ prompt: "add animation to the hero section" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Enhance Skill");
    });

    it("should route 'bundle size' to enhance", async () => {
      const result = await runRouter({ prompt: "the bundle size is too large" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Enhance Skill");
    });
  });

  // ─── Finish routes ──────────────────────────────────────────────────────

  describe("finish routes", () => {
    beforeEach(() => {
      createSkill("finish", "# Finish Skill\nPre-ship polish + copy clarity pass.");
    });

    it("should route 'polish' to finish", async () => {
      const result = await runRouter({ prompt: "polish this before shipping" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Finish Skill");
    });

    it("should route 'pre-ship' to finish", async () => {
      const result = await runRouter({ prompt: "pre-ship review for this feature" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Finish Skill");
    });

    it("should route 'clarify' to finish", async () => {
      const result = await runRouter({ prompt: "clarify the error messages" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Finish Skill");
    });
  });

  // ─── Design-research routes ─────────────────────────────────────────────

  describe("design-research routes", () => {
    beforeEach(() => {
      createSkill("design-research", "# Design Research\nMood boards, competitive analysis, inspiration.");
    });

    it("should route 'mood board' to design-research", async () => {
      const result = await runRouter({ prompt: "create a mood board for the rebrand" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Design Research");
    });

    it("should route 'competitive analysis' to design-research", async () => {
      const result = await runRouter({ prompt: "do a competitive analysis of payment apps" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Design Research");
    });
  });
});
