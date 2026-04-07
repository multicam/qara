/**
 * Tests for miner-sequence-lib.ts — skill auto-learning from tool sequences.
 *
 * Tests sequence extraction, keyword candidate detection, and skill scoring.
 */

import { describe, it, expect } from "bun:test";
import {
  extractToolSequences,
  extractKeywordCandidates,
  scoreSequenceAsSkill,
  type ToolSequence,
} from "../skills/introspect/tools/miner-sequence-lib";

function entries(tools: string[], session = "s1", day = "2026-04-07") {
  return tools.map((tool, i) => ({
    timestamp: `${day}T10:${String(i).padStart(2, "0")}:00Z`,
    tool,
    error: false,
    session_id: session,
    input_summary: `file: /src/${tool.toLowerCase()}-${i}.ts`,
  }));
}

describe("extractToolSequences", () => {
  it("should detect a repeated 3-tool sequence across sessions", () => {
    const e = [
      ...entries(["Grep", "Read", "Edit", "Read", "Grep", "Read", "Edit"], "s1", "2026-04-07"),
      ...entries(["Grep", "Read", "Edit", "Write"], "s2", "2026-04-08"),
      ...entries(["Grep", "Read", "Edit", "Bash"], "s3", "2026-04-09"),
    ];
    const seqs = extractToolSequences(e);
    const gre = seqs.find(s => s.tools.join(",") === "Grep,Read,Edit");
    expect(gre).toBeDefined();
    expect(gre!.count).toBeGreaterThanOrEqual(3);
    expect(gre!.session_ids.length).toBeGreaterThanOrEqual(2);
  });

  it("should not return sequences appearing in only 1 session", () => {
    const e = entries(["Read", "Edit", "Read", "Edit", "Read", "Edit"], "s1");
    const seqs = extractToolSequences(e);
    // All from same session — should not qualify (need 2+ sessions)
    const re = seqs.find(s => s.tools.join(",") === "Read,Edit");
    expect(re).toBeUndefined();
  });

  it("should return empty for empty input", () => {
    expect(extractToolSequences([])).toEqual([]);
  });

  it("should respect minLen parameter", () => {
    const e = [
      ...entries(["Grep", "Read", "Edit", "Write"], "s1", "2026-04-07"),
      ...entries(["Grep", "Read", "Edit", "Write"], "s2", "2026-04-08"),
      ...entries(["Grep", "Read", "Edit", "Write"], "s3", "2026-04-09"),
    ];
    const seqs4 = extractToolSequences(e, 4);
    const greW = seqs4.find(s => s.tools.join(",") === "Grep,Read,Edit,Write");
    expect(greW).toBeDefined();
  });
});

describe("extractKeywordCandidates", () => {
  it("should detect recurring topic hints not matching existing routes", () => {
    const checkpoints = [
      { topic_hint: "database migration", session_id: "s1", day: "2026-04-07" },
      { topic_hint: "database migration", session_id: "s2", day: "2026-04-08" },
      { topic_hint: "database migration", session_id: "s3", day: "2026-04-09" },
    ];
    const existingRoutes = ["drive", "cruise", "turbo", "stop-mode"];
    const candidates = extractKeywordCandidates(checkpoints, existingRoutes);
    const db = candidates.find(c => c.keyword.includes("database"));
    expect(db).toBeDefined();
    expect(db!.occurrences).toBe(3);
    expect(db!.matched_existing_route).toBe(false);
  });

  it("should exclude topics matching existing routes", () => {
    const checkpoints = [
      { topic_hint: "drive mode setup", session_id: "s1", day: "2026-04-07" },
      { topic_hint: "drive mode setup", session_id: "s2", day: "2026-04-08" },
      { topic_hint: "drive mode setup", session_id: "s3", day: "2026-04-09" },
    ];
    const existingRoutes = ["drive", "cruise", "turbo"];
    const candidates = extractKeywordCandidates(checkpoints, existingRoutes);
    expect(candidates.every(c => !c.keyword.includes("drive"))).toBe(true);
  });

  it("should return empty for empty input", () => {
    expect(extractKeywordCandidates([], [])).toEqual([]);
  });
});

describe("scoreSequenceAsSkill", () => {
  it("should score high for multi-day, multi-session, action-including sequence", () => {
    const seq: ToolSequence = {
      tools: ["Grep", "Read", "Edit"],
      count: 10,
      session_ids: ["s1", "s2", "s3", "s4"],
      unique_days: 5,
    };
    const score = scoreSequenceAsSkill(seq);
    // 5*2 + 10*0.5 + 3 (has Edit) = 18
    expect(score).toBe(18);
    expect(score).toBeGreaterThanOrEqual(8); // passes threshold
  });

  it("should score low for read-only sequence", () => {
    const seq: ToolSequence = {
      tools: ["Grep", "Read", "Glob"],
      count: 3,
      session_ids: ["s1", "s2"],
      unique_days: 2,
    };
    const score = scoreSequenceAsSkill(seq);
    // 2*2 + 3*0.5 + 0 (no action tool) = 5.5
    expect(score).toBe(5.5);
    expect(score).toBeLessThan(8); // below threshold
  });

  it("should give bonus for Write/Bash action tools", () => {
    const withWrite: ToolSequence = { tools: ["Read", "Write"], count: 3, session_ids: ["s1", "s2"], unique_days: 2 };
    const withBash: ToolSequence = { tools: ["Read", "Bash"], count: 3, session_ids: ["s1", "s2"], unique_days: 2 };
    expect(scoreSequenceAsSkill(withWrite)).toBe(scoreSequenceAsSkill(withBash));
    // Both should include the action bonus
    expect(scoreSequenceAsSkill(withWrite)).toBeGreaterThan(
      scoreSequenceAsSkill({ tools: ["Read", "Grep"], count: 3, session_ids: ["s1", "s2"], unique_days: 2 })
    );
  });
});
