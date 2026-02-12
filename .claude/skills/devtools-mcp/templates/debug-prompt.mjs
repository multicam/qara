/**
 * debug-prompt.mjs
 *
 * Prompt template for debugging console errors and network issues
 * Focus on identifying root causes and providing fixes
 */

import { formatPageList } from '../lib/prompt-builder.mjs';

/**
 * Debug prompt template
 *
 * @param {Object} config - Merged config
 * @returns {string} - Prompt text
 */
export default function debugPrompt(config) {
  const pageList = formatPageList(config.pages, config.baseUrl);

  return `# MCP Debug Session — ${config.baseUrl}

Debug console errors, network failures, and client-side issues.

## Pages to Debug
${pageList}

## Debugging Process

For each page:

### 1. Navigate and Load
\`\`\`
navigate_page to {url}
wait_for "main content indicator"
\`\`\`

### 2. Console Analysis

#### A. List all console messages
\`\`\`
list_console_messages with types=["error", "warn"]
\`\`\`

#### B. Get detailed error info
For each error found:
\`\`\`
get_console_message with msgid={id}
\`\`\`

**Extract:**
- Full error message
- Stack trace with file:line
- Error type (TypeError, ReferenceError, etc.)
- Arguments/context

#### C. Categorize errors
- **JavaScript exceptions** - Code errors
- **React/framework warnings** - Development warnings
- **Third-party errors** - External script issues
- **Network errors** - Failed requests logged to console

### 3. Network Analysis

#### A. List all requests
\`\`\`
list_network_requests with resourceTypes=["xhr", "fetch", "document", "script"]
\`\`\`

#### B. Identify failures
Look for:
- Status >= 400 (client/server errors)
- Status = 0 (blocked/CORS)
- Status = -1 (failed)
- Duration > 5000ms (slow)

#### C. Get request details
For each failed request:
\`\`\`
get_network_request with reqid={id}
\`\`\`

**Extract:**
- Request URL, method, headers
- Response status, headers, body
- Timing breakdown
- Error message

### 4. Page State Inspection

If errors are unclear, inspect page state:
\`\`\`
evaluate_script:
() => {
  return {
    // Framework detection
    hasReact: typeof React !== 'undefined',
    hasVue: typeof Vue !== 'undefined',
    hasJQuery: typeof jQuery !== 'undefined',

    // User state
    isLoggedIn: !!window.user,
    userData: window.user,

    // Page state
    readyState: document.readyState,
    title: document.title,

    // Console state
    hasErrors: window.console.errors || [],

    // Global errors
    globalErrors: window.errors || []
  };
}
\`\`\`

### 5. Take Error Screenshot

If errors are visual:
\`\`\`
take_screenshot and save to {page}-error.png
\`\`\`

## Error Categories

### JavaScript Errors

**TypeError:**
- Cannot read property 'X' of undefined
- X is not a function
- Cannot set property 'X' of null

**ReferenceError:**
- X is not defined
- X is not declared

**SyntaxError:**
- Unexpected token
- Invalid syntax

**RangeError:**
- Maximum call stack exceeded
- Invalid array length

### Network Errors

**4xx Client Errors:**
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 429 Too Many Requests

**5xx Server Errors:**
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

**CORS Errors:**
- Status = 0
- No 'Access-Control-Allow-Origin' header

### Framework Warnings

**React:**
- Hook warnings (dependencies, rules)
- Key prop missing
- setState on unmounted component

**Next.js:**
- Hydration mismatches
- Image optimization warnings

## Root Cause Analysis

For each error:

1. **Identify the error type**
   - TypeError, ReferenceError, Network, etc.

2. **Locate the source**
   - File path and line number
   - Stack trace analysis
   - Which component/module

3. **Understand the cause**
   - Null/undefined access
   - Missing function/variable
   - API failure
   - CORS issue

4. **Determine impact**
   - Critical (blocks functionality)
   - Major (degrades experience)
   - Minor (cosmetic/warning)

5. **Suggest fix**
   - Code change needed
   - Configuration change
   - Server-side fix required

## Output Format

Return JSON with detailed findings:

\`\`\`json
{
  "passed": false,
  "url": "page URL",
  "timestamp": "ISO 8601",
  "errors": [
    {
      "type": "console",
      "severity": "critical|major|minor",
      "category": "TypeError|ReferenceError|Network|etc",
      "message": "full error message",
      "source": {
        "file": "contact.js",
        "line": 45,
        "column": 12
      },
      "stackTrace": [
        "at ContactForm.render (contact.js:45:12)",
        "at React.Component (react.js:123:45)"
      ],
      "cause": "Attempting to map over undefined array",
      "fix": "Add null check: {data && data.map(...)}",
      "impact": "Form cannot render, blocks user interaction"
    },
    {
      "type": "network",
      "severity": "critical",
      "category": "Server Error",
      "url": "/api/submit",
      "method": "POST",
      "status": 500,
      "statusText": "Internal Server Error",
      "responseBody": "{\"error\": \"Database connection failed\"}",
      "cause": "Server-side database connection issue",
      "fix": "Check database connection on server",
      "impact": "Form submission fails, data not saved"
    }
  ],
  "warnings": [
    {
      "type": "console",
      "severity": "minor",
      "message": "React Hook useEffect missing dependency",
      "source": "contact.js:23",
      "fix": "Add 'formData' to dependency array"
    }
  ],
  "networkStats": {
    "totalRequests": 45,
    "failedRequests": 1,
    "slowRequests": 2,
    "blockedRequests": 0
  },
  "pageState": {
    "isLoggedIn": true,
    "hasFramework": "React",
    "readyState": "complete"
  },
  "recommendations": [
    {
      "priority": "critical",
      "action": "Fix TypeError in contact.js:45",
      "reason": "Blocks form rendering"
    },
    {
      "priority": "critical",
      "action": "Investigate 500 error from /api/submit",
      "reason": "Prevents data submission"
    },
    {
      "priority": "minor",
      "action": "Fix useEffect dependency warning",
      "reason": "May cause stale closures"
    }
  ]
}
\`\`\`

## Debugging Tips

### Reproduce the Issue
- Clear cache and reload
- Try different user states (logged in/out)
- Test on different viewports
- Check console from page load

### Isolate the Problem
- Does it happen on all pages or just one?
- Is it timing-related? (race condition)
- Does it happen on fresh load or after interaction?
- Is it environment-specific? (localhost vs production)

### Check Dependencies
- Are all scripts loaded?
- Correct load order?
- CDN resources accessible?
- No version conflicts?

### Review Recent Changes
- What changed since it last worked?
- New dependencies added?
- Configuration changes?
- API changes?

## Common Issues & Solutions

### Cannot read property 'X' of undefined

**Cause:** Accessing property on undefined/null object

**Fix:**
\`\`\`javascript
// Before (error)
const name = user.profile.name;

// After (safe)
const name = user?.profile?.name;
// or
const name = user && user.profile && user.profile.name;
\`\`\`

### X is not defined

**Cause:** Using variable/function before declaration or import

**Fix:**
\`\`\`javascript
// Check import
import { X } from './module';

// Or check spelling
// Xfunction vs XFunction
\`\`\`

### CORS Error

**Cause:** Server doesn't allow requests from your origin

**Fix:**
\`\`\`javascript
// Server-side (Express)
app.use(cors({
  origin: 'http://localhost:8000'
}));
\`\`\`

### 401 Unauthorized

**Cause:** Missing or invalid authentication

**Fix:**
- Check auth token is sent
- Token not expired
- Correct authorization header
- User is logged in

### React Hook Warning

**Cause:** Incorrect hook usage

**Fix:**
\`\`\`javascript
// Add missing dependency
useEffect(() => {
  // uses formData
}, [formData]);  // Add formData

// Or use ref if intentionally excluding
const formDataRef = useRef(formData);
\`\`\`

## Priority Levels

**Critical (P0):**
- Blocks core functionality
- Prevents page from loading
- Data loss risk
- Fix immediately

**Major (P1):**
- Degrades user experience
- Some functionality broken
- Workaround exists
- Fix within 24 hours

**Minor (P2):**
- Console warnings
- Non-critical features affected
- Cosmetic issues
- Fix when convenient

## Notes

- Focus on actionable fixes
- Provide code examples for solutions
- Include file paths and line numbers
- Prioritize by impact
- Group related errors
- Filter out third-party noise (ads, analytics)
`;
}
