#!/usr/bin/env bun
/**
 * package-skill.ts
 *
 * Packages a PAI skill directory into a .skill zip archive.
 *
 * Usage: bun run package-skill.ts <skill-dir> <output.skill>
 *
 * Exit codes:
 *   0 — success
 *   1 — zip failure
 *   2 — bad arguments or internal error
 */

import { existsSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';

// Patterns excluded from the archive
const EXCLUDE_PATTERNS = [
    '.backup-*',
    'node_modules',
    '.DS_Store',
    '*.test.ts',
    '*.spec.ts',
];

async function main(): Promise<void> {
    const skillDir = process.argv[2];
    const outputPath = process.argv[3];

    if (!skillDir || !outputPath) {
        process.stderr.write('Usage: bun run package-skill.ts <skill-dir> <output.skill>\n');
        process.exit(2);
    }

    const absSkillDir = resolve(skillDir);
    const absOutput = resolve(outputPath);

    if (!existsSync(absSkillDir)) {
        process.stderr.write(`Error: skill directory not found: ${absSkillDir}\n`);
        process.exit(2);
    }

    if (!existsSync(`${absSkillDir}/SKILL.md`)) {
        process.stderr.write(`Error: ${absSkillDir}/SKILL.md not found — is this a skill directory?\n`);
        process.exit(2);
    }

    // Build zip exclude args
    const excludeArgs: string[] = [];
    for (const pattern of EXCLUDE_PATTERNS) {
        excludeArgs.push('-x', `*/${pattern}`, '-x', pattern);
    }

    // Shell out to zip -r (Bun has no native zip)
    const skillName = basename(absSkillDir);
    process.stderr.write(`Packaging ${skillName} → ${absOutput}\n`);

    const proc = Bun.spawnSync(
        ['zip', '-r', absOutput, '.', ...excludeArgs],
        { cwd: absSkillDir, stdout: 'pipe', stderr: 'pipe' },
    );

    if (proc.exitCode !== 0) {
        const errMsg = proc.stderr ? new TextDecoder().decode(proc.stderr) : '(no stderr)';
        process.stderr.write(`zip failed (exit ${proc.exitCode}): ${errMsg}\n`);
        process.exit(1);
    }

    const stat = statSync(absOutput);
    // Count files from zip stdout output (one line per file)
    const zipOut = proc.stdout ? new TextDecoder().decode(proc.stdout) : '';
    const fileCount = zipOut.split('\n').filter(l => l.trim().startsWith('adding:')).length;

    const result = {
        output: absOutput,
        bytes: stat.size,
        files: fileCount,
    };

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.stderr.write(`Done: ${fileCount} files, ${stat.size} bytes\n`);
}

if (import.meta.path === Bun.main || process.argv[1]?.endsWith('package-skill.ts')) {
    main().catch(err => {
        process.stderr.write(`Fatal: ${err}\n`);
        process.exit(2);
    });
}
