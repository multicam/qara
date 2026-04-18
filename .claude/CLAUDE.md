# Global Configuration

PATH includes: ~/.local/bin:~/.cargo/bin:~/.bun/bin:~/.local/share/mise/shims:/usr/local/bin:/usr/bin:/bin

## Tool Enforcement (ALL repos)

CC native tools FIRST — only fall back to Bash when the native tool genuinely can't do it:
- **File search → Glob** (not `find`, not `fd`, not `ls -R`)
- **Content search → Grep** (not `grep`, not `rg`, not `ag`)
- **Read files → Read** (not `cat`, not `head`, not `tail`, not `bat`)

When Bash IS needed, use modern tools — NEVER the slow POSIX equivalent:
- `fd` not `find` (13-23x faster)
- `rg` not `grep -r` (10-50x faster)
- `sd` not `sed -i` (cross-platform)
- `bat` not `cat` (only when Bash output needed, not for reading files)
- `eza` not `ls` (git-aware)
- `bun` not `node`/`npm` (15x startup)
- `uv` not `pip` (10-100x install)

## File Naming (thoughts/ and plans/)

NEVER use CC-generated random names (e.g. `snuggly-painting-bee.md`, `splendid-floating-valiant-agent.md`). Use descriptive names:
- Plans: `category--descriptive-name-v1.md` or `YYYY-MM-DD-descriptive-name.md`
- Research/thoughts: `YYYY-MM-DD-descriptive-name.md` or `topic-descriptive-name.md`

When plan mode assigns a random filename, rename it immediately before writing content.

## Documentation Hygiene (Agent-Facing)

Applies to append-only logs Claude writes for Claude's recall — `DECISIONS.md`, `IMPROVEMENT_LOG.md`, `patterns/*.md`, and any file carrying the pointer `Style: see .claude/CLAUDE.md § Documentation Hygiene`. Does **not** apply to memory files, plans, research, specs, or policy docs.

**Keep:** the decision / observation itself, alternatives rejected, the *why* that changes future behavior, thresholds / rules / retry-limits, revisit triggers, exact file paths if referenced later, measured deltas (test counts, scores, $).

**Drop:** narrative lead-ins, "why it matters" paragraphs, recap tables, verbose file lists unless load-bearing, duplicated reasoning, example pairs, rhetorical framing, per-change LOC deltas.

**Target:** 1–3 sentences per section. Bullet lists over prose. Back-trim older entries when touched.

**Archive:** when a file ≥400 lines, move entries older than the current year to `<stem>/YYYY.md`. Add a pointer at the top of the live file: `Older entries: [YYYY](<stem>/YYYY.md).`

Project-specific instructions are in each repo's root `CLAUDE.md`.
