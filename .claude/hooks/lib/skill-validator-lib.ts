/**
 * skill-validator-lib.ts
 *
 * Shared validation logic for PAI skill directories. Extracted from
 * `.claude/skills/system-create-skill/scripts/validate-skill.ts` so other
 * validators (e.g. a future `system-create-cli` validator) can reuse it.
 *
 * Pure functions where possible. Filesystem I/O is confined to `scanOrphans`
 * and to the `splitSkillMd`/`parseFrontmatter` helpers operating on strings.
 *
 * Behaviour must match the original W1 validator exactly — rule names,
 * severities, and detail-string phrasing are load-bearing for the existing
 * 16 tests in `.claude/tests/validate-skill.test.ts`.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SkillFrontmatter {
    name?: string;
    description?: string;
    when_to_use?: string;
    [k: string]: unknown;
}

export interface SkillViolation {
    rule: string;
    severity: 'error' | 'warning';
    detail: string;
}

export interface SkillValidationResult {
    skill: string;
    violations: SkillViolation[];
    passed: boolean;
    exitCode: 0 | 1 | 2;
}

export interface ParsedSkill {
    fm: SkillFrontmatter | null;
    body: string;
    parseError?: string;
}

// ── Activation category seed words (PAI 8-category pattern) ──────────────────

const ACTIVATION_SEEDS: Record<string, string[]> = {
    'core-noun':     ['skill', 'tool', 'helper', 'assistant', 'analyzer', 'builder', 'creator', 'generator', 'framework', 'workflow', 'validator'],
    'action-verbs':  ['do', 'run', 'perform', 'conduct', 'execute', 'process', 'handle', 'apply', 'create', 'build', 'make', 'add', 'update'],
    'modifiers':     ['quick', 'basic', 'comprehensive', 'deep', 'fast', 'detailed', 'full', 'simple', 'new', 'fresh', 'complete'],
    'prepositions':  [' on ', ' for ', ' about ', ' from ', ' with ', ' in ', ' of '],
    'synonyms':      ['analyze', 'analyse', 'generate', 'create', 'build', 'make', 'write', 'produce', 'extract', 'transform', 'validate', 'check', 'audit'],
    'use-case':      ['when', 'use when', 'use if', 'to get', 'to find', 'to make', 'to build', 'to create', 'says', 'request'],
    'result-oriented': ['find', 'discover', 'get', 'produce', 'output', 'return', 'generate', 'extract', 'compliance', 'report', 'result'],
    'tool-specific': ['file', 'code', 'image', 'pdf', 'url', 'web', 'api', 'json', 'csv', 'git', 'skill', 'pai', 'markdown', 'yaml'],
};

const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;
const RESERVED_NAME_WORDS = /anthropic|claude/i;

// ── Frontmatter parsing ──────────────────────────────────────────────────────

/**
 * Split SKILL.md content into frontmatter and body. On success returns
 * `{ fm, body }`; on parse failure returns `{ fm: null, body, parseError }`
 * with `body` containing whatever followed the opening `---` (best-effort)
 * or the full content when no frontmatter block was found.
 *
 * This is the rich extractor used by CLI wrappers that need the body and
 * a parseError detail for error reporting. Pure string-level operation —
 * no filesystem I/O.
 */
export function splitSkillMd(content: string): ParsedSkill {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) {
        return { fm: null, body: content, parseError: 'No YAML frontmatter block found' };
    }

    const yamlBlock = fmMatch[1];
    const body = fmMatch[2] ?? '';

    // Prefer Bun's built-in YAML parser when available for full spec coverage.
    const bunAny = Bun as unknown as { YAML?: { parse: (s: string) => unknown } };
    if (typeof bunAny.YAML?.parse === 'function') {
        try {
            const parsed = bunAny.YAML.parse(yamlBlock) as SkillFrontmatter;
            return { fm: parsed, body };
        } catch (err) {
            return { fm: null, body, parseError: String(err) };
        }
    }

    // Hand-rolled fallback for the subset we need: `key: value`, `key: |` pipe
    // blocks, and `key: "quoted"`. Complex YAML values (`[...]`, `{...}`) on
    // critical keys produce a parse error.
    const fm: SkillFrontmatter = {};
    const lines = yamlBlock.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const keyMatch = line.match(/^(\w[\w_-]*):\s*(.*)/);
        if (!keyMatch) { i++; continue; }

        const key = keyMatch[1];
        const rest = keyMatch[2].trim();

        if (rest === '|') {
            const blockLines: string[] = [];
            i++;
            while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
                blockLines.push(lines[i].replace(/^  /, ''));
                i++;
            }
            fm[key] = blockLines.join('\n').trimEnd();
        } else if (rest.startsWith('"') && rest.endsWith('"')) {
            fm[key] = rest.slice(1, -1);
            i++;
        } else if (rest.startsWith('[') || rest.startsWith('{')) {
            if (key === 'name' || key === 'description') {
                return { fm: null, body, parseError: `Complex YAML value for '${key}' not supported` };
            }
            i++;
        } else {
            fm[key] = rest;
            i++;
        }
    }

    return { fm, body };
}

/**
 * Parse SKILL.md frontmatter. Returns null on any failure (no block, no
 * closer, malformed YAML). Thin wrapper around `splitSkillMd` for callers
 * that only need the frontmatter object.
 */
export function parseFrontmatter(content: string): SkillFrontmatter | null {
    const { fm, parseError } = splitSkillMd(content);
    if (parseError || !fm) return null;
    return fm;
}

// ── Individual validators ────────────────────────────────────────────────────

/**
 * Validate frontmatter schema: name length, kebab-case, reserved words;
 * description presence, length cap, combined cap with when_to_use.
 * `null` frontmatter yields no violations — the caller should surface a
 * parse error separately via `splitSkillMd`.
 */
export function validateFrontmatter(fm: SkillFrontmatter | null): SkillViolation[] {
    const violations: SkillViolation[] = [];
    if (!fm) return violations;

    const name = fm.name;
    if (name) {
        if (name.length > 64) {
            violations.push({ rule: 'name-too-long', severity: 'error', detail: `name is ${name.length} chars (max 64)` });
        }
        if (!KEBAB_CASE.test(name)) {
            violations.push({ rule: 'name-invalid-format', severity: 'error', detail: `name must be kebab-case lowercase: "${name}"` });
        }
        if (RESERVED_NAME_WORDS.test(name)) {
            violations.push({ rule: 'name-reserved-word', severity: 'error', detail: `name contains reserved word (anthropic/claude): "${name}"` });
        }
    }

    if (!fm.description) {
        violations.push({ rule: 'description-missing', severity: 'error', detail: 'description field is absent from frontmatter' });
        return violations;
    }

    const descLen = fm.description.length;
    if (descLen > 1024) {
        violations.push({ rule: 'description-too-long', severity: 'error', detail: `description is ${descLen} chars (max 1024)` });
    }

    const whenLen = typeof fm.when_to_use === 'string' ? fm.when_to_use.length : 0;
    const combined = descLen + whenLen;
    if (combined > 1536) {
        violations.push({
            rule: 'description-combined-too-long',
            severity: 'error',
            detail: `description + when_to_use combined is ${combined} chars (max 1536)`,
        });
    }

    return violations;
}

/**
 * Validate that the SKILL.md body stays within the line-count cap (500 by
 * default, matching the Anthropic skill-creator guidance).
 */
export function validateBodyLineCount(body: string, cap: number = 500): SkillViolation[] {
    const lines = body.split('\n').length;
    if (lines > cap) {
        return [{ rule: 'body-too-long', severity: 'error', detail: `SKILL.md body is ${lines} lines (max ${cap})` }];
    }
    return [];
}

/**
 * Validate that the first `## ` section in the body is "Workflow Routing".
 * If Workflow Routing exists somewhere but isn't first → warning (PAI
 * relaxation for skills with a brief preamble). If absent entirely AND
 * another ## section appears first → error.
 */
export function validateRoutingSection(body: string): SkillViolation[] {
    const firstScanLines = body.split('\n').slice(0, 40);
    const firstH2Idx = firstScanLines.findIndex(l => /^##\s/.test(l));
    if (firstH2Idx === -1) return [];

    const firstH2Line = firstScanLines[firstH2Idx];
    if (/^##\s+(Workflow Routing|Workflow Routing \(SYSTEM PROMPT\))/.test(firstH2Line)) return [];

    const hasRouting = /^##\s+Workflow Routing/m.test(body);
    return [{
        rule: 'routing-not-first',
        severity: hasRouting ? 'warning' : 'error',
        detail: `First ## section is "${firstH2Line.trim()}" — Workflow Routing section should appear first (immediately after frontmatter)`,
    }];
}

/**
 * Scan for orphaned `.md` files in `workflows/` and `references/`. A file is
 * an orphan if its basename does not appear in the SKILL.md body OR in any
 * sibling workflow file (PAI relaxed rule — supports the platform-queries
 * pattern where workflows cross-link).
 */
export function scanOrphans(skillDir: string, body: string): SkillViolation[] {
    const violations: SkillViolation[] = [];
    const allText = collectLinkableText(skillDir, body);

    for (const subdir of ['workflows', 'references']) {
        const files = listMdFiles(join(skillDir, subdir));
        for (const file of files) {
            if (!allText.includes(file)) {
                violations.push({
                    rule: 'orphan-file',
                    severity: 'error',
                    detail: `${subdir}/${file} is not linked from SKILL.md body or any workflow file`,
                });
            }
        }
    }
    return violations;
}

/**
 * Extract the Workflow Routing section from the body: starts at the
 * `## Workflow Routing` heading, ends at the next `## ` heading (or EOF).
 * Returns `''` when no Workflow Routing section is present.
 */
export function extractRoutingSection(body: string): string {
    const headingMatch = body.match(/^##\s+Workflow Routing.*$/m);
    if (!headingMatch) return '';

    const start = body.indexOf(headingMatch[0]);
    const afterStart = body.slice(start);
    const nextSection = afterStart.match(/\n##\s/);
    return nextSection ? afterStart.slice(0, nextSection.index) : afterStart;
}

/**
 * Validate that the number of distinct `workflows/*.md` references inside
 * the routing section matches the count of `.md` files in `workflows/`.
 * No violation is emitted when the skill has zero workflow files.
 */
export function validateRouteCount(routingSection: string, workflowCount: number): SkillViolation[] {
    if (workflowCount === 0) return [];

    const matches = routingSection.match(/workflows\/[^\s|`\)]+\.md/g);
    const routeCount = matches ? new Set(matches).size : 0;

    if (routeCount !== workflowCount) {
        return [{
            rule: 'route-count-mismatch',
            severity: 'error',
            detail: `Workflow Routing has ${routeCount} .md route entries but workflows/ contains ${workflowCount} .md files`,
        }];
    }
    return [];
}

/**
 * Warn when the description covers fewer than 5 of the 8 PAI activation
 * categories. Intentionally a warning (not an error) — hand-tuned descriptions
 * sometimes legitimately cover fewer categories.
 */
export function scanActivationTriggers(description: string): SkillViolation[] {
    if (!description) return [];

    const text = description.toLowerCase();
    let matched = 0;
    for (const seeds of Object.values(ACTIVATION_SEEDS)) {
        if (seeds.some(seed => text.includes(seed.toLowerCase()))) {
            matched++;
        }
    }

    if (matched < 5) {
        return [{
            rule: 'weak-activation-triggers',
            severity: 'warning',
            detail: `description covers only ${matched}/8 activation categories (need ≥5); add more trigger phrases`,
        }];
    }
    return [];
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function listMdFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(f => f.endsWith('.md'));
}

/** SKILL.md body + all workflow .md file contents, for cross-file link scans. */
function collectLinkableText(skillDir: string, body: string): string {
    let text = body;
    const workflowsDir = join(skillDir, 'workflows');
    if (!existsSync(workflowsDir)) return text;
    for (const f of readdirSync(workflowsDir)) {
        if (!f.endsWith('.md')) continue;
        try {
            text += '\n' + readFileSync(join(workflowsDir, f), 'utf-8');
        } catch {
            // ignore unreadable workflow files
        }
    }
    return text;
}
