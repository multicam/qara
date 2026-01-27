#!/usr/bin/env bun

/**
 * subagent-stop-hook.ts
 *
 * SubagentStop event hook - triggered when a subagent completes.
 * Extracts completion message and agent type from task output.
 */

import { readStdinWithTimeout } from './lib/stdin-utils';
import { findTaskResult, extractCompletionMessage } from './lib/transcript-utils';
import { completeAgent } from './lib/agent-state-utils';

interface SubagentStopInput {
  agent_id?: string;
  transcript_path?: string;
}

async function main() {
  console.error('🔍 SubagentStop hook started');

  // Read input from stdin using shared utility
  let transcriptPath: string;
  let agentId: string | undefined;
  try {
    const input = await readStdinWithTimeout(500);
    if (!input) {
      console.error('No input received');
      process.exit(0);
    }

    const parsed: SubagentStopInput = JSON.parse(input);
    transcriptPath = parsed.transcript_path || '';
    agentId = parsed.agent_id;

    if (!transcriptPath) {
      console.error('No transcript path provided');
      process.exit(0);
    }
  } catch (e) {
    console.error('Failed to read/parse input:', e);
    process.exit(0);
  }
  
  // Wait for and find the Task result
  const { result: taskOutput, agentType } = await findTaskResult(transcriptPath);
  
  if (!taskOutput) {
    console.log('No Task result found in transcript after waiting');
    process.exit(0);
  }
  
  // Extract the completion message and agent type
  const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);
  
  if (!completionMessage) {
    console.log('No specific completion message found in Task output');
    process.exit(0);
  }
  
  // Use extracted agent type if available, otherwise use the one from task analysis
  const finalAgentType = extractedAgentType || agentType || 'default';
  
  // Prepare the notification
  const fullMessage = completionMessage; // Message is already prepared with agent name
  const agentName = finalAgentType.charAt(0).toUpperCase() + finalAgentType.slice(1);
  
  // Voice notification removed - voice server is no longer used
  console.log(`✅ Completed: [${agentName}] ${fullMessage}`);

  // Update agent state file with completion info for resume capability
  if (agentId) {
    try {
      const status = taskOutput.includes('error') || taskOutput.includes('failed')
        ? 'failed'
        : 'completed';
      completeAgent(agentId, fullMessage, status);
      console.error(`📝 Agent state updated: ${agentId} -> ${status}`);
    } catch (e) {
      console.error('Failed to update agent state:', e);
    }
  }
}

main().catch(console.error);