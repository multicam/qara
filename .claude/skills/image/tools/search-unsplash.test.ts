/**
 * search-unsplash.ts tests
 *
 * Tests CLI arg parsing, validation, date formatting. No Unsplash API calls.
 */

import { describe, it, expect } from "bun:test";

process.env.SEARCH_UNSPLASH_NO_CLI = "1";

import {
  parseArgs,
  getDatePrefix,
  CLIError,
} from "./search-unsplash";

function argv(...args: string[]): string[] {
  return ["bun", "search-unsplash.ts", ...args];
}

// ─── parseArgs ──────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("parses minimal valid args", () => {
    const result = parseArgs(argv("--query", "mountain landscape"));
    expect(result.query).toBe("mountain landscape");
    expect(result.count).toBe(5); // default
    expect(result.download).toBe(false);
  });

  it("parses orientation", () => {
    const result = parseArgs(argv("--query", "test", "--orientation", "landscape"));
    expect(result.orientation).toBe("landscape");
  });

  it("parses count", () => {
    const result = parseArgs(argv("--query", "test", "--count", "10"));
    expect(result.count).toBe(10);
  });

  it("parses download with slug", () => {
    const result = parseArgs(argv("--query", "test", "--download", "1", "--slug", "hero"));
    expect(result.download).toBe(true);
    expect(result.downloadIndex).toBe(1);
    expect(result.slug).toBe("hero");
  });

  it("parses project path", () => {
    const result = parseArgs(argv("--query", "test", "--project", "/tmp/output"));
    expect(result.project).toContain("output");
  });

  describe("validation errors", () => {
    it("throws on missing query", () => {
      expect(() => parseArgs(argv("--count", "5"))).toThrow("--query");
    });

    it("throws on invalid orientation", () => {
      expect(() => parseArgs(argv("--query", "test", "--orientation", "diagonal"))).toThrow("Invalid orientation");
    });

    it("throws on count out of range", () => {
      expect(() => parseArgs(argv("--query", "test", "--count", "99"))).toThrow("Must be 1-30");
    });

    it("throws on download without slug", () => {
      expect(() => parseArgs(argv("--query", "test", "--download", "1"))).toThrow("--slug is required");
    });

    it("throws on invalid download index", () => {
      expect(() => parseArgs(argv("--query", "test", "--download", "abc", "--slug", "s"))).toThrow("Invalid download index");
    });

    it("throws on unknown flag", () => {
      expect(() => parseArgs(argv("--query", "test", "--nope", "val"))).toThrow("Unknown flag");
    });
  });
});

// ─── getDatePrefix ──────────────────────────────────────────────────────────

describe("getDatePrefix", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(getDatePrefix()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
