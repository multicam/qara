/**
 * DevTools MCP Skill Tests
 *
 * Tests for react-grab detection, auto-detect React fields,
 * and MCP verify react-grab checks.
 *
 * Run with: bun test ./.claude/tests/devtools-mcp.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { tmpdir } from 'os';

const SKILL_DIR = join(homedir(), 'qara', '.claude', 'skills', 'devtools-mcp');

// =============================================================================
// SECTION 1: Skill Structure Validation
// =============================================================================

describe('devtools-mcp skill structure', () => {
  it('should have all required files', () => {
    const requiredFiles = [
      'SKILL.md',
      'bin/devtools-mcp',
      'lib/auto-detect.mjs',
      'lib/mcp-verify.mjs',
      'lib/react-grab-detect.mjs',
      'lib/browser-detect.mjs',
      'lib/url-builder.mjs',
      'lib/server-lifecycle.mjs',
      'lib/prompt-builder.mjs',
      'lib/result-parser.mjs',
      'templates/mcp-config.json',
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(SKILL_DIR, file))).toBe(true);
    }
  });

  it('should have all workflow files', () => {
    const workflows = [
      'smoke-test.md',
      'visual-test.md',
      'debug-console.md',
      'component-debug.md',
      'interactive.md',
      'performance.md',
      'accessibility.md',
    ];

    for (const wf of workflows) {
      expect(existsSync(join(SKILL_DIR, 'workflows', wf))).toBe(true);
    }
  });

  it('bin/devtools-mcp should be executable', () => {
    const stat = Bun.file(join(SKILL_DIR, 'bin', 'devtools-mcp'));
    expect(stat).toBeDefined();
  });
});

// =============================================================================
// SECTION 2: react-grab-detect.mjs
// =============================================================================

describe('react-grab-detect module', () => {
  let mod: typeof import('../skills/devtools-mcp/lib/react-grab-detect.mjs');

  beforeAll(async () => {
    mod = await import('../skills/devtools-mcp/lib/react-grab-detect.mjs');
  });

  describe('isReactProject', () => {
    it('should return true for React in dependencies', () => {
      expect(mod.isReactProject({ dependencies: { react: '^18.0.0' } })).toBe(true);
    });

    it('should return true for React in devDependencies', () => {
      expect(mod.isReactProject({ devDependencies: { react: '^18.0.0' } })).toBe(true);
    });

    it('should return false for non-React project', () => {
      expect(mod.isReactProject({ dependencies: { vue: '^3.0.0' } })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(mod.isReactProject(null)).toBe(false);
      expect(mod.isReactProject(undefined)).toBe(false);
    });

    it('should return false for empty dependencies', () => {
      expect(mod.isReactProject({})).toBe(false);
      expect(mod.isReactProject({ dependencies: {} })).toBe(false);
    });
  });

  describe('detectReactFramework', () => {
    it('should detect Next.js', () => {
      expect(mod.detectReactFramework({ dependencies: { next: '^14.0.0' } })).toBe('next');
    });

    it('should detect Gatsby', () => {
      expect(mod.detectReactFramework({ dependencies: { gatsby: '^5.0.0' } })).toBe('gatsby');
    });

    it('should detect CRA', () => {
      expect(mod.detectReactFramework({ dependencies: { 'react-scripts': '^5.0.0' } })).toBe('cra');
    });

    it('should detect Vite', () => {
      expect(mod.detectReactFramework({ devDependencies: { vite: '^5.0.0' } })).toBe('vite');
    });

    it('should return null for non-React framework', () => {
      expect(mod.detectReactFramework({ dependencies: { svelte: '^4.0.0' } })).toBeNull();
    });

    it('should return null for null input', () => {
      expect(mod.detectReactFramework(null)).toBeNull();
    });
  });

  describe('isGrabInstalled', () => {
    it('should detect react-grab in devDependencies', () => {
      expect(mod.isGrabInstalled({ devDependencies: { 'react-grab': '^1.0.0' } })).toBe(true);
    });

    it('should detect @anthropic-ai/react-grab', () => {
      expect(mod.isGrabInstalled({ dependencies: { '@anthropic-ai/react-grab': '^1.0.0' } })).toBe(true);
    });

    it('should return false when not installed', () => {
      expect(mod.isGrabInstalled({ dependencies: { react: '^18.0.0' } })).toBe(false);
    });

    it('should return false for null', () => {
      expect(mod.isGrabInstalled(null)).toBe(false);
    });
  });

  describe('checkGrabScriptInjected', () => {
    const tmpBase = join(tmpdir(), 'devtools-mcp-test-' + Date.now());

    beforeAll(() => {
      mkdirSync(tmpBase, { recursive: true });
    });

    it('should detect react-grab script in Next.js app layout', async () => {
      const projectDir = join(tmpBase, 'next-app-test');
      mkdirSync(join(projectDir, 'app'), { recursive: true });
      writeFileSync(
        join(projectDir, 'app', 'layout.tsx'),
        `import Script from 'next/script'
export default function Layout({ children }) {
  return <html><body>
    <Script src="https://unpkg.com/react-grab" strategy="afterInteractive" />
    {children}
  </body></html>
}`
      );

      const result = await mod.checkGrabScriptInjected(projectDir, 'next-app');
      expect(result.injected).toBe(true);
      expect(result.layoutFile).toBe('app/layout.tsx');
    });

    it('should return false when script not in layout', async () => {
      const projectDir = join(tmpBase, 'next-app-no-grab');
      mkdirSync(join(projectDir, 'app'), { recursive: true });
      writeFileSync(
        join(projectDir, 'app', 'layout.tsx'),
        `export default function Layout({ children }) {
  return <html><body>{children}</body></html>
}`
      );

      const result = await mod.checkGrabScriptInjected(projectDir, 'next-app');
      expect(result.injected).toBe(false);
      expect(result.layoutFile).toBe('app/layout.tsx');
    });

    it('should detect react-grab in Vite index.html', async () => {
      const projectDir = join(tmpBase, 'vite-test');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(
        join(projectDir, 'index.html'),
        `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react-grab"></script>
</head>
<body><div id="root"></div></body>
</html>`
      );

      const result = await mod.checkGrabScriptInjected(projectDir, 'vite');
      expect(result.injected).toBe(true);
    });

    it('should return null layoutFile when no files found', async () => {
      const projectDir = join(tmpBase, 'empty-test');
      mkdirSync(projectDir, { recursive: true });

      const result = await mod.checkGrabScriptInjected(projectDir, 'next-app');
      expect(result.injected).toBe(false);
      expect(result.layoutFile).toBeNull();
    });

    it('should handle unknown framework variant', async () => {
      const projectDir = join(tmpBase, 'unknown-test');
      mkdirSync(projectDir, { recursive: true });

      const result = await mod.checkGrabScriptInjected(projectDir, 'unknown-framework');
      expect(result.injected).toBe(false);
      expect(result.layoutFile).toBeNull();
    });

    // Cleanup
    afterAll(() => {
      rmSync(tmpBase, { recursive: true, force: true });
    });
  });

  describe('detectReactGrab (full detection)', () => {
    const tmpBase = join(tmpdir(), 'devtools-grab-full-' + Date.now());

    beforeAll(() => {
      mkdirSync(tmpBase, { recursive: true });
    });

    it('should return isReact: false for non-React project', async () => {
      const projectDir = join(tmpBase, 'vue-project');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(
        join(projectDir, 'package.json'),
        JSON.stringify({ dependencies: { vue: '^3.0.0' } })
      );

      const result = await mod.detectReactGrab(projectDir);
      expect(result.isReact).toBe(false);
      expect(result.ready).toBe(false);
    });

    it('should return isReact: true, installed: false for bare React project', async () => {
      const projectDir = join(tmpBase, 'bare-react');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(
        join(projectDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0', next: '^14.0.0' } })
      );

      const result = await mod.detectReactGrab(projectDir);
      expect(result.isReact).toBe(true);
      expect(result.installed).toBe(false);
      expect(result.ready).toBe(false);
    });

    it('should detect installed react-grab', async () => {
      const projectDir = join(tmpBase, 'react-with-grab');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(
        join(projectDir, 'package.json'),
        JSON.stringify({
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
          devDependencies: { 'react-grab': '^1.0.0' },
        })
      );

      const result = await mod.detectReactGrab(projectDir);
      expect(result.isReact).toBe(true);
      expect(result.installed).toBe(true);
    });

    it('should handle missing package.json gracefully', async () => {
      const projectDir = join(tmpBase, 'no-package-json');
      mkdirSync(projectDir, { recursive: true });

      const result = await mod.detectReactGrab(projectDir);
      expect(result.isReact).toBe(false);
      expect(result.ready).toBe(false);
    });

    afterAll(() => {
      rmSync(tmpBase, { recursive: true, force: true });
    });
  });
});

// =============================================================================
// SECTION 3: auto-detect.mjs React fields
// =============================================================================

describe('auto-detect React fields', () => {
  let autoDetect: typeof import('../skills/devtools-mcp/lib/auto-detect.mjs');
  const tmpBase = join(tmpdir(), 'devtools-autodetect-' + Date.now());

  beforeAll(async () => {
    autoDetect = await import('../skills/devtools-mcp/lib/auto-detect.mjs');
    mkdirSync(tmpBase, { recursive: true });
  });

  it('should include isReact: true for React projects', async () => {
    const projectDir = join(tmpBase, 'react-next');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({
        scripts: { dev: 'next dev' },
        dependencies: { react: '^18.0.0', next: '^14.0.0' },
      })
    );

    const config = await autoDetect.detectDevConfig(projectDir);
    expect(config.detected).toBe(true);
    expect(config.isReact).toBe(true);
    expect(config.reactGrab).toBeDefined();
    expect(config.reactGrab).not.toBeNull();
  });

  it('should include isReact: false for non-React projects', async () => {
    const projectDir = join(tmpBase, 'gatsby-no-react');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({
        scripts: { dev: 'astro dev' },
        dependencies: { astro: '^4.0.0' },
      })
    );

    const config = await autoDetect.detectDevConfig(projectDir);
    expect(config.detected).toBe(true);
    expect(config.isReact).toBe(false);
    expect(config.reactGrab).toBeNull();
  });

  afterAll(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });
});

// =============================================================================
// SECTION 4: MCP config template
// =============================================================================

describe('MCP config template', () => {
  it('should include react-grab-mcp server', () => {
    const configPath = join(SKILL_DIR, 'templates', 'mcp-config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers['brave-devtools']).toBeDefined();
    expect(config.mcpServers['react-grab-mcp']).toBeDefined();
    expect(config.mcpServers['react-grab-mcp'].command).toBe('npx');
    expect(config.mcpServers['react-grab-mcp'].args).toContain('@react-grab/mcp');
  });
});

// =============================================================================
// SECTION 5: CLI structure validation
// =============================================================================

describe('CLI script validation', () => {
  const cliContent = readFileSync(join(SKILL_DIR, 'bin', 'devtools-mcp'), 'utf-8');

  it('should have start command (renamed from dev)', () => {
    expect(cliContent).toContain('cmd_start()');
    expect(cliContent).toContain('start|dev)');
  });

  it('should have restart command', () => {
    expect(cliContent).toContain('cmd_restart()');
    expect(cliContent).toContain('restart)');
  });

  it('should have --grab flag in argument parsing', () => {
    expect(cliContent).toContain('--grab)');
    expect(cliContent).toContain('GRAB_MODE=true');
  });

  it('should have verify_grab_setup function', () => {
    expect(cliContent).toContain('verify_grab_setup()');
  });

  it('should pass GRAB_MODE to cmd_start', () => {
    expect(cliContent).toContain('cmd_start "$GRAB_MODE"');
  });

  it('should pass RESTART_ADDON to cmd_restart', () => {
    expect(cliContent).toContain('cmd_restart "$RESTART_ADDON"');
  });

  it('should verify grab for test commands', () => {
    expect(cliContent).toContain('smoke|visual|debug|perf|a11y');
    expect(cliContent).toContain('verify_grab_setup || exit 1');
  });

  it('should keep dev as alias for start', () => {
    expect(cliContent).toContain('start|dev)');
  });

  it('should have framework-specific error messages in verify_grab_setup', () => {
    expect(cliContent).toContain('next-app)');
    expect(cliContent).toContain('next-pages)');
    expect(cliContent).toContain('vite|cra)');
    expect(cliContent).toContain('gatsby)');
  });
});

// =============================================================================
// SECTION 6: SKILL.md validation
// =============================================================================

describe('SKILL.md react-grab content', () => {
  const skillContent = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf-8');

  it('should mention react-grab in description', () => {
    expect(skillContent).toContain('react-grab');
  });

  it('should have component debug triggers', () => {
    expect(skillContent).toContain('debug this component');
    expect(skillContent).toContain('which component renders this');
  });

  it('should list component-debug workflow', () => {
    expect(skillContent).toContain('component-debug.md');
  });

  it('should list get_element_context tool', () => {
    expect(skillContent).toContain('get_element_context');
  });

  it('should have --grab examples in Quick Start', () => {
    expect(skillContent).toContain('devtools-mcp start --grab');
    expect(skillContent).toContain('devtools-mcp restart grab');
    expect(skillContent).toContain('devtools-mcp debug --grab');
  });

  it('should list react-grab-detect.mjs in library functions', () => {
    expect(skillContent).toContain('react-grab-detect.mjs');
  });
});

// =============================================================================
// SECTION 7: Workflow validation
// =============================================================================

describe('component-debug workflow', () => {
  const workflowContent = readFileSync(
    join(SKILL_DIR, 'workflows', 'component-debug.md'),
    'utf-8'
  );

  it('should reference both MCP servers', () => {
    expect(workflowContent).toContain('DevTools MCP');
    expect(workflowContent).toContain('react-grab MCP');
  });

  it('should include all workflow steps', () => {
    expect(workflowContent).toContain('Navigate to the Page');
    expect(workflowContent).toContain('Collect Console Errors');
    expect(workflowContent).toContain('User Selects the Element');
    expect(workflowContent).toContain('Get Component Context');
    expect(workflowContent).toContain('Read Source and Propose Fix');
    expect(workflowContent).toContain('Verify the Fix');
  });

  it('should document context staleness', () => {
    expect(workflowContent).toContain('5 minute TTL');
  });

  it('should have fallback for non-grab mode', () => {
    expect(workflowContent).toContain('Fallback');
  });

  it('should reference get_element_context tool', () => {
    expect(workflowContent).toContain('get_element_context');
  });

  it('should reference evaluate_script as fallback', () => {
    expect(workflowContent).toContain('evaluate_script');
    expect(workflowContent).toContain('__REACT_GRAB__');
  });
});
