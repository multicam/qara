/**
 * shared.ts
 * Shared types and utilities for cc-upgrade analysis scripts.
 * Used by both analyse-claude-folder.ts (base) and analyse-pai.ts (extension).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join } from 'path';

// --- Types ---

export interface AnalysisResult {
    score: number;
    maxScore: number;
    findings: string[];
    recommendations: string[];
}

export interface Report {
    timestamp: string;
    targetPath: string;
    modules: Record<string, AnalysisResult>;
    totalScore: number;
    maxScore: number;
    recommendations: Array<{ module: string; recommendation: string }>;
    compliancePercentage: number;
}

export type AnalyzerFunction = (basePath: string) => AnalysisResult;

// --- Utilities ---

export function emptyResult(maxScore: number): AnalysisResult {
    return { score: 0, maxScore, findings: [], recommendations: [] };
}

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'purgatory']);

/** Recursively find files by extension (e.g. '.md', '.ts'). Skips node_modules, .git, and build output. */
export function findFiles(dir: string, ext: string, results: string[] = []): string[] {
    if (!existsSync(dir)) return results;

    for (const file of readdirSync(dir)) {
        if (EXCLUDED_DIRS.has(file)) continue;
        const fullPath = join(dir, file);
        try {
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                findFiles(fullPath, ext, results);
            } else if (file.endsWith(ext)) {
                results.push(fullPath);
            }
        } catch {
            // Skip broken symlinks or inaccessible files
        }
    }

    return results;
}

/** Read skill directories and return their names */
export function getSkillDirs(skillsPath: string): string[] {
    if (!existsSync(skillsPath)) return [];
    return readdirSync(skillsPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
}

/**
 * Determine whether a tool source file is covered by tests.
 *
 * Four rules, evaluated in order with short-circuit. Memoized and cycle-safe.
 *
 *   A) same-dir `stem.test.ts` (or `.test.js`) exists
 *   B) centralized `<centralTestsDir>/stem.test.ts` exists
 *   C) file is `foo-lib.ts` and its `foo.ts` sibling is covered (recursive)
 *   D) file is `foo-lib.ts` and some sibling `.ts` file imports it AND that
 *      sibling is itself covered (strict: both an import edge AND coverage)
 *
 * Rule D regex tolerates bare `from './foo-lib'` AND explicit-extension
 * `from './foo-lib.ts'` since both styles exist in the Qara codebase.
 *
 * Cycle safety: the memo map is seeded with `false` for the current node
 * before recursing, so mutual imports terminate cleanly rather than recurse
 * infinitely.
 */
export function isToolCovered(
    sourceFile: string,
    centralTestsDir: string,
    memo: Map<string, boolean> = new Map(),
): boolean {
    if (memo.has(sourceFile)) return memo.get(sourceFile)!;
    memo.set(sourceFile, false); // assume false to break cycles

    const dir = dirname(sourceFile);
    const base = basename(sourceFile);
    const stem = base.replace(/\.(ts|js)$/, '');

    // Single write point for memo+return — prevents 4× set/return copy-paste
    // that creeps in when each rule inlines its own terminator.
    const hit = (): true => { memo.set(sourceFile, true); return true; };

    // Rule A: co-located test
    if (existsSync(join(dir, `${stem}.test.ts`)) || existsSync(join(dir, `${stem}.test.js`))) return hit();

    // Rule B: centralized tests directory
    if (existsSync(centralTestsDir) && (
        existsSync(join(centralTestsDir, `${stem}.test.ts`)) ||
        existsSync(join(centralTestsDir, `${stem}.test.js`))
    )) return hit();

    // Rules C & D only apply to -lib.ts modules
    if (stem.endsWith('-lib')) {
        // Rule C: companion {stem-without-lib}.ts is covered
        const companion = stem.slice(0, -'-lib'.length);
        const companionPath = join(dir, `${companion}.ts`);
        if (existsSync(companionPath) && isToolCovered(companionPath, centralTestsDir, memo)) return hit();

        // Rule D: any sibling .ts file that imports this lib AND is itself covered.
        // Regex tolerates:
        //   - `from './foo-lib'` and `from './foo-lib.ts'`  (named/default imports, re-exports)
        //   - `import './foo-lib'` and `import './foo-lib.ts'`  (bare side-effect imports)
        // `analyse-pai.ts` uses the explicit-.ts style, and bare imports appear in test
        // fixtures and side-effect-only modules.
        try {
            const importRegex = new RegExp(`(?:from|import)\\s+['"]\\.\\/${stem}(\\.ts)?['"]`);
            const siblings = readdirSync(dir).filter(f =>
                f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== base
            );
            for (const sibling of siblings) {
                const siblingPath = join(dir, sibling);
                let content: string;
                try { content = readFileSync(siblingPath, 'utf-8'); } catch { continue; }
                if (!importRegex.test(content)) continue;
                if (isToolCovered(siblingPath, centralTestsDir, memo)) return hit();
            }
        } catch { /* dir unreadable — skip */ }
    }

    return false;
}

/** Check if a SKILL.md has valid frontmatter (returns { valid, name, context }) */
export function parseSkillFrontmatter(skillMdPath: string): {
    valid: boolean;
    name: string | null;
    context: 'fork' | 'same' | null;
    content: string;
} {
    if (!existsSync(skillMdPath)) {
        return { valid: false, name: null, context: null, content: '' };
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const hasFrontmatter = content.startsWith('---');
    const nameMatch = content.match(/^name:\s*(.+)/m);
    const contextMatch = content.match(/^context:\s*(fork|same)/m);

    return {
        valid: hasFrontmatter && nameMatch !== null,
        name: nameMatch?.[1]?.trim() ?? null,
        context: (contextMatch?.[1] as 'fork' | 'same') ?? null,
        content,
    };
}

/** Generate report from analyzer modules */
export function runAnalysis(targetPath: string, modules: Record<string, AnalyzerFunction>): Report {
    const report: Report = {
        timestamp: new Date().toISOString(),
        targetPath,
        modules: {},
        totalScore: 0,
        maxScore: 0,
        recommendations: [],
        compliancePercentage: 0,
    };

    for (const [name, analyzer] of Object.entries(modules)) {
        const result = analyzer(targetPath);
        report.modules[name] = result;
        report.totalScore += result.score;
        report.maxScore += result.maxScore;
        report.recommendations.push(
            ...result.recommendations.map(r => ({ module: name, recommendation: r }))
        );
    }

    report.compliancePercentage = report.maxScore > 0
        ? Math.round((report.totalScore / report.maxScore) * 100)
        : 0;

    return report;
}

/** Format a report for console output */
export function formatReport(report: Report, title: string): string {
    const lines: string[] = [];
    const padded = ` ${title} `.padEnd(60);

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push(`║${padded}║`);
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`Generated: ${report.timestamp}`);
    lines.push(`Path: ${report.targetPath}`);
    lines.push(`Score: ${report.totalScore}/${report.maxScore} (${report.compliancePercentage}%)\n`);

    const filled = Math.round(report.compliancePercentage / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    lines.push(`Progress: [${bar}] ${report.compliancePercentage}%\n`);

    for (const [name, result] of Object.entries(report.modules)) {
        lines.push(`--- ${name.toUpperCase()} (${result.score}/${result.maxScore}) ---`);
        for (const finding of result.findings) {
            lines.push(`  ${finding}`);
        }
        lines.push('');
    }

    if (report.recommendations.length > 0) {
        lines.push('--- RECOMMENDATIONS ---\n');

        const grouped: Record<string, string[]> = {};
        for (const rec of report.recommendations) {
            if (!grouped[rec.module]) grouped[rec.module] = [];
            grouped[rec.module].push(rec.recommendation);
        }

        for (const [module, recs] of Object.entries(grouped)) {
            lines.push(`[${module}]`);
            for (const rec of recs) {
                lines.push(`  - ${rec}`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}
