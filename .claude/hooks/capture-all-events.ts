#!/usr/bin/env bun
/**
 * Capture All Events Hook - Agent Lens Edition
 * Captures ALL Claude Code hook events with hierarchy tracking to JSONL
 * This hook provides comprehensive event tracking for the Agent Lens observability system
 *
 * NEW in Agent Lens:
 * - Parent-child event relationships (span hierarchy)
 * - CC 2.1.6 context tracking integration
 * - Skill invocation tracking
 * - OpenTelemetry span kind classification
 *
 * SETUP REQUIRED:
 * 1. Install Bun: https://bun.sh
 * 2. Set PAI_DIR environment variable (defaults to ${PAI_DIR})
 * 3. Make this file executable: chmod +x capture-all-events.ts
 * 4. Configure in settings.json under "hooks" section
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PAI_DIR, ensureDir } from './lib/pai-paths';
import { getAEDTTimestamp, getDateParts } from './lib/datetime-utils';
import { appendJsonl } from './lib/jsonl-utils';
import {
  getParentEventId,
  getSpanKind,
  updateSessionState,
  extractSkillName,
  extractContextInfo,
  estimateTokens,
  estimateCost
} from './lib/session-hierarchy-tracker';

// Configuration: Default agent name (configurable via environment variable)
const DEFAULT_AGENT_NAME = process.env.PAI_AGENT_NAME || 'claude';

// Maximum number of session mappings to keep in memory
const MAX_SESSION_MAPPINGS = 1000;

// Valid event types (whitelist)
const VALID_EVENT_TYPES = [
    'SessionStart',
    'SessionEnd',
    'PreToolUse',
    'PostToolUse',
    'UserPromptSubmit',
    'Stop',
    'SubagentStop',
    'Notification',
    'PreCompact'
] as const;

type ValidEventType = typeof VALID_EVENT_TYPES[number];

// Session mapping with metadata
interface SessionMapping {
    agentName: string;
    createdAt: number;
    lastAccessAt: number;
}

interface HookEvent {
    // Core identification
    event_id: string;           // NEW: Unique event ID
    parent_event_id: string | null; // NEW: Parent event for hierarchy
    source_app: string;
    session_id: string;
    hook_event_type: string;
    payload: Record<string, any>;
    timestamp: number;
    timestamp_aedt: string;

    // NEW: Hierarchy metadata
    span_kind: string;          // OpenTelemetry span kind

    // NEW: Context tracking (CC 2.1.6)
    context_used?: number;
    context_remaining?: number;
    context_used_percentage?: number;
    context_remaining_percentage?: number;

    // NEW: Metrics
    model_name?: string;
    estimated_tokens?: number;
    estimated_cost?: number;

    // NEW: Skill tracking
    skill_name?: string;
}


// Get current events file path
function getEventsFilePath(): string {
    const { year, month, day, yearMonth } = getDateParts();
    const monthDir = join(PAI_DIR, 'history', 'raw-outputs', yearMonth);
    ensureDir(monthDir);
    return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

// Session-to-agent mapping functions
function getSessionMappingFile(): string {
    return join(PAI_DIR, 'agent-sessions.json');
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

    // Validate session ID format (should be UUID or reasonable identifier)
    if (event.session_id.length < 3 || event.session_id.length > 100) {
        console.error(`Invalid event: session_id length out of bounds (${event.session_id.length})`);
        return false;
    }

    if (!event.hook_event_type || typeof event.hook_event_type !== 'string') {
        console.error('Invalid event: missing or invalid hook_event_type');
        return false;
    }

    // Validate event type is in whitelist
    if (!VALID_EVENT_TYPES.includes(event.hook_event_type as ValidEventType)) {
        console.error(`Invalid event: unknown hook_event_type "${event.hook_event_type}". Valid types: ${VALID_EVENT_TYPES.join(', ')}`);
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

    // Timestamp sanity checks
    const now = Date.now();
    const oneHourInFuture = now + (60 * 60 * 1000);
    const oneYearInPast = now - (365 * 24 * 60 * 60 * 1000);

    if (event.timestamp > oneHourInFuture) {
        console.error(`Invalid event: timestamp is more than 1 hour in the future (${new Date(event.timestamp).toISOString()})`);
        return false;
    }

    if (event.timestamp < oneYearInPast) {
        console.error(`Invalid event: timestamp is more than 1 year in the past (${new Date(event.timestamp).toISOString()})`);
        return false;
    }

    if (!event.timestamp_aedt || typeof event.timestamp_aedt !== 'string') {
        console.error('Invalid event: missing or invalid timestamp_aedt');
        return false;
    }

    return true;
}

/**
 * Infer event type from input structure since CC doesn't always provide hook_event_name
 */
function inferEventType(hookData: Record<string, any>): string | null {
    // Explicit hook_event_name takes precedence
    if (hookData.hook_event_name) {
        return hookData.hook_event_name;
    }

    // Infer from input structure
    if (hookData.tool_result !== undefined) {
        return 'PostToolUse';
    }
    if (hookData.tool_name !== undefined && hookData.tool_input !== undefined) {
        return 'PreToolUse';
    }
    if (hookData.user_prompt !== undefined) {
        return 'UserPromptSubmit';
    }
    if (hookData.stop_reason !== undefined) {
        return 'Stop';
    }
    if (hookData.subagent_type !== undefined && hookData.subagent_result !== undefined) {
        return 'SubagentStop';
    }
    if (hookData.transcript_summary !== undefined) {
        return 'PreCompact';
    }

    // Cannot infer - skip silently
    return null;
}

async function main() {
    try {
        // Read hook data from stdin
        const stdinData = await Bun.stdin.text();
        const hookData = JSON.parse(stdinData);

        // Get event type from input or infer from structure
        const eventType = inferEventType(hookData);
        if (!eventType) {
            // Cannot determine event type - skip silently
            process.exit(0);
        }

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

        // Generate unique event ID
        const eventId = randomUUID();
        // sessionId already declared above at line 277

        // Get parent event ID based on hierarchy rules
        const parentEventId = getParentEventId(sessionId, eventType, hookData);

        // Get span kind for OpenTelemetry compatibility
        const spanKind = getSpanKind(eventType);

        // Extract context info from CC 2.1.6
        const contextInfo = extractContextInfo(hookData);

        // Extract skill name if this is a skill invocation
        const skillName = extractSkillName(eventType, hookData);

        // Estimate tokens and cost (if possible)
        const estimatedTokens = estimateTokens(eventType, hookData);
        const modelName = hookData.model_name || hookData.model;
        const estimatedCost = estimateCost(modelName, estimatedTokens);

        // Create enhanced event object
        const event: HookEvent = {
            // Core identification
            event_id: eventId,
            parent_event_id: parentEventId,
            source_app: agentName,
            session_id: sessionId,
            hook_event_type: eventType,
            payload: hookData,
            timestamp: Date.now(),
            timestamp_aedt: getAEDTTimestamp(),

            // Hierarchy metadata
            span_kind: spanKind,

            // Context tracking (CC 2.1.6)
            ...contextInfo,

            // Metrics
            model_name: modelName,
            estimated_tokens: estimatedTokens,
            estimated_cost: estimatedCost,

            // Skill tracking
            skill_name: skillName
        };

        // Validate event before writing
        if (!validateEvent(event)) {
            console.error('Event validation failed, skipping write');
            process.exit(0);
        }

        // Update session state for future parent lookups
        updateSessionState(sessionId, eventType, eventId, hookData);

        // Append to events file
        const eventsFile = getEventsFilePath();
        appendJsonl(eventsFile, event);

        // PreToolUse hooks MUST output a decision - use lowercase "approve" per CC schema
        if (eventType === 'PreToolUse') {
            console.log(JSON.stringify({ decision: 'approve' }));
        }

    } catch (error) {
        // Silently fail - don't block Claude Code
        console.error('Event capture error:', error);
        // Still output approve for PreToolUse to prevent blocking
        console.log(JSON.stringify({ decision: 'approve' }));
    }

    process.exit(0);
}

main();
