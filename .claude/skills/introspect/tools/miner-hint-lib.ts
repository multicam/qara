/**
 * miner-hint-lib — Hint compliance metrics for Qara's introspection pipeline.
 *
 * Computes how well session hints are being followed by analyzing tool usage
 * patterns. Extracted from miner-lib.ts to respect 500-line module limit.
 *
 * Pure functions — no I/O except readActiveHintsFromFile().
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolEntry {
    tool: string;
    error: boolean;
    timestamp: string;
}

interface ToolEntryWithSummary extends ToolEntry {
    input_summary?: string;
    session_id?: string;
}

interface HintCompliance {
    /** Bash calls as % of total tool calls */
    bash_pct: number;
    /** Agent calls as % of total tool calls */
    agent_delegation_pct: number;
    /** Fraction of Bash calls that are immediate retries after a Bash error */
    bash_retry_rate: number;
}

interface QualityMetrics {
    /** Read calls / (Edit + Write + MultiEdit calls). Target >= 4.0 */
    read_edit_ratio: number;
    /** % of Edit/Write where file was not Read earlier in the same session */
    edits_without_read_pct: number;
}

// ---------------------------------------------------------------------------
// computeHintCompliance
// ---------------------------------------------------------------------------

/**
 * Compute hint compliance metrics from tool usage entries.
 *
 * Uses simple proxies (not intent classification):
 * - bash_pct: total Bash calls / total calls
 * - agent_delegation_pct: Agent calls / total calls
 * - bash_retry_rate: consecutive (Bash+error → Bash) pairs / total Bash calls
 */
function computeHintCompliance(entries: ToolEntry[]): HintCompliance {
    if (entries.length === 0) {
        return { bash_pct: 0, agent_delegation_pct: 0, bash_retry_rate: 0 };
    }

    const total = entries.length;
    const bashCount = entries.filter(e => e.tool === 'Bash').length;
    const agentCount = entries.filter(e => e.tool === 'Agent').length;

    // Bash % and Agent %
    const bash_pct = Math.round((bashCount / total) * 1000) / 10;
    const agent_delegation_pct = Math.round((agentCount / total) * 1000) / 10;

    // Bash→Bash retry rate: sort by timestamp, find consecutive Bash pairs
    // where the first has error=true
    const sorted = [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let retryPairs = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].tool === 'Bash' && sorted[i].error && sorted[i + 1].tool === 'Bash') {
            retryPairs++;
        }
    }

    const bash_retry_rate = bashCount > 0
        ? Math.round((retryPairs / bashCount) * 1000) / 1000
        : 0;

    return { bash_pct, agent_delegation_pct, bash_retry_rate };
}

// ---------------------------------------------------------------------------
// computeQualityMetrics (#42796 defense)
// ---------------------------------------------------------------------------

/**
 * Extract file path from input_summary strings like "file: /src/a.ts".
 * Returns undefined for non-file summaries (commands, patterns, etc.).
 */
function extractFilePath(summary: string | undefined): string | undefined {
    if (!summary) return undefined;
    const match = summary.match(/^file:\s*(.+)$/);
    return match ? match[1].trim() : undefined;
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

/**
 * Compute quality metrics from tool usage entries with input summaries.
 *
 * Tracks per-session read sets to determine whether files were read before
 * being edited. Based on benchmarks from anthropics/claude-code#42796:
 *   GOOD:  read_edit_ratio >= 4.0, edits_without_read_pct <= 10%
 *   WARN:  read_edit_ratio 2.0-4.0, edits_without_read_pct 10-25%
 *   BAD:   read_edit_ratio < 2.0, edits_without_read_pct > 25%
 */
function computeQualityMetrics(entries: ToolEntryWithSummary[]): QualityMetrics {
    if (entries.length === 0) return { read_edit_ratio: 0, edits_without_read_pct: 0 };

    const sorted = [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let readCount = 0;
    let editCount = 0;
    let blindEdits = 0;
    const readSets = new Map<string, Set<string>>(); // session_id → Set<file_path>

    for (const e of sorted) {
        const session = e.session_id || 'unknown';
        const filePath = extractFilePath(e.input_summary);

        if (e.tool === 'Read' && filePath) {
            readCount++;
            if (!readSets.has(session)) readSets.set(session, new Set());
            readSets.get(session)!.add(filePath);
        } else if (EDIT_TOOLS.has(e.tool) && filePath) {
            editCount++;
            const sessionReads = readSets.get(session);
            if (!sessionReads || !sessionReads.has(filePath)) {
                blindEdits++;
            }
        }
    }

    return {
        read_edit_ratio: editCount > 0
            ? Math.round((readCount / editCount) * 10) / 10
            : 0,
        edits_without_read_pct: editCount > 0
            ? Math.round((blindEdits / editCount) * 1000) / 10
            : 0,
    };
}

// ---------------------------------------------------------------------------
// readActiveHints
// ---------------------------------------------------------------------------

/**
 * Parse active hints from session-hints.md content.
 *
 * Extracts bullet points under the "## Active Hints" heading.
 * Stops at the next heading or end of file.
 */
function readActiveHints(content: string): string[] {
    if (!content) return [];

    const marker = '## Active Hints';
    const idx = content.indexOf(marker);
    if (idx === -1) return [];

    // Get content after the heading
    const afterHeading = content.slice(idx + marker.length);

    // Stop at next heading
    const nextHeading = afterHeading.search(/\n## /);
    const section = nextHeading !== -1
        ? afterHeading.slice(0, nextHeading)
        : afterHeading;

    // Extract bullet points
    return section
        .split('\n')
        .filter(line => line.trimStart().startsWith('- '))
        .map(line => line.trimStart().slice(2).trim());
}

/**
 * Read active hints from the session-hints.md file on disk.
 *
 * Returns empty array if file doesn't exist or can't be read.
 */
function readActiveHintsFromFile(introspectionDir: string): string[] {
    try {
        const content = readFileSync(
            join(introspectionDir, 'session-hints.md'),
            'utf-8',
        );
        return readActiveHints(content);
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    computeHintCompliance,
    computeQualityMetrics,
    readActiveHints,
    readActiveHintsFromFile,
    type ToolEntry,
    type ToolEntryWithSummary,
    type HintCompliance,
    type QualityMetrics,
};
