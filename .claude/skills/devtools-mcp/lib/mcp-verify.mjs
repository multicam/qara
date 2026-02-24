#!/usr/bin/env node

/**
 * mcp-verify.mjs
 *
 * Verifies Chrome DevTools MCP setup is complete and connected
 * - Config file exists
 * - Server configured
 * - Binary installed
 * - Browser available
 * - Connection active
 */

import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detectBrowser } from './browser-detect.mjs';
import { detectReactGrab, isReactProject } from './react-grab-detect.mjs';

/**
 * MCP config file path
 */
const MCP_CONFIG_PATH = resolve(
  homedir(),
  '.config/claude-desktop/claude_desktop_config.json'
);

/**
 * Known MCP server names for DevTools (checked first, then pattern fallback)
 */
const DEVTOOLS_SERVER_NAMES = [
  'brave-devtools',
  'chrome-devtools',
  'devtools',
];

/**
 * Pattern to match custom DevTools server names (e.g. "my-devtools", "chromium-devtools")
 */
const DEVTOOLS_NAME_PATTERN = /devtools|chrome-devtools-mcp/i;

/**
 * Resolve SKILL_DIR from this file's location
 */
function getSkillDir() {
  const __filename = fileURLToPath(import.meta.url);
  return dirname(dirname(__filename));
}

/**
 * Check if MCP config file exists
 */
async function checkConfigExists() {
  try {
    await access(MCP_CONFIG_PATH, constants.F_OK);
    return { passed: true, path: MCP_CONFIG_PATH };
  } catch {
    const skillDir = getSkillDir();
    return {
      passed: false,
      error: `Config file not found: ${MCP_CONFIG_PATH}`,
      fix: `Create the file with:\nmkdir -p ~/.config/claude-desktop\ncp ${skillDir}/templates/mcp-config.json ~/.config/claude-desktop/claude_desktop_config.json`,
    };
  }
}

/**
 * Check if DevTools MCP server is configured
 */
async function checkServerConfigured() {
  try {
    const content = await readFile(MCP_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content);

    if (!config.mcpServers) {
      return {
        passed: false,
        error: 'No mcpServers section in config',
        fix: 'Add mcpServers section to config file',
      };
    }

    // Check exact names first, then fall back to pattern match
    let serverName = DEVTOOLS_SERVER_NAMES.find(
      name => config.mcpServers[name]
    );

    if (!serverName) {
      // Pattern fallback: match any server name containing "devtools" or using chrome-devtools-mcp command
      serverName = Object.keys(config.mcpServers).find(name => {
        if (DEVTOOLS_NAME_PATTERN.test(name)) return true;
        const server = config.mcpServers[name];
        return server?.command === 'chrome-devtools-mcp';
      });
    }

    if (!serverName) {
      return {
        passed: false,
        error: `No DevTools server configured. Looking for: ${DEVTOOLS_SERVER_NAMES.join(', ')} (or any name matching /devtools/i)`,
        fix: 'Add a DevTools MCP server to config (see docs/setup.md)',
      };
    }

    return {
      passed: true,
      serverName,
      config: config.mcpServers[serverName],
    };
  } catch (error) {
    return {
      passed: false,
      error: `Failed to read config: ${error.message}`,
      fix: 'Check config file is valid JSON',
    };
  }
}

/**
 * Check if chrome-devtools-mcp binary is installed
 */
function checkBinaryInstalled() {
  try {
    const result = execSync('command -v chrome-devtools-mcp', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: true,
    });

    return {
      passed: true,
      path: result.trim(),
    };
  } catch {
    return {
      passed: false,
      error: 'chrome-devtools-mcp binary not found in PATH',
      fix: 'Install with: bun install -g chrome-devtools-mcp',
    };
  }
}

/**
 * Check if browser is available — delegates to browser-detect.mjs
 */
async function checkBrowserAvailable() {
  const result = await detectBrowser();

  if (result.detected) {
    return {
      passed: true,
      path: result.path,
      browser: result.name,
    };
  }

  const platform = process.platform;
  return {
    passed: false,
    error: 'No browser found (Brave, Chrome, or Chromium)',
    fix:
      platform === 'linux'
        ? 'Install with: sudo snap install brave'
        : platform === 'darwin'
        ? 'Install Brave from https://brave.com'
        : 'Install Brave from https://brave.com',
  };
}

/**
 * Check if MCP connection is active
 */
function checkConnection() {
  try {
    const result = execSync('claude mcp list', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    // Look for devtools server in connected state (exact names + pattern)
    const hasDevTools = DEVTOOLS_SERVER_NAMES.some(name =>
      result.includes(name)
    ) || DEVTOOLS_NAME_PATTERN.test(result);

    const isConnected =
      hasDevTools &&
      (result.includes('Connected') || result.includes('Ready'));

    if (isConnected) {
      return { passed: true };
    }

    return {
      passed: false,
      error: 'DevTools MCP server not connected',
      fix: 'Restart Claude Desktop application',
    };
  } catch {
    return {
      passed: false,
      error: 'Could not run "claude mcp list"',
      fix: 'Install Claude CLI or restart Claude Desktop',
    };
  }
}

/**
 * Check react-grab setup (only run for React projects)
 */
async function checkReactGrabSetup(options = {}) {
  if (!options.isReact) {
    return { passed: true, skipped: true, reason: 'Not a React project' };
  }

  const grabStatus = options.reactGrab || await detectReactGrab(process.cwd());

  const issues = [];

  if (!grabStatus.installed) {
    issues.push('react-grab not installed');
  }
  if (!grabStatus.scriptInjected) {
    const file = grabStatus.layoutFile || 'layout file';
    issues.push(`grab script not found in ${file}`);
  }
  if (!grabStatus.mcpConfigured) {
    issues.push('react-grab MCP server not configured');
  }

  if (issues.length === 0) {
    return {
      passed: true,
      framework: grabStatus.framework,
    };
  }

  return {
    passed: false,
    error: issues.join('; '),
    fix: 'Run: bunx -y grab@latest init\nSee: devtools-mcp start --grab for detailed setup guidance',
    details: grabStatus,
  };
}

/**
 * Main verification function
 * @param {Object} options - Optional: { isReact, reactGrab } from auto-detect
 */
export async function verifyMcpSetup(options = {}) {
  const checks = {
    configExists: await checkConfigExists(),
    serverConfigured: await checkServerConfigured(),
    binaryInstalled: checkBinaryInstalled(),
    browserAvailable: await checkBrowserAvailable(),
    connection: checkConnection(),
  };

  // Conditionally add react-grab checks for React projects
  if (options.isReact) {
    checks.reactGrabSetup = await checkReactGrabSetup(options);
  }

  const errors = [];

  // Collect errors
  for (const [name, result] of Object.entries(checks)) {
    if (!result.passed && !result.skipped) {
      errors.push({
        check: name,
        error: result.error,
        fix: result.fix,
      });
    }
  }

  const ready = errors.length === 0;

  return {
    checks,
    errors,
    ready,
  };
}

/**
 * Format verification results for display
 */
export function formatVerificationResults(results) {
  const lines = [];

  lines.push('# MCP Setup Verification\n');

  // Summary
  if (results.ready) {
    lines.push('✅ All checks passed - MCP is ready\n');
  } else {
    lines.push(`❌ ${results.errors.length} issue(s) found\n`);
  }

  // Checks
  lines.push('## Checks\n');
  for (const [name, result] of Object.entries(results.checks)) {
    const icon = result.passed ? '✅' : '❌';
    const label = name
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
    lines.push(`${icon} ${label}`);

    if (result.passed && result.path) {
      lines.push(`   → ${result.path}`);
    }
    if (result.passed && result.serverName) {
      lines.push(`   → Server: ${result.serverName}`);
    }
    if (result.passed && result.browser) {
      lines.push(`   → Browser: ${result.browser}`);
    }
    if (result.skipped) {
      lines.push(`   → Skipped: ${result.reason}`);
    }
    if (result.passed && result.framework) {
      lines.push(`   → Framework: ${result.framework}`);
    }
  }

  // Errors and fixes
  if (results.errors.length > 0) {
    lines.push('\n## Issues\n');
    results.errors.forEach((error, i) => {
      lines.push(`${i + 1}. **${error.check}**`);
      lines.push(`   Error: ${error.error}`);
      lines.push(`   Fix: ${error.fix}\n`);
    });
  }

  return lines.join('\n');
}

/**
 * CLI usage
 */
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try {
    const isReact = process.argv.includes('--react');
    const results = await verifyMcpSetup({ isReact });
    console.log(formatVerificationResults(results));
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}
