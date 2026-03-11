/**
 * Context Graph — Public API
 *
 * Static analysis of Qara's context architecture.
 */

export type {
  ContextNode,
  ContextEdge,
  ContextGraph,
  ScanReport,
  OrphanReport,
  ImpactReport,
} from './types';

export {
  discoverNodes,
  extractReferences,
  resolveReference,
  resolveRealPaiDir,
  scanAll,
  getSkillDirs,
  findMdFiles,
  classifyTier,
  classifyKind,
  getSkillName,
} from './scanner';

export {
  buildGraph,
  scan,
  findOrphans,
  analyzeImpact,
  detectCycles,
} from './graph';
