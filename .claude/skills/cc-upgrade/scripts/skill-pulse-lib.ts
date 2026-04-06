/**
 * skill-pulse-lib.ts — Types, constants, and library functions for skill-pulse-check CLI.
 *
 * Imported by skill-pulse-check.ts (orchestration) and by tests.
 */

import { existsSync, readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// --- Types ---

export interface InstalledSkill {
    name: string;
    symlinkTarget: string;
    installedVersion: string | null;
    githubRepo: string | null;        // e.g. "nicobailon/visual-explainer"
    installedAt: string | null;
    updatedAt: string | null;
}

export interface UpstreamData {
    latestTag: string | null;
    latestCommitDate: string | null;
    stars: number | null;
    openIssues: number | null;
    defaultBranch: string | null;
    fetchError: string | null;
}

export interface SkillPulseEntry {
    skill: InstalledSkill;
    upstream: UpstreamData;
    isOutdated: boolean;
    daysSinceUpstreamCommit: number | null;
    activityStatus: 'active' | 'slow' | 'stale' | 'unknown';
}

export interface PulseReport {
    timestamp: string;
    skillsPath: string;
    total: number;
    withGithubRepo: number;
    outdated: number;
    stale: number;
    entries: SkillPulseEntry[];
    lockFilePresent: boolean;
}

// --- Constants ---

export const GITHUB_API = 'https://api.github.com';
export const STALE_DAYS = 90;    // No commits for 90+ days = stale
export const SLOW_DAYS = 30;     // No commits for 30-89 days = slow

// --- Helpers ---

export function isVerbose(): boolean {
    return process.argv.includes('--verbose');
}

export function log(msg: string): void {
    if (isVerbose()) console.error(`[verbose] ${msg}`);
}

export function daysSince(isoDate: string): number {
    return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

export function activityStatus(days: number | null): 'active' | 'slow' | 'stale' | 'unknown' {
    if (days === null) return 'unknown';
    if (days < SLOW_DAYS) return 'active';
    if (days < STALE_DAYS) return 'slow';
    return 'stale';
}

// --- GitHub Auth ---

/**
 * Try to get a GitHub token for authenticated API calls.
 * Uses gh CLI if available; falls back to GITHUB_TOKEN env var.
 * Unauthenticated calls hit 60 req/hr limit — sufficient for small inventories.
 */
export function getGithubToken(): string | null {
    // Try env var first
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

    // Try gh CLI
    try {
        const token = execSync('gh auth token 2>/dev/null', { encoding: 'utf-8', timeout: 3000 }).trim();
        if (token) return token;
    } catch {
        // gh not available or not authenticated
    }

    return null;
}

// --- Lock File ---

export interface LockEntry {
    source: string;
    sourceType: string;
    sourceUrl: string;
    skillPath: string;
    installedAt: string;
    updatedAt: string;
}

export interface LockFile {
    version: number;
    skills: Record<string, LockEntry>;
}

export function readLockFile(): LockFile | null {
    const lockPath = join(process.env.HOME || '~', '.agents', '.skill-lock.json');
    try {
        return JSON.parse(readFileSync(lockPath, 'utf-8'));
    } catch {
        return null;
    }
}

// --- Installed Version Detection ---

/**
 * Read installed version from .claude-plugin/plugin.json in the skill's real path.
 * Falls back to checking package.json, then SKILL.md for a version field.
 */
export function readInstalledVersion(resolvedPath: string): string | null {
    // .claude-plugin/plugin.json (skills CLI format)
    const pluginJsonPath = join(resolvedPath, '.claude-plugin', 'plugin.json');
    if (existsSync(pluginJsonPath)) {
        try {
            const data = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
            if (data.version) return String(data.version);
        } catch {
            // skip
        }
    }

    // package.json at skill root
    const pkgPath = join(resolvedPath, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const data = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            if (data.version) return String(data.version);
        } catch {
            // skip
        }
    }

    // SKILL.md frontmatter version field
    const skillMdPath = join(resolvedPath, 'SKILL.md');
    if (existsSync(skillMdPath)) {
        try {
            const content = readFileSync(skillMdPath, 'utf-8');
            const match = content.match(/^version:\s*(.+)/m);
            if (match) return match[1].trim();
        } catch {
            // skip
        }
    }

    return null;
}

/**
 * Try to determine the GitHub repo from plugin.json repository field
 * or package.json repository field. Returns "owner/repo" format or null.
 */
export function readGithubRepo(resolvedPath: string): string | null {
    const extractRepo = (repoField: unknown): string | null => {
        if (!repoField) return null;
        const url = typeof repoField === 'string'
            ? repoField
            : (repoField as { url?: string }).url ?? '';
        const match = url.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?(?:\/|$)/);
        return match ? match[1] : null;
    };

    // .claude-plugin/plugin.json
    const pluginJsonPath = join(resolvedPath, '.claude-plugin', 'plugin.json');
    if (existsSync(pluginJsonPath)) {
        try {
            const data = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
            const repo = extractRepo(data.repository);
            if (repo) return repo;
        } catch {
            // skip
        }
    }

    // package.json
    const pkgPath = join(resolvedPath, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const data = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            const repo = extractRepo(data.repository);
            if (repo) return repo;
        } catch {
            // skip
        }
    }

    return null;
}

// --- Skill Inventory ---

export function findSymlinkedSkills(skillsPath: string, lockFile: LockFile | null): InstalledSkill[] {
    const skills: InstalledSkill[] = [];
    if (!existsSync(skillsPath)) return skills;

    for (const entry of readdirSync(skillsPath)) {
        const fullPath = join(skillsPath, entry);
        try {
            const stat = lstatSync(fullPath);
            if (!stat.isSymbolicLink()) continue;

            const symlinkTarget = readlinkSync(fullPath);

            let resolvedPath: string;
            try {
                resolvedPath = realpathSync(fullPath);
            } catch {
                log(`Broken symlink: ${entry}`);
                continue;
            }

            // Prefer lock file data for GitHub repo identification
            const lockEntry = lockFile?.skills[entry] ?? null;
            let githubRepo: string | null = null;
            let installedAt: string | null = null;
            let updatedAt: string | null = null;

            if (lockEntry?.sourceType === 'github' && lockEntry.source) {
                // "nicobailon/visual-explainer" format
                const match = lockEntry.source.match(/^([^/]+\/[^/]+)/);
                if (match) githubRepo = match[1];
                installedAt = lockEntry.installedAt ?? null;
                updatedAt = lockEntry.updatedAt ?? null;
            }

            // If no lock entry, try to infer from the resolved path structure
            if (!githubRepo) {
                githubRepo = readGithubRepo(resolvedPath);
            }

            const installedVersion = readInstalledVersion(resolvedPath);

            skills.push({
                name: entry,
                symlinkTarget,
                installedVersion,
                githubRepo,
                installedAt,
                updatedAt,
            });

            log(`Found skill: ${entry}  repo=${githubRepo ?? 'unknown'}  version=${installedVersion ?? 'unknown'}`);
        } catch {
            // Skip
        }
    }

    return skills;
}

// --- GitHub API ---

export async function fetchUpstream(repo: string, token: string | null): Promise<UpstreamData> {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fetcher = async (url: string): Promise<unknown | null> => {
        log(`GET ${url}`);
        try {
            const res = await fetch(url, {
                headers,
                signal: AbortSignal.timeout(10000),
            });
            if (!res.ok) {
                log(`HTTP ${res.status} for ${url}`);
                return null;
            }
            return await res.json();
        } catch (err) {
            log(`Fetch error for ${url}: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    };

    // Fetch repo metadata
    const repoData = await fetcher(`${GITHUB_API}/repos/${repo}`) as Record<string, unknown> | null;
    if (!repoData) {
        return {
            latestTag: null,
            latestCommitDate: null,
            stars: null,
            openIssues: null,
            defaultBranch: null,
            fetchError: `Could not fetch repo metadata for ${repo}`,
        };
    }

    const stars = typeof repoData.stargazers_count === 'number' ? repoData.stargazers_count : null;
    const openIssues = typeof repoData.open_issues_count === 'number' ? repoData.open_issues_count : null;
    const defaultBranch = typeof repoData.default_branch === 'string' ? repoData.default_branch : 'main';
    const pushedAt = typeof repoData.pushed_at === 'string' ? repoData.pushed_at : null;

    // Fetch latest release
    const releaseData = await fetcher(`${GITHUB_API}/repos/${repo}/releases/latest`) as Record<string, unknown> | null;
    const latestTag = typeof releaseData?.tag_name === 'string' ? releaseData.tag_name : null;

    return {
        latestTag,
        latestCommitDate: pushedAt,
        stars,
        openIssues,
        defaultBranch,
        fetchError: null,
    };
}

// --- Version Comparison ---

/**
 * Rough version comparison: returns true if upstream tag is newer than installed.
 * Handles semver strings like "v1.2.3", "1.2.3", "0.6.3".
 */
export function isOutdated(installedVersion: string | null, latestTag: string | null): boolean {
    if (!installedVersion || !latestTag) return false;

    const parse = (v: string): number[] =>
        v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);

    const installed = parse(installedVersion);
    const latest = parse(latestTag);

    for (let i = 0; i < Math.max(installed.length, latest.length); i++) {
        const a = installed[i] ?? 0;
        const b = latest[i] ?? 0;
        if (b > a) return true;
        if (a > b) return false;
    }
    return false;
}

// --- Report Formatting ---

export const ACTIVITY_LABELS: Record<string, string> = {
    active: 'ACTIVE',
    slow: 'SLOW  ',
    stale: 'STALE ',
    unknown: '?     ',
};

export function formatReport(report: PulseReport): string {
    const lines: string[] = [];

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push('║           SKILL ECOSYSTEM PULSE REPORT                       ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`Generated: ${report.timestamp}`);
    lines.push(`Skills path: ${report.skillsPath}`);
    lines.push(`Lock file: ${report.lockFilePresent ? 'present' : 'not found'}`);
    lines.push(`Symlinked skills: ${report.total}  |  With GitHub repo: ${report.withGithubRepo}  |  Outdated: ${report.outdated}  |  Stale: ${report.stale}\n`);

    if (report.entries.length === 0) {
        lines.push('No symlinked external skills found.\n');
        return lines.join('\n');
    }

    lines.push('--- SKILL STATUS ---\n');

    for (const entry of report.entries) {
        const { skill, upstream } = entry;

        const versionDisplay = skill.installedVersion
            ? `v${skill.installedVersion}`
            : 'version unknown';
        const upstreamTag = upstream.latestTag
            ? upstream.latestTag
            : 'no release';
        const starsDisplay = upstream.stars !== null
            ? `${upstream.stars} stars`
            : 'stars unknown';
        const outdatedFlag = entry.isOutdated ? ' [OUTDATED]' : '';
        const activityLabel = ACTIVITY_LABELS[entry.activityStatus];

        lines.push(`[${activityLabel}] ${skill.name.padEnd(22)} installed=${versionDisplay.padEnd(12)} upstream=${upstreamTag.padEnd(12)} ${starsDisplay}${outdatedFlag}`);

        if (upstream.fetchError) {
            lines.push(`           Error: ${upstream.fetchError}`);
        } else if (entry.daysSinceUpstreamCommit !== null) {
            lines.push(`           Last push: ${entry.daysSinceUpstreamCommit} days ago  |  Open issues: ${upstream.openIssues ?? '?'}`);
        }

        if (skill.updatedAt) {
            lines.push(`           Locally updated: ${skill.updatedAt.slice(0, 10)}`);
        }

        lines.push('');
    }

    // Outdated skills summary
    const outdatedSkills = report.entries.filter(e => e.isOutdated);
    if (outdatedSkills.length > 0) {
        lines.push('--- UPDATES AVAILABLE ---\n');
        for (const e of outdatedSkills) {
            lines.push(`  ${e.skill.name}: v${e.skill.installedVersion} -> ${e.upstream.latestTag}`);
            if (e.skill.githubRepo) {
                lines.push(`    Update: npx skills@latest add ${e.skill.githubRepo}`);
            }
        }
        lines.push('');
    }

    // Stale skills summary
    const staleSkills = report.entries.filter(e => e.activityStatus === 'stale');
    if (staleSkills.length > 0) {
        lines.push('--- STALE SKILLS (no upstream activity > 90 days) ---\n');
        for (const e of staleSkills) {
            lines.push(`  ${e.skill.name}: ${e.daysSinceUpstreamCommit} days since last push`);
        }
        lines.push('');
    }

    // Skills without GitHub tracking
    const untracked = report.entries.filter(e => !e.skill.githubRepo);
    if (untracked.length > 0) {
        lines.push('--- SKILLS WITHOUT GITHUB TRACKING ---\n');
        for (const e of untracked) {
            lines.push(`  ${e.skill.name}: no repository URL found (add plugin.json or package.json)`);
        }
        lines.push('');
    }

    lines.push('--- LEGEND ---');
    lines.push('ACTIVE = commit within 30 days | SLOW = 30-89 days | STALE = 90+ days\n');

    return lines.join('\n');
}
