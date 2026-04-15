import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const SKILL_DIR = join(import.meta.dir, "../skills/system-create-cli");

function readSkillFile(relativePath: string): string {
  return readFileSync(join(SKILL_DIR, relativePath), "utf-8");
}

describe("system-create-cli skill — smoke tests", () => {
  // Test 1: no ~/.claude/.env refs anywhere in the skill dir
  it("config path consistency — zero ~/.claude/.env hits", () => {
    // rg exits with code 1 when no matches found — that's the success case here
    let result = "";
    try {
      result = execSync(
        `rg --fixed-strings "~/.claude/.env" "${SKILL_DIR}" -l`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
    } catch {
      // exit 1 = no matches found = what we want; result stays ""
    }
    expect(result).toBe("");
  });

  // Test 2: new workflow files exist and are referenced in SKILL.md
  it("create-ai-cli.md exists and is linked from SKILL.md", () => {
    expect(existsSync(join(SKILL_DIR, "workflows/create-ai-cli.md"))).toBe(true);
    const skill = readSkillFile("SKILL.md");
    expect(skill).toContain("create-ai-cli.md");
  });

  it("create-mcp-cli.md exists and is linked from SKILL.md", () => {
    expect(existsSync(join(SKILL_DIR, "workflows/create-mcp-cli.md"))).toBe(true);
    const skill = readSkillFile("SKILL.md");
    expect(skill).toContain("create-mcp-cli.md");
  });

  // Test 3: ai-cli-patterns.md exists and has all three sections
  it("ai-cli-patterns.md exists and has sections A, B, and C", () => {
    const refPath = join(SKILL_DIR, "references/ai-cli-patterns.md");
    expect(existsSync(refPath)).toBe(true);
    const content = readFileSync(refPath, "utf-8");
    expect(content).toContain("Section A");
    expect(content).toContain("Section B");
    expect(content).toContain("Section C");
  });

  // Test 4: SKILL.md Workflow Routing table has no Tier 3 / oclif row
  // (callout text mentioning oclif outside the table is fine)
  it("SKILL.md Workflow Routing table does not contain an oclif row", () => {
    const skill = readSkillFile("SKILL.md");
    // Find the Workflow Routing section, extract table lines only
    const routingSection = skill.split("## Three-Tier")[0]; // everything before tier section
    const tableLines = routingSection
      .split("\n")
      .filter((line) => line.startsWith("|") && line.toLowerCase().includes("oclif"));
    expect(tableLines).toHaveLength(0);
  });

  // Test 5: patterns.md contains a direct-run guard section (Pattern 11)
  it("patterns.md contains direct-run guard section", () => {
    const patterns = readSkillFile("patterns.md");
    // Matches "## 11." header or any "Pattern 11" mention
    expect(patterns).toMatch(/##\s+11\.|Pattern 11|direct.run guard/i);
  });
});
