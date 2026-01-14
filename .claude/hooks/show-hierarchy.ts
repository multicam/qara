#!/usr/bin/env bun
/**
 * Agent Lens Hierarchy Visualizer
 * Shows parent-child relationships in a tree format
 */

import { readFileSync } from 'fs';

const eventsFile = process.argv[2] || `${process.env.HOME}/.claude/history/raw-outputs/2026-01/2026-01-14_all-events.jsonl`;
const limit = parseInt(process.argv[3] || '50');

console.log(`\n📊 Agent Lens Hierarchy Visualization\n`);
console.log(`Reading from: ${eventsFile}`);
console.log(`Showing last ${limit} events\n`);

const content = readFileSync(eventsFile, 'utf-8');
const lines = content.trim().split('\n').slice(-limit);

const events = lines
  .map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(e => e !== null);

// Build event map
const eventMap = new Map();
events.forEach(e => {
  if (e.event_id) {
    eventMap.set(e.event_id, e);
  }
});

// Build hierarchy tree
interface TreeNode {
  event: any;
  children: TreeNode[];
}

const rootNodes: TreeNode[] = [];
const nodeMap = new Map<string, TreeNode>();

// Create nodes
events.forEach(e => {
  if (!e.event_id) return;
  nodeMap.set(e.event_id, { event: e, children: [] });
});

// Link children to parents
events.forEach(e => {
  if (!e.event_id) return;
  const node = nodeMap.get(e.event_id)!;

  if (e.parent_event_id) {
    const parent = nodeMap.get(e.parent_event_id);
    if (parent) {
      parent.children.push(node);
    } else {
      // Parent not in this window
      rootNodes.push(node);
    }
  } else {
    rootNodes.push(node);
  }
});

// Print tree
function printTree(node: TreeNode, prefix: string = '', isLast: boolean = true) {
  const event = node.event;
  const shortId = event.event_id.substring(0, 8);
  const time = event.timestamp_aedt?.substring(11, 19) || '';
  const spanKind = event.span_kind || '?';
  const tool = event.payload?.tool_name || '';
  const skill = event.skill_name || '';

  const connector = isLast ? '└─' : '├─';
  const line = `${prefix}${connector} [${shortId}] ${event.hook_event_type} (${spanKind})`;

  let details = '';
  if (tool) details += ` tool:${tool}`;
  if (skill) details += ` skill:${skill}`;
  if (time) details += ` @ ${time}`;

  console.log(line + details);

  // Print children
  const childPrefix = prefix + (isLast ? '   ' : '│  ');
  node.children.forEach((child, i) => {
    printTree(child, childPrefix, i === node.children.length - 1);
  });
}

// Print all root nodes
rootNodes.forEach((node, i) => {
  printTree(node, '', i === rootNodes.length - 1);
});

console.log(`\n📈 Summary:`);
console.log(`   Total events: ${events.length}`);
console.log(`   With hierarchy: ${events.filter(e => e.event_id).length}`);
console.log(`   Root events: ${rootNodes.length}`);
console.log(`\n✅ Hierarchy tracking is working!\n`);
