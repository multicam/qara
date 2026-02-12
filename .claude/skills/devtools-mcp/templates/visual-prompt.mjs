/**
 * visual-prompt.mjs
 *
 * Prompt template for visual testing
 * Multi-viewport screenshots, dark mode, responsive design
 */

import {
  formatPageList,
  formatViewportList,
} from '../lib/prompt-builder.mjs';

/**
 * Visual test prompt template
 *
 * @param {Object} config - Merged config
 * @returns {string} - Prompt text
 */
export default function visualPrompt(config) {
  const pageList = formatPageList(config.pages, config.baseUrl);
  const viewportList = formatViewportList(config.viewports);

  return `# MCP Visual Test — ${config.baseUrl}

Capture screenshots across multiple viewports and color schemes for visual validation.

## Pages to Test
${pageList}

## Viewports
${viewportList}

## Test Process

For each page and viewport combination:

### 1. Navigate to page
\`\`\`
navigate_page to {url}
\`\`\`

### 2. Resize to viewport
\`\`\`
resize_page to {width} x {height}
\`\`\`

### 3. Wait for layout
\`\`\`
wait_for 1 second
\`\`\`
Allow responsive styles to apply.

### 4. Take screenshot - Light mode
\`\`\`
take_screenshot and save to ./screenshots/{page}/{viewport}-light.png
\`\`\`

### 5. Enable dark mode
\`\`\`
emulate colorScheme="dark"
\`\`\`

### 6. Take screenshot - Dark mode
\`\`\`
take_screenshot and save to ./screenshots/{page}/{viewport}-dark.png
\`\`\`

### 7. Reset color scheme
\`\`\`
emulate colorScheme="auto"
\`\`\`

## Screenshot Naming

Format: \`{page}/{viewport}-{colorScheme}.png\`

Examples:
- \`home/mobile-375-light.png\`
- \`home/mobile-375-dark.png\`
- \`about/desktop-1920-light.png\`

## Directory Structure

Organize screenshots by page:
\`\`\`
screenshots/
├── home/
│   ├── mobile-375-light.png
│   ├── mobile-375-dark.png
│   ├── tablet-768-light.png
│   ├── tablet-768-dark.png
│   ├── desktop-1920-light.png
│   └── desktop-1920-dark.png
├── about/
│   └── ...
└── contact/
    └── ...
\`\`\`

## Quality Checks

For each screenshot:
- ✅ Layout is responsive (not broken at viewport)
- ✅ Text is readable (not cut off or overlapping)
- ✅ Images loaded (no broken images)
- ✅ Navigation visible and functional
- ✅ Dark mode properly themed (if testing dark mode)

## Error Handling

If a page fails to load or screenshot:
- Record the error
- Continue with remaining pages
- Include failed pages in results

If dark mode doesn't work:
- Note that dark mode is not supported
- Only capture light mode
- Continue testing

## Output Format

Return JSON with screenshot metadata:

\`\`\`json
{
  "passed": true,
  "totalScreenshots": number,
  "timestamp": "ISO 8601 timestamp",
  "screenshots": [
    {
      "page": "page path",
      "viewport": "viewport name",
      "width": number,
      "height": number,
      "colorScheme": "light|dark",
      "path": "file path",
      "fileSize": number,
      "success": boolean,
      "error": "error message if failed"
    }
  ],
  "summary": {
    "pages": number,
    "viewports": number,
    "colorSchemes": number,
    "totalSize": number,
    "successful": number,
    "failed": number
  },
  "issues": [
    "list of visual issues found"
  ]
}
\`\`\`

## Visual Issues to Report

Note any of these problems:

**Layout Issues:**
- Content overflow at small viewports
- Elements overlapping
- Horizontal scrollbar appearing
- Fixed elements covering content

**Typography Issues:**
- Text too small to read (< 12px)
- Text cut off
- Line height too tight
- Poor contrast

**Image Issues:**
- Images not loading
- Images distorted (aspect ratio wrong)
- Images too large (causing slow load)
- Missing alt text

**Dark Mode Issues:**
- Background/text contrast insufficient
- Elements not themed (still light)
- Images not inverted/adjusted
- Icons hard to see

**Responsive Issues:**
- Desktop layout shown at mobile
- Mobile nav not working
- Touch targets too small (< 44px)
- Content wider than viewport

## Notes

- Capture screenshots in the order specified
- Use PNG format for lossless quality
- Save all screenshots even if visual issues found
- Be concise in issue descriptions
- Focus on functional problems, not design critique
`;
}
