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

// Log level icons
const LEVEL_ICONS = {
  info: '●',
  success: '✓',
  warn: '⚠',
  error: '✖',
  debug: '○',
};

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
};

// Export picocolors for direct use if needed
export { pc };
