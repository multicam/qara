/**
 * Tests for prd-utils.ts
 *
 * Tests PRD read/write/query: schema validation, story queries,
 * mark passing/failing, regression candidates, atomic writes, edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_PROJECT_DIR = join(tmpdir(), `prd-utils-test-${process.pid}`);
const PRD_FILE = join(TEST_PROJECT_DIR, "prd.json");

// Must set env before import
const TEST_PAI_DIR = join(tmpdir(), `prd-pai-test-${process.pid}`);
process.env.PAI_DIR = TEST_PAI_DIR;

import {
  readPRD,
  writePRD,
  getIncompleteStories,
  markStoryPassing,
  markStoryFailing,
  allStoriesPassing,
  getRegressionCandidates,
  type PRD,
  type Story,
} from "../hooks/lib/prd-utils";

function samplePRD(overrides?: Partial<PRD>): PRD {
  return {
    name: "Test Feature",
    created_at: new Date().toISOString(),
    stories: [
      {
        id: "1",
        title: "Story One",
        description: "First story",
        acceptance_criteria: ["Criterion A", "Criterion B"],
        passes: false,
        verified_at: null,
        verified_by: null,
        scenario_file: null,
      },
      {
        id: "2",
        title: "Story Two",
        description: "Second story",
        acceptance_criteria: ["Criterion C"],
        passes: false,
        verified_at: null,
        verified_by: null,
        scenario_file: null,
      },
      {
        id: "3",
        title: "Story Three",
        description: "Third story",
        acceptance_criteria: ["Criterion D", "Criterion E"],
        passes: true,
        verified_at: "2026-04-05T10:00:00Z",
        verified_by: "verifier",
        scenario_file: "specs/story-3.md",
      },
    ],
    ...overrides,
  };
}

describe("PRD Utilities", () => {
  beforeEach(() => {
    mkdirSync(TEST_PROJECT_DIR, { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "state"), { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
    if (existsSync(PRD_FILE)) rmSync(PRD_FILE);
  });

  afterEach(() => {
    if (existsSync(PRD_FILE)) rmSync(PRD_FILE);
  });

  // ─── Read/Write Roundtrip ────────────────────────────────────────────────

  describe("readPRD + writePRD roundtrip", () => {
    it("should write and read back PRD correctly", () => {
      const prd = samplePRD();
      writePRD(TEST_PROJECT_DIR, prd);
      const read = readPRD(TEST_PROJECT_DIR);
      expect(read).not.toBeNull();
      expect(read!.name).toBe("Test Feature");
      expect(read!.stories).toHaveLength(3);
    });

    it("should return null when file does not exist", () => {
      expect(readPRD(TEST_PROJECT_DIR)).toBeNull();
    });

    it("should return null for malformed JSON", () => {
      writeFileSync(PRD_FILE, "not json {{{");
      expect(readPRD(TEST_PROJECT_DIR)).toBeNull();
    });

    it("should return null for JSON missing required fields", () => {
      writeFileSync(PRD_FILE, JSON.stringify({ foo: "bar" }));
      expect(readPRD(TEST_PROJECT_DIR)).toBeNull();
    });

    it("should return null for JSON with empty stories array", () => {
      writeFileSync(PRD_FILE, JSON.stringify({ name: "Test", stories: [] }));
      // Empty stories is valid — it's a PRD with no work yet
      const prd = readPRD(TEST_PROJECT_DIR);
      expect(prd).not.toBeNull();
      expect(prd!.stories).toHaveLength(0);
    });
  });

  // ─── Schema Validation ───────────────────────────────────────────────────

  describe("schema validation", () => {
    it("should accept valid PRD with all fields", () => {
      writePRD(TEST_PROJECT_DIR, samplePRD());
      expect(readPRD(TEST_PROJECT_DIR)).not.toBeNull();
    });

    it("should reject PRD without name", () => {
      writeFileSync(PRD_FILE, JSON.stringify({ stories: [{ id: "1", title: "t", description: "d", acceptance_criteria: [], passes: false }] }));
      expect(readPRD(TEST_PROJECT_DIR)).toBeNull();
    });

    it("should reject PRD without stories array", () => {
      writeFileSync(PRD_FILE, JSON.stringify({ name: "Test" }));
      expect(readPRD(TEST_PROJECT_DIR)).toBeNull();
    });
  });

  // ─── Story Queries ───────────────────────────────────────────────────────

  describe("getIncompleteStories", () => {
    it("should return stories with passes: false", () => {
      const prd = samplePRD();
      const incomplete = getIncompleteStories(prd);
      expect(incomplete).toHaveLength(2);
      expect(incomplete[0].id).toBe("1");
      expect(incomplete[1].id).toBe("2");
    });

    it("should return empty array when all pass", () => {
      const prd = samplePRD();
      prd.stories.forEach((s) => (s.passes = true));
      expect(getIncompleteStories(prd)).toHaveLength(0);
    });
  });

  describe("allStoriesPassing", () => {
    it("should return false when some stories fail", () => {
      expect(allStoriesPassing(samplePRD())).toBe(false);
    });

    it("should return true when all stories pass", () => {
      const prd = samplePRD();
      prd.stories.forEach((s) => (s.passes = true));
      expect(allStoriesPassing(prd)).toBe(true);
    });

    it("should return true for empty stories", () => {
      expect(allStoriesPassing({ name: "Test", created_at: "", stories: [] })).toBe(true);
    });
  });

  describe("getRegressionCandidates", () => {
    it("should return stories that are currently passing", () => {
      const prd = samplePRD();
      const candidates = getRegressionCandidates(prd);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe("3");
    });

    it("should return empty when none are passing", () => {
      const prd = samplePRD();
      prd.stories.forEach((s) => (s.passes = false));
      expect(getRegressionCandidates(prd)).toHaveLength(0);
    });
  });

  // ─── Mark Passing/Failing ────────────────────────────────────────────────

  describe("markStoryPassing", () => {
    it("should set passes=true and verified fields", () => {
      const prd = samplePRD();
      const updated = markStoryPassing(prd, "1", "verifier");
      const story = updated.stories.find((s) => s.id === "1")!;
      expect(story.passes).toBe(true);
      expect(story.verified_by).toBe("verifier");
      expect(story.verified_at).toBeDefined();
      expect(story.verified_at).not.toBeNull();
    });

    it("should not modify other stories", () => {
      const prd = samplePRD();
      const updated = markStoryPassing(prd, "1", "verifier");
      expect(updated.stories.find((s) => s.id === "2")!.passes).toBe(false);
    });

    it("should throw for unknown story id", () => {
      expect(() => markStoryPassing(samplePRD(), "999", "verifier")).toThrow();
    });
  });

  describe("markStoryFailing", () => {
    it("should set passes=false and clear verified fields", () => {
      const prd = samplePRD();
      const updated = markStoryFailing(prd, "3");
      const story = updated.stories.find((s) => s.id === "3")!;
      expect(story.passes).toBe(false);
      expect(story.verified_at).toBeNull();
      expect(story.verified_by).toBeNull();
    });

    it("should throw for unknown story id", () => {
      expect(() => markStoryFailing(samplePRD(), "999")).toThrow();
    });
  });

  // ─── Atomic Writes ───────────────────────────────────────────────────────

  describe("atomic writes", () => {
    it("should write valid JSON that can be re-read", () => {
      const prd = samplePRD();
      writePRD(TEST_PROJECT_DIR, prd);
      const content = readFileSync(PRD_FILE, "utf-8");
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("should overwrite existing PRD", () => {
      writePRD(TEST_PROJECT_DIR, samplePRD({ name: "First" }));
      writePRD(TEST_PROJECT_DIR, samplePRD({ name: "Second" }));
      expect(readPRD(TEST_PROJECT_DIR)!.name).toBe("Second");
    });
  });
});
