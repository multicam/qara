#!/usr/bin/env bun
/**
 * community-pulse.ts — Deterministic data extraction for community pulse research.
 *
 * Handles: date arithmetic, HN Algolia API calls, Reddit JSON parsing,
 * query template generation. The LLM does synthesis; this tool does fetch+parse.
 *
 * Usage:
 *   bun community-pulse.ts --topic "Claude Code" --days 30 --platforms reddit,hn,youtube,x,web
 */

import { parseArgs } from "util";

// --- Types ---

interface PlatformResult {
  platform: string;
  queries: string[];
  data: Record<string, unknown>[];
  error?: string;
}

interface PulseConfig {
  topic: string;
  days: number;
  platforms: string[];
  isoDate: string;
  unixTimestamp: number;
}

// --- CLI Parsing ---

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    topic: { type: "string" },
    days: { type: "string", default: "30" },
    platforms: { type: "string", default: "reddit,hn,youtube,x,web" },
    help: { type: "boolean", default: false },
  },
});

if (values.help || !values.topic) {
  console.log(`Usage: bun community-pulse.ts --topic "topic" [--days 30] [--platforms reddit,hn,youtube,x,web]

Options:
  --topic       Required. The subject to research.
  --days        Look-back window in days (default: 30).
  --platforms   Comma-separated list: reddit,hn,youtube,x,web (default: all).
  --help        Show this help message.

Output: JSON with platform-keyed query templates and fetched data.`);
  process.exit(0);
}

// --- Config ---

const days = parseInt(values.days!, 10) || 30;
const now = Date.now();
const boundary = now - days * 86400 * 1000;

const config: PulseConfig = {
  topic: values.topic!,
  days,
  platforms: values.platforms!.split(",").map((p) => p.trim().toLowerCase()),
  isoDate: new Date(boundary).toISOString().split("T")[0],
  unixTimestamp: Math.floor(boundary / 1000),
};

// --- Query Generators ---

function redditQueries(topic: string, date: string): string[] {
  return [
    `site:reddit.com ${topic} after:${date}`,
    `site:reddit.com ${topic} best|recommended|experience after:${date}`,
  ];
}

function hnSearchUrl(topic: string, unixTs: number): string {
  const q = encodeURIComponent(topic);
  return `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=created_at_i>${unixTs}&hitsPerPage=10`;
}

function hnItemUrl(objectID: string): string {
  return `https://hn.algolia.com/api/v1/items/${objectID}`;
}

function xQueries(topic: string, date: string): string[] {
  return [
    `site:x.com OR site:twitter.com ${topic} after:${date}`,
    `${topic} twitter thread viral after:${date}`,
  ];
}

function youtubeQueries(topic: string, date: string): string[] {
  return [`site:youtube.com ${topic} after:${date}`];
}

function webQueries(topic: string, year: string): string[] {
  return [
    `${topic} community discussion blog post ${year}`,
    `${topic} people are saying opinion ${year}`,
  ];
}

// --- HN Algolia Fetch ---

async function fetchHN(
  topic: string,
  unixTs: number
): Promise<PlatformResult> {
  const url = hnSearchUrl(topic, unixTs);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        platform: "hn",
        queries: [url],
        data: [],
        error: `HN Algolia returned ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      hits: Array<{
        objectID: string;
        title: string;
        points: number;
        num_comments: number;
        url: string;
        created_at: string;
      }>;
    };
    const stories = json.hits
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10)
      .map((hit) => ({
        objectID: hit.objectID,
        title: hit.title,
        points: hit.points,
        num_comments: hit.num_comments,
        url: hit.url,
        created_at: hit.created_at,
        discussionUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        detailApiUrl: hnItemUrl(hit.objectID),
      }));
    return { platform: "hn", queries: [url], data: stories };
  } catch (e) {
    return {
      platform: "hn",
      queries: [url],
      data: [],
      error: `Fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// --- Main ---

async function main() {
  const year = new Date().getFullYear().toString();
  const results: Record<string, PlatformResult> = {};

  // Generate query templates for each platform
  if (config.platforms.includes("reddit")) {
    results.reddit = {
      platform: "reddit",
      queries: redditQueries(config.topic, config.isoDate),
      data: [],
    };
  }

  if (config.platforms.includes("hn")) {
    // HN is the one platform we can fetch directly (public API, no auth)
    results.hn = await fetchHN(config.topic, config.unixTimestamp);
  }

  if (config.platforms.includes("x")) {
    results.x = {
      platform: "x",
      queries: xQueries(config.topic, config.isoDate),
      data: [],
    };
  }

  if (config.platforms.includes("youtube")) {
    results.youtube = {
      platform: "youtube",
      queries: youtubeQueries(config.topic, config.isoDate),
      data: [],
    };
  }

  if (config.platforms.includes("web")) {
    results.web = {
      platform: "web",
      queries: webQueries(config.topic, year),
      data: [],
    };
  }

  const output = {
    config: {
      topic: config.topic,
      days: config.days,
      platforms: config.platforms,
      dateRange: {
        from: config.isoDate,
        to: new Date().toISOString().split("T")[0],
        unixFrom: config.unixTimestamp,
      },
    },
    results,
    instructions:
      "Use the 'queries' arrays as WebSearch inputs. For HN, 'data' contains pre-fetched stories — use 'detailApiUrl' with WebFetch to get full discussions for top stories.",
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
