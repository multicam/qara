#!/usr/bin/env bun
/**
 * Capture All Events Hook
 * Captures ALL Claude Code hook events (not just tools) to JSONL
 * This hook provides comprehensive event tracking for the PAI observability system
 *
 * SETUP REQUIRED:
 * 1. Install Bun: https://bun.sh
 * 2. Set PAI_DIR environment variable (defaults to ~/.claude)
 * 3. Make this file executable: chmod +x capture-all-events.ts
 * 4. Configure in settings.json under "hooks" section
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Configuration: Default agent name (configurable via environment variable)
const DEFAULT_AGENT_NAME = process.env.PAI_AGENT_NAME || 'claude';

// Maximum number of session mappings to keep in memory
const MAX_SESSION_MAPPINGS = 1000;

// Session mapping with metadata
interface SessionMapping {
  agentName: string;
  createdAt: number;
  lastAccessAt: number;
}

interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  timestamp: number;
  timestamp_aedt: string;
}

// Get Sydney timestamp (AEDT)
function getAEDTTimestamp(): string {
  const date = new Date();
  // Use Intl.DateTimeFormat for reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const hours = parts.find(p => p.type === 'hour')!.value;
  const minutes = parts.find(p => p.type === 'minute')!.value;
  const seconds = parts.find(p => p.type === 'second')!.value;

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} AEDT`;
}

// Get current events file path
function getEventsFilePath(): string {
  // ALWAYS use ~/.claude/history (NEVER PAI_DIR/history)
  const historyDir = join(homedir(), '.claude', 'history');
  const now = new Date();
  // Use Intl.DateTimeFormat for reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  const monthDir = join(historyDir, 'raw-outputs', `${year}-${month}`);

  // Ensure directory exists
  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

// Session-to-agent mapping functions
function getSessionMappingFile(): string {
  const claudeDir = join(homedir(), '.claude');
  return join(claudeDir, 'agent-sessions.json');
}

function migrateOldFormat(data: any): Record<string, SessionMapping> {
  const now = Date.now();
  const result: Record<string, SessionMapping> = {};

  for (const [sessionId, value] of Object.entries(data)) {
    // Check if already in new format (has createdAt/lastAccessAt)
    if (typeof value === 'object' && value !== null && 'agentName' in value) {
      result[sessionId] = value as SessionMapping;
    } else {
      // Convert old format (string) to new format (object with metadata)
      result[sessionId] = {
        agentName: value as string,
        createdAt: now,
        lastAccessAt: now
      };
    }
  }

  return result;
}

function getAgentForSession(sessionId: string): string {
  try {
    const mappingFile = getSessionMappingFile();
    if (existsSync(mappingFile)) {
      const rawData = JSON.parse(readFileSync(mappingFile, 'utf-8'));

      // Migrate old format if needed
      let mappings: Record<string, SessionMapping> = migrateOldFormat(rawData);

      const mapping = mappings[sessionId];

      if (mapping) {
        // Update last access time
        mapping.lastAccessAt = Date.now();
        writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf-8');
        return mapping.agentName;
      }

      return DEFAULT_AGENT_NAME;
    }
  } catch (error) {
    // Ignore errors, default to primary agent
  }
  return DEFAULT_AGENT_NAME;
}

function cleanupOldSessions(mappings: Record<string, SessionMapping>): Record<string, SessionMapping> {
  const entries = Object.entries(mappings);

  // If under the limit, no cleanup needed
  if (entries.length <= MAX_SESSION_MAPPINGS) {
    return mappings;
  }

  // Sort by lastAccessAt (most recent first)
  const sorted = entries.sort((a, b) => b[1].lastAccessAt - a[1].lastAccessAt);

  // Keep only the most recent MAX_SESSION_MAPPINGS entries
  const cleaned = sorted.slice(0, MAX_SESSION_MAPPINGS);

  return Object.fromEntries(cleaned);
}

function setAgentForSession(sessionId: string, agentName: string): void {
  try {
    const mappingFile = getSessionMappingFile();
    let mappings: Record<string, SessionMapping> = {};

    if (existsSync(mappingFile)) {
      const rawData = JSON.parse(readFileSync(mappingFile, 'utf-8'));
      // Migrate old format if needed
      mappings = migrateOldFormat(rawData);
    }

    const now = Date.now();

    // Update or create mapping with metadata
    mappings[sessionId] = {
      agentName,
      createdAt: mappings[sessionId]?.createdAt || now,
      lastAccessAt: now
    };

    // Clean up old sessions if needed
    mappings = cleanupOldSessions(mappings);

    writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf-8');
  } catch (error) {
    // Silently fail - don't block
  }
}

// Validate event before writing to ensure data integrity
function validateEvent(event: HookEvent): boolean {
  // Check all required fields are present and valid
  if (!event.source_app || typeof event.source_app !== 'string') {
    console.error('Invalid event: missing or invalid source_app');
    return false;
  }

  if (!event.session_id || typeof event.session_id !== 'string') {
    console.error('Invalid event: missing or invalid session_id');
    return false;
  }

  if (!event.hook_event_type || typeof event.hook_event_type !== 'string') {
    console.error('Invalid event: missing or invalid hook_event_type');
    return false;
  }

  if (!event.payload || typeof event.payload !== 'object') {
    console.error('Invalid event: missing or invalid payload');
    return false;
  }

  if (!event.timestamp || typeof event.timestamp !== 'number') {
    console.error('Invalid event: missing or invalid timestamp');
    return false;
  }

  if (!event.timestamp_aedt || typeof event.timestamp_aedt !== 'string') {
    console.error('Invalid event: missing or invalid timestamp_aedt');
    return false;
  }

  return true;
}

async function main() {
  try {
    // Get event type from command line args
    const args = process.argv.slice(2);
    const eventTypeIndex = args.indexOf('--event-type');

    if (eventTypeIndex === -1) {
      console.error('Missing --event-type argument');
      process.exit(0); // Don't block Claude Code
    }

    const eventType = args[eventTypeIndex + 1];

    // Read hook data from stdin
    const stdinData = await Bun.stdin.text();
    const hookData = JSON.parse(stdinData);

    // Detect agent type from session mapping or payload
    const sessionId = hookData.session_id || 'main';
    let agentName = getAgentForSession(sessionId);

    // If this is a Task tool launching a subagent, update the session mapping
    if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
      agentName = hookData.tool_input.subagent_type;
      setAgentForSession(sessionId, agentName);
    }
    // If this is a SubagentStop, Stop, or SessionStart event, reset to primary agent
    else if (eventType === 'SubagentStop' || eventType === 'Stop' || eventType === 'SessionStart') {
      agentName = DEFAULT_AGENT_NAME;
      setAgentForSession(sessionId, DEFAULT_AGENT_NAME);
    }
    // Check if CLAUDE_CODE_AGENT env variable is set (for subagents)
    else if (process.env.CLAUDE_CODE_AGENT) {
      agentName = process.env.CLAUDE_CODE_AGENT;
      setAgentForSession(sessionId, agentName);
    }
    // Check if agent type is in the payload (alternative detection method)
    else if (hookData.agent_type) {
      agentName = hookData.agent_type;
      setAgentForSession(sessionId, agentName);
    }
    // Check if this is from a subagent based on cwd containing 'agent'
    else if (hookData.cwd && hookData.cwd.includes('/agents/')) {
      // Extract agent name from path like "/agents/designer/"
      const agentMatch = hookData.cwd.match(/\/agents\/([^\/]+)/);
      if (agentMatch) {
        agentName = agentMatch[1];
        setAgentForSession(sessionId, agentName);
      }
    }

    // Create event object
    const event: HookEvent = {
      source_app: agentName,
      session_id: hookData.session_id || 'main',
      hook_event_type: eventType,
      payload: hookData,
      timestamp: Date.now(),
      timestamp_aedt: getAEDTTimestamp()
    };

    // Validate event before writing
    if (!validateEvent(event)) {
      console.error('Event validation failed, skipping write');
      process.exit(0);
    }

    // Append to events file
    const eventsFile = getEventsFilePath();
    const jsonLine = JSON.stringify(event) + '\n';
    appendFileSync(eventsFile, jsonLine, 'utf-8');

  } catch (error) {
    // Silently fail - don't block Claude Code
    console.error('Event capture error:', error);
  }

  process.exit(0);
}

main();
