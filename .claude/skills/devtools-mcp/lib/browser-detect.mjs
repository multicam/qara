#!/usr/bin/env node

/**
 * browser-detect.mjs
 *
 * Detects browser executable paths across platforms
 * - Linux (Snap, apt, manual install)
 * - macOS (Applications folder)
 * - Windows (Program Files)
 */

import { access, constants } from 'fs/promises';
import { platform } from 'os';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Browser paths by platform
 */
const BROWSER_PATHS = {
  linux: [
    // Snap (most common on Ubuntu)
    '/snap/bin/brave',
    '/snap/bin/chromium',
    // APT/system packages
    '/usr/bin/brave-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    // Flatpak
    '/var/lib/flatpak/exports/bin/com.brave.Browser',
    '/var/lib/flatpak/exports/bin/com.google.Chrome',
    // Manual installs
    '/opt/brave.com/brave/brave',
    '/opt/google/chrome/chrome',
  ],
  darwin: [
    // Brave
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Brave Browser Beta.app/Contents/MacOS/Brave Browser Beta',
    '/Applications/Brave Browser Nightly.app/Contents/MacOS/Brave Browser Nightly',
    // Chrome
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    // Chromium
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // User-specific
    '~/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
  win32: [
    // Brave
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
    // Chromium
    'C:\\Program Files\\Chromium\\Application\\chromium.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe',
  ],
};

/**
 * Expand environment variables in path (Windows)
 */
function expandEnvVars(path) {
  if (platform() === 'win32') {
    // Replace %VAR% with environment variable
    return path.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');
  }
  // Replace ~ with home directory
  return path.replace(/^~/, process.env.HOME || '');
}

/**
 * Check if file exists and is executable
 */
async function checkExecutable(path) {
  try {
    const expandedPath = expandEnvVars(path);
    await access(expandedPath, constants.X_OK | constants.F_OK);
    return expandedPath;
  } catch {
    return null;
  }
}

/**
 * Try to find browser using 'command -v' (POSIX-portable)
 */
function tryCommandLookup(browserName) {
  try {
    const result = execSync(`command -v ${browserName}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: true,
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Detect browser name from path
 */
function detectBrowserName(path) {
  const lower = path.toLowerCase();

  if (lower.includes('brave')) return 'Brave';
  if (lower.includes('chrome') && !lower.includes('chromium')) return 'Chrome';
  if (lower.includes('chromium')) return 'Chromium';

  return 'Unknown';
}

/**
 * Get browser version (with timeout to avoid snap hangs)
 */
function getBrowserVersion(path) {
  try {
    const result = execSync(`"${path}" --version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Detect browser executable
 *
 * @param {Object} options - Detection options
 * @returns {Promise<Object|null>} - Browser info or null
 */
export async function detectBrowser(options = {}) {
  const currentPlatform = options.platform || platform();
  const paths = BROWSER_PATHS[currentPlatform] || [];

  // Try all paths
  for (const path of paths) {
    const executablePath = await checkExecutable(path);
    if (executablePath) {
      return {
        path: executablePath,
        name: detectBrowserName(executablePath),
        platform: currentPlatform,
        version: getBrowserVersion(executablePath),
        detected: true,
      };
    }
  }

  // Try command lookup (Linux/macOS)
  if (currentPlatform !== 'win32') {
    for (const browserName of ['brave', 'google-chrome', 'chromium']) {
      const path = tryCommandLookup(browserName);
      if (path) {
        return {
          path,
          name: detectBrowserName(path),
          platform: currentPlatform,
          version: getBrowserVersion(path),
          detected: true,
        };
      }
    }
  }

  return {
    path: null,
    name: null,
    platform: currentPlatform,
    version: null,
    detected: false,
    error: 'No browser found',
  };
}

/**
 * Detect all available browsers
 *
 * @returns {Promise<Array>} - List of found browsers
 */
export async function detectAllBrowsers() {
  const currentPlatform = platform();
  const paths = BROWSER_PATHS[currentPlatform] || [];
  const found = [];

  for (const path of paths) {
    const executablePath = await checkExecutable(path);
    if (executablePath) {
      found.push({
        path: executablePath,
        name: detectBrowserName(executablePath),
        version: getBrowserVersion(executablePath),
      });
    }
  }

  return found;
}

/**
 * Format browser info for display
 */
export function formatBrowserInfo(browserInfo) {
  if (!browserInfo.detected) {
    return `❌ No browser found

Install one of:
- Brave: https://brave.com
- Chrome: https://www.google.com/chrome/
- Chromium: https://www.chromium.org/
`;
  }

  const lines = [];

  lines.push('✅ Browser Detected\n');
  lines.push(`**Name:** ${browserInfo.name}`);
  lines.push(`**Path:** ${browserInfo.path}`);

  if (browserInfo.version) {
    lines.push(`**Version:** ${browserInfo.version}`);
  }

  lines.push(`**Platform:** ${browserInfo.platform}`);

  return lines.join('\n');
}

/**
 * CLI usage
 */
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const command = process.argv[2];

  if (command === 'all') {
    // Find all browsers
    const browsers = await detectAllBrowsers();

    if (browsers.length === 0) {
      console.log('No browsers found');
      process.exit(1);
    }

    console.log(`Found ${browsers.length} browser(s):\n`);
    browsers.forEach((browser, i) => {
      console.log(`${i + 1}. ${browser.name}`);
      console.log(`   Path: ${browser.path}`);
      if (browser.version) {
        console.log(`   Version: ${browser.version}`);
      }
      console.log();
    });
  } else {
    // Find first available browser
    const browser = await detectBrowser();
    console.log(formatBrowserInfo(browser));

    if (!browser.detected) {
      process.exit(1);
    }
  }
}
