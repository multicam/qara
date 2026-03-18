/**
 * Context Graph Scanner
 *
 * File discovery, tier classification, and reference parsing.
 * Re-implements patterns from cc-upgrade shared.ts locally.
 */

import { join, resolve, relative, dirname, basename } from 'path';
import { existsSync, readFileSync, readdirSync, statSync, lstatSync, realpathSync } from 'fs';
import type { ContextNode, ContextEdge } from './types';

/**
 * Resolve paiDir to its real path if skills/ is symlinked.
 * Handles the case where PAI_DIR=~/.claude but actual files live in ~/qara/.claude/.
 */
export function resolveRealPaiDir(paiDir: string): string {
  const skillsDir = join(paiDir, 'skills');
  if (existsSync(skillsDir)) {
    try {
      const realSkills = realpathSync(skillsDir);
      // If skills is symlinked, derive the real .claude dir from it
      const realPaiCandidate = dirname(realSkills);
      if (realPaiCandidate !== paiDir && existsSync(realPaiCandidate)) {
        return realPaiCandidate;
      }
    } catch { /* not a symlink or can't resolve */ }
  }
  return paiDir;
}

/**
 * Get all skill directory paths under SKILLS_DIR
 */
export function getSkillDirs(skillsDir: string): string[] {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .map(name => join(skillsDir, name))
    .filter(path => {
      try {
        const stat = lstatSync(path);
        // Follow symlinks — include symlinked skills
        if (stat.isSymbolicLink()) {
          try { return statSync(path).isDirectory(); } catch { return false; }
        }
        return stat.isDirectory();
      } catch { return false; }
    });
}

/**
 * Find all .md files recursively under a directory
 */
export function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch { return; }

    for (const entry of entries) {
      const fullPath = join(current, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          // Skip thoughts directories — they're session-specific, not context architecture
          if (entry === 'thoughts') continue;
          // Skip non-context directories
          if (entry === 'scripts' || entry === 'bin' || entry === 'lib' ||
              entry === 'templates' || entry === 'tools' || entry === 'history') continue;
          walk(fullPath);
        } else if (entry.endsWith('.md') && stat.isFile()) {
          results.push(fullPath);
        }
      } catch { /* broken symlink or permission error */ }
    }
  }

  walk(dir);
  return results;
}

/**
 * Classify a file's tier based on its path
 */
export function classifyTier(filePath: string, skillsDir: string): 1 | 2 | 3 {
  const rel = relative(skillsDir, filePath);

  // Tier 1: SKILL.md files (skill entry points)
  if (basename(filePath) === 'SKILL.md') return 1;

  // Tier 3: Files in subdirectories (workflows/, references/, documentation/, docs/, assets/)
  const parts = rel.split('/');
  if (parts.length >= 3) return 3; // e.g., skillName/workflows/file.md

  // Tier 2: Everything else (skill root files, context/ files)
  return 2;
}

/**
 * Determine the kind of a context node
 */
export function classifyKind(filePath: string, skillsDir: string, contextDir: string): ContextNode['kind'] {
  if (basename(filePath) === 'SKILL.md') return 'skill';
  if (filePath.startsWith(contextDir)) return 'context';

  const rel = relative(skillsDir, filePath);
  const parts = rel.split('/');
  if (parts.length >= 3) {
    const subdir = parts[1];
    if (subdir === 'workflows') return 'workflow';
    if (subdir === 'references') return 'reference';
    if (subdir === 'documentation' || subdir === 'docs') return 'documentation';
  }

  return 'reference'; // default for skill root .md files
}

/**
 * Determine the owning skill name for a file
 */
export function getSkillName(filePath: string, skillsDir: string): string | undefined {
  if (!filePath.startsWith(skillsDir)) return undefined;
  const rel = relative(skillsDir, filePath);
  const parts = rel.split('/');
  return parts.length >= 1 ? parts[0] : undefined;
}

/**
 * Discover all context nodes from skills and context directories
 */
export function discoverNodes(paiDir: string): ContextNode[] {
  const realPaiDir = resolveRealPaiDir(paiDir);
  const skillsDir = join(paiDir, 'skills');
  const contextDir = join(realPaiDir, 'context');
  const nodes: ContextNode[] = [];

  // Scan all skill directories
  for (const skillDir of getSkillDirs(skillsDir)) {
    for (const filePath of findMdFiles(skillDir)) {
      const stat = statSync(filePath);
      const byteSize = stat.size;
      nodes.push({
        id: filePath,
        relativePath: relative(paiDir, filePath),
        tier: classifyTier(filePath, skillsDir),
        kind: classifyKind(filePath, skillsDir, contextDir),
        byteSize,
        tokenEstimate: Math.ceil(byteSize / 4),
        skillName: getSkillName(filePath, skillsDir),
      });
    }
  }

  // Scan context directory (may be in real pai dir if skills is symlinked)
  if (existsSync(contextDir)) {
    for (const filePath of findMdFiles(contextDir)) {
      const stat = statSync(filePath);
      const byteSize = stat.size;
      nodes.push({
        id: filePath,
        relativePath: relative(paiDir, filePath),
        tier: 2,
        kind: 'context',
        byteSize,
        tokenEstimate: Math.ceil(byteSize / 4),
      });
    }
  }

  return nodes;
}

// Reference patterns — cover all routing syntaxes used across skills
//
// READ variants:
//   → **READ:** `path`         (CORE style, with backticks)
//   → **READ:** path           (system-create-skill style, no backticks)
//   -> **READ:** path          (hook-authoring style, ASCII arrow)
//   **READ:** `path`           (humaniser style, no arrow)
//   read `path`                (humaniser lowercase)
const READ_BACKTICK = /\*\*READ:\*\*\s*`([^`]+)`/gi;
const READ_ARROW_BARE = /(?:→|->)\s*\*\*READ:\*\*\s+([^\s`][^\s]*)/g;

// Route to: `path` (system-create-cli style)
const ROUTE_PATTERN = /\*\*Route to:\*\*\s*`([^`]+)`/g;

// Markdown hyperlinks: [text](./path.md) or [text](path.md)
const LINK_PATTERN = /\[[^\]]+\]\((?:\.\/)?([^)]+\.md)\)/g;

const INVOKE_PATTERN = /→\s*\*\*INVOKE\s+SKILL:\*\*\s*`?(\S+?)`?(?:\s|$)/g;
const SEE_PATTERN = /[Ss]ee\s+`([^`]+\.md)`/g;
const TABLE_PATTERN = /\|\s*[^|]+\s*\|\s*`([^`]+\.(?:md|ts))`\s*\|/g;

/**
 * Resolve a reference path to an absolute path
 *
 * Resolution order:
 * 1. ${PAI_DIR} expansion → absolute path
 * 2. Relative to containing file's directory
 * 3. Bare filename → search within same skill, then CORE skill
 */
export function resolveReference(
  ref: string,
  sourceFile: string,
  paiDir: string,
  skillsDir: string,
): string | null {
  // 1. ${PAI_DIR} expansion
  if (ref.includes('${PAI_DIR}')) {
    const expanded = ref.replace(/\$\{PAI_DIR\}/g, paiDir);
    const resolved = resolve(expanded);
    return resolved;
  }

  // 2. Relative to source file's directory
  const fromDir = resolve(dirname(sourceFile), ref);
  if (existsSync(fromDir)) return fromDir;

  // 3. Bare filename → search in same skill, then CORE
  if (!ref.includes('/')) {
    // Same skill
    const sourceSkill = getSkillName(sourceFile, skillsDir);
    if (sourceSkill) {
      const inSkill = join(skillsDir, sourceSkill, ref);
      if (existsSync(inSkill)) return inSkill;
    }

    // CORE skill fallback
    const inCore = join(skillsDir, 'CORE', ref);
    if (existsSync(inCore)) return inCore;

    // Context directory fallback (check both paiDir and real location)
    const inContext = join(paiDir, 'context', ref);
    if (existsSync(inContext)) return inContext;
    const realPai = resolveRealPaiDir(paiDir);
    if (realPai !== paiDir) {
      const inRealContext = join(realPai, 'context', ref);
      if (existsSync(inRealContext)) return inRealContext;
    }
  }

  // For .claude/... paths — strip .claude/ prefix since paiDir IS the .claude dir
  const realPaiDir = resolveRealPaiDir(paiDir);
  if (ref.startsWith('.claude/')) {
    const stripped = ref.slice('.claude/'.length);
    const fromPai = join(paiDir, stripped);
    if (existsSync(fromPai)) return fromPai;
    // Also try real pai dir (when skills is symlinked, context may be in the real location)
    if (realPaiDir !== paiDir) {
      const fromRealPai = join(realPaiDir, stripped);
      if (existsSync(fromRealPai)) return fromRealPai;
    }
  }

  // Context directory fallback for paths with directories
  if (ref.includes('/')) {
    const inContext = join(realPaiDir, 'context', basename(ref));
    if (existsSync(inContext)) return inContext;
  }

  // For relative paths with directories (e.g., some/path/foo.md)
  const fromPaiDir = resolve(paiDir, '..', ref); // relative to repo root
  if (existsSync(fromPaiDir)) return fromPaiDir;
  if (realPaiDir !== paiDir) {
    const fromRealPaiDir = resolve(realPaiDir, '..', ref);
    if (existsSync(fromRealPaiDir)) return fromRealPaiDir;
  }

  // Return the best-guess absolute path (even if file doesn't exist — for broken reference detection)
  const sourceSkill = getSkillName(sourceFile, skillsDir);
  if (sourceSkill && !ref.includes('/')) {
    return join(skillsDir, sourceSkill, ref);
  }
  return resolve(dirname(sourceFile), ref);
}

/**
 * Extract all references from a file's content
 */
export function extractReferences(
  filePath: string,
  content: string,
  paiDir: string,
  skillsDir: string,
): ContextEdge[] {
  const edges: ContextEdge[] = [];
  const lines = content.split('\n');

  // Helper to add edge with deduplication
  function addEdge(target: string, type: ContextEdge['type'], lineNumber: number): void {
    const isDuplicate = edges.some(
      e => e.source === filePath && e.target === target && e.lineNumber === lineNumber
    );
    if (!isDuplicate) {
      edges.push({ source: filePath, target, type, lineNumber });
    }
  }

  // Track fenced code blocks to skip template/example content
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Toggle code block state on ``` lines
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // READ directives — backtick-wrapped (all arrow variants + standalone)
    for (const match of line.matchAll(READ_BACKTICK)) {
      const target = resolveReference(match[1], filePath, paiDir, skillsDir);
      if (target) addEdge(target, 'READ', lineNumber);
    }

    // READ directives — bare path after arrow (no backticks)
    for (const match of line.matchAll(READ_ARROW_BARE)) {
      const target = resolveReference(match[1], filePath, paiDir, skillsDir);
      if (target) addEdge(target, 'READ', lineNumber);
    }

    // Route to: `path` directives
    for (const match of line.matchAll(ROUTE_PATTERN)) {
      const target = resolveReference(match[1], filePath, paiDir, skillsDir);
      if (target) addEdge(target, 'READ', lineNumber);
    }

    // Markdown hyperlinks: [text](./path.md)
    for (const match of line.matchAll(LINK_PATTERN)) {
      const target = resolveReference(match[1], filePath, paiDir, skillsDir);
      if (target) addEdge(target, 'SEE', lineNumber);
    }

    // INVOKE SKILL directives — resolve to skill's SKILL.md
    for (const match of line.matchAll(INVOKE_PATTERN)) {
      const skillName = match[1].replace(/`/g, '');
      const target = join(skillsDir, skillName, 'SKILL.md');
      addEdge(target, 'INVOKE', lineNumber);
    }

    // See `file.md` references
    for (const match of line.matchAll(SEE_PATTERN)) {
      const target = resolveReference(match[1], filePath, paiDir, skillsDir);
      if (target) addEdge(target, 'SEE', lineNumber);
    }

    // Table entries: | Topic | `file.md` or `file.ts` | ... |
    // Skip paths starting with thoughts/ — these are runtime output paths, not references
    // Only emit edges for paths that actually exist — table cells are informational,
    // unlike READ/INVOKE directives. This avoids false positives from documentation
    // tables listing external/upstream paths (e.g., cc-upgrade-pai's "Upstream Source" column).
    for (const match of line.matchAll(TABLE_PATTERN)) {
      if (match[1].startsWith('thoughts/')) continue;
      const target = resolveReference(match[1], filePath, paiDir, skillsDir);
      if (target && existsSync(target)) addEdge(target, 'TABLE', lineNumber);
    }
  }

  return edges;
}

/**
 * Scan all nodes and extract all edges
 */
export function scanAll(paiDir: string): { nodes: ContextNode[]; edges: ContextEdge[] } {
  const skillsDir = join(paiDir, 'skills');
  const nodes = discoverNodes(paiDir);
  const edges: ContextEdge[] = [];

  for (const node of nodes) {
    try {
      const content = readFileSync(node.id, 'utf-8');
      const refs = extractReferences(node.id, content, paiDir, skillsDir);
      edges.push(...refs);
    } catch {
      // Can't read file — skip
    }
  }

  return { nodes, edges };
}
