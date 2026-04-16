/**
 * analyse-pai-lib.ts — PAI-specific analysis functions (infrastructure layer).
 *
 * Contains: analyzeSkillsSystem, analyzeHooksConfiguration,
 * analyzeDelegationPatterns, analyzeToolIntegration, analyzeWorkflowPatterns.
 *
 * Imported by analyse-pai.ts (orchestration + deeper analyzers) and by tests.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, basename } from 'path';

// Import shared utilities from base skill
import {
    type AnalysisResult,
    emptyResult,
    findFiles,
    getSkillDirs,
    parseSkillFrontmatter,
} from '../../cc-upgrade/scripts/shared.ts';

// --- PAI-specific analyzers ---

/** Extended skills analysis with PAI-specific checks */
export function analyzeSkillsSystem(paiPath: string): AnalysisResult {
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
export function analyzeHooksConfiguration(paiPath: string): AnalysisResult {
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
                } else if (hookEvents.includes('SessionStart')) {
                    results.findings.push('OK: SessionStart covers initialization (Setup hook optional for single-dev repos)');
                } else {
                    results.recommendations.push('Add Setup or SessionStart hook for initialization (CC 2.1.13, Factor 6)');
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
export function analyzeDelegationPatterns(paiPath: string): AnalysisResult {
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
export function analyzeToolIntegration(paiPath: string): AnalysisResult {
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
export function analyzeWorkflowPatterns(paiPath: string): AnalysisResult {
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

// ── Safe fs helpers shared by MCP + other analyzers ─────────────────────────

/** Read and JSON.parse a file. Returns null on any error (missing, malformed, permission). */
function readJsonSafe<T>(path: string): T | null {
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, 'utf-8')) as T;
    } catch {
        return null;
    }
}

/** True iff file exists AND its content matches the pattern. */
function fileContainsPattern(path: string, pattern: RegExp): boolean {
    if (!existsSync(path)) return false;
    try {
        return pattern.test(readFileSync(path, 'utf-8'));
    } catch {
        return false;
    }
}

/**
 * Analyze jcodemunch MCP configuration, indexing state, and wiring into code-exploration workflows.
 *
 * Added 2026-04-16 after the activation audit found 0 invocations in 16 sessions since 2026-04-15
 * activation. The tool is only useful if (a) registered, (b) indexed, (c) surfaced in agent
 * definitions so Claude reaches for it. This analyzer checks all three.
 *
 * Max score 20.
 */
export function analyzeMcpJcodemunch(paiPath: string): AnalysisResult {
    const results = emptyResult(20);

    // 1. `.mcp.json` contains jcodemunch entry (2 pts)
    const mcpJsonPath = join(paiPath, '.mcp.json');
    const mcp = readJsonSafe<{ mcpServers?: Record<string, unknown> }>(mcpJsonPath);
    const mcpRegistered = !!mcp?.mcpServers?.jcodemunch;
    if (mcpRegistered) {
        results.score += 2;
        results.findings.push('OK: jcodemunch MCP registered in .mcp.json');
    } else if (mcp !== null) {
        results.findings.push('--: jcodemunch not in .mcp.json');
        results.recommendations.push('Add jcodemunch to .mcp.json mcpServers');
    } else if (existsSync(mcpJsonPath)) {
        results.findings.push('WARN: Could not parse .mcp.json');
    } else {
        results.findings.push('--: No .mcp.json at project root');
    }

    // 2. `enabledMcpjsonServers` whitelist includes jcodemunch (2 pts)
    if (mcpRegistered) {
        const settings = readJsonSafe<{ enabledMcpjsonServers?: string[]; enableAllProjectMcpServers?: boolean }>(
            join(paiPath, '.claude', 'settings.json')
        );
        const whitelist = settings?.enabledMcpjsonServers;
        if (Array.isArray(whitelist) && whitelist.includes('jcodemunch')) {
            results.score += 2;
            results.findings.push('OK: jcodemunch in settings.json enabledMcpjsonServers');
        } else if (settings?.enableAllProjectMcpServers === true) {
            results.score += 2;
            results.findings.push('OK: enableAllProjectMcpServers=true covers jcodemunch');
        } else if (settings) {
            results.findings.push('WARN: jcodemunch registered but not in enabledMcpjsonServers whitelist');
            results.recommendations.push('Add "jcodemunch" to enabledMcpjsonServers in .claude/settings.json');
        }
    }

    // 3. `.jcodemunch.jsonc` has ignore patterns (2 pts)
    const jcmConfigPath = join(paiPath, '.jcodemunch.jsonc');
    const hasIgnores = fileContainsPattern(jcmConfigPath, /extra_ignore_patterns/);
    const hasTrusted = fileContainsPattern(jcmConfigPath, /trusted_folders/);
    if (existsSync(jcmConfigPath)) {
        if (hasIgnores && hasTrusted) {
            results.score += 2;
            results.findings.push('OK: .jcodemunch.jsonc sets trusted_folders + extra_ignore_patterns');
        } else {
            results.score += 1;
            const missing: string[] = [];
            if (!hasIgnores) missing.push('extra_ignore_patterns');
            if (!hasTrusted) missing.push('trusted_folders');
            results.findings.push(`WARN: .jcodemunch.jsonc missing ${missing.join(', ')}`);
            results.recommendations.push(`Add ${missing.join(' + ')} to .jcodemunch.jsonc`);
        }
    } else {
        results.findings.push('--: No .jcodemunch.jsonc (per-index config absent)');
        results.recommendations.push('Create .jcodemunch.jsonc with trusted_folders + extra_ignore_patterns');
    }

    // 4. Index exists for this repo (3 pts) — check ~/.code-index/ for local/* dbs
    // Path-resolved via jcodemunch's deterministic hash, so we heuristically look
    // for any local/<reponame>-* index db in the user's cache. Resolve paiPath
    // to absolute so `.` or other relative paths still yield a real dir name.
    const codeIndexDir = join(process.env.HOME || '', '.code-index');
    let indexExists = false;
    let indexMtime: Date | null = null;
    if (existsSync(codeIndexDir)) {
        try {
            const entries = readdirSync(codeIndexDir);
            const projectName = basename(resolve(paiPath)) || 'qara';
            const dbFiles = entries.filter(f => f.endsWith('.db') && f.includes(`${projectName}-`));
            if (dbFiles.length > 0) {
                indexExists = true;
                const statPath = join(codeIndexDir, dbFiles[0]);
                indexMtime = statSync(statPath).mtime;
                results.score += 3;
                results.findings.push(`OK: jcodemunch index db exists (${dbFiles[0]}, ${(statSync(statPath).size / 1024).toFixed(0)} KB)`);
            } else {
                // Fall back: any db file is better than none (may be scoped to subfolder)
                const anyDb = entries.filter(f => f.endsWith('.db'));
                if (anyDb.length > 0) {
                    results.score += 1;
                    results.findings.push(`WARN: Index db present but not for this repo (${anyDb.length} other db(s)); re-run index_folder on ${paiPath}`);
                    results.recommendations.push(`Run mcp__jcodemunch__index_folder({path: "${paiPath}"}) to index this repo`);
                } else {
                    results.findings.push('--: No index db in ~/.code-index/ — never indexed');
                    results.recommendations.push(`Run mcp__jcodemunch__index_folder({path: "${paiPath}", use_ai_summaries: false})`);
                }
            }
        } catch { /* ignore */ }
    } else {
        results.findings.push('--: ~/.code-index/ does not exist (jcodemunch never run)');
    }

    // 5. Index freshness — warn if >7 days old (2 pts)
    if (indexMtime) {
        const daysOld = (Date.now() - indexMtime.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) {
            results.score += 2;
            results.findings.push(`OK: Index fresh (${daysOld.toFixed(1)} days old)`);
        } else {
            results.score += 1;
            results.findings.push(`WARN: Index is ${daysOld.toFixed(0)} days old`);
            results.recommendations.push('Re-index: mcp__jcodemunch__index_folder({path: "<repo>", use_ai_summaries: false})');
        }
    }

    // 6. Agent surfacing — do codebase-analyzer.md + engineer.md mention jcodemunch? (3 pts)
    const agentsPath = join(paiPath, '.claude', 'agents');
    const targetAgents = ['codebase-analyzer.md', 'codebase-analyzer-low.md', 'engineer.md', 'engineer-high.md'];
    const jcmMentionPattern = /mcp__jcodemunch__|jcodemunch[ -]first|jcodemunch MCP/i;
    if (existsSync(agentsPath)) {
        const missing = targetAgents.filter(
            agent => !fileContainsPattern(join(agentsPath, agent), jcmMentionPattern)
        );
        const wired = targetAgents.length - missing.length;
        if (wired === targetAgents.length) {
            results.score += 3;
            results.findings.push(`OK: All ${wired} code-exploration agents reference jcodemunch`);
        } else if (wired > 0) {
            results.score += Math.ceil(3 * wired / targetAgents.length);
            results.findings.push(`WARN: Only ${wired}/${targetAgents.length} code agents mention jcodemunch (missing: ${missing.join(', ')})`);
            results.recommendations.push(`Add jcodemunch-first protocol to: ${missing.join(', ')}`);
        } else {
            results.findings.push('NO: No code-exploration agents reference jcodemunch — tool will not be used');
            results.recommendations.push('Update codebase-analyzer, codebase-analyzer-low, engineer, engineer-high to prefer jcodemunch MCP for symbol-level queries');
        }
    }

    // 7. Routing surface — delegation-guide or routing-cheatsheet mention jcodemunch (2 pts)
    const routingDocs = [
        join(paiPath, '.claude', 'context', 'delegation-guide.md'),
        join(paiPath, '.claude', 'context', 'routing-cheatsheet.md'),
    ];
    const surfaceCount = routingDocs.filter(p => fileContainsPattern(p, /jcodemunch/i)).length;
    if (surfaceCount === 2) {
        results.score += 2;
        results.findings.push('OK: delegation-guide + routing-cheatsheet both cover jcodemunch');
    } else if (surfaceCount === 1) {
        results.score += 1;
        results.findings.push('WARN: Only one of delegation-guide/routing-cheatsheet mentions jcodemunch');
        results.recommendations.push('Mirror jcodemunch coverage across both context docs');
    } else {
        results.findings.push('NO: Neither delegation-guide nor routing-cheatsheet mentions jcodemunch');
        results.recommendations.push('Add jcodemunch section to .claude/context/delegation-guide.md and routing-cheatsheet.md');
    }

    // 8. Usage signal — invocation count since activation (2 pts; reports, doesn't deduct)
    const toolUsageLog = join(process.env.HOME || '', '.claude', 'state', 'tool-usage.jsonl');
    if (existsSync(toolUsageLog)) {
        try {
            const realCalls = readFileSync(toolUsageLog, 'utf-8')
                .split('\n')
                .filter(line => {
                    if (!line.trim()) return false;
                    try {
                        const e = JSON.parse(line);
                        return typeof e.tool === 'string' && e.tool.startsWith('mcp__jcodemunch__');
                    } catch { return false; }
                })
                .length;
            if (realCalls > 0) {
                results.score += 2;
                results.findings.push(`OK: ${realCalls} real jcodemunch invocation(s) in tool-usage.jsonl`);
            } else {
                results.findings.push('WARN: 0 jcodemunch invocations in tool-usage.jsonl — surfacing may not be working');
                results.recommendations.push('Audit why code-exploration tasks are not reaching for jcodemunch; check benchmark protocol in thoughts/shared/benchmarks/');
            }
        } catch { /* ignore */ }
    }

    // 9. Benchmark protocol exists (2 pts)
    const benchmarkDoc = join(paiPath, 'thoughts', 'shared', 'benchmarks', 'jcodemunch-phase4.md');
    if (existsSync(benchmarkDoc)) {
        results.score += 2;
        results.findings.push('OK: Phase 4 benchmark protocol documented');
    } else {
        results.findings.push('--: No benchmark protocol (thoughts/shared/benchmarks/jcodemunch-phase4.md)');
        results.recommendations.push('Document A/B benchmark scenarios before committing to Builder tier license');
    }

    return results;
}
