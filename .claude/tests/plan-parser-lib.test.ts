/**
 * Tests for plan-parser-lib — pure-function library for cruise plan markdown.
 *
 * Covers: phase extraction (empty/single/multi), current-phase logic, tick
 * semantics (line-number based, not text match — handles duplicate bullets),
 * cache I/O roundtrip with version gating, ambiguity cases.
 *
 * Pattern follows mode-state.test.ts (direct imports, no subprocess).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  parsePlanPhases,
  findCurrentPhase,
  tickAutomatedCheckboxes,
  tickManualCheckboxes,
  readPlanCache,
  writePlanCache,
  type Phase,
  type PlanCache,
  type ChecklistItem,
} from "../hooks/lib/plan-parser-lib";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const SINGLE_PHASE = `# Plan

Some intro text.

## Phase 1: Install

### Overview
Install the thing.

#### Automated Verification:
- [ ] a runs
- [ ] b runs

#### Manual Verification:
- [ ] user eyeballs it
`;

const MULTI_PHASE = `# Plan

## Phase 1: Alpha

#### Automated Verification:
- [x] a1 done
- [ ] a2 pending

## Phase 2: Beta

#### Automated Verification:
- [ ] b1
- [ ] b2
- [ ] b3

#### Manual Verification:
- [ ] user verifies beta

## Phase 3: Gamma

### Overview
Gamma's overview.

#### Automated Verification:
- [ ] g1
`;

const NO_PHASES = `# Plan

### Step 1: Install

- [ ] a
- [ ] b
`;

const PHASE_NO_AUTOMATED = `# Plan

## Phase 1: X

### Overview
No automated block.

---
`;

const DUPLICATE_BULLETS = `# Plan

## Phase 1: Duplicates

#### Automated Verification:
- [ ] identical bullet
- [ ] identical bullet
- [ ] identical bullet
`;

const CRLF_PLAN = SINGLE_PHASE.replace(/\n/g, "\r\n");

// ─── parsePlanPhases ────────────────────────────────────────────────────────

describe("parsePlanPhases", () => {
  it("returns [] for empty input", () => {
    expect(parsePlanPhases("")).toEqual([]);
  });

  it("returns [] for a plan with no `## Phase N:` headings", () => {
    expect(parsePlanPhases(NO_PHASES)).toEqual([]);
  });

  it("extracts a single phase with automated + manual items", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    expect(phases).toHaveLength(1);
    expect(phases[0].n).toBe(1);
    expect(phases[0].title).toBe("Install");
    expect(phases[0].automated).toHaveLength(2);
    expect(phases[0].automated[0]).toMatchObject({ text: "a runs", done: false });
    expect(phases[0].manual).toHaveLength(1);
    expect(phases[0].manual[0].text).toBe("user eyeballs it");
  });

  it("extracts multiple phases, preserving done state", () => {
    const phases = parsePlanPhases(MULTI_PHASE);
    expect(phases).toHaveLength(3);
    expect(phases[0].automated[0].done).toBe(true);
    expect(phases[0].automated[1].done).toBe(false);
    expect(phases[1].automated).toHaveLength(3);
    expect(phases[2].automated).toHaveLength(1);
  });

  it("returns automated=[] for a phase without `#### Automated Verification:`", () => {
    const phases = parsePlanPhases(PHASE_NO_AUTOMATED);
    expect(phases).toHaveLength(1);
    expect(phases[0].automated).toEqual([]);
    expect(phases[0].manual).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const phases = parsePlanPhases(CRLF_PLAN);
    expect(phases).toHaveLength(1);
    expect(phases[0].automated).toHaveLength(2);
  });

  it("does NOT terminate a phase on `### something` subsection headers", () => {
    const phases = parsePlanPhases(MULTI_PHASE);
    // Phase 3 has `### Overview` + `#### Automated Verification:` — the `###` must not terminate.
    expect(phases[2].automated).toHaveLength(1);
    expect(phases[2].automated[0].text).toBe("g1");
  });

  it("records absolute line numbers on automated items for index-based tick", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const lines = SINGLE_PHASE.split("\n");
    const a0 = phases[0].automated[0];
    expect(lines[a0.line]).toBe("- [ ] a runs");
  });
});

// ─── findCurrentPhase ──────────────────────────────────────────────────────

describe("findCurrentPhase", () => {
  it("returns null when every phase is fully ticked", () => {
    const phases = parsePlanPhases(MULTI_PHASE).map((p) => ({
      ...p,
      automated: p.automated.map((a) => ({ ...a, done: true })),
    }));
    expect(findCurrentPhase(phases)).toBeNull();
  });

  it("returns the lowest-N phase with an unticked automated bullet", () => {
    const phases = parsePlanPhases(MULTI_PHASE);
    const current = findCurrentPhase(phases);
    expect(current?.n).toBe(1); // Phase 1 has a2 unticked
  });

  it("skips fully-ticked phases and returns the next one", () => {
    const phases = parsePlanPhases(MULTI_PHASE).map((p) =>
      p.n === 1 ? { ...p, automated: p.automated.map((a) => ({ ...a, done: true })) } : p
    );
    expect(findCurrentPhase(phases)?.n).toBe(2);
  });

  it("returns null for an empty phase array", () => {
    expect(findCurrentPhase([])).toBeNull();
  });
});

// ─── tickAutomatedCheckboxes / tickManualCheckboxes ────────────────────────

describe("tickAutomatedCheckboxes", () => {
  it("ticks a single unticked automated bullet by line number", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const a0 = phases[0].automated[0];
    const out = tickAutomatedCheckboxes(SINGLE_PHASE, 1, [a0.line]);
    const outLines = out.split("\n");
    expect(outLines[a0.line]).toBe("- [x] a runs");
    // untouched bullet stays unticked
    expect(outLines[phases[0].automated[1].line]).toBe("- [ ] b runs");
  });

  it("batches multiple ticks in one call", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const lines = phases[0].automated.map((a) => a.line);
    const out = tickAutomatedCheckboxes(SINGLE_PHASE, 1, lines);
    const outLines = out.split("\n");
    expect(outLines[lines[0]]).toBe("- [x] a runs");
    expect(outLines[lines[1]]).toBe("- [x] b runs");
  });

  it("handles duplicate bullet text correctly via line numbers", () => {
    const phases = parsePlanPhases(DUPLICATE_BULLETS);
    const [b0, b1, b2] = phases[0].automated;
    // tick only the middle one
    const out = tickAutomatedCheckboxes(DUPLICATE_BULLETS, 1, [b1.line]);
    const outLines = out.split("\n");
    expect(outLines[b0.line]).toBe("- [ ] identical bullet");
    expect(outLines[b1.line]).toBe("- [x] identical bullet");
    expect(outLines[b2.line]).toBe("- [ ] identical bullet");
  });

  it("is a no-op when the target phase doesn't exist", () => {
    const out = tickAutomatedCheckboxes(SINGLE_PHASE, 99, [6]);
    expect(out).toBe(SINGLE_PHASE);
  });

  it("ignores line numbers outside the target phase's automated block", () => {
    const phases = parsePlanPhases(MULTI_PHASE);
    // Try to tick Phase 2's bullet using Phase 1 as target — should be no-op
    const phase2FirstLine = phases[1].automated[0].line;
    const out = tickAutomatedCheckboxes(MULTI_PHASE, 1, [phase2FirstLine]);
    expect(out).toBe(MULTI_PHASE);
  });

  it("leaves already-ticked bullets alone (idempotent)", () => {
    // Tick a1 in phase 1 of MULTI_PHASE — it's already [x]
    const phases = parsePlanPhases(MULTI_PHASE);
    const a0Line = phases[0].automated[0].line;
    const out = tickAutomatedCheckboxes(MULTI_PHASE, 1, [a0Line]);
    expect(out).toBe(MULTI_PHASE);
  });

  it("does not cross into the manual block", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const manualLine = phases[0].manual[0].line;
    const out = tickAutomatedCheckboxes(SINGLE_PHASE, 1, [manualLine]);
    expect(out).toBe(SINGLE_PHASE);
  });
});

describe("tickAutomatedCheckboxes — pre-parsed phases (double-parse avoidance)", () => {
  it("accepts a pre-parsed `phases` option and produces the same output", () => {
    const phases = parsePlanPhases(MULTI_PHASE);
    const lineNums = phases[1].automated.map((a) => a.line);
    const withOpt = tickAutomatedCheckboxes(MULTI_PHASE, 2, lineNums, { phases });
    const withoutOpt = tickAutomatedCheckboxes(MULTI_PHASE, 2, lineNums);
    expect(withOpt).toBe(withoutOpt);
    const outLines = withOpt.split("\n");
    expect(outLines[lineNums[0]]).toBe("- [x] b1");
    expect(outLines[lineNums[1]]).toBe("- [x] b2");
  });

  it("trusts caller-supplied phases (skips internal reparse)", () => {
    // Caller hands us phases where phase 1's automated list is empty; even
    // though the text has real bullets, the tick must respect the caller's
    // contract and produce a no-op.
    const realPhases = parsePlanPhases(SINGLE_PHASE);
    const fakePhases: Phase[] = [{
      ...realPhases[0],
      automated: [], // empty allowed-set for this phase
    }];
    const realLine = realPhases[0].automated[0].line;
    const out = tickAutomatedCheckboxes(SINGLE_PHASE, 1, [realLine], { phases: fakePhases });
    expect(out).toBe(SINGLE_PHASE);
  });

  it("ChecklistItem is the exported type for both automated and manual bullets", () => {
    // Type-level assertion via structural compatibility. Both automated[] and
    // manual[] must be assignable to ChecklistItem[].
    const phases = parsePlanPhases(SINGLE_PHASE);
    const automatedAsChecklist: ChecklistItem[] = phases[0].automated;
    const manualAsChecklist: ChecklistItem[] = phases[0].manual;
    expect(automatedAsChecklist[0]).toHaveProperty("text");
    expect(automatedAsChecklist[0]).toHaveProperty("done");
    expect(automatedAsChecklist[0]).toHaveProperty("line");
    expect(manualAsChecklist[0]).toHaveProperty("text");
  });
});

describe("tickManualCheckboxes", () => {
  it("ticks a manual bullet in the correct section", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const mLine = phases[0].manual[0].line;
    const out = tickManualCheckboxes(SINGLE_PHASE, 1, [mLine]);
    const outLines = out.split("\n");
    expect(outLines[mLine]).toBe("- [x] user eyeballs it");
  });

  it("does not cross into the automated block", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const aLine = phases[0].automated[0].line;
    const out = tickManualCheckboxes(SINGLE_PHASE, 1, [aLine]);
    expect(out).toBe(SINGLE_PHASE);
  });
});

// ─── readPlanCache / writePlanCache ────────────────────────────────────────

describe("plan cache I/O", () => {
  const TEST_DIR = join(tmpdir(), `plan-parser-lib-test-${process.pid}`);
  const CACHE = join(TEST_DIR, "plan-cache.json");

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("roundtrips a PlanCache through write then read", () => {
    const phases = parsePlanPhases(SINGLE_PHASE);
    const cache: PlanCache = {
      version: 1,
      plan_path: "/tmp/plans/foo.md",
      mtime_ms: 1_700_000_000_000,
      phases,
    };
    writePlanCache(CACHE, cache);
    expect(existsSync(CACHE)).toBe(true);
    const loaded = readPlanCache(CACHE);
    expect(loaded).not.toBeNull();
    expect(loaded!.plan_path).toBe("/tmp/plans/foo.md");
    expect(loaded!.mtime_ms).toBe(1_700_000_000_000);
    expect(loaded!.phases).toEqual(phases);
  });

  it("returns null for a missing cache file", () => {
    expect(readPlanCache(CACHE)).toBeNull();
  });

  it("returns null for a cache with a different schema version", () => {
    const stale = { version: 999, plan_path: "/x", mtime_ms: 1, phases: [] };
    writeFileSync(CACHE, JSON.stringify(stale), "utf-8");
    expect(readPlanCache(CACHE)).toBeNull();
  });

  it("returns null for a malformed cache file", () => {
    writeFileSync(CACHE, "not json", "utf-8");
    expect(readPlanCache(CACHE)).toBeNull();
  });

  it("returns null for a cache missing required fields", () => {
    writeFileSync(CACHE, JSON.stringify({ version: 1 }), "utf-8");
    expect(readPlanCache(CACHE)).toBeNull();
  });
});
