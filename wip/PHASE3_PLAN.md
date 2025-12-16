# Phase 3: Deep Optimization (Proposed)

**Status:** In Progress  
**Estimated Duration:** 1-2 weeks  
**Depends On:** Phase 1 ✅, Phase 2 ✅

**Completed:** WP2 ✅, WP3 ✅

---

## Objectives

Phase 3 focuses on deeper optimization work that requires more careful consideration:
1. Split oversized files for better token efficiency
2. Consolidate large hooks into shared utilities
3. Add CI/CD integration for quality checks
4. Improve developer experience

---

## Work Packages

### WP1: Oversized File Splitting (Priority: Medium)

**Problem:** 43 files exceed 400 lines, with some extreme cases:
- `SKILL-STRUCTURE-AND-ROUTING.md` (2,358 lines)
- `CONSTITUTION.md` (1,153 lines)
- `hook-system.md` (1,010 lines)

**Proposed Actions:**
- [ ] Split `SKILL-STRUCTURE-AND-ROUTING.md` into focused guides
- [ ] Review `CONSTITUTION.md` - keep as single source of truth?
- [ ] Split `hook-system.md` into hook-specific docs
- [ ] Target: All files <500 lines (except reference docs)

**Risk:** Medium - May break existing references
**Effort:** 2-3 days

---

### WP2: Hook Consolidation (Priority: Low) ✅ COMPLETE

**Problem:** `stop-hook.ts` is 18KB with mixed responsibilities

**Completed Actions:**
- [x] Extract shared utilities to `hooks/lib/`
- [x] Create `hooks/lib/tab-titles.ts` for title generation
- [x] Create `hooks/lib/stdin-utils.ts` for stdin reading patterns
- [x] Create `hooks/lib/transcript-utils.ts` for transcript parsing
- [ ] Refactor hooks to use new lib/ utilities (future)

**New lib/ files created:**
```
hooks/lib/
├── metadata-extraction.ts  (existing - 5KB)
├── observability.ts        (existing - 1.7KB)
├── pai-paths.ts            (existing - 2.2KB)
├── stdin-utils.ts          (NEW - 2KB)
├── tab-titles.ts           (NEW - 4.8KB)
└── transcript-utils.ts     (NEW - 5.4KB)
```

**Functions available for hooks to import:**
- `generateTabTitle()`, `setTerminalTabTitle()`, `setTabTitleSync()` from tab-titles.ts
- `readStdin()`, `readHookInput()`, `readStdinWithTimeout()`, `delay()` from stdin-utils.ts
- `findTaskResult()`, `extractCompletionMessage()`, `getLastUserQuery()` from transcript-utils.ts

**Risk:** Medium - Hooks are critical path
**Effort:** 1-2 days
**Status:** ✅ Lib created, hooks can be refactored incrementally


---

### WP3: Pre-commit Integration (Priority: High) ✅ COMPLETE

**Problem:** Quality checks exist but aren't automated

**Completed Actions:**
- [x] Create `scripts/pre-commit` template
- [x] Run `validate-skills.sh` on commit
- [x] Run `check-references.sh` on commit (warnings only)
- [x] Check for .env and settings.json commits (blocked)
- [x] Add to `install/setup.sh` as optional step

**Installation:**
```bash
# Manual
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Or run install/setup.sh which offers to install it
```

**Risk:** Low
**Effort:** 0.5 days
**Status:** ✅ Complete

---

### WP4: Skill Optimization (Priority: Medium)

**Problem:** Some skills have large SKILL.md files that could be simplified

**Targets:**
- [ ] `system-create-skill/SKILL.md` (542 lines) → <200 lines
- [ ] `story-explanation/SKILL.md` (447 lines) → <200 lines
- [ ] `fabric/SKILL.md` (386 lines) → <200 lines

**Approach:** Move detailed content to workflows, keep SKILL.md as routing

**Risk:** Low
**Effort:** 1-2 days

---

### WP5: Documentation Refresh (Priority: Low)

**Problem:** Some docs reference old patterns or removed files

**Proposed Actions:**
- [ ] Update `ROUTING_MAP.md` with Phase 1+2 changes
- [ ] Update `docs/ARCHITECTURE.md` with current structure
- [ ] Create `docs/CHANGELOG.md` for tracking changes
- [ ] Review and update `MAINTENANCE_GUIDE.md`

**Risk:** Low
**Effort:** 1 day

---

### WP6: Research Skill Deep Dive (Priority: Optional)

**Problem:** Research skill has complex workflows that may have redundancy

**Proposed Actions:**
- [ ] Audit research skill for redundant patterns
- [ ] Consolidate researcher agent definitions
- [ ] Simplify `conduct.md` workflow
- [ ] Review Perplexity/Claude/Gemini researcher overlap

**Risk:** Medium - Research is heavily used
**Effort:** 2-3 days

---

## Recommended Priority Order

1. ~~**WP3: Pre-commit Integration**~~ ✅ DONE
2. ~~**WP2: Hook Consolidation**~~ ✅ DONE (lib created)
3. **WP4: Skill Optimization** (Medium effort, good ROI)
4. **WP1: Oversized File Splitting** (Larger effort, needed)
5. **WP5: Documentation Refresh** (Low effort, maintenance)
6. **WP6: Research Skill Deep Dive** (Optional, if time permits)

---

## Success Criteria

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Files >500 lines | 30+ | <10 | Pending |
| Max SKILL.md size | 542 lines | <300 lines | Pending |
| Pre-commit hooks | None | Active | ✅ Done |
| Broken references | ~10 | 0 | Pending |
| hooks/lib/ utilities | 3 | 6 | ✅ Done (6 files) |

---

## Questions for Review

1. **WP1:** Should `CONSTITUTION.md` remain as-is (single source of truth) or be split?
2. **WP2:** Is hook consolidation worth the risk given they're working?
3. **WP3:** Should pre-commit be mandatory or optional in setup?
4. **WP6:** Is research skill optimization a priority right now?

---

## Notes

- All work packages are independent and can be done in any order
- Each WP can be skipped if not valuable
- Recommend starting with WP3 (quick win) then WP4 (medium impact)
- WP1 and WP2 are larger efforts that may not be needed immediately

---

**Please edit this plan as needed. Mark items to skip, reprioritize, or add new work packages.**
