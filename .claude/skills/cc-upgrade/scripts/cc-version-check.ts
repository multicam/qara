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
    // When false, usage cannot be reliably determined from files on disk
    // (environment/CLI-only features like desktopApp, LSP, bedrock). The scanner
    // won't emit "not utilized" recommendations for these — absence of evidence
    // isn't evidence of absence.
    detectable?: boolean;
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

    // CC 2.0.x features — environment/CLI-only, not detectable from files
    enterpriseSettings: { minVersion: '2.0.53', description: 'Managed enterprise configurations', detectable: false },

    // CC 2.1.0 features
    modelRouting: { minVersion: '2.1.0', description: 'Per-task model selection (haiku/sonnet/opus)' },
    skillInvocation: { minVersion: '2.1.0', description: 'Skill tool for invoking user-defined skills' },
    taskResume: { minVersion: '2.1.0', description: 'Resume agents via agent ID' },
    statusLine: { minVersion: '2.1.0', description: 'Custom status line via settings.json' },
    settingsJsonHooks: { minVersion: '2.1.0', description: 'Hooks configuration in settings.json (replaces hooks.json)' },
    enhancedSubagents: { minVersion: '2.1.0', description: 'Specialized agent types (Explore, Plan, etc.)' },
    webSearch: { minVersion: '2.1.0', description: 'Built-in WebSearch tool' },
    askUserQuestion: { minVersion: '2.1.0', description: 'Interactive user questions with options' },

    // CC 2.1.3 features
    mergedSkillsCommands: { minVersion: '2.1.3', description: 'Unified slash commands and skills' },

    // CC 2.1.4 features — CLI env var, not detectable
    disableBackgroundTasks: { minVersion: '2.1.4', description: 'CLAUDE_CODE_DISABLE_BACKGROUND_TASKS env var', detectable: false },

    // CC 2.1.105 — PreCompact hook can block compaction (exit 2 or decision:block)
    preCompactBlocking: { minVersion: '2.1.105', description: 'PreCompact hook can block compaction via exit 2 / decision:block', detectable: false },

    // CC 2.1.110 — mobile push notifications via PushNotification tool
    pushNotificationTool: { minVersion: '2.1.110', description: 'PushNotification tool for mobile notifications (opt-in via Remote Control)', detectable: false },

    // CC 2.1.111 — xhigh effort level for Opus 4.7
    xhighEffort: { minVersion: '2.1.111', description: 'xhigh effort level between high and max (Opus 4.7 only)', detectable: false },

    // CC 2.1.113 — sandbox network domain denylist
    sandboxDeniedDomains: { minVersion: '2.1.113', description: 'sandbox.network.deniedDomains setting for network isolation', detectable: false },
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
    usage.mergedSkillsCommands = existsSync(join(claudeDir, 'commands')) && existsSync(join(claudeDir, 'skills'));

    const settingsPath = join(claudeDir, 'settings.json');
    if (existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
            usage.settingsJsonHooks = Boolean(settings.hooks && Object.keys(settings.hooks).length > 0);
            usage.statusLine = Boolean(settings.statusLine);

            // modelRouting: either a global settings.model OR per-agent model frontmatter
            usage.modelRouting = Boolean(settings.model) || agentsUsePerTaskModels(join(claudeDir, 'agents'));

            const skillsDir = join(claudeDir, 'skills');
            if (existsSync(skillsDir)) {
                usage.enhancedSubagents = checkForForkContextSkills(skillsDir);
                usage.skillInvocation = true;
            }
        } catch {
            // Settings parse error
        }
    }

    // Content-based detection for features whose usage shows up as patterns in
    // skill/agent/command .md files. Runs once, answers several flags.
    const mdContent = collectMarkdownContent(claudeDir);
    usage.askUserQuestion = /AskUserQuestion/.test(mdContent);
    usage.webSearch = /\bWebSearch\b/.test(mdContent);
    usage.taskResume = /\bTask(Get|List|Output|Stop|Update)\b|\bMonitor\b/.test(mdContent);
    usage.checkpoints = /\/rewind\b|checkpoint-protocol|checkpointProtocol/.test(mdContent);

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

function agentsUsePerTaskModels(agentsDir: string): boolean {
    if (!existsSync(agentsDir)) return false;
    try {
        const entries = readdirSync(agentsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
            try {
                const content = readFileSync(join(agentsDir, entry.name), 'utf-8');
                // Match `model: opus|sonnet|haiku` in agent frontmatter
                if (/^model:\s*(opus|sonnet|haiku)/mi.test(content)) return true;
            } catch { /* skip */ }
        }
    } catch { /* skip */ }
    return false;
}

// Recursively collect markdown content from .claude subdirectories for pattern matching.
// Cached as a single string to avoid repeated disk reads across feature checks.
function collectMarkdownContent(claudeDir: string): string {
    const dirs = ['agents', 'skills', 'commands', 'context'].map(d => join(claudeDir, d));
    const chunks: string[] = [];
    for (const dir of dirs) {
        if (existsSync(dir)) walkMd(dir, chunks);
    }
    return chunks.join('\n');
}

function walkMd(dir: string, out: string[]): void {
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
                walkMd(full, out);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                try { out.push(readFileSync(full, 'utf-8')); } catch { /* skip */ }
            }
        }
    } catch { /* skip */ }
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

        // Only recommend features we can actually detect. Environment/CLI-only
        // features (desktopApp, LSP, bedrock, etc.) aren't visible in files, so
        // "not utilized" would be a false positive.
        if (isSupported && !isUsed && config.detectable !== false) {
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
