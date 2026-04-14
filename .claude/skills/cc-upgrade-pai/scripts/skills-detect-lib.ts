/**
 * skills-detect-lib — detect meaningful changes in an external skill between
 * a known-good prior state (in `.claude/skills-external/<name>/`) and an
 * upstream-updated state (in `~/.agents/skills/<name>/`).
 *
 * Detection combines:
 *   - Structural diff: frontmatter fields (name, description, version),
 *     presence/absence of workflows/ entries, references/ entries
 *   - Semantic diff: Gemma compares old vs new description ("SAME"/"CHANGED")
 *
 * Flagged = structural OR semantic change detected.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { chat as defaultOllamaChat, type OllamaMessage } from '../../../hooks/lib/ollama-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectInput {
    oldSkillDir: string;
    newSkillDir: string;
    /** Skip the Gemma semantic check (for unit tests that only want structural). */
    skipSemantic?: boolean;
    /** Inject an ollamaChat implementation for testing. */
    ollamaChat?: (opts: { messages: OllamaMessage[]; temperature?: number }) => Promise<string>;
}

export interface StructuralChange {
    kind:
        | 'frontmatter'
        | 'workflow-added'
        | 'workflow-removed'
        | 'reference-added'
        | 'reference-removed';
    detail: string;
}

export interface SemanticChange {
    changed: boolean;
    explanation: string;
}

export interface DetectOutput {
    flagged: boolean;
    reasons: string[];
    structuralChanges: StructuralChange[];
    semanticChange: SemanticChange | null;
}

// ─── Structural diff ─────────────────────────────────────────────────────────

const TRACKED_FIELDS = ['name', 'description', 'version', 'argument-hint'] as const;

function extractFrontmatter(skillMdContent: string): Record<string, string> {
    const fm: Record<string, string> = {};
    const match = skillMdContent.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return fm;
    for (const line of match[1].split('\n')) {
        const kv = line.match(/^([a-z][a-z0-9-]*):\s*(.+)$/i);
        if (kv) fm[kv[1]] = kv[2].trim();
    }
    return fm;
}

function listDirEntries(dir: string): string[] {
    if (!existsSync(dir)) return [];
    try {
        return readdirSync(dir).filter(f => !f.startsWith('.')).sort();
    } catch {
        return [];
    }
}

function diffFrontmatter(oldFm: Record<string, string>, newFm: Record<string, string>): StructuralChange[] {
    const changes: StructuralChange[] = [];
    for (const field of TRACKED_FIELDS) {
        if (oldFm[field] !== newFm[field]) {
            changes.push({
                kind: 'frontmatter',
                detail: `${field}: ${oldFm[field] ?? '<absent>'} → ${newFm[field] ?? '<absent>'}`,
            });
        }
    }
    return changes;
}

function diffDirEntries(
    oldDir: string,
    newDir: string,
    subdir: 'workflows' | 'references',
): StructuralChange[] {
    const oldEntries = new Set(listDirEntries(join(oldDir, subdir)));
    const newEntries = new Set(listDirEntries(join(newDir, subdir)));
    const changes: StructuralChange[] = [];
    for (const e of newEntries) {
        if (!oldEntries.has(e)) {
            changes.push({ kind: `${subdir === 'workflows' ? 'workflow' : 'reference'}-added` as StructuralChange['kind'], detail: e });
        }
    }
    for (const e of oldEntries) {
        if (!newEntries.has(e)) {
            changes.push({ kind: `${subdir === 'workflows' ? 'workflow' : 'reference'}-removed` as StructuralChange['kind'], detail: e });
        }
    }
    return changes;
}

export function detectStructuralChanges(oldSkillDir: string, newSkillDir: string): StructuralChange[] {
    const changes: StructuralChange[] = [];

    const oldSkillMd = join(oldSkillDir, 'SKILL.md');
    const newSkillMd = join(newSkillDir, 'SKILL.md');
    if (!existsSync(oldSkillMd) || !existsSync(newSkillMd)) return changes;

    const oldFm = extractFrontmatter(readFileSync(oldSkillMd, 'utf-8'));
    const newFm = extractFrontmatter(readFileSync(newSkillMd, 'utf-8'));

    changes.push(...diffFrontmatter(oldFm, newFm));
    changes.push(...diffDirEntries(oldSkillDir, newSkillDir, 'workflows'));
    changes.push(...diffDirEntries(oldSkillDir, newSkillDir, 'references'));

    return changes;
}

// ─── Semantic diff (Gemma) ───────────────────────────────────────────────────

const SEMANTIC_PROMPT = `You are reviewing whether a skill's purpose has changed between two versions.

Reply with one line:
- "SAME: <one-sentence reason>" if the purpose is unchanged (minor wording only)
- "CHANGED: <one-sentence reason>" if the scope, behavior, or capabilities differ

Old description:
{OLD}

New description:
{NEW}`;

export async function detectSemanticChange(
    oldSkillDir: string,
    newSkillDir: string,
    ollamaChat: NonNullable<DetectInput['ollamaChat']>,
): Promise<SemanticChange | null> {
    const oldSkillMd = join(oldSkillDir, 'SKILL.md');
    const newSkillMd = join(newSkillDir, 'SKILL.md');
    if (!existsSync(oldSkillMd) || !existsSync(newSkillMd)) return null;

    const oldFm = extractFrontmatter(readFileSync(oldSkillMd, 'utf-8'));
    const newFm = extractFrontmatter(readFileSync(newSkillMd, 'utf-8'));

    const oldDesc = oldFm.description ?? '';
    const newDesc = newFm.description ?? '';
    if (!oldDesc && !newDesc) return null;

    const prompt = SEMANTIC_PROMPT.replace('{OLD}', oldDesc).replace('{NEW}', newDesc);
    try {
        const reply = await ollamaChat({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
        });
        const changed = /^\s*CHANGED\b/i.test(reply);
        return { changed, explanation: reply.trim() };
    } catch {
        // fail-open: Gemma unavailable → no semantic signal
        return null;
    }
}

// ─── Combined detection ──────────────────────────────────────────────────────

export async function detectChanges(input: DetectInput): Promise<DetectOutput> {
    const empty: DetectOutput = { flagged: false, reasons: [], structuralChanges: [], semanticChange: null };

    // Initial sync: old dir absent → no change to detect.
    if (!existsSync(input.oldSkillDir)) return empty;

    const structural = detectStructuralChanges(input.oldSkillDir, input.newSkillDir);

    let semantic: SemanticChange | null = null;
    if (!input.skipSemantic) {
        const chatFn = input.ollamaChat ?? (opts => defaultOllamaChat(opts));
        semantic = await detectSemanticChange(input.oldSkillDir, input.newSkillDir, chatFn);
    }

    const reasons: string[] = [];
    for (const c of structural) reasons.push(`${c.kind}: ${c.detail}`);
    if (semantic?.changed) reasons.push(`semantic: ${semantic.explanation}`);

    const flagged = structural.length > 0 || (semantic?.changed ?? false);

    return { flagged, reasons, structuralChanges: structural, semanticChange: semantic };
}

// ─── Review artifact ─────────────────────────────────────────────────────────

export function renderReviewEntry(skillName: string, output: DetectOutput, diff: string): string {
    const timestamp = new Date().toISOString();
    const reasonsBlock = output.reasons.length
        ? output.reasons.map(r => `- ${r}`).join('\n')
        : '- (no reasons recorded)';
    const semanticLine = output.semanticChange
        ? `**Semantic check (Gemma):** ${output.semanticChange.changed ? 'CHANGED' : 'SAME'} — ${output.semanticChange.explanation}`
        : '**Semantic check:** skipped or unavailable';

    return [
        `## ${skillName}`,
        ``,
        `**Detected:** ${timestamp}`,
        ``,
        `**Reasons:**`,
        reasonsBlock,
        ``,
        semanticLine,
        ``,
        `**Diff:**`,
        '```diff',
        diff.trim() || '(no diff captured)',
        '```',
        ``,
    ].join('\n');
}
