#!/usr/bin/env bun
/**
 * Thin CLI adapter around skills-detect-lib for the bash sync script.
 *
 * Subcommands:
 *   detect --old <dir> --new <dir>         → JSON to stdout
 *   render --name <s> --detect <json> --diff <s>  → markdown review entry to stdout
 */

import { detectChanges, renderReviewEntry, type DetectOutput } from './skills-detect-lib';

function arg(flag: string): string | undefined {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
    const cmd = process.argv[2];

    if (cmd === 'detect') {
        const oldDir = arg('--old');
        const newDir = arg('--new');
        if (!oldDir || !newDir) {
            console.error('Usage: detect --old <dir> --new <dir>');
            process.exit(1);
        }
        const result = await detectChanges({ oldSkillDir: oldDir, newSkillDir: newDir });
        console.log(JSON.stringify(result));
        return;
    }

    if (cmd === 'render') {
        const name = arg('--name');
        const detectJson = arg('--detect');
        const diff = arg('--diff') ?? '';
        if (!name || !detectJson) {
            console.error('Usage: render --name <s> --detect <json> --diff <s>');
            process.exit(1);
        }
        let parsed: DetectOutput;
        try { parsed = JSON.parse(detectJson); } catch {
            console.error('Invalid --detect JSON');
            process.exit(1);
        }
        console.log(renderReviewEntry(name, parsed, diff));
        return;
    }

    console.error('Unknown subcommand. Use: detect | render');
    process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
