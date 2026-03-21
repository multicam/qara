#!/usr/bin/env bun
/**
 * External Skills Analyzer
 * Scans installed external skills (symlinks, lock files, skills CLI)
 * and generates a structured analysis report.
 *
 * Usage: bun run .claude/skills/cc-upgrade/scripts/analyse-external-skills.ts [target-path]
 */

import { readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync, existsSync } from "fs";
import { join, resolve, basename } from "path";
import { type AnalysisResult, type AnalyzerFunction, emptyResult, runAnalysis, formatReport, parseSkillFrontmatter } from "./shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExternalSkill {
  name: string;
  symlinkTarget: string;
  isSymlink: boolean;
  hasSKILLmd: boolean;
  frontmatter: {
    valid: boolean;
    name: string | null;
    context: string | null;
    description?: string;
  };
  lineCount: number;
  hasReferences: boolean;
  hasScripts: boolean;
  hasWorkflows: boolean;
}

interface LockFileEntry {
  source: string;
  sourceType: string;
  sourceUrl: string;
  skillPath: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
}

interface LockFile {
  version: number;
  skills: Record<string, LockFileEntry>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findSymlinkedSkills(skillsPath: string): ExternalSkill[] {
  const results: ExternalSkill[] = [];
  if (!existsSync(skillsPath)) return results;

  for (const entry of readdirSync(skillsPath)) {
    const fullPath = join(skillsPath, entry);
    try {
      const stat = lstatSync(fullPath);
      if (!stat.isSymbolicLink()) continue;

      const target = readlinkSync(fullPath);
      // Use realpathSync for OS-level symlink resolution (handles relative paths correctly)
      let resolvedTarget: string;
      try {
        resolvedTarget = realpathSync(fullPath);
      } catch {
        // Symlink target doesn't exist
        results.push({
          name: entry,
          symlinkTarget: target,
          isSymlink: true,
          hasSKILLmd: false,
          frontmatter: { valid: false, name: null, context: null },
          lineCount: 0,
          hasReferences: false,
          hasScripts: false,
          hasWorkflows: false,
        });
        continue;
      }
      const skillMdPath = join(resolvedTarget, "SKILL.md");
      const hasSKILLmd = existsSync(skillMdPath);

      let frontmatter = { valid: false } as ExternalSkill["frontmatter"];
      let lineCount = 0;

      if (hasSKILLmd) {
        const parsed = parseSkillFrontmatter(skillMdPath);
        frontmatter = {
          valid: parsed.valid,
          name: parsed.name,
          context: parsed.context,
          description: parsed.content?.slice(0, 200),
        };
        lineCount = readFileSync(skillMdPath, "utf-8").split("\n").length;
      }

      results.push({
        name: entry,
        symlinkTarget: resolvedTarget,
        isSymlink: true,
        hasSKILLmd,
        frontmatter,
        lineCount,
        hasReferences: existsSync(join(resolvedTarget, "references")),
        hasScripts: existsSync(join(resolvedTarget, "scripts")),
        hasWorkflows: existsSync(join(resolvedTarget, "workflows")),
      });
    } catch {
      // Skip broken symlinks
    }
  }
  return results;
}

function readLockFile(): LockFile | null {
  const lockPath = join(process.env.HOME || "~", ".agents", ".skill-lock.json");
  try {
    return JSON.parse(readFileSync(lockPath, "utf-8"));
  } catch {
    return null;
  }
}

function groupBySource(skills: ExternalSkill[]): Map<string, ExternalSkill[]> {
  const groups = new Map<string, ExternalSkill[]>();
  for (const skill of skills) {
    // Group by the parent directory of the symlink target
    const sourceDir = skill.symlinkTarget.replace(/\/[^/]+$/, "");
    const existing = groups.get(sourceDir) || [];
    existing.push(skill);
    groups.set(sourceDir, existing);
  }
  return groups;
}

// ─── Analyzers ────────────────────────────────────────────────────────────────

export const analyzeExternalInventory: AnalyzerFunction = (basePath: string): AnalysisResult => {
  const result = emptyResult(20);
  const skillsPath = join(basePath, ".claude", "skills");
  const skills = findSymlinkedSkills(skillsPath);

  if (skills.length === 0) {
    result.findings.push("No symlinked external skills found");
    result.score = 5; // Not having externals is fine
    return result;
  }

  result.findings.push(`Found ${skills.length} symlinked external skill(s)`);
  result.score += 3;

  // Check that all symlinks resolve
  const broken = skills.filter(s => !s.hasSKILLmd);
  if (broken.length > 0) {
    result.findings.push(`${broken.length} broken symlink(s): ${broken.map(s => s.name).join(", ")}`);
    result.recommendations.push("Fix or remove broken skill symlinks");
  } else {
    result.score += 3;
    result.findings.push("All symlinks resolve correctly");
  }

  // Check frontmatter validity
  const invalidFrontmatter = skills.filter(s => s.hasSKILLmd && !s.frontmatter.valid);
  if (invalidFrontmatter.length > 0) {
    result.findings.push(`${invalidFrontmatter.length} skill(s) with invalid frontmatter: ${invalidFrontmatter.map(s => s.name).join(", ")}`);
    result.recommendations.push("Report invalid frontmatter to upstream maintainer");
  } else if (skills.filter(s => s.hasSKILLmd).length > 0) {
    result.score += 3;
    result.findings.push("All external skills have valid frontmatter");
  }

  // Check lock file tracking
  const lockFile = readLockFile();
  if (lockFile) {
    result.score += 3;
    result.findings.push(`Lock file tracks ${Object.keys(lockFile.skills).length} source(s)`);

    // Check staleness (> 60 days since update)
    const now = Date.now();
    for (const [name, entry] of Object.entries(lockFile.skills)) {
      const updatedAt = new Date(entry.updatedAt).getTime();
      const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 60) {
        result.findings.push(`${name}: ${daysSinceUpdate} days since last update`);
        result.recommendations.push(`Run \`npx skills check\` to check for ${name} updates`);
      } else {
        result.score += 2;
        result.findings.push(`${name}: updated ${daysSinceUpdate} days ago (current)`);
      }
    }
  } else {
    result.findings.push("No lock file found at ~/.agents/.skill-lock.json");
    result.recommendations.push("Install skills via `npx skills` for version tracking");
  }

  // Group by source
  const groups = groupBySource(skills);
  result.findings.push(`Skills come from ${groups.size} source(s)`);
  for (const [source, group] of groups) {
    result.findings.push(`  ${basename(source)}: ${group.length} skill(s)`);
    result.score += 2;
  }

  return result;
};

export const analyzeRedundancy: AnalyzerFunction = (basePath: string): AnalysisResult => {
  const result = emptyResult(15);
  const skillsPath = join(basePath, ".claude", "skills");

  if (!existsSync(skillsPath)) {
    result.score = 15;
    return result;
  }

  const allSkills = readdirSync(skillsPath);
  const external = findSymlinkedSkills(skillsPath);
  const localSkills = allSkills.filter(s => {
    try {
      return !lstatSync(join(skillsPath, s)).isSymbolicLink();
    } catch {
      return false;
    }
  });

  // Check for name collisions
  const externalNames = new Set(external.map(s => s.name));
  const nameCollisions = localSkills.filter(s => externalNames.has(s));
  if (nameCollisions.length > 0) {
    result.findings.push(`Name collisions: ${nameCollisions.join(", ")}`);
    result.recommendations.push("Resolve name collisions between local and external skills");
  } else {
    result.score += 5;
    result.findings.push("No name collisions between local and external skills");
  }

  // Check context: same overuse in externals
  const sameContext = external.filter(s => s.frontmatter.context === "same");
  if (sameContext.length > 0) {
    result.findings.push(`${sameContext.length} external skill(s) use context: same (loads every conversation): ${sameContext.map(s => s.name).join(", ")}`);
    result.recommendations.push("Evaluate whether external skills need context: same or could use fork");
  } else {
    result.score += 5;
    result.findings.push("All external skills use context: fork (good isolation)");
  }

  // Check size discipline
  const oversized = external.filter(s => s.lineCount > 500);
  if (oversized.length > 0) {
    result.findings.push(`${oversized.length} oversized external skill(s) (>500 lines): ${oversized.map(s => `${s.name} (${s.lineCount})`).join(", ")}`);
    result.recommendations.push("Consider whether oversized skills use progressive disclosure");
  } else {
    result.score += 5;
    result.findings.push("All external skills are within size limits");
  }

  return result;
};

export const analyzeSkillQuality: AnalyzerFunction = (basePath: string): AnalysisResult => {
  const result = emptyResult(15);
  const skillsPath = join(basePath, ".claude", "skills");
  const skills = findSymlinkedSkills(skillsPath);

  if (skills.length === 0) {
    result.score = 15;
    return result;
  }

  // Check progressive disclosure (references/ directory)
  const withReferences = skills.filter(s => s.hasReferences);
  if (withReferences.length > 0) {
    result.score += 5;
    result.findings.push(`${withReferences.length}/${skills.length} external skills use progressive disclosure (references/)`);
  } else {
    result.findings.push("No external skills use progressive disclosure");
    result.recommendations.push("External skills should use references/ for detailed content");
  }

  // Check for scripts (automation)
  const withScripts = skills.filter(s => s.hasScripts);
  if (withScripts.length > 0) {
    result.score += 5;
    result.findings.push(`${withScripts.length}/${skills.length} external skills include scripts/`);
  }

  // Check context type distribution
  const contextDist = new Map<string, number>();
  for (const skill of skills) {
    const ctx = skill.frontmatter.context || "unknown";
    contextDist.set(ctx, (contextDist.get(ctx) || 0) + 1);
  }
  for (const [ctx, count] of contextDist) {
    result.findings.push(`Context type '${ctx}': ${count} skill(s)`);
  }
  result.score += 5;

  return result;
};

// ─── Module Registry ──────────────────────────────────────────────────────────

export const EXTERNAL_MODULES: Record<string, AnalyzerFunction> = {
  "External Skill Inventory": analyzeExternalInventory,
  "Redundancy Check": analyzeRedundancy,
  "Skill Quality": analyzeSkillQuality,
};

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

if (import.meta.main) {
  const targetPath = process.argv[2] || ".";
  const resolvedPath = resolve(targetPath);

  console.log(`\n🔍 Analyzing external skills in: ${resolvedPath}\n`);

  const report = runAnalysis(resolvedPath, EXTERNAL_MODULES);
  console.log(formatReport(report, "External Skills Analysis"));
}