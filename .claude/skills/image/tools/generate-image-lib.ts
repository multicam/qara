/**
 * generate-image-lib.ts — Types, constants, and library functions for generate-image CLI.
 *
 * Imported by generate-image.ts (CLI) and by tests.
 */

import Replicate from "replicate";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { extname, resolve, join } from "node:path";

// ============================================================================
// Types
// ============================================================================

export type Model = "flux" | "nano-banana-pro" | "gpt-image-1";
export type ReplicateSize = "1:1" | "16:9" | "3:2" | "2:3" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "21:9";
export type OpenAISize = "1024x1024" | "1536x1024" | "1024x1536";
export type GeminiSize = "1K" | "2K" | "4K";
export type Size = ReplicateSize | OpenAISize | GeminiSize;

export interface CLIArgs {
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

export interface ImageMetadata {
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

export const DEFAULTS = {
  model: "flux" as Model,
  size: "16:9" as Size,
};

export const REPLICATE_SIZES: ReplicateSize[] = ["1:1", "16:9", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "21:9"];
export const OPENAI_SIZES: OpenAISize[] = ["1024x1024", "1536x1024", "1024x1536"];
export const GEMINI_SIZES: GeminiSize[] = ["1K", "2K", "4K"];
export const GEMINI_ASPECT_RATIOS: ReplicateSize[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// ============================================================================
// Error Handling
// ============================================================================

export class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "CLIError";
  }
}

export function handleError(error: unknown): never {
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

export function getDatePrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const DEFAULT_OUTPUT_BASE = join(process.env.HOME!, "thoughts/global/shared/generated");

export async function ensureOutputDir(base: string, slug: string): Promise<string> {
  const datePrefix = getDatePrefix();
  const outputDir = join(base, `${datePrefix}-${slug}`);
  await mkdir(outputDir, { recursive: true });
  return outputDir;
}

export async function writeMetadata(outputDir: string, metadata: ImageMetadata): Promise<void> {
  const metadataPath = join(outputDir, "metadata.json");
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Metadata saved to ${metadataPath}`);
}

// ============================================================================
// Prompt Enhancement
// ============================================================================

export function enhancePromptForTransparency(prompt: string): string {
  return "CRITICAL: Transparent background (PNG with alpha channel) - NO background color, pure transparency. Object floating in transparent space. " + prompt;
}

// ============================================================================
// Background Removal
// ============================================================================

export async function removeBackground(imagePath: string): Promise<void> {
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

async function writeBase64Image(base64: string, output: string): Promise<void> {
  const imageBuffer = Buffer.from(base64, "base64");
  await writeFile(output, imageBuffer);
  console.log(`Image saved to ${output}`);
}

export async function generateWithFlux(prompt: string, size: ReplicateSize, output: string): Promise<void> {
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

export async function generateWithGPTImage(prompt: string, size: OpenAISize, output: string): Promise<void> {
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

  await writeBase64Image(imageData, output);
}

export async function generateWithNanoBananaPro(
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

  await writeBase64Image(imageData, output);
}

// ============================================================================
// Generation Dispatch
// ============================================================================

export async function generateImage(args: CLIArgs, outputPath: string): Promise<void> {
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
