/**
 * trace-utils — Deterministic extraction helpers for enriched execution traces.
 *
 * Pure functions, no I/O. Used by post-tool-use and stop hooks to
 * produce structured trace metadata for the introspection pipeline.
 */

// ---------------------------------------------------------------------------
// Input summary extraction (per-tool, deterministic, privacy-safe)
// ---------------------------------------------------------------------------

function truncate(s: string, maxLen: number): string {
    return s.length <= maxLen ? s : s.slice(0, maxLen);
}

function extractInputSummary(toolName: string, toolInput: Record<string, unknown>): string {
    switch (toolName) {
        case 'Bash': {
            const cmd = toolInput.command;
            if (typeof cmd !== 'string') return '';
            return 'command: ' + truncate(cmd, 200);
        }

        case 'Read':
        case 'Write':
        case 'Edit':
        case 'MultiEdit': {
            const fp = toolInput.file_path;
            if (typeof fp !== 'string') return '';
            return 'file: ' + fp;
        }

        case 'Grep': {
            const parts: string[] = [];
            if (typeof toolInput.pattern === 'string') parts.push('pattern: ' + toolInput.pattern);
            if (typeof toolInput.path === 'string') parts.push('path: ' + toolInput.path);
            if (typeof toolInput.glob === 'string') parts.push('glob: ' + toolInput.glob);
            return parts.join(' ');
        }

        case 'Glob': {
            const parts: string[] = [];
            if (typeof toolInput.pattern === 'string') parts.push('pattern: ' + toolInput.pattern);
            if (typeof toolInput.path === 'string') parts.push('path: ' + toolInput.path);
            return parts.join(' ');
        }

        case 'WebFetch': {
            const url = toolInput.url;
            if (typeof url === 'string') return 'url: ' + truncate(url, 200);
            return '';
        }

        case 'WebSearch': {
            const query = toolInput.query;
            if (typeof query === 'string') return 'query: ' + truncate(query, 200);
            return '';
        }

        case 'Agent': {
            const parts: string[] = [];
            if (typeof toolInput.subagent_type === 'string') parts.push('type: ' + toolInput.subagent_type);
            if (typeof toolInput.description === 'string') parts.push(truncate(toolInput.description, 150));
            return parts.join(' ');
        }

        case 'Skill': {
            const skill = toolInput.skill;
            if (typeof skill === 'string') return 'skill: ' + skill;
            return '';
        }

        case 'TaskCreate': {
            const subject = toolInput.subject;
            if (typeof subject === 'string') return 'subject: ' + truncate(subject, 200);
            return '';
        }

        case 'TaskUpdate': {
            const id = toolInput.taskId;
            const status = toolInput.status;
            const parts: string[] = [];
            if (id) parts.push('task: ' + id);
            if (typeof status === 'string') parts.push('status: ' + status);
            return parts.join(' ');
        }

        default: {
            const json = JSON.stringify(toolInput);
            return truncate(json, 200);
        }
    }
}

// ---------------------------------------------------------------------------
// Topic classification (keyword-based, deterministic)
// ---------------------------------------------------------------------------

const TOPIC_PATTERNS: Array<[string, RegExp]> = [
    ['test', /\b(test|tests|testing|spec|expect|assert|pass|fail|suite)\b/i],
    ['commit', /\b(commit|committed|committing|staged|staging)\b/i],
    ['deploy', /\b(deploy|push|pushed|production|release|ship)\b/i],
    ['refactor', /\b(refactor|refactored|refactoring|extract|rename|reorganize|split)\b/i],
    ['debug', /\b(debug|debugging|error|bug|fix|broke|broken|issue|trace)\b/i],
    ['review', /\b(review|reviewed|reviewing|pr|pull request|approve|feedback)\b/i],
    ['research', /\b(research|researching|explore|exploring|investigate|analysis|study)\b/i],
];

function classifyTopic(message: string): string {
    if (!message) return 'general';
    for (const [topic, pattern] of TOPIC_PATTERNS) {
        if (pattern.test(message)) return topic;
    }
    return 'general';
}

// ---------------------------------------------------------------------------
// Secret redaction (applied to error details before logging)
// ---------------------------------------------------------------------------

function redactSecrets(s: string): string {
    return s
        .replace(/\b(sk-|ghp_|gho_|glpat-|Bearer\s+|token[=:]\s*)\S+/gi, '$1[REDACTED]')
        .replace(/:\/\/[^@\s]+@/g, '://[REDACTED]@')
        .replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, '[REDACTED_KEY]');
}

// ---------------------------------------------------------------------------
// Error detail extraction (redacted for safety)
// ---------------------------------------------------------------------------

function extractErrorDetail(toolOutput: string | undefined, maxLen: number = 300): string | null {
    if (!toolOutput) return null;
    return truncate(redactSecrets(toolOutput), maxLen);
}

// ---------------------------------------------------------------------------
// Session phase classification (Wave 1b)
// ---------------------------------------------------------------------------

type SessionPhase = 'exploring' | 'implementing' | 'testing' | 'mixed';

interface ToolDistribution {
    [tool: string]: number; // percentage (0-100)
}

function classifySessionPhase(toolCounts: Record<string, number>, inputSummaries?: string[]): SessionPhase {
    const total = Object.values(toolCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return 'mixed';

    const pct = (tool: string) => ((toolCounts[tool] || 0) / total) * 100;

    const readPct = pct('Read');
    const webSearchPct = pct('WebSearch');
    const editPct = pct('Edit');
    const writePct = pct('Write');
    const bashPct = pct('Bash');

    // Testing: Bash-heavy with test-related input summaries
    if (bashPct > 40 && inputSummaries) {
        const testRelated = inputSummaries.filter(s =>
            /\btest\b|\bbun test\b|\bspec\b|\bjest\b/i.test(s)
        ).length;
        if (testRelated / inputSummaries.length > 0.3) return 'testing';
    }

    // Exploring: Read-heavy, search-heavy, minimal edits
    if (readPct > 45 && webSearchPct > 3 && editPct < 3) return 'exploring';

    // Implementing: Edit/Write-heavy with substantial Bash
    if (editPct > 5 && writePct > 3 && bashPct > 35) return 'implementing';

    return 'mixed';
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    extractInputSummary,
    classifyTopic,
    extractErrorDetail,
    classifySessionPhase,
};
