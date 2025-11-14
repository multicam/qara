# PAI System Architecture

> [!IMPORTANT]
> **v0.6.0 Directory Structure Update**
> As of v0.6.0, all PAI infrastructure lives in the `.claude/` directory:
> - **Repository:** `/PAI/.claude/` contains all infrastructure
> - **Your System:** `~/.claude/` is where you install PAI
> - **Migration:** Copy `.claude/` from repo to `~/.claude/` on your system
>
> This structure ensures the repository properly mirrors how PAI works in production.

## Overview

PAI (Personal AI Infrastructure) is a modular, event-driven system that enhances AI assistants with dynamic context management, automation, and extensibility. The architecture follows a layered approach with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                      │
│              (Claude Desktop, Terminal, API)                │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                       Hook System Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Pre-prompt   │  │ Tool hooks   │  │ Post-exec    │       │
│  │ Hooks        │  │              │  │ Hooks        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Skills System                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Intent       │  │ Skill        │  │ Progressive  │       │
│  │ Matching     │  │ Activation   │  │ Loading      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Agent System                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Researcher   │  │ Engineer     │  │ Pentester    │       │
│  │              │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ MCP Tools    │  │ Commands     │  │ Hooks        │       │
│  │              │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Hook System Layer

The hook system provides event-driven automation throughout the AI interaction lifecycle.

**Key Features:**

- **Pre-prompt hooks**: Execute before user prompts are processed
- **Tool hooks**: Intercept and modify tool calls
- **Post-execution hooks**: Run after commands complete

**Location:** `~/.claude/hooks/`

### 2. Skills System

The Skills System provides modular, self-contained capability packages that extend AI functionality with specialized knowledge and workflows.

**Key Features:**

- **Intent Matching**: Activates skills based on user request understanding
- **Progressive Disclosure**: SKILL.md → CLAUDE.md → Resources
- **Modular Design**: Self-contained with templates and components
- **Global Inheritance**: All skills automatically access global context

**Location:** `~/.claude/skills/`

### 3. Agent System

Specialized AI agents for different domains and tasks.

**Available Agents:**

- **General-purpose**: Default agent for most tasks
- **Researcher**: Web research and information gathering
- **Engineer**: Software development and debugging
- **Designer**: UI/UX and visual design
- **Pentester**: Security testing and vulnerability assessment
- **Architect**: System design and technical specifications

### 4. Service Layer

Supporting services that provide additional functionality.

**Services:**

- **MCP Tools**: Model Context Protocol integrations
- **Command System**: Custom command execution
- **Hook System**: Event-driven automation

## Data Flow

### 1. User Input Flow

```
User Input → Hook System → UFC Context → Agent Selection → Processing
```

1. User submits a prompt
2. Pre-prompt hooks execute
3. UFC system analyzes intent
4. Relevant context is loaded
5. Appropriate agent is selected
6. Prompt is processed with context

### 2. Tool Execution Flow

```
Tool Request → Hook Validation → Execution → Post-hook → Response
```

1. AI requests tool execution
2. Tool hooks validate/modify request
3. Tool executes
4. Post-execution hooks run
5. Response returned to AI

### 3. Context Loading Flow

```
Intent Analysis → Pattern Matching → Context Selection → Dynamic Loading
```

1. System analyzes user intent
2. Matches against context patterns
3. Selects appropriate contexts
4. Loads context files dynamically

## Directory Structure

```
${PAI_DIR}/
├── skills/              # Modular capability packages
│   ├── CORE/           # Core PAI identity and preferences
│   ├── prompting/      # Prompt engineering guide
│   ├── create-skill/   # Skill creation framework
│   ├── research/       # Multi-source research orchestration
│   ├── fabric/         # 242+ AI patterns
│   └── [custom]/       # Your custom skills
├── context/             # UFC context files
│   ├── CLAUDE.md       # Global context
│   ├── architecture/   # Architecture docs
│   ├── projects/       # Project-specific contexts
│   └── [others]/       # Various context categories
├── hooks/               # Event hooks
│   ├── load-core-context.ts
│   ├── initialize-pai-session.ts
│   ├── capture-*.ts
│   └── [others].ts
├── commands/            # Custom slash commands
│   └── *.md            # Command definitions
├── agents/              # Specialized AI agents
│   ├── engineer.md
│   ├── researcher.md
│   ├── architect.md
│   ├── designer.md
│   └── [others].md
├── documentation/       # System documentation
├── PAI.md               # Global PAI context
├── settings.json        # Claude Code settings
└── statusline-command.sh

${HOME}/
├── Documentation/       # User documentation
├── Projects/           # User projects
└── Library/           # System libraries
    └── Logs/          # System logs
```

## Communication Protocols

### Hook Protocol

Hooks communicate through:

1. **Environment Variables**: Pass configuration
2. **Standard I/O**: Input/output piping
3. **Exit Codes**: Success/failure signaling
4. **File System**: Shared context files

## Security Architecture

### Input Validation

- All user inputs sanitized
- Shell metacharacters blocked
- Length limits enforced

### Process Isolation

- Spawn with argument arrays
- No shell interpretation
- Restricted permissions

### Network Security

- CORS restricted to localhost
- Rate limiting per IP
- Authentication tokens (when configured)

### Data Protection

- No hardcoded credentials
- Environment variable configuration
- Secure file permissions

## Extensibility Points

### 1. Adding Skills

Create new skills in:

- `${PAI_DIR}/skills/[skill-name]/` - Skill directory
- `SKILL.md` - Quick reference (required)
- `CLAUDE.md` - Comprehensive guide (optional)
- Add to global context for discovery

### 2. Adding Hooks

Create executable scripts in:

- `${PAI_DIR}/hooks/` - Event hooks

### 3. Adding Agents

Define new agents in:

- `${PAI_DIR}/agents/[name].md` - Agent configuration

### 4. Adding Commands

Create slash commands in:

- `${PAI_DIR}/commands/` - Custom slash commands

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Context loads only when needed
2. **Caching**: Frequently used contexts cached
3. **Parallel Processing**: Independent operations run concurrently
4. **Rate Limiting**: Prevents resource exhaustion

### Resource Management

- Memory: Context files loaded on-demand
- CPU: Agent selection optimized for task
- Network: Batch operations when possible
- Disk: Log rotation and cleanup

## Error Handling

### Error Propagation

```
Service Error → Hook System → User Notification → Fallback Action
```

### Fallback Strategies

1. **Context Loading**: Uses default context
2. **Agent Selection**: Falls back to general-purpose
3. **Hook Execution**: Continues on non-critical failures
4. **Skill Loading**: Falls back to manual activation

## Future Architecture Considerations

### Planned Enhancements

1. **Distributed Agents**: Multi-machine agent deployment
2. **Plugin System**: Third-party extensions
3. **Cloud Sync**: Context synchronization
4. **API Gateway**: Unified API interface

### Scalability Path

1. **Horizontal Scaling**: Multiple agent instances
2. **Load Balancing**: Request distribution
3. **Caching Layer**: Redis/Memcached integration
4. **Queue System**: Async task processing

