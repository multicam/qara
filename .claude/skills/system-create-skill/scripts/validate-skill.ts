#!/usr/bin/env bun
/**
 * validate-skill.ts
 *
 * Validates a PAI skill directory against Anthropic cross-surface compliance
 * rules and PAI architectural standards. Thin CLI over `skill-validator-lib`
 * — argv parse, read SKILL.md, aggregate violations, emit JSON/stderr/exit.
 *
 * Usage: bun run validate-skill.ts <skill-directory>
 *
 * Exit codes:
 *   0 — no errors (warnings allowed)
 *   1 — one or more errors
 *   2 — internal error (bad path, parse failure)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
    splitSkillMd,
    validateFrontmatter,
    validateBodyLineCount,
    validateRoutingSection,
    scanOrphans,
    validateRouteCount,
    scanActivationTriggers,
    extractRoutingSection,
    type SkillViolation,
    type SkillValidationResult,
} from '../../../hooks/lib/skill-validator-lib.ts';

// Re-export for back-compat with existing tests that import from this module.
export type Violation = SkillViolation;
export type ValidationResult = SkillValidationResult;

function countWorkflowFiles(skillDir: string): number {
    const workflowsDir = join(skillDir, 'workflows');
    if (!existsSync(workflowsDir)) return 0;
    return readdirSync(workflowsDir).filter(f => f.endsWith('.md')).length;
}

export async function validateSkill(skillDir: string): Promise<ValidationResult> {
    const skillMdPath = join(skillDir, 'SKILL.md');
    const skillName = basename(skillDir);

    const internalError = (msg: string): ValidationResult => ({
        skill: skillName,
        violations: [{ rule: 'frontmatter-parse-error', severity: 'error', detail: msg }],
        passed: false,
        exitCode: 2,
    });

    let content: string;
    try {
        content = readFileSync(skillMdPath, 'utf-8');
    } catch (err) {
        return internalError(`Cannot read SKILL.md: ${err}`);
    }

    const { fm, body, parseError } = splitSkillMd(content);
    if (parseError || !fm) {
        return internalError(parseError ?? 'Failed to parse frontmatter');
    }

    const routingSection = extractRoutingSection(body);
    const workflowCount = countWorkflowFiles(skillDir);
    const description = typeof fm.description === 'string' ? fm.description : '';
    const whenToUse = typeof fm.when_to_use === 'string' ? fm.when_to_use : '';

    const violations: SkillViolation[] = [
        ...validateFrontmatter(fm),
        ...validateBodyLineCount(body),
        ...validateRoutingSection(body),
        ...scanOrphans(skillDir, body),
        ...validateRouteCount(routingSection, workflowCount),
        ...scanActivationTriggers(`${description} ${whenToUse}`.trim()),
    ];

    const hasErrors = violations.some(v => v.severity === 'error');
    return {
        skill: typeof fm.name === 'string' ? fm.name : skillName,
        violations,
        passed: !hasErrors,
        exitCode: hasErrors ? 1 : 0,
    };
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const skillDir = process.argv[2];
    if (!skillDir) {
        process.stderr.write('Usage: bun run validate-skill.ts <skill-directory>\n');
        process.exit(2);
    }

    let result: ValidationResult;
    try {
        result = await validateSkill(skillDir);
    } catch (err) {
        process.stderr.write(`Internal error: ${err}\n`);
        process.exit(2);
    }

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');

    const errors = result.violations.filter(v => v.severity === 'error');
    const warnings = result.violations.filter(v => v.severity === 'warning');

    if (result.exitCode === 2) {
        process.stderr.write(`ERROR: Internal failure — ${result.violations[0]?.detail}\n`);
    } else if (errors.length === 0 && warnings.length === 0) {
        process.stderr.write(`PASSED: ${result.skill} — all checks passed\n`);
    } else {
        if (errors.length) process.stderr.write(`FAILED: ${result.skill} — ${errors.length} error(s), ${warnings.length} warning(s)\n`);
        else process.stderr.write(`PASSED with warnings: ${result.skill} — 0 errors, ${warnings.length} warning(s)\n`);
        for (const v of result.violations) {
            const prefix = v.severity === 'error' ? '  [ERROR]' : '  [WARN] ';
            process.stderr.write(`${prefix} ${v.rule}: ${v.detail}\n`);
        }
    }

    process.exit(result.exitCode);
}

if (import.meta.path === Bun.main || process.argv[1]?.endsWith('validate-skill.ts')) {
    main().catch(err => {
        process.stderr.write(`Fatal: ${err}\n`);
        process.exit(2);
    });
}
