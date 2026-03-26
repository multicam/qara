#!/usr/bin/env bun
/**
 * e2e-freeze.ts — Rename .draft.spec.ts -> .spec.ts with validation.
 *
 * Usage:
 *   bun e2e-freeze.ts tests/e2e/login.draft.spec.ts
 *   bun e2e-freeze.ts tests/e2e/*.draft.spec.ts  (multiple files)
 */

import { existsSync, renameSync } from "fs";

const files = Bun.argv.slice(2);

if (files.length === 0 || files[0] === "--help") {
  console.log(`Usage: bun e2e-freeze.ts <file.draft.spec.ts> [...]

Renames .draft.spec.ts -> .spec.ts to freeze E2E tests for CI.
Validates: file exists, has .draft.spec.ts extension, target doesn't already exist.`);
  process.exit(0);
}

let frozen = 0;
let errors = 0;

for (const file of files) {
  if (!file.endsWith(".draft.spec.ts")) {
    console.error(`SKIP: ${file} — not a .draft.spec.ts file`);
    errors++;
    continue;
  }

  if (!existsSync(file)) {
    console.error(`SKIP: ${file} — file not found`);
    errors++;
    continue;
  }

  const target = file.replace(".draft.spec.ts", ".spec.ts");

  if (existsSync(target)) {
    console.error(`SKIP: ${file} — target ${target} already exists`);
    errors++;
    continue;
  }

  renameSync(file, target);
  console.log(`FROZEN: ${file} -> ${target}`);
  frozen++;
}

console.log(`\nDone: ${frozen} frozen, ${errors} skipped`);
process.exit(errors > 0 ? 1 : 0);
