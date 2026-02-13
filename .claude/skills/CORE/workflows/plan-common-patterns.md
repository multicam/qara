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

**Example of spawning multiple tasks:**
```python
# Spawn these tasks concurrently:
tasks = [
    Task("Research database schema", db_research_prompt),
    Task("Find API patterns", api_research_prompt),
    Task("Investigate UI components", ui_research_prompt),
    Task("Check test patterns", test_research_prompt)
]
```
