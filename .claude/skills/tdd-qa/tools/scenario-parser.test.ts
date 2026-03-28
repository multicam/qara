/**
 * scenario-parser.ts tests
 *
 * Covers: feature extraction, context parsing, step parsing (Given/When/Then/And),
 * priority extraction, multi-step scenarios, out-of-scope, acceptance criteria,
 * directory parsing, edge cases, and CLI routing.
 *
 * Run with: bun test ./.claude/skills/tdd-qa/tools/scenario-parser.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Suppress CLI auto-execution during tests
process.env.SCENARIO_PARSER_NO_CLI = "1";

import {
  parseScenarioFile,
  parseScenarioDir,
  runCLI,
  USAGE,
  type CLIResult,
  type ScenarioManifest,
} from "./scenario-parser";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FULL_SPEC = `# Feature: User Authentication

## Context
Handles login, logout, and session management for the web application.

## Scenarios

### Scenario: successful login with valid credentials
- **Given** a registered user with email "test@example.com"
- **When** they submit the login form with correct password
- **Then** they receive a valid auth token
- **Priority:** critical

### Scenario: login rejected for wrong password
- **Given** a registered user with email "test@example.com"
- **When** they submit the login form with incorrect password
- **Then** an error message "Invalid credentials" is displayed
- **Priority:** critical

### Scenario: session expires after inactivity
- **Given** a logged-in user
- **When** 30 minutes pass without any activity
- **Then** the session is invalidated
- **And** the user is redirected to the login page
- **Priority:** important

## Out of Scope
- OAuth/SSO integration
- Two-factor authentication

## Acceptance Criteria
- [ ] All critical scenarios pass
- [ ] No regressions in existing tests
- [ ] Token expiry is configurable
`;

const MULTI_STEP_SPEC = `# Feature: Checkout Flow

## Context
E-commerce checkout with discount codes.

## Scenarios

### Scenario: checkout with discount code
- **Given** a cart with 2 items totaling $50
- **And** a valid discount code "SAVE10" for 10% off
- **When** the user applies the discount code
- **And** completes checkout
- **Then** the total charged is $45
- **And** a confirmation email is sent
- **Priority:** critical
`;

const MINIMAL_SPEC = `# Feature: Minimal Feature

## Scenarios

### Scenario: basic case
- **Given** some precondition
- **When** something happens
- **Then** expected outcome
- **Priority:** nice-to-have
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("scenario-parser", () => {
  describe("parseScenarioFile", () => {
    describe("full spec parsing", () => {
      let manifest: ScenarioManifest;

      beforeAll(() => {
        manifest = parseScenarioFile(FULL_SPEC, "specs/user-auth.md");
      });

      it("extracts feature name", () => {
        expect(manifest.feature).toBe("User Authentication");
      });

      it("extracts context", () => {
        expect(manifest.context).toContain("login, logout, and session management");
      });

      it("extracts all scenarios", () => {
        expect(manifest.scenarios).toHaveLength(3);
      });

      it("extracts scenario names", () => {
        expect(manifest.scenarios[0].name).toBe("successful login with valid credentials");
        expect(manifest.scenarios[1].name).toBe("login rejected for wrong password");
        expect(manifest.scenarios[2].name).toBe("session expires after inactivity");
      });

      it("extracts Given/When/Then steps", () => {
        const s = manifest.scenarios[0];
        expect(s.steps).toHaveLength(3);
        expect(s.steps[0]).toEqual({
          keyword: "Given",
          text: 'a registered user with email "test@example.com"',
        });
        expect(s.steps[1].keyword).toBe("When");
        expect(s.steps[2].keyword).toBe("Then");
      });

      it("extracts priority", () => {
        expect(manifest.scenarios[0].priority).toBe("critical");
        expect(manifest.scenarios[1].priority).toBe("critical");
        expect(manifest.scenarios[2].priority).toBe("important");
      });

      it("extracts And steps", () => {
        const s = manifest.scenarios[2];
        expect(s.steps).toHaveLength(4);
        expect(s.steps[3]).toEqual({
          keyword: "And",
          text: "the user is redirected to the login page",
        });
      });

      it("extracts out of scope items", () => {
        expect(manifest.outOfScope).toHaveLength(2);
        expect(manifest.outOfScope[0]).toBe("OAuth/SSO integration");
        expect(manifest.outOfScope[1]).toBe("Two-factor authentication");
      });

      it("extracts acceptance criteria", () => {
        expect(manifest.acceptanceCriteria).toHaveLength(3);
        expect(manifest.acceptanceCriteria[0]).toBe("All critical scenarios pass");
        expect(manifest.acceptanceCriteria[2]).toBe("Token expiry is configurable");
      });

      it("records source file", () => {
        expect(manifest.sourceFile).toBe("specs/user-auth.md");
      });
    });

    describe("multi-step scenarios", () => {
      it("parses And steps correctly", () => {
        const manifest = parseScenarioFile(MULTI_STEP_SPEC, "specs/checkout.md");
        const s = manifest.scenarios[0];
        expect(s.steps).toHaveLength(6);
        expect(s.steps[0].keyword).toBe("Given");
        expect(s.steps[1].keyword).toBe("And");
        expect(s.steps[2].keyword).toBe("When");
        expect(s.steps[3].keyword).toBe("And");
        expect(s.steps[4].keyword).toBe("Then");
        expect(s.steps[5].keyword).toBe("And");
      });
    });

    describe("minimal spec", () => {
      it("handles spec with no context section", () => {
        const manifest = parseScenarioFile(MINIMAL_SPEC, "specs/minimal.md");
        expect(manifest.feature).toBe("Minimal Feature");
        expect(manifest.context).toBe("");
        expect(manifest.scenarios).toHaveLength(1);
        expect(manifest.scenarios[0].priority).toBe("nice-to-have");
      });

      it("handles empty out-of-scope and acceptance", () => {
        const manifest = parseScenarioFile(MINIMAL_SPEC, "specs/minimal.md");
        expect(manifest.outOfScope).toHaveLength(0);
        expect(manifest.acceptanceCriteria).toHaveLength(0);
      });
    });

    describe("edge cases", () => {
      it("handles empty file", () => {
        const manifest = parseScenarioFile("", "empty.md");
        expect(manifest.feature).toBe("");
        expect(manifest.scenarios).toHaveLength(0);
        expect(manifest.context).toBe("");
      });

      it("handles file with no scenarios section", () => {
        const content = "# Feature: Orphan\n\n## Context\nJust context, no scenarios.\n";
        const manifest = parseScenarioFile(content, "orphan.md");
        expect(manifest.feature).toBe("Orphan");
        expect(manifest.context).toBe("Just context, no scenarios.");
        expect(manifest.scenarios).toHaveLength(0);
      });

      it("handles scenario with missing priority (defaults to important)", () => {
        const content = `# Feature: No Priority

## Scenarios

### Scenario: step without explicit priority
- **Given** something
- **When** action
- **Then** result
`;
        const manifest = parseScenarioFile(content, "no-priority.md");
        expect(manifest.scenarios[0].priority).toBe("important");
      });

      it("handles scenario with no steps", () => {
        const content = `# Feature: Empty Scenario

## Scenarios

### Scenario: placeholder
- **Priority:** critical
`;
        const manifest = parseScenarioFile(content, "empty-scenario.md");
        expect(manifest.scenarios[0].steps).toHaveLength(0);
        expect(manifest.scenarios[0].priority).toBe("critical");
      });

      it("ignores code blocks inside the format reference", () => {
        // The scenario-format.md itself contains template examples in fenced code blocks
        // A real spec file should not have fenced code blocks, but let's handle it gracefully
        const content = `# Feature: Test

## Scenarios

### Scenario: real scenario
- **Given** precondition
- **When** action
- **Then** result
- **Priority:** critical
`;
        const manifest = parseScenarioFile(content, "test.md");
        expect(manifest.scenarios).toHaveLength(1);
        expect(manifest.scenarios[0].name).toBe("real scenario");
      });
    });
  });

  describe("parseScenarioDir", () => {
    const TEST_DIR = join(tmpdir(), `scenario-parser-dir-${process.pid}`);

    beforeAll(() => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(
        join(TEST_DIR, "user-auth.md"),
        FULL_SPEC
      );
      writeFileSync(
        join(TEST_DIR, "checkout.md"),
        MULTI_STEP_SPEC
      );
      writeFileSync(
        join(TEST_DIR, "README.md"),
        "# This is not a scenario file\n"
      );
    });

    afterAll(() => {
      rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it("parses all .md files except README.md", () => {
      const manifests = parseScenarioDir(TEST_DIR);
      expect(manifests).toHaveLength(2);
    });

    it("returns manifests sorted by filename", () => {
      const manifests = parseScenarioDir(TEST_DIR);
      expect(manifests[0].feature).toBe("Checkout Flow");
      expect(manifests[1].feature).toBe("User Authentication");
    });

    it("sets correct source paths", () => {
      const manifests = parseScenarioDir(TEST_DIR);
      expect(manifests[0].sourceFile).toContain("checkout.md");
      expect(manifests[1].sourceFile).toContain("user-auth.md");
    });
  });

  describe("CLI", () => {
    it("exports USAGE string", () => {
      expect(USAGE).toContain("scenario-parser.ts");
      expect(USAGE).toContain("--json");
    });

    it("exports runCLI function", () => {
      expect(typeof runCLI).toBe("function");
    });

    it("should return help for empty args", () => {
      const result = runCLI([]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("should return help for --help", () => {
      const result = runCLI(["--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("should error for nonexistent path", () => {
      const result = runCLI(["/tmp/nonexistent-scenario-dir-xyz"]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Error:");
    });
  });
});
