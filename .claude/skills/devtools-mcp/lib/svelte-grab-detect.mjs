#!/usr/bin/env node

/**
 * svelte-grab-detect.mjs
 *
 * Detects svelte-grab setup status in a project:
 * - Is the project Svelte-based?
 * - Is svelte-grab installed?
 * - Is the SvelteGrab/SvelteDevKit component injected in the layout file?
 * - Is the svelte-grab MCP server configured?
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

/**
 * Layout file locations per Svelte framework variant
 */
const SVELTE_LAYOUT_FILES = {
  sveltekit: ['src/routes/+layout.svelte'],
  'svelte-vite': ['src/App.svelte', 'src/main.ts', 'src/main.js'],
};

/**
 * Patterns that indicate svelte-grab component injection
 */
const SVELTE_GRAB_PATTERNS = [/svelte-grab/, /SvelteGrab/, /SvelteDevKit/];

/**
 * Check if project has Svelte in dependencies
 */
export function isSvelteProject(pkg) {
  if (!pkg) return false;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(allDeps['svelte']);
}

/**
 * Detect the Svelte framework variant (sveltekit or svelte-vite)
 */
export function detectSvelteFramework(pkg) {
  if (!pkg) return null;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (allDeps['@sveltejs/kit']) return 'sveltekit';
  if (allDeps['svelte'] && allDeps['vite']) return 'svelte-vite';
  if (allDeps['svelte']) return 'svelte-vite'; // fallback for bare svelte

  return null;
}

/**
 * Check if svelte-grab is installed in dependencies
 */
export function isSvelteGrabInstalled(pkg) {
  if (!pkg) return false;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(allDeps['svelte-grab'] || allDeps['@ygo/svelte-grab']);
}

/**
 * Check if svelte-grab component is injected in the appropriate layout file
 */
export async function checkSvelteGrabInjected(projectPath, variant) {
  const candidates = SVELTE_LAYOUT_FILES[variant];
  if (!candidates) return { injected: false, layoutFile: null, checkedFiles: [] };

  const checkedFiles = [];

  for (const file of candidates) {
    const filePath = resolve(projectPath, file);
    checkedFiles.push(file);

    try {
      const content = await readFile(filePath, 'utf-8');
      const hasComponent = SVELTE_GRAB_PATTERNS.some(p => p.test(content));

      if (hasComponent) {
        return { injected: true, layoutFile: file, checkedFiles };
      }

      // File exists but no component — this is THE layout file
      return { injected: false, layoutFile: file, checkedFiles };
    } catch {
      // File doesn't exist, try next candidate
    }
  }

  return { injected: false, layoutFile: null, checkedFiles };
}

/**
 * Check if svelte-grab MCP server is configured in Claude config
 */
export async function checkSvelteGrabMcpConfigured(projectPath = process.cwd()) {
  const configPaths = [
    resolve(homedir(), '.config/claude-desktop/claude_desktop_config.json'),
    resolve(projectPath, '.mcp.json'),
  ];

  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      const servers = config.mcpServers || {};

      if (servers['svelte-grab-mcp'] || servers['svelte-grab']) {
        return { configured: true, configPath };
      }
    } catch {
      // Config doesn't exist or isn't valid JSON
    }
  }

  return { configured: false, configPath: null };
}

/**
 * Full svelte-grab detection for a project
 * Returns structured result for CLI consumption
 */
export async function detectSvelteGrab(projectPath = process.cwd()) {
  let pkg;
  try {
    const content = await readFile(resolve(projectPath, 'package.json'), 'utf-8');
    pkg = JSON.parse(content);
  } catch {
    return {
      isSvelte: false,
      installed: false,
      componentInjected: false,
      mcpConfigured: false,
      framework: null,
      layoutFile: null,
      ready: false,
    };
  }

  const isSvelte = isSvelteProject(pkg);
  if (!isSvelte) {
    return {
      isSvelte: false,
      installed: false,
      componentInjected: false,
      mcpConfigured: false,
      framework: null,
      layoutFile: null,
      ready: false,
    };
  }

  const framework = detectSvelteFramework(pkg);

  const installed = isSvelteGrabInstalled(pkg);
  const componentCheck = await checkSvelteGrabInjected(projectPath, framework);
  const mcpCheck = await checkSvelteGrabMcpConfigured(projectPath);

  return {
    isSvelte: true,
    installed,
    componentInjected: componentCheck.injected,
    mcpConfigured: mcpCheck.configured,
    framework,
    layoutFile: componentCheck.layoutFile,
    ready: installed && componentCheck.injected && mcpCheck.configured,
  };
}

/**
 * CLI usage — outputs JSON, always exits 0 (check result.ready for status)
 */
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const projectPath = process.argv[2] || process.cwd();

  try {
    const result = await detectSvelteGrab(projectPath);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ready: false, error: error.message }));
  }
}
