#!/usr/bin/env node

/**
 * url-builder.mjs
 *
 * Builds target URL from configuration layers
 * Priority: Runtime > CLAUDE.md > Auto-detect > Error
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { detectDevConfig } from './auto-detect.mjs';

/**
 * Parse CLAUDE.md for DevTools MCP config
 */
async function parseClaudeMd(projectPath = process.cwd()) {
  try {
    const claudeMdPath = resolve(projectPath, 'CLAUDE.md');
    const content = await readFile(claudeMdPath, 'utf-8');

    // Find DevTools MCP section
    const sectionRegex = /##\s+DevTools\s+MCP\s*\n([\s\S]*?)(?=\n##|$)/i;
    const match = content.match(sectionRegex);

    if (!match) {
      return null;
    }

    const section = match[1];

    // Parse url field
    const urlMatch = section.match(/url:\s*(.+)/);
    if (!urlMatch) {
      return null;
    }

    const url = urlMatch[1].trim();

    // Parse optional pages field
    const pagesMatch = section.match(/pages:\s*\n([\s\S]*?)(?=\n[a-z]\w*:|$)/);
    const pages = [];
    if (pagesMatch) {
      const pagesText = pagesMatch[1];
      const pageLines = pagesText.match(/^\s*-\s*(.+)$/gm);
      if (pageLines) {
        pages.push(...pageLines.map(line => line.replace(/^\s*-\s*/, '').trim()));
      }
    }

    // Parse optional selectors
    const selectorsMatch = section.match(/selectors:\s*\n([\s\S]*?)(?=\n[a-z]\w*:|$)/);
    const selectors = {};
    if (selectorsMatch) {
      const selectorsText = selectorsMatch[1];
      const selectorLines = selectorsText.match(/^\s+(\w+):\s*(.+)$/gm);
      if (selectorLines) {
        selectorLines.forEach(line => {
          const [, key, value] = line.match(/^\s+(\w+):\s*(.+)$/);
          selectors[key] = value.trim();
        });
      }
    }

    // Parse optional thresholds
    const thresholdsMatch = section.match(/thresholds:\s*\n([\s\S]*?)(?=\n[a-z]\w*:|$)/);
    const thresholds = {};
    if (thresholdsMatch) {
      const thresholdsText = thresholdsMatch[1];
      const thresholdLines = thresholdsText.match(/^\s+(\w+):\s*(.+)$/gm);
      if (thresholdLines) {
        thresholdLines.forEach(line => {
          const [, key, value] = line.match(/^\s+(\w+):\s*(.+)$/);
          thresholds[key] = isNaN(value) ? value.trim() : parseInt(value, 10);
        });
      }
    }

    return {
      url,
      pages: pages.length > 0 ? pages : undefined,
      selectors: Object.keys(selectors).length > 0 ? selectors : undefined,
      thresholds: Object.keys(thresholds).length > 0 ? thresholds : undefined,
      source: 'CLAUDE.md',
    };
  } catch (error) {
    // CLAUDE.md not found or parsing failed
    return null;
  }
}

/**
 * Determine if URL is localhost
 */
function isLocalhostUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * Parse URL to extract components
 */
function parseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      url,
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : null,
      protocol: parsed.protocol.replace(':', ''),
      pathname: parsed.pathname,
      type: isLocalhostUrl(url) ? 'localhost' : 'live',
      requiresServer: isLocalhostUrl(url),
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${url} (${error.message})`);
  }
}

/**
 * Build target URL from configuration layers
 *
 * Priority:
 * 1. options.url (runtime argument)
 * 2. CLAUDE.md (project override)
 * 3. Auto-detect from package.json
 * 4. Error (no URL found)
 */
export async function buildTargetUrl(options = {}) {
  const projectPath = options.projectPath || process.cwd();

  // Priority 1: Runtime argument
  if (options.url) {
    const parsed = parseUrl(options.url);
    return {
      ...parsed,
      source: 'runtime',
      projectPath,
    };
  }

  // Priority 2: CLAUDE.md
  const claudeMdConfig = await parseClaudeMd(projectPath);
  if (claudeMdConfig?.url) {
    const parsed = parseUrl(claudeMdConfig.url);
    return {
      ...parsed,
      source: 'CLAUDE.md',
      projectPath,
      pages: claudeMdConfig.pages,
      selectors: claudeMdConfig.selectors,
      thresholds: claudeMdConfig.thresholds,
    };
  }

  // Priority 3: Auto-detect
  const autoDetected = await detectDevConfig(projectPath);
  if (autoDetected.detected && autoDetected.url) {
    const parsed = parseUrl(autoDetected.url);
    return {
      ...parsed,
      source: 'auto-detect',
      framework: autoDetected.framework,
      startCommand: autoDetected.startCommand,
      projectPath,
    };
  }

  // Priority 4: Error
  throw new Error(
    'No target URL found. Provide --url argument, add to CLAUDE.md, or ensure package.json exists.'
  );
}

/**
 * Format URL config for display
 */
export function formatUrlConfig(config) {
  const lines = [];

  lines.push('# Target URL Configuration\n');
  lines.push(`**URL:** ${config.url}`);
  lines.push(`**Type:** ${config.type}`);
  lines.push(`**Source:** ${config.source}`);

  if (config.framework) {
    lines.push(`**Framework:** ${config.framework}`);
  }

  if (config.port) {
    lines.push(`**Port:** ${config.port}`);
  }

  if (config.requiresServer) {
    lines.push(`**Requires Server:** Yes`);
    if (config.startCommand) {
      lines.push(`**Start Command:** \`${config.startCommand}\``);
    }
  } else {
    lines.push(`**Requires Server:** No (live URL)`);
  }

  if (config.pages) {
    lines.push(`\n**Pages:** ${config.pages.join(', ')}`);
  }

  if (config.selectors) {
    lines.push('\n**Selectors:**');
    for (const [key, value] of Object.entries(config.selectors)) {
      lines.push(`  - ${key}: \`${value}\``);
    }
  }

  if (config.thresholds) {
    lines.push('\n**Thresholds:**');
    for (const [key, value] of Object.entries(config.thresholds)) {
      lines.push(`  - ${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * CLI usage
 */
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const options = {
    projectPath: process.argv[2] || process.cwd(),
    url: process.argv[3],
  };

  try {
    const config = await buildTargetUrl(options);
    console.log(formatUrlConfig(config));
  } catch (error) {
    console.error('Error:', error.message);
  }
}
