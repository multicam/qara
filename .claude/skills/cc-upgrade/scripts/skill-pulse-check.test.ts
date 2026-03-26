/**
 * skill-pulse-check.ts tests
 *
 * Tests pure logic: daysSince, activityStatus, isOutdated, formatReport.
 * No GitHub API calls — all tested functions are deterministic.
 */

import { describe, it, expect } from "bun:test";

// Suppress direct execution
process.env.SKILL_PULSE_NO_CLI = "1";

import {
  daysSince,
  activityStatus,
  isOutdated,
  formatReport,
  type InstalledSkill,
  type UpstreamData,
  type SkillPulseEntry,
  type PulseReport,
} from "./skill-pulse-check";

// ─── daysSince ──────────────────────────────────────────────────────────────

describe("daysSince", () => {
  it("returns 0 for today", () => {
    const today = new Date().toISOString();
    expect(daysSince(today)).toBe(0);
  });

  it("returns correct days for past date", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
    expect(daysSince(fiveDaysAgo)).toBe(5);
  });

  it("returns large number for old date", () => {
    expect(daysSince("2020-01-01T00:00:00Z")).toBeGreaterThan(365);
  });
});

// ─── activityStatus ─────────────────────────────────────────────────────────

describe("activityStatus", () => {
  it("returns 'active' for recent activity (< 30 days)", () => {
    expect(activityStatus(0)).toBe("active");
    expect(activityStatus(15)).toBe("active");
    expect(activityStatus(29)).toBe("active");
  });

  it("returns 'slow' for 30-89 days", () => {
    expect(activityStatus(30)).toBe("slow");
    expect(activityStatus(60)).toBe("slow");
    expect(activityStatus(89)).toBe("slow");
  });

  it("returns 'stale' for 90+ days", () => {
    expect(activityStatus(90)).toBe("stale");
    expect(activityStatus(365)).toBe("stale");
  });

  it("returns 'unknown' for null", () => {
    expect(activityStatus(null)).toBe("unknown");
  });
});

// ─── isOutdated ─────────────────────────────────────────────────────────────

describe("isOutdated", () => {
  it("returns true when upstream is newer", () => {
    expect(isOutdated("1.0.0", "1.0.1")).toBe(true);
    expect(isOutdated("1.0.0", "1.1.0")).toBe(true);
    expect(isOutdated("1.0.0", "2.0.0")).toBe(true);
  });

  it("returns false when versions match", () => {
    expect(isOutdated("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns false when installed is newer", () => {
    expect(isOutdated("2.0.0", "1.0.0")).toBe(false);
    expect(isOutdated("1.1.0", "1.0.9")).toBe(false);
  });

  it("handles v-prefix", () => {
    expect(isOutdated("v1.0.0", "v1.0.1")).toBe(true);
    expect(isOutdated("v1.0.0", "1.0.1")).toBe(true);
    expect(isOutdated("1.0.0", "v1.0.1")).toBe(true);
  });

  it("returns false for null inputs", () => {
    expect(isOutdated(null, "1.0.0")).toBe(false);
    expect(isOutdated("1.0.0", null)).toBe(false);
    expect(isOutdated(null, null)).toBe(false);
  });

  it("handles different-length versions", () => {
    expect(isOutdated("1.0", "1.0.1")).toBe(true);
    expect(isOutdated("1.0.0", "1.1")).toBe(true);
  });
});

// ─── formatReport ───────────────────────────────────────────────────────────

describe("formatReport", () => {
  function makeEntry(overrides: Partial<SkillPulseEntry> = {}): SkillPulseEntry {
    return {
      skill: {
        name: "test-skill",
        symlinkTarget: "/path/to/skill",
        installedVersion: "1.0.0",
        githubRepo: "user/repo",
        installedAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
      upstream: {
        latestTag: "1.1.0",
        latestCommitDate: new Date().toISOString(),
        stars: 42,
        openIssues: 3,
        defaultBranch: "main",
        fetchError: null,
      },
      isOutdated: true,
      daysSinceUpstreamCommit: 5,
      activityStatus: "active",
      ...overrides,
    };
  }

  it("formats report header", () => {
    const report: PulseReport = {
      timestamp: "2026-03-27T00:00:00Z",
      skillsPath: "/home/test/.claude/skills",
      total: 1,
      withGithubRepo: 1,
      outdated: 1,
      stale: 0,
      entries: [makeEntry()],
      lockFilePresent: true,
    };
    const output = formatReport(report);
    expect(output).toContain("SKILL ECOSYSTEM PULSE REPORT");
    expect(output).toContain("Symlinked skills: 1");
    expect(output).toContain("Outdated: 1");
  });

  it("shows empty message when no skills", () => {
    const report: PulseReport = {
      timestamp: "2026-03-27T00:00:00Z",
      skillsPath: "/test",
      total: 0,
      withGithubRepo: 0,
      outdated: 0,
      stale: 0,
      entries: [],
      lockFilePresent: false,
    };
    const output = formatReport(report);
    expect(output).toContain("No symlinked external skills");
  });

  it("includes skill details in report", () => {
    const report: PulseReport = {
      timestamp: "2026-03-27T00:00:00Z",
      skillsPath: "/test",
      total: 1,
      withGithubRepo: 1,
      outdated: 0,
      stale: 0,
      entries: [makeEntry({ isOutdated: false, activityStatus: "active" })],
      lockFilePresent: true,
    };
    const output = formatReport(report);
    expect(output).toContain("test-skill");
    expect(output).toContain("ACTIVE");
  });

  it("flags outdated skills", () => {
    const report: PulseReport = {
      timestamp: "2026-03-27T00:00:00Z",
      skillsPath: "/test",
      total: 1,
      withGithubRepo: 1,
      outdated: 1,
      stale: 0,
      entries: [makeEntry({ isOutdated: true })],
      lockFilePresent: true,
    };
    const output = formatReport(report);
    expect(output).toContain("OUTDATED");
  });
});
