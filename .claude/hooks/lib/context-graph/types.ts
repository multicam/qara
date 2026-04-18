/**
 * Context Graph Types
 *
 * Interfaces for static analysis of Qara's context architecture.
 */

export interface ContextNode {
  id: string;              // absolute path (canonical key)
  relativePath: string;    // display path relative to PAI_DIR
  tier: 1 | 2 | 3;        // progressive disclosure level
  kind: 'skill' | 'workflow' | 'reference' | 'context' | 'documentation';
  byteSize: number;
  tokenEstimate: number;   // Math.ceil(byteSize / 4)
  skillName?: string;      // owning skill (if any)
}

export interface ContextEdge {
  source: string;          // node id (absolute path)
  target: string;          // node id (absolute path)
  type: 'READ' | 'INVOKE' | 'SEE' | 'TABLE';
  lineNumber: number;      // where the reference occurs in source file
}

export interface ContextGraph {
  nodes: Map<string, ContextNode>;
  edges: ContextEdge[];
  adjacency: Map<string, ContextEdge[]>;       // source → outgoing
  reverseAdjacency: Map<string, ContextEdge[]>; // target → incoming
}

export interface ScanReport {
  nodeCount: number;
  edgeCount: number;
  tiers: Record<1 | 2 | 3, { count: number; totalTokens: number }>;
  skills: Array<{ name: string; fileCount: number; totalTokens: number }>;
}

export interface OrphanReport {
  unreferencedFiles: ContextNode[];
  brokenReferences: Array<{
    source: string;
    target: string;
    lineNumber: number;
  }>;
  /**
   * Advisory (non-blocking) broken references: table-cell refs whose first path
   * segment matches a sibling skill directory name but whose target does not
   * exist. Captures the "missing `../` prefix" pattern (e.g., a review skill
   * referencing `impeccable/reference/X.md` when it should be `../impeccable/reference/X.md`).
   * False positives are possible (e.g., cc-upgrade-pai's upstream documentation
   * tables), which is why these are advisory rather than errors.
   */
  advisoryBrokenReferences: Array<{
    source: string;
    ref: string;
    lineNumber: number;
  }>;
}

export interface ImpactReport {
  directDependents: ContextNode[];
  transitiveDependents: ContextNode[];
  affectedSkills: string[];
}
