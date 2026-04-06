#!/usr/bin/env bun

/**
 * generate-image - PAI Image Generation CLI
 *
 * Generate images using Flux 1.1 Pro, Nano Banana Pro (Gemini), or GPT-image-1.
 * Smart output management with per-project gallery and metadata tracking.
 *
 * Usage:
 *   generate-image --model flux --prompt "..." --project /path/to/project --slug hero-image
 *
 * @see ${PAI_DIR}/skills/image/SKILL.md
 */

import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

import {
  CLIError,
  DEFAULTS,
  REPLICATE_SIZES,
  OPENAI_SIZES,
  GEMINI_SIZES,
  GEMINI_ASPECT_RATIOS,
  DEFAULT_OUTPUT_BASE,
  handleError,
  ensureOutputDir,
  writeMetadata,
  generateImage,
  type Model,
  type Size,
  type ReplicateSize,
  type GeminiSize,
  type OpenAISize,
  type CLIArgs,
  type ImageMetadata,
} from "./generate-image-lib";

// Re-export everything for backward compatibility (tests import from this file)
export * from "./generate-image-lib";

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  const envPath = resolve(process.env.HOME!, '.claude/.env');
  try {
    const envContent = await readFile(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Silently continue if .env doesn't exist
  }
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
generate-image - PAI Image Generation CLI

Generate images using Flux 1.1 Pro, Nano Banana Pro (Gemini), or GPT-image-1.
Outputs to per-project gallery with metadata tracking.

USAGE:
  generate-image --model <model> --prompt "<prompt>" --slug <name> [OPTIONS]

REQUIRED:
  --model <model>      Model to use: flux, nano-banana-pro, gpt-image-1
  --prompt <text>      Image generation prompt (quote if contains spaces)
  --slug <name>        Name for output subdirectory (kebab-case recommended)

OPTIONS:
  --project <path>            Output base directory (default: ~/thoughts/global/shared/generated)
  --size <size>               Image size/aspect ratio (default: 16:9)
                              Replicate (flux): 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
                              OpenAI (gpt-image-1): 1024x1024, 1536x1024, 1024x1536
                              Gemini (nano-banana-pro): 1K, 2K, 4K (resolution)
  --aspect-ratio <ratio>      Aspect ratio for nano-banana-pro (default: 16:9)
                              Options: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
  --reference-image <path>    Reference image for style guidance (nano-banana-pro only)
                              Accepts: PNG, JPEG, WebP
  --transparent               Add transparency instructions to prompt
  --remove-bg                 Remove background after generation (requires REMOVEBG_API_KEY)
  --creative-variations <n>   Generate N variations (1-10, saved as v1.png, v2.png, etc.)
  --help, -h                  Show this help message

OUTPUT:
  Images are saved to: ~/thoughts/global/shared/generated/{YYYY-MM-DD}-{slug}/image.png
  Metadata is saved alongside: ~/thoughts/global/shared/generated/{YYYY-MM-DD}-{slug}/metadata.json
  Override with --project to change the output base directory.

EXAMPLES:
  # Blog header with Flux (highest artistic quality)
  generate-image --model flux --prompt "Abstract typography composition" --slug blog-header

  # Teaching diagram with Gemini (best text rendering)
  generate-image --model nano-banana-pro --prompt "Typography anatomy diagram" --size 2K --aspect-ratio 16:9 --slug typo-anatomy

  # Photorealistic mockup with GPT-image-1
  generate-image --model gpt-image-1 --prompt "Modern SaaS dashboard" --size 1536x1024 --slug dashboard-mockup

  # With reference image (nano-banana-pro only)
  generate-image --model nano-banana-pro --prompt "Similar composition, different palette" --reference-image /tmp/ref.png --size 2K --slug variation

  # Generate 3 creative variations
  generate-image --model flux --prompt "Editorial cover" --creative-variations 3 --slug cover-options

  # Specific project output
  generate-image --model flux --prompt "Hero image" --project ~/Projects/my-site --slug hero

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for flux model
  OPENAI_API_KEY       Required for gpt-image-1 model
  GOOGLE_API_KEY       Required for nano-banana-pro model
  REMOVEBG_API_KEY     Required for --remove-bg flag

SMART ROUTER (via workflows):
  The image skill's smart-route workflow auto-selects the best model:
    Typography/infographics -> nano-banana-pro (best text rendering)
    Artistic/editorial      -> flux (highest quality)
    Photorealistic          -> gpt-image-1 (best photorealism)
    Reference image needed  -> nano-banana-pro (only model with support)
`);
  process.exit(0);
}

// ============================================================================
// Argument Parsing
// ============================================================================

export function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    showHelp();
  }

  const parsed: Partial<CLIArgs> = {
    model: DEFAULTS.model,
    size: DEFAULTS.size,
    project: DEFAULT_OUTPUT_BASE,
  };

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith("--")) {
      throw new CLIError(`Invalid flag: ${flag}. Flags must start with --`);
    }

    const key = flag.slice(2);

    // Boolean flags
    if (key === "transparent") { parsed.transparent = true; continue; }
    if (key === "remove-bg") { parsed.removeBg = true; continue; }

    // Flags with values
    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CLIError(`Missing value for flag: ${flag}`);
    }

    switch (key) {
      case "model":
        if (value !== "flux" && value !== "nano-banana-pro" && value !== "gpt-image-1") {
          throw new CLIError(`Invalid model: ${value}. Must be: flux, nano-banana-pro, or gpt-image-1`);
        }
        parsed.model = value;
        i++;
        break;
      case "prompt":
        parsed.prompt = value;
        i++;
        break;
      case "size":
        parsed.size = value as Size;
        i++;
        break;
      case "aspect-ratio":
        parsed.aspectRatio = value as ReplicateSize;
        i++;
        break;
      case "project":
        parsed.project = resolve(value);
        i++;
        break;
      case "slug":
        parsed.slug = value;
        i++;
        break;
      case "reference-image":
        parsed.referenceImage = value;
        i++;
        break;
      case "creative-variations": {
        const variations = parseInt(value, 10);
        if (isNaN(variations) || variations < 1 || variations > 10) {
          throw new CLIError(`Invalid creative-variations: ${value}. Must be 1-10`);
        }
        parsed.creativeVariations = variations;
        i++;
        break;
      }
      default:
        throw new CLIError(`Unknown flag: ${flag}`);
    }
  }

  // Validate required arguments
  if (!parsed.prompt) throw new CLIError("Missing required argument: --prompt");
  if (!parsed.model) throw new CLIError("Missing required argument: --model");
  if (!parsed.slug) throw new CLIError("Missing required argument: --slug");

  // Validate reference-image model constraint
  if (parsed.referenceImage && parsed.model !== "nano-banana-pro") {
    throw new CLIError("--reference-image is only supported with --model nano-banana-pro");
  }

  // Validate size per model
  if (parsed.model === "gpt-image-1") {
    if (!OPENAI_SIZES.includes(parsed.size as OpenAISize)) {
      throw new CLIError(`Invalid size for gpt-image-1: ${parsed.size}. Must be: ${OPENAI_SIZES.join(", ")}`);
    }
  } else if (parsed.model === "nano-banana-pro") {
    if (!GEMINI_SIZES.includes(parsed.size as GeminiSize)) {
      throw new CLIError(`Invalid size for nano-banana-pro: ${parsed.size}. Must be: ${GEMINI_SIZES.join(", ")}`);
    }
    if (parsed.aspectRatio && !GEMINI_ASPECT_RATIOS.includes(parsed.aspectRatio)) {
      throw new CLIError(`Invalid aspect-ratio: ${parsed.aspectRatio}. Must be: ${GEMINI_ASPECT_RATIOS.join(", ")}`);
    }
    if (!parsed.aspectRatio) parsed.aspectRatio = "16:9";
  } else {
    if (!REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
      throw new CLIError(`Invalid size for ${parsed.model}: ${parsed.size}. Must be: ${REPLICATE_SIZES.join(", ")}`);
    }
  }

  return parsed as CLIArgs;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);

    const outputDir = await ensureOutputDir(args.project, args.slug);

    // Build flags list for metadata
    const flags: string[] = [];
    if (args.transparent) flags.push("--transparent");
    if (args.removeBg) flags.push("--remove-bg");
    if (args.referenceImage) flags.push("--reference-image");

    const buildMetadata = (outputFile: string): ImageMetadata => ({
      prompt: args.prompt,
      model: args.model,
      aspect_ratio: args.aspectRatio || args.size,
      size: String(args.size),
      timestamp: new Date().toISOString(),
      reference_image: args.referenceImage || null,
      flags,
      output_file: outputFile,
    });

    if (args.creativeVariations && args.creativeVariations > 1) {
      console.log(`Creative Mode: Generating ${args.creativeVariations} variations...\n`);

      const promises: Promise<void>[] = [];
      for (let i = 1; i <= args.creativeVariations; i++) {
        const varOutput = join(outputDir, `v${i}.png`);
        console.log(`Variation ${i}/${args.creativeVariations}: ${varOutput}`);
        promises.push(generateImage(args, varOutput));
      }

      await Promise.all(promises);
      console.log(`\nGenerated ${args.creativeVariations} variations`);
      await writeMetadata(outputDir, buildMetadata(`v1.png through v${args.creativeVariations}.png`));
    } else {
      // Single image generation
      const outputPath = join(outputDir, "image.png");
      await generateImage(args, outputPath);
      await writeMetadata(outputDir, buildMetadata("image.png"));
    }
  } catch (error) {
    handleError(error);
  }
}

// Direct execution guard
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("generate-image.ts");
if (isDirectExecution && !process.env.GENERATE_IMAGE_NO_CLI) {
  main();
}
