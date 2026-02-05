/**
 * Enhanced Console Logger for Agent Lens
 *
 * Tron-meets-Excalidraw aesthetic - dark backgrounds, neon accents
 * Uses picocolors for minimal, fast terminal styling
 */

import * as pc from 'picocolors';

// Event type color mapping (Tron-inspired neon palette)
const EVENT_COLORS: Record<string, (s: string) => string> = {
  // Session events - cyan (Tron blue)
  'SessionStart': pc.cyan,
  'SessionEnd': pc.cyan,

  // Tool events - magenta (neon pink)
  'PreToolUse': pc.magenta,
  'PostToolUse': pc.magenta,

  // User events - green (matrix green)
  'UserPromptSubmit': pc.green,

  // Agent events - yellow (amber/orange)
  'Stop': pc.yellow,
  'SubagentStop': pc.yellow,
  'Notification': pc.yellow,

  // System events - dim gray
  'PreCompact': pc.dim,
};

// Agent type icons
const AGENT_ICONS: Record<string, string> = {
  'Explore': '🔍',
  'engineer': '🔧',
  'designer': '🎨',
  'researcher': '📚',
  'codebase-analyzer': '📊',
  'codebase-locator': '📍',
  'web-search-researcher': '🌐',
  'claude-researcher': '🔬',
  'gemini-researcher': '♊',
  'perplexity-researcher': '🧠',
  'general-purpose': '⚙️',
  'zai-coder': '🤖',
  'zai-researcher': '🔎',
  'thoughts-analyzer': '💭',
};

// Tool icons for compact display
const TOOL_ICONS: Record<string, string> = {
  'Read': '📖',
  'Edit': '✏️',
  'Grep': '🔍',
  'Glob': '📁',
  'Task': '🚀',
  'Bash': '⌨️',
  'WebSearch': '🌐',
  'Write': '📝',
  'AskUserQuestion': '❓',
  'Skill': '⚡',
  'EnterPlanMode': '📋',
  'ExitPlanMode': '✅',
};

// Log level icons
const LEVEL_ICONS = {
  info: '●',
  success: '✓',
  warn: '⚠',
  error: '✖',
  debug: '○',
};

// Format timestamp as HH:MM:SS
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

// Format memory size
function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)}KB`;
  return `${mb.toFixed(1)}MB`;
}

// Real-time status line tracker
class StatusLine {
  private events: number = 0;
  private sessions = new Set<string>();
  private agents = new Map<string, number>(); // agent type -> count
  private startTime: number = Date.now();
  private eventTimes: number[] = [];
  private enabled: boolean = true;

  trackEvent(event: any): void {
    this.events++;
    this.eventTimes.push(Date.now());

    // Keep only last 60 seconds for EPS calculation
    const cutoff = Date.now() - 60000;
    this.eventTimes = this.eventTimes.filter(t => t > cutoff);

    if (event.session_id) {
      this.sessions.add(event.session_id);
    }

    const agentType = event.payload?.agent_type || event.payload?.subagent_type;
    if (agentType) {
      this.agents.set(agentType, (this.agents.get(agentType) || 0) + 1);
    }
  }

  getEventsPerSecond(): number {
    const now = Date.now();
    const cutoff = now - 5000; // Last 5 seconds
    const recent = this.eventTimes.filter(t => t > cutoff).length;
    return parseFloat((recent / 5).toFixed(1));
  }

  getMemoryUsage(): string {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return formatMemory(process.memoryUsage().heapUsed);
    }
    return 'N/A';
  }

  getActiveAgentCount(): number {
    // Count agents with activity
    let active = 0;
    for (const [agent, count] of this.agents) {
      if (count > 0) active++;
    }
    return active;
  }

  render(): string {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const eps = this.getEventsPerSecond();
    const mem = this.getMemoryUsage();
    const activeAgents = this.getActiveAgentCount();

    const parts = [
      pc.dim('['),
      pc.cyan(`ev:${this.events}`),
      pc.dim(' '),
      pc.green(`ses:${this.sessions.size}`),
      pc.dim(' '),
      pc.yellow(`ag:${activeAgents}`),
      pc.dim(' '),
      pc.magenta(`mem:${mem}`),
      pc.dim(' '),
      pc.cyan(`eps:${eps}`),
      pc.dim(' '),
      pc.dim(`up:${uptime}s`),
      pc.dim(']'),
    ];

    return '\r' + parts.join('') + ' '.repeat(20); // Padding to clear previous line
  }

  update(): void {
    if (this.enabled) {
      process.stdout.write(this.render());
    }
  }

  disable(): void {
    this.enabled = false;
    process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear the line
  }

  enable(): void {
    this.enabled = true;
  }

  getStats() {
    return {
      events: this.events,
      sessions: this.sessions.size,
      activeAgents: this.getActiveAgentCount(),
      memory: this.getMemoryUsage(),
      eps: this.getEventsPerSecond(),
    };
  }
}

// Global status line instance
export const statusLine = new StatusLine();

// Start status line update interval (every 500ms)
if (typeof setInterval !== 'undefined') {
  setInterval(() => statusLine.update(), 500);
}

// Core logger functions
export const log = {
  // Standard info log
  info: (message: string, context?: string) => {
    const prefix = context ? pc.dim(`[${context}]`) : '';
    console.log(`${pc.dim(LEVEL_ICONS.info)} ${prefix} ${message}`);
  },

  // Success log (green)
  success: (message: string, context?: string) => {
    const prefix = context ? pc.dim(`[${context}]`) : '';
    console.log(`${pc.green(LEVEL_ICONS.success)} ${prefix} ${message}`);
  },

  // Warning log (yellow)
  warn: (message: string, context?: string) => {
    const prefix = context ? pc.dim(`[${context}]`) : '';
    console.log(`${pc.yellow(LEVEL_ICONS.warn)} ${prefix} ${pc.yellow(message)}`);
  },

  // Error log (red)
  error: (message: string, context?: string) => {
    const prefix = context ? pc.dim(`[${context}]`) : '';
    console.error(`${pc.red(LEVEL_ICONS.error)} ${prefix} ${pc.red(message)}`);
  },

  // Debug log (dim)
  debug: (message: string, context?: string) => {
    const prefix = context ? pc.dim(`[${context}]`) : '';
    console.log(`${pc.dim(LEVEL_ICONS.debug)} ${prefix} ${pc.dim(message)}`);
  },

  // Event log with type-based coloring
  event: (eventType: string, details: string) => {
    const colorFn = EVENT_COLORS[eventType] || pc.white;
    const typeStr = colorFn(eventType.padEnd(16));
    console.log(`${pc.dim('→')} ${typeStr} ${pc.dim(details)}`);
  },

  // Compact event format - one line, scannable
  compact: (event: any) => {
    statusLine.trackEvent(event);

    const timestamp = formatTime(new Date(event.timestamp || Date.now()));
    const timeStr = pc.dim(`[${timestamp}]`);

    const eventType = event.hook_event_type || 'Unknown';
    const colorFn = EVENT_COLORS[eventType] || pc.white;
    const typeStr = colorFn(eventType.padEnd(16));

    const p = event.payload || {};
    const agentType = p.agent_type || p.subagent_type || '';
    const toolName = p.tool_name || '';

    // Build agent/tool part
    let agentToolStr = '';
    if (agentType) {
      const icon = AGENT_ICONS[agentType] || '🤖';
      agentToolStr = `${icon} ${pc.dim(agentType.padEnd(12))}`;
    }
    if (toolName) {
      const toolIcon = TOOL_ICONS[toolName] || '🔧';
      agentToolStr += `${toolIcon} ${pc.cyan(toolName.padEnd(8))}`;
    }

    // Build details part
    let detailsStr = '';
    if (p.prompt) {
      const prompt = p.prompt.slice(0, 40);
      const ellipsis = p.prompt.length > 40 ? '…' : '';
      detailsStr = pc.dim(`"${prompt}${ellipsis}"`);
    } else if (p.hook_event_name) {
      detailsStr = pc.dim(p.hook_event_name);
    } else if (eventType === 'PostToolUse' && toolName) {
      // Show result summary for PostToolUse
      if (toolName === 'Read') {
        const lines = p.lines_readed || p.lines || '?';
        detailsStr = pc.dim(`→ ${lines} lines`);
      } else if (toolName === 'Grep') {
        const matches = p.match_count || p.matches || '?';
        detailsStr = pc.dim(`→ ${matches} results`);
      } else if (toolName === 'Edit') {
        const added = p.added ?? '?';
        const deleted = p.deleted ?? '?';
        detailsStr = pc.dim('→ +' + added + ' -' + deleted);
      }
    }

    console.log(`${timeStr} ${typeStr} ${agentToolStr} ${detailsStr}`);
  },

  // Event with agent icon
  agentEvent: (eventType: string, agentType: string, toolName?: string) => {
    const colorFn = EVENT_COLORS[eventType] || pc.white;
    const icon = AGENT_ICONS[agentType] || '🤖';
    const typeStr = colorFn(eventType);

    const parts = [icon, typeStr];
    if (toolName) parts.push(pc.cyan(toolName));
    if (agentType) parts.push(pc.dim(`(${agentType})`));

    console.log(`  ${parts.join(' ')}`);
  },

  // Server/infrastructure logs
  server: {
    start: (port: number) => {
      console.log('');
      console.log(pc.bold(pc.cyan('┌─────────────────────────────────────')));
      console.log(pc.bold(pc.cyan('│  Agent Lens Server')));
      console.log(pc.bold(pc.cyan('├─────────────────────────────────────')));
      console.log(pc.cyan(`│  HTTP:  `) + pc.white(`http://localhost:${port}`));
      console.log(pc.cyan(`│  WS:    `) + pc.white(`ws://localhost:${port}/stream`));
      console.log(pc.bold(pc.cyan('└─────────────────────────────────────')));
      console.log('');
    },

    ready: () => {
      console.log(`${pc.green('✓')} ${pc.green('Agent Lens ready')} ${pc.dim('— awaiting events')}`);
      console.log('');
    },
  },

  // WebSocket logs
  ws: {
    connect: (count: number) => {
      console.log(`${pc.green('+')} ${pc.cyan('client connected')} ${pc.dim(`(${count} connected)`)}`);
    },

    disconnect: (count: number) => {
      console.log(`${pc.red('-')} ${pc.dim('client disconnected')} ${pc.dim(`(${count} connected)`)}`);
    },

    broadcast: (eventType: string, count: number) => {
      console.log(`${pc.dim('↳')} ${pc.cyan('broadcast')} ${pc.dim(eventType)} ${pc.dim(`→ ${count} clients`)}`);
    },
  },

  // Ingestion logs
  ingest: {
    start: (path: string) => {
      console.log(`${pc.magenta('◈')} ${pc.magenta('ingestion started')}`);
      console.log(`${pc.dim('   watching:')} ${pc.white(path)}`);
    },

    polling: () => {
      console.log(`${pc.yellow('◫')} ${pc.yellow('polling for event file...')}`);
    },

    fileFound: () => {
      console.log(`${pc.green('◈')} ${pc.green('event file found, watching')}`);
    },

    event: (eventType: string, summary: string) => {
      const colorFn = EVENT_COLORS[eventType] || pc.white;
      console.log(`${pc.dim('→')} ${colorFn(eventType)} ${pc.dim(summary)}`);
    },

    error: (message: string) => {
      console.log(`${pc.red('✖')} ${pc.red('ingestion error:')} ${pc.red(message)}`);
    },
  },

  // Configuration display
  config: (settings: Record<string, string | number>) => {
    console.log(pc.bold(pc.cyan('┌─────────────────────────────────────')));
    console.log(pc.bold(pc.cyan('│  Configuration')));
    console.log(pc.bold(pc.cyan('├─────────────────────────────────────')));
    Object.entries(settings).forEach(([key, value]) => {
      const keyStr = pc.dim(`│  ${key}:`).padEnd(22);
      console.log(`${keyStr} ${pc.white(String(value))}`);
    });
    console.log(pc.bold(pc.cyan('└─────────────────────────────────────')));
    console.log('');
  },

  // Startup banner
  banner: () => {
    console.log('');
    console.log(pc.bold(pc.cyan('  ╔═══════════════════════════════════════╗')));
    console.log(pc.bold(pc.cyan('  ║   🔮 Agent Lens v2.0                 ║')));
    console.log(pc.bold(pc.cyan('  ║   Multi-Agent Observability          ║')));
    console.log(pc.bold(pc.cyan('  ╚═══════════════════════════════════════╝')));
    console.log('');
  },

  // Session summary
  summary: () => {
    const stats = statusLine.getStats();
    console.log('');
    console.log(pc.bold(pc.cyan('┌─────────────────────────────────────')));
    console.log(pc.bold(pc.cyan('│  Session Summary')));
    console.log(pc.bold(pc.cyan('├─────────────────────────────────────')));
    console.log(pc.cyan(`│  Total Events:    `) + pc.white(String(stats.events)));
    console.log(pc.cyan(`│  Sessions:        `) + pc.white(String(stats.sessions)));
    console.log(pc.cyan(`│  Active Agents:   `) + pc.white(String(stats.activeAgents)));
    console.log(pc.cyan(`│  Memory:          `) + pc.white(String(stats.memory)));
    console.log(pc.cyan(`│  Events/sec:      `) + pc.white(String(stats.eps)));
    console.log(pc.bold(pc.cyan('└─────────────────────────────────────')));
    console.log('');
  },
};

// Export picocolors for direct use if needed
export { pc };
