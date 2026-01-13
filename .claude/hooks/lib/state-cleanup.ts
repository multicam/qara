#!/usr/bin/env bun

/**
 * state-cleanup.ts
 *
 * Utility for maintaining clean state and memory directories.
 * Removes old agent sessions, rotates large logs, and reports disk usage.
 *
 * Usage:
 *   bun .claude/hooks/lib/state-cleanup.ts [--dry-run] [--max-age-days=7] [--max-size-mb=10]
 *
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --max-age-days: Maximum age for agent state files (default: 7)
 *   --max-size-mb: Maximum size for JSONL files before rotation (default: 10)
 */

import { readdirSync, statSync, unlinkSync, renameSync, existsSync } from "fs";
import { join } from "path";
import { STATE_DIR, MEMORY_DIR, ensureDir } from "./pai-paths";
import { getISOTimestamp } from "./datetime-utils";

interface CleanupStats {
  agent_states_removed: number;
  jsonl_files_rotated: number;
  bytes_freed: number;
  errors: string[];
}

interface CleanupOptions {
  dryRun: boolean;
  maxAgeDays: number;
  maxSizeMB: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes("--dry-run"),
    maxAgeDays: parseInt(args.find(arg => arg.startsWith("--max-age-days="))?.split("=")[1] || "7"),
    maxSizeMB: parseInt(args.find(arg => arg.startsWith("--max-size-mb="))?.split("=")[1] || "10"),
  };
}

/**
 * Clean up old agent state files
 */
function cleanupAgentStates(options: CleanupOptions, stats: CleanupStats): void {
  const agentsDir = join(STATE_DIR, "agents");

  if (!existsSync(agentsDir)) {
    return;
  }

  const now = Date.now();
  const maxAgeMs = options.maxAgeDays * 24 * 60 * 60 * 1000;

  try {
    const files = readdirSync(agentsDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(agentsDir, file);
      const fileStat = statSync(filePath);
      const ageMs = now - fileStat.mtimeMs;

      if (ageMs > maxAgeMs) {
        const sizeBytes = fileStat.size;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would remove: ${file} (age: ${Math.floor(ageMs / 86400000)} days, size: ${sizeBytes} bytes)`);
        } else {
          unlinkSync(filePath);
          console.log(`Removed old agent state: ${file} (age: ${Math.floor(ageMs / 86400000)} days)`);
        }

        stats.agent_states_removed++;
        stats.bytes_freed += sizeBytes;
      }
    }
  } catch (error) {
    stats.errors.push(`Error cleaning agent states: ${error}`);
  }
}

/**
 * Rotate large JSONL log files
 */
function rotateJSONLFiles(options: CleanupOptions, stats: CleanupStats): void {
  if (!existsSync(MEMORY_DIR)) {
    return;
  }

  const maxSizeBytes = options.maxSizeMB * 1024 * 1024;

  try {
    const files = readdirSync(MEMORY_DIR);

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const filePath = join(MEMORY_DIR, file);
      const fileStat = statSync(filePath);

      if (fileStat.size > maxSizeBytes) {
        const timestamp = getISOTimestamp().replace(/:/g, "-");
        const archivePath = join(MEMORY_DIR, `${file}.${timestamp}.archive`);

        if (options.dryRun) {
          console.log(`[DRY RUN] Would rotate: ${file} (size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          renameSync(filePath, archivePath);
          console.log(`Rotated large log: ${file} → ${archivePath} (size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB)`);
        }

        stats.jsonl_files_rotated++;
      }
    }
  } catch (error) {
    stats.errors.push(`Error rotating JSONL files: ${error}`);
  }
}

/**
 * Report disk usage statistics
 */
function reportDiskUsage(): void {
  console.log("\n=== Disk Usage Report ===");

  const checkDir = (dir: string, label: string) => {
    if (!existsSync(dir)) {
      console.log(`${label}: Directory does not exist`);
      return;
    }

    let totalSize = 0;
    let fileCount = 0;

    function scanDir(path: string): void {
      try {
        const entries = readdirSync(path, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(path, entry.name);

          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            const stat = statSync(fullPath);
            totalSize += stat.size;
            fileCount++;
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    scanDir(dir);

    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`${label}: ${fileCount} files, ${sizeMB} MB`);
  };

  checkDir(STATE_DIR, "State Directory");
  checkDir(MEMORY_DIR, "Memory Directory");
  checkDir(join(STATE_DIR, "agents"), "Agent States");
}

/**
 * Main cleanup routine
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log("=== PAI State Cleanup Utility ===");
  console.log(`Mode: ${options.dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Max agent state age: ${options.maxAgeDays} days`);
  console.log(`Max JSONL file size: ${options.maxSizeMB} MB`);
  console.log("");

  const stats: CleanupStats = {
    agent_states_removed: 0,
    jsonl_files_rotated: 0,
    bytes_freed: 0,
    errors: [],
  };

  // Run cleanup tasks
  cleanupAgentStates(options, stats);
  rotateJSONLFiles(options, stats);

  // Report results
  console.log("\n=== Cleanup Results ===");
  console.log(`Agent states removed: ${stats.agent_states_removed}`);
  console.log(`JSONL files rotated: ${stats.jsonl_files_rotated}`);
  console.log(`Disk space freed: ${(stats.bytes_freed / 1024 / 1024).toFixed(2)} MB`);

  if (stats.errors.length > 0) {
    console.log("\n=== Errors ===");
    stats.errors.forEach(error => console.error(error));
  }

  // Show disk usage
  reportDiskUsage();

  // Recommendations
  console.log("\n=== Recommendations ===");
  if (stats.agent_states_removed === 0 && stats.jsonl_files_rotated === 0) {
    console.log("✅ No cleanup needed - state directories are clean");
  } else {
    console.log(`✅ Cleanup complete - ${(stats.bytes_freed / 1024 / 1024).toFixed(2)} MB freed`);
  }

  console.log("\nSchedule this script weekly via cron:");
  console.log(`  0 3 * * 0 cd ${process.cwd()} && bun .claude/hooks/lib/state-cleanup.ts`);
}

main().catch(console.error);
