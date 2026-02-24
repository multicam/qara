#!/usr/bin/env node

/**
 * server-lifecycle.mjs
 *
 * Manages dev server lifecycle (start, stop, health checks)
 * - PID file tracking
 * - Health check polling
 * - Graceful shutdown
 * - Log capture
 */

import { spawn } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  pidFile: '.dev-server.pid',
  logFile: '.dev-server.log',
  healthCheckTimeout: 60000, // 60 seconds
  healthCheckInterval: 1000,  // 1 second
  shutdownTimeout: 10000,     // 10 seconds
};

/**
 * Start dev server in background
 *
 * @param {Object} config - Server config from auto-detect
 * @param {Object} options - Additional options
 * @returns {Promise<number>} - Server PID
 */
export async function startDevServer(config, options = {}) {
  const { startCommand, projectPath } = config;
  const { pidFile, logFile } = { ...DEFAULT_CONFIG, ...options };

  if (!startCommand) {
    throw new Error('No start command provided');
  }

  // Parse command (handle npm run, pnpm, yarn, etc.)
  const [cmd, ...args] = startCommand.split(/\s+/);

  // Resolve file paths
  const pidPath = resolve(projectPath, pidFile);
  const logPath = resolve(projectPath, logFile);

  // Check if server is already running
  const existingPid = await getServerPid(pidPath);
  if (existingPid) {
    const isRunning = await checkPidExists(existingPid);
    if (isRunning) {
      console.log(`Server already running with PID ${existingPid}`);
      return existingPid;
    }
  }

  // Start server process
  const server = spawn(cmd, args, {
    cwd: projectPath,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Capture logs
  const logStream = createWriteStream(logPath);
  server.stdout.pipe(logStream);
  server.stderr.pipe(logStream);

  // Save PID
  await writeFile(pidPath, server.pid.toString(), 'utf-8');

  // Unref so parent can exit
  server.unref();

  console.log(`Dev server started with PID ${server.pid}`);
  console.log(`Logs: ${logPath}`);

  return server.pid;
}

/**
 * Stop dev server
 *
 * @param {number|string} pid - Process ID or PID file path
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} - Success
 */
export async function stopDevServer(pid, options = {}) {
  const { shutdownTimeout } = { ...DEFAULT_CONFIG, ...options };

  // If string, assume it's a PID file path
  if (typeof pid === 'string') {
    pid = await getServerPid(pid);
  }

  if (!pid) {
    console.log('No server PID found');
    return false;
  }

  console.log(`Stopping server with PID ${pid}`);

  try {
    // Try graceful shutdown first (SIGTERM)
    process.kill(pid, 'SIGTERM');

    // Wait for process to exit
    const stopped = await waitForProcessExit(pid, shutdownTimeout);

    if (stopped) {
      console.log('Server stopped gracefully');
      return true;
    }

    // Force kill if still running (SIGKILL)
    console.log('Graceful shutdown failed, force killing...');
    process.kill(pid, 'SIGKILL');

    // Wait again
    await waitForProcessExit(pid, 5000);

    console.log('Server force killed');
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') {
      // Process doesn't exist
      console.log('Server already stopped');
      return true;
    }
    throw error;
  }
}

/**
 * Check if server is healthy (responding to requests)
 *
 * @param {string} url - Server URL to check
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} - Server is healthy
 */
export async function checkServerHealth(url, options = {}) {
  const { healthCheckTimeout, healthCheckInterval } = {
    ...DEFAULT_CONFIG,
    ...options,
  };

  console.log(`Checking server health: ${url}`);

  const startTime = Date.now();

  while (Date.now() - startTime < healthCheckTimeout) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok || response.status === 404) {
        // 404 is acceptable (means server is responding)
        console.log(`Server is healthy (status: ${response.status})`);
        return true;
      }
    } catch (error) {
      // Server not ready yet, retry
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, healthCheckInterval));
  }

  console.log('Server health check timeout');
  return false;
}

/**
 * Get server PID from PID file
 *
 * @param {string} pidFilePath - Path to PID file
 * @returns {Promise<number|null>} - PID or null
 */
export async function getServerPid(pidFilePath) {
  try {
    const content = await readFile(pidFilePath, 'utf-8');
    const pid = parseInt(content.trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Check if PID exists (process is running)
 *
 * @param {number} pid - Process ID
 * @returns {Promise<boolean>}
 */
async function checkPidExists(pid) {
  try {
    // Signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for process to exit
 *
 * @param {number} pid - Process ID
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<boolean>} - Process exited
 */
async function waitForProcessExit(pid, timeout) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const exists = await checkPidExists(pid);
    if (!exists) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return false;
}

/**
 * Clean up PID file
 *
 * @param {string} pidFilePath - Path to PID file
 */
export async function cleanupPidFile(pidFilePath) {
  try {
    await unlink(pidFilePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Complete server start workflow
 * Start server + wait for health check
 */
export async function startAndWaitForServer(config, options = {}) {
  const { url, projectPath } = config;

  console.log('Starting dev server...');

  // Start server
  const pid = await startDevServer(config, options);

  // Wait for health check
  const healthy = await checkServerHealth(url, options);

  if (!healthy) {
    console.error('Server failed health check, stopping...');
    await stopDevServer(pid, options);
    throw new Error('Server failed to start');
  }

  console.log('Server is ready!');

  return {
    pid,
    url,
    pidFile: resolve(projectPath, options.pidFile || DEFAULT_CONFIG.pidFile),
  };
}

/**
 * CLI usage
 */
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const command = process.argv[2];

  try {
    if (command === 'start') {
      const projectPath = process.argv[3] || process.cwd();
      // Auto-detect config
      const { detectDevConfig } = await import('./auto-detect.mjs');
      const config = await detectDevConfig(projectPath);

      if (!config.detected) {
        throw new Error('Could not detect dev server config');
      }

      const result = await startAndWaitForServer(config);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === 'stop') {
      const projectPath = process.argv[3] || process.cwd();
      const pidFile = resolve(projectPath, DEFAULT_CONFIG.pidFile);
      await stopDevServer(pidFile);
      await cleanupPidFile(pidFile);
    } else if (command === 'health') {
      const url = process.argv[3] || 'http://localhost:8000';
      const healthy = await checkServerHealth(url);
      console.log(healthy ? 'healthy' : 'unhealthy');
    } else {
      console.log('Usage:');
      console.log('  node server-lifecycle.mjs start [project-path]');
      console.log('  node server-lifecycle.mjs stop [project-path]');
      console.log('  node server-lifecycle.mjs health [url]');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
