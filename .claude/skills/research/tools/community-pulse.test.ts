/**
 * community-pulse.ts tests
 *
 * Tests query generators (pure logic), date arithmetic, HN URL construction,
 * and CLI output structure. fetchHN tested against real HN Algolia API
 * (public, no auth, fast).
 */

import { describe, it, expect } from "bun:test";

// Suppress CLI execution
process.env.COMMUNITY_PULSE_NO_CLI = "1";

import {
  redditQueries,
  hnSearchUrl,
  hnItemUrl,
  xQueries,
  youtubeQueries,
  webQueries,
  buildConfig,
  fetchHN,
} from "./community-pulse";

// ─── Query Generators ───────────────────────────────────────────────────────

describe("redditQueries", () => {
  it("generates 2 Reddit search queries", () => {
    const queries = redditQueries("Claude Code", "2026-03-06");
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain("site:reddit.com");
    expect(queries[0]).toContain("Claude Code");
    expect(queries[0]).toContain("after:2026-03-06");
  });

  it("includes best/recommended variant", () => {
    const queries = redditQueries("TDD", "2026-01-01");
    expect(queries[1]).toContain("best|recommended|experience");
  });
});

describe("hnSearchUrl", () => {
  it("constructs valid HN Algolia URL", () => {
    const url = hnSearchUrl("TDD", 1772826839);
    expect(url).toContain("hn.algolia.com/api/v1/search");
    expect(url).toContain("query=TDD");
    expect(url).toContain("numericFilters=created_at_i>1772826839");
    expect(url).toContain("hitsPerPage=10");
  });

  it("URL-encodes the topic", () => {
    const url = hnSearchUrl("Claude Code testing", 0);
    expect(url).toContain("query=Claude%20Code%20testing");
  });
});

describe("hnItemUrl", () => {
  it("constructs item detail URL", () => {
    const url = hnItemUrl("12345");
    expect(url).toBe("https://hn.algolia.com/api/v1/items/12345");
  });
});

describe("xQueries", () => {
  it("generates 2 X/Twitter search queries", () => {
    const queries = xQueries("AI agents", "2026-03-01");
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain("site:x.com");
    expect(queries[0]).toContain("site:twitter.com");
    expect(queries[1]).toContain("twitter thread viral");
  });
});

describe("youtubeQueries", () => {
  it("generates YouTube search query", () => {
    const queries = youtubeQueries("TDD", "2026-03-01");
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain("site:youtube.com");
    expect(queries[0]).toContain("TDD");
  });
});

describe("webQueries", () => {
  it("generates 2 general web queries", () => {
    const queries = webQueries("AI testing", "2026");
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain("community discussion");
    expect(queries[0]).toContain("2026");
    expect(queries[1]).toContain("people are saying");
  });
});

// ─── buildConfig ────────────────────────────────────────────────────────────

describe("buildConfig", () => {
  it("computes ISO date from days lookback", () => {
    const config = buildConfig("test", 20, ["hn"]);
    const expected = new Date(Date.now() - 20 * 86400 * 1000).toISOString().split("T")[0];
    expect(config.isoDate).toBe(expected);
  });

  it("computes unix timestamp from days lookback", () => {
    const config = buildConfig("test", 10, ["hn"]);
    const expectedTs = Math.floor((Date.now() - 10 * 86400 * 1000) / 1000);
    expect(Math.abs(config.unixTimestamp - expectedTs)).toBeLessThan(2);
  });

  it("preserves topic and platforms", () => {
    const config = buildConfig("Claude Code", 30, ["reddit", "hn"]);
    expect(config.topic).toBe("Claude Code");
    expect(config.platforms).toEqual(["reddit", "hn"]);
    expect(config.days).toBe(30);
  });
});

// ─── HN Fetch (real API — fast, public, no auth) ───────────────────────────

describe("fetchHN", () => {
  it("returns results for a known topic", async () => {
    // Use a broad topic that HN always has results for
    const result = await fetchHN("javascript", 0);
    expect(result.platform).toBe("hn");
    expect(result.queries).toHaveLength(1);
    expect(result.queries[0]).toContain("hn.algolia.com");
    expect(result.data.length).toBeGreaterThan(0);
    // Each story should have expected fields
    const story = result.data[0] as Record<string, unknown>;
    expect(story.objectID).toBeDefined();
    expect(story.title).toBeDefined();
    expect(story.points).toBeDefined();
    expect(story.discussionUrl).toBeDefined();
  });

  it("returns empty data for impossible query", async () => {
    const result = await fetchHN("zzzzz_nonexistent_topic_99999", Date.now() / 1000);
    expect(result.platform).toBe("hn");
    expect(result.data).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("sorts results by points descending", async () => {
    const result = await fetchHN("react", 0);
    if (result.data.length >= 2) {
      const points = result.data.map((d: any) => d.points as number);
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeLessThanOrEqual(points[i - 1]);
      }
    }
  });
});

// ─── CLI Output Structure (subprocess) ──────────────────────────────────────

describe("CLI", () => {
  it("outputs valid JSON with expected structure", async () => {
    const { spawn } = await import("child_process");
    const { join } = await import("path");
    const CLI = join(import.meta.dir, "community-pulse.ts");

    const result = await new Promise<{ stdout: string; exitCode: number }>((resolve) => {
      const env = { ...process.env };
      delete env.COMMUNITY_PULSE_NO_CLI;
      const proc = spawn("bun", ["run", CLI, "--topic", "test", "--days", "1", "--platforms", "hn"], { env });
      let stdout = "";
      proc.stdout.on("data", (d) => { stdout += d.toString(); });
      const timer = setTimeout(() => { proc.kill("SIGTERM"); resolve({ stdout, exitCode: 124 }); }, 30000);
      proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout, exitCode: code ?? 1 }); });
    });

    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.config).toBeDefined();
    expect(data.config.topic).toBe("test");
    expect(data.config.days).toBe(1);
    expect(data.config.platforms).toEqual(["hn"]);
    expect(data.results.hn).toBeDefined();
    expect(data.results.hn.platform).toBe("hn");
  });
});
