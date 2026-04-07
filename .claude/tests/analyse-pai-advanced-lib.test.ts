/**
 * Tests for analyse-pai-advanced-lib.ts — Phase 0 feature analyzers.
 *
 * Tests 4 new analyzers that validate quality regression defense,
 * working memory, checkpoint recovery, quality gates, and keyword routing.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  analyzeWorkingMemory,
  analyzeCheckpointRecovery,
  analyzeQualityGates,
  analyzeKeywordRouting,
  type AnalysisResult,
} from "../skills/cc-upgrade-pai/scripts/analyse-pai-advanced-lib";

const TEST_PAI = join(tmpdir(), `analyse-pai-adv-${process.pid}`);

function createFile(relativePath: string, content = "// stub"): void {
  const full = join(TEST_PAI, relativePath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

beforeAll(() => {
  // Build a minimal PAI directory structure
  createFile(".claude/hooks/lib/working-memory.ts", "export function formatMemoryForInjection() {} export function appendLearning() {} export function appendDecision() {} export function appendIssue() {} export function appendProblem() {}");
  createFile(".claude/hooks/stop-hook.ts", "import { formatMemoryForInjection } from './lib/working-memory';");
  createFile(".claude/hooks/lib/compact-checkpoint.ts", "export function saveCheckpoint() {} export function loadCheckpoint() {}");
  createFile(".claude/hooks/pre-compact.ts", "// PreCompact hook");
  createFile(".claude/hooks/session-start.ts", "import { loadCheckpoint } from './lib/compact-checkpoint';");
  createFile(".claude/hooks/keyword-router.ts", "function sanitizePrompt(p) { return p.replace(/```[\\s\\S]*?```/g, ' '); } function isInformational() {}");
  createFile(".claude/hooks/lib/keyword-routes.json", JSON.stringify({ drive: { patterns: ["\\bdrive:\\s"] } }));
  createFile(".claude/agents/critic.md", "---\nname: critic\n---");
  createFile(".claude/agents/verifier.md", "---\nname: verifier\n---");
  createFile(".claude/agents/reviewer.md", "---\nname: reviewer\n---");
  createFile(".claude/skills/drive/SKILL.md", "Spawn critic agent for pre-implementation review. Spawn verifier agent for acceptance.");
  createFile(".claude/context/delegation-guide.md", "critic — plan review\nverifier — acceptance\nreviewer — code review");
  createFile(".claude/state/sessions/test-session/memory/learnings.md", "# Learnings");
  // Settings with PreCompact registered
  createFile(".claude/settings.json", JSON.stringify({ hooks: { PreCompact: [{ hooks: [{ command: "pre-compact.ts" }] }] } }));
});

afterAll(() => {
  rmSync(TEST_PAI, { recursive: true, force: true });
});

describe("analyzeWorkingMemory", () => {
  it("should score > 0 when working-memory.ts exists with exports", () => {
    const result = analyzeWorkingMemory(TEST_PAI);
    expect(result.score).toBeGreaterThan(0);
    expect(result.maxScore).toBe(12);
  });

  it("should return 0 for empty directory", () => {
    const empty = join(tmpdir(), `empty-${process.pid}`);
    mkdirSync(empty, { recursive: true });
    const result = analyzeWorkingMemory(empty);
    expect(result.score).toBe(0);
    rmSync(empty, { recursive: true, force: true });
  });
});

function expectScoresAboveZero(name: string, fn: (path: string) => AnalysisResult, maxScore: number) {
  describe(name, () => {
    it(`should score > 0 with maxScore ${maxScore} when infrastructure exists`, () => {
      const result = fn(TEST_PAI);
      expect(result.score).toBeGreaterThan(0);
      expect(result.maxScore).toBe(maxScore);
    });
  });
}

expectScoresAboveZero("analyzeCheckpointRecovery", analyzeCheckpointRecovery, 12);
expectScoresAboveZero("analyzeQualityGates", analyzeQualityGates, 15);
expectScoresAboveZero("analyzeKeywordRouting", analyzeKeywordRouting, 12);
