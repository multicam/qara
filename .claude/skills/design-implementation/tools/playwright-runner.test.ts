/**
 * playwright-runner.ts tests
 *
 * Tests config loading with defaults, type structure. No browser automation.
 */

import { describe, it, expect } from "bun:test";

process.env.PLAYWRIGHT_RUNNER_NO_CLI = "1";

import { loadConfig, type Config, type CaptureResult } from "./playwright-runner";

describe("playwright-runner", () => {
  describe("loadConfig", () => {
    it("returns defaults when no config.json exists", async () => {
      const config = await loadConfig();
      expect(config.headless).toBe(false);
      expect(config.viewport).toEqual({ width: 1280, height: 720 });
      expect(config.timeout).toBe(30000);
    });

    it("config has correct types", async () => {
      const config = await loadConfig();
      expect(typeof config.headless).toBe("boolean");
      expect(typeof config.viewport.width).toBe("number");
      expect(typeof config.viewport.height).toBe("number");
      expect(typeof config.timeout).toBe("number");
    });

    it("viewport dimensions are positive", async () => {
      const config = await loadConfig();
      expect(config.viewport.width).toBeGreaterThan(0);
      expect(config.viewport.height).toBeGreaterThan(0);
    });

    it("timeout is reasonable", async () => {
      const config = await loadConfig();
      expect(config.timeout).toBeGreaterThanOrEqual(1000);
      expect(config.timeout).toBeLessThanOrEqual(120000);
    });
  });

  describe("type contracts", () => {
    it("CaptureResult satisfies expected shape", () => {
      const result: CaptureResult = {
        screenshot: "path.png",
        consoleMessages: [],
        networkRequests: [],
        errors: [],
      };
      expect(result.screenshot).toBeDefined();
      expect(result.consoleMessages).toBeInstanceOf(Array);
      expect(result.networkRequests).toBeInstanceOf(Array);
      expect(result.errors).toBeInstanceOf(Array);
    });
  });
});
