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

import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { mkdirSync } from "fs";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutomatedItem {
  text: string;
  done: boolean;
  /**
   * Absolute 0-indexed line number within the full plan text.
   * Tick functions write `lines[item.line]` directly — they do NOT match
   * by bullet text (identical bullets in the same phase would collide).
   */
  line: number;
}

export interface ManualItem {
  text: string;
  done: boolean;
  line: number;
}

export interface Phase {
  n: number;
  title: string;
  line_start: number;
  line_end: number;
  automated: AutomatedItem[];
  manual: ManualItem[];
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
): { text: string; done: boolean; line: number }[] {
  const out: { text: string; done: boolean; line: number }[] = [];
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
    let automated: AutomatedItem[] = [];
    let manual: ManualItem[] = [];
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
 * Tick the automated-verification bullets at the given absolute line numbers.
 * No-op for:
 *   - phase numbers that don't exist
 *   - line numbers outside the target phase's automated block
 *   - lines that aren't an unticked `- [ ]` bullet
 */
export function tickAutomatedCheckboxes(
  planText: string,
  phaseN: number,
  lineNumbers: number[]
): string {
  return tickInSection(planText, phaseN, lineNumbers, "automated");
}

/** Analogous to tickAutomatedCheckboxes but for the manual-verification block. */
export function tickManualCheckboxes(
  planText: string,
  phaseN: number,
  lineNumbers: number[]
): string {
  return tickInSection(planText, phaseN, lineNumbers, "manual");
}

function tickInSection(
  planText: string,
  phaseN: number,
  lineNumbers: number[],
  section: "automated" | "manual"
): string {
  const text = normalize(planText);
  const phases = parsePlanPhases(text);
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
