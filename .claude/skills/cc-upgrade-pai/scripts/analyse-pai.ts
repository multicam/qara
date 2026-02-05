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

                const coreEvents = ['PreToolUse', 'PostToolUse', 'SessionStart', 'SessionEnd', 'UserPromptSubmit'];
                const advancedEvents = ['Setup', 'SubagentStart', 'SubagentStop', 'PreCompact', 'Stop'];

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

// --- PAI module registry (base + PAI-specific) ---

const PAI_MODULES: Record<string, AnalyzerFunction> = {
    // Reuse base analyzers directly
    structure: baseStructure,
    context: baseContext,
    agents: baseAgents,
    // PAI-specific (extended versions)
    skillsSystem: analyzeSkillsSystem,
    hooksConfiguration: analyzeHooksConfiguration,
    delegationPatterns: analyzeDelegationPatterns,
    toolIntegration: analyzeToolIntegration,
    workflowPatterns: analyzeWorkflowPatterns,
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

main().catch(console.error);
