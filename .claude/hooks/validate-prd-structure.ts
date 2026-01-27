#!/usr/bin/env bun

/**
 * validate-prd-structure.ts
 *
 * Per-agent hook for architect: Validates PRD structure after Write operations.
 * Ensures PRDs have required sections for quality and completeness.
 *
 * Triggered: PostToolUse Write (when architect writes PRD files)
 */

import { readFileSync, existsSync } from 'fs';

interface HookInput {
  tool_name: string;
  tool_input?: {
    file_path?: string;
    content?: string;
  };
}

/**
 * Required PRD sections for completeness
 */
const REQUIRED_SECTIONS = [
  { name: 'Summary', patterns: ['## summary', '## executive summary', '## overview'] },
  { name: 'Architecture', patterns: ['## architecture', '## system architecture', '## technical architecture'] },
  { name: 'Requirements', patterns: ['## requirements', '## functional requirements', '## feature breakdown'] },
  { name: 'Implementation', patterns: ['## implementation', '## checklists', '## implementation checklists'] },
];

/**
 * Check if content contains a section (case-insensitive)
 */
function hasSection(content: string, patterns: string[]): boolean {
  const lowerContent = content.toLowerCase();
  return patterns.some((pattern) => lowerContent.includes(pattern));
}

/**
 * Validate PRD structure
 */
function validatePRD(content: string): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const section of REQUIRED_SECTIONS) {
    if (!hasSection(content, section.patterns)) {
      missing.push(section.name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if file is a PRD (by path or content indicators)
 */
function isPRDFile(filePath: string, content: string): boolean {
  const lowerPath = filePath.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Check path indicators
  if (
    lowerPath.includes('prd') ||
    lowerPath.includes('requirements') ||
    lowerPath.includes('specification') ||
    lowerPath.includes('design-doc')
  ) {
    return true;
  }

  // Check content indicators
  if (
    lowerContent.includes('product requirements') ||
    lowerContent.includes('technical specification') ||
    lowerContent.includes('prd:') ||
    (lowerContent.includes('## architecture') && lowerContent.includes('## requirements'))
  ) {
    return true;
  }

  return false;
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) {
      process.exit(0);
    }

    const data: HookInput = JSON.parse(input);

    // Only process Write tool calls
    if (data.tool_name !== 'Write') {
      process.exit(0);
    }

    const filePath = data.tool_input?.file_path;
    const content = data.tool_input?.content;

    if (!filePath || !content) {
      process.exit(0);
    }

    // Only validate PRD files
    if (!isPRDFile(filePath, content)) {
      process.exit(0);
    }

    // Validate the PRD structure
    const { valid, missing } = validatePRD(content);

    if (!valid) {
      console.error(`⚠️ PRD Validation Warning: Missing sections - ${missing.join(', ')}`);
      console.error(`📋 Required sections: ${REQUIRED_SECTIONS.map((s) => s.name).join(', ')}`);
      console.error(`💡 Consider adding these sections for a complete PRD.`);
      // Note: We warn but don't block - hooks shouldn't prevent valid operations
    } else {
      console.error(`✅ PRD structure validated: All required sections present`);
    }
  } catch (error) {
    // Fail silently - don't block architect operations
    console.error('PRD validation hook error:', error);
  }
}

main();
