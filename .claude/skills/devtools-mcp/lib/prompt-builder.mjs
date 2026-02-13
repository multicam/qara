#!/usr/bin/env node

/**
 * prompt-builder.mjs
 *
 * Builds prompts from templates with config injection
 * - Template function pattern
 * - Config merging
 * - JSON output schema
 */

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:8000',
  pages: ['/'],
  viewports: [
    { width: 375, height: 812, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' },
  ],
  thresholds: {
    consoleErrors: 0,
    consoleWarnings: 5,
    networkFailures: 0,
    lighthouseScore: 90,
  },
  selectors: {
    main: 'main',
    nav: 'nav',
    footer: 'footer',
  },
};

/**
 * JSON output schema template
 */
const JSON_OUTPUT_SCHEMA = `

## Output Format

Return your findings as JSON:

\`\`\`json
{
  "passed": boolean,
  "timestamp": string,
  "results": [...],
  "summary": {
    "totalTests": number,
    "passed": number,
    "failed": number
  }
}
\`\`\`
`;

/**
 * Merge configuration layers
 *
 * @param {Object} urlConfig - Config from url-builder
 * @param {Object} options - Runtime options
 * @returns {Object} - Merged config
 */
export function mergeConfig(urlConfig, options = {}) {
  // Start with defaults
  const config = { ...DEFAULT_CONFIG };

  // Merge URL config (from CLAUDE.md or auto-detect)
  if (urlConfig) {
    config.baseUrl = urlConfig.url;

    if (urlConfig.pages) {
      config.pages = urlConfig.pages;
    }

    if (urlConfig.selectors) {
      config.selectors = { ...config.selectors, ...urlConfig.selectors };
    }

    if (urlConfig.thresholds) {
      config.thresholds = { ...config.thresholds, ...urlConfig.thresholds };
    }

    if (urlConfig.framework) {
      config.framework = urlConfig.framework;
    }
  }

  // Merge runtime options (highest priority)
  if (options.pages) {
    config.pages = options.pages;
  }

  if (options.viewports) {
    config.viewports = options.viewports;
  }

  if (options.thresholds) {
    config.thresholds = { ...config.thresholds, ...options.thresholds };
  }

  if (options.selectors) {
    config.selectors = { ...config.selectors, ...options.selectors };
  }

  return config;
}

/**
 * Build prompt from template function
 *
 * @param {Function} templateFn - Template function (returns string)
 * @param {Object} config - Merged config
 * @param {Object} options - Additional options
 * @returns {string} - Complete prompt
 */
export function buildPrompt(templateFn, config, options = {}) {
  if (typeof templateFn !== 'function') {
    throw new Error('templateFn must be a function');
  }

  // Call template function with config
  let prompt = templateFn(config);

  // Append JSON output schema unless disabled
  if (options.includeJsonSchema !== false) {
    prompt += JSON_OUTPUT_SCHEMA;
  }

  return prompt;
}

/**
 * Build full prompt with config merging
 *
 * @param {Function} templateFn - Template function
 * @param {Object} urlConfig - Config from url-builder
 * @param {Object} options - Runtime options
 * @returns {string} - Complete prompt
 */
export function buildPromptWithConfig(templateFn, urlConfig, options = {}) {
  const config = mergeConfig(urlConfig, options);
  return buildPrompt(templateFn, config, options);
}

/**
 * Format page list for prompt
 *
 * @param {Array<string>} pages - Page paths
 * @param {string} baseUrl - Base URL
 * @returns {string} - Formatted list
 */
export function formatPageList(pages, baseUrl) {
  return pages.map(page => `  - ${baseUrl}${page}`).join('\n');
}

/**
 * Format viewport list for prompt
 *
 * @param {Array<Object>} viewports - Viewport configs
 * @returns {string} - Formatted list
 */
export function formatViewportList(viewports) {
  return viewports
    .map(
      vp =>
        `  - ${vp.name}: ${vp.width}x${vp.height}`
    )
    .join('\n');
}

/**
 * Format selectors for prompt
 *
 * @param {Object} selectors - Selector map
 * @returns {string} - Formatted list
 */
export function formatSelectors(selectors) {
  return Object.entries(selectors)
    .map(([key, value]) => `  - ${key}: \`${value}\``)
    .join('\n');
}

/**
 * Format thresholds for prompt
 *
 * @param {Object} thresholds - Threshold values
 * @returns {string} - Formatted list
 */
export function formatThresholds(thresholds) {
  return Object.entries(thresholds)
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
      return `  - ${label}: ${value}`;
    })
    .join('\n');
}

/**
 * Create a simple template function helper
 *
 * @param {string} title - Test title
 * @param {string} description - Test description
 * @param {Array<string>} steps - Test steps
 * @returns {Function} - Template function
 */
export function createSimpleTemplate(title, description, steps) {
  return function (config) {
    const pageList = formatPageList(config.pages, config.baseUrl);
    const stepList = steps.map((step, i) => `${i + 1}. ${step}`).join('\n');

    return `# ${title} — ${config.baseUrl}

${description}

## Pages to Test
${pageList}

## Steps
${stepList}

## Thresholds
${formatThresholds(config.thresholds)}
`;
  };
}

/**
 * CLI usage
 */
import { resolve } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  // Example template
  const exampleTemplate = function (config) {
    return `# Example Test — ${config.baseUrl}

Testing pages:
${formatPageList(config.pages, config.baseUrl)}

Viewports:
${formatViewportList(config.viewports)}

Selectors:
${formatSelectors(config.selectors)}

Thresholds:
${formatThresholds(config.thresholds)}
`;
  };

  // Build example prompt
  const urlConfig = {
    url: 'http://localhost:3000',
    pages: ['/', '/about/', '/contact/'],
  };

  const prompt = buildPromptWithConfig(exampleTemplate, urlConfig);
  console.log(prompt);
}
