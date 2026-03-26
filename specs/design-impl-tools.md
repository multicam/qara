# Feature: Design Implementation Tools

## Context
server-manager.ts manages dev server lifecycle (start/stop/status) with port detection from package.json. playwright-runner.ts automates browser testing for design verification. Both support the design-implementation skill's implement-verify-fix loop.

## Scenarios

### server-manager.ts

### Scenario: Start dev server from package.json
- **Given** a package.json with `scripts.dev: "bun run dev"`
- **When** server-manager start is called
- **Then** the dev command is executed in background
- **And** state.json records PID, port, and start time
- **Priority:** critical

### Scenario: Detect port from framework pattern
- **Given** a Next.js project (next in dependencies)
- **When** port detection runs
- **Then** default port 3000 is detected
- **Priority:** important

### Scenario: Detect port from Astro project
- **Given** an Astro project (astro in dependencies)
- **When** port detection runs
- **Then** default port 4321 is detected
- **Priority:** important

### Scenario: Stop running server
- **Given** a dev server is running (state.json has PID)
- **When** server-manager stop is called
- **Then** the process is killed
- **And** state.json is cleared
- **Priority:** critical

### Scenario: Status shows running server
- **Given** a dev server is running on port 3000
- **When** server-manager status is called
- **Then** output shows PID, port, and uptime
- **Priority:** important

### Scenario: Handle server already stopped
- **Given** state.json references a PID that no longer exists
- **When** server-manager stop is called
- **Then** state.json is cleaned up without error
- **Priority:** important

### playwright-runner.ts

### Scenario: Load config and connect to URL
- **Given** a config.json with target URL http://localhost:3000
- **When** playwright-runner initializes
- **Then** Chromium browser launches in headless mode
- **And** navigates to the configured URL
- **Priority:** critical

### Scenario: Capture screenshot
- **Given** a running browser page
- **When** screenshot action is requested
- **Then** PNG file is saved to output directory
- **And** file path is included in JSON result
- **Priority:** important

### Scenario: Capture console errors
- **Given** a page that logs errors to console
- **When** console capture is active
- **Then** error messages are collected in result JSON
- **Priority:** important

## Out of Scope
- Testing actual browser rendering (mock Playwright objects)
- Testing Bun shell internals
- Testing lsof/network utilities

## Acceptance Criteria
- [ ] server-manager state serialization tested with temp files
- [ ] Port detection heuristics tested for each framework
- [ ] playwright-runner config loading tested
- [ ] Output JSON structure validated
- [ ] All mock-based (no actual processes spawned in unit tests)
