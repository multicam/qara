#!/usr/bin/env bun
/**
 * analyse-pai.ts
 * PAI-specific repository analysis extending the base cc-upgrade analysis.
 * Imports shared utilities and base analyzers - no duplication.
 *
 * Usage: bun run scripts/analyse-pai.ts [pai-path]
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Import shared utilities from base skill
import {
    type AnalysisResult,
    type AnalyzerFunction,
    emptyResult,
    findFiles,
    runAnalysis,
    formatReport,
} from '../../cc-upgrade/scripts/shared.ts';

// Import base analyzers to include in PAI analysis
import {
    analyzeStructure as baseStructure,
    analyzeContext as baseContext,
    analyzeAgents as baseAgents,
    analyzeTddCompliance as baseTddCompliance,
} from '../../cc-upgrade/scripts/analyse-claude-folder.ts';

// Import infrastructure-layer analyzers from lib
import {
    analyzeSkillsSystem,
    analyzeHooksConfiguration,
    analyzeDelegationPatterns,
    analyzeToolIntegration,
    analyzeWorkflowPatterns,
} from './analyse-pai-lib.ts';

// Re-export everything from lib for backward compatibility
export * from './analyse-pai-lib.ts';

// --- Deep PAI analyzers (depend on base analyzers, kept here) ---

/** PAI-specific TDD compliance extension (layers on top of base TDD check) */
export function analyzeTddCompliancePAI(paiPath: string): AnalysisResult {
    // Run base TDD compliance first
    const base = baseTddCompliance(paiPath);
    const results = emptyResult(20);

    const claudeDir = join(paiPath, '.claude');
    if (!existsSync(claudeDir)) return results;

    // 1. TDD enforcement hook registered (3 pts)
    const settingsPath = join(claudeDir, 'settings.json');
    if (existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
            const preToolUse = settings.hooks?.PreToolUse || [];
            const hasTddHook = preToolUse.some((entry: any) =>
                entry.hooks?.some((h: any) => typeof h.command === 'string' && h.command.includes('pre-tool-use-tdd'))
            );
            if (hasTddHook) {
                results.score += 3;
                results.findings.push('OK: TDD enforcement hook registered in settings.json');
            } else {
                results.findings.push('NO: TDD enforcement hook not registered');
                results.recommendations.push('Add pre-tool-use-tdd.ts hook for Write/Edit matchers in settings.json');
            }
        } catch {
            results.findings.push('WARN: Could not parse settings.json for TDD hook check');
        }
    }

    // 2. TDD state library exists (2 pts)
    if (existsSync(join(claudeDir, 'hooks', 'lib', 'tdd-state.ts'))) {
        results.score += 2;
        results.findings.push('OK: TDD state management library present');
    } else {
        results.findings.push('--: No tdd-state.ts library');
        results.recommendations.push('Create hooks/lib/tdd-state.ts for TDD cycle state management');
    }

    // 3. tdd-qa skill installed (3 pts)
    const tddQaDir = join(claudeDir, 'skills', 'tdd-qa');
    if (existsSync(tddQaDir)) {
        const workflows = existsSync(join(tddQaDir, 'workflows'))
            ? readdirSync(join(tddQaDir, 'workflows')).filter(f => f.endsWith('.md')).length
            : 0;
        results.score += 3;
        results.findings.push(`OK: tdd-qa skill installed (${workflows} workflows)`);
    } else {
        results.findings.push('NO: tdd-qa skill not installed');
        results.recommendations.push('Install tdd-qa skill for TDD workflow orchestration');
    }

    // 4. Hook test coverage (3 pts) — checks both co-located and .claude/tests/
    const hooksDir = join(claudeDir, 'hooks');
    if (existsSync(hooksDir)) {
        const hookScripts = readdirSync(hooksDir).filter(f =>
            f.endsWith('.ts') && !f.endsWith('.test.ts')
        );
        const hookTests = readdirSync(hooksDir).filter(f => f.endsWith('.test.ts'));
        const testsDir = join(claudeDir, 'tests');
        const centralTests = existsSync(testsDir) ? readdirSync(testsDir).filter(f => f.endsWith('.test.ts')) : [];
        const allTests = [...hookTests, ...centralTests];
        const tested = hookScripts.filter(h => {
            const base = h.replace(/\.ts$/, '');
            return allTests.some(t => t.includes(base) || t.includes(base.replace(/-/g, '_')));
        });
        const pct = hookScripts.length > 0 ? Math.round((tested.length / hookScripts.length) * 100) : 0;
        if (pct === 100) {
            results.score += 3;
            results.findings.push(`OK: ${pct}% hook test coverage (${tested.length}/${hookScripts.length})`);
        } else if (pct >= 50) {
            results.score += 1;
            results.findings.push(`OK: ${pct}% hook test coverage (${tested.length}/${hookScripts.length})`);
        } else {
            results.findings.push(`WARN: ${pct}% hook test coverage (${tested.length}/${hookScripts.length})`);
        }
    }

    // 5. Tool test coverage (3 pts) — reuses base finding
    const toolFinding = base.findings.find(f => f.includes('tools/scripts have co-located'));
    if (toolFinding && toolFinding.includes('100%')) {
        results.score += 3;
        results.findings.push('OK: 100% tool/script test coverage');
    } else if (toolFinding) {
        results.score += 1;
        results.findings.push(toolFinding);
    }

    // 6. Mutation testing configured (2 pts)
    if (existsSync(join(paiPath, 'stryker.config.json'))) {
        results.score += 2;
        results.findings.push('OK: Mutation testing configured (stryker.config.json)');
    } else {
        results.findings.push('--: Mutation testing not configured');
        results.recommendations.push('Add stryker.config.json for mutation testing (advisory)');
    }

    // 7. Quality gates documented (2 pts)
    const qgPath = join(claudeDir, 'skills', 'tdd-qa', 'references', 'quality-gates.md');
    if (existsSync(qgPath)) {
        results.score += 2;
        results.findings.push('OK: Quality gates documented');
    } else {
        results.findings.push('--: No quality gates documentation');
    }

    // 8. Test count healthy (2 pts)
    const allTests = findFiles(claudeDir, '.test.ts');
    if (allTests.length >= 20) {
        results.score += 2;
        results.findings.push(`OK: ${allTests.length} test files (healthy)`);
    } else if (allTests.length > 0) {
        results.score += 1;
        results.findings.push(`WARN: only ${allTests.length} test files (threshold: 20)`);
    } else {
        results.findings.push('NO: No test files found');
    }

    return results;
}

/** Analyze execution mode system (drive/cruise/turbo) */
export function analyzeModeSystem(paiPath: string): AnalysisResult {
    const results = emptyResult(20);
    const claudeDir = join(paiPath, '.claude');
    if (!existsSync(claudeDir)) return results;

    // 1. Mode state library (3 pts)
    if (existsSync(join(claudeDir, 'hooks', 'lib', 'mode-state.ts'))) {
        results.score += 3;
        results.findings.push('OK: Mode state management library present');
    } else {
        results.findings.push('NO: No mode-state.ts library');
        results.recommendations.push('Create hooks/lib/mode-state.ts for execution mode lifecycle');
    }

    // 2. Keyword router (3 pts)
    if (existsSync(join(claudeDir, 'hooks', 'keyword-router.ts'))) {
        results.score += 3;
        results.findings.push('OK: Keyword router hook present');
    } else {
        results.findings.push('NO: No keyword-router.ts hook');
    }

    // 3. Keyword routes config (2 pts)
    const routesPath = join(claudeDir, 'hooks', 'lib', 'keyword-routes.json');
    if (existsSync(routesPath)) {
        results.score += 2;
        try {
            const routes = JSON.parse(readFileSync(routesPath, 'utf-8'));
            const modeCount = Object.keys(routes).filter(k => routes[k].activatesMode).length;
            results.findings.push(`OK: ${modeCount} execution modes configured`);

            // Check for bare-word false positive risk
            for (const [name, route] of Object.entries(routes) as [string, any][]) {
                if (route.patterns?.some((p: string) => p === `\\b${name}\\b`)) {
                    results.findings.push(`WARN: Route '${name}' has bare-word pattern — false positive risk`);
                    results.recommendations.push(`Tighten '${name}' pattern to require colon or 'mode' suffix`);
                }
            }
        } catch {
            results.findings.push('WARN: Could not parse keyword-routes.json');
        }
    }

    // 4. Mode skills exist (3 pts)
    const modeSkills = ['drive', 'cruise', 'turbo'];
    let foundModes = 0;
    for (const mode of modeSkills) {
        if (existsSync(join(claudeDir, 'skills', mode, 'SKILL.md'))) {
            foundModes++;
        } else {
            results.findings.push(`--: Missing ${mode} mode skill`);
        }
    }
    if (foundModes === modeSkills.length) {
        results.score += 3;
        results.findings.push('OK: All 3 mode skills present (drive, cruise, turbo)');
    } else if (foundModes > 0) {
        results.score += 1;
        results.findings.push(`OK: ${foundModes}/${modeSkills.length} mode skills present`);
    }

    // 5. Working memory (3 pts)
    if (existsSync(join(claudeDir, 'hooks', 'lib', 'working-memory.ts'))) {
        results.score += 3;
        results.findings.push('OK: Working memory library present');
    } else {
        results.findings.push('--: No working-memory.ts');
        results.recommendations.push('Add working-memory.ts for session-scoped persistence');
    }

    // 6. Compact checkpoint (3 pts)
    if (existsSync(join(claudeDir, 'hooks', 'lib', 'compact-checkpoint.ts')) &&
        existsSync(join(claudeDir, 'hooks', 'pre-compact.ts'))) {
        results.score += 3;
        results.findings.push('OK: Compact checkpoint system present (lib + hook)');
    } else {
        results.findings.push('--: Compact checkpoint incomplete');
        results.recommendations.push('Add compact-checkpoint.ts + pre-compact.ts for state recovery');
    }

    // 7. Stop hook with mode continuation (3 pts) — the control-flow seam that
    // makes persistent modes work: Stop reads mode-state and decides to continue
    // or deactivate. Without this, modes can't persist across model turns.
    const stopHookPath = join(claudeDir, 'hooks', 'stop-hook.ts');
    if (existsSync(stopHookPath)) {
        try {
            const stopContent = readFileSync(stopHookPath, 'utf-8');
            if (/mode-?state|readModeState|modeState/i.test(stopContent)) {
                results.score += 3;
                results.findings.push('OK: Stop hook wires mode continuation (Factor 8: own control flow)');
            } else {
                results.findings.push('WARN: stop-hook.ts present but does not reference mode-state');
                results.recommendations.push('Wire Stop hook to mode-state for mode continuation loop');
            }
        } catch {
            results.findings.push('WARN: Could not read stop-hook.ts');
        }
    } else {
        results.findings.push('--: No stop-hook.ts');
        results.recommendations.push('Add stop-hook.ts reading mode-state for continuation loop');
    }

    return results;
}

// --- PAI module registry (base + PAI-specific) ---

export const PAI_MODULES: Record<string, AnalyzerFunction> = {
    // Reuse base analyzers directly
    structure: baseStructure,
    context: baseContext,
    agents: baseAgents,
    tddCompliance: baseTddCompliance,
    // PAI-specific (extended versions)
    skillsSystem: analyzeSkillsSystem,
    hooksConfiguration: analyzeHooksConfiguration,
    delegationPatterns: analyzeDelegationPatterns,
    toolIntegration: analyzeToolIntegration,
    workflowPatterns: analyzeWorkflowPatterns,
    tddCompliancePAI: analyzeTddCompliancePAI,
    modeSystem: analyzeModeSystem,
};

// --- Main ---

async function main(): Promise<void> {
    const paiPath = process.argv[2] || process.cwd();

    console.log('Analyzing PAI repository...\n');

    const report = runAnalysis(paiPath, PAI_MODULES);
    console.log(formatReport(report, 'PAI OPTIMIZATION ANALYSIS'));

    if (process.argv.includes('--json')) {
        console.log('\n--- JSON OUTPUT ---\n');
        console.log(JSON.stringify(report, null, 2));
    }
}

// Direct execution guard
const isDirectExecution =
    import.meta.path === Bun.main || process.argv[1]?.endsWith('analyse-pai.ts');
if (isDirectExecution && !process.env.ANALYSE_PAI_NO_CLI) {
    main().catch(console.error);
}
