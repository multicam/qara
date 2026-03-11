#!/usr/bin/env bun
/**
 * Context Graph CLI
 *
 * Static analysis tool for Qara's context architecture.
 *
 * Usage: context-graph <command> [options]
 *
 * Commands:
 *   scan              Graph stats: node/edge counts, per-tier and per-skill token totals
 *   orphans           Find unreferenced files and broken references
 *   impact <file>     Show what depends on a file (direct + transitive)
 *   cycles            Detect circular dependencies
 *   dot               Output DOT format for visualization
 *   audit             Full report: scan + orphans + cycles + top bloated skills
 *
 * Options:
 *   --json            JSON output
 *   --pai-dir <path>  Override PAI_DIR (default: from environment)
 */

import { relative } from 'path';
import { buildGraph, scan, findOrphans, analyzeImpact, detectCycles } from './graph';
import type { ContextGraph, ContextNode } from './types';

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-'));
const jsonOutput = args.includes('--json');
const paiDirIdx = args.indexOf('--pai-dir');
const paiDirOverride = paiDirIdx >= 0 ? args[paiDirIdx + 1] : undefined;

function relPath(node: ContextNode): string {
  return node.relativePath;
}

function formatTokens(n: number): string {
  return `~${n.toLocaleString()} tokens`;
}

function runScan(graph: ContextGraph): void {
  const report = scan(graph);

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Context Graph: ${report.nodeCount} nodes, ${report.edgeCount} edges\n`);
  console.log('By tier:');
  console.log(`  Tier 1 (SKILL.md):           ${String(report.tiers[1].count).padStart(3)} files   ${formatTokens(report.tiers[1].totalTokens)}`);
  console.log(`  Tier 2 (skill docs/context):  ${String(report.tiers[2].count).padStart(3)} files   ${formatTokens(report.tiers[2].totalTokens)}`);
  console.log(`  Tier 3 (workflows/refs):      ${String(report.tiers[3].count).padStart(3)} files   ${formatTokens(report.tiers[3].totalTokens)}`);

  console.log(`\nTop 5 skills by token cost:`);
  for (let i = 0; i < Math.min(5, report.skills.length); i++) {
    const s = report.skills[i];
    console.log(`  ${i + 1}. ${s.name.padEnd(22)} ${formatTokens(s.totalTokens)} (${s.fileCount} files)`);
  }
}

function runOrphans(graph: ContextGraph): void {
  const report = findOrphans(graph);

  if (jsonOutput) {
    console.log(JSON.stringify({
      unreferencedFiles: report.unreferencedFiles.map(n => ({
        path: n.relativePath,
        tier: n.tier,
        tokenEstimate: n.tokenEstimate,
      })),
      brokenReferences: report.brokenReferences.map(b => ({
        source: relative(paiDirOverride || process.env.PAI_DIR || '', b.source),
        target: relative(paiDirOverride || process.env.PAI_DIR || '', b.target),
        lineNumber: b.lineNumber,
      })),
    }, null, 2));
    return;
  }

  if (report.unreferencedFiles.length === 0) {
    console.log('No unreferenced files found.');
  } else {
    console.log(`Unreferenced files (no incoming edges):`);
    for (const node of report.unreferencedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
      console.log(`  [T${node.tier}] ${node.relativePath.padEnd(45)} ${formatTokens(node.tokenEstimate)}`);
    }
  }

  console.log('');

  if (report.brokenReferences.length === 0) {
    console.log('No broken references found.');
  } else {
    console.log(`Broken references (target not found):`);
    for (const br of report.brokenReferences) {
      const src = relative(paiDirOverride || process.env.PAI_DIR || '', br.source);
      const tgt = relative(paiDirOverride || process.env.PAI_DIR || '', br.target);
      console.log(`  ${src}:${br.lineNumber} → ${tgt} (not found)`);
    }
  }
}

function runImpact(graph: ContextGraph, filePath: string): void {
  const report = analyzeImpact(graph, filePath);

  if (jsonOutput) {
    console.log(JSON.stringify({
      directDependents: report.directDependents.map(n => n.relativePath),
      transitiveDependents: report.transitiveDependents.map(n => n.relativePath),
      affectedSkills: report.affectedSkills,
    }, null, 2));
    return;
  }

  console.log(`Impact analysis for: ${filePath}\n`);

  if (report.directDependents.length === 0) {
    console.log('No direct dependents found.');
  } else {
    console.log(`Direct dependents (${report.directDependents.length}):`);
    for (const dep of report.directDependents) {
      console.log(`  ${relPath(dep)}`);
    }
  }

  console.log('');

  if (report.transitiveDependents.length > report.directDependents.length) {
    const transitiveOnly = report.transitiveDependents.filter(
      t => !report.directDependents.some(d => d.id === t.id)
    );
    console.log(`Transitive dependents (${report.transitiveDependents.length} total):`);
    for (const dep of transitiveOnly) {
      console.log(`  + ${relPath(dep)}`);
    }
  }

  if (report.affectedSkills.length > 0) {
    console.log(`\nAffected skills: ${report.affectedSkills.join(', ')}`);
  }
}

function runCycles(graph: ContextGraph): void {
  const cycles = detectCycles(graph);

  if (jsonOutput) {
    const paiDir = paiDirOverride || process.env.PAI_DIR || '';
    console.log(JSON.stringify(cycles.map(c => c.map(id => relative(paiDir, id))), null, 2));
    return;
  }

  if (cycles.length === 0) {
    console.log('No circular dependencies detected.');
  } else {
    console.log(`Found ${cycles.length} circular dependency chain(s):\n`);
    const paiDir = paiDirOverride || process.env.PAI_DIR || '';
    for (let i = 0; i < cycles.length; i++) {
      console.log(`  Cycle ${i + 1}:`);
      for (const id of cycles[i]) {
        console.log(`    → ${relative(paiDir, id)}`);
      }
      console.log('');
    }
  }
}

function runDot(graph: ContextGraph): void {
  const lines: string[] = [
    'digraph context {',
    '  rankdir=LR;',
    '  node [shape=box, fontsize=10];',
    '',
  ];

  // Group nodes by skill
  const skillGroups = new Map<string, ContextNode[]>();
  const ungrouped: ContextNode[] = [];

  for (const node of graph.nodes.values()) {
    if (node.skillName) {
      if (!skillGroups.has(node.skillName)) skillGroups.set(node.skillName, []);
      skillGroups.get(node.skillName)!.push(node);
    } else {
      ungrouped.push(node);
    }
  }

  // Skill subgraphs
  for (const [skillName, nodes] of skillGroups) {
    lines.push(`  subgraph cluster_${skillName.replace(/[^a-zA-Z0-9]/g, '_')} {`);
    lines.push(`    label="${skillName}";`);
    for (const node of nodes) {
      const label = node.relativePath.split('/').pop() || node.relativePath;
      const style = node.kind === 'skill' ? ' [style=filled, fillcolor="#e8f5e9"]' : '';
      lines.push(`    "${node.relativePath}"${style};`);
    }
    lines.push('  }');
    lines.push('');
  }

  // Ungrouped nodes
  for (const node of ungrouped) {
    lines.push(`  "${node.relativePath}";`);
  }
  if (ungrouped.length > 0) lines.push('');

  // Edges
  for (const edge of graph.edges) {
    const srcNode = graph.nodes.get(edge.source);
    const tgtNode = graph.nodes.get(edge.target);
    if (srcNode && tgtNode) {
      lines.push(`  "${srcNode.relativePath}" -> "${tgtNode.relativePath}" [label="${edge.type}"];`);
    }
  }

  lines.push('}');
  console.log(lines.join('\n'));
}

function runAudit(graph: ContextGraph): void {
  if (jsonOutput) {
    const scanReport = scan(graph);
    const orphanReport = findOrphans(graph);
    const cycles = detectCycles(graph);
    console.log(JSON.stringify({ scan: scanReport, orphans: {
      unreferencedFiles: orphanReport.unreferencedFiles.map(n => ({
        path: n.relativePath,
        tier: n.tier,
        tokenEstimate: n.tokenEstimate,
      })),
      brokenReferences: orphanReport.brokenReferences,
    }, cycles }, null, 2));
    return;
  }

  console.log('=== CONTEXT GRAPH AUDIT ===\n');

  runScan(graph);
  console.log('\n---\n');

  runOrphans(graph);
  console.log('\n---\n');

  runCycles(graph);
}

// Main
function main(): void {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: context-graph <command> [options]

Commands:
  scan              Graph stats: node/edge counts, per-tier and per-skill token totals
  orphans           Find unreferenced files and broken references
  impact <file>     Show what depends on a file (direct + transitive)
  cycles            Detect circular dependencies
  dot               Output DOT format for visualization
  audit             Full report: scan + orphans + cycles + top bloated skills

Options:
  --json            JSON output
  --pai-dir <path>  Override PAI_DIR (default: from environment)`);
    process.exit(0);
  }

  const graph = buildGraph(paiDirOverride);

  switch (command) {
    case 'scan':
      runScan(graph);
      break;
    case 'orphans':
      runOrphans(graph);
      break;
    case 'impact': {
      const fileArg = args.find(a => a !== command && !a.startsWith('-') && a !== paiDirOverride);
      if (!fileArg) {
        console.error('Usage: context-graph impact <file>');
        process.exit(1);
      }
      runImpact(graph, fileArg);
      break;
    }
    case 'cycles':
      runCycles(graph);
      break;
    case 'dot':
      runDot(graph);
      break;
    case 'audit':
      runAudit(graph);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
