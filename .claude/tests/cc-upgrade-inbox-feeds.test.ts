/**
 * cc-upgrade-inbox feeds — unit tests.
 *
 * One describe block per feed covering happy path + at least one edge case.
 * Feeds are pure transforms over upstream reports / state, so these tests
 * construct synthetic inputs rather than running the full audit pipeline.
 */

import { describe, it, expect } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { ccFeatureFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/cc-feature';
import { orphansFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/orphans';
import { advisoryRefsFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/advisory-refs';
import { crossSkillRefsFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/cross-skill-refs';
import { skillPulseFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/skill-pulse';
import { paiAuditFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/pai-audit';
import { externalSkillsFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/external-skills';
import { featureUnusedFeed } from '../hooks/lib/cc-upgrade-inbox/feeds/feature-unused';
import { emptyInboxState } from '../hooks/lib/cc-upgrade-inbox/types';
import type { OrphanReport } from '../hooks/lib/context-graph/types';
import type { Report } from '../skills/cc-upgrade/scripts/shared';
import type {
  PulseReport,
  SkillPulseEntry,
  InstalledSkill,
  UpstreamData,
} from '../skills/cc-upgrade/scripts/skill-pulse-lib';

// Suppress CLI side-effects when cc-feature-sync is transitively imported.
process.env.CC_FEATURE_SYNC_NO_CLI = '1';

// ── Shared fixture helpers ─────────────────────────────────────────────────

function emptyOrphanReport(
  overrides: Partial<OrphanReport> = {},
): OrphanReport {
  return {
    unreferencedFiles: [],
    brokenReferences: [],
    advisoryBrokenReferences: [],
    ...overrides,
  };
}

function makeReport(recommendations: Report['recommendations']): Report {
  return {
    timestamp: 'now',
    targetPath: '/repo',
    modules: {},
    totalScore: 100,
    maxScore: 200,
    recommendations,
    compliancePercentage: 50,
  };
}

function makeInstalledSkill(
  name: string,
  maintenance: 'upstream' | 'local',
  overrides: Partial<InstalledSkill> = {},
): InstalledSkill {
  return {
    name,
    symlinkTarget: '',
    installedVersion: '1.0.0',
    githubRepo: `owner/${name}`,
    installedAt: null,
    updatedAt: null,
    maintenance,
    ...overrides,
  };
}

function makeUpstream(latestTag: string | null): UpstreamData {
  return {
    latestTag,
    latestCommitDate: '2026-04-01',
    stars: null,
    openIssues: null,
    defaultBranch: null,
    fetchError: null,
  };
}

function makePulseReport(entries: SkillPulseEntry[]): PulseReport {
  return {
    timestamp: 'now',
    skillsPath: '/skills',
    total: entries.length,
    withGithubRepo: entries.filter(e => e.skill.githubRepo).length,
    outdated: entries.filter(e => e.isOutdated).length,
    stale: entries.filter(e => e.activityStatus === 'stale').length,
    lockFilePresent: true,
    entries,
  };
}

/**
 * Build a single SkillPulseEntry with sensible defaults. Tests override
 * only the fields they care about (skill maintenance, upstream tag, etc.).
 */
function makePulseEntry(
  name: string,
  maintenance: 'upstream' | 'local',
  overrides: Partial<SkillPulseEntry> = {},
): SkillPulseEntry {
  return {
    skill: makeInstalledSkill(name, maintenance),
    upstream: makeUpstream('2.0.0'),
    isOutdated: true,
    daysSinceUpstreamCommit: 5,
    activityStatus: 'active',
    ...overrides,
  };
}

/**
 * Single-orphan test fixture — emits a synthetic ContextNode representing
 * an unreferenced file at the given path.
 */
function makeOrphanNode(id: string, relativePath: string, skillName?: string) {
  return {
    id,
    relativePath,
    tier: 3 as const,
    kind: 'workflow' as const,
    byteSize: 100,
    tokenEstimate: 25,
    skillName,
  };
}

// ── cc-feature ──────────────────────────────────────────────────────────────

describe('ccFeatureFeed', () => {
  const SAMPLE_CHANGELOG = `# Changelog

## [99.9.9] - 2099-01-01

- Add a brand-new totally-untracked feature
`;

  it('emits a finding for a new untracked candidate', () => {
    const findings = ccFeatureFeed({
      changelogContent: SAMPLE_CHANGELOG,
      state: emptyInboxState(),
    });
    expect(findings.length).toBe(1);
    expect(findings[0].feed).toBe('cc-feature');
    expect(findings[0].id.startsWith('cc-feature:')).toBe(true);
    expect(findings[0].tier).toBe('safe');
  });

  it('returns empty when the baseline already covers every version', () => {
    const state = {
      ...emptyInboxState(),
      lastReviewedVersion: { 'cc-feature': '99.9.9' },
    };
    const findings = ccFeatureFeed({ changelogContent: SAMPLE_CHANGELOG, state });
    expect(findings).toEqual([]);
  });
});

// ── orphans ─────────────────────────────────────────────────────────────────

describe('orphansFeed', () => {
  const skillsDir = '/tmp/skills';

  it('emits one orphan finding per unreferenced node', () => {
    const orphanReport = emptyOrphanReport({
      unreferencedFiles: [
        makeOrphanNode(
          '/tmp/skills/review/workflows/x.md',
          'skills/review/workflows/x.md',
          'review',
        ),
      ],
    });
    const findings = orphansFeed({ orphanReport, skillsDir });
    expect(findings.length).toBe(1);
    expect(findings[0].feed).toBe('orphan');
    expect(findings[0].tier).toBe('unsafe'); // deletion is destructive
  });

  it('emits a broken-ref finding per broken reference', () => {
    const orphanReport = emptyOrphanReport({
      brokenReferences: [
        {
          source: '/tmp/skills/review/SKILL.md',
          target: '/tmp/skills/review/missing.md',
          lineNumber: 42,
        },
      ],
    });
    const findings = orphansFeed({ orphanReport, skillsDir });
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].data?.lineNumber).toBe(42);
  });

  it('returns empty when nothing is orphaned', () => {
    expect(orphansFeed({ orphanReport: emptyOrphanReport(), skillsDir })).toEqual([]);
  });
});

// ── advisory-refs ───────────────────────────────────────────────────────────

describe('advisoryRefsFeed', () => {
  const skillsDir = '/tmp/skills';

  it('emits one advisory finding per broken table ref', () => {
    const orphanReport = emptyOrphanReport({
      advisoryBrokenReferences: [
        {
          source: '/tmp/skills/review/SKILL.md',
          ref: 'impeccable/reference/X.md',
          lineNumber: 17,
        },
      ],
    });
    const findings = advisoryRefsFeed({ orphanReport, skillsDir });
    expect(findings.length).toBe(1);
    expect(findings[0].feed).toBe('advisory-table-ref');
    expect(findings[0].tier).toBe('safe');
    expect(findings[0].variant).toBe('impeccable/reference/X.md');
  });

  it('returns empty when there are no advisory refs', () => {
    expect(advisoryRefsFeed({ orphanReport: emptyOrphanReport(), skillsDir })).toEqual([]);
  });
});

// ── cross-skill-refs ────────────────────────────────────────────────────────

describe('crossSkillRefsFeed', () => {
  it('emits a finding for each unprefixed cross-skill ref', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'css-ref-'));
    try {
      const skillsDir = join(workDir, 'skills');
      mkdirSync(join(skillsDir, 'review'), { recursive: true });
      mkdirSync(join(skillsDir, 'impeccable'), { recursive: true });
      writeFileSync(
        join(skillsDir, 'review', 'SKILL.md'),
        '---\nname: review\n---\n\nSee `impeccable/reference/X.md` for context.\n',
      );

      const findings = crossSkillRefsFeed({ skillsDir });
      expect(findings.length).toBe(1);
      expect(findings[0].feed).toBe('cross-skill-unprefixed');
      expect(findings[0].skillName).toBe('review');
      expect(findings[0].tier).toBe('safe');
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it('returns empty when skillsDir does not exist', () => {
    expect(crossSkillRefsFeed({ skillsDir: '/nonexistent/path' })).toEqual([]);
  });
});

// ── skill-pulse ─────────────────────────────────────────────────────────────

describe('skillPulseFeed', () => {
  it('skips PAI-local skills (maintenance: "local")', () => {
    const pulseReport = makePulseReport([makePulseEntry('impeccable', 'local')]);
    expect(skillPulseFeed({ pulseReport })).toEqual([]);
  });

  it('emits a skill-outdated finding for upstream-tracked outdated skills', () => {
    const pulseReport = makePulseReport([makePulseEntry('visual-explainer', 'upstream')]);
    const findings = skillPulseFeed({ pulseReport });
    expect(findings.length).toBe(1);
    expect(findings[0].id).toBe('skill-outdated:visual-explainer');
    expect(findings[0].tier).toBe('safe');
  });
});

// ── pai-audit ───────────────────────────────────────────────────────────────

describe('paiAuditFeed', () => {
  it('emits one finding per recommendation', () => {
    const report = makeReport([
      { module: 'tddCompliance', recommendation: 'Add pre-tool-use-tdd.ts hook' },
    ]);
    const findings = paiAuditFeed({ report });
    expect(findings.length).toBe(1);
    expect(findings[0].feed).toBe('pai-audit');
    expect(findings[0].tier).toBe('unsafe');
  });
});

// ── external-skills ─────────────────────────────────────────────────────────

describe('externalSkillsFeed', () => {
  it('emits one finding per recommendation', () => {
    const report = makeReport([
      { module: 'symlinkHealth', recommendation: 'Fix broken symlink: harden' },
    ]);
    const findings = externalSkillsFeed({ report });
    expect(findings.length).toBe(1);
    expect(findings[0].feed).toBe('external-skills');
  });
});

// ── feature-unused ──────────────────────────────────────────────────────────

describe('featureUnusedFeed', () => {
  it('emits findings only for supported + not-in-use + detectable features', () => {
    const findings = featureUnusedFeed({
      featureStatus: {
        askUserQuestion: {
          description: 'Interactive prompts',
          minVersion: '2.1.0',
          supported: true,
          inUse: false,
        },
        webSearch: {
          description: 'Built-in web search',
          minVersion: '2.1.0',
          supported: true,
          inUse: true, // skip
        },
        modelRouting: {
          description: 'Per-task model selection',
          minVersion: '2.0.0',
          supported: false, // skip
          inUse: false,
        },
        bedrock: {
          description: 'AWS Bedrock backend',
          minVersion: '2.0.0',
          supported: true,
          inUse: false,
        },
      },
      detectable: { bedrock: false },
    });

    expect(findings.length).toBe(1);
    expect(findings[0].id).toBe('feature-unused:askUserQuestion');
  });
});
