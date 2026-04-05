#!/usr/bin/env bun
/**
 * analyse-pai.ts
 * PAI-specific repository analysis extending the base cc-upgrade analysis.
 * Imports shared utilities and base analyzers - no duplication.
 *
 * Usage: bun run scripts/analyse-pai.ts [pai-path]
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Import shared utilities from base skill
import {
    type AnalysisResult,
    type AnalyzerFunction,
    emptyResult,
    findFiles,
    getSkillDirs,
    parseSkillFrontmatter,
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

// --- PAI-specific analyzers ---

/** Extended skills analysis with PAI-specific checks */
function analyzeSkillsSystem(paiPath: string): AnalysisResult {
    const results = emptyResult(28);
    const skillsPath = join(paiPath, '.claude', 'skills');
    const rulesPath = join(paiPath, '.claude', 'rules');

    if (existsSync(rulesPath) && !existsSync(skillsPath)) {
        results.findings.push('WARN: Using legacy .claude/rules/ - migrate to .claude/skills/');
        results.recommendations.push('Migrate from .claude/rules/ to .claude/skills/ for PAI v2.x');
    }

    if (!existsSync(skillsPath)) {
        results.findings.push('--: No skills directory');
        results.recommendations.push('Create .claude/skills/ to define reusable capabilities');
        return results;
    }

    results.score += 5;
    results.findings.push('OK: Skills directory exists');

    const skillDirs = getSkillDirs(skillsPath);
    results.findings.push(`Found ${skillDirs.length} skill(s)`);

    let wellFormedSkills = 0;
    let hasInvocableSkill = false;
    let hasForkContextSkill = false;

    for (const skillDir of skillDirs) {
        const skillMdPath = join(skillsPath, skillDir, 'SKILL.md');
        const parsed = parseSkillFrontmatter(skillMdPath);

        if (!existsSync(skillMdPath)) {
            results.findings.push(`WARN: ${skillDir}/ missing SKILL.md`);
            results.recommendations.push(`Add SKILL.md to ${skillDir}/ with proper frontmatter`);
            continue;
        }

        if (parsed.valid) {
            wellFormedSkills++;

            if (parsed.context === 'fork') {
                hasForkContextSkill = true;
                results.findings.push(`OK: ${skillDir}: fork context (subagent)`);
            } else {
                results.findings.push(`OK: ${skillDir}: same context`);
            }

            if (/invocable|user-invocable|slash command/i.test(parsed.content)) {
                hasInvocableSkill = true;
            }
        } else {
            const issues: string[] = [];
            if (!parsed.content.startsWith('---')) issues.push('missing frontmatter');
            if (!parsed.name) issues.push('missing name');
            results.findings.push(`WARN: ${skillDir}: ${issues.join(', ')}`);
        }

        // Check subdirectory structure
        const hasReferences = existsSync(join(skillsPath, skillDir, 'references'));
        const hasScripts = existsSync(join(skillsPath, skillDir, 'scripts'));
        const hasWorkflows = existsSync(join(skillsPath, skillDir, 'workflows'));

        if (hasReferences || hasScripts || hasWorkflows) {
            const parts = [hasReferences && 'references', hasScripts && 'scripts', hasWorkflows && 'workflows'].filter(Boolean);
            results.findings.push(`  -> Has: ${parts.join(', ')}`);
        }
    }

    if (wellFormedSkills === skillDirs.length && skillDirs.length > 0) {
        results.score += 10;
        results.findings.push('OK: All skills have proper SKILL.md format');
    } else if (wellFormedSkills > 0) {
        results.score += 5;
    }

    if (hasForkContextSkill) {
        results.score += 5;
        results.findings.push('OK: Has fork-context skills (isolated execution)');
    }

    if (hasInvocableSkill) {
        results.score += 5;
        results.findings.push('OK: Has user-invocable skills');
    } else {
        results.recommendations.push('Consider making skills user-invocable with Skill tool');
    }

    // Check for session ID substitution (CC 2.1.9, Factor 5)
    let skillsWithSessionId = 0;
    for (const skillDir of skillDirs) {
        const skillMdPath = join(skillsPath, skillDir, 'SKILL.md');
        const parsed = parseSkillFrontmatter(skillMdPath);
        if (parsed.content.includes('${CLAUDE_SESSION_ID}') || parsed.content.includes('CURRENT_SESSION')) {
            skillsWithSessionId++;
        }
    }

    if (skillsWithSessionId > 0) {
        results.score += 3;
        results.findings.push(`OK: ${skillsWithSessionId} skill(s) use session ID substitution (CC 2.1.9, Factor 5)`);
    } else if (skillDirs.length > 0) {
        results.recommendations.push('Use ${CLAUDE_SESSION_ID} in skills for session tracking (CC 2.1.9)');
    }

    return results;
}

/** Extended hooks analysis with PAI-specific checks */
function analyzeHooksConfiguration(paiPath: string): AnalysisResult {
    const results = emptyResult(26);
    const hooksDir = join(paiPath, '.claude', 'hooks');
    const settingsPath = join(paiPath, '.claude', 'settings.json');

    let hasHooksDir = false;
    let hookScripts: string[] = [];
    if (existsSync(hooksDir)) {
        hasHooksDir = true;
        hookScripts = readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.sh'));
        results.findings.push(`Hooks directory: ${hookScripts.length} script(s)`);
    }

    if (existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

            if (settings.hooks && typeof settings.hooks === 'object') {
                const hookEvents = Object.keys(settings.hooks);
                results.score += 10;
                results.findings.push(`OK: Hooks configured in settings.json: ${hookEvents.join(', ')}`);

                const coreEvents = ['PreToolUse', 'PostToolUse', 'SessionStart', 'UserPromptSubmit', 'Stop', 'ConfigChange'];
                const advancedEvents = ['PostToolUseFailure', 'SubagentStart', 'SubagentStop', 'PreCompact'];

                const missingCoreEvents = coreEvents.filter(e => !hookEvents.includes(e));

                if (missingCoreEvents.length === 0) {
                    results.score += 5;
                    results.findings.push('OK: All core hook events configured');
                } else if (missingCoreEvents.length < 3) {
                    results.score += 2;
                    results.findings.push(`--: Missing core hook events: ${missingCoreEvents.join(', ')}`);
                }

                const configuredAdvanced = advancedEvents.filter(e => hookEvents.includes(e));
                if (configuredAdvanced.length > 0) {
                    results.score += 3;
                    results.findings.push(`OK: Advanced hook events: ${configuredAdvanced.join(', ')}`);
                }

                if (hookEvents.includes('Setup')) {
                    results.findings.push('OK: Setup hook configured (--init automation, Factor 6)');
                } else {
                    results.recommendations.push('Add Setup hook for repository initialization (CC 2.1.13, Factor 6)');
                }

                if (hookEvents.includes('PreToolUse')) {
                    results.findings.push('OK: PreToolUse hooks enabled (event capture/validation)');
                }
                if (hookEvents.includes('SessionStart') || hookEvents.includes('SessionEnd')) {
                    results.findings.push('OK: Session lifecycle hooks enabled');
                }

            } else {
                results.findings.push('--: No hooks configured in settings.json');
                results.recommendations.push('Configure hooks in settings.json for CC 2.1.x automation');
            }

            if (settings.statusLine) {
                results.score += 5;
                results.findings.push('OK: Status line configured');
            }

        } catch {
            results.findings.push('WARN: Could not parse settings.json');
        }
    } else {
        results.findings.push('NO: No settings.json found');
        results.recommendations.push('Create settings.json with hooks configuration');
    }

    // Hook output schema compliance (CC 2.1.14)
    if (hasHooksDir && hookScripts.length > 0) {
        let correctOutputFormat = 0;
        let incorrectOutputFormat = 0;
        let usesAdditionalContext = false;

        for (const script of hookScripts) {
            if (script.includes('.test.') || script === 'lib') continue;

            const scriptPath = join(hooksDir, script);
            if (!statSync(scriptPath).isFile()) continue;

            try {
                const content = readFileSync(scriptPath, 'utf-8');

                const hasCorrectDecision = /decision['"]?\s*:\s*['"](?:approve|block)['"]/i.test(content) &&
                                          !/decision['"]?\s*:\s*['"](?:APPROVED|BLOCKED)['"]/i.test(content);
                const hasCorrectContinue = /continue['"]?\s*:\s*(?:true|false|shouldContinue)/i.test(content);

                if (hasCorrectDecision || hasCorrectContinue) {
                    correctOutputFormat++;
                }

                if (/['"](?:APPROVED|BLOCKED)['"]/i.test(content) && !/['"]approve['"]|['"]block['"]/i.test(content)) {
                    incorrectOutputFormat++;
                    results.findings.push(`WARN: ${script}: Uses uppercase APPROVED/BLOCKED (should be lowercase)`);
                }

                if (content.includes('additionalContext')) {
                    usesAdditionalContext = true;
                }
            } catch { /* skip unreadable files */ }
        }

        if (correctOutputFormat > 0 && incorrectOutputFormat === 0) {
            results.score += 2;
            results.findings.push('OK: Hook output format compliant (CC 2.1.14)');
        } else if (incorrectOutputFormat > 0) {
            results.recommendations.push(`Fix ${incorrectOutputFormat} hook(s) using uppercase decision values`);
        }

        if (usesAdditionalContext) {
            results.score += 2;
            results.findings.push('OK: Hooks use additionalContext injection (CC 2.1.9, Factor 3)');
        } else {
            results.recommendations.push('PreToolUse hooks can inject additionalContext to model (CC 2.1.9)');
        }
    }

    // Keybindings (CC 2.1.18)
    const keybindingsPath = join(paiPath, '.claude', 'keybindings.json');
    const homeKeybindingsPath = join(process.env.HOME || '', '.claude', 'keybindings.json');

    if (existsSync(keybindingsPath)) {
        results.score += 2;
        results.findings.push('OK: Project keybindings.json configured (CC 2.1.18)');
    } else if (existsSync(homeKeybindingsPath)) {
        results.score += 1;
        results.findings.push('OK: Global keybindings.json configured (CC 2.1.18)');
    } else {
        results.recommendations.push('Add keybindings.json for custom shortcuts (CC 2.1.18)');
    }

    // Legacy hooks.json check
    if (existsSync(join(paiPath, '.claude', 'hooks.json'))) {
        results.findings.push('WARN: Legacy hooks.json detected - migrate to settings.json');
        results.recommendations.push('Migrate hooks.json to settings.json hooks section');
    }

    return results;
}

/** Analyze delegation patterns (multi-agent) */
function analyzeDelegationPatterns(paiPath: string): AnalysisResult {
    const results = emptyResult(15);
    const allMdFiles = findFiles(paiPath, '.md');

    let hasDelegationGuide = false;
    let hasParallelPatterns = false;
    let hasAgentHierarchy = false;

    for (const file of allMdFiles) {
        const content = readFileSync(file, 'utf-8').toLowerCase();
        const relativePath = relative(paiPath, file);

        if (relativePath.includes('delegation') || content.includes('delegation-guide')) {
            hasDelegationGuide = true;
            results.findings.push(`OK: Delegation guide: ${relativePath}`);
        }

        if (content.includes('parallel') && (content.includes('agent') || content.includes('task tool'))) {
            hasParallelPatterns = true;
        }

        if (content.includes('agent-guide') || content.includes('agent hierarchy') || content.includes('orchestrator')) {
            hasAgentHierarchy = true;
        }
    }

    if (hasDelegationGuide) {
        results.score += 5;
    } else {
        results.recommendations.push('Create delegation guide for multi-agent workflows');
    }

    if (hasParallelPatterns) {
        results.score += 5;
        results.findings.push('OK: Parallel agent patterns documented');
    } else {
        results.recommendations.push('Document parallel agent execution patterns');
    }

    if (hasAgentHierarchy) {
        results.score += 5;
        results.findings.push('OK: Agent hierarchy/roles documented');
    } else {
        results.recommendations.push('Define agent hierarchy and escalation paths');
    }

    // Check commands for delegation usage
    const commandsDir = join(paiPath, '.claude', 'commands');
    if (existsSync(commandsDir)) {
        const commands = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
        let commandsWithDelegation = 0;

        for (const cmd of commands) {
            const content = readFileSync(join(commandsDir, cmd), 'utf-8');
            if (content.includes('Task tool') || content.includes('subagent') || content.includes('parallel')) {
                commandsWithDelegation++;
            }
        }

        if (commandsWithDelegation > 0) {
            results.findings.push(`OK: ${commandsWithDelegation} command(s) use delegation patterns`);
        }
    }

    return results;
}

/** Analyze tool/MCP integration */
function analyzeToolIntegration(paiPath: string): AnalysisResult {
    const results = emptyResult(10);

    if (existsSync(join(paiPath, '.claude', 'context', 'tools'))) {
        results.score += 5;
        results.findings.push('OK: Tools context documentation exists');
    } else {
        results.findings.push('--: No tools context directory (optional)');
    }

    const settingsPath = join(paiPath, '.claude', 'settings.json');
    if (existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
            if (settings.enabledMcpjsonServers || settings.enableAllProjectMcpServers) {
                results.score += 5;
                results.findings.push('OK: MCP server configuration present');
            }
        } catch { /* ignore */ }
    }

    return results;
}

/** Analyze workflow patterns */
function analyzeWorkflowPatterns(paiPath: string): AnalysisResult {
    const results = emptyResult(20);
    const commandsPath = join(paiPath, '.claude', 'commands');

    if (existsSync(commandsPath)) {
        const commands = readdirSync(commandsPath).filter(f => f.endsWith('.md'));
        results.score += 5;
        results.findings.push(`OK: Found ${commands.length} command workflows`);

        for (const cmd of commands.slice(0, 5)) {
            const content = readFileSync(join(commandsPath, cmd), 'utf-8');
            const hasSteps = content.includes('##') || content.includes('1.') || content.includes('Step');
            if (!hasSteps) {
                results.findings.push(`WARN: Command '${cmd}' lacks step structure`);
            }
        }
    } else {
        results.findings.push('--: No commands directory');
        results.recommendations.push('Create reusable workflows in .claude/commands/');
    }

    const hooksPath = join(paiPath, '.claude', 'hooks');
    if (existsSync(hooksPath)) {
        const hooks = readdirSync(hooksPath);
        results.score += 5;
        results.findings.push(`OK: Found ${hooks.length} automation hooks`);
    } else {
        results.recommendations.push('Add hooks for event-based automation');
    }

    if (existsSync(join(paiPath, '.claude', 'context', 'working'))) {
        results.score += 5;
        results.findings.push('OK: Working directory for active state exists');
    } else {
        results.recommendations.push('Create .claude/context/working/ for unified execution state');
    }

    const allFiles = findFiles(paiPath, '.md');
    const hasControlFlow = allFiles.some(f => {
        const content = readFileSync(f, 'utf-8');
        return content.includes('workflow') || content.includes('pipeline');
    });

    if (hasControlFlow) {
        results.score += 5;
        results.findings.push('OK: Custom control flow patterns detected');
    } else {
        results.recommendations.push('Define explicit control flow in command files');
    }

    return results;
}

/** PAI-specific TDD compliance extension (layers on top of base TDD check) */
function analyzeTddCompliancePAI(paiPath: string): AnalysisResult {
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

    // 4. Hook test coverage (3 pts)
    const hooksDir = join(claudeDir, 'hooks');
    if (existsSync(hooksDir)) {
        const hookScripts = readdirSync(hooksDir).filter(f =>
            f.endsWith('.ts') && !f.endsWith('.test.ts')
        );
        const hookTests = readdirSync(hooksDir).filter(f => f.endsWith('.test.ts'));
        const tested = hookScripts.filter(h => {
            const base = h.replace(/\.ts$/, '');
            return hookTests.some(t => t.startsWith(base));
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
function analyzeModeSystem(paiPath: string): AnalysisResult {
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

    return results;
}

// --- PAI module registry (base + PAI-specific) ---

const PAI_MODULES: Record<string, AnalyzerFunction> = {
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

// Exports for testing
export {
    analyzeSkillsSystem,
    analyzeHooksConfiguration,
    analyzeDelegationPatterns,
    analyzeToolIntegration,
    analyzeWorkflowPatterns,
    analyzeTddCompliancePAI,
    analyzeModeSystem,
    PAI_MODULES,
};

// Direct execution guard
const isDirectExecution =
    import.meta.path === Bun.main || process.argv[1]?.endsWith('analyse-pai.ts');
if (isDirectExecution && !process.env.ANALYSE_PAI_NO_CLI) {
    main().catch(console.error);
}
