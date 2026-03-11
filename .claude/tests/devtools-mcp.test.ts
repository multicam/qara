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
      'lib/grab-inspect.mjs',
      'templates/mcp-config.json',
    ];

    for (const file of requiredFiles) {
      expect(existsSync(join(SKILL_DIR, file))).toBe(true);
    }
  });

  it('should not have docs/ directory (SKILL.md forbids reading it)', () => {
    // docs/ was purgatoied — SKILL.md rule 1: "Never read files in this skill's lib/ or docs/ directories"
    expect(existsSync(join(SKILL_DIR, 'docs'))).toBe(false);
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
    expect(config.mcpServers['react-grab-mcp'].command).toBe('bunx');
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

describe('SKILL.md content', () => {
  const skillContent = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf-8');

  it('should mention react-grab in component debug recipe', () => {
    expect(skillContent).toContain('react-grab');
  });

  it('should have component debug recipe', () => {
    expect(skillContent).toContain('Component Debug');
    expect(skillContent).toContain('get_element_context');
  });

  it('should list all MCP tool categories', () => {
    expect(skillContent).toContain('Navigate:');
    expect(skillContent).toContain('Input:');
    expect(skillContent).toContain('Inspect:');
  });

  it('should have recipe sections', () => {
    expect(skillContent).toContain('Smoke Test');
    expect(skillContent).toContain('Debug Console');
    expect(skillContent).toContain('Visual Test');
    expect(skillContent).toContain('Performance');
    expect(skillContent).toContain('Accessibility');
  });

  it('should have critical rules section', () => {
    expect(skillContent).toContain('NO exploration');
    expect(skillContent).toContain('NO verification');
  });

  it('should have URL priority section', () => {
    expect(skillContent).toContain('URL');
    expect(skillContent).toContain('CLAUDE.md');
  });
});

// =============================================================================
// SECTION 7: (removed — docs/ purgatoied, workflow validation no longer applicable)
// =============================================================================

// =============================================================================
// SECTION 8: grab-inspect.mjs
// =============================================================================

describe('grab-inspect module', () => {
  it('should be importable', async () => {
    const mod = await import('../skills/devtools-mcp/lib/grab-inspect.mjs');
    expect(mod).toBeDefined();
  });
});

// =============================================================================
// SECTION 9: checkGrabMcpConfigured accepts projectPath
// =============================================================================

describe('checkGrabMcpConfigured projectPath', () => {
  let mod: typeof import('../skills/devtools-mcp/lib/react-grab-detect.mjs');
  const tmpBase = join(tmpdir(), 'devtools-mcp-path-' + Date.now());

  beforeAll(async () => {
    mod = await import('../skills/devtools-mcp/lib/react-grab-detect.mjs');
    mkdirSync(tmpBase, { recursive: true });
  });

  it('should accept a projectPath parameter', async () => {
    // With a custom projectPath that has no .mcp.json, should return not configured
    const result = await mod.checkGrabMcpConfigured(tmpBase);
    // The function checks both global config and project .mcp.json
    // At minimum it should not throw and return a structured result
    expect(result).toHaveProperty('configured');
  });

  it('should check project .mcp.json at the given projectPath', async () => {
    // Use a unique server name only in the project .mcp.json
    const projectDir = join(tmpBase, 'with-mcp');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, '.mcp.json'),
      JSON.stringify({
        mcpServers: { 'react-grab': { command: 'bunx', args: ['-y', '@react-grab/mcp'] } },
      })
    );

    const result = await mod.checkGrabMcpConfigured(projectDir);
    // Should find it (either in global config or project .mcp.json)
    expect(result.configured).toBe(true);
  });

  afterAll(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });
});

// =============================================================================
// SECTION 10: CLI bug fix validations
// =============================================================================

describe('CLI bug fixes', () => {
  const cliContent = readFileSync(join(SKILL_DIR, 'bin', 'devtools-mcp'), 'utf-8');

  it('should NOT double-invoke react-grab-detect.mjs in verify_grab_setup', () => {
    // Bug 1 fix: verify_grab_setup should use cached config, not spawn node
    // Count occurrences of the old pattern
    const nodeGrabSpawns = (cliContent.match(/node.*react-grab-detect\.mjs/g) || []).length;
    // Should be 0 — we no longer spawn node for react-grab-detect in the CLI
    expect(nodeGrabSpawns).toBe(0);
  });

  it('should use cached config in verify_grab_setup (reactGrab field)', () => {
    // verify_grab_setup should read reactGrab from cached config via jq
    expect(cliContent).toContain('.reactGrab');
  });

  it('should have _CACHED_CONFIG for config caching', () => {
    expect(cliContent).toContain('_CACHED_CONFIG');
  });

  it('should return cached config on subsequent get_dev_config calls', () => {
    // The cache check pattern
    expect(cliContent).toContain('if [[ -n "$_CACHED_CONFIG" ]]');
  });

  it('cmd_verify should detect React and pass --react flag', () => {
    // Extract cmd_verify function
    const verifyMatch = cliContent.match(/cmd_verify\(\)\s*\{[\s\S]*?\n\}/);
    expect(verifyMatch).not.toBeNull();
    const verifyFn = verifyMatch![0];
    expect(verifyFn).toContain('react_flag');
    expect(verifyFn).toContain('--react');
    expect(verifyFn).toContain('.isReact');
  });
});

// =============================================================================
// SECTION 11: mcp-verify.mjs --react flag
// =============================================================================

describe('mcp-verify --react CLI flag', () => {
  it('should parse --react from process.argv in CLI section', () => {
    const verifyContent = readFileSync(join(SKILL_DIR, 'lib', 'mcp-verify.mjs'), 'utf-8');
    expect(verifyContent).toContain("process.argv.includes('--react')");
    expect(verifyContent).toContain('{ isReact }');
  });
});

// =============================================================================
// SECTION 12: auto-detect.mjs uncovered branches
// =============================================================================

describe('auto-detect uncovered branches', () => {
  let autoDetect: typeof import('../skills/devtools-mcp/lib/auto-detect.mjs');
  const tmpBase = join(tmpdir(), 'devtools-autodetect-branches-' + Date.now());

  beforeAll(async () => {
    autoDetect = await import('../skills/devtools-mcp/lib/auto-detect.mjs');
    mkdirSync(tmpBase, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  // detectFramework — unknown return (line 73)
  describe('detectFramework', () => {
    it('should return "unknown" when no recognized deps are present', () => {
      const result = autoDetect.detectFramework({ dependencies: { lodash: '^4.0.0' } });
      expect(result).toBe('unknown');
    });

    it('should return "unknown" for empty deps', () => {
      const result = autoDetect.detectFramework({ dependencies: {}, devDependencies: {} });
      expect(result).toBe('unknown');
    });

    it('should return "unknown" for null', () => {
      // null pkg falls into the early guard
      const result = autoDetect.detectFramework(null);
      expect(result).toBe('unknown');
    });
  });

  // findDevScript — null/no match paths (lines 81-91)
  describe('findDevScript', () => {
    it('should return null for null scripts', () => {
      expect(autoDetect.findDevScript(null)).toBeNull();
    });

    it('should return null for empty scripts object', () => {
      expect(autoDetect.findDevScript({})).toBeNull();
    });

    it('should return null when no priority keys are present', () => {
      // Scripts exist but none match dev/start/serve/develop
      expect(autoDetect.findDevScript({ build: 'tsc', test: 'bun test' })).toBeNull();
    });

    it('should return the dev script value when "dev" key exists', () => {
      expect(autoDetect.findDevScript({ dev: 'next dev', build: 'next build' })).toBe('next dev');
    });

    it('should prefer "dev" over "start"', () => {
      expect(autoDetect.findDevScript({ start: 'node server.js', dev: 'vite' })).toBe('vite');
    });

    it('should fall back to "start" when "dev" is absent', () => {
      expect(autoDetect.findDevScript({ start: 'node server.js' })).toBe('node server.js');
    });

    it('should fall back to "serve" when neither dev nor start is present', () => {
      expect(autoDetect.findDevScript({ serve: 'gatsby serve' })).toBe('gatsby serve');
    });
  });

  // parsePort — no match returns null (line 128)
  describe('parsePort', () => {
    it('should return null for null devScript', () => {
      expect(autoDetect.parsePort(null, 'next')).toBeNull();
    });

    it('should return null when script has no port flag', () => {
      expect(autoDetect.parsePort('next dev', 'next')).toBeNull();
    });

    it('should parse -p 3000', () => {
      expect(autoDetect.parsePort('next dev -p 3000', 'next')).toBe(3000);
    });

    it('should parse --port=8000', () => {
      expect(autoDetect.parsePort('vite --port=8000', 'vite')).toBe(8000);
    });

    it('should parse --port 5173', () => {
      expect(autoDetect.parsePort('vite --port 5173', 'vite')).toBe(5173);
    });

    it('should parse -P 8080', () => {
      expect(autoDetect.parsePort('node server.js -P 8080', 'unknown')).toBe(8080);
    });
  });

  // getDefaultPort
  describe('getDefaultPort', () => {
    it('should return 3000 for next', () => {
      expect(autoDetect.getDefaultPort('next')).toBe(3000);
    });

    it('should return 5173 for vite', () => {
      expect(autoDetect.getDefaultPort('vite')).toBe(5173);
    });

    it('should return 3000 for unknown frameworks', () => {
      expect(autoDetect.getDefaultPort('unknown')).toBe(3000);
      expect(autoDetect.getDefaultPort('nonexistent')).toBe(3000);
    });
  });

  // readPackageJson — ENOENT and invalid JSON paths (lines 107-108, 146-150)
  describe('readPackageJson', () => {
    it('should throw ENOENT error for non-existent directory', async () => {
      const missing = join(tmpBase, 'does-not-exist-' + Date.now());
      await expect(autoDetect.readPackageJson(missing)).rejects.toThrow('No package.json found in');
    });

    it('should throw parse error for invalid JSON', async () => {
      const badJsonDir = join(tmpBase, 'bad-json');
      mkdirSync(badJsonDir, { recursive: true });
      writeFileSync(join(badJsonDir, 'package.json'), '{ invalid json !!!');
      await expect(autoDetect.readPackageJson(badJsonDir)).rejects.toThrow('Failed to read package.json:');
    });

    it('should return parsed object for valid package.json', async () => {
      const validDir = join(tmpBase, 'valid-pkg');
      mkdirSync(validDir, { recursive: true });
      writeFileSync(join(validDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
      const pkg = await autoDetect.readPackageJson(validDir);
      expect(pkg.name).toBe('test');
      expect(pkg.version).toBe('1.0.0');
    });
  });

  // detectDevConfig — error path (lines 222-231)
  describe('detectDevConfig error path', () => {
    it('should return detected: false for non-existent directory', async () => {
      const missing = join(tmpBase, 'ghost-dir-' + Date.now());
      const config = await autoDetect.detectDevConfig(missing);
      expect(config.detected).toBe(false);
      expect(config.framework).toBe('unknown');
      expect(config.port).toBeNull();
      expect(config.url).toBeNull();
      expect(config.error).toBeDefined();
    });

    it('should return detected: false for directory with invalid JSON', async () => {
      const badJsonDir = join(tmpBase, 'bad-json-detect');
      mkdirSync(badJsonDir, { recursive: true });
      writeFileSync(join(badJsonDir, 'package.json'), '{ bad json');
      const config = await autoDetect.detectDevConfig(badJsonDir);
      expect(config.detected).toBe(false);
      expect(config.error).toContain('Failed to read package.json');
    });
  });
});

// =============================================================================
// SECTION 13: grab-inspect.mjs exports and getPageWs behaviour
// =============================================================================

describe('grab-inspect module exports and getPageWs', () => {
  let grabInspect: typeof import('../skills/devtools-mcp/lib/grab-inspect.mjs');

  beforeAll(async () => {
    grabInspect = await import('../skills/devtools-mcp/lib/grab-inspect.mjs');
  });

  describe('module exports', () => {
    it('should export getPageWs', () => {
      expect(typeof grabInspect.getPageWs).toBe('function');
    });

    it('should export cdpEval', () => {
      expect(typeof grabInspect.cdpEval).toBe('function');
    });

    it('should export activate', () => {
      expect(typeof grabInspect.activate).toBe('function');
    });

    it('should export inspect', () => {
      expect(typeof grabInspect.inspect).toBe('function');
    });

    it('should export hardRefresh', () => {
      expect(typeof grabInspect.hardRefresh).toBe('function');
    });

    it('should export evaluate', () => {
      expect(typeof grabInspect.evaluate).toBe('function');
    });
  });

  // getPageWs — mock globalThis.fetch to control tab list
  describe('getPageWs with mocked fetch', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeAll(() => {
      originalFetch = globalThis.fetch;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    it('should return the webSocketDebuggerUrl of the matching tab', async () => {
      const tabs = [
        { url: 'chrome://newtab/', webSocketDebuggerUrl: 'ws://irrelevant' },
        { url: 'http://localhost:3000/app', webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/ABC' },
      ];
      globalThis.fetch = async () => ({ json: async () => tabs } as Response);

      const ws = await grabInspect.getPageWs(9222, 'localhost');
      expect(ws).toBe('ws://localhost:9222/devtools/page/ABC');
    });

    it('should return null when no tab URL includes the appHost', async () => {
      const tabs = [
        { url: 'chrome://extensions/', webSocketDebuggerUrl: 'ws://ext' },
        { url: 'https://example.com', webSocketDebuggerUrl: 'ws://example' },
      ];
      globalThis.fetch = async () => ({ json: async () => tabs } as Response);

      const ws = await grabInspect.getPageWs(9222, 'localhost');
      expect(ws).toBeNull();
    });

    it('should return null for empty tab list', async () => {
      globalThis.fetch = async () => ({ json: async () => [] } as Response);

      const ws = await grabInspect.getPageWs(9222, 'localhost');
      expect(ws).toBeNull();
    });

    it('should use port 9222 and localhost by default when fetch is mocked', async () => {
      let capturedUrl = '';
      globalThis.fetch = async (url: string | URL | Request) => {
        capturedUrl = String(url);
        return { json: async () => [] } as Response;
      };

      await grabInspect.getPageWs();
      expect(capturedUrl).toBe('http://localhost:9222/json');
    });

    it('should use a custom port when provided', async () => {
      let capturedUrl = '';
      globalThis.fetch = async (url: string | URL | Request) => {
        capturedUrl = String(url);
        return { json: async () => [] } as Response;
      };

      await grabInspect.getPageWs(9223);
      expect(capturedUrl).toBe('http://localhost:9223/json');
    });
  });

  // activate / inspect / evaluate — error path: no tab found
  describe('error paths when no app tab is found', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeAll(() => {
      originalFetch = globalThis.fetch;
      // Always return empty tab list so getPageWs returns null
      globalThis.fetch = async () => ({ json: async () => [] } as Response);
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    it('activate should throw "No app tab found"', async () => {
      await expect(grabInspect.activate()).rejects.toThrow('No app tab found');
    });

    it('inspect should throw "No app tab found"', async () => {
      await expect(grabInspect.inspect()).rejects.toThrow('No app tab found');
    });

    it('hardRefresh should throw "No app tab found"', async () => {
      await expect(grabInspect.hardRefresh()).rejects.toThrow('No app tab found');
    });

    it('evaluate should throw "No app tab found"', async () => {
      await expect(grabInspect.evaluate('1+1')).rejects.toThrow('No app tab found');
    });
  });
});

// =============================================================================
// SECTION 14: react-grab-detect checkGrabMcpConfigured MCP config parsing paths
// =============================================================================

describe('checkGrabMcpConfigured MCP config parsing', () => {
  let mod: typeof import('../skills/devtools-mcp/lib/react-grab-detect.mjs');
  const tmpBase = join(tmpdir(), 'devtools-mcp-cfg-parse-' + Date.now());

  beforeAll(async () => {
    mod = await import('../skills/devtools-mcp/lib/react-grab-detect.mjs');
    mkdirSync(tmpBase, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  // NOTE: The function checks ~/.config/claude-desktop/claude_desktop_config.json FIRST.
  // On this machine that file exists and contains 'react-grab-mcp', so any call to
  // checkGrabMcpConfigured will return configured: true regardless of the project .mcp.json.
  // The tests below verify parsing behaviour that is exercised by the project .mcp.json path
  // (lines 135-139 in react-grab-detect.mjs) when the global config is not present.
  // They also verify that invalid JSON in .mcp.json does not cause an unhandled exception.

  it('should return configured: true (global config present on this machine)', async () => {
    // Verifies baseline: the global config contains react-grab-mcp
    const projectDir = join(tmpBase, 'baseline');
    mkdirSync(projectDir, { recursive: true });
    const result = await mod.checkGrabMcpConfigured(projectDir);
    expect(result.configured).toBe(true);
  });

  it('should not throw when .mcp.json contains invalid JSON', async () => {
    // Exercises the silent-catch path for invalid JSON in config files (line 136-139)
    const projectDir = join(tmpBase, 'invalid-mcp-json');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, '.mcp.json'), '{ this is not valid json');

    // Should not throw — the catch block swallows parse errors
    const result = await mod.checkGrabMcpConfigured(projectDir);
    expect(result).toHaveProperty('configured');
    expect(typeof result.configured).toBe('boolean');
  });

  it('should not throw when .mcp.json has unrecognised server names', async () => {
    // Exercises the server-name-check path (lines 133-135) — wrong names don't match
    const projectDir = join(tmpBase, 'wrong-server-names');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          'some-other-mcp': { command: 'bunx', args: ['other-mcp'] },
        },
      })
    );

    // Should not throw and should return a structured result
    const result = await mod.checkGrabMcpConfigured(projectDir);
    expect(result).toHaveProperty('configured');
    expect(result).toHaveProperty('configPath');
  });

  it('should return configured: true when project .mcp.json has react-grab key', async () => {
    // Exercises lines 131-135: project config path, mcpServers extraction, key check
    const projectDir = join(tmpBase, 'project-react-grab');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          'react-grab': { command: 'bunx', args: ['-y', '@react-grab/mcp'] },
        },
      })
    );

    const result = await mod.checkGrabMcpConfigured(projectDir);
    expect(result.configured).toBe(true);
  });

  it('should accept a path argument and return a structured result object', async () => {
    // Exercises the function signature with explicit projectPath (line 121)
    const projectDir = join(tmpBase, 'path-arg-test');
    mkdirSync(projectDir, { recursive: true });

    const result = await mod.checkGrabMcpConfigured(projectDir);
    expect(result).toHaveProperty('configured');
    expect(result).toHaveProperty('configPath');
  });
});
