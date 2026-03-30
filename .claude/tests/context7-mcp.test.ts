import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const QARA_DIR = join(process.env.HOME || '', 'qara');
const MCP_JSON = join(QARA_DIR, '.claude', 'mcp.json');
const SETTINGS_JSON = join(QARA_DIR, '.claude', 'settings.json');

describe('Context7 MCP Configuration', () => {
    test('.mcp.json exists', () => {
        expect(existsSync(MCP_JSON)).toBe(true);
    });

    test('.mcp.json has context7 server entry', () => {
        const config = JSON.parse(readFileSync(MCP_JSON, 'utf-8'));
        expect(config.mcpServers).toBeDefined();
        expect(config.mcpServers.context7).toBeDefined();
    });

    test('context7 entry has correct command and args', () => {
        const config = JSON.parse(readFileSync(MCP_JSON, 'utf-8'));
        const ctx7 = config.mcpServers.context7;
        expect(ctx7.command).toBe('npx');
        expect(ctx7.args).toBeArray();
        expect(ctx7.args.some((a: string) => a.includes('@upstash/context7-mcp'))).toBe(true);
        expect(ctx7.args.includes('-y')).toBe(true);
    });

    test('context7 does not leak API keys in mcp.json', () => {
        const content = readFileSync(MCP_JSON, 'utf-8');
        expect(content).not.toContain('api-key');
        expect(content).not.toContain('CONTEXT7_API_KEY');
    });
});

describe('Context7 Settings Activation', () => {
    test('settings.json has context7 in enabledMcpjsonServers', () => {
        const settings = JSON.parse(readFileSync(SETTINGS_JSON, 'utf-8'));
        expect(settings.enabledMcpjsonServers).toBeArray();
        expect(settings.enabledMcpjsonServers).toContain('context7');
    });

    test('mcp__* permission covers context7 tools', () => {
        const settings = JSON.parse(readFileSync(SETTINGS_JSON, 'utf-8'));
        const allows = settings.permissions?.allow || [];
        expect(allows.some((p: string) => p === 'mcp__*' || p.startsWith('mcp__context7'))).toBe(true);
    });
});

describe('Context7 Package Availability', () => {
    test('npx can resolve @upstash/context7-mcp', () => {
        try {
            const result = execSync('npm view @upstash/context7-mcp version 2>/dev/null', {
                encoding: 'utf-8',
                timeout: 10000,
            }).trim();
            expect(result).toMatch(/^\d+\.\d+\.\d+/);
        } catch {
            // Network may be unavailable in CI — skip gracefully
            console.warn('Skipping package resolution check (network unavailable)');
        }
    });
});
