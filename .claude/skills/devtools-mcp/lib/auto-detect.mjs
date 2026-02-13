#!/usr/bin/env node

/**
 * auto-detect.mjs
 *
 * Detects dev server configuration from package.json
 * - Framework detection (Gatsby, Next.js, Vite, CRA, etc.)
 * - Port parsing from dev scripts
 * - URL construction for localhost
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { isReactProject, detectReactGrab } from './react-grab-detect.mjs';

/**
 * Framework detection from package.json dependencies
 */
const FRAMEWORK_SIGNATURES = {
  gatsby: ['gatsby'],
  next: ['next'],
  sveltekit: ['@sveltejs/kit'],
  nuxt: ['nuxt'],
  astro: ['astro'],
  remix: ['@remix-run/dev'],
  cra: ['react-scripts'],
  vite: ['vite'],
};

/**
 * Default ports for known frameworks
 */
const FRAMEWORK_PORTS = {
  gatsby: 8000,
  next: 3000,
  vite: 5173,
  cra: 3000,
  nuxt: 3000,
  astro: 4321,
  remix: 3000,
  sveltekit: 5173,
  unknown: 3000,
};

/**
 * Port parsing patterns
 * Matches: -p 3000, --port=8000, --port 5173, -P 8080
 */
const PORT_PATTERNS = [
  /-p\s+(\d+)/,           // -p 3000
  /--port[=\s]+(\d+)/,    // --port=8000 or --port 8000
  /-P\s+(\d+)/,           // -P 8080 (capital P)
];

/**
 * Detect framework from package.json dependencies
 */
export function detectFramework(pkg) {
  if (!pkg) return 'unknown';

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // Check each framework signature
  for (const [framework, deps] of Object.entries(FRAMEWORK_SIGNATURES)) {
    if (deps.some(dep => allDeps[dep])) {
      return framework;
    }
  }

  return 'unknown';
}

/**
 * Find dev script from package.json scripts
 * Priority: dev, start, serve
 * Returns the script content (value)
 */
export function findDevScript(scripts) {
  if (!scripts) return null;

  const priorities = ['dev', 'start', 'serve', 'develop'];

  for (const key of priorities) {
    if (scripts[key]) {
      return scripts[key];
    }
  }

  return null;
}

/**
 * Find dev script name (key) from package.json scripts
 * Returns the script name for use with package manager (e.g. 'dev', 'start')
 */
function findDevScriptName(scripts) {
  if (!scripts) return null;

  const priorities = ['dev', 'start', 'serve', 'develop'];

  for (const key of priorities) {
    if (scripts[key]) {
      return key;
    }
  }

  return null;
}

/**
 * Parse port from dev script command
 */
export function parsePort(devScript, framework) {
  if (!devScript) return null;

  // Try each port pattern
  for (const pattern of PORT_PATTERNS) {
    const match = devScript.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // No port found in script
  return null;
}

/**
 * Get default port for framework
 */
export function getDefaultPort(framework) {
  return FRAMEWORK_PORTS[framework] || FRAMEWORK_PORTS.unknown;
}

/**
 * Read and parse package.json from project directory
 */
export async function readPackageJson(projectPath = process.cwd()) {
  try {
    const pkgPath = resolve(projectPath, 'package.json');
    const content = await readFile(pkgPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`No package.json found in ${projectPath}`);
    }
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
}

/**
 * Detect package manager from lockfiles
 * Priority: pnpm > yarn > bun > npm
 */
async function detectPackageManager(projectPath) {
  const { access } = await import('fs/promises');
  const checks = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ];
  for (const [lockfile, pm] of checks) {
    try {
      await access(resolve(projectPath, lockfile));
      return pm;
    } catch {}
  }
  return 'npm';
}

/**
 * Main detection function
 * Returns complete dev server config
 */
export async function detectDevConfig(projectPath = process.cwd()) {
  try {
    // Read package.json
    const pkg = await readPackageJson(projectPath);

    // Detect framework
    const framework = detectFramework(pkg);

    // Find dev script name and content
    const devScriptName = findDevScriptName(pkg.scripts);
    const devScript = devScriptName ? pkg.scripts[devScriptName] : null;

    // Parse port from script
    const scriptPort = devScript ? parsePort(devScript, framework) : null;

    // Determine final port
    const port = scriptPort || getDefaultPort(framework);

    // Build URL
    const url = `http://localhost:${port}`;

    // React and react-grab detection (parallel with package manager)
    const isReact = isReactProject(pkg);
    const [pm, reactGrab] = await Promise.all([
      detectPackageManager(projectPath),
      isReact ? detectReactGrab(projectPath) : Promise.resolve(null),
    ]);

    // Build start command using package manager + script name
    const startCommand = devScriptName ? `${pm} ${devScriptName}` : `${pm} run dev`;

    return {
      framework,
      port,
      url,
      startCommand,
      devScript,
      isReact,
      reactGrab,
      detected: true,
      projectPath,
    };
  } catch (error) {
    return {
      framework: 'unknown',
      port: null,
      url: null,
      startCommand: null,
      devScript: null,
      detected: false,
      error: error.message,
      projectPath,
    };
  }
}

/**
 * CLI usage
 */
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const projectPath = process.argv[2] || process.cwd();

  try {
    const config = await detectDevConfig(projectPath);
    console.log(JSON.stringify(config, null, 2));

    if (!config.detected) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
