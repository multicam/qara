/**
 * analyse-external-skills.ts tests
 *
 * Tests external skill analyzers: inventory scanning, redundancy checking,
 * quality assessment. Uses temp fixture directories with real symlinks.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  existsSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  analyzeExternalInventory,
  analyzeRedundancy,
  analyzeSkillQuality,
} from "./analyse-external-skills";

const FIXTURE_DIR = join(tmpdir(), `ext-skills-test-${process.pid}`);
const SKILLS_DIR = join(FIXTURE_DIR, ".claude", "skills");

// Create a mock external skill directory with SKILL.md
function createMockSkill(name: string, opts: {
  context?: string;
  lines?: number;
  hasReferences?: boolean;
  hasScripts?: boolean;
  hasWorkflows?: boolean;
} = {}): string {
  const dir = join(FIXTURE_DIR, "_external", name);
  mkdirSync(dir, { recursive: true });

  const context = opts.context || "fork";
  const lineCount = opts.lines || 20;
  const body = Array.from({ length: lineCount }, (_, i) => `Line ${i + 1}`).join("\n");

  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ncontext: ${context}\ndescription: Test skill ${name}\n---\n\n${body}`
  );

  if (opts.hasReferences) mkdirSync(join(dir, "references"), { recursive: true });
  if (opts.hasScripts) mkdirSync(join(dir, "scripts"), { recursive: true });
  if (opts.hasWorkflows) mkdirSync(join(dir, "workflows"), { recursive: true });

  return dir;
}

describe("analyse-external-skills", () => {
  beforeAll(() => {
    mkdirSync(SKILLS_DIR, { recursive: true });
    mkdirSync(join(FIXTURE_DIR, "_external"), { recursive: true });

    // Create external skills
    const skill1 = createMockSkill("design-review", {
      context: "fork",
      hasReferences: true,
      hasWorkflows: true,
    });
    const skill2 = createMockSkill("code-quality", {
      context: "fork",
      hasScripts: true,
    });
    const skill3 = createMockSkill("always-on", {
      context: "same",
      lines: 600, // oversized
    });

    // Symlink them into skills/
    symlinkSync(skill1, join(SKILLS_DIR, "design-review"));
    symlinkSync(skill2, join(SKILLS_DIR, "code-quality"));
    symlinkSync(skill3, join(SKILLS_DIR, "always-on"));

    // Create a broken symlink
    symlinkSync("/nonexistent/path/ghost", join(SKILLS_DIR, "ghost-skill"));

    // Create a local (non-symlinked) skill
    mkdirSync(join(SKILLS_DIR, "local-skill"), { recursive: true });
    writeFileSync(
      join(SKILLS_DIR, "local-skill", "SKILL.md"),
      "---\nname: local-skill\ncontext: fork\n---\n\nLocal skill."
    );
  });

  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  describe("analyzeExternalInventory", () => {
    it("finds symlinked skills", () => {
      const result = analyzeExternalInventory(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      expect(findingsStr).toContain("symlinked external skill");
    });

    it("detects broken symlinks", () => {
      const result = analyzeExternalInventory(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      expect(findingsStr).toContain("broken");
      expect(findingsStr).toContain("ghost-skill");
    });

    it("validates frontmatter on resolved skills", () => {
      const result = analyzeExternalInventory(FIXTURE_DIR);
      // 3 skills resolve, ghost-skill doesn't — frontmatter check runs on resolved ones
      const hasFrontmatterCheck = result.findings.some(
        (f) => f.includes("frontmatter")
      );
      expect(hasFrontmatterCheck).toBe(true);
    });

    it("groups by source directory", () => {
      const result = analyzeExternalInventory(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      expect(findingsStr).toContain("source");
    });

    it("returns score > 0 for valid skills", () => {
      const result = analyzeExternalInventory(FIXTURE_DIR);
      expect(result.score).toBeGreaterThan(0);
    });

    it("handles empty skills directory", () => {
      const emptyDir = join(tmpdir(), `empty-skills-${process.pid}`);
      mkdirSync(join(emptyDir, ".claude", "skills"), { recursive: true });
      const result = analyzeExternalInventory(emptyDir);
      expect(result.findings.join(" ")).toContain("No symlinked");
      expect(result.score).toBe(5); // "not having externals is fine"
      rmSync(emptyDir, { recursive: true, force: true });
    });

    it("handles missing skills directory", () => {
      const noSkills = join(tmpdir(), `no-skills-${process.pid}`);
      mkdirSync(noSkills, { recursive: true });
      const result = analyzeExternalInventory(noSkills);
      expect(result.findings.join(" ")).toContain("No symlinked");
      rmSync(noSkills, { recursive: true, force: true });
    });
  });

  describe("analyzeRedundancy", () => {
    it("checks for name collisions", () => {
      const result = analyzeRedundancy(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      // No collisions — local-skill doesn't match any external name
      expect(findingsStr).toContain("No name collisions");
    });

    it("detects context:same overuse", () => {
      const result = analyzeRedundancy(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      // always-on uses context: same
      expect(findingsStr).toContain("context: same");
    });

    it("detects oversized skills", () => {
      const result = analyzeRedundancy(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      // always-on has 600 lines
      expect(findingsStr).toContain("oversized");
    });

    it("returns full score when no issues", () => {
      // Create a clean fixture with only well-behaved skills
      const cleanDir = join(tmpdir(), `clean-skills-${process.pid}`);
      const cleanSkills = join(cleanDir, ".claude", "skills");
      mkdirSync(cleanSkills, { recursive: true });
      mkdirSync(join(cleanDir, "_ext"), { recursive: true });

      const good = join(cleanDir, "_ext", "good-skill");
      mkdirSync(good, { recursive: true });
      writeFileSync(join(good, "SKILL.md"), "---\nname: good\ncontext: fork\n---\n\nGood.");
      symlinkSync(good, join(cleanSkills, "good-skill"));

      const result = analyzeRedundancy(cleanDir);
      expect(result.score).toBe(15); // maxScore
      rmSync(cleanDir, { recursive: true, force: true });
    });
  });

  describe("analyzeSkillQuality", () => {
    it("checks progressive disclosure (references/)", () => {
      const result = analyzeSkillQuality(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      expect(findingsStr).toContain("progressive disclosure");
    });

    it("checks for scripts/", () => {
      const result = analyzeSkillQuality(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      expect(findingsStr).toContain("scripts/");
    });

    it("reports context type distribution", () => {
      const result = analyzeSkillQuality(FIXTURE_DIR);
      const findingsStr = result.findings.join(" ");
      expect(findingsStr).toContain("fork");
      expect(findingsStr).toContain("same");
    });

    it("returns full score when no skills", () => {
      const emptyDir = join(tmpdir(), `no-ext-${process.pid}`);
      mkdirSync(join(emptyDir, ".claude", "skills"), { recursive: true });
      const result = analyzeSkillQuality(emptyDir);
      expect(result.score).toBe(15); // maxScore when no externals
      rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
