# File Organization

Where to save what in `~/.claude/`.

---

## Directories

```
~/.claude/
├── skills/          Domain expertise packages (PERMANENT)
├── history/         Permanent valuable outputs (PERMANENT)
├── scratchpad/      Temporary working files (TEMPORARY, gitignored)
├── bin/             CLI tools and scripts (PERMANENT)
├── agents/          Agent configurations (PERMANENT)
├── .env             Environment variables (PERMANENT, PRIVATE)
```

---

## `skills/` — Domain Expertise

Skill packages with SKILL.md, workflows, reference docs, templates, domain-specific CLI tools.

```
skills/
├── CORE/                 Core identity and infrastructure
├── system-create-skill/  Skill creation tooling
└── [domain-skills]/
```

**Never put here:** outputs, temporary work, one-off scripts, data files.

---

## `history/` — Permanent Outputs

```
history/
├── raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl
├── learnings/YYYY-MM/YYYY-MM-DD-HHMMSS_LEARNING_description.md
├── sessions/YYYY-MM/YYYY-MM-DD-HHMMSS_SESSION_description.md
├── research/YYYY-MM-DD_topic/{analysis,findings,sources}.md
├── execution/YYYY-MM/YYYY-MM-DD-HHMMSS_command-name.txt
└── upgrades/YYYY-MM-DD_upgrade-description.md
```

**Save when:** output has lasting value, documents learning, research findings, important decisions.

**Don't save:** throwaway work, easily reproducible, still drafting, experiments.

---

## `scratchpad/` — Temporary Work

```
scratchpad/
├── YYYY-MM-DD/          Date-based (auto-cleaned >7 days)
│   ├── test-*.ts
│   ├── draft-*.md
│   └── temp-*.json
└── active/              Current WIP
    └── wip-*.md
```

**Cleanup:**
```bash
fd . ~/.claude/scratchpad -t f --changed-before 7days -x rm
```

---

## `bin/` — CLI Tools

```
bin/
├── llcli/
│   ├── llcli.ts
│   ├── package.json
│   └── README.md
```

**Requirements:**
- Executable (`chmod +x`)
- Shebang (`#!/usr/bin/env bun`)
- `--help` flag
- README

---

## File Naming

```
Learnings:   YYYY-MM-DD-HHMMSS_LEARNING_short-description.md
Sessions:    YYYY-MM-DD-HHMMSS_SESSION_short-description.md
Research:    YYYY-MM-DD_topic/
Scratchpad:  YYYY-MM-DD/file.ext  or  active/wip-*.md
```

---

## Decision

```
Valuable long-term? → history/
  ├─ narrative       → history/learnings/
  ├─ analysis        → history/research/
  ├─ work summary    → history/sessions/
  ├─ command output  → history/execution/
  └─ architecture    → history/upgrades/

Temporary? → scratchpad/
  ├─ WIP             → scratchpad/active/
  └─ test/throwaway  → scratchpad/YYYY-MM-DD/
```

Gate: Will I reference this in 1+ months? Does it document learning? Is it complete (not draft)?

---

## Backup

- **In git:** skills/, bin/, history/
- **Gitignored by design:** scratchpad/, .env
- **Manual backup .env:** `cp ~/.claude/.env ~/.claude/backups/env-$(date +%Y-%m-%d).bak`

---

## Related

- `security-protocols.md` — what never to commit
- `git-update-repo.md` — committing organized files
