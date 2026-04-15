/**
 * Context Graph Analysis
 *
 * Graph construction and analysis algorithms:
 * buildGraph, scan, findOrphans, analyzeImpact, detectCycles
 */

import { join } from 'path';
import { existsSync } from 'fs';
import { PAI_DIR } from '../pai-paths';
import { scanAll } from './scanner';
import type {
  ContextGraph,
  ContextEdge,
  ScanReport,
  OrphanReport,
  ImpactReport,
} from './types';

/**
 * Build the context graph: nodes, edges, adjacency maps
 */
export function buildGraph(paiDir: string = PAI_DIR): ContextGraph {
  const { nodes: nodeList, edges } = scanAll(paiDir);

  const nodes = new Map(nodeList.map(n => [n.id, n]));
  const adjacency = new Map<string, ContextEdge[]>();
  const reverseAdjacency = new Map<string, ContextEdge[]>();

  // Initialize maps for all nodes
  for (const id of nodes.keys()) {
    adjacency.set(id, []);
    reverseAdjacency.set(id, []);
  }

  // Populate adjacency maps
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge);

    if (!reverseAdjacency.has(edge.target)) reverseAdjacency.set(edge.target, []);
    reverseAdjacency.get(edge.target)!.push(edge);
  }

  return { nodes, edges, adjacency, reverseAdjacency };
}

/**
 * Scan report: node/edge counts, per-tier and per-skill aggregates
 */
export function scan(graph: ContextGraph): ScanReport {
  const tiers: Record<1 | 2 | 3, { count: number; totalTokens: number }> = {
    1: { count: 0, totalTokens: 0 },
    2: { count: 0, totalTokens: 0 },
    3: { count: 0, totalTokens: 0 },
  };

  const skillMap = new Map<string, { fileCount: number; totalTokens: number }>();

  for (const node of graph.nodes.values()) {
    tiers[node.tier].count++;
    tiers[node.tier].totalTokens += node.tokenEstimate;

    if (node.skillName) {
      if (!skillMap.has(node.skillName)) {
        skillMap.set(node.skillName, { fileCount: 0, totalTokens: 0 });
      }
      const skill = skillMap.get(node.skillName)!;
      skill.fileCount++;
      skill.totalTokens += node.tokenEstimate;
    }
  }

  const skills = Array.from(skillMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
    tiers,
    skills,
  };
}

/**
 * Find orphaned files and broken references
 */
export function findOrphans(graph: ContextGraph): OrphanReport {
  // Unreferenced files: nodes with in-degree 0
  const unreferencedFiles = [];
  for (const [id, node] of graph.nodes) {
    // Skip SKILL.md files — they're discovered directly by CC, not via references
    if (node.kind === 'skill') continue;

    const incoming = graph.reverseAdjacency.get(id) || [];
    // Only count edges from nodes that exist in the graph
    const validIncoming = incoming.filter(e => graph.nodes.has(e.source));
    if (validIncoming.length === 0) {
      unreferencedFiles.push(node);
    }
  }

  // Broken references: edges whose target doesn't exist in the node map AND doesn't exist on disk
  // (files that exist on disk but aren't .md — like .ts workflows — are valid, just not scanned)
  const brokenReferences = graph.edges
    .filter(e => !graph.nodes.has(e.target) && !existsSync(e.target))
    .map(e => ({
      source: e.source,
      target: e.target,
      lineNumber: e.lineNumber,
    }));

  return { unreferencedFiles, brokenReferences };
}

/**
 * Impact analysis: what depends on a given file (BFS on reverse adjacency)
 */
export function analyzeImpact(graph: ContextGraph, filePath: string): ImpactReport {
  // Find the node — try exact match first, then by relativePath
  let targetId = filePath;
  if (!graph.nodes.has(filePath)) {
    for (const [id, node] of graph.nodes) {
      if (node.relativePath === filePath || node.relativePath.endsWith('/' + filePath) || id.endsWith('/' + filePath)) {
        targetId = id;
        break;
      }
    }
  }

  // Direct dependents: nodes that reference the target (deduplicated)
  const directEdges = graph.reverseAdjacency.get(targetId) || [];
  const directIds = [...new Set(directEdges.map(e => e.source))];
  const directDependents = directIds
    .map(id => graph.nodes.get(id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);

  // Transitive dependents: BFS on reverse adjacency
  const visited = new Set<string>();
  const queue = [targetId];
  visited.add(targetId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const incoming = graph.reverseAdjacency.get(current) || [];
    for (const edge of incoming) {
      if (!visited.has(edge.source) && graph.nodes.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  visited.delete(targetId); // Don't include the target itself
  const transitiveDependents = Array.from(visited)
    .map(id => graph.nodes.get(id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);

  // Affected skills
  const affectedSkills = [...new Set(
    transitiveDependents
      .map(n => n.skillName)
      .filter((s): s is string => s !== undefined)
  )].sort();

  return { directDependents, transitiveDependents, affectedSkills };
}

/**
 * Detect circular dependencies using Tarjan's SCC algorithm.
 *
 * Only considers load-order edges (READ, INVOKE) — these represent actual
 * "must load A before B" dependencies. SEE/TABLE edges are informational
 * documentation cross-references (bullet lists, prose mentions) where mutual
 * reference is a feature, not a cycle.
 *
 * Returns arrays of node IDs forming each cycle (SCCs with size > 1).
 */
export function detectCycles(graph: ContextGraph): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const sccs: string[][] = [];

  function strongconnect(v: string): void {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const edges = (graph.adjacency.get(v) || []).filter(
      e => e.type === 'READ' || e.type === 'INVOKE'
    );
    for (const edge of edges) {
      const w = edge.target;
      // Only consider edges to nodes that exist in the graph
      if (!graph.nodes.has(w)) continue;

      if (!indices.has(w)) {
        strongconnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      // Only report SCCs with more than 1 node (actual cycles)
      if (scc.length > 1) {
        sccs.push(scc);
      }
    }
  }

  for (const v of graph.nodes.keys()) {
    if (!indices.has(v)) {
      strongconnect(v);
    }
  }

  return sccs;
}
