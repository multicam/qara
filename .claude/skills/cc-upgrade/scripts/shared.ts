/**
 * shared.ts
 * Shared types and utilities for cc-upgrade analysis scripts.
 * Used by both analyse-claude-folder.ts (base) and analyse-pai.ts (extension).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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

/** Recursively find files by extension (e.g. '.md', '.ts') */
export function findFiles(dir: string, ext: string, results: string[] = []): string[] {
    if (!existsSync(dir)) return results;

    for (const file of readdirSync(dir)) {
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
