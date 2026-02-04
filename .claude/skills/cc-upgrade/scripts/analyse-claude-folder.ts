#!/usr/bin/env bun
/**
 * analyse-claude-folder.ts
 * Generic .claude/ folder analysis against CC best practices
 *
 * Usage: bun run scripts/analyse-claude-folder.ts [path]
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface AnalysisResult {
    score: number;
    maxScore: number;
    findings: string[];
    recommendations: string[];
}

interface Report {
    timestamp: string;
    targetPath: string;
    modules: Record<string, AnalysisResult>;
    totalScore: number;
    maxScore: number;
    recommendations: Array<{ module: string; recommendation: string }>;
    compliancePercentage: number;
}

type AnalyzerFunction = (basePath: string) => AnalysisResult;

const ANALYSIS_MODULES: Record<string, AnalyzerFunction> = {
    structure: analyzeStructure,
    skills: analyzeSkills,
    hooks: analyzeHooks,
    context: analyzeContext,
    agents: analyzeAgents,
};

function analyzeStructure(basePath: string): AnalysisResult {
    const results: AnalysisResult = {
        score: 0,
        maxScore: 10,
        findings: [],
        recommendations: []
    };

    const claudeDir = join(basePath, '.claude');

    if (!existsSync(claudeDir)) {
        results.findings.push('❌ No .claude/ directory found');
        results.recommendations.push('Create .claude/ directory for CC configuration');
        return results;
    }

    results.score += 2;
    results.findings.push('✅ .claude/ directory exists');

    const expectedDirs = [
        { path: 'context', weight: 2 },
        { path: 'skills', weight: 2 },
        { path: 'agents', weight: 1 },
        { path: 'commands', weight: 1 },
        { path: 'hooks', weight: 1 },
    ];

    for (const dir of expectedDirs) {
        const fullPath = join(claudeDir, dir.path);
        if (existsSync(fullPath)) {
            results.score += dir.weight;
            results.findings.push(`✅ ${dir.path}/ exists`);
        } else {
            results.findings.push(`⚪ ${dir.path}/ not present`);
        }
    }

    const settingsPath = join(claudeDir, 'settings.json');
    if (existsSync(settingsPath)) {
        results.score += 1;
        results.findings.push('✅ settings.json exists');
    } else {
        results.recommendations.push('Create settings.json for hooks and configuration');
    }

    return results;
}

function analyzeSkills(basePath: string): AnalysisResult {
    const results: AnalysisResult = {
        score: 0,
        maxScore: 20,
        findings: [],
        recommendations: []
    };

    const skillsPath = join(basePath, '.claude', 'skills');

    if (!existsSync(skillsPath)) {
        results.findings.push('⚪ No skills directory');
        return results;
    }

    results.score += 5;

    const skillDirs = readdirSync(skillsPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    results.findings.push(`📦 Found ${skillDirs.length} skill(s)`);

    let wellFormed = 0;
    let hasForkContext = false;

    for (const skillDir of skillDirs) {
        const skillMdPath = join(skillsPath, skillDir, 'SKILL.md');

        if (!existsSync(skillMdPath)) {
            results.findings.push(`⚠️  ${skillDir}/ missing SKILL.md`);
            results.recommendations.push(`Add SKILL.md to ${skillDir}/`);
            continue;
        }

        const content = readFileSync(skillMdPath, 'utf-8');
        const hasFrontmatter = content.startsWith('---');
        const hasName = /^name:\s*.+/m.test(content);

        if (hasFrontmatter && hasName) {
            wellFormed++;
            if (/context:\s*fork/m.test(content)) {
                hasForkContext = true;
                results.findings.push(`✅ ${skillDir}: fork context`);
            } else {
                results.findings.push(`✅ ${skillDir}: same context`);
            }
        } else {
            results.findings.push(`⚠️  ${skillDir}: invalid frontmatter`);
        }
    }

    if (wellFormed === skillDirs.length && skillDirs.length > 0) {
        results.score += 10;
        results.findings.push('✅ All skills properly formatted');
    } else if (wellFormed > 0) {
        results.score += 5;
    }

    if (hasForkContext) {
        results.score += 5;
        results.findings.push('✅ Has fork-context skills (isolated execution)');
    }

    return results;
}

function analyzeHooks(basePath: string): AnalysisResult {
    const results: AnalysisResult = {
        score: 0,
        maxScore: 15,
        findings: [],
        recommendations: []
    };

    const settingsPath = join(basePath, '.claude', 'settings.json');

    if (!existsSync(settingsPath)) {
        results.findings.push('⚪ No settings.json');
        results.recommendations.push('Create settings.json with hooks configuration');
        return results;
    }

    try {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

        if (settings.hooks && typeof settings.hooks === 'object') {
            const hookEvents = Object.keys(settings.hooks);
            results.score += 10;
            results.findings.push(`✅ Hooks configured: ${hookEvents.join(', ')}`);

            const coreEvents = ['PreToolUse', 'PostToolUse', 'SessionStart', 'UserPromptSubmit'];
            const missing = coreEvents.filter(e => !hookEvents.includes(e));

            if (missing.length === 0) {
                results.score += 5;
                results.findings.push('✅ All core hook events configured');
            } else {
                results.findings.push(`⚪ Missing: ${missing.join(', ')}`);
            }
        } else {
            results.findings.push('⚪ No hooks in settings.json');
            results.recommendations.push('Add hooks configuration to settings.json');
        }

        if (settings.statusLine) {
            results.findings.push('✅ Custom status line configured');
        }
    } catch {
        results.findings.push('⚠️  Could not parse settings.json');
    }

    return results;
}

function analyzeContext(basePath: string): AnalysisResult {
    const results: AnalysisResult = {
        score: 0,
        maxScore: 15,
        findings: [],
        recommendations: []
    };

    const contextPath = join(basePath, '.claude', 'context');

    if (!existsSync(contextPath)) {
        results.findings.push('⚪ No context directory');
        return results;
    }

    results.score += 5;

    const mdFiles = findFiles(contextPath, '.md');
    let oversized = 0;

    for (const file of mdFiles) {
        const lines = readFileSync(file, 'utf-8').split('\n').length;
        if (lines > 500) {
            oversized++;
            results.findings.push(`⚠️  ${relative(basePath, file)}: ${lines} lines`);
        }
    }

    if (oversized === 0 && mdFiles.length > 0) {
        results.score += 5;
        results.findings.push('✅ All context files under 500 lines');
    } else if (oversized > 0) {
        results.recommendations.push(`Split ${oversized} oversized file(s)`);
    }

    const hasReferences = existsSync(join(contextPath, 'references'));
    if (hasReferences) {
        results.score += 5;
        results.findings.push('✅ Progressive disclosure (references/)');
    }

    return results;
}

function analyzeAgents(basePath: string): AnalysisResult {
    const results: AnalysisResult = {
        score: 0,
        maxScore: 10,
        findings: [],
        recommendations: []
    };

    const agentsPath = join(basePath, '.claude', 'agents');

    if (!existsSync(agentsPath)) {
        results.findings.push('⚪ No agents directory');
        return results;
    }

    const agentFiles = readdirSync(agentsPath).filter(f => f.endsWith('.md'));
    results.findings.push(`📄 Found ${agentFiles.length} agent(s)`);

    if (agentFiles.length > 0) {
        results.score += 5;
    }

    let specialized = 0;
    const generalIndicators = ['general', 'main', 'default'];

    for (const file of agentFiles) {
        const name = file.toLowerCase();
        if (!generalIndicators.some(ind => name.includes(ind))) {
            specialized++;
        }
    }

    if (specialized === agentFiles.length && agentFiles.length > 0) {
        results.score += 5;
        results.findings.push('✅ All agents are specialized');
    } else if (agentFiles.length > 0) {
        results.recommendations.push('Consider splitting general-purpose agents');
    }

    return results;
}

function findFiles(dir: string, ext: string, results: string[] = []): string[] {
    if (!existsSync(dir)) return results;

    for (const file of readdirSync(dir)) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            findFiles(fullPath, ext, results);
        } else if (file.endsWith(ext)) {
            results.push(fullPath);
        }
    }

    return results;
}

function generateReport(basePath: string): Report {
    const report: Report = {
        timestamp: new Date().toISOString(),
        targetPath: basePath,
        modules: {},
        totalScore: 0,
        maxScore: 0,
        recommendations: [],
        compliancePercentage: 0
    };

    for (const [name, analyzer] of Object.entries(ANALYSIS_MODULES)) {
        const result = analyzer(basePath);
        report.modules[name] = result;
        report.totalScore += result.score;
        report.maxScore += result.maxScore;
        report.recommendations.push(
            ...result.recommendations.map(r => ({ module: name, recommendation: r }))
        );
    }

    report.compliancePercentage = Math.round((report.totalScore / report.maxScore) * 100);
    return report;
}

function formatReport(report: Report): string {
    const lines: string[] = [];

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push('║              CC FOLDER ANALYSIS                              ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`📅 Generated: ${report.timestamp}`);
    lines.push(`📁 Path: ${report.targetPath}`);
    lines.push(`📊 Score: ${report.totalScore}/${report.maxScore} (${report.compliancePercentage}%)\n`);

    const filled = Math.round(report.compliancePercentage / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    lines.push(`Progress: [${bar}] ${report.compliancePercentage}%\n`);

    for (const [name, result] of Object.entries(report.modules)) {
        lines.push(`─── ${name.toUpperCase()} (${result.score}/${result.maxScore}) ───`);
        for (const finding of result.findings) {
            lines.push(`  ${finding}`);
        }
        lines.push('');
    }

    if (report.recommendations.length > 0) {
        lines.push('─── RECOMMENDATIONS ───\n');
        for (const rec of report.recommendations) {
            lines.push(`  • [${rec.module}] ${rec.recommendation}`);
        }
    }

    return lines.join('\n');
}

async function main(): Promise<void> {
    const targetPath = process.argv[2] || process.cwd();

    console.log('Analyzing .claude/ folder...\n');

    const report = generateReport(targetPath);
    console.log(formatReport(report));

    if (process.argv.includes('--json')) {
        console.log('\n─── JSON OUTPUT ───\n');
        console.log(JSON.stringify(report, null, 2));
    }
}

main().catch(console.error);
