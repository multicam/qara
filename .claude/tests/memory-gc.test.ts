/**
 * memory-gc.sh tests — deterministic janitor for session dirs + MEMORY.md stubs.
 *
 * Tests run the actual bash script against isolated fixture trees (tmp dirs
 * with HOME env override so the script's $HOME-rooted paths resolve into the
 * fixture). Dry-run mode used throughout to avoid touching real state.
 */

import { describe, it, expect } from "bun:test";
import { spawnSync } from "child_process";
import {
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
  utimesSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SCRIPT = "/home/jean-marc/.claude/scripts/memory-gc.sh";

/** Run the GC script with HOME pointed at a fixture, in dry-run or real mode. */
function runGc(home: string, dryRun: boolean): { stdout: string; stderr: string; code: number } {
  const args = dryRun ? ["--dry-run"] : [];
  const r = spawnSync("bash", [SCRIPT, ...args], {
    env: { ...process.env, HOME: home },
    encoding: "utf-8",
  });
  return { stdout: r.stdout || "", stderr: r.stderr || "", code: r.status ?? -1 };
}

/** Build a fixture HOME with sessions and project memory dirs. */
function withHomeFixture<T>(fn: (home: string) => T): T {
  const home = mkdtempSync(join(tmpdir(), "gctest-"));
  // Pre-create the tree the script expects
  mkdirSync(join(home, "qara", ".claude", "state", "sessions"), { recursive: true });
  mkdirSync(join(home, ".claude", "projects"), { recursive: true });
  mkdirSync(join(home, ".claude", "state", "digests"), { recursive: true });
  try {
    return fn(home);
  } finally {
    rmSync(home, { recursive: true });
  }
}

/** Make a session dir with controllable age + memory contents + checkpoint. */
function makeSession(
  home: string,
  name: string,
  opts: { ageDays: number; emptyMemory: boolean; hasCheckpoint: boolean }
) {
  const dir = join(home, "qara", ".claude", "state", "sessions", name);
  mkdirSync(join(dir, "memory"), { recursive: true });
  if (!opts.emptyMemory) {
    writeFileSync(join(dir, "memory", "mode-decisions.md"), "some content\n");
  }
  if (opts.hasCheckpoint) {
    writeFileSync(join(dir, "compact-checkpoint.json"), "{}");
  }
  // Backdate mtime on the DIR itself — find -mtime checks dir mtime.
  const past = new Date(Date.now() - opts.ageDays * 24 * 3600 * 1000);
  utimesSync(dir, past, past);
}

/** Make a project memory/MEMORY.md of given line count. */
function makeProject(home: string, slug: string, lines: number) {
  const dir = join(home, ".claude", "projects", `-${slug}`, "memory");
  mkdirSync(dir, { recursive: true });
  const content = lines > 0 ? "x\n".repeat(lines - 1) + "x" : "";
  writeFileSync(join(dir, "MEMORY.md"), content);
}

describe("memory-gc.sh", () => {
  describe("session GC", () => {
    it("deletes empty sessions older than 14 days with no checkpoint", () => {
      withHomeFixture((home) => {
        makeSession(home, "dead-old", { ageDays: 20, emptyMemory: true, hasCheckpoint: false });
        const r = runGc(home, false);
        expect(r.code).toBe(0);
        expect(existsSync(join(home, "qara", ".claude", "state", "sessions", "dead-old"))).toBe(false);
      });
    });

    it("preserves recent sessions even if empty", () => {
      withHomeFixture((home) => {
        makeSession(home, "young", { ageDays: 2, emptyMemory: true, hasCheckpoint: false });
        runGc(home, false);
        expect(existsSync(join(home, "qara", ".claude", "state", "sessions", "young"))).toBe(true);
      });
    });

    it("preserves sessions with a compact-checkpoint.json", () => {
      withHomeFixture((home) => {
        makeSession(home, "crashed-old", { ageDays: 30, emptyMemory: true, hasCheckpoint: true });
        runGc(home, false);
        expect(existsSync(join(home, "qara", ".claude", "state", "sessions", "crashed-old"))).toBe(true);
      });
    });

    it("preserves sessions with non-empty memory", () => {
      withHomeFixture((home) => {
        makeSession(home, "worked-old", { ageDays: 30, emptyMemory: false, hasCheckpoint: false });
        runGc(home, false);
        expect(existsSync(join(home, "qara", ".claude", "state", "sessions", "worked-old"))).toBe(true);
      });
    });

    it("handles opaque session-id formats (UUID + slug) identically (D9)", () => {
      withHomeFixture((home) => {
        makeSession(home, "76c05be5-a080-4019-bf54-61be67bca8ac", {
          ageDays: 20, emptyMemory: true, hasCheckpoint: false,
        });
        makeSession(home, "cruise-3k-im-2", {
          ageDays: 20, emptyMemory: true, hasCheckpoint: false,
        });
        runGc(home, false);
        const sessions = join(home, "qara", ".claude", "state", "sessions");
        expect(existsSync(join(sessions, "76c05be5-a080-4019-bf54-61be67bca8ac"))).toBe(false);
        expect(existsSync(join(sessions, "cruise-3k-im-2"))).toBe(false);
      });
    });

    it("preserves the archive/ dir regardless of age", () => {
      withHomeFixture((home) => {
        const archiveDir = join(home, "qara", ".claude", "state", "sessions", "archive");
        mkdirSync(archiveDir, { recursive: true });
        const past = new Date(Date.now() - 60 * 24 * 3600 * 1000);
        utimesSync(archiveDir, past, past);
        runGc(home, false);
        expect(existsSync(archiveDir)).toBe(true);
      });
    });
  });

  describe("stub MEMORY.md sweep", () => {
    it("deletes MEMORY.md with 1 line", () => {
      withHomeFixture((home) => {
        makeProject(home, "stub-1", 1);
        runGc(home, false);
        expect(existsSync(join(home, ".claude", "projects", "-stub-1", "memory", "MEMORY.md"))).toBe(false);
      });
    });

    it("deletes MEMORY.md with 2 lines", () => {
      withHomeFixture((home) => {
        makeProject(home, "stub-2", 2);
        runGc(home, false);
        expect(existsSync(join(home, ".claude", "projects", "-stub-2", "memory", "MEMORY.md"))).toBe(false);
      });
    });

    it("preserves MEMORY.md with 3+ lines", () => {
      withHomeFixture((home) => {
        makeProject(home, "real", 10);
        runGc(home, false);
        expect(existsSync(join(home, ".claude", "projects", "-real", "memory", "MEMORY.md"))).toBe(true);
      });
    });

    it("preserves the enclosing memory/ dir even when stub deleted", () => {
      withHomeFixture((home) => {
        makeProject(home, "stub-3", 1);
        runGc(home, false);
        expect(existsSync(join(home, ".claude", "projects", "-stub-3", "memory"))).toBe(true);
      });
    });
  });

  describe("dry-run", () => {
    it("never deletes anything in dry-run mode", () => {
      withHomeFixture((home) => {
        makeSession(home, "dead-dry", { ageDays: 30, emptyMemory: true, hasCheckpoint: false });
        makeProject(home, "stub-dry", 1);
        const r = runGc(home, true);
        expect(r.stdout).toContain("[dry-run]");
        expect(existsSync(join(home, "qara", ".claude", "state", "sessions", "dead-dry"))).toBe(true);
        expect(existsSync(join(home, ".claude", "projects", "-stub-dry", "memory", "MEMORY.md"))).toBe(true);
      });
    });

    it("prints what would be deleted", () => {
      withHomeFixture((home) => {
        makeSession(home, "dead-report", { ageDays: 30, emptyMemory: true, hasCheckpoint: false });
        const r = runGc(home, true);
        expect(r.stdout).toContain("dead-report");
      });
    });
  });

  describe("logging", () => {
    it("writes outcomes to ~/.claude/state/digests/memory-gc.log", () => {
      withHomeFixture((home) => {
        makeSession(home, "logged", { ageDays: 30, emptyMemory: true, hasCheckpoint: false });
        runGc(home, false);
        const log = join(home, ".claude", "state", "digests", "memory-gc.log");
        expect(existsSync(log)).toBe(true);
      });
    });
  });
});
