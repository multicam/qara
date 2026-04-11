#!/usr/bin/env bun
/**
 * screenshot-analyze — Local visual analysis via Gemma 4 vision.
 *
 * Analyzes webpage screenshots for layout issues, broken elements,
 * and visual regressions using Ollama's vision API.
 *
 * Usage:
 *   bun screenshot-analyze.ts <image-path>
 *   bun screenshot-analyze.ts --dir <screenshots-dir>
 *   bun screenshot-analyze.ts --compare --baseline <dir> --current <dir>
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

interface AnalysisResult {
    file: string;
    passed: boolean;
    issues: string[];
    model: string;
}

export function parseIssues(response: string, passPhrase: string): { issues: string[]; passed: boolean } {
    const issues = response
        .split('\n')
        .filter(l => l.trim().startsWith('*') || l.trim().startsWith('-'))
        .map(l => l.trim().replace(/^[*-]\s*/, ''));
    const passed = issues.length === 0 || response.toLowerCase().includes(passPhrase);
    return { issues, passed };
}

export function printResults(results: AnalysisResult[], jsonOutput: boolean, summaryNoun: string): void {
    if (jsonOutput) {
        console.log(JSON.stringify(results, null, 2));
    } else {
        for (const r of results) {
            console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.file}`);
            for (const issue of r.issues) console.log(`  - ${issue}`);
        }
        const failed = results.filter(r => !r.passed).length;
        console.log(`\n${results.length} images ${summaryNoun}, ${failed} with issues`);
    }
}

export async function ollamaVision(
    prompt: string,
    images: string[],
    model: string = DEFAULT_MODEL,
): Promise<string> {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt, images }],
            stream: false,
            options: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Ollama vision error: ${res.status}`);
    const data = (await res.json()) as { message: { content: string } };
    return data.message.content;
}

export function imageToBase64(filepath: string): string {
    return readFileSync(filepath).toString('base64');
}

export function findImages(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findImages(full));
        } else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
            files.push(full);
        }
    }
    return files;
}

export async function analyzeSingle(filepath: string, model: string): Promise<AnalysisResult> {
    const b64 = imageToBase64(filepath);
    const response = await ollamaVision(
        'Analyze this webpage screenshot. Flag: layout breaks, overlapping elements, text readability issues, broken images, dark mode contrast problems. If everything looks fine, say "No visual issues." Max 5 bullets. No preamble.',
        [b64],
        model,
    );
    const { issues, passed } = parseIssues(response, 'no visual issues');
    return { file: filepath, passed, issues, model };
}

export async function compareImages(
    baselinePath: string,
    currentPath: string,
    model: string,
): Promise<AnalysisResult> {
    const b64Baseline = imageToBase64(baselinePath);
    const b64Current = imageToBase64(currentPath);
    const response = await ollamaVision(
        'Compare these two webpage screenshots. The first is the baseline (expected), the second is the current version. Describe any visual differences. If they look identical, say "No changes detected." Max 5 bullets. No preamble.',
        [b64Baseline, b64Current],
        model,
    );
    const { issues, passed } = parseIssues(response, 'no changes detected');
    return { file: currentPath, passed, issues, model };
}

export async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h') || args.length === 0) {
        console.log('screenshot-analyze — Local visual analysis via Gemma 4');
        console.log('Usage:');
        console.log('  bun screenshot-analyze.ts <image-path>          Analyze single image');
        console.log('  bun screenshot-analyze.ts --dir <dir>           Analyze all images in directory');
        console.log('  bun screenshot-analyze.ts --compare --baseline <dir> --current <dir>');
        console.log('Options:');
        console.log('  --model <name>   Ollama model (default: gemma4)');
        console.log('  --json           Output as JSON');
        return;
    }

    const modelIdx = args.indexOf('--model');
    const model = modelIdx >= 0 ? args[modelIdx + 1] : DEFAULT_MODEL;
    const jsonOutput = args.includes('--json');

    // Compare mode
    if (args.includes('--compare')) {
        const baseIdx = args.indexOf('--baseline');
        const currIdx = args.indexOf('--current');
        if (baseIdx < 0 || currIdx < 0) {
            console.error('--compare requires --baseline <dir> and --current <dir>');
            process.exit(1);
        }
        const baselineDir = args[baseIdx + 1];
        const currentDir = args[currIdx + 1];
        const currentImages = findImages(currentDir);
        const results: AnalysisResult[] = [];

        for (const currentFile of currentImages) {
            const rel = currentFile.slice(currentDir.length);
            const baselineFile = join(baselineDir, rel);
            if (!existsSync(baselineFile)) {
                results.push({ file: currentFile, passed: false, issues: ['No baseline found'], model });
                continue;
            }
            console.error(`Comparing: ${rel}...`);
            results.push(await compareImages(baselineFile, currentFile, model));
        }

        printResults(results, jsonOutput, 'compared');
        return;
    }

    // Directory mode
    if (args.includes('--dir')) {
        const dirIdx = args.indexOf('--dir');
        const dir = args[dirIdx + 1];
        const images = findImages(dir);
        if (images.length === 0) {
            console.log('No images found.');
            return;
        }
        const results: AnalysisResult[] = [];
        for (const img of images) {
            console.error(`Analyzing: ${basename(img)}...`);
            results.push(await analyzeSingle(img, model));
        }
        printResults(results, jsonOutput, 'analyzed');
        return;
    }

    // Single file mode
    const filepath = args.find(a => !a.startsWith('--'));
    if (!filepath || !existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
    }
    const result = await analyzeSingle(filepath, model);
    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(result.passed ? 'PASS — No visual issues' : 'FAIL — Issues found:');
        for (const issue of result.issues) console.log(`  - ${issue}`);
    }
}

// Direct-run guard — prevents main() from executing during test imports.
// Matches the pattern used in cc-version-check.ts and analyse-pai.ts.
const isDirectRun = import.meta.path === Bun.main ||
    process.argv[1]?.endsWith('screenshot-analyze.ts');
if (isDirectRun) {
    main().catch(err => { console.error(err); process.exit(1); });
}
