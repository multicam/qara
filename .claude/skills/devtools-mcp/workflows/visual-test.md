---
workflow: visual-test
description: Multi-viewport screenshots and visual testing
tools: [navigate_page, resize_page, emulate, take_screenshot]
---

# Visual Test Workflow

Capture screenshots across multiple viewports, color schemes, and page states for visual testing.

## Purpose

Visual validation:
- ✅ Responsive design verification
- ✅ Dark mode compatibility
- ✅ Cross-viewport consistency
- ✅ Visual regression baseline
- ✅ Design review documentation

## MCP Tools Used

1. **navigate_page** - Load pages
2. **resize_page** - Change viewport size
3. **emulate** - Dark mode, user agent
4. **take_screenshot** - Capture visuals

## Workflow Steps

### 1. Setup

Verify MCP connection and build target URL:
```bash
node ${PAI_DIR}/skills/devtools-mcp/lib/mcp-verify.mjs
node ${PAI_DIR}/skills/devtools-mcp/lib/url-builder.mjs
```

### 2. Define Viewports

Standard responsive breakpoints:

| Device | Width | Height | Name |
|--------|-------|--------|------|
| Mobile (Portrait) | 375 | 812 | iPhone 13 Pro |
| Mobile (Landscape) | 812 | 375 | iPhone 13 Pro |
| Tablet (Portrait) | 768 | 1024 | iPad |
| Tablet (Landscape) | 1024 | 768 | iPad |
| Desktop (HD) | 1920 | 1080 | Desktop HD |
| Desktop (4K) | 3840 | 2160 | Desktop 4K |

### 3. Test Process

For each page and viewport:

#### A. Navigate to page
```
navigate_page to {url}
```

#### B. Resize viewport
```
resize_page to {width} x {height}
```

#### C. Wait for layout
```
wait_for 1 second
```
Allow time for responsive styles to apply.

#### D. Take screenshot (light mode)
```
take_screenshot and save to ./screenshots/{page}/{viewport}-light.png
```

#### E. Enable dark mode
```
emulate colorScheme="dark"
```

#### F. Take screenshot (dark mode)
```
take_screenshot and save to ./screenshots/{page}/{viewport}-dark.png
```

#### G. Reset color scheme
```
emulate colorScheme="auto"
```

### 4. Screenshot Organization

Organize by page and viewport:
```
screenshots/
├── home/
│   ├── mobile-375-light.png
│   ├── mobile-375-dark.png
│   ├── tablet-768-light.png
│   ├── tablet-768-dark.png
│   ├── desktop-1920-light.png
│   └── desktop-1920-dark.png
├── about/
│   ├── mobile-375-light.png
│   └── ...
└── contact/
    ├── mobile-375-light.png
    └── ...
```

### 5. Output Format

Return JSON with screenshot metadata:

```json
{
  "passed": true,
  "totalScreenshots": 18,
  "timestamp": "2026-02-12T10:00:00Z",
  "screenshots": [
    {
      "page": "/",
      "viewport": "mobile-375",
      "colorScheme": "light",
      "path": "./screenshots/home/mobile-375-light.png",
      "dimensions": { "width": 375, "height": 812 },
      "fileSize": 125000
    },
    {
      "page": "/",
      "viewport": "mobile-375",
      "colorScheme": "dark",
      "path": "./screenshots/home/mobile-375-dark.png",
      "dimensions": { "width": 375, "height": 812 },
      "fileSize": 118000
    }
  ],
  "summary": {
    "pages": 3,
    "viewports": 3,
    "colorSchemes": 2,
    "totalSize": 2100000
  }
}
```

## Common Use Cases

### Basic Responsive Check
```bash
claude "Take screenshots of homepage at mobile, tablet, and desktop sizes"
```

Viewports: 375px, 768px, 1920px

### Dark Mode Validation
```bash
claude "Take screenshots of all pages in dark mode"
```

Tests dark mode implementation across site.

### Mobile-First Verification
```bash
claude "Screenshot all pages at 375px width"
```

Validates mobile experience.

### Design Review
```bash
claude "Take full-page screenshots of homepage at 1920px for design review"
```

Use `fullPage: true` for entire page.

### Cross-Browser Baseline
```bash
claude "Screenshot homepage at 1920px to establish visual baseline"
```

Creates reference for visual regression testing.

## Advanced Options

### Full Page Screenshots

Capture entire page (not just viewport):
```
take_screenshot with fullPage=true
```

### Specific Element Screenshots

Capture just a component:
```
take_snapshot to get element UIDs
take_screenshot of element uid="123"
```

### Custom Viewports

Test specific breakpoints:
```
resize_page to 1440 x 900  # MacBook Air
resize_page to 2560 x 1440 # iMac 27"
```

### Device Emulation

Emulate specific devices:
```
emulate viewport={
  width: 375,
  height: 812,
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true
} userAgent="iPhone"
```

## Quality Settings

### Format Options
- **PNG** (default) - Lossless, best for UI
- **JPEG** - Smaller file size, good for photos
- **WebP** - Modern format, smaller than JPEG

### Compression Quality
```
take_screenshot format="jpeg" quality=85
```

Quality: 0-100 (higher = better quality, larger file)

## Comparison Workflow

### Baseline Capture
1. Take screenshots of current production
2. Save to `screenshots/baseline/`

### Feature Branch Capture
1. Take screenshots of feature branch
2. Save to `screenshots/feature/`

### Visual Diff
1. Compare baseline vs feature
2. Highlight differences
3. Review changes

*Note: Visual diff tools not included in this skill - use external tools like Percy, Chromatic, or pixelmatch.*

## Integration with CI/CD

### Local Development
```bash
# Quick visual check
claude "Screenshot homepage at mobile size"
```

### Pull Request Review
```bash
# Capture all pages
claude "Take screenshots of all pages at 3 viewports for PR review"
```

### Automated Testing
- Use Playwright for automated visual regression
- Use this skill for manual review and debugging

## Troubleshooting

### Layout Not Responsive
**Issue:** Desktop layout shown at mobile size

**Fix:**
- Check viewport meta tag exists
- Verify responsive CSS loaded
- Test with device emulation enabled

### Dark Mode Not Applying
**Issue:** Light mode shown after dark mode emulation

**Fix:**
- Check CSS uses `prefers-color-scheme` media query
- Verify dark mode styles exist
- Check JavaScript theme toggle

### Screenshots Too Large
**Issue:** File sizes > 1MB

**Fix:**
- Use JPEG format instead of PNG
- Reduce quality setting
- Don't use fullPage for long pages

### Viewport Not Changing
**Issue:** Page stays at previous size

**Fix:**
- Wait 1-2 seconds after resize
- Check page has responsive styles
- Verify resize_page succeeded

## Example Session

```bash
$ claude "Take screenshots of homepage at mobile and desktop sizes, both light and dark mode"

Claude: I'll capture 4 screenshots:
1. Mobile (375px) - Light mode
2. Mobile (375px) - Dark mode
3. Desktop (1920px) - Light mode
4. Desktop (1920px) - Dark mode

[Navigates to homepage]
[Resizes to 375px]
[Takes screenshot] → mobile-light.png
[Enables dark mode]
[Takes screenshot] → mobile-dark.png
[Resets color scheme]
[Resizes to 1920px]
[Takes screenshot] → desktop-light.png
[Enables dark mode]
[Takes screenshot] → desktop-dark.png

✅ Captured 4 screenshots
Total size: 1.2 MB
Saved to: ./screenshots/home/
```

## Output Examples

### Success
```
✅ Visual Test Passed

Captured 18 screenshots:
  📱 Mobile (375px): 6 screenshots
  📱 Tablet (768px): 6 screenshots
  🖥️  Desktop (1920px): 6 screenshots

Color schemes tested:
  ☀️  Light mode: 9 screenshots
  🌙 Dark mode: 9 screenshots

Total size: 3.2 MB
Saved to: ./screenshots/
```

### With Issues
```
⚠️  Visual Test Completed with Warnings

Captured 17 of 18 screenshots:

Issues found:
  ❌ /contact/ - Failed to load at mobile size
     Error: Navigation timeout

  ⚠️  Dark mode not fully supported on /about/
     Layout breaks in dark mode

Successful screenshots: 15
Failed: 1
Warnings: 1

Partial results saved to: ./screenshots/
```

## Customization via CLAUDE.md

```markdown
## DevTools MCP
url: http://localhost:8000
pages:
  - /
  - /courses/
  - /contact/
viewports:
  - name: mobile
    width: 375
    height: 812
  - name: tablet
    width: 768
    height: 1024
  - name: desktop
    width: 1920
    height: 1080
screenshot:
  format: png
  quality: 90
  fullPage: false
  directory: ./screenshots
```

---

**Status:** Priority 3 - Additional Workflows
**Version:** 0.1.0
**Last updated:** February 12, 2026
