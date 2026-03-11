---
name: example-skill
context: fork
description: |
  Example skill demonstrating the Skills-as-Containers pattern with workflows,
  assets, and natural language routing. This is a teaching tool showing the
  complete PAI architecture.

  USE WHEN user says 'show me an example', 'demonstrate the pattern',
  'how do skills work', 'example skill'
---

# Example Skill

**Purpose:** This skill exists to demonstrate the Skills-as-Containers pattern introduced in PAI. Use it as a template for creating your own skills.

## Architecture Overview

Skills in PAI are organized as self-contained containers with:

### Core Components
- **SKILL.md** - Core skill definition with routing logic (you're reading it now!)
- **workflows/** - Specific task workflows for discrete operations
- **assets/** - Templates, references, and helper files

### Progressive Disclosure
1. **Metadata** (always loaded) - Name, description, triggers
2. **Instructions** (loaded when triggered) - This SKILL.md content
3. **Resources** (loaded as needed) - Individual workflow and asset files

## Included Workflows

This skill includes three example workflows demonstrating different complexity levels:

### 1. simple-task.md
**Purpose:** Basic single-step workflow
**Trigger:** User says "simple example", "basic task"
**Demonstrates:** Minimal workflow structure

### 2. complex-task.md
**Purpose:** Multi-step workflow with dependencies
**Trigger:** User says "complex example", "multi-step task"
**Demonstrates:** Structured workflow with validation

### 3. parallel-task.md
**Purpose:** Agent orchestration for parallel execution
**Trigger:** User says "parallel example", "parallel task"
**Demonstrates:** Multi-agent coordination pattern

## Routing Logic

Natural language automatically routes to the right workflow:

```
User Intent → Skill Activation → Workflow Selection → Execution

Example Flow:
"Show me a simple example"
    ↓ (matches trigger)
example-skill loads
    ↓ (analyzes intent: "simple")
simple-task.md selected
    ↓
Workflow executes
```

## Assets

This skill includes example assets in the `assets/` directory:
- `template.md` - Example template file
- `reference.md` - Example reference material

These demonstrate how to organize supporting resources.

## Usage Examples

### Basic Usage
```
User: "Show me a simple example"
→ Loads example-skill
→ Executes simple-task.md workflow
→ Returns basic workflow demonstration
```

### Complex Usage
```
User: "I need a complex multi-step example"
→ Loads example-skill
→ Executes complex-task.md workflow
→ Returns structured multi-step demonstration
```

### Parallel Usage
```
User: "How do I parallelize work?"
→ Loads example-skill
→ Executes parallel-task.md workflow
→ Returns agent orchestration demonstration
```

## Creating Your Own Skill

See `system-create-skill` skill for the full creation workflow, best practices, and file structure conventions.
