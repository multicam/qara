# Merge Conflict Resolution

Systematic resolution with trade-off evaluation.

---

## Triggers

- "merge conflict"
- "resolve conflicts"
- "git conflicts"
- "conflicting changes"
- "merge failed"

**Use when:** `git merge`/`git pull` conflicts, divergent branches, competing implementations.

**Skip for:** simple file overwrites, obvious "take theirs"/"take ours".

---

## Workflow

### Step 1: Assess

```bash
git status
git diff --check
```

### Step 2: Analyze Both Versions

For each conflict hunk:
- HEAD: what does it do, why?
- Incoming: what does it do, why?
- Conflict type: logic, API, structure, or content

### Step 3: Evaluate Trade-offs

- **Correctness** — works? handles edge cases?
- **Performance** — faster? scales better?
- **Maintainability** — easier to understand/test/modify?
- **Compatibility** — fewer breaking changes? matches patterns?

### Step 4: Choose Strategy

**A. Take one version**
```bash
git checkout --ours conflicted-file.ts
git checkout --theirs conflicted-file.ts
git add conflicted-file.ts
```

**B. Merge both** — combine both approaches manually.

**C. New solution** — synthesize a better approach from both insights.

### Step 5: Resolve and Test

```bash
# Edit file, remove <<< === >>> markers
bun test conflicted-file.test.ts
git add conflicted-file.ts
```

### Step 6: Complete

```bash
git status                # verify all resolved
git merge --continue      # or: git rebase --continue
```

---

## Rules

1. **Understand both sides before resolving.** Never blindly pick.
2. **Test after resolution:** `bun test && bun run lint && bun run build`
3. **Document complex resolutions** in the commit message: what conflicted, why this choice, trade-offs.
4. **Escalate for major conflicts** when logic or architecture is unclear.

---

## Abort

```bash
git merge --abort
git rebase --abort

# Review before retrying
git diff HEAD..feature-branch
```

---

## Quick Reference

```bash
# View
git status
git diff --check

# Take sides
git checkout --ours file.ts
git checkout --theirs file.ts

# Mark resolved
git add file.ts

# Continue / abort
git merge --continue
git rebase --continue
git merge --abort
git rebase --abort
```
