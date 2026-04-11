#!/usr/bin/env bun
/**
 * analyse-claude-folder.ts
 * Generic .claude/ folder analysis against CC best practices.
 * Exports analyzers for reuse by extension skills (e.g. cc-upgrade-pai).
 *
 * Usage: bun run scripts/analyse-claude-folder.ts [path]
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';
import {
    type AnalysisResult,
    type AnalyzerFunction,
    emptyResult,
    findFiles,
    getSkillDirs,
    isToolCovered,
    parseSkillFrontmatter,
    runAnalysis,
    formatReport,
} from './shared.ts';

// --- Internal helpers ---

interface ToolCoverageSummary {
    total: number;
    tested: number;
    uncovered: string[]; // relative labels like "skill/sub/file.ts"
}

/**
 * Single-walk accounting for all tool/script sources under a skills dir.
 * Returns total, tested count, and a list of uncovered relative labels —
 * eliminates the former double-iteration (count, then re-walk for specifics).
 */
function walkToolSources(skillsRoot: string, centralTestsDir: string): ToolCoverageSummary {
    const summary: ToolCoverageSummary = { total: 0, tested: 0, uncovered: [] };
    if (!existsSync(skillsRoot)) return summary;
    const memo = new Map<string, boolean>();

    for (const skill of readdirSync(skillsRoot)) {
        for (const sub of ['tools', 'scripts']) {
            const dir = join(skillsRoot, skill, sub);
            if (!existsSync(dir)) continue;
            let files: string[];
            try { files = readdirSync(dir); } catch { continue; }
            for (const f of files) {
                if (!(f.endsWith('.ts') || f.endsWith('.js'))) continue;
                if (f.endsWith('.test.ts') || f.endsWith('.test.js')) continue;
                summary.total++;
                if (isToolCovered(join(dir, f), centralTestsDir, memo)) {
                    summary.tested++;
                } else {
                    summary.uncovered.push(`${skill}/${sub}/${f}`);
                }
            }
        }
    }
    return summary;
}

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

            const coreEvents = ['PreToolUse', 'PostToolUse', 'SessionStart', 'UserPromptSubmit', 'Stop'];
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

    // Progressive disclosure — credit any of three signals:
    //   1. context/references/ subdir (classic UFC)
    //   2. any skill has a references/ subdir
    //   3. context .md files use READ directives
    let progressiveDisclosureSignal = false;
    let signalSource = '';

    if (existsSync(join(contextPath, 'references'))) {
        progressiveDisclosureSignal = true;
        signalSource = 'context/references/';
    }

    if (!progressiveDisclosureSignal) {
        const skillsDir = join(basePath, '.claude', 'skills');
        if (existsSync(skillsDir)) {
            try {
                const skills = readdirSync(skillsDir);
                const withRefs = skills.filter(s => existsSync(join(skillsDir, s, 'references')));
                if (withRefs.length > 0) {
                    progressiveDisclosureSignal = true;
                    signalSource = `${withRefs.length} skill(s) with references/`;
                }
            } catch { /* skip */ }
        }
    }

    if (!progressiveDisclosureSignal) {
        for (const file of mdFiles) {
            try {
                const content = readFileSync(file, 'utf-8');
                if (/\*\*READ:?\*\*|→\s*READ:?|->\s*READ:?/.test(content)) {
                    progressiveDisclosureSignal = true;
                    signalSource = `${basename(file)} uses READ directives`;
                    break;
                }
            } catch { /* skip */ }
        }
    }

    if (progressiveDisclosureSignal) {
        results.score += 5;
        results.findings.push(`OK: Progressive disclosure detected (${signalSource})`);
    } else {
        results.recommendations.push('Use progressive disclosure: references/ subdir or READ directives in context');
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

// --- TDD Compliance Analyzer ---

export function analyzeTddCompliance(basePath: string): AnalysisResult {
    const results = emptyResult(20);
    const claudeDir = join(basePath, '.claude');

    if (!existsSync(claudeDir)) {
        results.findings.push('NO: .claude/ directory not found — cannot assess TDD');
        return results;
    }

    // 1. Test files exist (3 pts)
    const testFiles = findFiles(claudeDir, '.test.ts');
    const specFiles = findFiles(claudeDir, '.test.js');
    const allTests = [...testFiles, ...specFiles];

    if (allTests.length > 0) {
        results.score += 3;
        results.findings.push(`OK: ${allTests.length} test file(s) found`);
    } else {
        results.findings.push('NO: No test files found');
        results.recommendations.push('Add co-located .test.ts files for hooks and tools');
    }

    // 2. Test runner configured (2 pts)
    const pkgJsonPath = join(basePath, 'package.json');
    const bunfigPath = join(basePath, 'bunfig.toml');
    let hasTestRunner = false;

    if (existsSync(pkgJsonPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
            if (pkg.scripts?.test) hasTestRunner = true;
        } catch {}
    }
    if (existsSync(bunfigPath)) {
        const bunfig = readFileSync(bunfigPath, 'utf-8');
        if (bunfig.includes('[test]')) hasTestRunner = true;
    }

    if (hasTestRunner) {
        results.score += 2;
        results.findings.push('OK: Test runner configured');
    } else {
        results.findings.push('--: No test runner configured');
        results.recommendations.push('Add test script to package.json or configure bunfig.toml [test]');
    }

    // 3. Hook test coverage (4 pts) — uses isToolCovered to accept both
    // co-located and centralized `.claude/tests/` test locations.
    const hooksDir = join(claudeDir, 'hooks');
    const centralTestsDir = join(claudeDir, 'tests');
    if (existsSync(hooksDir)) {
        const hookScripts = readdirSync(hooksDir).filter(f =>
            (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.test.ts') && !f.endsWith('.test.js')
        );
        const memo = new Map<string, boolean>();
        const hooksTested = hookScripts.filter(h =>
            isToolCovered(join(hooksDir, h), centralTestsDir, memo)
        );

        if (hookScripts.length > 0) {
            const pct = Math.round((hooksTested.length / hookScripts.length) * 100);
            if (hooksTested.length === hookScripts.length) {
                results.score += 4;
                results.findings.push(`OK: ${hooksTested.length}/${hookScripts.length} hooks have co-located tests (100%)`);
            } else if (hooksTested.length > 0) {
                results.score += 2;
                results.findings.push(`OK: ${hooksTested.length}/${hookScripts.length} hooks have co-located tests (${pct}%)`);
                const untested = hookScripts.filter(h => !hooksTested.includes(h));
                results.recommendations.push(`Add tests for: ${untested.join(', ')}`);
            } else {
                results.findings.push('NO: No hooks have co-located tests');
                results.recommendations.push('Add .test.ts files for hook scripts');
            }
        }
    }

    // 4. Tool test coverage (4 pts) — single walk using isToolCovered which
    // recognizes centralized tests and sibling-CLI transitive coverage.
    const skillsDir = join(claudeDir, 'skills');
    if (existsSync(skillsDir)) {
        const cov = walkToolSources(skillsDir, centralTestsDir);
        if (cov.total > 0) {
            const pct = Math.round((cov.tested / cov.total) * 100);
            if (cov.tested === cov.total) {
                results.score += 4;
                results.findings.push(`OK: ${cov.tested}/${cov.total} tools/scripts covered by tests (100%)`);
            } else if (cov.tested > 0) {
                results.score += 2;
                results.findings.push(`OK: ${cov.tested}/${cov.total} tools/scripts covered by tests (${pct}%)`);
                const preview = cov.uncovered.slice(0, 5).join(', ');
                const more = cov.uncovered.length > 5 ? ` (+${cov.uncovered.length - 5} more)` : '';
                results.recommendations.push(`Add tests for: ${preview}${more}`);
            } else {
                results.findings.push('NO: No tools/scripts have test coverage');
                results.recommendations.push('Add tests for skill tools and scripts');
            }
        }
    }

    // 5. Scenario specs exist (2 pts)
    const specsDir = join(basePath, 'specs');
    if (existsSync(specsDir)) {
        const specMds = readdirSync(specsDir).filter(f => f.endsWith('.md') && f !== 'README.md');
        // Check if any contain Given/When/Then (actual scenarios, not just docs)
        const scenarioFiles = specMds.filter(f => {
            try {
                const content = readFileSync(join(specsDir, f), 'utf-8');
                return content.includes('**Given**') || content.includes('- Given') || content.includes('Given ');
            } catch { return false; }
        });

        if (scenarioFiles.length > 0) {
            results.score += 2;
            results.findings.push(`OK: specs/ directory with ${scenarioFiles.length} scenario file(s)`);
        } else if (specMds.length > 0) {
            results.score += 1;
            results.findings.push(`OK: specs/ directory exists with ${specMds.length} file(s) (no Given/When/Then scenarios found)`);
            results.recommendations.push('Add Given/When/Then scenarios to spec files');
        } else {
            results.findings.push('--: specs/ directory is empty');
            results.recommendations.push('Create scenario specs with Given/When/Then format');
        }
    } else {
        results.findings.push('--: No specs/ directory');
        results.recommendations.push('Create specs/ directory for test scenario definitions');
    }

    // 6. Coverage config (2 pts)
    if (existsSync(bunfigPath)) {
        const bunfig = readFileSync(bunfigPath, 'utf-8');
        if (bunfig.includes('coverage') || bunfig.includes('coverageThreshold')) {
            results.score += 2;
            results.findings.push('OK: Coverage configuration found');
        } else {
            results.findings.push('--: bunfig.toml exists but no coverage config');
            results.recommendations.push('Add coverage configuration to bunfig.toml');
        }
    }

    // 7. Test baseline exists (1 pt)
    if (existsSync(join(basePath, '.test-baseline.xml'))) {
        results.score += 1;
        results.findings.push('OK: Test baseline found (.test-baseline.xml)');
    } else {
        results.findings.push('--: No test baseline');
        results.recommendations.push('Run backtest workflow to establish baseline');
    }

    // 8. No skipped tests (2 pts)
    let skippedCount = 0;
    for (const testFile of allTests) {
        try {
            const content = readFileSync(testFile, 'utf-8');
            const skips = (content.match(/\.skip\(|\.todo\(/g) || []).length;
            skippedCount += skips;
        } catch {}
    }

    if (skippedCount === 0 && allTests.length > 0) {
        results.score += 2;
        results.findings.push('OK: No skipped/todo tests found');
    } else if (skippedCount > 0) {
        results.findings.push(`WARN: ${skippedCount} skipped/todo test(s) found`);
        results.recommendations.push('Fix or remove skipped tests');
    }

    return results;
}

// --- Module registry ---

export const BASE_MODULES: Record<string, AnalyzerFunction> = {
    structure: analyzeStructure,
    skills: analyzeSkills,
    hooks: analyzeHooks,
    tddCompliance: analyzeTddCompliance,
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
