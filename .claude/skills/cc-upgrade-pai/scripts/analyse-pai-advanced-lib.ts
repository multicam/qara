/**
 * analyse-pai-advanced-lib.ts — Phase 0 feature analyzers for cc-upgrade-pai.
 *
 * Validates: working memory, checkpoint recovery, quality gates, keyword routing.
 * Each analyzer returns AnalysisResult with score/maxScore/findings/recommendations.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
    type AnalysisResult,
    emptyResult,
} from '../../cc-upgrade/scripts/shared.ts';

export type { AnalysisResult };

// ─── Helpers ────────────────────────────────────────────────────────────────

function fileContains(path: string, pattern: string | RegExp): boolean {
    if (!existsSync(path)) return false;
    try {
        const content = readFileSync(path, 'utf-8');
        return typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
    } catch { return false; }
}

function addPoints(r: AnalysisResult, points: number, finding: string): void {
    r.score += points;
    r.findings.push(finding);
}

function addMissing(r: AnalysisResult, rec: string): void {
    r.recommendations.push(rec);
}

// ─── analyzeWorkingMemory ───────────────────────────────────────────────────

export function analyzeWorkingMemory(paiPath: string): AnalysisResult {
    const r = emptyResult(12);
    const wm = join(paiPath, '.claude', 'hooks', 'lib', 'working-memory.ts');

    if (existsSync(wm)) {
        addPoints(r, 3, 'working-memory.ts exists');
    } else {
        addMissing(r, 'Create hooks/lib/working-memory.ts for session-scoped memory');
        return r;
    }

    const exports = ['formatMemoryForInjection', 'appendLearning', 'appendDecision', 'appendIssue', 'appendProblem'];
    const found = exports.filter(e => fileContains(wm, e));
    if (found.length >= 4) addPoints(r, 3, `working-memory exports ${found.length}/5 functions`);
    else addMissing(r, `working-memory exports only ${found.length}/5 expected functions`);

    const stopHook = join(paiPath, '.claude', 'hooks', 'stop-hook.ts');
    if (fileContains(stopHook, 'formatMemoryForInjection')) {
        addPoints(r, 3, 'stop-hook integrates working memory injection');
    } else {
        addMissing(r, 'stop-hook should import and call formatMemoryForInjection');
    }

    const sessionsDir = join(paiPath, '.claude', 'state', 'sessions');
    if (existsSync(sessionsDir)) {
        addPoints(r, 3, 'Session directories exist for working memory storage');
    } else {
        addMissing(r, 'Create state/sessions/ directory structure');
    }

    return r;
}

// ─── analyzeCheckpointRecovery ──────────────────────────────────────────────

export function analyzeCheckpointRecovery(paiPath: string): AnalysisResult {
    const r = emptyResult(12);
    const cc = join(paiPath, '.claude', 'hooks', 'lib', 'compact-checkpoint.ts');

    if (existsSync(cc)) {
        addPoints(r, 3, 'compact-checkpoint.ts exists');
    } else {
        addMissing(r, 'Create hooks/lib/compact-checkpoint.ts for state snapshots');
        return r;
    }

    const preCompact = join(paiPath, '.claude', 'hooks', 'pre-compact.ts');
    if (existsSync(preCompact)) {
        addPoints(r, 3, 'pre-compact.ts hook exists');
        // Check if registered in settings
        const settings = join(paiPath, '.claude', 'settings.json');
        if (fileContains(settings, 'PreCompact')) {
            addPoints(r, 1, 'PreCompact event registered in settings');
        } else {
            addMissing(r, 'Register PreCompact hook in settings.json');
        }
    } else {
        addMissing(r, 'Create hooks/pre-compact.ts for state snapshot before compression');
    }

    const sessionStart = join(paiPath, '.claude', 'hooks', 'session-start.ts');
    if (fileContains(sessionStart, 'loadCheckpoint') || fileContains(sessionStart, 'compact-checkpoint')) {
        addPoints(r, 3, 'session-start has crash recovery from checkpoint');
    } else {
        addMissing(r, 'session-start should load checkpoint for crash recovery');
    }

    // Check for recent checkpoint files
    const sessionsDir = join(paiPath, '.claude', 'state', 'sessions');
    if (existsSync(sessionsDir)) {
        try {
            const dirs = readdirSync(sessionsDir);
            const hasCheckpoint = dirs.some(d => existsSync(join(sessionsDir, d, 'compact-checkpoint.json')));
            if (hasCheckpoint) addPoints(r, 2, 'Recent checkpoint files found');
        } catch { /* ok */ }
    }

    return r;
}

// ─── analyzeQualityGates ────────────────────────────────────────────────────

export function analyzeQualityGates(paiPath: string): AnalysisResult {
    const r = emptyResult(15);
    const agentsDir = join(paiPath, '.claude', 'agents');

    const gateAgents = ['critic', 'verifier', 'reviewer'];
    for (const agent of gateAgents) {
        if (existsSync(join(agentsDir, `${agent}.md`))) {
            addPoints(r, 3, `${agent} agent exists`);
        } else {
            addMissing(r, `Create agents/${agent}.md for quality gate enforcement`);
        }
    }

    // Check drive skill references critic+verifier gates
    const driveSkill = join(paiPath, '.claude', 'skills', 'drive', 'SKILL.md');
    if (fileContains(driveSkill, 'critic') && fileContains(driveSkill, 'verifier')) {
        addPoints(r, 3, 'drive skill references critic and verifier gates');
    } else {
        addMissing(r, 'drive SKILL.md should reference critic and verifier as quality gates');
    }

    // Check delegation guide disambiguates agents
    const delegationGuide = join(paiPath, '.claude', 'context', 'delegation-guide.md');
    if (existsSync(delegationGuide)) {
        const content = readFileSync(delegationGuide, 'utf-8');
        const mentions = gateAgents.filter(a => content.includes(a));
        if (mentions.length >= 3) {
            addPoints(r, 3, 'delegation-guide disambiguates all 3 quality gate agents');
        } else {
            addMissing(r, `delegation-guide mentions only ${mentions.length}/3 gate agents`);
        }
    } else {
        addMissing(r, 'Create context/delegation-guide.md to disambiguate quality agents');
    }

    return r;
}

// ─── analyzeKeywordRouting ──────────────────────────────────────────────────

export function analyzeKeywordRouting(paiPath: string): AnalysisResult {
    const r = emptyResult(12);
    const router = join(paiPath, '.claude', 'hooks', 'keyword-router.ts');
    const routesJson = join(paiPath, '.claude', 'hooks', 'lib', 'keyword-routes.json');

    if (existsSync(router)) {
        addPoints(r, 2, 'keyword-router.ts exists');
    } else {
        addMissing(r, 'Create hooks/keyword-router.ts for mode activation');
        return r;
    }

    if (existsSync(routesJson)) {
        try {
            const routes = JSON.parse(readFileSync(routesJson, 'utf-8'));
            const routeCount = Object.keys(routes).length;
            addPoints(r, 2, `keyword-routes.json has ${routeCount} routes`);
            // Check patterns use colon/mode suffix (not bare words)
            const allPatterns = Object.values(routes).flatMap((r: any) => r.patterns || []);
            const hasSafePatterns = allPatterns.every((p: string) => p.includes('\\b') || p.includes(':'));
            if (hasSafePatterns) addPoints(r, 3, 'All route patterns use word boundaries or colon suffix');
            else addMissing(r, 'Route patterns should use \\b boundaries to avoid false positives');
        } catch {
            addMissing(r, 'keyword-routes.json has invalid JSON');
        }
    } else {
        addMissing(r, 'Create hooks/lib/keyword-routes.json with route definitions');
    }

    // Check sanitization
    if (fileContains(router, 'sanitize') || fileContains(router, /strip.*code.*block/i)) {
        addPoints(r, 2, 'keyword-router sanitizes prompts');
    } else {
        addMissing(r, 'keyword-router should sanitize prompts to avoid false positives');
    }

    // Check informational detection
    if (fileContains(router, 'informational') || fileContains(router, /what is|explain|describe/)) {
        addPoints(r, 3, 'keyword-router detects informational mentions');
    } else {
        addMissing(r, 'keyword-router should distinguish informational from actionable mentions');
    }

    return r;
}
