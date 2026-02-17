#!/usr/bin/env node

/**
 * react-grab-detect.mjs
 *
 * Detects react-grab setup status in a project:
 * - Is the project React-based?
 * - Is react-grab installed?
 * - Is the grab script injected in the layout file?
 * - Is the react-grab MCP server configured?
 */

import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

/**
 * Layout file locations per framework
 */
const LAYOUT_FILES = {
  'next-app': ['app/layout.tsx', 'app/layout.jsx', 'app/layout.js', 'src/app/layout.tsx', 'src/app/layout.jsx', 'src/app/layout.js'],
  'next-pages': ['pages/_document.tsx', 'pages/_document.jsx', 'pages/_document.js', 'src/pages/_document.tsx', 'src/pages/_document.jsx', 'src/pages/_document.js'],
  vite: ['index.html'],
  cra: ['public/index.html'],
  gatsby: ['gatsby-browser.tsx', 'gatsby-browser.jsx', 'gatsby-browser.js'],
};

/**
 * Patterns that indicate react-grab script injection
 */
const GRAB_SCRIPT_PATTERNS = [
  /react-grab/,
  /@react-grab/,
  /grab\.js/,
  /unpkg\.com\/react-grab/,
];

/**
 * Check if project has React in dependencies
 */
export function isReactProject(pkg) {
  if (!pkg) return false;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(allDeps['react']);
}

/**
 * Detect the React framework variant (next-app, next-pages, vite, cra, gatsby)
 */
export function detectReactFramework(pkg) {
  if (!pkg) return null;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (allDeps['next']) return 'next'; // resolved to next-app or next-pages below
  if (allDeps['gatsby']) return 'gatsby';
  if (allDeps['react-scripts']) return 'cra';
  if (allDeps['vite']) return 'vite';

  return null;
}

/**
 * Resolve Next.js to app-router or pages-router variant
 */
async function resolveNextVariant(projectPath) {
  // Check for app directory (App Router)
  for (const dir of ['app', 'src/app']) {
    try {
      await access(resolve(projectPath, dir), constants.F_OK);
      return 'next-app';
    } catch {}
  }
  return 'next-pages';
}

/**
 * Check if react-grab is installed in devDependencies
 */
export function isGrabInstalled(pkg) {
  if (!pkg) return false;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(allDeps['react-grab'] || allDeps['@anthropic-ai/react-grab']);
}

/**
 * Check if react-grab script is injected in the appropriate layout file
 */
export async function checkGrabScriptInjected(projectPath, frameworkVariant) {
  const candidates = LAYOUT_FILES[frameworkVariant];
  if (!candidates) return { injected: false, layoutFile: null, checkedFiles: [] };

  const checkedFiles = [];

  for (const file of candidates) {
    const filePath = resolve(projectPath, file);
    checkedFiles.push(file);

    try {
      const content = await readFile(filePath, 'utf-8');
      const hasScript = GRAB_SCRIPT_PATTERNS.some(p => p.test(content));

      if (hasScript) {
        return { injected: true, layoutFile: file, checkedFiles };
      }

      // File exists but no script — this is THE layout file
      return { injected: false, layoutFile: file, checkedFiles };
    } catch {
      // File doesn't exist, try next candidate
    }
  }

  return { injected: false, layoutFile: null, checkedFiles };
}

/**
 * Check if react-grab MCP server is configured in Claude config
 */
export async function checkGrabMcpConfigured(projectPath = process.cwd()) {
  const configPaths = [
    resolve(homedir(), '.config/claude-desktop/claude_desktop_config.json'),
    resolve(projectPath, '.mcp.json'),
  ];

  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      const servers = config.mcpServers || {};

      if (servers['react-grab-mcp'] || servers['react-grab']) {
        return { configured: true, configPath };
      }
    } catch {
      // Config doesn't exist or isn't valid JSON
    }
  }

  return { configured: false, configPath: null };
}

/**
 * Full react-grab detection for a project
 * Returns structured result for CLI consumption
 */
export async function detectReactGrab(projectPath = process.cwd()) {
  let pkg;
  try {
    const content = await readFile(resolve(projectPath, 'package.json'), 'utf-8');
    pkg = JSON.parse(content);
  } catch {
    return {
      isReact: false,
      installed: false,
      scriptInjected: false,
      mcpConfigured: false,
      framework: null,
      layoutFile: null,
      ready: false,
    };
  }

  const isReact = isReactProject(pkg);
  if (!isReact) {
    return {
      isReact: false,
      installed: false,
      scriptInjected: false,
      mcpConfigured: false,
      framework: null,
      layoutFile: null,
      ready: false,
    };
  }

  const framework = detectReactFramework(pkg, projectPath);

  // Resolve Next.js variant
  let frameworkVariant = framework;
  if (framework === 'next') {
    frameworkVariant = await resolveNextVariant(projectPath);
  }

  const installed = isGrabInstalled(pkg);
  const scriptCheck = await checkGrabScriptInjected(projectPath, frameworkVariant);
  const mcpCheck = await checkGrabMcpConfigured(projectPath);

  return {
    isReact: true,
    installed,
    scriptInjected: scriptCheck.injected,
    mcpConfigured: mcpCheck.configured,
    framework: frameworkVariant,
    layoutFile: scriptCheck.layoutFile,
    ready: installed && scriptCheck.injected && mcpCheck.configured,
  };
}

/**
 * CLI usage — outputs JSON, exits non-zero if not ready
 */
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const projectPath = process.argv[2] || process.cwd();

  try {
    const result = await detectReactGrab(projectPath);
    console.log(JSON.stringify(result, null, 2));

    if (!result.ready) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
