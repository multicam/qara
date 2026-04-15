/**
 * Tests for validate-skill.ts
 *
 * Each test creates a minimal skill fixture in /tmp/, runs the validator
 * against it (by importing the pure check functions directly), then tears
 * down the fixture.
 *
 * Centralized in .claude/tests/ per Qara convention (not .claude/tests/skills/).
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    validateSkill,
    type Violation,
} from '../skills/system-create-skill/scripts/validate-skill.ts';

// ── Fixture helpers ──────────────────────────────────────────────────────────

interface FixtureCtx {
    dir: string;
    workflowsDir: string;
    referencesDir: string;
}

function makeFixture(): FixtureCtx {
    const dir = mkdtempSync(join(tmpdir(), 'validate-skill-'));
    const workflowsDir = join(dir, 'workflows');
    const referencesDir = join(dir, 'references');
    mkdirSync(workflowsDir);
    mkdirSync(referencesDir);
    return { dir, workflowsDir, referencesDir };
}

function teardownFixture(ctx: FixtureCtx): void {
    rmSync(ctx.dir, { recursive: true, force: true });
}

/** Write a well-formed SKILL.md with one workflow and one reference. */
function writeValidSkill(ctx: FixtureCtx, overrides: {
    name?: string;
    description?: string;
    when_to_use?: string;
    extraBody?: string;
    routingLine?: number; // 0-based line index in body where ## Workflow Routing appears (default: 0)
} = {}): void {
    const name = overrides.name ?? 'my-skill';
    const description = overrides.description ??
        'Does something useful. USE WHEN: "do X", "perform X", "run X", "execute X", "make X", "build X", "generate X", "create X".';
    const when_to_use = overrides.when_to_use ? `when_to_use: "${overrides.when_to_use}"\n` : '';
    const extraBody = overrides.extraBody ?? '';

    const routingSection = `## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| "do X" | \`workflows/action.md\` |

`;

    const restBody = `## Overview

Some content here.

- workflows/action.md — the main action workflow
- references/guide.md — reference guide
${extraBody}
`;

    let body: string;
    if ((overrides.routingLine ?? 0) === 0) {
        body = routingSection + restBody;
    } else {
        body = restBody + routingSection;
    }

    const frontmatter = `---\nname: ${name}\ndescription: |\n  ${description}\n${when_to_use}---\n\n`;
    writeFileSync(join(ctx.dir, 'SKILL.md'), frontmatter + body);

    // Create the workflow and reference files linked from SKILL.md body
    writeFileSync(join(ctx.workflowsDir, 'action.md'), '# Action\n\nDo the thing.\n');
    writeFileSync(join(ctx.referencesDir, 'guide.md'), '# Guide\n\nReference content.\n');
}

function rulesOf(violations: Violation[]): string[] {
    return violations.map(v => v.rule);
}

// ── Tests ────────────────────────────────────────────────────────────────────

let ctx: FixtureCtx;

beforeEach(() => { ctx = makeFixture(); });
afterEach(() => teardownFixture(ctx));

describe('name field validation', () => {
    test('name longer than 64 chars → name-too-long', async () => {
        writeValidSkill(ctx, { name: 'a'.repeat(65) });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('name-too-long');
    });

    test('name with uppercase → name-invalid-format', async () => {
        writeValidSkill(ctx, { name: 'MySkill' });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('name-invalid-format');
    });

    test('name with underscores → name-invalid-format', async () => {
        writeValidSkill(ctx, { name: 'my_skill' });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('name-invalid-format');
    });

    test('name containing "anthropic" → name-reserved-word', async () => {
        writeValidSkill(ctx, { name: 'anthropic-helper' });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('name-reserved-word');
    });

    test('name containing "claude" → name-reserved-word', async () => {
        writeValidSkill(ctx, { name: 'my-claude-skill' });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('name-reserved-word');
    });
});

describe('description field validation', () => {
    test('missing description → description-missing', async () => {
        // Write SKILL.md without description field
        writeFileSync(join(ctx.dir, 'SKILL.md'),
            '---\nname: my-skill\n---\n\n## Workflow Routing\n\n');
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('description-missing');
    });

    test('description over 1024 chars → description-too-long', async () => {
        writeValidSkill(ctx, { description: 'x'.repeat(1025) });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('description-too-long');
    });

    test('description + when_to_use combined over 1536 chars → description-combined-too-long', async () => {
        // description = 800 chars, when_to_use = 800 chars → combined 1600 > 1536
        writeValidSkill(ctx, {
            description: 'x'.repeat(800),
            when_to_use: 'y'.repeat(800),
        });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('description-combined-too-long');
    });
});

describe('SKILL.md body length', () => {
    test('body over 500 lines → body-too-long', async () => {
        const manyLines = Array.from({ length: 501 }, (_, i) => `Line ${i + 1}`).join('\n');
        writeValidSkill(ctx, { extraBody: manyLines });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('body-too-long');
    });
});

describe('Workflow Routing placement', () => {
    test('routing not first section → routing-not-first', async () => {
        writeValidSkill(ctx, { routingLine: 1 });
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('routing-not-first');
    });
});

describe('orphan file detection', () => {
    test('orphan .md in workflows/ not linked from SKILL.md body → orphan-file', async () => {
        writeValidSkill(ctx);
        // Add an extra workflow file NOT mentioned in SKILL.md
        writeFileSync(join(ctx.workflowsDir, 'secret.md'), '# Secret\n');
        const result = await validateSkill(ctx.dir);
        const orphan = result.violations.find(v => v.rule === 'orphan-file');
        expect(orphan).toBeDefined();
        expect(orphan!.detail).toContain('secret.md');
    });

    test('orphan .md in references/ not linked from SKILL.md body → orphan-file', async () => {
        writeValidSkill(ctx);
        writeFileSync(join(ctx.referencesDir, 'unused.md'), '# Unused\n');
        const result = await validateSkill(ctx.dir);
        const orphan = result.violations.find(v => v.rule === 'orphan-file');
        expect(orphan).toBeDefined();
        expect(orphan!.detail).toContain('unused.md');
    });
});

describe('route count vs workflow file count', () => {
    test('more workflow files than routing table entries → route-count-mismatch', async () => {
        writeValidSkill(ctx);
        // Add another .md workflow with no routing entry
        writeFileSync(join(ctx.workflowsDir, 'extra.md'), '# Extra\n');
        // Link it so it's not an orphan, but no routing entry for it
        const skillPath = join(ctx.dir, 'SKILL.md');
        const content = Bun.file(skillPath);
        const text = await content.text();
        writeFileSync(skillPath, text + '\n- workflows/extra.md — extra workflow\n');
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('route-count-mismatch');
    });
});

describe('activation trigger coverage', () => {
    test('fewer than 5 of 8 activation categories → weak-activation-triggers (warning)', async () => {
        // Minimal description with very few trigger words
        writeValidSkill(ctx, { description: 'Does something.' });
        const result = await validateSkill(ctx.dir);
        const warning = result.violations.find(v => v.rule === 'weak-activation-triggers');
        expect(warning).toBeDefined();
        expect(warning!.severity).toBe('warning');
    });
});

describe('valid skill', () => {
    test('well-formed skill → zero violations, passed = true', async () => {
        writeValidSkill(ctx);
        const result = await validateSkill(ctx.dir);
        const errors = result.violations.filter(v => v.severity === 'error');
        expect(errors).toHaveLength(0);
        expect(result.passed).toBe(true);
    });
});

describe('malformed frontmatter', () => {
    test('unparseable YAML frontmatter → frontmatter-parse-error with exitCode 2', async () => {
        writeFileSync(join(ctx.dir, 'SKILL.md'),
            '---\nname: [invalid: yaml: {\n---\n\nBody\n');
        const result = await validateSkill(ctx.dir);
        expect(rulesOf(result.violations)).toContain('frontmatter-parse-error');
        expect(result.exitCode).toBe(2);
    });
});
