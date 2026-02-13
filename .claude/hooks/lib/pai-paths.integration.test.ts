/**
 * Integration tests for pai-paths.ts validation logic
 *
 * These tests spawn child processes to test the module's initialization
 * error handling, since validatePAIStructure() runs on import and calls
 * process.exit() on failure.
 */

import { describe, it, expect } from 'bun:test';
import { spawn } from 'child_process';
import { join, resolve } from 'path';
import { homedir } from 'os';

describe('PAI Paths Integration Tests', () => {
  const testHelperPath = resolve(__dirname, 'pai-paths-test-helper.ts');

  describe('validatePAIStructure error handling', () => {
    it('should exit with error when PAI_DIR does not exist', async () => {
      // This tests lines 46-48
      const nonExistentDir = '/tmp/nonexistent-pai-dir-test-' + Date.now();

      const result = await new Promise<{ code: number; stderr: string }>((resolve) => {
        const child = spawn('bun', [testHelperPath], {
          env: {
            ...process.env,
            PAI_DIR: nonExistentDir,
          },
        });

        let stderr = '';
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          resolve({ code: code || 0, stderr });
        });
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('PAI_DIR does not exist');
      expect(result.stderr).toContain(nonExistentDir);
    });

    it('should exit with error when HOOKS_DIR does not exist', async () => {
      // This tests lines 52-55
      // Create a temporary PAI_DIR without hooks subdirectory
      const tempPaiDir = '/tmp/pai-test-no-hooks-' + Date.now();
      const { mkdirSync, rmdirSync, existsSync } = await import('fs');

      mkdirSync(tempPaiDir, { recursive: true });

      try {
        const result = await new Promise<{ code: number; stderr: string }>((resolve) => {
          const child = spawn('bun', [testHelperPath], {
            env: {
              ...process.env,
              PAI_DIR: tempPaiDir,
            },
          });

          let stderr = '';
          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            resolve({ code: code || 0, stderr });
          });
        });

        expect(result.code).toBe(1);
        expect(result.stderr).toContain('hooks directory not found');
        expect(result.stderr).toContain(tempPaiDir);
      } finally {
        // Clean up
        if (existsSync(tempPaiDir)) {
          rmdirSync(tempPaiDir);
        }
      }
    });

    it('should succeed when PAI_DIR and HOOKS_DIR both exist', async () => {
      // Positive test case - should import successfully with valid paths
      const { mkdirSync, rmdirSync, existsSync } = await import('fs');
      const tempPaiDir = '/tmp/pai-test-valid-' + Date.now();
      const tempHooksDir = join(tempPaiDir, 'hooks');

      mkdirSync(tempHooksDir, { recursive: true });

      try {
        const result = await new Promise<{ code: number; stdout: string }>((resolve) => {
          const child = spawn('bun', [testHelperPath], {
            env: {
              ...process.env,
              PAI_DIR: tempPaiDir,
            },
          });

          let stdout = '';
          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.on('close', (code) => {
            resolve({ code: code || 0, stdout });
          });
        });

        expect(result.code).toBe(0);
        expect(result.stdout).toContain('IMPORT_SUCCESS');
      } finally {
        // Clean up
        if (existsSync(tempHooksDir)) {
          rmdirSync(tempHooksDir);
        }
        if (existsSync(tempPaiDir)) {
          rmdirSync(tempPaiDir);
        }
      }
    });
  });
});
