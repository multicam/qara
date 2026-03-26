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

import Replicate from "replicate";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { extname, resolve, join, basename } from "node:path";

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
// Types
// ============================================================================

type Model = "flux" | "nano-banana-pro" | "gpt-image-1";
type ReplicateSize = "1:1" | "16:9" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "21:9";
type OpenAISize = "1024x1024" | "1536x1024" | "1024x1536";
type GeminiSize = "1K" | "2K" | "4K";
type Size = ReplicateSize | OpenAISize | GeminiSize;

interface CLIArgs {
  model: Model;
  prompt: string;
  size: Size;
  aspectRatio?: ReplicateSize;
  project: string;
  slug: string;
  creativeVariations?: number;
  transparent?: boolean;
  referenceImage?: string;
  removeBg?: boolean;
}

interface ImageMetadata {
  prompt: string;
  model: Model;
  aspect_ratio: string;
  size: string;
  timestamp: string;
  reference_image: string | null;
  flags: string[];
  output_file: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: "flux" as Model,
  size: "16:9" as Size,
};

const REPLICATE_SIZES: ReplicateSize[] = ["1:1", "16:9", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "21:9"];
const OPENAI_SIZES: OpenAISize[] = ["1024x1024", "1536x1024", "1024x1536"];
const GEMINI_SIZES: GeminiSize[] = ["1K", "2K", "4K"];
const GEMINI_ASPECT_RATIOS: ReplicateSize[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// ============================================================================
// Error Handling
// ============================================================================

class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "CLIError";
  }
}

function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }
  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
  console.error(`Unknown error:`, error);
  process.exit(1);
}

// ============================================================================
// Output Directory Management
// ============================================================================

function getDatePrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const DEFAULT_OUTPUT_BASE = join(process.env.HOME!, "thoughts/global/shared/generated");

async function ensureOutputDir(base: string, slug: string): Promise<string> {
  const datePrefix = getDatePrefix();
  const outputDir = join(base, `${datePrefix}-${slug}`);
  await mkdir(outputDir, { recursive: true });
  return outputDir;
}

async function writeMetadata(outputDir: string, metadata: ImageMetadata): Promise<void> {
  const metadataPath = join(outputDir, "metadata.json");
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Metadata saved to ${metadataPath}`);
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

function parseArgs(argv: string[]): CLIArgs {
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
      case "creative-variations":
        const variations = parseInt(value, 10);
        if (isNaN(variations) || variations < 1 || variations > 10) {
          throw new CLIError(`Invalid creative-variations: ${value}. Must be 1-10`);
        }
        parsed.creativeVariations = variations;
        i++;
        break;
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
// Prompt Enhancement
// ============================================================================

function enhancePromptForTransparency(prompt: string): string {
  return "CRITICAL: Transparent background (PNG with alpha channel) - NO background color, pure transparency. Object floating in transparent space. " + prompt;
}

// ============================================================================
// Background Removal
// ============================================================================

async function removeBackground(imagePath: string): Promise<void> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) throw new CLIError("Missing environment variable: REMOVEBG_API_KEY");

  console.log("Removing background with remove.bg API...");

  const imageBuffer = await readFile(imagePath);
  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer]), "image.png");
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CLIError(`remove.bg API error: ${response.status} - ${errorText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(imagePath, resultBuffer);
  console.log("Background removed successfully");
}

// ============================================================================
// Image Generation
// ============================================================================

async function generateWithFlux(prompt: string, size: ReplicateSize, output: string): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new CLIError("Missing environment variable: REPLICATE_API_TOKEN");

  const replicate = new Replicate({ auth: token });
  console.log("Generating with Flux 1.1 Pro...");

  const result = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: "png",
      output_quality: 95,
      prompt_upsampling: false,
    },
  });

  await writeFile(output, result);
  console.log(`Image saved to ${output}`);
}

async function generateWithGPTImage(prompt: string, size: OpenAISize, output: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new CLIError("Missing environment variable: OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey });
  console.log("Generating with GPT-image-1...");

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    n: 1,
  });

  const imageData = response.data[0].b64_json;
  if (!imageData) throw new CLIError("No image data returned from OpenAI API");

  const imageBuffer = Buffer.from(imageData, "base64");
  await writeFile(output, imageBuffer);
  console.log(`Image saved to ${output}`);
}

async function generateWithNanoBananaPro(
  prompt: string,
  size: GeminiSize,
  aspectRatio: ReplicateSize,
  output: string,
  referenceImage?: string
): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new CLIError("Missing environment variable: GOOGLE_API_KEY");

  const ai = new GoogleGenAI({ apiKey });

  const refNote = referenceImage ? " with reference image" : "";
  console.log(`Generating with Nano Banana Pro (Gemini) at ${size} ${aspectRatio}${refNote}...`);

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (referenceImage) {
    const imageBuffer = await readFile(referenceImage);
    const imageBase64 = imageBuffer.toString("base64");

    const ext = extname(referenceImage).toLowerCase();
    let mimeType: string;
    switch (ext) {
      case ".png": mimeType = "image/png"; break;
      case ".jpg": case ".jpeg": mimeType = "image/jpeg"; break;
      case ".webp": mimeType = "image/webp"; break;
      default: throw new CLIError(`Unsupported image format: ${ext}. Supported: .png, .jpg, .jpeg, .webp`);
    }

    parts.push({ inlineData: { mimeType, data: imageBase64 } });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: size,
      },
    },
  });

  let imageData: string | undefined;
  if (response.candidates && response.candidates.length > 0) {
    const responseParts = response.candidates[0].content.parts;
    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageData) throw new CLIError("No image data returned from Gemini API");

  const imageBuffer = Buffer.from(imageData, "base64");
  await writeFile(output, imageBuffer);
  console.log(`Image saved to ${output}`);
}

// ============================================================================
// Generation Dispatch
// ============================================================================

async function generateImage(args: CLIArgs, outputPath: string): Promise<void> {
  const finalPrompt = args.transparent ? enhancePromptForTransparency(args.prompt) : args.prompt;

  if (args.transparent) {
    console.log("Transparent background mode enabled");
  }

  switch (args.model) {
    case "flux":
      await generateWithFlux(finalPrompt, args.size as ReplicateSize, outputPath);
      break;
    case "nano-banana-pro":
      await generateWithNanoBananaPro(
        finalPrompt,
        args.size as GeminiSize,
        args.aspectRatio!,
        outputPath,
        args.referenceImage
      );
      break;
    case "gpt-image-1":
      await generateWithGPTImage(finalPrompt, args.size as OpenAISize, outputPath);
      break;
  }

  if (args.removeBg) {
    await removeBackground(outputPath);
  }
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

      // Write metadata for the batch
      const metadata: ImageMetadata = {
        prompt: args.prompt,
        model: args.model,
        aspect_ratio: args.aspectRatio || args.size,
        size: String(args.size),
        timestamp: new Date().toISOString(),
        reference_image: args.referenceImage || null,
        flags,
        output_file: `v1.png through v${args.creativeVariations}.png`,
      };
      await writeMetadata(outputDir, metadata);
    } else {
      // Single image generation
      const outputPath = join(outputDir, "image.png");
      await generateImage(args, outputPath);

      const metadata: ImageMetadata = {
        prompt: args.prompt,
        model: args.model,
        aspect_ratio: args.aspectRatio || args.size,
        size: String(args.size),
        timestamp: new Date().toISOString(),
        reference_image: args.referenceImage || null,
        flags,
        output_file: "image.png",
      };
      await writeMetadata(outputDir, metadata);
    }
  } catch (error) {
    handleError(error);
  }
}

// Exports for testing (pure functions + types + constants)
export {
  parseArgs,
  getDatePrefix,
  enhancePromptForTransparency,
  loadEnv,
  CLIError,
  DEFAULTS,
  REPLICATE_SIZES,
  OPENAI_SIZES,
  GEMINI_SIZES,
  GEMINI_ASPECT_RATIOS,
  type Model,
  type Size,
  type CLIArgs,
  type ImageMetadata,
};

// Direct execution guard
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("generate-image.ts");
if (isDirectExecution && !process.env.GENERATE_IMAGE_NO_CLI) {
  main();
}
