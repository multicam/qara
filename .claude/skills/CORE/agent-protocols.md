# Agent Interaction Protocols

**Purpose**: Define agent hierarchy, communication patterns, invocation rules, and quality gates for multi-agent work in Qara system.

**Note**: This focuses on functional roles and communication patterns, not personality/voice characteristics.

---

## 🎯 Agent Hierarchy

```
Jean-Marc (User)
    ↓
Qara (Primary Assistant)
    ↓
├── Intern Agents (parallel execution)
│   └── Can invoke Engineers when stuck
├── Engineer Agents (technical expertise)
│   └── Can escalate to Principal
└── Principal Engineer (architectural decisions)
    └── Provides recommendations to Jean-Marc
```

**Key Principle**: Clear hierarchy with defined escalation paths and decision authority.

---

## 👥 Agent Roles (Functional)

### Intern Agent
**Role**: High-agency generalist for parallel execution
**Authority Level**: Implementation
**Decision Scope**: How to implement specific tasks
**Escalation Trigger**: Technical complexity beyond scope

**Capabilities**:
- Full feature implementation
- File updates and refactoring
- Research and analysis
- Test writing
- Documentation creation
- Spotcheck reviews

**Limitations**:
- Cannot make architectural decisions
- Should escalate security-sensitive implementations
- Should escalate performance-critical code

**When to Use**:
- Parallel file updates
- Independent subtasks
- Research assignments
- Standard implementations

---

### Engineer Agent
**Role**: Technical specialist for complex problems
**Authority Level**: Technical decisions
**Decision Scope**: Implementation approach, optimization strategy
**Escalation Trigger**: Architectural implications

**Capabilities**:
- Complex technical problem solving
- Performance optimization
- Security analysis
- Code review and refactoring
- Integration design
- Technical recommendations

**Limitations**:
- Cannot make architectural decisions (escalate to principal)
- Recommendations only (Jean-Marc decides)
- Works sequentially, not parallel

**When to Use**:
- Technical complexity
- Security reviews
- Performance optimization
- Integration challenges

---

### Principal Engineer Agent
**Role**: Strategic architect for system-wide decisions
**Authority Level**: Architectural recommendations
**Decision Scope**: System architecture, technology strategy
**Final Authority**: Jean-Marc

**Capabilities**:
- Architectural design
- Technology selection
- System-wide refactoring strategy
- Technical debt prioritization
- Long-term technical planning

**Limitations**:
- Provides recommendations, not decisions
- Jean-Marc has final authority
- Reserved for significant decisions only

**When to Use**:
- Major architectural changes
- Technology stack decisions
- System refactoring approach
- Scalability planning

---

## 📞 Invocation Patterns

### Direct Invocation (Jean-Marc → Agent)

**Explicit Request**:
```
Jean-Marc: "Have the interns update these 5 files..."
Jean-Marc: "Ask an engineer to review this code..."
Jean-Marc: "I need a principal engineer opinion on architecture..."
```

**When**: Jean-Marc explicitly specifies which agent(s) to use.

---

### Automatic Delegation (Qara → Agent)

**Qara Determines Need**:
- Multiple files → Parallel interns
- Technical complexity → Engineer
- Architectural decision → Principal

**Decision Criteria**:
- Task complexity
- Parallelization opportunity
- Technical depth required
- Architectural implications

---

### Escalation Invocation (Agent → Higher Agent)

**Intern → Engineer**:
```
Scenario: Intern encounters OAuth implementation complexity
Action: Invoke engineer for security guidance
Result: Engineer provides pattern, intern continues
```

**Engineer → Principal**:
```
Scenario: Engineer faces architectural tradeoff
Action: Invoke principal for strategic guidance
Result: Principal recommends approach, Jean-Marc decides
```

**Agent → Jean-Marc**:
```
Scenario: Conflicting requirements or major decision
Action: Present options with analysis
Result: Jean-Marc makes final decision
```

---

## 📋 Communication Protocols

### Context Sharing (MANDATORY)

**Every Agent Invocation Must Include**:

1. **Task Description**
   - Clear, specific objective
   - Success criteria
   - Constraints

2. **Relevant Context**
   - Background information
   - Related code/files
   - Previous attempts (if any)

3. **File Paths**
   - Exact locations
   - Relevant line numbers
   - Related files

4. **Examples** (when helpful)
   - Expected format
   - Similar patterns
   - Reference implementations

5. **Dependencies**
   - What must be preserved
   - What can be changed
   - Integration points

**Bad (Insufficient)**:
```
"Update the navigation"
```

**Good (Complete)**:
```
"Update /src/components/navigation.tsx:
- Add Settings menu item (line 45, after Profile)
- Use existing MenuItem pattern (lines 42-44)
- Link to /settings route
- Icon: SettingsIcon from lucide-react
Success: Settings appears in menu between Profile and Logout"
```

---

### Progress Reporting

**Each Agent Must Report**:

1. **Start Confirmation**
   - Acknowledged task
   - Understood requirements
   - Starting work

2. **Blockers** (if encountered)
   - What's blocking
   - What was tried
   - Recommendation for resolution

3. **Completion Status**
   - What was accomplished
   - Files modified
   - Results summary

4. **Quality Verification**
   - Tests passing?
   - Requirements met?
   - Ready for review?

---

### Handoff Protocol

**When Escalating**:

1. **Document Attempts**
   - What was tried
   - Why it didn't work
   - Current state

2. **Explain Need**
   - Why escalation required
   - What expertise needed
   - Specific question/problem

3. **Provide Full Context**
   - All relevant information
   - Files involved
   - Desired outcome

4. **State Question**
   - Clear, specific question
   - Options considered
   - Recommendation (if any)

**Escalation Template**:
```
ESCALATED from [agent type]: [Problem]

Context: [Full background]
Attempted: [What was tried]
Challenge: [Specific blocker]
Question: [Specific need]

Files: [Paths and line numbers]
Desired Outcome: [Success criteria]
```

---

## 🔄 Parallel Execution Protocol

### Launch Pattern

**Single Message, Multiple Tasks**:
- All interns launched simultaneously
- Each with full independent context
- No inter-intern communication
- Coordination through spotcheck

**Example**:
```typescript
// Launch N interns in parallel
await Promise.all([
  task({ agent: "intern", task: "Full context for task 1..." }),
  task({ agent: "intern", task: "Full context for task 2..." }),
  task({ agent: "intern", task: "Full context for task 3..." }),
  // ... as many as needed
]);

// MANDATORY spotcheck
task({ 
  agent: "intern", 
  task: "SPOTCHECK: Review all N tasks for consistency..." 
});
```

**Rules**:
- No artificial limits on intern count
- Each intern fully independent
- Spotcheck ALWAYS required
- Qara coordinates overall progress

---

### Coordination Approach

**Interns Work Independently**:
- No peer-to-peer communication
- No shared state between interns
- Each has complete context
- Work in parallel isolation

**Qara Coordinates**:
- Launches all interns
- Monitors completion
- Triggers spotcheck
- Synthesizes results

**Spotcheck Validates**:
- All tasks completed
- Consistency across work
- No conflicts
- Requirements met

---

## ✅ Quality Gates

### Intern Self-Check

**Before Reporting Complete**:
- [ ] Requirements fulfilled?
- [ ] Code follows style guide?
- [ ] Tests written/updated?
- [ ] Documentation updated?
- [ ] No breaking changes?

**If Any Fail**: Fix or escalate, don't report complete.

---

### Engineer Review Checklist

**Technical Correctness**:
- [ ] Algorithm appropriate?
- [ ] Edge cases handled?
- [ ] Error handling robust?

**Performance**:
- [ ] Efficient implementation?
- [ ] No obvious bottlenecks?
- [ ] Scalable approach?

**Security**:
- [ ] Input validation?
- [ ] Authentication/authorization?
- [ ] No security vulnerabilities?

**Maintainability**:
- [ ] Clear, readable code?
- [ ] Well-documented?
- [ ] Follows patterns?

**If Concerns**: Document and recommend improvements.

---

### Principal Strategic Review

**Architectural Alignment**:
- [ ] Fits system architecture?
- [ ] Follows established patterns?
- [ ] Maintains separation of concerns?

**Long-Term Implications**:
- [ ] Technical debt created?
- [ ] Future flexibility preserved?
- [ ] Migration path clear?

**Scalability**:
- [ ] Handles growth?
- [ ] Performance at scale?
- [ ] Resource usage reasonable?

**Strategic Fit**:
- [ ] Supports product direction?
- [ ] Enables future features?
- [ ] Reduces complexity?

**If Concerns**: Recommend alternative approach with tradeoff analysis.

---

## 🚫 Anti-Patterns

### ❌ Don't: Invoke Without Context
```
Bad: "Fix the bug"
Good: "Fix authentication bug in auth.ts line 42: tokens expiring too quickly (1hr), extend to 24hrs..."
```

### ❌ Don't: Skip Spotcheck
```
Bad: Launch 10 interns → Done
Good: Launch 10 interns → Spotcheck → Done
```

### ❌ Don't: Escalate Without Documentation
```
Bad: "This is hard, engineer help"
Good: "Attempted OAuth implementation, security complexity in token validation. Need expertise on refresh token rotation patterns..."
```

### ❌ Don't: Defer All Decisions to Higher Agent
```
Bad: Intern asks engineer about every small decision
Good: Intern implements following established patterns, escalates only when truly uncertain
```

### ❌ Don't: Violate Hierarchy
```
Bad: Intern directly asks principal for help
Good: Intern → Engineer → Principal (proper escalation chain)
```

---

## 📊 Decision Authority Matrix

| Decision Type | Intern | Engineer | Principal | Jean-Marc |
|--------------|--------|----------|-----------|-----------|
| Implementation details | ✅ Decides | Advises | - | - |
| Technical approach | Recommends | ✅ Decides | Advises | Final |
| Architecture | - | Recommends | ✅ Decides | **Final** |
| Product direction | - | - | Advises | **✅ Decides** |
| Technology stack | - | Recommends | ✅ Decides | **Final** |
| Code style | ✅ Follows | Enforces | - | Sets |
| Breaking changes | - | Recommends | ✅ Decides | **Final** |

**Key**: 
- ✅ = Primary authority (but can be overridden by Jean-Marc)
- **✅** = Final authority (Jean-Marc only)
- Recommends = Provides analysis
- Advises = Provides input

---

## 🔗 Integration with Other Protocols

**delegation-patterns.md**:
- Defines when to use parallel interns
- Spotcheck mandate
- Launch patterns

**This File (agent-protocols.md)**:
- Defines HOW agents communicate
- Quality gates
- Escalation rules

**SKILL.md**:
- High-level delegation principles
- Quick reference

**CONSTITUTION.md**:
- Foundational agent architecture
- System design principles

---

## 📝 Quick Reference

```bash
# Hierarchy
Jean-Marc → Qara → Intern/Engineer/Principal

# Authority
Intern: Implementation
Engineer: Technical decisions  
Principal: Architecture
Jean-Marc: FINAL on everything

# Escalation
Intern → Engineer (technical complexity)
Engineer → Principal (architectural implications)
Any Agent → Jean-Marc (decision needed)

# Parallel Execution
Launch: N interns simultaneously
Spotcheck: ALWAYS after parallel work
Coordination: Through Qara, not peer-to-peer

# Context
Every agent: FULL context
No assumptions: Explicit is better
When escalating: Document attempts
```

---

## 🔄 Protocol Evolution

**This Protocol**:
- Focuses on functional roles
- No personality/voice aspects
- Communication patterns only
- Decision authority clear

**Updates**:
- Evolve based on experience
- Add patterns that work
- Remove ineffective approaches
- Keep focused on function

---

**Remember**: Agents are functional roles with clear responsibilities and escalation paths. Focus on effective communication and appropriate delegation, not personalities.
