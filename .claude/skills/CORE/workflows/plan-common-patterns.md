# Common Implementation Patterns

## Database Changes

When planning database-related changes, follow this sequence:

1. **Schema/Migration First**
   - Design database schema changes
   - Write migration scripts
   - Test migration rollback

2. **Store Methods**
   - Add data access layer methods
   - Include error handling
   - Write unit tests for store

3. **Business Logic**
   - Update domain logic
   - Implement validation rules
   - Handle edge cases

4. **API Layer**
   - Expose via API endpoints
   - Add request/response validation
   - Document API changes

5. **Client Updates**
   - Update client libraries
   - Add client-side validation
   - Update UI components

## New Features

When planning new features, follow this approach:

1. **Research Existing Patterns**
   - Find similar features in codebase
   - Identify conventions to follow
   - Note integration points

2. **Data Model First**
   - Design data structures
   - Plan storage approach
   - Consider relationships

3. **Backend Logic**
   - Implement core functionality
   - Add business rules
   - Handle errors gracefully

4. **API Endpoints**
   - Design REST/GraphQL endpoints
   - Add authentication/authorization
   - Write API tests

5. **UI Implementation Last**
   - Build components
   - Add user interactions
   - Implement responsive design

## Refactoring

When planning refactoring work:

1. **Document Current Behavior**
   - Record existing functionality
   - List all edge cases
   - Note dependencies

2. **Plan Incremental Changes**
   - Break into small steps
   - Each step is independently testable
   - Preserve functionality at each step

3. **Maintain Backwards Compatibility**
   - Keep old interfaces during transition
   - Add deprecation warnings
   - Plan removal timeline

4. **Include Migration Strategy**
   - How to handle existing data
   - How to handle existing clients
   - Rollback plan if needed

## Sub-task Spawning Best Practices

When spawning research sub-tasks:

1. **Spawn multiple tasks in parallel** for efficiency

2. **Each task should be focused** on a specific area

3. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
   - Expected output format

4. **Be EXTREMELY specific about directories**:
   - If the ticket mentions "WUI", specify `humanlayer-wui/` directory
   - If it mentions "daemon", specify `hld/` directory
   - Never use generic terms like "UI" when you mean "WUI"
   - Include the full path context in your prompts

5. **Specify read-only tools** to use

6. **Request specific file:line references** in responses

7. **Wait for all tasks to complete** before synthesizing

8. **Verify sub-task results**:
   - If a sub-task returns unexpected results, spawn follow-up tasks
   - Cross-check findings against the actual codebase
   - Don't accept results that seem incorrect

## Intelligent Persistence (Error Handling During Planning)

Research agents can fail or return thin results. How you respond matters:

**On empty results:**
- Reformulate the search — different keywords, broader directory scope
- Try a different agent type (e.g., codebase-analyzer instead of thoughts-analyzer)
- Don't conclude "nothing exists" from a single failed search

**On ambiguous or contradictory results:**
- Spawn a second agent to cross-verify the specific claim
- Read the conflicting files yourself in the main context
- Flag the contradiction explicitly — don't silently pick one version

**On agent timeout or error:**
- Retry once with a simpler, more focused prompt
- If it fails again, do the research yourself with direct tool calls
- Don't block the entire plan on one failed sub-task

**On surprising findings (code that contradicts assumptions):**
- This is the most valuable signal — don't dismiss it
- Re-read the relevant code yourself to confirm
- Revise your hypotheses before continuing
- A plan built on wrong assumptions is worse than a late plan

**What NOT to do:**
- Don't retry the exact same prompt on a non-transient error
- Don't ignore thin results and plan around the gap
- Don't spawn 5+ agents to research the same question from different angles — 2 is enough for cross-verification
