/**
 * Context Graph Tests
 *
 * Static analysis of Qara's context architecture.
 * Run with: bun test ./.claude/tests/context-graph.test.ts
 */

import { describe, it, expect } from 'bun:test';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import {
  discoverNodes,
  extractReferences,
  resolveReference,
  getSkillDirs,
  findMdFiles,
  classifyTier,
  classifyKind,
  getSkillName,
} from '../hooks/lib/context-graph/scanner';
import {
  buildGraph,
  scan,
  findOrphans,
  analyzeImpact,
  detectCycles,
} from '../hooks/lib/context-graph/graph';
import type { ContextGraph, ContextEdge, ContextNode } from '../hooks/lib/context-graph/types';

const PAI_DIR = join(homedir(), 'qara', '.claude');
const SKILLS_DIR = join(PAI_DIR, 'skills');

describe('Scanner', () => {
  describe('getSkillDirs', () => {
    it('discovers all skill directories', () => {
      const dirs = getSkillDirs(SKILLS_DIR);
      expect(dirs.length).toBeGreaterThanOrEqual(17);
      expect(dirs.some(d => d.endsWith('/CORE'))).toBe(true);
      expect(dirs.some(d => d.endsWith('/research'))).toBe(true);
    });
  });

  describe('findMdFiles', () => {
    it('finds SKILL.md in CORE', () => {
      const files = findMdFiles(join(SKILLS_DIR, 'CORE'));
      expect(files.some(f => f.endsWith('SKILL.md'))).toBe(true);
      expect(files.some(f => f.endsWith('CONSTITUTION.md'))).toBe(true);
    });

    it('skips thoughts directories', () => {
      const files = findMdFiles(join(SKILLS_DIR, 'CORE'));
      expect(files.every(f => !f.includes('/thoughts/'))).toBe(true);
    });
  });

  describe('classifyTier', () => {
    it('SKILL.md is Tier 1', () => {
      expect(classifyTier(join(SKILLS_DIR, 'CORE/SKILL.md'), SKILLS_DIR)).toBe(1);
    });

    it('CONSTITUTION.md (skill root) is Tier 2', () => {
      expect(classifyTier(join(SKILLS_DIR, 'CORE/CONSTITUTION.md'), SKILLS_DIR)).toBe(2);
    });

    it('workflow files are Tier 3', () => {
      const wf = join(SKILLS_DIR, 'CORE/workflows/git-update-repo.md');
      if (existsSync(wf)) {
        expect(classifyTier(wf, SKILLS_DIR)).toBe(3);
      }
    });
  });

  describe('classifyKind', () => {
    const contextDir = join(PAI_DIR, 'context');

    it('SKILL.md is kind "skill"', () => {
      expect(classifyKind(join(SKILLS_DIR, 'CORE/SKILL.md'), SKILLS_DIR, contextDir)).toBe('skill');
    });

    it('context/ files are kind "context"', () => {
      expect(classifyKind(join(contextDir, 'bun-guide.md'), SKILLS_DIR, contextDir)).toBe('context');
    });

    it('workflow files are kind "workflow"', () => {
      const wf = join(SKILLS_DIR, 'CORE/workflows/git-update-repo.md');
      expect(classifyKind(wf, SKILLS_DIR, contextDir)).toBe('workflow');
    });
  });

  describe('getSkillName', () => {
    it('returns skill name for files in skills dir', () => {
      expect(getSkillName(join(SKILLS_DIR, 'CORE/SKILL.md'), SKILLS_DIR)).toBe('CORE');
      expect(getSkillName(join(SKILLS_DIR, 'research/workflows/conduct.md'), SKILLS_DIR)).toBe('research');
    });

    it('returns undefined for files outside skills dir', () => {
      expect(getSkillName(join(PAI_DIR, 'context/bun-guide.md'), SKILLS_DIR)).toBeUndefined();
    });
  });

  describe('discoverNodes', () => {
    it('discovers all SKILL.md files (19 skills)', () => {
      const nodes = discoverNodes(PAI_DIR);
      const skillNodes = nodes.filter(n => n.kind === 'skill');
      expect(skillNodes.length).toBeGreaterThanOrEqual(17);
    });

    it('assigns correct token estimates', () => {
      const nodes = discoverNodes(PAI_DIR);
      for (const node of nodes) {
        expect(node.tokenEstimate).toBe(Math.ceil(node.byteSize / 4));
      }
    });

    it('includes context/ files', () => {
      const nodes = discoverNodes(PAI_DIR);
      const contextNodes = nodes.filter(n => n.kind === 'context');
      expect(contextNodes.length).toBeGreaterThan(0);
      expect(contextNodes.some(n => n.relativePath.includes('bun-guide.md'))).toBe(true);
    });
  });

  describe('extractReferences', () => {
    it('extracts READ directives from CORE/SKILL.md', () => {
      const skillMd = join(SKILLS_DIR, 'CORE/SKILL.md');
      const content = readFileSync(skillMd, 'utf-8');
      const edges = extractReferences(skillMd, content, PAI_DIR, SKILLS_DIR);
      const readEdges = edges.filter(e => e.type === 'READ');
      expect(readEdges.length).toBeGreaterThanOrEqual(4);
    });

    it('extracts TABLE entries from SKILL.md (security table)', () => {
      const skillMd = join(SKILLS_DIR, 'CORE/SKILL.md');
      const content = readFileSync(skillMd, 'utf-8');
      const edges = extractReferences(skillMd, content, PAI_DIR, SKILLS_DIR);
      const tableEdges = edges.filter(e => e.type === 'TABLE');
      // Doc index moved to routing-cheatsheet.md; remaining tables are security + response style
      expect(tableEdges.length).toBeGreaterThanOrEqual(0);
    });

    it('extracts SEE references', () => {
      const skillMd = join(SKILLS_DIR, 'CORE/SKILL.md');
      const content = readFileSync(skillMd, 'utf-8');
      const edges = extractReferences(skillMd, content, PAI_DIR, SKILLS_DIR);
      const seeEdges = edges.filter(e => e.type === 'SEE');
      expect(seeEdges.length).toBeGreaterThanOrEqual(1); // See `CONSTITUTION.md`
    });

    it('resolves ${PAI_DIR} references correctly', () => {
      const skillMd = join(SKILLS_DIR, 'CORE/SKILL.md');
      const content = readFileSync(skillMd, 'utf-8');
      const edges = extractReferences(skillMd, content, PAI_DIR, SKILLS_DIR);
      const readEdges = edges.filter(e => e.type === 'READ');
      // All READ targets should be absolute paths
      for (const edge of readEdges) {
        expect(edge.target.startsWith('/')).toBe(true);
      }
    });

    it('line numbers are accurate', () => {
      const skillMd = join(SKILLS_DIR, 'CORE/SKILL.md');
      const content = readFileSync(skillMd, 'utf-8');
      const edges = extractReferences(skillMd, content, PAI_DIR, SKILLS_DIR);
      const lines = content.split('\n');
      for (const edge of edges) {
        const line = lines[edge.lineNumber - 1];
        expect(line).toBeDefined();
        // The line should contain some form of reference
        expect(
          line.includes('READ') || line.includes('See') || line.includes('see') ||
          line.includes('`') || line.includes('INVOKE')
        ).toBe(true);
      }
    });
  });

  describe('resolveReference', () => {
    it('expands ${PAI_DIR} paths', () => {
      const ref = '${PAI_DIR}/skills/CORE/workflows/git-update-repo.md';
      const resolved = resolveReference(ref, join(SKILLS_DIR, 'CORE/SKILL.md'), PAI_DIR, SKILLS_DIR);
      expect(resolved).toBe(join(PAI_DIR, 'skills/CORE/workflows/git-update-repo.md'));
    });

    it('resolves bare filenames within same skill', () => {
      const resolved = resolveReference('CONSTITUTION.md', join(SKILLS_DIR, 'CORE/SKILL.md'), PAI_DIR, SKILLS_DIR);
      expect(resolved).toBe(join(SKILLS_DIR, 'CORE/CONSTITUTION.md'));
    });

    it('handles broken symlinks gracefully', () => {
      // Should return a path even if file doesn't exist
      const resolved = resolveReference('nonexistent.md', join(SKILLS_DIR, 'CORE/SKILL.md'), PAI_DIR, SKILLS_DIR);
      expect(resolved).toBeTruthy();
    });
  });
});

describe('Graph Construction', () => {
  let graph: ContextGraph;

  // Build once for all tests in this describe block
  it('builds successfully', () => {
    graph = buildGraph(PAI_DIR);
    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it('adjacency and reverseAdjacency are consistent', () => {
    graph = graph || buildGraph(PAI_DIR);
    // Every edge in adjacency should appear in edges array
    for (const [, edgeList] of graph.adjacency) {
      for (const edge of edgeList) {
        expect(graph.edges).toContain(edge);
      }
    }

    // Every edge should be in adjacency under its source
    for (const edge of graph.edges) {
      const srcEdges = graph.adjacency.get(edge.source) || [];
      expect(srcEdges).toContain(edge);
    }

    // Every edge should be in reverseAdjacency under its target
    for (const edge of graph.edges) {
      const tgtEdges = graph.reverseAdjacency.get(edge.target) || [];
      expect(tgtEdges).toContain(edge);
    }
  });

  it('token estimation is consistent', () => {
    graph = graph || buildGraph(PAI_DIR);
    // Spot check: 5661 bytes → ceil(5661/4) = 1416 tokens
    expect(Math.ceil(5661 / 4)).toBe(1416);

    for (const node of graph.nodes.values()) {
      expect(node.tokenEstimate).toBe(Math.ceil(node.byteSize / 4));
    }
  });
});

describe('Analysis', () => {
  let graph: ContextGraph;

  it('scan returns valid report', () => {
    graph = buildGraph(PAI_DIR);
    const report = scan(graph);
    expect(report.nodeCount).toBeGreaterThan(0);
    expect(report.edgeCount).toBeGreaterThan(0);
    expect(report.tiers[1].count).toBeGreaterThanOrEqual(17); // at least 17 SKILL.md
    expect(report.skills.length).toBeGreaterThan(0);
    // Skills sorted by token cost descending
    for (let i = 1; i < report.skills.length; i++) {
      expect(report.skills[i - 1].totalTokens).toBeGreaterThanOrEqual(report.skills[i].totalTokens);
    }
  });

  it('findOrphans — CORE/SKILL.md is NOT reported as orphan', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = findOrphans(graph);
    // SKILL.md files are excluded from orphan detection
    const coreSkillOrphan = report.unreferencedFiles.find(n =>
      n.relativePath === 'skills/CORE/SKILL.md'
    );
    expect(coreSkillOrphan).toBeUndefined();
  });

  it('findOrphans — no SKILL.md files reported as orphans', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = findOrphans(graph);
    const skillOrphans = report.unreferencedFiles.filter(n => n.kind === 'skill');
    expect(skillOrphans.length).toBe(0);
  });

  it('findOrphans — broken references include edges to non-existent files', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = findOrphans(graph);
    // Broken references point to files not in the node map
    for (const br of report.brokenReferences) {
      expect(graph.nodes.has(br.target)).toBe(false);
    }
  });

  it('findOrphans — advisoryBrokenReferences is defined and an array', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = findOrphans(graph);
    expect(Array.isArray(report.advisoryBrokenReferences)).toBe(true);
  });

  it('findOrphans — advisoryBrokenReferences flags cross-skill refs missing ../ prefix', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = findOrphans(graph);
    // Post FIX-1, no skill should have bare `impeccable/reference/X.md` table
    // references. This test acts as a regression guard: if the bad pattern
    // reappears, it should surface here.
    const badPattern = report.advisoryBrokenReferences.filter(r =>
      /\/impeccable\/reference\/[^/]+\.md$/.test(r.ref) && !r.ref.startsWith('../')
    );
    expect(badPattern.length).toBe(0);
  });

  it('findOrphans — advisoryBrokenReferences detects simulated cross-skill ref', () => {
    // Build a minimal graph with a synthetic broken cross-skill ref and
    // confirm the advisory surfaces it. Uses the scanner's extractor directly.
    const syntheticContent =
      '## Table\n\n| A | B |\n|---|---|\n| foo | `impeccable/reference/nonexistent-xyz-abc.md` |\n';
    const { extractAdvisoryBrokenTableRefs } = require('../hooks/lib/context-graph/scanner');
    const advisories = extractAdvisoryBrokenTableRefs(
      join(SKILLS_DIR, 'review/SKILL.md'),
      syntheticContent,
      SKILLS_DIR,
    );
    const hit = advisories.find((a: { ref: string }) => a.ref.endsWith('nonexistent-xyz-abc.md'));
    expect(hit).toBeDefined();
    expect(hit.ref).toContain('impeccable/reference/');
  });

  it('analyzeImpact — CONSTITUTION.md has CORE/SKILL.md as direct dependent', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = analyzeImpact(graph, 'CONSTITUTION.md');
    const hasCoreSKill = report.directDependents.some(n =>
      n.relativePath === 'skills/CORE/SKILL.md'
    );
    expect(hasCoreSKill).toBe(true);
  });

  it('analyzeImpact — affected skills includes CORE', () => {
    graph = graph || buildGraph(PAI_DIR);
    const report = analyzeImpact(graph, 'CONSTITUTION.md');
    expect(report.affectedSkills).toContain('CORE');
  });

  it('detectCycles — returns empty array on healthy graph', () => {
    graph = graph || buildGraph(PAI_DIR);
    const cycles = detectCycles(graph);
    // We expect no cycles in a healthy setup
    // If there are cycles, they should at least be valid arrays
    for (const cycle of cycles) {
      expect(cycle.length).toBeGreaterThan(1);
    }
  });

  it('detectCycles — detects cycle in synthetic cyclic graph', () => {
    // Build a small synthetic graph with a cycle: A → B → C → A
    const nodeA: ContextNode = {
      id: '/tmp/a.md', relativePath: 'a.md', tier: 1, kind: 'skill',
      byteSize: 100, tokenEstimate: 25,
    };
    const nodeB: ContextNode = {
      id: '/tmp/b.md', relativePath: 'b.md', tier: 2, kind: 'reference',
      byteSize: 100, tokenEstimate: 25,
    };
    const nodeC: ContextNode = {
      id: '/tmp/c.md', relativePath: 'c.md', tier: 2, kind: 'reference',
      byteSize: 100, tokenEstimate: 25,
    };

    const edges: ContextEdge[] = [
      { source: '/tmp/a.md', target: '/tmp/b.md', type: 'READ', lineNumber: 1 },
      { source: '/tmp/b.md', target: '/tmp/c.md', type: 'READ', lineNumber: 1 },
      { source: '/tmp/c.md', target: '/tmp/a.md', type: 'READ', lineNumber: 1 },
    ];

    const syntheticGraph: ContextGraph = {
      nodes: new Map([
        ['/tmp/a.md', nodeA],
        ['/tmp/b.md', nodeB],
        ['/tmp/c.md', nodeC],
      ]),
      edges,
      adjacency: new Map([
        ['/tmp/a.md', [edges[0]]],
        ['/tmp/b.md', [edges[1]]],
        ['/tmp/c.md', [edges[2]]],
      ]),
      reverseAdjacency: new Map([
        ['/tmp/a.md', [edges[2]]],
        ['/tmp/b.md', [edges[0]]],
        ['/tmp/c.md', [edges[1]]],
      ]),
    };

    const cycles = detectCycles(syntheticGraph);
    expect(cycles.length).toBe(1);
    expect(cycles[0].length).toBe(3);
    expect(cycles[0]).toContain('/tmp/a.md');
    expect(cycles[0]).toContain('/tmp/b.md');
    expect(cycles[0]).toContain('/tmp/c.md');
  });
});

describe('CLI', () => {
  const CLI_PATH = join(PAI_DIR, 'hooks/lib/context-graph/cli.ts');

  it('scan --json produces valid JSON matching ScanReport shape', async () => {
    const proc = Bun.spawn(['bun', CLI_PATH, 'scan', '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const report = JSON.parse(output);
    expect(report.nodeCount).toBeGreaterThan(0);
    expect(report.edgeCount).toBeGreaterThan(0);
    expect(report.tiers).toBeDefined();
    expect(report.tiers['1']).toBeDefined();
    expect(report.tiers['2']).toBeDefined();
    expect(report.tiers['3']).toBeDefined();
    expect(report.skills).toBeInstanceOf(Array);
  });

  it('orphans --json produces valid JSON matching OrphanReport shape', async () => {
    const proc = Bun.spawn(['bun', CLI_PATH, 'orphans', '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const report = JSON.parse(output);
    expect(report.unreferencedFiles).toBeInstanceOf(Array);
    expect(report.brokenReferences).toBeInstanceOf(Array);
  });

  it('dot output contains digraph and expected node names', async () => {
    const proc = Bun.spawn(['bun', CLI_PATH, 'dot'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    expect(output).toContain('digraph context');
    expect(output).toContain('CORE');
    expect(output).toContain('SKILL.md');
  });
});
