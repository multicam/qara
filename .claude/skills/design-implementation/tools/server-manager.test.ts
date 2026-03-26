/**
 * server-manager.ts tests
 *
 * Tests port detection heuristics and command detection from package.json.
 * Uses temp fixture directories with real package.json files.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

process.env.SERVER_MANAGER_NO_CLI = "1";

import { detectPort, detectCommand } from "./server-manager";

const FIXTURE_DIR = join(tmpdir(), `server-mgr-test-${process.pid}`);

function makeProject(name: string, scripts: Record<string, string>): string {
  const dir = join(FIXTURE_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts }, null, 2));
  return dir;
}

describe("server-manager", () => {
  afterAll(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  describe("detectPort", () => {
    it("detects explicit --port flag", () => {
      const dir = makeProject("explicit-port", { dev: "vite --port 3000" });
      expect(detectPort(dir)).toBe(3000);
    });

    it("detects -p flag", () => {
      const dir = makeProject("p-flag", { dev: "next dev -p 4000" });
      expect(detectPort(dir)).toBe(4000);
    });

    it("detects --port= syntax", () => {
      const dir = makeProject("port-eq", { dev: "bun --port=8080" });
      expect(detectPort(dir)).toBe(8080);
    });

    it("defaults to 5173 for vite", () => {
      const dir = makeProject("vite-default", { dev: "vite" });
      expect(detectPort(dir)).toBe(5173);
    });

    it("defaults to 3000 for next", () => {
      const dir = makeProject("next-default", { dev: "next dev" });
      expect(detectPort(dir)).toBe(3000);
    });

    it("defaults to 4321 for astro", () => {
      const dir = makeProject("astro-default", { dev: "astro dev" });
      expect(detectPort(dir)).toBe(4321);
    });

    it("defaults to 3000 for nuxt", () => {
      const dir = makeProject("nuxt-default", { dev: "nuxt dev" });
      expect(detectPort(dir)).toBe(3000);
    });

    it("defaults to 8000 for gatsby", () => {
      const dir = makeProject("gatsby-default", { dev: "gatsby develop" });
      expect(detectPort(dir)).toBe(8000);
    });

    it("defaults to 5173 for svelte", () => {
      const dir = makeProject("svelte-default", { dev: "svelte-kit dev" });
      expect(detectPort(dir)).toBe(5173);
    });

    it("falls back to 5173 with no scripts", () => {
      const dir = makeProject("empty-scripts", {});
      expect(detectPort(dir)).toBe(5173);
    });

    it("falls back to 5173 when dir doesn't exist", () => {
      expect(detectPort("/nonexistent/path")).toBe(5173);
    });

    it("uses start script if no dev script", () => {
      const dir = makeProject("start-only", { start: "next start -p 9000" });
      expect(detectPort(dir)).toBe(9000);
    });
  });

  describe("detectCommand", () => {
    it("returns 'bun run dev' when dev script exists", () => {
      const dir = makeProject("has-dev", { dev: "vite" });
      expect(detectCommand(dir)).toBe("bun run dev");
    });

    it("returns 'bun run start' when only start exists", () => {
      const dir = makeProject("has-start", { start: "node server.js" });
      expect(detectCommand(dir)).toBe("bun run start");
    });

    it("returns 'bun run serve' when only serve exists", () => {
      const dir = makeProject("has-serve", { serve: "sirv public" });
      expect(detectCommand(dir)).toBe("bun run serve");
    });

    it("prefers dev over start", () => {
      const dir = makeProject("dev-and-start", { dev: "vite", start: "node ." });
      expect(detectCommand(dir)).toBe("bun run dev");
    });

    it("falls back to 'bun run dev' with no scripts", () => {
      const dir = makeProject("no-scripts-cmd", {});
      expect(detectCommand(dir)).toBe("bun run dev");
    });

    it("falls back when dir doesn't exist", () => {
      expect(detectCommand("/nonexistent/path")).toBe("bun run dev");
    });
  });
});
