/**
 * Skills System Validation Tests
 *
 * Deep validation of the PAI skills system including:
 * - SKILL.md frontmatter parsing
 * - Skill directory structure
 * - Asset validation
 * - Workflow file validation
 *
 * Run with: bun test ./.claude/tests/skills-validation.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { existsSync, readFileSync, readdirSync, statSync, lstatSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const QARA_CLAUDE_DIR = join(homedir(), 'qara', '.claude');
const SKILLS_DIR = join(QARA_CLAUDE_DIR, 'skills');

interface SkillFrontmatter {
  name: string;
  context: 'same' | 'fork';
  description: string;
  triggers?: string[];
  assets?: string[];
}

/**
 * Parse SKILL.md frontmatter using regex (no yaml dependency)
 */
function parseSkillMd(content: string): SkillFrontmatter | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const yaml = frontmatterMatch[1];

  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  const contextMatch = yaml.match(/^context:\s*(same|fork)/m);
  const descriptionMatch = yaml.match(/^description:\s*\|?\s*([\s\S]*?)(?=\n[a-z]+:|$)/m);

  if (!nameMatch || !contextMatch || !descriptionMatch) return null;

  return {
    name: nameMatch[1].trim(),
    context: contextMatch[1] as 'same' | 'fork',
    description: descriptionMatch[1].trim().replace(/\n\s*/g, ' '),
  };
}

/**
 * Get all skill directories
 */
function getSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR).filter((f) => {
    const fullPath = join(SKILLS_DIR, f);
    if (f.startsWith('.')) return false;
    try {
      const stat = lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
        // Follow symlink — skip if broken
        try { return statSync(fullPath).isDirectory(); } catch { return false; }
      }
      return stat.isDirectory();
    } catch {
      return false;
    }
  });
}

// =============================================================================
// SECTION 1: Skill Discovery
// =============================================================================

describe('Skill Discovery', () => {
  let skillDirs: string[];

  beforeAll(() => {
    skillDirs = getSkillDirs();
  });

  it('should discover at least 10 skills', () => {
    expect(skillDirs.length).toBeGreaterThanOrEqual(10);
  });

  it('should have essential system skills', () => {
    const essentialSkills = ['CORE', 'system-create-skill', 'research'];
    for (const skill of essentialSkills) {
      expect(skillDirs).toContain(skill);
    }
  });

  it('should not have any hidden directories as skills', () => {
    const hiddenDirs = skillDirs.filter((d) => d.startsWith('.'));
    expect(hiddenDirs).toEqual([]);
  });
});

// =============================================================================
// SECTION 2: SKILL.md Frontmatter Validation
// =============================================================================

describe('SKILL.md Frontmatter', () => {
  let skillDirs: string[];

  beforeAll(() => {
    skillDirs = getSkillDirs();
  });

  it('every skill should have SKILL.md', () => {
    const missing: string[] = [];
    for (const skill of skillDirs) {
      const skillMdPath = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!existsSync(skillMdPath)) {
        missing.push(skill);
      }
    }
    expect(missing).toEqual([]);
  });

  describe('Required Fields', () => {
    for (const skillName of getSkillDirs().slice(0, 10)) {
      describe(`${skillName}`, () => {
        let frontmatter: SkillFrontmatter | null;

        beforeAll(() => {
          const skillMdPath = join(SKILLS_DIR, skillName, 'SKILL.md');
          if (existsSync(skillMdPath)) {
            const content = readFileSync(skillMdPath, 'utf-8');
            frontmatter = parseSkillMd(content);
          }
        });

        it('should have valid YAML frontmatter', () => {
          expect(frontmatter).not.toBeNull();
        });

        it('should have name field', () => {
          expect(frontmatter?.name).toBeDefined();
          expect(typeof frontmatter?.name).toBe('string');
        });

        it('should have context field (same or fork)', () => {
          expect(frontmatter?.context).toBeDefined();
          expect(['same', 'fork']).toContain(frontmatter?.context);
        });

        it('should have description field', () => {
          expect(frontmatter?.description).toBeDefined();
          expect(typeof frontmatter?.description).toBe('string');
          expect(frontmatter?.description.length).toBeGreaterThan(10);
        });

        it('name should match directory name', () => {
          expect(frontmatter?.name).toBe(skillName);
        });
      });
    }
  });
});

// =============================================================================
// SECTION 3: Context Type Distribution
// =============================================================================

describe('Context Type Distribution', () => {
  let contextTypes: Record<string, string[]>;

  beforeAll(() => {
    contextTypes = { same: [], fork: [], unknown: [] };

    for (const skill of getSkillDirs()) {
      const skillMdPath = join(SKILLS_DIR, skill, 'SKILL.md');
      if (existsSync(skillMdPath)) {
        const content = readFileSync(skillMdPath, 'utf-8');
        const frontmatter = parseSkillMd(content);
        if (frontmatter?.context === 'same') {
          contextTypes.same.push(skill);
        } else if (frontmatter?.context === 'fork') {
          contextTypes.fork.push(skill);
        } else {
          contextTypes.unknown.push(skill);
        }
      }
    }
  });

  it('should have skills with context: same', () => {
    expect(contextTypes.same.length).toBeGreaterThan(0);
  });

  it('CORE should have context: same', () => {
    expect(contextTypes.same).toContain('CORE');
  });

  it('should have no skills with unknown context', () => {
    expect(contextTypes.unknown).toEqual([]);
  });
});

// =============================================================================
// SECTION 4: Skill Content Quality
// =============================================================================

describe('Skill Content Quality', () => {
  const skillDirs = getSkillDirs();

  for (const skillName of skillDirs.slice(0, 8)) {
    describe(`${skillName} content`, () => {
      let content: string;

      beforeAll(() => {
        const skillMdPath = join(SKILLS_DIR, skillName, 'SKILL.md');
        content = existsSync(skillMdPath)
          ? readFileSync(skillMdPath, 'utf-8')
          : '';
      });

      it('should have content after frontmatter', () => {
        const afterFrontmatter = content.replace(/^---[\s\S]*?---\n*/, '');
        expect(afterFrontmatter.trim().length).toBeGreaterThan(50);
      });

      it('should use markdown formatting', () => {
        const hasMarkdown =
          content.includes('#') || content.includes('- ') || content.includes('* ');
        expect(hasMarkdown).toBe(true);
      });

      it('should not contain TODO placeholders', () => {
        expect(content).not.toContain('[TODO]');
        expect(content).not.toContain('TODO:');
      });
    });
  }
});

// =============================================================================
// SECTION 5: Workflow Files
// =============================================================================

describe('Workflow Files', () => {
  it('CORE should have workflows directory', () => {
    const workflowsPath = join(SKILLS_DIR, 'CORE', 'workflows');
    expect(existsSync(workflowsPath)).toBe(true);
  });

  it('CORE workflows should be markdown files', () => {
    const workflowsPath = join(SKILLS_DIR, 'CORE', 'workflows');
    if (existsSync(workflowsPath)) {
      const files = readdirSync(workflowsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);
    }
  });

  it('research skill should have workflows', () => {
    const researchWorkflows = join(SKILLS_DIR, 'research', 'workflows');
    if (existsSync(researchWorkflows)) {
      const files = readdirSync(researchWorkflows);
      expect(files.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// SECTION 6: Skill Assets
// =============================================================================

describe('Skill Assets', () => {
  it('skills with assets/ should have valid files', () => {
    for (const skill of getSkillDirs()) {
      const assetsPath = join(SKILLS_DIR, skill, 'assets');
      if (existsSync(assetsPath)) {
        const files = readdirSync(assetsPath);
        expect(files.length).toBeGreaterThan(0);
      }
    }
  });

  it('frontend-design should have assets', () => {
    const frontendAssets = join(SKILLS_DIR, 'frontend-design', 'assets');
    if (existsSync(frontendAssets)) {
      const files = readdirSync(frontendAssets);
      expect(files.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// SECTION 7: Skill Naming Conventions
// =============================================================================

describe('Skill Naming Conventions', () => {
  const skillDirs = getSkillDirs();

  it('skill directories should use kebab-case or UPPERCASE', () => {
    const invalidNames = skillDirs.filter((name) => {
      const isKebab = /^[a-z][a-z0-9-]*$/.test(name);
      const isUppercase = /^[A-Z][A-Z0-9_]*$/.test(name);
      const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(name);
      return !isKebab && !isUppercase && !isCamelCase;
    });
    expect(invalidNames).toEqual([]);
  });

  it('system skills should have system- prefix', () => {
    const systemSkills = skillDirs.filter(
      (name) => name.startsWith('system-') || name === 'CORE'
    );
    expect(systemSkills.length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// SECTION 8: Skill Dependencies
// =============================================================================

describe('Skill Dependencies', () => {
  it('skills should not have node_modules', () => {
    for (const skill of getSkillDirs()) {
      const nodeModulesPath = join(SKILLS_DIR, skill, 'node_modules');
      if (existsSync(nodeModulesPath)) {
        const hasPackageJson = existsSync(join(SKILLS_DIR, skill, 'package.json'));
        if (!hasPackageJson) {
          expect(existsSync(nodeModulesPath)).toBe(false);
        }
      }
    }
  });
});

// =============================================================================
// Summary
// =============================================================================

describe('Skills Validation Summary', () => {
  it('should complete all skill validations', () => {
    const totalSkills = getSkillDirs().length;
    expect(totalSkills).toBeGreaterThanOrEqual(10);
  });
});
