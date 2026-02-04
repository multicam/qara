# Delegation: Task Decomposition Patterns

**Extracted from:** delegation-guide.md

This document covers practical patterns for decomposing complex tasks into parallel subtasks for agent delegation.

---

## Task Decomposition

### Pattern 1: File-Based Decomposition

**Scenario**: Update multiple files with same change

**Decomposition**:
```
Task: Add error logging to 5 API endpoints

Decompose into:
1. Agent 1: Add logging to /api/users.ts
2. Agent 2: Add logging to /api/posts.ts
3. Agent 3: Add logging to /api/comments.ts
4. Agent 4: Add logging to /api/auth.ts
5. Agent 5: Add logging to /api/settings.ts
6. Spotcheck Agent: Verify consistent logging pattern across all files
```

### Pattern 2: Feature-Based Decomposition

**Scenario**: Build multi-component feature

**Decomposition**:
```
Task: Add Settings page to application

Decompose into:
1. Agent 1: Create Settings page component
2. Agent 2: Add Settings route configuration
3. Agent 3: Create Settings API endpoints
4. Agent 4: Add Settings navigation menu item
5. Agent 5: Write Settings page tests
6. Integration Agent: Verify all pieces work together
```

### Pattern 3: Research-Based Decomposition

**Scenario**: Compare multiple options

**Decomposition**:
```
Task: Choose best state management library

Decompose into:
1. Agent 1: Research Zustand (features, pros/cons, examples)
2. Agent 2: Research Jotai (features, pros/cons, examples)
3. Agent 3: Research Redux Toolkit (features, pros/cons, examples)
4. Synthesis Agent: Compare findings, create decision matrix
```

### Pattern 4: Batch-Based Decomposition

**Scenario**: Process large list of items

**Decomposition**:
```
Task: Update 20 component files

Decompose into batches:
Batch 1 (files 1-5): 5 agents + spotcheck
Batch 2 (files 6-10): 5 agents + spotcheck
Batch 3 (files 11-15): 5 agents + spotcheck
Batch 4 (files 16-20): 5 agents + spotcheck
Final spotcheck: Verify consistency across all 20 files
```

---

## Scalability Guidelines

### Small Tasks (1-3 files)
- **Pattern**: 1 agent per file + spotcheck
- **Total**: 2-4 agents
- **Example**: Update 3 config files

### Medium Tasks (4-10 files)
- **Pattern**: 1 agent per file + spotcheck
- **Total**: 5-11 agents
- **Example**: Add new feature across multiple components

### Large Tasks (11-50 files)
- **Pattern**: Batch into groups of 5-10, spotcheck per batch + final spotcheck
- **Total**: N+2 to N+5 agents (depending on batching)
- **Example**: Global refactoring across codebase

### Very Large Tasks (50+ files)
- **Pattern**: Hierarchical delegation
  - Group into logical units
  - 1 agent per unit + unit spotcheck
  - 1 final synthesis + overall spotcheck
- **Total**: Varies by complexity
- **Example**: Migrate entire codebase to new framework

---

**Related Documentation:**
- delegation-guide.md - Overview and quick reference
- delegation-spotcheck.md - Spotcheck Pattern (MANDATORY)
- delegation-launch.md - Launch Patterns
- delegation-advanced.md - Background Tasks, Agent Resume, Interactive Queries
