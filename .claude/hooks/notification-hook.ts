#!/usr/bin/env bun
/**
 * Notification Hook
 *
 * Sends desktop notification when Claude Code completes a response.
 * Uses notify-send (Linux) or osascript (macOS).
 */

import { readFileSync } from 'fs';

async function notify(title: string, body: string): Promise<void> {
  const platform = process.platform;

  if (platform === 'linux') {
    Bun.spawn(['notify-send', '--app-name=Qara', title, body]);
  } else if (platform === 'darwin') {
    const safeBody = body.replace(/["\\]/g, '');
    const safeTitle = title.replace(/["\\]/g, '');
    Bun.spawn(['osascript', '-e', `display notification "${safeBody}" with title "${safeTitle}"`]);
  }
}

async function main(): Promise<void> {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) return;

    const hookData = JSON.parse(input);
    const stopReason = hookData.stop_reason || 'completed';

    // Only notify on end_turn (task complete), not on tool use pauses
    if (stopReason === 'end_turn') {
      await notify('Qara', 'Task completed');
    }
  } catch {
    // Non-critical
  }
}

main();
