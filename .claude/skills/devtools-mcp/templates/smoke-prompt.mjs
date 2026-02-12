/**
 * smoke-prompt.mjs
 *
 * Prompt template for smoke testing
 * Quick health check: navigation, console, network, a11y
 */

import {
  formatPageList,
  formatThresholds,
} from '../lib/prompt-builder.mjs';

/**
 * Smoke test prompt template
 *
 * @param {Object} config - Merged config
 * @returns {string} - Prompt text
 */
export default function smokePrompt(config) {
  const pageList = formatPageList(config.pages, config.baseUrl);
  const thresholdList = formatThresholds(config.thresholds);

  return `# MCP Smoke Test — ${config.baseUrl}

Test each page for basic health. This is a quick check, not comprehensive testing.

## Pages to Test
${pageList}

## Test Process

For each page:

### 1. Navigate to page
\`\`\`
navigate_page to {url}
\`\`\`

### 2. Wait for content
\`\`\`
wait_for text="[key content from page]"
\`\`\`
Wait for something that indicates page loaded (heading, key text, etc.)

### 3. Check console for errors
\`\`\`
list_console_messages with types=["error"]
\`\`\`

**Pass criteria:**
- 0 console errors (critical)
- Ignore third-party errors if clearly from external sources

### 4. Check network requests
\`\`\`
list_network_requests with resourceTypes=["document", "xhr", "fetch"]
\`\`\`

**Pass criteria:**
- 0 failed requests (status >= 400)
- 0 blocked requests

### 5. Verify accessibility
\`\`\`
take_snapshot
\`\`\`

**Pass criteria:**
- Has \`<main>\` landmark or \`main\` role
- Has navigation (\`<nav>\`)
- Has proper heading structure (h1 present)

## Thresholds
${thresholdList}

## Critical vs Non-Critical

**Critical failures (fail the page):**
- Page doesn't load (404, 500, network error)
- Console errors (JavaScript exceptions)
- Failed API requests (xhr/fetch with status >= 400)
- Missing main landmark

**Non-critical issues (warn only):**
- Console warnings
- Slow load times
- Missing optional elements

## Screenshots

If a page fails any check:
- Take a screenshot with \`take_screenshot\`
- Include in results

## Output Format

Return JSON with this structure:

\`\`\`json
{
  "passed": boolean,
  "totalPages": number,
  "passedPages": number,
  "failedPages": number,
  "timestamp": "ISO 8601 timestamp",
  "results": [
    {
      "url": "full URL",
      "passed": boolean,
      "checks": {
        "navigation": {
          "passed": boolean,
          "error": "error message if failed"
        },
        "console": {
          "passed": boolean,
          "errorCount": number,
          "errors": ["array of error messages"]
        },
        "network": {
          "passed": boolean,
          "failureCount": number,
          "failures": ["array of failed requests"]
        },
        "accessibility": {
          "passed": boolean,
          "issues": ["array of issues found"]
        }
      },
      "screenshot": "data URL or path if failed"
    }
  ],
  "summary": {
    "totalErrors": number,
    "criticalIssues": number,
    "warnings": number
  }
}
\`\`\`

## Notes

- Test pages in order listed
- Stop early if a critical configuration issue is found
- Be concise in error messages
- Focus on critical issues, not minor problems
`;
}
