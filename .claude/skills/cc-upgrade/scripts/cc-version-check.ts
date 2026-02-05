#!/usr/bin/env bun
/**
 * cc-version-check.ts
 * Check Claude Code version compatibility with features
 *
 * Usage: bun run scripts/cc-version-check.ts [path]
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// --- Types ---

interface FeatureRequirement {
    minVersion: string;
    description: string;
}

interface FeatureStatus {
    description: string;
    minVersion: string;
    supported: boolean;
    inUse: boolean;
}

interface Recommendation {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    feature?: string;
    message: string;
}

interface CompatibilityReport {
    timestamp: string;
    ccVersion: string;
    ccLocation: string;
    targetPath: string;
    featureStatus: Record<string, FeatureStatus>;
    recommendations: Recommendation[];
}

// --- Feature requirements by CC version ---

export const FEATURE_REQUIREMENTS: Record<string, FeatureRequirement> = {
    // Core features (foundational)
    subagents: { minVersion: '1.0.80', description: 'Parallel task delegation via Task tool' },
    checkpoints: { minVersion: '2.0.0', description: 'Code state snapshots with /rewind' },
    hooks: { minVersion: '1.0.85', description: 'Event-based automation (settings.json hooks config)' },
    skills: { minVersion: '2.0.40', description: 'Reusable skill definitions in .claude/skills/' },
    planMode: { minVersion: '2.0.50', description: 'Structured planning with EnterPlanMode/ExitPlanMode' },

    // CC 2.0.x features
    lsp: { minVersion: '2.0.74', description: 'Language Server Protocol for code intelligence' },
    chromeIntegration: { minVersion: '2.0.72', description: 'Browser control via Chrome extension' },
    desktopApp: { minVersion: '2.0.51', description: 'Native desktop application' },
    vscodeExtension: { minVersion: '2.0.0', description: 'Native VS Code extension' },
    enterpriseSettings: { minVersion: '2.0.53', description: 'Managed enterprise configurations' },

    // CC 2.1.0 features
    modelRouting: { minVersion: '2.1.0', description: 'Per-task model selection (haiku/sonnet/opus)' },
    skillInvocation: { minVersion: '2.1.0', description: 'Skill tool for invoking user-defined skills' },
    backgroundTasks: { minVersion: '2.1.0', description: 'run_in_background parameter for Task tool' },
    taskResume: { minVersion: '2.1.0', description: 'Resume agents via agent ID' },
    statusLine: { minVersion: '2.1.0', description: 'Custom status line via settings.json' },
    settingsJsonHooks: { minVersion: '2.1.0', description: 'Hooks configuration in settings.json (replaces hooks.json)' },
    enhancedSubagents: { minVersion: '2.1.0', description: 'Specialized agent types (Explore, Plan, etc.)' },
    webSearch: { minVersion: '2.1.0', description: 'Built-in WebSearch tool' },
    askUserQuestion: { minVersion: '2.1.0', description: 'Interactive user questions with options' },

    // CC 2.1.3 features
    mergedSkillsCommands: { minVersion: '2.1.3', description: 'Unified slash commands and skills' },
    releaseChannelToggle: { minVersion: '2.1.3', description: 'Release channel toggle (stable/latest) in /config' },
    enhancedDoctor: { minVersion: '2.1.3', description: '/doctor detects unreachable permission rules' },
    extendedHookTimeout: { minVersion: '2.1.3', description: 'Hook execution timeout increased to 10 minutes' },

    // CC 2.1.4 features
    disableBackgroundTasks: { minVersion: '2.1.4', description: 'CLAUDE_CODE_DISABLE_BACKGROUND_TASKS env var' },

    // Provider integrations
    bedrockSupport: { minVersion: '0.2.0', description: 'AWS Bedrock integration' },
    vertexSupport: { minVersion: '0.2.0', description: 'Google Vertex AI integration' },
};

// --- Version utilities (exported for reuse) ---

export function parseVersion(version: string): number[] {
    const clean = version.replace(/^v/, '').split('-')[0];
    return clean.split('.').map(n => parseInt(n, 10) || 0);
}

export function compareVersions(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const av = a[i] || 0;
        const bv = b[i] || 0;
        if (av > bv) return 1;
        if (av < bv) return -1;
    }
    return 0;
}

// --- Detection ---

export function getCurrentCCVersion(): { version: string | null; location: string | null } {
    try {
        const output = execSync('claude --version', { encoding: 'utf-8', timeout: 5000 });
        const match = output.match(/(\d+\.\d+\.\d+)/);
        const version = match ? match[1] : null;
        const location = execSync('which claude', { encoding: 'utf-8', timeout: 5000 }).trim();
        return { version, location };
    } catch {
        return { version: null, location: null };
    }
}

export function checkFeatureUsage(targetPath: string): Record<string, boolean> {
    const usage: Record<string, boolean> = {};
    const claudeDir = join(targetPath, '.claude');

    usage.subagents = existsSync(join(claudeDir, 'agents'));
    usage.hooks = existsSync(join(claudeDir, 'hooks'));
    usage.skills = existsSync(join(claudeDir, 'skills')) || existsSync(join(claudeDir, 'rules'));
    usage.planMode = existsSync(join(claudeDir, 'commands'));
    usage.contextSystem = existsSync(join(claudeDir, 'context'));

    const settingsPath = join(claudeDir, 'settings.json');
    if (existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
            usage.settingsJsonHooks = Boolean(settings.hooks && Object.keys(settings.hooks).length > 0);
            usage.statusLine = Boolean(settings.statusLine);
            usage.modelRouting = Boolean(settings.model);

            const skillsDir = join(claudeDir, 'skills');
            if (existsSync(skillsDir)) {
                usage.enhancedSubagents = checkForForkContextSkills(skillsDir);
                usage.skillInvocation = true;
            }
        } catch {
            // Settings parse error
        }
    }

    return usage;
}

function checkForForkContextSkills(skillsDir: string): boolean {
    try {
        const entries = readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillMd = join(skillsDir, entry.name, 'SKILL.md');
                if (existsSync(skillMd)) {
                    const content = readFileSync(skillMd, 'utf-8');
                    if (content.includes('context: fork')) {
                        return true;
                    }
                }
            }
        }
    } catch {
        // skip
    }
    return false;
}

// --- Report generation ---

export function generateReport(currentVersion: string | null, currentLocation: string | null, targetPath: string): CompatibilityReport {
    const report: CompatibilityReport = {
        timestamp: new Date().toISOString(),
        ccVersion: currentVersion || 'Not detected',
        ccLocation: currentLocation || 'Not detected',
        targetPath,
        featureStatus: {},
        recommendations: [],
    };

    if (!currentVersion) {
        report.recommendations.push({
            priority: 'HIGH',
            message: 'Claude Code not detected. Install with: bun install -g @anthropic-ai/claude-code',
        });
        return report;
    }

    const currentParsed = parseVersion(currentVersion);
    const usage = checkFeatureUsage(targetPath);

    for (const [feature, config] of Object.entries(FEATURE_REQUIREMENTS)) {
        const requiredParsed = parseVersion(config.minVersion);
        const isSupported = compareVersions(currentParsed, requiredParsed) >= 0;
        const isUsed = usage[feature] || false;

        report.featureStatus[feature] = {
            description: config.description,
            minVersion: config.minVersion,
            supported: isSupported,
            inUse: isUsed,
        };

        if (isSupported && !isUsed) {
            report.recommendations.push({
                priority: 'MEDIUM',
                feature,
                message: `Feature "${feature}" is available but not utilized. ${config.description}`,
            });
        }

        if (!isSupported && isUsed) {
            report.recommendations.push({
                priority: 'HIGH',
                feature,
                message: `Feature "${feature}" requires CC v${config.minVersion}+. Current: v${currentVersion}. Update recommended.`,
            });
        }
    }

    if (compareVersions(currentParsed, parseVersion('2.0.0')) < 0) {
        report.recommendations.push({
            priority: 'HIGH',
            message: 'Major version 2.0+ recommended for checkpoints, VS Code extension, and improved stability.',
        });
    }

    return report;
}

export function formatReport(report: CompatibilityReport): string {
    const lines: string[] = [];

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push('║           CC COMPATIBILITY REPORT                            ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`Generated: ${report.timestamp}`);
    lines.push(`Claude Code Version: ${report.ccVersion}`);
    lines.push(`Claude Code Location: ${report.ccLocation}`);
    lines.push(`Target Path: ${report.targetPath}\n`);

    lines.push('--- FEATURE STATUS ---\n');

    for (const [feature, status] of Object.entries(report.featureStatus)) {
        const supportIcon = status.supported ? 'OK' : 'NO';
        const useIcon = status.inUse ? 'USED' : '    ';
        lines.push(`[${supportIcon}] [${useIcon}] ${feature.padEnd(24)} v${status.minVersion}+ | ${status.description}`);
    }

    if (report.recommendations.length > 0) {
        lines.push('\n--- RECOMMENDATIONS ---\n');

        const sorted = [...report.recommendations].sort((a, b) => {
            const priority: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return priority[a.priority] - priority[b.priority];
        });

        for (const rec of sorted) {
            lines.push(`[${rec.priority}] ${rec.message}`);
        }
    }

    lines.push('\n--- LEGEND ---');
    lines.push('[OK] Supported  [NO] Not Supported  [USED] In Use\n');

    return lines.join('\n');
}

// --- Main (only runs when executed directly) ---

const isDirectRun = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith('cc-version-check.ts');

if (isDirectRun) {
    const targetPath = process.argv[2] || process.cwd();

    console.log('Checking Claude Code compatibility...\n');

    const { version, location } = getCurrentCCVersion();
    const report = generateReport(version, location, targetPath);

    console.log(formatReport(report));

    if (process.argv.includes('--json')) {
        console.log('\n--- JSON OUTPUT ---\n');
        console.log(JSON.stringify(report, null, 2));
    }
}
