#!/usr/bin/env bun
/**
 * pre-commit-scan — Local code review via Gemma 4 before commit.
 *
 * Sends staged diff to Ollama for quick issue detection.
 * Advisory only — prints findings but doesn't block.
 *
 * Usage: bun pre-commit-scan.ts [--model MODEL] [--timeout MS]
 */

import { join } from 'path';
const PAI_DIR = process.env.PAI_DIR || join(require('os').homedir(), '.claude');
const { chat, isAvailable } = await import(join(PAI_DIR, 'hooks/lib/ollama-client'));
import { execSync } from 'child_process';

const DEFAULT_TIMEOUT = 30_000;

function getStagedDiff(): string {
    try {
        return execSync('git diff --cached --diff-filter=ACMR', { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
    } catch {
        return '';
    }
}

function getUnstagedDiff(): string {
    try {
        return execSync('git diff --diff-filter=ACMR', { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
    } catch {
        return '';
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const modelIdx = args.indexOf('--model');
    const model = modelIdx >= 0 ? args[modelIdx + 1] : undefined;
    const timeoutIdx = args.indexOf('--timeout');
    const timeout = timeoutIdx >= 0 ? parseInt(args[timeoutIdx + 1]) : DEFAULT_TIMEOUT;

    if (args.includes('--help') || args.includes('-h')) {
        console.log('pre-commit-scan — Local code review via Gemma 4');
        console.log('Usage: bun pre-commit-scan.ts [--model MODEL] [--timeout MS]');
        console.log('Scans staged diff (or unstaged if nothing staged).');
        return;
    }

    if (!(await isAvailable())) {
        console.log('⏭ Ollama not running — skipping scan');
        return;
    }

    let diff = getStagedDiff();
    let source = 'staged';
    if (!diff) {
        diff = getUnstagedDiff();
        source = 'unstaged';
    }
    if (!diff) {
        console.log('No changes to scan.');
        return;
    }

    // Truncate large diffs
    const MAX_DIFF = 4000;
    const truncated = diff.length > MAX_DIFF;
    if (truncated) diff = diff.slice(0, MAX_DIFF);

    console.log(`Scanning ${source} changes (${diff.split('\n').length} lines${truncated ? ', truncated' : ''})...`);

    try {
        const response = await chat({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a code reviewer. Given a git diff, flag obvious issues: bugs, security holes, unused variables, missing error handling, type errors. Max 5 bullets. If clean, say "No issues found." No preamble.',
                },
                {
                    role: 'user',
                    content: `Review this diff:\n\n${diff}`,
                },
            ],
            temperature: 0.2,
            timeout,
        });

        console.log('\n' + response);
    } catch (err) {
        console.log(`Scan failed: ${err instanceof Error ? err.message : err}`);
    }
}

main();
