#!/usr/bin/env bun

/**
 * search-unsplash - Unsplash Stock Photo CLI
 *
 * Search and download stock photos from Unsplash with proper attribution.
 * Outputs to per-project gallery with attribution tracking.
 *
 * Usage:
 *   search-unsplash --query "modern typography" --slug stock-typo
 *
 * @see ${PAI_DIR}/skills/image/SKILL.md
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

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
    // Silently continue
  }
}

// ============================================================================
// Types
// ============================================================================

type Orientation = "landscape" | "portrait" | "squarish";

interface CLIArgs {
  query: string;
  orientation?: Orientation;
  count: number;
  download: boolean;
  downloadIndex?: number;
  project: string;
  slug?: string;
}

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    html: string;
    download_location: string;
  };
  user: {
    name: string;
    username: string;
    links: { html: string };
  };
}

interface Attribution {
  photographer: string;
  photographer_url: string;
  photo_url: string;
  photo_id: string;
  license: string;
  attribution_text: string;
  downloaded_at: string;
}

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
    process.exit(1);
  }
  console.error(`Unknown error:`, error);
  process.exit(1);
}

// ============================================================================
// Output Directory
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

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
search-unsplash - Unsplash Stock Photo CLI

Search and download stock photos from Unsplash with proper attribution.

USAGE:
  search-unsplash --query "<search terms>" [OPTIONS]

REQUIRED:
  --query <text>          Search terms (quote if contains spaces)

OPTIONS:
  --orientation <type>    Filter by orientation: landscape, portrait, squarish
  --count <n>             Number of results to return (default: 5, max: 30)
  --download <n>          Download the Nth result (1-based index)
  --project <path>        Output base directory (default: ~/thoughts/global/shared/generated)
  --slug <name>           Name for output subdirectory (required with --download)
  --help, -h              Show this help message

OUTPUT (search mode):
  Prints results to stdout as a numbered list with descriptions and URLs.

OUTPUT (download mode):
  Image saved to: {project}/images/{YYYY-MM-DD}-{slug}/image.jpg
  Attribution saved alongside: {project}/images/{YYYY-MM-DD}-{slug}/attribution.json

EXAMPLES:
  # Search for typography photos
  search-unsplash --query "modern typography" --count 5

  # Search landscape-only photos
  search-unsplash --query "minimal workspace" --orientation landscape

  # Search and download the first result
  search-unsplash --query "design studio" --download 1 --slug studio-bg

  # Download to a specific project
  search-unsplash --query "web design" --download 1 --project ~/Projects/blog --slug hero

ATTRIBUTION:
  Unsplash requires attribution. When downloading, an attribution.json file is
  created alongside the image containing photographer name, profile URL, and
  the recommended attribution text. Use this in your content.

ENVIRONMENT VARIABLES:
  UNSPLASH_ACCESS_KEY    Required. Get from: https://unsplash.com/developers
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
    count: 5,
    download: false,
    project: DEFAULT_OUTPUT_BASE,
  };

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith("--")) {
      throw new CLIError(`Invalid flag: ${flag}. Flags must start with --`);
    }

    const key = flag.slice(2);
    const value = args[i + 1];

    if (!value || value.startsWith("--")) {
      throw new CLIError(`Missing value for flag: ${flag}`);
    }

    switch (key) {
      case "query":
        parsed.query = value;
        i++;
        break;
      case "orientation":
        if (value !== "landscape" && value !== "portrait" && value !== "squarish") {
          throw new CLIError(`Invalid orientation: ${value}. Must be: landscape, portrait, squarish`);
        }
        parsed.orientation = value;
        i++;
        break;
      case "count":
        const count = parseInt(value, 10);
        if (isNaN(count) || count < 1 || count > 30) {
          throw new CLIError(`Invalid count: ${value}. Must be 1-30`);
        }
        parsed.count = count;
        i++;
        break;
      case "download":
        const idx = parseInt(value, 10);
        if (isNaN(idx) || idx < 1) {
          throw new CLIError(`Invalid download index: ${value}. Must be >= 1`);
        }
        parsed.download = true;
        parsed.downloadIndex = idx;
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
      default:
        throw new CLIError(`Unknown flag: ${flag}`);
    }
  }

  if (!parsed.query) throw new CLIError("Missing required argument: --query");
  if (parsed.download && !parsed.slug) throw new CLIError("--slug is required when using --download");

  return parsed as CLIArgs;
}

// ============================================================================
// Unsplash API
// ============================================================================

const UNSPLASH_API = "https://api.unsplash.com";

async function searchPhotos(
  query: string,
  accessKey: string,
  count: number,
  orientation?: Orientation
): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(count),
    content_filter: "high",
  });

  if (orientation) params.set("orientation", orientation);

  const response = await fetch(`${UNSPLASH_API}/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CLIError(`Unsplash API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { results: UnsplashPhoto[] };
  return data.results;
}

async function triggerDownload(downloadLocation: string, accessKey: string): Promise<string> {
  // Unsplash requires tracking downloads via their API
  const response = await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) {
    throw new CLIError(`Unsplash download tracking error: ${response.status}`);
  }

  const data = await response.json() as { url: string };
  return data.url;
}

async function downloadPhoto(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new CLIError(`Failed to download image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

// ============================================================================
// Display
// ============================================================================

function displayResults(photos: UnsplashPhoto[]): void {
  if (photos.length === 0) {
    console.log("No results found.");
    return;
  }

  console.log(`\nFound ${photos.length} results:\n`);

  photos.forEach((photo, i) => {
    const desc = photo.alt_description || photo.description || "No description";
    const dims = `${photo.width}x${photo.height}`;
    console.log(`  ${i + 1}. ${desc}`);
    console.log(`     ${dims} | by ${photo.user.name} (@${photo.user.username})`);
    console.log(`     ${photo.links.html}`);
    console.log();
  });
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new CLIError(
        "Missing environment variable: UNSPLASH_ACCESS_KEY\n" +
        "Get your key from: https://unsplash.com/developers"
      );
    }

    console.log(`Searching Unsplash for "${args.query}"...`);
    const photos = await searchPhotos(args.query, accessKey, args.count, args.orientation);

    if (!args.download) {
      displayResults(photos);
      return;
    }

    // Download mode
    if (args.downloadIndex! > photos.length) {
      throw new CLIError(`Download index ${args.downloadIndex} exceeds results (${photos.length} found)`);
    }

    const photo = photos[args.downloadIndex! - 1];
    displayResults(photos);
    console.log(`Downloading result #${args.downloadIndex}...`);

    // Track download via Unsplash API (required by their guidelines)
    const downloadUrl = await triggerDownload(photo.links.download_location, accessKey);

    // Save to project gallery
    const outputDir = await ensureOutputDir(args.project, args.slug!);
    const outputPath = join(outputDir, "image.jpg");
    await downloadPhoto(downloadUrl, outputPath);
    console.log(`Image saved to ${outputPath}`);

    // Write attribution
    const attribution: Attribution = {
      photographer: photo.user.name,
      photographer_url: photo.user.links.html,
      photo_url: photo.links.html,
      photo_id: photo.id,
      license: "Unsplash License",
      attribution_text: `Photo by ${photo.user.name} on Unsplash`,
      downloaded_at: new Date().toISOString(),
    };

    const attrPath = join(outputDir, "attribution.json");
    await writeFile(attrPath, JSON.stringify(attribution, null, 2));
    console.log(`Attribution saved to ${attrPath}`);
  } catch (error) {
    handleError(error);
  }
}

// Exports for testing
export {
  parseArgs,
  getDatePrefix,
  loadEnv,
  CLIError,
  type CLIArgs,
  type UnsplashPhoto,
  type Attribution,
};

// Direct execution guard
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("search-unsplash.ts");
if (isDirectExecution && !process.env.SEARCH_UNSPLASH_NO_CLI) {
  main();
}
