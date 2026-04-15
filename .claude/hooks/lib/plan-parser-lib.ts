/**
 * plan-parser-lib — Pure functions for parsing cruise plan markdown.
 *
 * Extracted 2026-04-15 (cruise--audit-fixes-v1 P1.2) as a testable parallel
 * spec for the logic `cruise/workflows/plan-entry.md` describes in prose.
 * The cruise model is NOT required to call this library; it runs the same
 * regex in-head. The lib exists for:
 *   (a) unit-test regression protection on phase-identification + checkbox tick
 *   (b) future optional CLI wrapper that cruise could invoke via bun
 *
 * Side effects: none except cache I/O in `readPlanCache` / `writePlanCache`.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A checklist bullet — used for both automated and manual verification items.
 * Single type (rather than two identical interfaces) because neither section
 * has distinguishing structure; "section" is a Phase-level property, not an
 * item-level one.
 *
 * `line` is the absolute 0-indexed line number within the full plan text.
 * Tick functions write `lines[item.line]` directly — they do NOT match by
 * bullet text (identical bullets in the same phase would collide).
 */
export interface ChecklistItem {
  text: string;
  done: boolean;
  line: number;
}

/** @deprecated Use ChecklistItem. Retained for zero-cost back-compat. */
export type AutomatedItem = ChecklistItem;
/** @deprecated Use ChecklistItem. Retained for zero-cost back-compat. */
export type ManualItem = ChecklistItem;

export interface Phase {
  n: number;
  title: string;
  line_start: number;
  line_end: number;
  automated: ChecklistItem[];
  manual: ChecklistItem[];
}

export interface PlanCache {
  /**
   * Schema version — bump when the shape changes. `readPlanCache` returns null
   * for caches with a different version to avoid stale-shape false positives.
   */
  version: 1;
  plan_path: string;
  mtime_ms: number;
  phases: Phase[];
}

// ─── Internal helpers ───────────────────────────────────────────────────────

const PHASE_HEADING = /^##\s+Phase\s+(\d+):\s*(.*)$/;
const BULLET = /^- \[( |x)\]\s+(.+)$/;
const AUTOMATED_MARKER = /^####\s+Automated Verification\s*:/i;
const MANUAL_MARKER = /^####\s+Manual Verification(?:\s*\([^)]*\))?\s*:/i;

/** Normalize line endings so `$` anchors behave consistently across platforms. */
function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/**
 * Collect bullets starting from `startLine` (which should be the line AFTER
 * the `#### ...` marker) until the next `####`, `---`, or `## Phase`.
 * Non-bullet lines within the range are skipped (not terminators).
 */
function collectBullets(
  lines: string[],
  startLine: number,
  maxLine: number
): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (let i = startLine; i <= maxLine; i++) {
    const line = lines[i];
    if (line === undefined) break;
    if (line.startsWith("####") || line.trim() === "---" || PHASE_HEADING.test(line)) break;
    const m = line.match(BULLET);
    if (m) {
      out.push({ text: m[2].trim(), done: m[1] === "x", line: i });
    }
  }
  return out;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse a plan's markdown into structured phases.
 *
 * Forgiving: plans without `#### Automated Verification:` return `automated: []`
 * for that phase. Plans without `## Phase N:` headings return `[]` (caller's
 * `plan-structure-ambiguous` gate handles the higher-level response).
 */
export function parsePlanPhases(planText: string): Phase[] {
  const text = normalize(planText);
  const lines = text.split("\n");

  // First pass: find all phase-heading line numbers
  const headings: { n: number; title: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PHASE_HEADING);
    if (m) headings.push({ n: parseInt(m[1], 10), title: m[2].trim(), line: i });
  }

  if (headings.length === 0) return [];

  // Second pass: for each heading, the body extends to the line before the
  // next heading (or to the last line of the file).
  const phases: Phase[] = [];
  for (let h = 0; h < headings.length; h++) {
    const { n, title, line: line_start } = headings[h];
    const line_end = h + 1 < headings.length ? headings[h + 1].line - 1 : lines.length - 1;

    // Find the Automated Verification + Manual Verification markers within body
    let automated: ChecklistItem[] = [];
    let manual: ChecklistItem[] = [];
    for (let i = line_start + 1; i <= line_end; i++) {
      if (AUTOMATED_MARKER.test(lines[i])) {
        automated = collectBullets(lines, i + 1, line_end);
      } else if (MANUAL_MARKER.test(lines[i])) {
        manual = collectBullets(lines, i + 1, line_end);
      }
    }

    phases.push({ n, title, line_start, line_end, automated, manual });
  }

  return phases;
}

/** Lowest-N phase with at least one unticked automated bullet. */
export function findCurrentPhase(phases: Phase[]): Phase | null {
  const sorted = [...phases].sort((a, b) => a.n - b.n);
  for (const p of sorted) {
    if (p.automated.some((a) => !a.done)) return p;
  }
  return null;
}

/**
 * Options for tick functions.
 *
 * `phases` — pre-parsed phase list. When provided, `tickInSection` skips its
 * internal `parsePlanPhases()` call and uses the caller's data directly.
 * Required for correctness when the caller has pre-processed or filtered
 * phases (without this, the internal reparse would produce different line
 * numbers than what the caller has). Also avoids a redundant O(N) parse for
 * callers who already have the phases in hand.
 */
export interface TickOptions {
  phases?: Phase[];
}

/**
 * Tick the automated-verification bullets at the given absolute line numbers.
 * No-op for:
 *   - phase numbers that don't exist
 *   - line numbers outside the target phase's automated block
 *   - lines that aren't an unticked `- [ ]` bullet
 */
export function tickAutomatedCheckboxes(
  planText: string,
  phaseN: number,
  lineNumbers: number[],
  opts?: TickOptions
): string {
  return tickInSection(planText, phaseN, lineNumbers, "automated", opts);
}

/** Analogous to tickAutomatedCheckboxes but for the manual-verification block. */
export function tickManualCheckboxes(
  planText: string,
  phaseN: number,
  lineNumbers: number[],
  opts?: TickOptions
): string {
  return tickInSection(planText, phaseN, lineNumbers, "manual", opts);
}

function tickInSection(
  planText: string,
  phaseN: number,
  lineNumbers: number[],
  section: "automated" | "manual",
  opts?: TickOptions
): string {
  const text = normalize(planText);
  const phases = opts?.phases ?? parsePlanPhases(text);
  const phase = phases.find((p) => p.n === phaseN);
  if (!phase) return text;

  const allowed = new Set((section === "automated" ? phase.automated : phase.manual).filter((b) => !b.done).map((b) => b.line));
  const lines = text.split("\n");
  let changed = false;
  for (const ln of lineNumbers) {
    if (!allowed.has(ln)) continue;
    const old = lines[ln];
    const replaced = old.replace(/^(- )\[ \](\s+)/, "$1[x]$2");
    if (replaced !== old) {
      lines[ln] = replaced;
      changed = true;
    }
  }
  return changed ? lines.join("\n") : text;
}

// ─── Cache I/O ──────────────────────────────────────────────────────────────

export function readPlanCache(cachePath: string): PlanCache | null {
  try {
    if (!existsSync(cachePath)) return null;
    const raw = readFileSync(cachePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<PlanCache>;
    if (candidate.version !== 1) return null;
    if (typeof candidate.plan_path !== "string") return null;
    if (typeof candidate.mtime_ms !== "number") return null;
    if (!Array.isArray(candidate.phases)) return null;
    return candidate as PlanCache;
  } catch {
    return null;
  }
}

export function writePlanCache(cachePath: string, cache: PlanCache): void {
  const dir = dirname(cachePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
}
