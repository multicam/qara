# Git Update Repository Workflow

Safe commit + push to Qara repos with mandatory security checks.

---

## Trigger Phrases

- "update the Qara repo"
- "commit and push to Qara"
- "push to Qara repo"
- "push these changes"
- "commit these changes"
- "git push"

---

## PRE-FLIGHT CHECKS (MANDATORY)

### 1. Verify Repository Location

```bash
pwd
git remote -v
```

Expected: `github.com/[username]/.private-qara` or private qara repo.

**RED FLAG:** Public remote from `~/.claude/` → STOP and confirm with Jean-Marc.

### 2. Check Current Branch

```bash
git branch --show-current
```

Expected: `main`, `master`, or a feature branch.

### 3. Scan for Sensitive Data

```bash
rg "sk-|api_key.*=.*[a-zA-Z0-9]" --glob '!.git' --glob '!node_modules' 2>/dev/null
rg "SECRET|TOKEN|PASSWORD" --glob '!.git' --glob '!node_modules' --glob '!*.md' 2>/dev/null
rg "@" --glob '!.git' --glob '!node_modules' --glob '!*.md' 2>/dev/null | rg -v "example.com"
```

Any match → review. Must be in gitignored files or example values only.

---

## STANDARD WORKFLOW

### Step 1: Status

```bash
git status
```

### Step 2: Review Changes

```bash
git diff
git diff path/to/file
```

Look for: API keys, tokens, passwords, personal emails, hardcoded paths like `/home/jean-marc/specific-project/`, business-specific info.

### Step 3: Stage

```bash
# Preferred: specific files
git add path/to/file1 path/to/file2

# Or all (caution)
git add .

# Verify staged
git diff --cached
```

### Step 4: Commit

```bash
git commit -m "type: brief description"
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`

Examples:
```bash
git commit -m "feat: add security-protocols.md documentation"
git commit -m "fix: correct identity references in SKILL.md"
git commit -m "refactor: reorganize workflow directory structure"
```

### Step 5: Verify Commit

```bash
git log -1 --stat
git log -1 -p
```

### Step 6: Push

```bash
git push origin $(git branch --show-current)
# or
git push origin main

# Verify
git status
```

Should show: "Your branch is up to date with 'origin/main'"

---

## THREE-CHECK RULE

1. **Check #1:** `git diff` (before staging)
2. **Check #2:** `git diff --cached` (after staging)
3. **Check #3:** `git log -1 -p` (after commit, before push)

Any failure → fix before proceeding.

---

## COMMON SCENARIOS

### Amend Last Commit (Before Push)

```bash
git add forgotten-file.md
git commit --amend --no-edit
# If already pushed:
git push origin main --force-with-lease
```

### Wrong Directory

```bash
pwd && git remote -v
git stash
cd /correct/repo
git stash pop
```

### Unstage / Discard

```bash
git reset HEAD <file>           # Unstage specific
git reset HEAD                  # Unstage all
git checkout -- <file>          # Discard changes (DANGEROUS)
git reset --hard HEAD           # Discard ALL (VERY DANGEROUS)
```

---

## ROLLBACK

### Undo Last Commit (Keep Changes)

```bash
git reset --soft HEAD~1
```

### Undo Last Commit (Discard Changes)

```bash
git reset --hard HEAD~1
```

### Undo Last Push (VERY DANGEROUS)

```bash
git reset --hard HEAD~1
git push --force origin main
```

Then follow `security-protocols.md` incident response.

### Revert Commit (Safe on Shared Branches)

```bash
git revert <commit-hash>
```

---

## STATUS MEANINGS

| Output | Next action |
|---|---|
| "nothing to commit, working tree clean" | done |
| "Changes not staged for commit" | `git add` |
| "Changes to be committed" | `git commit` |
| "Your branch is ahead by N commits" | `git push` |

---

## TROUBLESHOOTING

### Permission denied (publickey)

```bash
ssh-add -l
ssh-add ~/.ssh/id_ed25519
```

### Merge Conflict

```bash
git status
# Edit files, remove <<< === >>> markers
git add <resolved-files>
git commit -m "fix: resolve merge conflicts"
```

### Diverged Branches

```bash
git pull origin main
# Resolve any conflicts
git push origin main
```

---

## QUICK REFERENCE

```bash
# Standard
git status
git diff
git add <files>
git diff --cached
git commit -m "msg"
git log -1 --stat
git push origin main

# Safety
pwd
git remote -v
rg "API_KEY"

# Rollback
git reset --soft HEAD~1
git reset --hard HEAD~1
git revert <hash>
```

**When in doubt, DON'T push. Ask Jean-Marc first.**

See `security-protocols.md` for incident response, two-repo strategy, and API key management.
