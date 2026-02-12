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
import { resolve } from 'path';

/**
 * MCP config file path
 */
const MCP_CONFIG_PATH = resolve(
  homedir(),
  '.config/claude-desktop/claude_desktop_config.json'
);

/**
 * Known MCP server names for DevTools
 */
const DEVTOOLS_SERVER_NAMES = [
  'brave-devtools',
  'chrome-devtools',
  'devtools',
];

/**
 * Browser executable paths by platform
 */
const BROWSER_PATHS = {
  linux: [
    '/snap/bin/brave',
    '/usr/bin/brave-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ],
  darwin: [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chromium.exe',
  ],
};

/**
 * Check if MCP config file exists
 */
async function checkConfigExists() {
  try {
    await access(MCP_CONFIG_PATH, constants.F_OK);
    return { passed: true, path: MCP_CONFIG_PATH };
  } catch {
    return {
      passed: false,
      error: `Config file not found: ${MCP_CONFIG_PATH}`,
      fix: `Create the file with:\nmkdir -p ~/.config/claude-desktop\ncp ${process.env.PAI_DIR}/skills/devtools-mcp/templates/mcp-config.json ~/.config/claude-desktop/claude_desktop_config.json`,
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

    const serverName = DEVTOOLS_SERVER_NAMES.find(
      name => config.mcpServers[name]
    );

    if (!serverName) {
      return {
        passed: false,
        error: `No DevTools server configured. Looking for: ${DEVTOOLS_SERVER_NAMES.join(', ')}`,
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
    const result = execSync('which chrome-devtools-mcp', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    return {
      passed: true,
      path: result.trim(),
    };
  } catch {
    return {
      passed: false,
      error: 'chrome-devtools-mcp binary not found in PATH',
      fix: 'Install with: npm install -g chrome-devtools-mcp',
    };
  }
}

/**
 * Check if browser is available
 */
async function checkBrowserAvailable() {
  const platform = process.platform;
  const paths = BROWSER_PATHS[platform] || [];

  for (const path of paths) {
    try {
      await access(path, constants.X_OK);
      return {
        passed: true,
        path,
        browser: path.includes('brave')
          ? 'Brave'
          : path.includes('chrome')
          ? 'Chrome'
          : 'Chromium',
      };
    } catch {
      // Try next path
    }
  }

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

    // Look for devtools server in connected state
    const hasDevTools = DEVTOOLS_SERVER_NAMES.some(name =>
      result.includes(name)
    );

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
 * Main verification function
 */
export async function verifyMcpSetup() {
  const checks = {
    configExists: await checkConfigExists(),
    serverConfigured: await checkServerConfigured(),
    binaryInstalled: checkBinaryInstalled(),
    browserAvailable: await checkBrowserAvailable(),
    connection: checkConnection(),
  };

  const errors = [];

  // Collect errors
  for (const [name, result] of Object.entries(checks)) {
    if (!result.passed) {
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
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await verifyMcpSetup();
    console.log(formatVerificationResults(results));

    if (!results.ready) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
}
