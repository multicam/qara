/**
 * skill-usage-tracker.ts
 *
 * Tracks skill invocations and usage patterns for PAI optimization.
 * Provides metrics for understanding which skills are most valuable.
 *
 * Metrics tracked:
 * - Skill invocation frequency
 * - Time spent in each skill
 * - Success/failure rates
 * - Common usage patterns
 */

import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { STATE_DIR, ensureDir } from "./pai-paths";
import { appendJsonl } from "./jsonl-utils";
import { getISOTimestamp } from "./datetime-utils";

interface SkillInvocation {
  timestamp: string;
  skill_name: string;
  args?: string;
  session_id: string;
  invoked_by: "user" | "auto";
}

interface SkillUsageStats {
  skill_name: string;
  total_invocations: number;
  last_invocation: string;
  first_invocation: string;
  user_invocations: number;
  auto_invocations: number;
}

/**
 * Record a skill invocation
 */
export function recordSkillInvocation(data: {
  skill_name: string;
  args?: string;
  session_id: string;
  invoked_by: "user" | "auto";
}): void {
  const logFile = join(STATE_DIR, "skill-usage.jsonl");
  ensureDir(STATE_DIR);

  const entry: SkillInvocation = {
    timestamp: getISOTimestamp(),
    skill_name: data.skill_name,
    args: data.args,
    session_id: data.session_id,
    invoked_by: data.invoked_by,
  };

  appendJsonl(logFile, entry);

  // Update aggregated stats
  updateSkillStats(data.skill_name, data.invoked_by);
}

/**
 * Update aggregated skill statistics
 */
function updateSkillStats(skillName: string, invokedBy: "user" | "auto"): void {
  const statsFile = join(STATE_DIR, "skill-usage-stats.json");
  ensureDir(STATE_DIR);

  let stats: Record<string, SkillUsageStats> = {};

  if (existsSync(statsFile)) {
    try {
      stats = JSON.parse(readFileSync(statsFile, "utf-8"));
    } catch (error) {
      // If file is corrupted, start fresh
      console.error("Error reading skill stats, starting fresh:", error);
    }
  }

  const now = getISOTimestamp();

  if (!stats[skillName]) {
    stats[skillName] = {
      skill_name: skillName,
      total_invocations: 0,
      last_invocation: now,
      first_invocation: now,
      user_invocations: 0,
      auto_invocations: 0,
    };
  }

  stats[skillName].total_invocations++;
  stats[skillName].last_invocation = now;

  if (invokedBy === "user") {
    stats[skillName].user_invocations++;
  } else {
    stats[skillName].auto_invocations++;
  }

  writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

/**
 * Get skill usage statistics
 */
export function getSkillUsageStats(): Record<string, SkillUsageStats> {
  const statsFile = join(STATE_DIR, "skill-usage-stats.json");

  if (!existsSync(statsFile)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(statsFile, "utf-8"));
  } catch (error) {
    console.error("Error reading skill stats:", error);
    return {};
  }
}

/**
 * Get top N most used skills
 */
export function getTopSkills(limit: number = 10): SkillUsageStats[] {
  const stats = getSkillUsageStats();

  return Object.values(stats)
    .sort((a, b) => b.total_invocations - a.total_invocations)
    .slice(0, limit);
}

/**
 * Get skill usage report
 */
export function generateSkillUsageReport(): string {
  const stats = getSkillUsageStats();
  const skills = Object.values(stats);

  if (skills.length === 0) {
    return "No skill usage data available yet.";
  }

  const sortedSkills = skills.sort((a, b) => b.total_invocations - a.total_invocations);

  let report = "=== Skill Usage Report ===\n\n";
  report += `Total skills tracked: ${skills.length}\n`;
  report += `Total invocations: ${skills.reduce((sum, s) => sum + s.total_invocations, 0)}\n\n`;

  report += "Top Skills by Usage:\n";
  sortedSkills.slice(0, 10).forEach((skill, index) => {
    const userPct = skill.total_invocations > 0
      ? ((skill.user_invocations / skill.total_invocations) * 100).toFixed(0)
      : "0";

    report += `${index + 1}. ${skill.skill_name}\n`;
    report += `   Total: ${skill.total_invocations} (${skill.user_invocations} user, ${skill.auto_invocations} auto)\n`;
    report += `   User-driven: ${userPct}%\n`;
    report += `   Last used: ${skill.last_invocation}\n\n`;
  });

  // Identify underutilized skills (those with 0 invocations would need to be tracked separately)
  const lowUsageSkills = sortedSkills.filter(s => s.total_invocations < 3);
  if (lowUsageSkills.length > 0) {
    report += "\nLow Usage Skills (<3 invocations):\n";
    lowUsageSkills.forEach(skill => {
      report += `- ${skill.skill_name}: ${skill.total_invocations} invocations\n`;
    });
  }

  return report;
}

/**
 * Detect skill usage patterns
 */
export function detectSkillPatterns(): {
  user_favorites: string[];
  auto_suggestions_accepted: string[];
  discovery_candidates: string[];
} {
  const stats = getSkillUsageStats();
  const skills = Object.values(stats);

  // Skills primarily invoked by user
  const userFavorites = skills
    .filter(s => s.user_invocations > s.auto_invocations && s.total_invocations >= 3)
    .sort((a, b) => b.user_invocations - a.user_invocations)
    .slice(0, 5)
    .map(s => s.skill_name);

  // Skills where auto-suggestions led to usage
  const autoSuggestionsAccepted = skills
    .filter(s => s.auto_invocations > 0 && s.user_invocations > 0)
    .sort((a, b) => b.auto_invocations - a.auto_invocations)
    .slice(0, 5)
    .map(s => s.skill_name);

  // Skills with low usage that might need better discovery
  const discoveryCandidates = skills
    .filter(s => s.total_invocations < 3 || s.user_invocations === 0)
    .map(s => s.skill_name);

  return {
    user_favorites: userFavorites,
    auto_suggestions_accepted: autoSuggestionsAccepted,
    discovery_candidates: discoveryCandidates,
  };
}
