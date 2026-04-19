/**
 * Working Memory — Session-scoped structured memory for execution modes.
 *
 * Four-file memory persists across Stop hook continuations:
 * - learnings.md      — discoveries, unexpected findings
 * - mode-decisions.md — choices made and why (renamed from `decisions.md` to
 *                       disambiguate from qara's root DECISIONS.md — G6 fix)
 * - issues.md         — bugs found, concerns raised
 * - problems.md       — blockers, open questions
 *
 * Storage: STATE_DIR/sessions/{sessionId}/memory/
 * Injected into continuation messages by the Stop hook so critical
 * context survives context compression.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { getSessionsDir, getSessionId } from "./pai-paths";

const MEMORY_FILES = ["learnings.md", "mode-decisions.md", "issues.md", "problems.md"] as const;
type MemoryFile = (typeof MEMORY_FILES)[number];
type MemoryCategory = "learning" | "decision" | "issue" | "problem";

const CATEGORY_TO_FILE: Record<MemoryCategory, MemoryFile> = {
  learning: "learnings.md",
  decision: "mode-decisions.md",
  issue: "issues.md",
  problem: "problems.md",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTimestamp(): string {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} AEST`;
}

// ─── Core Functions ────────────────────────────────────────────────────────

/**
 * Get the memory directory for a session.
 * Creates it if it doesn't exist.
 */
export function getMemoryDir(sessionId?: string): string {
  const id = sessionId || getSessionId();
  const dir = join(getSessionsDir(), id, "memory");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Append a timestamped entry to a memory file.
 */
function appendToFile(category: MemoryCategory, content: string, sessionId?: string): void {
  const dir = getMemoryDir(sessionId);
  const file = join(dir, CATEGORY_TO_FILE[category]);
  const timestamp = getTimestamp();
  const entry = `\n- [${timestamp}] ${content.trim()}\n`;

  if (!existsSync(file)) {
    const header = `# ${category.charAt(0).toUpperCase() + category.slice(1)}s\n`;
    writeFileSync(file, header);
  }
  appendFileSync(file, entry);
}

export function appendLearning(content: string, sessionId?: string): void {
  appendToFile("learning", content, sessionId);
}

export function appendDecision(content: string, sessionId?: string): void {
  appendToFile("decision", content, sessionId);
}

export function appendIssue(content: string, sessionId?: string): void {
  appendToFile("issue", content, sessionId);
}

export function appendProblem(content: string, sessionId?: string): void {
  appendToFile("problem", content, sessionId);
}

/**
 * Read all 4 memory files for a session.
 * Returns an object with file contents (empty string if file doesn't exist).
 */
export function readAllMemory(sessionId?: string): Record<MemoryCategory, string> {
  const dir = getMemoryDir(sessionId);
  const result: Record<MemoryCategory, string> = {
    learning: "",
    decision: "",
    issue: "",
    problem: "",
  };

  for (const [category, filename] of Object.entries(CATEGORY_TO_FILE)) {
    const filepath = join(dir, filename);
    if (existsSync(filepath)) {
      result[category as MemoryCategory] = readFileSync(filepath, "utf-8");
    }
  }

  return result;
}

/**
 * Format all memory for injection into a continuation message.
 * Returns a compact string suitable for system-reminder injection.
 * Returns empty string if no memory exists.
 */
export function formatMemoryForInjection(sessionId?: string): string {
  const memory = readAllMemory(sessionId);
  const sections: string[] = [];

  if (memory.decision) sections.push(`DECISIONS:\n${memory.decision.trim()}`);
  if (memory.learning) sections.push(`LEARNINGS:\n${memory.learning.trim()}`);
  if (memory.problem) sections.push(`OPEN PROBLEMS:\n${memory.problem.trim()}`);
  if (memory.issue) sections.push(`ISSUES:\n${memory.issue.trim()}`);

  if (sections.length === 0) return "";
  return `WORKING MEMORY (from this session):\n${sections.join("\n\n")}`;
}

/**
 * Archive memory by moving the memory directory to an archive subdirectory.
 * Called on mode completion or cancellation.
 */
export function archiveMemory(sessionId?: string): void {
  const id = sessionId || getSessionId();
  const memDir = join(getSessionsDir(), id, "memory");
  if (!existsSync(memDir)) return;

  const archiveDir = join(getSessionsDir(), id, "archive");
  mkdirSync(archiveDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = join(archiveDir, `memory-${timestamp}`);
  renameSync(memDir, dest);
}
