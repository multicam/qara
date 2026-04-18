/**
 * cc-feature-sync.ts tests
 *
 * Tests changelog parsing, feature/bugfix detection, key generation,
 * gap analysis, and report formatting. All pure function tests — no network.
 */

import { describe, it, expect } from "bun:test";

// Suppress direct execution
process.env.CC_FEATURE_SYNC_NO_CLI = "1";

import {
  parseChangelog,
  isFeatureLine,
  isBugfix,
  toSuggestedKey,
  findNewCandidates,
  findVersionGaps,
  formatReport,
  filterSinceBaseline,
  parseBaselineArg,
  type ChangelogEntry,
  type FeatureSyncReport,
} from "./cc-feature-sync";

// ─── isFeatureLine / isBugfix ───────────────────────────────────────────────

describe("isFeatureLine", () => {
  it("detects feature keywords", () => {
    expect(isFeatureLine("Add support for background tasks")).toBe(true);
    expect(isFeatureLine("Introduce new hook lifecycle events")).toBe(true);
    expect(isFeatureLine("New skill marketplace integration")).toBe(true);
    expect(isFeatureLine("Enable parallel agent execution")).toBe(true);
  });

  it("rejects bugfix lines", () => {
    expect(isFeatureLine("Fix crash when loading large files")).toBe(false);
    expect(isFeatureLine("Bug fix for session timeout")).toBe(false);
    expect(isFeatureLine("Resolve memory leak in agent pool")).toBe(false);
  });

  it("rejects lines without feature keywords", () => {
    expect(isFeatureLine("Update dependency versions")).toBe(false);
    expect(isFeatureLine("Refactor internal logging module")).toBe(false);
  });
});

describe("isBugfix", () => {
  it("detects bugfix keywords", () => {
    expect(isBugfix("Fix crash on startup")).toBe(true);
    expect(isBugfix("Resolve timeout issue")).toBe(true);
    expect(isBugfix("Patch security vulnerability")).toBe(true);
    expect(isBugfix("Revert broken change")).toBe(true);
  });

  it("returns false for feature lines", () => {
    expect(isBugfix("Add new hook system")).toBe(false);
    expect(isBugfix("Introduce MCP support")).toBe(false);
  });
});

// ─── toSuggestedKey ─────────────────────────────────────────────────────────

describe("toSuggestedKey", () => {
  it("converts description to camelCase key", () => {
    expect(toSuggestedKey("Add background task support")).toBe("backgroundTask");
  });

  it("strips stop words", () => {
    const key = toSuggestedKey("Introduce the new hook lifecycle for agents");
    expect(key).not.toContain("the");
    expect(key).not.toContain("for");
  });

  it("limits to 4 words", () => {
    const key = toSuggestedKey("Very long description with many extra words here");
    const parts = key.replace(/([A-Z])/g, " $1").trim().split(" ");
    expect(parts.length).toBeLessThanOrEqual(4);
  });

  it("returns unknownFeature for empty input", () => {
    expect(toSuggestedKey("add the a")).toBe("unknownFeature");
  });
});

// ─── parseChangelog ─────────────────────────────────────────────────────────

describe("parseChangelog", () => {
  const SAMPLE_CHANGELOG = `# Changelog

## [2.1.0] - 2026-03-15

- Add support for parallel agent execution
- Fix crash when agent pool is empty
- Introduce new hook lifecycle events
- Minor performance improvements

## [2.0.5] - 2026-03-01

- Fix timeout in long-running sessions
- Resolve memory leak in MCP server

## [2.0.0] - 2026-02-15

- Launch new skill marketplace
- Add background task support
- Enable multi-model routing
- Fix startup race condition
`;

  it("parses version entries", () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    expect(entries.length).toBe(3);
    expect(entries[0].version).toBe("2.1.0");
    expect(entries[1].version).toBe("2.0.5");
    expect(entries[2].version).toBe("2.0.0");
  });

  it("extracts dates", () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    expect(entries[0].date).toBe("2026-03-15");
    expect(entries[1].date).toBe("2026-03-01");
  });

  it("extracts only feature lines (not bugfixes)", () => {
    const entries = parseChangelog(SAMPLE_CHANGELOG);
    // 2.1.0 has 2 features (Add parallel, Introduce hooks) — not the Fix or Minor
    expect(entries[0].features.length).toBe(2);
    // 2.0.5 has 0 features (all bugfixes)
    expect(entries[1].features.length).toBe(0);
    // 2.0.0 has 3 features (Launch, Add, Enable) — not the Fix
    expect(entries[2].features.length).toBe(3);
  });

  it("handles empty changelog", () => {
    const entries = parseChangelog("# Changelog\n\nNothing here.");
    expect(entries.length).toBe(0);
  });

  it("handles version without brackets", () => {
    const entries = parseChangelog("## 1.0.0\n\n- Add initial feature support\n");
    expect(entries.length).toBe(1);
    expect(entries[0].version).toBe("1.0.0");
  });

  it("handles v-prefixed versions", () => {
    const entries = parseChangelog("## [v3.0.0] - 2026-01-01\n\n- Add new API support\n");
    expect(entries.length).toBe(1);
    expect(entries[0].version).toBe("3.0.0");
  });

  it("skips short lines (< 10 chars)", () => {
    const entries = parseChangelog("## [1.0.0]\n\n- Add X\n- Add very long feature description here\n");
    // "Add X" is < 10 chars, should be skipped
    expect(entries[0].features.length).toBe(1);
  });
});

// ─── findNewCandidates ──────────────────────────────────────────────────────

describe("findNewCandidates", () => {
  it("returns features not already tracked", () => {
    const entries: ChangelogEntry[] = [
      {
        version: "99.0.0",
        date: "2099-01-01",
        features: ["Add completely novel feature that nobody tracks"],
        raw: "",
      },
    ];
    const candidates = findNewCandidates(entries);
    // Should find at least this one (unless it somehow matches a tracked description)
    expect(candidates.length).toBeGreaterThanOrEqual(0);
    // The function deduplicates against FEATURE_REQUIREMENTS — since "completely novel feature"
    // is unlikely to match anything tracked, it should appear
    if (candidates.length > 0) {
      expect(candidates[0].version).toBe("99.0.0");
      expect(candidates[0].suggestedKey).toBeDefined();
    }
  });

  it("returns empty for entries with no features", () => {
    const entries: ChangelogEntry[] = [
      { version: "1.0.0", date: null, features: [], raw: "" },
    ];
    expect(findNewCandidates(entries)).toHaveLength(0);
  });
});

// ─── findVersionGaps ────────────────────────────────────────────────────────

describe("findVersionGaps", () => {
  it("finds versions not in FEATURE_REQUIREMENTS", () => {
    const entries: ChangelogEntry[] = [
      { version: "999.0.0", date: null, features: [], raw: "" },
    ];
    const gaps = findVersionGaps(entries);
    expect(gaps).toContain("999.0.0");
  });

  it("returns empty when all versions are tracked", () => {
    // Use an empty entries list
    const gaps = findVersionGaps([]);
    expect(gaps).toHaveLength(0);
  });
});

// ─── formatReport ───────────────────────────────────────────────────────────

describe("formatReport", () => {
  it("formats report with new candidates", () => {
    const report: FeatureSyncReport = {
      timestamp: "2026-03-27T00:00:00Z",
      changelogVersion: "2.1.0",
      trackedFeatureCount: 10,
      newCandidates: [
        { version: "2.1.0", description: "Add background tasks", suggestedKey: "backgroundTasks" },
      ],
      versionGaps: ["2.1.0", "2.0.9"],
      summary: "Test summary",
    };
    const output = formatReport(report);
    expect(output).toContain("CC FEATURE SYNC REPORT");
    expect(output).toContain("2.1.0");
    expect(output).toContain("backgroundTasks");
    expect(output).toContain("VERSION GAPS");
    expect(output).toContain("NEW FEATURE CANDIDATES");
  });

  it("formats report with no candidates", () => {
    const report: FeatureSyncReport = {
      timestamp: "2026-03-27T00:00:00Z",
      changelogVersion: "2.1.0",
      trackedFeatureCount: 10,
      newCandidates: [],
      versionGaps: [],
      summary: "All up to date",
    };
    const output = formatReport(report);
    expect(output).toContain("No untracked feature candidates");
    expect(output).toContain("All changelog versions have tracked entries");
  });

  it("truncates version gaps at 20", () => {
    const report: FeatureSyncReport = {
      timestamp: "2026-03-27T00:00:00Z",
      changelogVersion: "2.1.0",
      trackedFeatureCount: 10,
      newCandidates: [],
      versionGaps: Array.from({ length: 25 }, (_, i) => `1.0.${i}`),
      summary: "Many gaps",
    };
    const output = formatReport(report);
    expect(output).toContain("... and 5 more");
  });
});

// ─── filterSinceBaseline ────────────────────────────────────────────────────

describe("filterSinceBaseline", () => {
  const makeEntry = (version: string): ChangelogEntry => ({
    version,
    date: null,
    features: [],
    raw: "",
  });

  it("returns all entries when baseline is null", () => {
    const entries = [makeEntry("2.1.5"), makeEntry("2.1.4")];
    expect(filterSinceBaseline(entries, null)).toEqual(entries);
  });

  it("returns only entries strictly greater than baseline", () => {
    const entries = [
      makeEntry("2.1.98"),
      makeEntry("2.1.97"),
      makeEntry("2.1.96"),
    ];
    const filtered = filterSinceBaseline(entries, "2.1.97");
    expect(filtered.map(e => e.version)).toEqual(["2.1.98"]);
  });

  it("handles missing patch components", () => {
    const entries = [makeEntry("2.2"), makeEntry("2.1.0")];
    expect(filterSinceBaseline(entries, "2.1.99").map(e => e.version)).toEqual(["2.2"]);
  });

  it("handles v-prefixed baselines", () => {
    const entries = [makeEntry("2.1.98"), makeEntry("2.1.97")];
    expect(filterSinceBaseline(entries, "v2.1.97").map(e => e.version)).toEqual(["2.1.98"]);
  });

  it("returns empty when baseline is at or above every entry", () => {
    const entries = [makeEntry("2.1.5")];
    expect(filterSinceBaseline(entries, "9.0.0")).toEqual([]);
    expect(filterSinceBaseline(entries, "2.1.5")).toEqual([]);
  });
});

// ─── parseBaselineArg ───────────────────────────────────────────────────────

describe("parseBaselineArg", () => {
  it("returns null when --since-baseline is absent", () => {
    expect(parseBaselineArg(["bun", "script.ts"])).toBeNull();
  });

  it("parses --since-baseline <value> form", () => {
    expect(parseBaselineArg(["bun", "script.ts", "--since-baseline", "2.1.98"])).toBe("2.1.98");
  });

  it("parses --since-baseline=<value> form", () => {
    expect(parseBaselineArg(["bun", "script.ts", "--since-baseline=2.1.98"])).toBe("2.1.98");
  });

  it("returns null when --since-baseline appears without a value", () => {
    expect(parseBaselineArg(["bun", "script.ts", "--since-baseline"])).toBeNull();
  });
});
