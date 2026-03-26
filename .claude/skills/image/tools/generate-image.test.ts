/**
 * generate-image.ts tests
 *
 * Tests CLI arg parsing, validation, model routing, date formatting,
 * transparency prompt enhancement. No actual API calls.
 */

import { describe, it, expect } from "bun:test";

// Suppress CLI execution
process.env.GENERATE_IMAGE_NO_CLI = "1";

import {
  parseArgs,
  getDatePrefix,
  enhancePromptForTransparency,
  CLIError,
  DEFAULTS,
  REPLICATE_SIZES,
  OPENAI_SIZES,
  GEMINI_SIZES,
} from "./generate-image";

// Helper: build minimal valid argv (parseArgs expects argv with 2 prefix items)
function argv(...args: string[]): string[] {
  return ["bun", "generate-image.ts", ...args];
}

// ─── parseArgs ──────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("parses minimal valid args", () => {
    const result = parseArgs(argv("--prompt", "a cat", "--slug", "cat-test"));
    expect(result.prompt).toBe("a cat");
    expect(result.slug).toBe("cat-test");
    expect(result.model).toBe(DEFAULTS.model); // default: flux
    expect(result.size).toBe(DEFAULTS.size); // default: 16:9
  });

  it("parses explicit model", () => {
    const result = parseArgs(argv("--model", "gpt-image-1", "--prompt", "test", "--slug", "s", "--size", "1024x1024"));
    expect(result.model).toBe("gpt-image-1");
  });

  it("parses nano-banana-pro with aspect ratio", () => {
    const result = parseArgs(argv(
      "--model", "nano-banana-pro",
      "--prompt", "test",
      "--slug", "s",
      "--size", "1K",
      "--aspect-ratio", "16:9"
    ));
    expect(result.model).toBe("nano-banana-pro");
    expect(result.aspectRatio).toBe("16:9");
  });

  it("parses boolean flags", () => {
    const result = parseArgs(argv("--prompt", "test", "--slug", "s", "--transparent"));
    expect(result.transparent).toBe(true);
  });

  it("parses project path", () => {
    const result = parseArgs(argv("--prompt", "test", "--slug", "s", "--project", "/tmp/my-project"));
    expect(result.project).toContain("my-project");
  });

  it("parses creative-variations", () => {
    const result = parseArgs(argv("--prompt", "test", "--slug", "s", "--creative-variations", "3"));
    expect(result.creativeVariations).toBe(3);
  });

  describe("validation errors", () => {
    it("throws on missing prompt", () => {
      expect(() => parseArgs(argv("--slug", "s"))).toThrow(CLIError);
      expect(() => parseArgs(argv("--slug", "s"))).toThrow("--prompt");
    });

    it("throws on missing slug", () => {
      expect(() => parseArgs(argv("--prompt", "test"))).toThrow(CLIError);
      expect(() => parseArgs(argv("--prompt", "test"))).toThrow("--slug");
    });

    it("throws on invalid model", () => {
      expect(() => parseArgs(argv("--model", "dalle", "--prompt", "test", "--slug", "s"))).toThrow("Invalid model");
    });

    it("throws on unknown flag with value", () => {
      expect(() => parseArgs(argv("--prompt", "test", "--slug", "s", "--nope", "val"))).toThrow("Unknown flag");
    });

    it("throws on non-flag argument", () => {
      expect(() => parseArgs(argv("naked-arg"))).toThrow("Invalid flag");
    });

    it("throws on invalid size for gpt-image-1", () => {
      expect(() => parseArgs(argv(
        "--model", "gpt-image-1", "--prompt", "test", "--slug", "s", "--size", "16:9"
      ))).toThrow("Invalid size for gpt-image-1");
    });

    it("throws on reference-image with non-nano model", () => {
      expect(() => parseArgs(argv(
        "--model", "flux", "--prompt", "test", "--slug", "s", "--reference-image", "/tmp/ref.png"
      ))).toThrow("only supported with --model nano-banana-pro");
    });

    it("throws on creative-variations out of range", () => {
      expect(() => parseArgs(argv(
        "--prompt", "test", "--slug", "s", "--creative-variations", "99"
      ))).toThrow("Must be 1-10");
    });
  });
});

// ─── getDatePrefix ──────────────────────────────────────────────────────────

describe("getDatePrefix", () => {
  it("returns YYYY-MM-DD format", () => {
    const prefix = getDatePrefix();
    expect(prefix).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches today's date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(getDatePrefix()).toBe(expected);
  });
});

// ─── enhancePromptForTransparency ───────────────────────────────────────────

describe("enhancePromptForTransparency", () => {
  it("prepends transparency instructions", () => {
    const result = enhancePromptForTransparency("a red ball");
    expect(result).toContain("Transparent background");
    expect(result).toContain("a red ball");
  });

  it("preserves original prompt at end", () => {
    const result = enhancePromptForTransparency("my prompt");
    expect(result.endsWith("my prompt")).toBe(true);
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe("constants", () => {
  it("REPLICATE_SIZES has expected aspect ratios", () => {
    expect(REPLICATE_SIZES).toContain("1:1");
    expect(REPLICATE_SIZES).toContain("16:9");
    expect(REPLICATE_SIZES).toContain("9:16");
  });

  it("OPENAI_SIZES has expected pixel dimensions", () => {
    expect(OPENAI_SIZES).toContain("1024x1024");
    expect(OPENAI_SIZES).toContain("1536x1024");
  });

  it("GEMINI_SIZES has K-suffixed sizes", () => {
    expect(GEMINI_SIZES).toContain("1K");
    expect(GEMINI_SIZES).toContain("4K");
  });

  it("DEFAULTS uses flux model", () => {
    expect(DEFAULTS.model).toBe("flux");
  });
});
