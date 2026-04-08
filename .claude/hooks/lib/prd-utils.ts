/**
 * PRD Utilities
 *
 * Read/write/query prd.json files for PRD-driven development.
 * Used by Drive mode to iterate through user stories with acceptance criteria.
 *
 * PRD file location: {projectDir}/prd.json
 * Format: { name, created_at, stories: [{ id, title, description, acceptance_criteria, passes, ... }] }
 */

import { existsSync, readFileSync, writeFileSync, renameSync } from "fs";
import { join } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Story {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  passes: boolean;
  verified_at: string | null;
  verified_by: "self" | "critic" | "verifier" | null;
  scenario_file: string | null;
}

export interface PRD {
  name: string;
  created_at: string;
  stories: Story[];
}

// ─── Validation ─────────────────────────────────────────────────────────────

function isValidPRD(data: unknown): data is PRD {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.name !== "string") return false;
  if (typeof d.created_at !== "string") return false;
  if (!Array.isArray(d.stories)) return false;
  // Validate each story has required fields
  for (const story of d.stories) {
    if (!story || typeof story !== "object") return false;
    const s = story as Record<string, unknown>;
    if (typeof s.id !== "string") return false;
    if (typeof s.passes !== "boolean") return false;
  }
  return true;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Read PRD from project directory.
 * Returns null if file missing, malformed, or invalid schema.
 */
export function readPRD(projectDir: string): PRD | null {
  const prdPath = join(projectDir, "prd.json");
  try {
    if (!existsSync(prdPath)) return null;
    const content = readFileSync(prdPath, "utf-8");
    const data = JSON.parse(content);
    if (!isValidPRD(data)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Write PRD to project directory. Atomic write via temp+rename.
 */
export function writePRD(projectDir: string, prd: PRD): void {
  const prdPath = join(projectDir, "prd.json");
  const tmp = prdPath + ".tmp";
  writeFileSync(tmp, JSON.stringify(prd, null, 2));
  renameSync(tmp, prdPath);
}

/**
 * Get stories that haven't passed yet.
 */
export function getIncompleteStories(prd: PRD): Story[] {
  return prd.stories.filter((s) => !s.passes);
}

/**
 * Check if all stories are passing.
 */
export function allStoriesPassing(prd: PRD): boolean {
  return prd.stories.every((s) => s.passes);
}

/**
 * Get stories that are currently passing (for regression re-verification).
 */
export function getRegressionCandidates(prd: PRD): Story[] {
  return prd.stories.filter((s) => s.passes);
}

/**
 * Mark a story as passing. Sets verified_at and verified_by.
 * Mutates the PRD in place (does not write to disk — caller decides).
 */
export function markStoryPassing(prd: PRD, storyId: string, verifiedBy: string): void {
  const story = prd.stories.find((s) => s.id === storyId);
  if (!story) throw new Error(`Story not found: ${storyId}`);
  story.passes = true;
  story.verified_at = new Date().toISOString();
  story.verified_by = verifiedBy as Story["verified_by"];
}

/**
 * Mark a story as failing (for regression). Clears verified fields.
 * Mutates the PRD in place (does not write to disk — caller decides).
 */
export function markStoryFailing(prd: PRD, storyId: string): void {
  const story = prd.stories.find((s) => s.id === storyId);
  if (!story) throw new Error(`Story not found: ${storyId}`);
  story.passes = false;
  story.verified_at = null;
  story.verified_by = null;
}
