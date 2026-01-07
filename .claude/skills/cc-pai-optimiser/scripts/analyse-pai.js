#!/usr/bin/env node
/**
 * analyze-pai.js
 * Comprehensive PAI repository analysis against 12-factor principles
 *
 * Usage: bun run scripts/analyze-pai.js [pai-path]
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Analysis categories
const ANALYSIS_MODULES = {
    structure: analyzeStructure,
    contextManagement: analyzeContextManagement,
    agentConfiguration: analyzeAgentConfiguration,
    toolIntegration: analyzeToolIntegration,
    workflowPatterns: analyzeWorkflowPatterns
};

// Analyze PAI directory structure
function analyzeStructure(paiPath) {
    const results = {
        score: 0,
        maxScore: 10,
        findings: [],
        recommendations: []
    };

    const expectedDirs = [
        { path: '.claude', required: true, weight: 2 },
        { path: '.claude/context', required: true, weight: 2 },
        { path: '.claude/agents', required: false, weight: 1 },
        { path: '.claude/commands', required: false, weight: 1 },
        { path: '.claude/hooks', required: false, weight: 1 },
        { path: '.claude/rules', required: false, weight: 1 }
    ];

    for (const dir of expectedDirs) {
        const fullPath = join(paiPath, dir.path);
        if (existsSync(fullPath)) {
            results.score += dir.weight;
            results.findings.push(`✅ ${dir.path} exists`);
        } else if (dir.required) {
            results.findings.push(`❌ ${dir.path} MISSING (required)`);
            results.recommendations.push(`Create ${dir.path} directory for proper PAI structure`);
        } else {
            results.findings.push(`⚪ ${dir.path} not present (optional)`);
        }
    }

    // Check for CLAUDE.md files
    const claudeFiles = findFiles(paiPath, 'CLAUDE.md');
    results.findings.push(`📄 Found ${claudeFiles.length} CLAUDE.md files`);
    if (claudeFiles.length === 0) {
        results.recommendations.push('Create at least one CLAUDE.md file for context configuration');
    }

    return results;
}

// Analyze context management patterns
function analyzeContextManagement(paiPath) {
    const results = {
        score: 0,
        maxScore: 20,
        findings: [],
        recommendations: []
    };

    const contextPath = join(paiPath, '.claude', 'context');

    if (!existsSync(contextPath)) {
        results.findings.push('❌ No context directory found');
        results.recommendations.push('Implement UFC (Universal File-based Context) system');
        return results;
    }

    results.score += 5;

    // Analyze context file sizes
    const contextFiles = findFiles(contextPath, '*.md');
    let oversizedFiles = 0;
    let totalLines = 0;

    for (const file of contextFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n').length;
        totalLines += lines;

        if (lines > 500) {
            oversizedFiles++;
            results.findings.push(`⚠️  ${relative(paiPath, file)}: ${lines} lines (exceeds 500 limit)`);
        }
    }

    if (oversizedFiles === 0 && contextFiles.length > 0) {
        results.score += 5;
        results.findings.push(`✅ All context files under 500 lines`);
    } else if (oversizedFiles > 0) {
        results.recommendations.push(`Split ${oversizedFiles} oversized context files using progressive disclosure pattern`);
    }

    // Check for progressive disclosure patterns
    const hasReferences = existsSync(join(contextPath, 'references')) ||
        contextFiles.some(f => readFileSync(f, 'utf-8').includes('See '));
    if (hasReferences) {
        results.score += 5;
        results.findings.push('✅ Progressive disclosure pattern detected');
    } else {
        results.recommendations.push('Implement progressive disclosure with references/ directory');
    }

    // Check for context loading enforcement
    const hasEnforcement = contextFiles.some(f => {
        const content = readFileSync(f, 'utf-8');
        return content.includes('MANDATORY') || content.includes('MUST') || content.includes('READ THESE FILES');
    });

    if (hasEnforcement) {
        results.score += 5;
        results.findings.push('✅ Context loading enforcement detected');
    } else {
        results.recommendations.push('Add context loading enforcement (Layer 3 aggressive instructions)');
    }

    return results;
}

// Analyze agent configuration
function analyzeAgentConfiguration(paiPath) {
    const results = {
        score: 0,
        maxScore: 15,
        findings: [],
        recommendations: []
    };

    const agentsPath = join(paiPath, '.claude', 'agents');

    if (!existsSync(agentsPath)) {
        results.findings.push('⚪ No agents directory (agents are optional)');
        return results;
    }

    const agentFiles = readdirSync(agentsPath).filter(f => f.endsWith('.md'));
    results.findings.push(`📄 Found ${agentFiles.length} agent definitions`);

    if (agentFiles.length > 0) {
        results.score += 5;
    }

    // Check agent specialization (Factor 10)
    const generalPurposeIndicators = ['general', 'main', 'default', 'master'];
    let specializedCount = 0;

    for (const file of agentFiles) {
        const name = file.toLowerCase();
        const isSpecialized = !generalPurposeIndicators.some(ind => name.includes(ind));
        if (isSpecialized) {
            specializedCount++;
            results.findings.push(`✅ Specialized agent: ${file}`);
        } else {
            results.findings.push(`⚠️  General-purpose agent: ${file}`);
        }
    }

    if (specializedCount === agentFiles.length && agentFiles.length > 0) {
        results.score += 5;
        results.findings.push('✅ All agents are specialized (Factor 10 compliant)');
    } else if (agentFiles.length > 0) {
        results.recommendations.push('Split general-purpose agents into specialized, single-purpose agents');
    }

    // Check agent file sizes
    let oversizedAgents = 0;
    for (const file of agentFiles) {
        const content = readFileSync(join(agentsPath, file), 'utf-8');
        if (content.split('\n').length > 500) {
            oversizedAgents++;
        }
    }

    if (oversizedAgents === 0 && agentFiles.length > 0) {
        results.score += 5;
        results.findings.push('✅ All agent configs under 500 lines');
    } else if (oversizedAgents > 0) {
        results.recommendations.push(`Refactor ${oversizedAgents} oversized agent configurations`);
    }

    return results;
}

// Analyze tool integration
function analyzeToolIntegration(paiPath) {
    const results = {
        score: 0,
        maxScore: 10,
        findings: [],
        recommendations: []
    };

    // Check for tools documentation
    const toolsContext = join(paiPath, '.claude', 'context', 'tools');
    if (existsSync(toolsContext)) {
        results.score += 5;
        results.findings.push('✅ Tools context documentation exists');
    } else {
        results.recommendations.push('Create .claude/context/tools/ for tool documentation');
    }

    // Check for skills/rules definitions
    const rulesPath = join(paiPath, '.claude', 'rules');
    if (existsSync(rulesPath)) {
        const rules = readdirSync(rulesPath).filter(f => f.endsWith('.md'));
        results.score += 5;
        results.findings.push(`✅ Found ${rules.length} skill/rule definitions`);
    } else {
        results.findings.push('⚪ No .claude/rules/ directory (skills are optional)');
    }

    return results;
}

// Analyze workflow patterns
function analyzeWorkflowPatterns(paiPath) {
    const results = {
        score: 0,
        maxScore: 20,
        findings: [],
        recommendations: []
    };

    // Check for commands
    const commandsPath = join(paiPath, '.claude', 'commands');
    if (existsSync(commandsPath)) {
        const commands = readdirSync(commandsPath).filter(f => f.endsWith('.md'));
        results.score += 5;
        results.findings.push(`✅ Found ${commands.length} command workflows`);

        // Analyze command structure
        for (const cmd of commands.slice(0, 5)) { // Check first 5
            const content = readFileSync(join(commandsPath, cmd), 'utf-8');
            const hasSteps = content.includes('##') || content.includes('1.') || content.includes('Step');
            if (!hasSteps) {
                results.findings.push(`⚠️  Command '${cmd}' lacks step structure`);
            }
        }
    } else {
        results.findings.push('⚪ No commands directory');
        results.recommendations.push('Create reusable workflows in .claude/commands/');
    }

    // Check for hooks (Factor 6 - Launch/Pause/Resume)
    const hooksPath = join(paiPath, '.claude', 'hooks');
    if (existsSync(hooksPath)) {
        const hooks = readdirSync(hooksPath);
        results.score += 5;
        results.findings.push(`✅ Found ${hooks.length} automation hooks`);
    } else {
        results.recommendations.push('Add hooks for event-based automation');
    }

    // Check for working directory (Factor 5 - Unified State)
    const workingPath = join(paiPath, '.claude', 'context', 'working');
    if (existsSync(workingPath)) {
        results.score += 5;
        results.findings.push('✅ Working directory for active state exists');
    } else {
        results.recommendations.push('Create .claude/context/working/ for unified execution state');
    }

    // Check for control flow patterns (Factor 8)
    const allFiles = findFiles(paiPath, '*.md');
    const hasControlFlow = allFiles.some(f => {
        const content = readFileSync(f, 'utf-8');
        return content.includes('workflow') || content.includes('pipeline') || content.includes('if ') || content.includes('loop');
    });

    if (hasControlFlow) {
        results.score += 5;
        results.findings.push('✅ Custom control flow patterns detected');
    } else {
        results.recommendations.push('Define explicit control flow in command files');
    }

    return results;
}

// Helper: Find files matching pattern
function findFiles(dir, pattern, results = []) {
    if (!existsSync(dir)) return results;

    const files = readdirSync(dir);
    for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            findFiles(fullPath, pattern, results);
        } else if (pattern === '*' || file.endsWith(pattern.replace('*', '')) || file === pattern) {
            results.push(fullPath);
        }
    }

    return results;
}

// Generate full report
function generateReport(paiPath) {
    const report = {
        timestamp: new Date().toISOString(),
        paiPath: paiPath,
        modules: {},
        totalScore: 0,
        maxScore: 0,
        recommendations: []
    };

    for (const [name, analyzer] of Object.entries(ANALYSIS_MODULES)) {
        const result = analyzer(paiPath);
        report.modules[name] = result;
        report.totalScore += result.score;
        report.maxScore += result.maxScore;
        report.recommendations.push(...result.recommendations.map(r => ({ module: name, recommendation: r })));
    }

    report.compliancePercentage = Math.round((report.totalScore / report.maxScore) * 100);

    return report;
}

// Format report for console
function formatReport(report) {
    const lines = [];

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push('║              PAI OPTIMIZATION ANALYSIS                       ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`📅 Generated: ${report.timestamp}`);
    lines.push(`📁 PAI Path: ${report.paiPath}`);
    lines.push(`📊 Overall Score: ${report.totalScore}/${report.maxScore} (${report.compliancePercentage}%)\n`);

    // Score bar
    const filled = Math.round(report.compliancePercentage / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    lines.push(`Progress: [${bar}] ${report.compliancePercentage}%\n`);

    // Module details
    for (const [name, result] of Object.entries(report.modules)) {
        lines.push(`─── ${name.toUpperCase()} (${result.score}/${result.maxScore}) ───`);
        for (const finding of result.findings) {
            lines.push(`  ${finding}`);
        }
        lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
        lines.push('─── RECOMMENDATIONS ──────────────────────────────────────────\n');
        const grouped = {};
        for (const rec of report.recommendations) {
            if (!grouped[rec.module]) grouped[rec.module] = [];
            grouped[rec.module].push(rec.recommendation);
        }

        for (const [module, recs] of Object.entries(grouped)) {
            lines.push(`📌 ${module}:`);
            for (const rec of recs) {
                lines.push(`   • ${rec}`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

// Main execution
async function main() {
    const paiPath = process.argv[2] || process.cwd();

    console.log('Analyzing PAI repository...\n');

    const report = generateReport(paiPath);
    console.log(formatReport(report));

    // Output JSON for programmatic use
    if (process.argv.includes('--json')) {
        console.log('\n─── JSON OUTPUT ──────────────────────────────────────────────\n');
        console.log(JSON.stringify(report, null, 2));
    }
}

main().catch(console.error);