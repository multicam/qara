/**
 * Tests for agent-state-utils.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  getAgentState,
  updateAgentState,
  findResumableAgents,
  completeAgent,
  listAgentsByStatus,
  type AgentState,
} from './agent-state-utils';
import { STATE_DIR } from './pai-paths';

const AGENTS_DIR = join(STATE_DIR, 'agents');

describe('Agent State Utils', () => {
  let originalAgents: Map<string, string> = new Map();

  beforeEach(() => {
    // Backup existing agent files
    if (existsSync(AGENTS_DIR)) {
      const files = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.json'));
      files.forEach((file) => {
        const filePath = join(AGENTS_DIR, file);
        originalAgents.set(file, readFileSync(filePath, 'utf-8'));
      });
    }
  });

  afterEach(() => {
    // Restore original agent files and remove test files
    if (existsSync(AGENTS_DIR)) {
      const files = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.json'));
      files.forEach((file) => {
        const filePath = join(AGENTS_DIR, file);
        if (file.startsWith('test-agent-')) {
          rmSync(filePath, { force: true });
        } else if (originalAgents.has(file)) {
          writeFileSync(filePath, originalAgents.get(file)!);
        }
      });
    }
    originalAgents.clear();
  });

  function createTestAgent(
    agentId: string,
    overrides: Partial<AgentState> = {}
  ): AgentState {
    const state: AgentState = {
      agent_id: agentId,
      agent_type: 'test',
      description: 'Test agent',
      session_id: 'test-session',
      parent_agent_id: null,
      start_time: new Date().toISOString(),
      start_timestamp_ms: Date.now(),
      status: 'running',
      ...overrides,
    };

    mkdirSync(AGENTS_DIR, { recursive: true });
    writeFileSync(join(AGENTS_DIR, `${agentId}.json`), JSON.stringify(state, null, 2));

    return state;
  }

  describe('getAgentState', () => {
    it('should return null for non-existent agent', () => {
      const result = getAgentState('non-existent-agent-id');
      expect(result).toBeNull();
    });

    it('should return agent state for existing agent', () => {
      const agentId = 'test-agent-get-1';
      const created = createTestAgent(agentId, { description: 'Get test agent' });

      const result = getAgentState(agentId);

      expect(result).not.toBeNull();
      expect(result!.agent_id).toBe(agentId);
      expect(result!.description).toBe('Get test agent');
    });

    it('should return all state fields', () => {
      const agentId = 'test-agent-get-2';
      createTestAgent(agentId, {
        agent_type: 'explorer',
        session_id: 'session-123',
        status: 'completed',
        end_time: '2026-01-27T10:00:00Z',
        output_summary: 'Completed successfully',
      });

      const result = getAgentState(agentId);

      expect(result!.agent_type).toBe('explorer');
      expect(result!.session_id).toBe('session-123');
      expect(result!.status).toBe('completed');
      expect(result!.end_time).toBe('2026-01-27T10:00:00Z');
      expect(result!.output_summary).toBe('Completed successfully');
    });
  });

  describe('updateAgentState', () => {
    it('should return null for non-existent agent', () => {
      const result = updateAgentState('non-existent-agent', { status: 'completed' });
      expect(result).toBeNull();
    });

    it('should update agent state fields', () => {
      const agentId = 'test-agent-update-1';
      createTestAgent(agentId);

      const result = updateAgentState(agentId, {
        status: 'completed',
        output_summary: 'Done!',
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.output_summary).toBe('Done!');
    });

    it('should preserve existing fields', () => {
      const agentId = 'test-agent-update-2';
      createTestAgent(agentId, {
        description: 'Original description',
        agent_type: 'researcher',
      });

      const result = updateAgentState(agentId, { status: 'failed' });

      expect(result!.description).toBe('Original description');
      expect(result!.agent_type).toBe('researcher');
      expect(result!.status).toBe('failed');
    });

    it('should persist changes to disk', () => {
      const agentId = 'test-agent-update-3';
      createTestAgent(agentId);

      updateAgentState(agentId, { status: 'completed' });

      // Re-read from disk
      const reloaded = getAgentState(agentId);
      expect(reloaded!.status).toBe('completed');
    });
  });

  describe('completeAgent', () => {
    it('should return null for non-existent agent', () => {
      const result = completeAgent('non-existent', 'output');
      expect(result).toBeNull();
    });

    it('should mark agent as completed', () => {
      const agentId = 'test-agent-complete-1';
      createTestAgent(agentId);

      const result = completeAgent(agentId, 'Task completed successfully');

      expect(result!.status).toBe('completed');
      expect(result!.output_summary).toBe('Task completed successfully');
      expect(result!.end_time).toBeDefined();
      expect(result!.end_timestamp_ms).toBeDefined();
      expect(result!.duration_ms).toBeDefined();
    });

    it('should support different completion statuses', () => {
      const agentId = 'test-agent-complete-2';
      createTestAgent(agentId);

      const result = completeAgent(agentId, 'Error occurred', 'failed');

      expect(result!.status).toBe('failed');
    });

    it('should truncate long output to 500 chars', () => {
      const agentId = 'test-agent-complete-3';
      createTestAgent(agentId);

      const longOutput = 'A'.repeat(1000);
      const result = completeAgent(agentId, longOutput);

      expect(result!.output_summary!.length).toBe(500);
    });

    it('should calculate duration correctly', () => {
      const agentId = 'test-agent-complete-4';
      const startTime = Date.now() - 5000; // 5 seconds ago
      createTestAgent(agentId, { start_timestamp_ms: startTime });

      const result = completeAgent(agentId, 'Done');

      // Duration should be approximately 5000ms (with some tolerance)
      expect(result!.duration_ms).toBeGreaterThan(4900);
      expect(result!.duration_ms).toBeLessThan(6000);
    });
  });

  describe('findResumableAgents', () => {
    it('should return empty array if agents directory does not exist', () => {
      // This test relies on no agents existing or dir not existing
      const result = findResumableAgents({ staleThresholdMs: 0 });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should find stale running agents', () => {
      const agentId = 'test-agent-resumable-1';
      createTestAgent(agentId, {
        status: 'running',
        start_timestamp_ms: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });

      const result = findResumableAgents({ staleThresholdMs: 5 * 60 * 1000 }); // 5 min threshold

      const found = result.find((a) => a.agent_id === agentId);
      expect(found).toBeDefined();
    });

    it('should not include recently started agents', () => {
      const agentId = 'test-agent-resumable-2';
      createTestAgent(agentId, {
        status: 'running',
        start_timestamp_ms: Date.now() - 1000, // 1 second ago
      });

      const result = findResumableAgents({ staleThresholdMs: 5 * 60 * 1000 });

      const found = result.find((a) => a.agent_id === agentId);
      expect(found).toBeUndefined();
    });

    it('should filter by session ID', () => {
      createTestAgent('test-agent-resumable-3', {
        status: 'running',
        session_id: 'session-A',
        start_timestamp_ms: Date.now() - 10 * 60 * 1000,
      });
      createTestAgent('test-agent-resumable-4', {
        status: 'running',
        session_id: 'session-B',
        start_timestamp_ms: Date.now() - 10 * 60 * 1000,
      });

      const result = findResumableAgents({
        sessionId: 'session-A',
        staleThresholdMs: 5 * 60 * 1000,
      });

      const foundA = result.find((a) => a.session_id === 'session-A');
      const foundB = result.find((a) => a.session_id === 'session-B');

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();
    });

    it('should filter by topic keyword', () => {
      createTestAgent('test-agent-resumable-5', {
        status: 'running',
        description: 'Research task about AI',
        start_timestamp_ms: Date.now() - 10 * 60 * 1000,
      });
      createTestAgent('test-agent-resumable-6', {
        status: 'running',
        description: 'Build a website',
        start_timestamp_ms: Date.now() - 10 * 60 * 1000,
      });

      const result = findResumableAgents({
        topic: 'research',
        staleThresholdMs: 5 * 60 * 1000,
      });

      const foundResearch = result.find((a) => a.description.includes('Research'));
      const foundWebsite = result.find((a) => a.description.includes('website'));

      expect(foundResearch).toBeDefined();
      expect(foundWebsite).toBeUndefined();
    });

    it('should sort by start time (most recent first)', () => {
      createTestAgent('test-agent-resumable-7', {
        status: 'running',
        start_timestamp_ms: Date.now() - 20 * 60 * 1000, // 20 min ago
      });
      createTestAgent('test-agent-resumable-8', {
        status: 'running',
        start_timestamp_ms: Date.now() - 10 * 60 * 1000, // 10 min ago
      });

      const result = findResumableAgents({ staleThresholdMs: 5 * 60 * 1000 });

      if (result.length >= 2) {
        // More recent should come first
        expect(result[0].start_timestamp_ms).toBeGreaterThan(result[1].start_timestamp_ms);
      }
    });
  });

  describe('listAgentsByStatus', () => {
    it('should return empty array if no agents exist', () => {
      const result = listAgentsByStatus('completed');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return only agents with matching status', () => {
      createTestAgent('test-agent-status-1', { status: 'running' });
      createTestAgent('test-agent-status-2', { status: 'completed' });
      createTestAgent('test-agent-status-3', { status: 'failed' });
      createTestAgent('test-agent-status-4', { status: 'completed' });

      const completed = listAgentsByStatus('completed');
      const running = listAgentsByStatus('running');
      const failed = listAgentsByStatus('failed');

      const completedIds = completed.map((a) => a.agent_id);
      const runningIds = running.map((a) => a.agent_id);
      const failedIds = failed.map((a) => a.agent_id);

      expect(completedIds).toContain('test-agent-status-2');
      expect(completedIds).toContain('test-agent-status-4');
      expect(runningIds).toContain('test-agent-status-1');
      expect(failedIds).toContain('test-agent-status-3');
    });
  });
});
