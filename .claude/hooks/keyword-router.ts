#!/usr/bin/env bun
/**
 * keyword-router.ts
 *
 * UserPromptSubmit hook: detects mode keywords in user prompts,
 * injects matching skill SKILL.md, and activates/deactivates modes.
 *
 * Pure regex — no LLM overhead. Sanitizes prompts to avoid false
 * positives from URLs, file paths, code blocks, and quoted strings.
 * Context-window check distinguishes actionable from informational.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { SKILLS_DIR, STATE_DIR, getSessionId } from "./lib/pai-paths";
import { writeModeState, clearModeState, readModeState } from "./lib/mode-state";
import type { ModeName } from "./lib/mode-state";
import { appendJsonl, truncate } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Route {
  patterns: string[];
  skill: string | null;
  activatesMode?: boolean;
  deactivatesMode?: boolean;
  modeDefaults?: { maxIterations?: number; maxTokensBudget?: number };
}

interface Routes {
  [key: string]: Route;
}

// ─── Load routes config ─────────────────────────────────────────────────────

function loadRoutes(): Routes {
  const routesPath = join(import.meta.dir, "lib", "keyword-routes.json");
  if (!existsSync(routesPath)) return {};
  return JSON.parse(readFileSync(routesPath, "utf-8"));
}

// ─── Sanitization ───────────────────────────────────────────────────────────

function sanitizePrompt(prompt: string): string {
  let s = prompt;
  // Strip code blocks (```...```)
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Strip inline code (`...`)
  s = s.replace(/`[^`]+`/g, " ");
  // Strip URLs
  s = s.replace(/https?:\/\/\S+/g, " ");
  // Strip file paths (sequences starting with / containing path chars)
  s = s.replace(/\/[\w./-]+/g, " ");
  // Strip double-quoted strings
  s = s.replace(/"[^"]*"/g, " ");
  // Strip single-quoted strings
  s = s.replace(/'[^']*'/g, " ");
  return s;
}

// ─── Context window check ───────────────────────────────────────────────────

const INFORMATIONAL_PATTERNS = [
  /\bwhat is\b/i,
  /\bexplain\b/i,
  /\bhow does\b/i,
  /\bhow do\b/i,
  /\bread about\b/i,
  /\btell me about\b/i,
  /\bdescribe\b/i,
  /\bwhat does\b/i,
];

function isInformational(prompt: string, matchIndex: number): boolean {
  // Extract 80 chars before the match
  const start = Math.max(0, matchIndex - 80);
  const context = prompt.substring(start, matchIndex + 80).toLowerCase();
  return INFORMATIONAL_PATTERNS.some((p) => p.test(context));
}

// ─── Auto-Mode Suggestion ──────────────────────────────────────────────

const TURBO_SIGNALS = /\bparallel\b|\bindependent\b|\b[3-9]\+?\s*tasks?\b|\bsimultaneous/i;
const CRUISE_SIGNALS = /\bstep by step\b|\bphased?\b|\bdiscover then\b|\bplan then implement/i;
const DRIVE_SIGNALS = /\bPRD\b|\bacceptance criteria\b|\buser stor(?:y|ies)\b|\bspec(?:ification)?s?\b/i;

function suggestMode(prompt: string): string | null {
  if (TURBO_SIGNALS.test(prompt)) return "turbo";
  if (DRIVE_SIGNALS.test(prompt)) return "drive";
  if (CRUISE_SIGNALS.test(prompt)) return "cruise";
  return null;
}

// ─── Delegation Nudge ──────────────────────────────────────────────────
// Counts distinct imperative verbs in the prompt. A prompt naming 3+ distinct
// action verbs is a strong signal for parallel-agent delegation, even if it
// doesn't trip a mode trigger.

// Note: "test" is deliberately excluded — it's ambiguous as verb vs noun
// ("update the test" is one task, not two). "run" catches "run the tests".
const IMPERATIVE_VERBS = /\b(fix|check|read|run|verify|review|analyze|search|look|find|update|add|remove|write|create|build|explain|audit|assess|improve|investigate|debug|refactor|implement|trace|extract|document|generate|deploy|install|configure|rename|delete|inspect|scan|validate|measure|compare)\b/gi;

export function countDistinctImperatives(prompt: string): number {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(IMPERATIVE_VERBS.source, "gi");
  while ((m = re.exec(prompt.toLowerCase())) !== null) {
    found.add(m[1]);
  }
  return found.size;
}

export function shouldNudgeDelegation(prompt: string): boolean {
  if (countDistinctImperatives(prompt) >= 3) return true;
  const listItems = (prompt.match(/^\s*(?:[-*]|\d+[.)])\s+\w/gm) || []).length;
  if (listItems >= 3) return true;
  if (
    /\b(three|four|five|[3-9])\s+(?:files?|topics?|areas?|items?|things?|tasks?|parts?|subtasks?)\b/i.test(
      prompt,
    )
  ) {
    return true;
  }
  const paths = (prompt.match(/\/[\w./-]+\.\w+/g) || []).length;
  if (paths >= 4) return true;
  return false;
}

const DELEGATION_NUDGE_TEXT =
  "Delegation opportunity: this prompt names 3+ distinct tasks. " +
  "Spawn parallel agents (codebase-analyzer, engineer, reviewer) in a single message " +
  "rather than solo execution. If the work is genuinely multi-phase, consider " +
  "`turbo:` (parallel dispatch), `cruise:` (phased), or `drive:` (PRD-driven). " +
  "Baseline delegation target is ~1.8% of tool calls.";

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    let parsed: { prompt?: string };
    try {
      parsed = JSON.parse(input);
    } catch {
      process.exit(0);
    }

    const prompt = parsed.prompt || "";
    if (!prompt) process.exit(0);

    const routes = loadRoutes();
    const sanitized = sanitizePrompt(prompt);

    // Find first matching route
    for (const [routeName, route] of Object.entries(routes)) {
      for (const patternStr of route.patterns) {
        const regex = new RegExp(patternStr, "i");
        const match = regex.exec(sanitized);
        if (!match) continue;

        // Context window: skip informational mentions
        if (isInformational(sanitized, match.index)) continue;

        // Handle deactivation
        if (route.deactivatesMode) {
          const priorState = readModeState();
          clearModeState();
          if (priorState) {
            appendJsonl(join(STATE_DIR, "mode-changes.jsonl"), {
              timestamp: getISOTimestamp(),
              event: "deactivated",
              mode: priorState.mode,
              reason: "cancelled",
              iterations: priorState.iteration,
              session_id: getSessionId(),
            });
          }
          process.exit(0);
        }

        // Resolve skill path once
        const skillPath = route.skill
          ? join(SKILLS_DIR, route.skill, "SKILL.md")
          : null;

        // Handle activation
        if (route.activatesMode && skillPath) {
          // Extract task context from original prompt using word-boundary regex
          // (not indexOf, which could match inside a URL/path that sanitization removed)
          const origRegex = new RegExp(`\\b${routeName}\\b`, "i");
          const origMatch = origRegex.exec(prompt);
          const afterKeyword = origMatch
            ? prompt.substring(origMatch.index + origMatch[0].length)
            : prompt;
          const taskContext = afterKeyword.replace(/^[\s:]+/, "").trim() || prompt.trim();

          // Detect a plan file path in the activation text (used by plan-aware cruise).
          // Heuristic: a .md path that contains "plans/" — matches both absolute and
          // relative forms (thoughts/shared/plans/foo.md, /home/jm/plans/bar.md).
          //
          // CONSTRAINT: the regex requires a literal `plans/` segment. Plans that
          // live elsewhere (e.g. `thoughts/shared/2026-04-11-foo.md` at the root)
          // will NOT be detected — cruise silently falls back to task-mode with
          // no error. Keep plans under a `plans/` directory OR update this regex.
          const planMatch = taskContext.match(/[\w./-]*plans\/[\w.-]+\.md/);
          const planPath = planMatch ? planMatch[0] : undefined;

          // prdPath is drive-only. Cruise/turbo do not use a PRD — setting it for
          // those modes was a pre-existing bug (prdPath was hardcoded regardless
          // of mode). Phase 1 of the plan-aware cruise migration fixes this.
          const prdPath = routeName === "drive"
            ? join(process.cwd(), "prd.json")
            : undefined;

          writeModeState({
            mode: routeName as ModeName,
            taskContext,
            acceptanceCriteria: "task complete",
            skillPath,
            prdPath,
            planPath,
            maxIterations: route.modeDefaults?.maxIterations ?? 50,
            maxTokensBudget: route.modeDefaults?.maxTokensBudget ?? 0,
          });

          appendJsonl(join(STATE_DIR, "mode-changes.jsonl"), {
            timestamp: getISOTimestamp(),
            event: "activated",
            mode: routeName,
            task_context: truncate(taskContext, 200),
            session_id: getSessionId(),
          });
        }

        // Inject skill content if available
        if (skillPath && existsSync(skillPath)) {
          const skillContent = readFileSync(skillPath, "utf-8");
          process.stdout.write(JSON.stringify({
            result: `<system-reminder>\n${skillContent}\n</system-reminder>`,
          }));
        }

        process.exit(0);
      }
    }

    // No keyword match — try auto-mode suggestion for long actionable prompts
    if (sanitized.length > 200 && !readModeState()) {
      const suggestion = suggestMode(sanitized);
      if (suggestion) {
        process.stdout.write(JSON.stringify({
          result: `<system-reminder>This task might benefit from \`${suggestion} mode\`. Say \`${suggestion}: [your task]\` to activate.</system-reminder>`,
        }));
        process.exit(0);
      }
    }

    // Still no suggestion — check for delegation opportunity on any non-trivial
    // prompt outside of mode execution. Advisory only; never blocks.
    if (sanitized.length > 80 && !readModeState() && shouldNudgeDelegation(sanitized)) {
      process.stdout.write(JSON.stringify({
        result: `<system-reminder>${DELEGATION_NUDGE_TEXT}</system-reminder>`,
      }));
    }

    process.exit(0);
  } catch {
    // Never exit(1) from a hook
    process.exit(0);
  }
}

const isDirectRun =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("keyword-router.ts");
if (isDirectRun) main();
