---
description: Document codebase as-is with thoughts directory for historical context
model: opus
---

# Research Codebase

Document what exists in the codebase to answer research questions. Use parallel sub-agents and synthesize their findings.

## Non-negotiable: document, don't evaluate

- Describe what exists, where, how it works, and how components interact
- NO improvement suggestions, critiques, root cause analysis, or refactor recommendations
- This is a technical map of the system as it exists today

## On invocation

Respond with:
```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Then wait for the query.

## Steps

1. **Read mentioned files fully first** — if the user mentions specific files (tickets, docs, JSON), Read them WITHOUT limit/offset before spawning any sub-tasks.

2. **Decompose the question** — break into research areas, track via TodoWrite.

3. **Spawn parallel sub-agents:**
   - **codebase-analyzer** — find WHERE components live and HOW they work (documentarian, not critic)
   - **thoughts-analyzer** — ALWAYS include. Finds historical context, prior decisions, gotchas in `thoughts/`
   - **gemini-researcher** — only if user explicitly asks for web research. Return LINKS.

   Run agents in parallel. Don't over-specify HOW — agents know their jobs. Remind agents they document, not evaluate.

4. **Synthesize findings:**
   - Wait for ALL sub-agents to complete
   - Live codebase is primary source; thoughts/ is supplementary
   - Include concrete `file:line` references
   - Verify thoughts/ paths (preserve exact subdirectory — don't swap `allison/` for `shared/`)

5. **Gather metadata:**
   - If `hack/spec_metadata.sh` exists, run it. Otherwise: `git log -1 --format="%H"` and `git branch --show-current`
   - Filename: `thoughts/shared/research/YYYY-MM-DD-ENG-XXXX-description.md` (omit ticket if none)

6. **Write research document** with frontmatter:

```markdown
---
date: [ISO date with timezone]
researcher: [name]
git_commit: [hash]
branch: [name]
repository: [name]
topic: "[User's Question]"
tags: [research, codebase, relevant-components]
status: complete
last_updated: [YYYY-MM-DD]
last_updated_by: [name]
---

# Research: [User's Question]

**Date**: [date/time with tz]
**Researcher**: [name]
**Git Commit**: [hash]
**Branch**: [name]
**Repository**: [name]

## Research Question
[Original query]

## Summary
[High-level answer describing what exists]

## Detailed Findings

### [Component/Area 1]
- What exists ([file.ext:line](link))
- How it connects to other components
- Implementation details (no evaluation)

## Code References
- `path/to/file.py:123` — description
- `another/file.ts:45-67` — description

## Architecture Documentation
[Patterns, conventions, design found]

## Historical Context (from thoughts/)
- `thoughts/shared/something.md` — historical decision about X
- `thoughts/local/notes.md` — past exploration of Y

## Related Research
[Links to other `thoughts/shared/research/` docs]

## Open Questions
[Areas needing further investigation]
```

7. **Add GitHub permalinks** if on main/master or pushed:
   - `gh repo view --json owner,name`
   - Permalink format: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`

8. **Present findings** — concise summary + key file references. Ask about follow-ups.

9. **Follow-ups** — append to same document, update `last_updated` + `last_updated_by`, add `last_updated_note`, add `## Follow-up Research [timestamp]` section.

## Path handling (thoughts/searchable/)

`thoughts/searchable/` contains hard links. Remove ONLY `searchable/`, preserve everything else:
- `thoughts/searchable/allison/old_stuff/notes.md` → `thoughts/allison/old_stuff/notes.md`
- `thoughts/searchable/shared/prs/123.md` → `thoughts/shared/prs/123.md`

NEVER swap `allison/` ↔ `shared/`.

## Critical ordering

- Read mentioned files BEFORE spawning sub-tasks
- Wait for ALL sub-agents BEFORE synthesizing
- Gather metadata BEFORE writing document
- NEVER write document with placeholder values
