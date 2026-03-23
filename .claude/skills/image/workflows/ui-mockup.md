# UI Mockup — Interface Generation Workflow

Generate UI/UX mockups from lo-fi wireframes to hi-fi interface designs. Covers web apps, mobile apps, dashboards, landing pages, and individual components.

---

## Step 1: Clarify the Scope

Before generating, confirm what's actually needed:

1. **Scope** — Full page layout? Single component? Section of a page?
2. **Platform** — Web browser, iOS, Android, desktop app?
3. **Context** — What does this product do? What screen in the user flow is this?
4. **Specific screens** — If a full product, which screen(s)? (onboarding, dashboard, settings, checkout)

If scope is unclear, ask JM. A dashboard and a landing page have very different structural requirements.

---

## Step 2: Determine Fidelity

| Fidelity | Characteristics | When to use |
|---|---|---|
| Lo-fi wireframe | Greyscale boxes, placeholder text, layout only | Early stage — exploring structure and flow |
| Mid-fi wireframe | Grey with some color signal, real copy, rough components | Presenting layout options before visual polish |
| Hi-fi mockup | Full color, real typography, detailed components | Presentation, client review, final design direction |

If JM doesn't specify, default to hi-fi mockup.

---

## Step 3: Gather UI Context

Ask JM for (or infer from context):

- **Product type** — SaaS, e-commerce, content platform, mobile utility, internal tool
- **Existing brand** — Does it have a visual identity? Colors? Typography?
- **Key content on screen** — What data, actions, or information does this screen contain?
- **User action** — What is the primary thing a user does on this screen?

---

## Step 4: Select Model

| Need | Model |
|---|---|
| Wireframe or text-heavy UI (labels, navigation, forms) | `nano-banana-pro` |
| Hi-fi realistic product screenshot | `gpt-image-1` |
| Conceptual / artistic UI exploration | `flux` |

Default: `nano-banana-pro` for wireframes and most mockups. Use `gpt-image-1` when JM wants photorealistic device mockups.

---

## Step 5: Construct the Prompt

Use UI-specific vocabulary. Be precise about component names, layout regions, and content types.

```
[Screen name] for a [product type] [platform] interface.
Fidelity: [lo-fi wireframe / mid-fi / hi-fi mockup]

LAYOUT:
[Navigation — top nav / sidebar / bottom tab bar? List items]
[Main content region — what's in it? columns? cards? table?]
[Secondary panels or sidebars — what content?]
[Actions — primary button placement, key CTAs]

UI COMPONENTS:
[List specific components: search bar, data table, card grid, modal, form, chart, etc.]
[Note states: empty state, loaded state, active/selected item]

TYPOGRAPHY:
[Font style: geometric sans for modern SaaS, serif for editorial, etc.]
[Label hierarchy: nav labels, section headings, body copy, metadata]

STYLE: [Corresponding aesthetic — see Step 6]

COLOR:
[Background, surface, accent, text — from aesthetic or brand]

CRITICAL:
- Grid-based layout, consistent spacing
- Navigation clearly distinguishable from content
- Hierarchy: primary action most prominent
- Labels accurate to standard UI vocabulary
```

### Prompt Patterns by Product Type

| Product Type | Key Layout Notes |
|---|---|
| SaaS dashboard | Left sidebar nav, top header with user menu, main content with metrics/charts/tables |
| Landing page | Full-width hero, feature sections, social proof, CTA |
| Mobile app | Bottom tab bar (iOS) or bottom nav (Android), scrollable list views, floating action button |
| E-commerce | Product grid or detail page, price/CTA prominence, image-forward layout |
| Settings / admin | Two-column (nav tree + content), form-heavy, table layouts |

---

## Step 6: Select Aesthetic

| Context | Aesthetic |
|---|---|
| General UI (not TGDS-branded) | CORE aesthetic — warm neutrals, Signal Orange CTAs |
| TGDS product or platform mockup | TGDS aesthetic — blue/yellow brand, Gotham-style typography |
| Custom brand provided by JM | Follow that brand, note any deviations |

Load the relevant aesthetic file and apply its color and typography guidance.

---

## Step 7: Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model <selected-model> \
  --prompt "<constructed-prompt>" \
  --slug <screen-name> \
  --size 2K \
  --aspect-ratio 16:9 \
  [--project <path>]
```

For mobile: use `--aspect-ratio 9:16` or `--size 1024x1536` (gpt-image-1).

---

## Iteration Expectation

UI mockups almost always need at least one refinement round. After first generation:

1. Show path to JM
2. Note what worked and what to adjust (layout region, component detail, color)
3. Refine the prompt — be more specific about the element that needs improvement
4. If a component is wrong, describe it with more UI vocabulary in the next prompt
5. Consider using the first output as `--reference-image` with targeted adjustments in the prompt
