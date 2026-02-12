---
workflow: accessibility
description: Accessibility testing and WCAG compliance checking
tools: [navigate_page, take_snapshot, press_key, evaluate_script]
---

# Accessibility Workflow

Test accessibility compliance, keyboard navigation, and WCAG guidelines.

## Purpose

Accessibility validation:
- ✅ Check ARIA landmarks and roles
- ✅ Test keyboard navigation
- ✅ Verify heading hierarchy
- ✅ Check form labels and descriptions
- ✅ Validate color contrast
- ✅ Test screen reader compatibility

## MCP Tools Used

1. **navigate_page** - Load pages
2. **take_snapshot** - Get accessibility tree
3. **press_key** - Test keyboard navigation
4. **evaluate_script** - Run axe-core or custom checks

## WCAG Levels

### Level A (Minimum)
Basic accessibility features that all websites should have.

### Level AA (Standard)
Recommended level for most websites. Addresses major barriers.

### Level AAA (Enhanced)
Highest level. Not always achievable for all content.

**Target:** WCAG 2.1 Level AA compliance

## Workflow Steps

### 1. Take Accessibility Snapshot

```
navigate_page to URL
take_snapshot with verbose=true
```

Returns:
- Element tree with roles
- ARIA attributes
- Form labels
- Heading hierarchy
- Interactive elements

### 2. Check Landmarks

**Required landmarks:**
- `<main>` or `role="main"` - Main content
- `<nav>` or `role="navigation"` - Navigation
- `<header>` or `role="banner"` - Page header
- `<footer>` or `role="contentinfo"` - Page footer

**Optional but recommended:**
- `<aside>` or `role="complementary"` - Sidebar
- `<search>` or `role="search"` - Search
- `<form>` or `role="form"` - Forms

### 3. Check Heading Hierarchy

**Rules:**
- Page must have one `<h1>`
- Headings must not skip levels (h1 → h2 → h3, not h1 → h3)
- Headings should describe content structure

**Example check:**
```
evaluate_script:
() => {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  return headings.map(h => ({
    level: parseInt(h.tagName[1]),
    text: h.textContent.trim()
  }));
}
```

### 4. Test Keyboard Navigation

```
navigate_page to URL
press_key "Tab"
take_snapshot  # Check focus indicator
press_key "Tab"
take_snapshot  # Check next element
press_key "Enter"  # Activate element
```

**Requirements:**
- All interactive elements reachable by keyboard
- Focus indicator visible
- Logical tab order
- No keyboard traps

### 5. Check Form Accessibility

**Requirements:**
- All inputs have labels
- Error messages associated with fields
- Required fields indicated
- Instructions provided

**Example check:**
```
evaluate_script:
() => {
  const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
  return inputs.map(input => ({
    id: input.id,
    hasLabel: !!document.querySelector(`label[for="${input.id}"]`),
    hasAriaLabel: !!input.getAttribute('aria-label'),
    hasAriaLabelledBy: !!input.getAttribute('aria-labelledby'),
    hasPlaceholder: !!input.placeholder,
    isLabelled: !!(
      document.querySelector(`label[for="${input.id}"]`) ||
      input.getAttribute('aria-label') ||
      input.getAttribute('aria-labelledby')
    )
  }));
}
```

### 6. Run axe-core Checks

```
evaluate_script:
async () => {
  // Inject axe-core if not present
  if (typeof axe === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.7.2/axe.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  // Run axe
  const results = await axe.run();

  return {
    violations: results.violations.length,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    issues: results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length
    }))
  };
}
```

## Output Format

```json
{
  "passed": true,
  "url": "http://localhost:8000",
  "timestamp": "2026-02-12T10:00:00Z",
  "wcagLevel": "AA",
  "landmarks": {
    "main": true,
    "navigation": true,
    "header": true,
    "footer": true,
    "search": false
  },
  "headings": {
    "h1Count": 1,
    "hierarchy": "valid",
    "structure": [
      { "level": 1, "text": "Welcome" },
      { "level": 2, "text": "Features" },
      { "level": 3, "text": "Feature 1" },
      { "level": 3, "text": "Feature 2" }
    ]
  },
  "keyboard": {
    "navigable": true,
    "focusVisible": true,
    "noTraps": true,
    "logicalOrder": true
  },
  "forms": {
    "totalInputs": 5,
    "labelledInputs": 5,
    "unlabelledInputs": 0
  },
  "axeResults": {
    "violations": 2,
    "passes": 48,
    "incomplete": 3,
    "issues": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "description": "Text has insufficient contrast",
        "nodes": 3
      },
      {
        "id": "image-alt",
        "impact": "critical",
        "description": "Images must have alternate text",
        "nodes": 2
      }
    ]
  },
  "recommendations": [
    "Fix color contrast on 3 elements",
    "Add alt text to 2 images",
    "Review 3 incomplete checks"
  ]
}
```

## Common Checks

### Landmark Check

```bash
claude "check accessibility landmarks on homepage"
```

Output:
```
✅ Accessibility Landmarks

Required:
  ✅ Main content (<main>)
  ✅ Navigation (<nav>)
  ✅ Page header (<header>)
  ✅ Page footer (<footer>)

Optional:
  ⚠️  Search (not found)
  ✅ Complementary (<aside>)

All required landmarks present.
```

### Heading Hierarchy

```bash
claude "check heading structure on /blog/article/"
```

Output:
```
✅ Heading Hierarchy

Structure:
  h1: Article Title
    h2: Introduction
      h3: Background
      h3: Context
    h2: Main Content
      h3: Section 1
      h3: Section 2
    h2: Conclusion

✅ No skipped levels
✅ Logical structure
```

### Keyboard Navigation

```bash
claude "test keyboard navigation on /contact/"
```

Output:
```
✅ Keyboard Navigation

Tab order:
  1. Skip to main content (link)
  2. Home (nav link)
  3. About (nav link)
  4. Contact (nav link)
  5. Name (input)
  6. Email (input)
  7. Message (textarea)
  8. Submit (button)

✅ All interactive elements reachable
✅ Focus indicators visible
✅ Logical tab order
✅ No keyboard traps
```

### Form Accessibility

```bash
claude "check form accessibility on /signup/"
```

Output:
```
⚠️  Form Accessibility Issues

Inputs: 4
Labelled: 3
Unlabelled: 1

Issues:
  ❌ Phone number input has no label
     (Use <label> or aria-label)

  ✅ Email input properly labelled
  ✅ Password input properly labelled
  ✅ Terms checkbox properly labelled

Fix: Add label to phone input
```

### Color Contrast

```bash
claude "check color contrast on homepage"
```

Uses axe-core to detect contrast issues.

### Image Alt Text

```bash
claude "check images have alt text on /gallery/"
```

Output:
```
⚠️  Image Alt Text Issues

Images: 12
With alt: 10
Missing alt: 2

Issues:
  ❌ hero-banner.jpg - No alt text
  ❌ decorative-bg.png - No alt text

Recommendations:
  - hero-banner.jpg: Add descriptive alt
  - decorative-bg.png: Use alt="" (decorative)
```

## Detailed Checks

### ARIA Attributes

Check for:
- `aria-label` - Accessible name
- `aria-labelledby` - Reference to label
- `aria-describedby` - Additional description
- `aria-required` - Required field
- `aria-invalid` - Validation state
- `aria-live` - Dynamic content regions
- `aria-expanded` - Collapsible state
- `aria-pressed` - Toggle button state

### Screen Reader Testing

While MCP can't run actual screen readers, it can check:
- Semantic HTML usage
- ARIA attributes
- Alt text on images
- Label associations
- Hidden content (aria-hidden)

### Focus Management

Check:
- Focus order matches visual order
- Focus visible at all times
- No focus traps
- Skip links present
- Focus restored after dialogs

### Dynamic Content

Check:
- ARIA live regions for updates
- Loading states communicated
- Error messages announced
- Success messages announced

## WCAG Guidelines

### Perceivable

**1.1 Text Alternatives**
- Images have alt text
- Form inputs have labels

**1.3 Adaptable**
- Semantic HTML used
- Landmarks present
- Heading hierarchy valid

**1.4 Distinguishable**
- Color contrast sufficient
- Text resizable
- Focus indicators visible

### Operable

**2.1 Keyboard Accessible**
- All functionality via keyboard
- No keyboard traps
- Shortcuts documented

**2.4 Navigable**
- Skip links present
- Page titles descriptive
- Link text descriptive
- Multiple navigation methods

### Understandable

**3.1 Readable**
- Language specified (`lang="en"`)
- Clear and simple language

**3.2 Predictable**
- Consistent navigation
- Consistent identification
- Changes on request only

**3.3 Input Assistance**
- Error messages clear
- Labels and instructions provided
- Error prevention

### Robust

**4.1 Compatible**
- Valid HTML
- ARIA used correctly
- Name, role, value defined

## Automated Testing

### Basic Check

```bash
claude "run accessibility audit on homepage"
```

Checks:
- Landmarks
- Headings
- Keyboard navigation
- Form labels
- Basic axe-core violations

### Comprehensive Check

```bash
claude "run full WCAG AA check on all pages"
```

Tests all pages against WCAG 2.1 Level AA.

### CI/CD Integration

```bash
# In pipeline
- name: Accessibility Test
  run: |
    pnpm build
    pnpm serve &
    sleep 5
    claude "a11y audit on all pages, fail if critical issues"
```

## Manual Testing Requirements

Some checks require manual testing:
- Screen reader experience
- Color perception (colorblindness simulation)
- Cognitive load
- Content readability
- Error recovery

**MCP provides:** Automated checks for technical compliance

**Manual testing provides:** User experience validation

## Common Issues & Fixes

### Missing Landmarks

**Issue:** No `<main>` element

**Fix:**
```html
<main role="main">
  <!-- Main content -->
</main>
```

### Skip Link Missing

**Issue:** No skip to main content link

**Fix:**
```html
<a href="#main" class="skip-link">Skip to main content</a>
<main id="main">
  <!-- Content -->
</main>
```

### Unlabelled Input

**Issue:** Input without label

**Fix:**
```html
<!-- Option 1: Explicit label -->
<label for="email">Email:</label>
<input id="email" type="email">

<!-- Option 2: Implicit label -->
<label>
  Email:
  <input type="email">
</label>

<!-- Option 3: ARIA label -->
<input type="email" aria-label="Email">
```

### Poor Contrast

**Issue:** Text contrast ratio < 4.5:1

**Fix:**
```css
/* Before (poor contrast) */
color: #999;
background: #fff;  /* 2.8:1 ratio */

/* After (good contrast) */
color: #666;
background: #fff;  /* 5.7:1 ratio */
```

### Heading Skip

**Issue:** h1 → h3 (skipped h2)

**Fix:**
```html
<!-- Before (bad) -->
<h1>Title</h1>
<h3>Subtitle</h3>  <!-- Skipped h2 -->

<!-- After (good) -->
<h1>Title</h1>
<h2>Subtitle</h2>
```

## Tools & Resources

### Browser Tools
- **Chrome DevTools** - Accessibility pane
- **Firefox Accessibility Inspector**
- **WAVE browser extension**

### Automated Testing
- **axe-core** - Accessibility testing engine
- **pa11y** - CLI accessibility tester
- **Lighthouse** - Accessibility audit

### Screen Readers
- **NVDA** (Windows, free)
- **JAWS** (Windows, paid)
- **VoiceOver** (macOS/iOS, built-in)
- **TalkBack** (Android, built-in)

### Color Tools
- **WebAIM Contrast Checker**
- **Colour Contrast Analyser**
- **Colorblind simulators**

## Example Session

```bash
$ claude "check accessibility on homepage"

Claude: Running accessibility audit...

[Navigates to homepage]
[Takes accessibility snapshot]
[Runs axe-core checks]

Accessibility Results:

Landmarks:
  ✅ All required landmarks present

Headings:
  ✅ Valid hierarchy (h1 → h2 → h3)
  ✅ One h1 found

Keyboard:
  ✅ All interactive elements reachable
  ✅ Focus indicators visible

Forms:
  ⚠️  1 unlabelled input found

Axe Results:
  ❌ 2 violations (1 critical, 1 serious)
  ✅ 48 checks passed

Critical Issues:
  1. Missing alt text on hero image
  2. Insufficient color contrast on footer links

Priority Fixes:
  1. Add alt="..." to img.hero
  2. Increase footer link contrast to 4.5:1
  3. Add label to phone input

WCAG 2.1 Level AA: 95% compliant
```

---

**Status:** Priority 5 - Remaining Workflows
**Version:** 0.1.0
**Last updated:** February 12, 2026
