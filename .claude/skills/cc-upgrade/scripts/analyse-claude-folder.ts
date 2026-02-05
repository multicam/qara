#!/usr/bin/env bun
/**
 * analyse-claude-folder.ts
 * Generic .claude/ folder analysis against CC best practices.
 * Exports analyzers for reuse by extension skills (e.g. cc-upgrade-pai).
 *
 * Usage: bun run scripts/analyse-claude-folder.ts [path]
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
    type AnalysisResult,
    type AnalyzerFunction,
    emptyResult,
    findFiles,
    getSkillDirs,
    parseSkillFrontmatter,
    runAnalysis,
    formatReport,
} from './shared.ts';

// --- Exported analyzers (reusable by extensions) ---

export function analyzeStructure(basePath: string): AnalysisResult {
    const results = emptyResult(10);
    const claudeDir = join(basePath, '.claude');

    if (!existsSync(claudeDir)) {
        results.findings.push('NO: .claude/ directory not found');
        results.recommendations.push('Create .claude/ directory for CC configuration');
        return results;
    }

    results.score += 2;
    results.findings.push('OK: .claude/ directory exists');

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
            results.findings.push(`OK: ${dir.path}/ exists`);
        } else {
            results.findings.push(`--: ${dir.path}/ not present`);
        }
    }

    if (existsSync(join(claudeDir, 'settings.json'))) {
        results.score += 1;
        results.findings.push('OK: settings.json exists');
    } else {
        results.recommendations.push('Create settings.json for hooks and configuration');
    }

    return results;
}

export function analyzeSkills(basePath: string): AnalysisResult {
    const results = emptyResult(20);
    const skillsPath = join(basePath, '.claude', 'skills');

    if (!existsSync(skillsPath)) {
        results.findings.push('--: No skills directory');
        return results;
    }

    results.score += 5;

    const skillDirs = getSkillDirs(skillsPath);
    results.findings.push(`Found ${skillDirs.length} skill(s)`);

    let wellFormed = 0;
    let hasForkContext = false;

    for (const skillDir of skillDirs) {
        const skillMdPath = join(skillsPath, skillDir, 'SKILL.md');
        const parsed = parseSkillFrontmatter(skillMdPath);

        if (!existsSync(skillMdPath)) {
            results.findings.push(`WARN: ${skillDir}/ missing SKILL.md`);
            results.recommendations.push(`Add SKILL.md to ${skillDir}/`);
            continue;
        }

        if (parsed.valid) {
            wellFormed++;
            if (parsed.context === 'fork') {
                hasForkContext = true;
                results.findings.push(`OK: ${skillDir}: fork context`);
            } else {
                results.findings.push(`OK: ${skillDir}: same context`);
            }
        } else {
            results.findings.push(`WARN: ${skillDir}: invalid frontmatter`);
        }
    }

    if (wellFormed === skillDirs.length && skillDirs.length > 0) {
        results.score += 10;
        results.findings.push('OK: All skills properly formatted');
    } else if (wellFormed > 0) {
        results.score += 5;
    }

    if (hasForkContext) {
        results.score += 5;
        results.findings.push('OK: Has fork-context skills (isolated execution)');
    }

    return results;
}

export function analyzeHooks(basePath: string): AnalysisResult {
    const results = emptyResult(15);
    const settingsPath = join(basePath, '.claude', 'settings.json');

    if (!existsSync(settingsPath)) {
        results.findings.push('--: No settings.json');
        results.recommendations.push('Create settings.json with hooks configuration');
        return results;
    }

    try {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

        if (settings.hooks && typeof settings.hooks === 'object') {
            const hookEvents = Object.keys(settings.hooks);
            results.score += 10;
            results.findings.push(`OK: Hooks configured: ${hookEvents.join(', ')}`);

            const coreEvents = ['PreToolUse', 'PostToolUse', 'SessionStart', 'UserPromptSubmit'];
            const missing = coreEvents.filter(e => !hookEvents.includes(e));

            if (missing.length === 0) {
                results.score += 5;
                results.findings.push('OK: All core hook events configured');
            } else {
                results.findings.push(`--: Missing: ${missing.join(', ')}`);
            }
        } else {
            results.findings.push('--: No hooks in settings.json');
            results.recommendations.push('Add hooks configuration to settings.json');
        }

        if (settings.statusLine) {
            results.findings.push('OK: Custom status line configured');
        }
    } catch {
        results.findings.push('WARN: Could not parse settings.json');
    }

    return results;
}

export function analyzeContext(basePath: string): AnalysisResult {
    const results = emptyResult(15);
    const contextPath = join(basePath, '.claude', 'context');

    if (!existsSync(contextPath)) {
        results.findings.push('--: No context directory');
        return results;
    }

    results.score += 5;

    const mdFiles = findFiles(contextPath, '.md');
    let oversized = 0;

    for (const file of mdFiles) {
        const lines = readFileSync(file, 'utf-8').split('\n').length;
        if (lines > 500) {
            oversized++;
            results.findings.push(`WARN: ${file}: ${lines} lines`);
        }
    }

    if (oversized === 0 && mdFiles.length > 0) {
        results.score += 5;
        results.findings.push('OK: All context files under 500 lines');
    } else if (oversized > 0) {
        results.recommendations.push(`Split ${oversized} oversized file(s)`);
    }

    if (existsSync(join(contextPath, 'references'))) {
        results.score += 5;
        results.findings.push('OK: Progressive disclosure (references/)');
    }

    return results;
}

export function analyzeAgents(basePath: string): AnalysisResult {
    const results = emptyResult(10);
    const agentsPath = join(basePath, '.claude', 'agents');

    if (!existsSync(agentsPath)) {
        results.findings.push('--: No agents directory');
        return results;
    }

    const agentFiles = readdirSync(agentsPath).filter(f => f.endsWith('.md'));
    results.findings.push(`Found ${agentFiles.length} agent(s)`);

    if (agentFiles.length > 0) {
        results.score += 5;
    }

    const generalIndicators = ['general', 'main', 'default'];
    let specialized = 0;

    for (const file of agentFiles) {
        if (!generalIndicators.some(ind => file.toLowerCase().includes(ind))) {
            specialized++;
        }
    }

    if (specialized === agentFiles.length && agentFiles.length > 0) {
        results.score += 5;
        results.findings.push('OK: All agents are specialized');
    } else if (agentFiles.length > 0) {
        results.recommendations.push('Consider splitting general-purpose agents');
    }

    return results;
}

// --- Module registry ---

export const BASE_MODULES: Record<string, AnalyzerFunction> = {
    structure: analyzeStructure,
    skills: analyzeSkills,
    hooks: analyzeHooks,
    context: analyzeContext,
    agents: analyzeAgents,
};

// --- Main (only runs when executed directly, not when imported) ---

const isDirectRun = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith('analyse-claude-folder.ts');

if (isDirectRun) {
    const targetPath = process.argv[2] || process.cwd();

    console.log('Analyzing .claude/ folder...\n');

    const report = runAnalysis(targetPath, BASE_MODULES);
    console.log(formatReport(report, 'CC FOLDER ANALYSIS'));

    if (process.argv.includes('--json')) {
        console.log('\n--- JSON OUTPUT ---\n');
        console.log(JSON.stringify(report, null, 2));
    }
}
