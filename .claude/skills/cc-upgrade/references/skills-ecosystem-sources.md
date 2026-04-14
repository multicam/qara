# Skills Ecosystem Sources

Comprehensive directory of the agent skills ecosystem — registries, key authors,
CLI tools, open standards, and curated collections. Maintained as part of `cc-upgrade`.

Last reviewed: 2026-04-02

---

## Open Standard

| Resource | URL | Purpose |
|----------|-----|---------|
| Agent Skills Specification | [agentskills.io/specification](https://agentskills.io/specification) | Portable skill format (SKILL.md + frontmatter) |
| Spec GitHub | [agentskills/agentskills](https://github.com/agentskills/agentskills) | Reference implementation |

**Key facts:**
- Launched by Anthropic, December 2025
- Skills written for one platform work across 26+ agents
- Structure: SKILL.md with YAML frontmatter + optional scripts/, references/, assets/

---

## CLI Tools

### skills CLI (Primary)

| Field | Value |
|-------|-------|
| **Install** | `npx skills@latest` |
| **Maintainer** | Vercel Labs |
| **GitHub** | [vercel-labs/skills](https://github.com/vercel-labs/skills) |
| **npm** | [skills](https://www.npmjs.com/package/skills) |
| **Stars** | 11.2k+ |

**Commands:**
```bash
npx skills ls -g              # List global skills
npx skills ls                 # List project skills
npx skills add owner/repo     # Install from GitHub
npx skills check              # Check for updates
npx skills update             # Update all
npx skills add owner/repo --list  # List available skills in a repo
```

### Alternative Managers

| Tool | GitHub | Notes |
|------|--------|-------|
| openskills | [numman-ali/openskills](https://github.com/numman-ali/openskills) | Universal loader for all AI coding agents |
| skillpm | [sbroenne/skillpm](https://github.com/sbroenne/skillpm) | Package manager built on npm |

---

## Skill Marketplaces & Discovery

| Platform | URL | Scale |
|----------|-----|-------|
| **SkillsMP** | [skillsmp.com](https://skillsmp.com) | 280k+ published skills |
| **skills.sh** | [skills.sh](https://skills.sh) | Directory platform, browse by category |

**Quality warning:** Marketplace includes auto-generated and low-quality skills.
Prefer curated sources below.

---

## Tier 1: Official & High-Quality Repositories

| Repository | Author | Description | Install Count |
|-----------|--------|-------------|---------------|
| [anthropics/skills](https://github.com/anthropics/skills) | Anthropic | Official document skills (DOCX, PDF, PPTX, XLSX) + examples | 99k+ stars |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Matt Pocock | 17 production skills (PRD, TDD, refactoring, design, triage) | 11.3k stars |
| [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) | Nico Bailón | Visual diagrams, slides, diff reviews — 22 sub-skills | 7.1k stars |

### Matt Pocock Skills Detail

**Planning:** write-a-prd, prd-to-plan, prd-to-issues, design-an-interface, request-refactor-plan, grill-me
**Development:** tdd, triage-issue, github-triage, improve-codebase-architecture, migrate-to-shoehorn, scaffold-exercises, qa
**Tooling:** setup-pre-commit, git-guardrails-claude-code
**Writing:** write-a-skill, edit-article, ubiquitous-language, obsidian-vault

**Philosophy:** Vertical slicing, interview-driven discovery, progressive disclosure.
**Install:** `npx skills@latest add mattpocock/skills/[skill-name]`

### Nico Bailón Visual-Explainer Detail

**Core skill:** visual-explainer (generates HTML diagrams, Mermaid, slides, data tables)
**Design sub-skills (post impeccable v2.1.1 migration, 18):** impeccable (consolidates frontend-design + teach-impeccable + extract), shape, layout (was arrange), polish (absorbs normalize + onboard), adapt, animate, audit, bolder, clarify, colorize, critique, delight, distill, harden, optimize, overdrive, quieter, typeset

**Philosophy:** Anti-AI-slop design, context-first, progressive disclosure, accessibility-first.
**Install:** `npx skills@latest add nicobailon/visual-explainer`

---

## Tier 2: Curated Collections

| Repository | Maintainer | Scale | Quality |
|-----------|-----------|-------|---------|
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | VoltAgent | 500+ skills | High — from official dev teams (Anthropic, Google, Vercel, Stripe, Cloudflare, Netlify, Sentry) |
| [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | sickn33 | 1,300+ skills | Mixed — includes installer CLI |
| [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | travisvn | Community | Medium — community-curated |
| [karanb192/awesome-claude-skills](https://github.com/karanb192/awesome-claude-skills) | karanb192 | 50+ verified | Medium-High — verified entries |
| [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills) | heilcheng | Multi-agent | Medium — tutorials included |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | hesreallyhim | CC-specific | Medium — skills, hooks, orchestrators |

---

## Monitoring Cadence

| Source | Check Frequency | Method |
|--------|----------------|--------|
| anthropics/skills | Monthly | `gh api repos/anthropics/skills/commits` |
| mattpocock/skills | Bi-weekly | `gh api repos/mattpocock/skills/commits` |
| nicobailon/visual-explainer | Weekly | `npx skills check` or `gh api repos/nicobailon/visual-explainer/releases/latest` |
| Awesome lists | Monthly | Manual review of new entries |
| SkillsMP trending | Monthly | Browse top skills by category |
| Agent Skills spec | Quarterly | Check for spec version bumps |

---

## Evaluation Criteria for New Skills

Before adopting an external skill, score it:

| Criterion | Weight | Check |
|-----------|--------|-------|
| **Active maintenance** | HIGH | Commits in last 60 days? Open issues addressed? |
| **CC compatibility** | HIGH | Uses Agent Skills spec? Tested with Claude Code? |
| **No local overlap** | HIGH | Does a local skill already cover this? |
| **Progressive disclosure** | MED | Uses references/, keeps SKILL.md < 500 lines? |
| **Context efficiency** | MED | Appropriate context type (fork vs same)? |
| **Community signal** | LOW | Stars, forks, install count? |
| **License** | LOW | MIT/Apache preferred |

**Adopt if:** HIGH criteria all pass + at least 2 MED pass.
**Wrap if:** Valuable but needs PAI convention alignment.
**Fork if:** Unmaintained but methodology is strong.
**Skip if:** Any HIGH criterion fails.