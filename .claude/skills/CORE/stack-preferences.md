# Stack Preferences & Tooling

**Purpose**: Jean-Marc's technology stack preferences for Qara system.

---

## Core Principles (Always Active)

### Language Hierarchy
1. **TypeScript** (preferred for everything)
2. **Rust** (when performance critical)
3. **Bash** (for system scripts)
4. **Python** (ONLY when explicitly approved — slow, dependency hell, whitespace issues)

### Package Managers (MANDATORY)
- **JS/TS:** `bun` (NOT npm/yarn/pnpm)
- **Python:** `uv` (NOT pip/conda/poetry/pipenv)
- **Rust:** `cargo`

### Markup: Markdown > HTML (ZEALOTS)
- NEVER HTML for basic content — that's a BUG
- HTML only for: custom components (`<details>`, `<aside>`), complex layouts, interactive elements

---

## Code Style & Conventions

### General Principles
- Deterministic Code First (from CONSTITUTION.md)
- CLI-First Architecture (from CONSTITUTION.md)
- Explicit over implicit, readable over clever, boring over exciting

### Naming Conventions
- Files: `lowercase-with-dashes.ts`, `PascalCase.tsx` (React)
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

---

## Development Tools

### Editors
PHPStorm, Windsurf, VS Code

### Terminals
Warp, iTerm2 (macOS), Konsole (Linux)

### Shell
Bash (default for scripts), Fish/Zsh for interactive

### Git
CLI-first, `tig` for terminal UI

---

## Testing

See `testing-guide.md` for comprehensive guide.

**Hierarchy:** Unit (many, fast) → Integration (some, medium) → E2E (few, slow)
**Tools:** Vitest (unit/integration), Playwright (E2E)

---

## Runtime & Build Preferences

### JS/TS Runtimes
1. **Bun** (preferred) — new projects, scripts, local tools
2. **Node.js** (acceptable) — ecosystem compatibility
3. **Deno** (acceptable) — enhanced security

### Build Tools
- **Bun** / **esbuild** / **Vite** — preferred
- Avoid: Webpack (slow), Rollup (unless needed), Parcel (less control)

---

## Data Formats
1. **JSON** — config, APIs, data exchange
2. **YAML** — human-readable config (sparingly)
3. **TOML** — Rust projects
4. **XML** — avoid unless required

---

## Framework Preferences

### Frontend
Svelte/SvelteKit, React/Next.js, Tailwind CSS, shadcn/ui, shadcn-svelte

### Backend
Hono > Fastify > Express (legacy)

### Database
SQLite, MongoDB | ORM: Prisma

---

## Linting & Formatting
- **Prettier** + **ESLint**
- Config: `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "es5"`

---

## Analysis vs Action Rule

| User says | Action |
|-----------|--------|
| "Analyze", "What's wrong with" | Analyze only, DON'T change anything |
| "Implement", "Fix", "Update" | Take action |
| "Analyze and fix" | Both |
| "Should I use X or Y?" | Recommend only |
| "Use X for this" | Take action |

---

## Quick Reference Card

```
Languages:    TypeScript > Rust > Bash > (Python)
Packages:     bun (JS/TS), uv (Python)
Markup:       Markdown (HTML only for custom components)
Testing:      Vitest (unit), Playwright (E2E)
Runtime:      Bun > Node > Deno
Formatting:   Prettier + ESLint
Frontend:     React/Svelte + Tailwind + shadcn
Backend:      Hono > Fastify > Express
Analysis:     Don't change unless explicitly asked
```

---

## Related Documentation
- `testing-guide.md` — comprehensive testing guide
- `CONSTITUTION.md` — CLI-First and Deterministic Code principles
- `TOOLS.md` — complete tool inventory
