# Phase 2: Structural Cleanup (Week Project)

**Start Date:** December 16, 2025  
**Target Duration:** 1 week  
**Status:** Planning  
**Depends On:** Phase 1 Complete ✅

---

## Executive Summary

Phase 2 focuses on structural cleanup across the Qara codebase, building on Phase 1's token optimization. The goal is to reduce complexity, remove dead code, consolidate redundant structures, and establish automated quality checks.

---

## Scope Analysis

### Current State Metrics

| Component | Count | Lines | Notes |
|-----------|-------|-------|-------|
| **SKILL.md files** | 15 | 3,681 total | Range: 41-542 lines |
| **Hooks** | 14 | ~85,000 bytes | Some may be redundant |
| **Agents** | 8 | ~50,000 bytes | Cleaned in Phase 1 |
| **Empty skill dirs** | 6+ | - | brightdata, create-skill, etc. |
| **Templates** | 4 | 1,420 lines | Created in refactor |

### SKILL.md Size Distribution

```
Small (<100 lines):    3 files (frontend-design, alex-hormozi-pitch, prompting)
Medium (100-200):      4 files (art, brightdata, create-skill, example-skill)
Large (200-400):       5 files (CORE, research, agent-obs, finance-charts, system-create-cli)
Oversized (>400):      3 files (system-create-skill, story-explanation, fabric)
```

---

## Phase 2 Work Packages

### WP1: Skills Directory Cleanup (Day 1-2)

**Objective:** Remove empty/stub skills, consolidate duplicates

#### Tasks

1. **Audit empty skill directories**
   - [ ] `brightdata/` - Empty, remove or populate
   - [ ] `create-skill/` - Empty, duplicate of `system-create-skill`?
   - [ ] `frontend-design/` - 41 lines, stub only
   - [ ] `story-explanation/` - 447 lines, active?

2. **Consolidate duplicate skills**
   - [ ] `create-skill` vs `system-create-skill` - Merge or remove one
   - [ ] `system-create-cli` - Is this used?

3. **Simplify oversized SKILL.md files**
   - [ ] `system-create-skill/SKILL.md` (542 lines) → Target: <200 lines
   - [ ] `story-explanation/SKILL.md` (447 lines) → Target: <200 lines
   - [ ] `fabric/SKILL.md` (386 lines) → Target: <200 lines

#### Deliverables
- Reduced skill count (target: remove 3-5 empty/duplicate skills)
- All SKILL.md files <400 lines
- Updated ROUTING_MAP.md

---

### WP2: Hooks Consolidation (Day 2-3)

**Objective:** Simplify hook system, remove redundant hooks

#### Current Hooks (14 files)

| Hook | Size | Purpose | Status |
|------|------|---------|--------|
| `capture-all-events.ts` | 11.9KB | Event logging | Keep |
| `stop-hook.ts` | 18KB | Tab titles + completion | Review - large |
| `update-documentation.ts` | 14.2KB | Doc updates | Review |
| `subagent-stop-hook.ts` | 9.6KB | Subagent handling | Keep |
| `validate-protected.ts` | 7.4KB | Protected files | Keep |
| `self-test.ts` | 6KB | Testing | Keep |
| `initialize-pai-session.ts` | 5.2KB | Session init | Review - Phase 1 simplified |
| `capture-session-summary.ts` | 4.9KB | Summary capture | Review |
| `context-compression-hook.ts` | 3.4KB | Compression | Review |
| `load-core-context.ts` | 3.3KB | Context loading | Review - may be redundant |
| `update-tab-titles.ts` | 3.1KB | Tab titles | Duplicate of stop-hook? |
| `capture-tool-output.ts` | 2.2KB | Tool output | Review |
| `load-dynamic-requirements.ts` | 2KB | Dynamic loading | Review |

#### Tasks

1. **Identify redundant hooks**
   - [ ] `update-tab-titles.ts` vs `stop-hook.ts` - Consolidate?
   - [ ] `load-core-context.ts` - Still needed after Phase 1?
   - [ ] `load-dynamic-requirements.ts` - Still needed?

2. **Simplify large hooks**
   - [ ] `stop-hook.ts` (18KB) - Extract shared utilities
   - [ ] `update-documentation.ts` (14KB) - Review necessity

3. **Create shared utilities**
   - [ ] Extract common patterns to `hooks/lib/`
   - [ ] Reduce duplication across hooks

#### Deliverables
- Reduced hook count (target: 10 or fewer)
- All hooks <10KB
- Shared utilities in `hooks/lib/`

---

### WP3: Automated Quality Checks (Day 3-4)

**Objective:** Implement automated checks from FINAL_RECOMMENDATIONS.md

#### Tasks

1. **Create reference checker script**
   ```bash
   # scripts/check-references.sh
   - Verify all .md references resolve
   - Run as pre-commit hook
   - Exit non-zero on broken refs
   ```

2. **Create file size monitor**
   ```bash
   # scripts/check-file-sizes.sh
   - Flag files >400 lines
   - Report size distribution
   - Track growth over time
   ```

3. **Create skill structure validator**
   ```bash
   # scripts/validate-skills.sh
   - Check required files exist (SKILL.md)
   - Verify routing entries
   - Flag empty directories
   ```

4. **Integrate with git hooks**
   - [ ] Add to pre-commit
   - [ ] Document in MAINTENANCE_GUIDE.md

#### Deliverables
- `scripts/` directory with 3 checker scripts
- Pre-commit hook integration
- Updated maintenance documentation

---

### WP4: Documentation Cleanup (Day 4-5)

**Objective:** Update documentation to reflect Phase 1+2 changes

#### Tasks

1. **Update ROUTING_MAP.md**
   - [ ] Remove deleted skills
   - [ ] Update hook references
   - [ ] Add new scripts

2. **Update ARCHITECTURE.md**
   - [ ] Reflect simplified structure
   - [ ] Document native Claude Code features used
   - [ ] Update component counts

3. **Update MAINTENANCE_GUIDE.md**
   - [ ] Add automated check procedures
   - [ ] Update file counts
   - [ ] Simplify manual procedures (now automated)

4. **Create Phase 2 summary**
   - [ ] Document all changes
   - [ ] Update metrics
   - [ ] Move to `wip/done/`

#### Deliverables
- Updated documentation (4 files)
- Phase 2 summary document
- Clean `wip/` structure

---

### WP5: Testing & Verification (Day 5-6)

**Objective:** Verify all changes work correctly

#### Tasks

1. **Functional testing**
   - [ ] Skill loading still works
   - [ ] Hooks fire correctly
   - [ ] Agents can be invoked
   - [ ] Research workflow functional

2. **Automated checks pass**
   - [ ] Reference checker: 0 errors
   - [ ] File size checker: 0 oversized
   - [ ] Skill validator: 0 issues

3. **Regression testing**
   - [ ] Compare before/after metrics
   - [ ] Verify no functionality lost
   - [ ] Document any behavior changes

#### Deliverables
- Test results document
- Before/after metrics comparison
- Sign-off checklist

---

### WP6: Buffer & Polish (Day 6-7)

**Objective:** Handle overflow, polish, and finalize

#### Tasks

1. **Address overflow from earlier WPs**
2. **Polish documentation**
3. **Final review and cleanup**
4. **Move completed work to `wip/done/phase2-structural-cleanup/`**

---

## Success Criteria

### Quantitative

| Metric | Current | Target | Stretch |
|--------|---------|--------|---------|
| **Skill directories** | 15 | 12 | 10 |
| **Empty skill dirs** | 6+ | 0 | 0 |
| **Hooks** | 14 | 10 | 8 |
| **Max SKILL.md size** | 542 lines | 400 lines | 300 lines |
| **Automated checks** | 0 | 3 | 5 |

### Qualitative

- [ ] No broken references
- [ ] All skills have clear purpose
- [ ] Hooks are non-redundant
- [ ] Documentation is current
- [ ] Maintenance is automated where possible

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Medium | High | Test after each WP |
| Scope creep | Medium | Medium | Strict WP boundaries |
| Hidden dependencies | Low | High | Grep before deleting |
| Time overrun | Medium | Low | Buffer day included |

---

## Dependencies

### External
- None (self-contained)

### Internal
- Phase 1 complete ✅
- Git for version control
- Bun for running hooks

---

## Daily Schedule

| Day | Focus | WP |
|-----|-------|-----|
| **Day 1** | Skills audit, empty dir cleanup | WP1 |
| **Day 2** | Skills consolidation, hooks audit | WP1, WP2 |
| **Day 3** | Hooks consolidation, scripts start | WP2, WP3 |
| **Day 4** | Scripts complete, docs start | WP3, WP4 |
| **Day 5** | Docs complete, testing start | WP4, WP5 |
| **Day 6** | Testing complete, polish | WP5, WP6 |
| **Day 7** | Buffer, finalize, archive | WP6 |

---

## Notes

- All changes should be atomic and revertible
- Commit after each completed task
- Update this plan as discoveries are made
- Preserve core Qara philosophy throughout
- Focus on simplification, not feature addition

---

## References

- [Phase 1 Changes](./done/phase1-simplification/PHASE1_CHANGES.md)
- [Final Recommendations](./done/refactor/FINAL_RECOMMENDATIONS.md)
- [Maintenance Guide](../docs/MAINTENANCE_GUIDE.md)
- [Routing Map](../.claude/ROUTING_MAP.md)
