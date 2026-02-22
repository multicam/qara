# Skills System Architecture

## Overview

Skills are Markdown files (`SKILL.md`) with YAML frontmatter that provide specialized knowledge and workflows to the agent. They are discovered from up to 6 source tiers, filtered by runtime requirements (OS, binaries, env vars, config), and injected into the system prompt as an `<available_skills>` XML block. The agent reads only skill names and descriptions at startup, then reads the full `SKILL.md` body on demand via the `read` tool.

---

## Bundled Skills (52 total)

```
skills/
├── 1password/          # 1Password CLI integration
├── apple-notes/        # Apple Notes via AppleScript
├── apple-reminders/    # Apple Reminders integration
├── bear-notes/         # Bear markdown notes app
├── blogwatcher/        # Blog/RSS monitoring
├── blucli/             # Bluetooth CLI tool
├── bluebubbles/        # BlueBubbles iMessage server
├── camsnap/            # Camera snapshot capture
├── canvas/             # Canvas drawing/visualization
├── clawhub/            # OpenClaw hub integration
├── coding-agent/       # Delegate tasks to Codex/Claude/Pi sub-agents
├── discord/            # Discord messaging
├── eightctl/           # Eight Sleep bed controller
├── gemini/             # Google Gemini API
├── gh-issues/          # GitHub issue auto-fix with sub-agents
├── gifgrep/            # GIF search
├── github/             # GitHub via gh CLI
├── gog/                # GOG game launcher
├── goplaces/           # Place/location lookup
├── healthcheck/        # System health monitoring
├── himalaya/           # Email via Himalaya CLI
├── imsg/               # iMessage sending
├── mcporter/           # MCP server integration
├── model-usage/        # AI model usage tracking
├── nano-banana-pro/    # Custom hardware device
├── nano-pdf/           # PDF operations
├── notion/             # Notion workspace
├── obsidian/           # Obsidian vault operations
├── openai-image-gen/   # OpenAI image generation
├── openai-whisper/     # Local Whisper transcription
├── openai-whisper-api/ # OpenAI Whisper API transcription
├── openhue/            # Philips Hue lights
├── oracle/             # Oracle DB operations
├── ordercli/           # Order management CLI
├── peekaboo/           # macOS screen capture
├── sag/                # ElevenLabs TTS (sag CLI)
├── session-logs/       # Session logging
├── sherpa-onnx-tts/    # Local ONNX-based TTS
├── skill-creator/      # Meta-skill for creating other skills
├── slack/              # Slack messaging via built-in tool
├── songsee/            # Song identification
├── sonoscli/           # Sonos speaker control
├── spotify-player/     # Spotify playback via spogo/spotify_player
├── summarize/          # Text summarization
├── things-mac/         # Things 3 task manager
├── tmux/               # Tmux session management
├── trello/             # Trello board integration
├── video-frames/       # Video frame extraction
├── voice-call/         # Voice call handling
├── wacli/              # WhatsApp CLI
├── weather/            # Weather via wttr.in
└── xurl/               # URL expansion/inspection
```

---

## Skill Format

### Directory Structure

```
skill-name/
├── SKILL.md          (required)   — main skill document
├── scripts/          (optional)   — executable scripts
├── references/       (optional)   — docs loaded on demand
└── assets/           (optional)   — files used in output
```

### SKILL.md with YAML Frontmatter

```yaml
---
name: spotify-player                    # Required: unique identifier
description: "Control Spotify playback" # Required: used for model triggering
homepage: https://...                   # Optional: URL
user-invocable: true                    # Optional: show as slash command (default: true)
disable-model-invocation: false         # Optional: hide from model prompt (default: false)
command-dispatch: tool                  # Optional: deterministic dispatch to tool
command-tool: tool_name                 # Optional: tool name for dispatch
command-arg-mode: raw                   # Optional: how args passed to dispatch
metadata:
  openclaw:
    emoji: "🎵"
    always: false                       # Include regardless of requirement checks
    skillKey: "custom-key"              # Override lookup key in config
    primaryEnv: "SPOTIFY_API_KEY"       # Primary API key env var
    homepage: "https://..."
    os: ["darwin", "linux"]             # OS restriction
    requires:
      bins: ["gh"]                      # All must exist on PATH
      anyBins: ["spogo", "spotify_player"]  # At least one must exist
      env: ["OPENAI_API_KEY"]           # Env vars that must be set
      config: ["channels.slack"]        # Config paths that must be truthy
    install:
      - id: brew
        kind: brew                      # brew | node | go | uv | download
        formula: gh
        bins: ["gh"]
        label: "Install GitHub CLI (brew)"
---

# Skill body (Markdown)

Instructions the agent reads on demand...
```

### Progressive Disclosure Design

```
Level 1 — name + description frontmatter
  Always in agent's context window (~100 words per skill)
  Agent scans to decide which skill to invoke

Level 2 — SKILL.md body
  Loaded on demand by agent via "read" tool after triggering

Level 3 — scripts/, references/, assets/
  Loaded by agent as needed within the task
```

---

## Six Source Tiers

Skills are loaded from 6 sources, merged by name. Higher precedence overwrites lower:

```
Precedence (lowest -> highest):

1. extra         config.skills.load.extraDirs + plugin skill dirs     (lowest)
2. bundled       <packageRoot>/skills/ (this repo's skills/ directory)
3. managed       CONFIG_DIR/skills/ (~/.openclaw/skills/)
4. personal      ~/.agents/skills/
5. project       <workspaceDir>/.agents/skills/
6. workspace     <workspaceDir>/skills/                               (highest)
```

### Bundled Dir Resolution (`bundled-dir.ts:36-90`)

1. `OPENCLAW_BUNDLED_SKILLS_DIR` env override
2. Sibling to executable (for `bun --compile` release)
3. Walk up 6 levels from `import.meta.url` to find `skills/` dir

### Plugin Skills (`plugin-skills.ts:14-74`)

Plugin manifests may declare `skills` paths, resolved relative to the plugin's `rootDir`. Memory plugins go through slot arbitration (only one active).

### Nested Root Detection (`workspace.ts:178-206`)

If a source directory contains a `skills/` subfolder whose children have `SKILL.md` files, the loader transparently drops one level to use `dir/skills/`.

---

## Skill Loading Pipeline

```
loadSkillEntries()                                  <- workspace.ts:221-406
|
+- For each of 6 source tiers:
|   loadSkillsFromDir(dir, source)                  <- from pi-coding-agent SDK
|   -> returns Skill[] with { name, description, filePath, baseDir, source }
|
+- Merge into Map<string, Skill> (higher precedence overwrites)
|
+- For each merged skill:
|   +- Parse frontmatter from SKILL.md
|   +- resolveOpenClawMetadata(frontmatter)         <- frontmatter.ts:81-101
|   +- resolveSkillInvocationPolicy(frontmatter)
|
+- Returns SkillEntry[]
```

### Safety Limits (`workspace.ts:95-99`)

```
DEFAULT_MAX_CANDIDATES_PER_ROOT    = 300
DEFAULT_MAX_SKILLS_LOADED_PER_SOURCE = 200
DEFAULT_MAX_SKILLS_IN_PROMPT       = 150
DEFAULT_MAX_SKILLS_PROMPT_CHARS    = 30,000
DEFAULT_MAX_SKILL_FILE_BYTES       = 256,000
```

All overridable from `config.skills.limits`.

---

## Eligibility Filtering

`shouldIncludeSkill()` (`config.ts:70-112`) — the core gate. Returns `false` when:

```
1. skillConfig.enabled === false           explicitly disabled
2. Bundled + not in allowBundled list      (if allowlist is set)
3. Declares os restriction, no match       neither local nor remote platforms
4. metadata.always !== true AND evaluateRuntimeRequires fails:
   |
   +- requires.bins: ALL listed binaries must be on PATH
   +- requires.anyBins: AT LEAST ONE must be on PATH
   +- requires.env: ALL listed env vars must be set
   |   (checked via process.env, skillConfig.env, or skillConfig.apiKey)
   +- requires.config: ALL listed config paths must be truthy
```

Skills that fail these checks are silently dropped before the prompt is built.

---

## Prompt Injection

### System Prompt Section (`system-prompt.ts:19-41`)

```
## Skills (mandatory)
Before replying: scan <available_skills> <description> entries.
- If exactly one skill clearly applies: read its SKILL.md at <location> with `read`, then follow it.
- If multiple could apply: choose the most specific one, then read/follow it.
- If none clearly apply: do not read any SKILL.md.
Constraints: never read more than one skill up front; only read after selecting.

<available_skills>
  <skill>
    <name>github</name>
    <description>GitHub via gh CLI</description>
    <location>~/path/to/github/SKILL.md</location>
  </skill>
  <skill>
    <name>weather</name>
    <description>Weather via wttr.in</description>
    <location>~/path/to/weather/SKILL.md</location>
  </skill>
  ...
</available_skills>
```

This section is **omitted** for subagent mode (`promptMode === "minimal"` or `"none"`).

### Path Compaction (`workspace.ts:45-53`)

Home directory prefixes replaced with `~` to save ~5-6 tokens per path.

### Prompt Size Guard (`workspace.ts:408-444`)

Binary search finds the largest prefix of skills fitting within `maxSkillsPromptChars` (30K default). If truncated:
```
Warning: Skills truncated: included X of Y. Run `openclaw skills check` to audit.
```

---

## Skill Configuration

### Config Schema (`types.skills.ts`)

```yaml
skills:
  allowBundled: ["github", "weather"]     # Allowlist of bundled skills by name
  load:
    extraDirs: ["/path/to/more/skills"]   # Additional skill directories
    watch: true                           # Watch for SKILL.md changes
    debounceMs: 250                       # File watcher debounce
  install:
    preferBrew: true                      # Prefer Homebrew for installs
    nodeManager: "bun"                    # npm | pnpm | yarn | bun
  limits:
    maxCandidatesPerRoot: 300
    maxSkillsLoadedPerSource: 200
    maxSkillsInPrompt: 150
    maxSkillsPromptChars: 30000
    maxSkillFileBytes: 256000
  entries:
    github:
      enabled: true
      apiKey: "ghp_..."                   # Injected as primaryEnv value
      env:
        EXTRA_VAR: "value"                # Additional env vars
      config: {}                          # Extra skill config
    weather:
      enabled: false                      # Disable this skill
```

---

## Skill Installation

### Install Kinds

```
"brew"     -> brew install <formula>
"node"     -> npm|pnpm|yarn|bun install -g --ignore-scripts <package>
"go"       -> go install <module>
"uv"       -> uv tool install <package>
"download" -> handled by installDownloadSpec (skills-install-download.ts)
```

Node package manager selected from `config.skills.install.nodeManager`.

### Security Scan

Before installing, `scanDirectoryWithSummary` is called on the skill directory. Critical findings block installation; warn-level findings produce warnings but proceed.

---

## Env Override System (`env-overrides.ts`)

When skills require API keys via `primaryEnv` or `requires.env`:

```
Before agent run:
  Read skillConfig.apiKey / skillConfig.env from config
  Inject into process.env (with security sanitization)
    - Blocks OPENSSL_CONF and dangerous host env var names
    - Blocks null bytes in values

After agent run:
  Revert all env changes via createEnvReverter()
    For each update:
      prev === undefined -> delete process.env[key]
      else -> process.env[key] = prev
```

Ensures env changes don't leak between requests.

---

## Skill Entries and Snapshots

### SkillEntry Type (`types.ts:66-71`)

```typescript
type SkillEntry = {
  skill: Skill;                         // Raw pi-coding-agent Skill object
  frontmatter: ParsedSkillFrontmatter;  // All frontmatter key-value pairs
  metadata?: OpenClawSkillMetadata;     // Parsed openclaw-specific metadata
  invocation?: SkillInvocationPolicy;   // userInvocable, disableModelInvocation
};
```

### SkillSnapshot (`types.ts:82-89`)

```typescript
type SkillSnapshot = {
  prompt: string;                        // Formatted <available_skills> XML
  skills: Array<{                        // Lightweight summary for env overrides
    name: string;
    primaryEnv?: string;
    requiredEnv?: string[];
  }>;
  skillFilter?: string[];               // Active per-agent name filter
  resolvedSkills?: Skill[];             // Full Skill objects
  version?: number;                     // Timestamp for cache invalidation
};
```

Built by `buildWorkspaceSkillSnapshot()` (`workspace.ts:446-499`). Avoids re-loading on every request.

### File Watching (`refresh.ts:132-207`)

Uses `chokidar` targeting `*/SKILL.md` and `SKILL.md` patterns. On change (250ms debounce), bumps a workspace-level version counter and notifies registered listeners.

---

## Invocation Policies

### Two Frontmatter Controls

| Field | Default | Effect |
|---|---|---|
| `user-invocable` | `true` | Skill appears as `/command` slash command in channels |
| `disable-model-invocation` | `false` | Skill excluded from `<available_skills>` (model never sees it) |

### Command Dispatch (`workspace.ts:724-770`)

When `command-dispatch: tool` is set:

```
/skill-name args...
  -> bypasses model entirely
  -> dispatches directly to named tool
  -> argMode: "raw" passes args as-is
```

---

## Example Skills in Practice

### `coding-agent` — Sub-Agent Orchestration

```yaml
requires:
  anyBins: ["claude", "codex", "opencode", "pi"]
```

Delegates coding tasks to sub-agent CLIs. Demonstrates bash tool's `pty:true` mode for interactive terminal agents, `background` for monitoring, `workdir` for repo context.

### `github` — Pure CLI Documentation

```yaml
requires:
  bins: ["gh"]
install:
  - { kind: brew, formula: gh }
  - { kind: apt, package: gh }
```

Teaches `gh` command patterns with JSON output flags. Pure documentation — no custom tooling.

### `spotify-player` — Multi-Binary Support

```yaml
requires:
  anyBins: ["spogo", "spotify_player"]
install:
  - { kind: brew, formula: spogo }          # preferred
  - { kind: brew, formula: spotify_player } # fallback
```

Minimal body. Uses `anyBins` to support either of two competing CLIs.

### `slack` — Built-in Tool Integration

```yaml
requires:
  config: ["channels.slack"]
```

Describes JSON payloads for the built-in `slack` agent tool rather than CLI commands. Only active when Slack is configured.

### `gh-issues` — Orchestrator with Sub-Agents

```yaml
user-invocable: true
primaryEnv: "GH_TOKEN"
```

Appears as `/gh-issues` slash command. Spawns sub-agents to fix GitHub issues and open PRs in parallel phases. Demonstrates complex multi-phase orchestration.

---

## Key Architectural Patterns

**Progressive disclosure** — The agent sees only names + descriptions (~100 words per skill) in its context window. Full SKILL.md bodies are read on demand, keeping the system prompt manageable even with 50+ skills.

**Six-tier precedence** — Skills from workspace override project, which override personal, managed, bundled, and extra. This lets users override any bundled skill by placing a same-named skill in their workspace.

**Requirements-based filtering** — Skills self-declare their dependencies (OS, binaries, env vars, config paths). Skills that can't run in the current environment are silently excluded, keeping the prompt clean.

**Env sandboxing** — API keys are injected before the agent run and reverted after, preventing cross-request leakage. Dangerous env var names are blocked by the security sanitizer.

**Snapshot caching with file watching** — Skills are loaded once into a snapshot, then cache-invalidated by chokidar watching `SKILL.md` files. The gateway debounces reloads with a 30-second window.
