/**
 * Tests for skill-validator-lib.ts
 *
 * Exercises the extracted lib functions directly (not through the CLI).
 * Fixtures live in /tmp/ and are torn down after each test.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    parseFrontmatter,
    splitSkillMd,
    validateFrontmatter,
    validateBodyLineCount,
    validateRoutingSection,
    scanOrphans,
    validateRouteCount,
    scanActivationTriggers,
    extractRoutingSection,
    type SkillFrontmatter,
    type SkillViolation,
} from '../hooks/lib/skill-validator-lib.ts';

// ── Fixture helpers ──────────────────────────────────────────────────────────

interface FixtureCtx { dir: string; workflowsDir: string; referencesDir: string; }

function makeFixture(): FixtureCtx {
    const dir = mkdtempSync(join(tmpdir(), 'skill-lib-'));
    const workflowsDir = join(dir, 'workflows');
    const referencesDir = join(dir, 'references');
    mkdirSync(workflowsDir);
    mkdirSync(referencesDir);
    return { dir, workflowsDir, referencesDir };
}

function teardownFixture(ctx: FixtureCtx): void {
    rmSync(ctx.dir, { recursive: true, force: true });
}

function rulesOf(violations: SkillViolation[]): string[] {
    return violations.map(v => v.rule);
}

let ctx: FixtureCtx;
beforeEach(() => { ctx = makeFixture(); });
afterEach(() => teardownFixture(ctx));

// ── parseFrontmatter ─────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
    test('valid single-line description returns frontmatter object', () => {
        const content = `---
name: my-skill
description: A short one-line description.
---

body
`;
        const fm = parseFrontmatter(content);
        expect(fm).not.toBeNull();
        expect(fm!.name).toBe('my-skill');
        expect(fm!.description).toBe('A short one-line description.');
    });

    test('valid pipe-block description collects multi-line content', () => {
        const content = `---
name: my-skill
description: |
  First line of description.
  Second line here.
---

body
`;
        const fm = parseFrontmatter(content);
        expect(fm).not.toBeNull();
        expect(fm!.description).toContain('First line');
        expect(fm!.description).toContain('Second line');
    });

    test('missing frontmatter block returns null', () => {
        const content = 'Just a body with no frontmatter.\n';
        expect(parseFrontmatter(content)).toBeNull();
    });

    test('frontmatter without closing --- returns null', () => {
        const content = '---\nname: my-skill\ndescription: no closer\n\nbody\n';
        expect(parseFrontmatter(content)).toBeNull();
    });

    test('malformed YAML ({ ... }) in name returns null', () => {
        const content = '---\nname: [invalid: yaml: {\n---\n\nbody\n';
        expect(parseFrontmatter(content)).toBeNull();
    });
});

// ── splitSkillMd ─────────────────────────────────────────────────────────────

describe('splitSkillMd', () => {
    test('returns fm and body when well-formed', () => {
        const content = `---
name: s
description: d
---

## Heading

content
`;
        const result = splitSkillMd(content);
        expect(result.fm).not.toBeNull();
        expect(result.body).toContain('## Heading');
        expect(result.parseError).toBeUndefined();
    });

    test('returns parseError when malformed', () => {
        const content = '---\nname: [invalid: yaml: {\n---\n\nbody\n';
        const result = splitSkillMd(content);
        expect(result.fm).toBeNull();
        expect(result.parseError).toBeDefined();
    });
});

// ── validateFrontmatter ──────────────────────────────────────────────────────

describe('validateFrontmatter', () => {
    test('happy path — valid fm returns no violations', () => {
        const fm: SkillFrontmatter = {
            name: 'my-skill',
            description: 'Short description.',
        };
        expect(validateFrontmatter(fm)).toEqual([]);
    });

    test('name over 64 chars → name-too-long', () => {
        const fm: SkillFrontmatter = { name: 'a'.repeat(65), description: 'd' };
        expect(rulesOf(validateFrontmatter(fm))).toContain('name-too-long');
    });

    test('name with uppercase → name-invalid-format', () => {
        const fm: SkillFrontmatter = { name: 'MySkill', description: 'd' };
        expect(rulesOf(validateFrontmatter(fm))).toContain('name-invalid-format');
    });

    test('name containing "anthropic" → name-reserved-word', () => {
        const fm: SkillFrontmatter = { name: 'anthropic-helper', description: 'd' };
        expect(rulesOf(validateFrontmatter(fm))).toContain('name-reserved-word');
    });

    test('missing description → description-missing', () => {
        const fm: SkillFrontmatter = { name: 'my-skill', description: '' };
        expect(rulesOf(validateFrontmatter(fm))).toContain('description-missing');
    });

    test('description over 1024 chars → description-too-long', () => {
        const fm: SkillFrontmatter = { name: 'my-skill', description: 'x'.repeat(1025) };
        expect(rulesOf(validateFrontmatter(fm))).toContain('description-too-long');
    });

    test('description + when_to_use combined over 1536 chars → description-combined-too-long', () => {
        const fm: SkillFrontmatter = {
            name: 'my-skill',
            description: 'x'.repeat(800),
            when_to_use: 'y'.repeat(800),
        };
        expect(rulesOf(validateFrontmatter(fm))).toContain('description-combined-too-long');
    });

    test('null frontmatter → no violations (caller handles parse error)', () => {
        expect(validateFrontmatter(null)).toEqual([]);
    });
});

// ── validateBodyLineCount ────────────────────────────────────────────────────

describe('validateBodyLineCount', () => {
    test('body under cap → no violation', () => {
        const body = Array.from({ length: 100 }, (_, i) => `L${i}`).join('\n');
        expect(validateBodyLineCount(body, 500)).toEqual([]);
    });

    test('body at cap → no violation', () => {
        const body = Array.from({ length: 500 }, (_, i) => `L${i}`).join('\n');
        expect(validateBodyLineCount(body, 500)).toEqual([]);
    });

    test('body over cap → body-too-long', () => {
        const body = Array.from({ length: 501 }, (_, i) => `L${i}`).join('\n');
        expect(rulesOf(validateBodyLineCount(body, 500))).toContain('body-too-long');
    });
});

// ── validateRoutingSection ───────────────────────────────────────────────────

describe('validateRoutingSection', () => {
    test('Workflow Routing is first ## heading → no violation', () => {
        const body = '## Workflow Routing\n\n| a | b |\n\n## Other\n';
        expect(validateRoutingSection(body)).toEqual([]);
    });

    test('another section appears before Workflow Routing → routing-not-first (warning)', () => {
        const body = '## Preamble\n\nIntro.\n\n## Workflow Routing\n\n| a | b |\n';
        const violations = validateRoutingSection(body);
        expect(rulesOf(violations)).toContain('routing-not-first');
        expect(violations[0].severity).toBe('warning');
    });

    test('no Workflow Routing anywhere AND another ## section first → error', () => {
        const body = '## Only Section\n\ncontent\n';
        const violations = validateRoutingSection(body);
        expect(rulesOf(violations)).toContain('routing-not-first');
        expect(violations[0].severity).toBe('error');
    });

    test('no ## sections at all → no violation (other rules catch it)', () => {
        const body = 'just prose, no headings\n';
        expect(validateRoutingSection(body)).toEqual([]);
    });
});

// ── scanOrphans ──────────────────────────────────────────────────────────────

describe('scanOrphans', () => {
    test('all files linked in body → no violations', () => {
        writeFileSync(join(ctx.workflowsDir, 'action.md'), '# Action\n');
        writeFileSync(join(ctx.referencesDir, 'guide.md'), '# Guide\n');
        const body = 'See workflows/action.md and references/guide.md.\n';
        expect(scanOrphans(ctx.dir, body)).toEqual([]);
    });

    test('orphan in workflows/ → orphan-file', () => {
        writeFileSync(join(ctx.workflowsDir, 'orphan.md'), '# Orphan\n');
        const body = 'nothing mentions it\n';
        const v = scanOrphans(ctx.dir, body);
        expect(rulesOf(v)).toContain('orphan-file');
        expect(v[0].detail).toContain('orphan.md');
    });

    test('orphan in references/ → orphan-file', () => {
        writeFileSync(join(ctx.referencesDir, 'stray.md'), '# Stray\n');
        const body = 'nothing mentions it\n';
        const v = scanOrphans(ctx.dir, body);
        expect(rulesOf(v)).toContain('orphan-file');
        expect(v[0].detail).toContain('stray.md');
    });

    test('file referenced by another workflow file → no orphan (relaxed rule)', () => {
        writeFileSync(join(ctx.workflowsDir, 'main.md'), '# Main\n\nSee platform-queries.md\n');
        writeFileSync(join(ctx.workflowsDir, 'platform-queries.md'), '# Sub\n');
        const body = 'See workflows/main.md\n'; // platform-queries.md NOT in body
        const v = scanOrphans(ctx.dir, body);
        expect(rulesOf(v)).not.toContain('orphan-file');
    });
});

// ── validateRouteCount ───────────────────────────────────────────────────────

describe('validateRouteCount', () => {
    test('route count equals workflow count → no violation', () => {
        const routingSection = '## Workflow Routing\n\n- workflows/a.md\n- workflows/b.md\n';
        expect(validateRouteCount(routingSection, 2)).toEqual([]);
    });

    test('route count differs from workflow count → route-count-mismatch', () => {
        const routingSection = '## Workflow Routing\n\n- workflows/a.md\n';
        const v = validateRouteCount(routingSection, 2);
        expect(rulesOf(v)).toContain('route-count-mismatch');
    });

    test('zero workflow files → no violation even if no routes', () => {
        const routingSection = '## Workflow Routing\n\nno routes\n';
        expect(validateRouteCount(routingSection, 0)).toEqual([]);
    });
});

// ── extractRoutingSection ────────────────────────────────────────────────────

describe('extractRoutingSection', () => {
    test('extracts from ## Workflow Routing up to next ## heading', () => {
        const body = 'intro\n## Workflow Routing\n\nrow1\nrow2\n\n## Next\n\nmore\n';
        const section = extractRoutingSection(body);
        expect(section).toContain('Workflow Routing');
        expect(section).toContain('row1');
        expect(section).not.toContain('Next');
    });

    test('returns empty string when no Workflow Routing section present', () => {
        expect(extractRoutingSection('just prose\n')).toBe('');
    });
});

// ── scanActivationTriggers ───────────────────────────────────────────────────

describe('scanActivationTriggers', () => {
    test('rich description covering 5+ categories → no violation', () => {
        const description =
            'Does something useful. USE WHEN: "do X", "perform X", "run X", "execute X", ' +
            '"make X", "build X", "generate X", "create X". Works on files, URLs, and code.';
        expect(scanActivationTriggers(description)).toEqual([]);
    });

    test('thin description under 5 categories → weak-activation-triggers (warning)', () => {
        const v = scanActivationTriggers('Does something.');
        expect(rulesOf(v)).toContain('weak-activation-triggers');
        expect(v[0].severity).toBe('warning');
    });

    test('empty description → no violation (description-missing covers it)', () => {
        expect(scanActivationTriggers('')).toEqual([]);
    });
});
