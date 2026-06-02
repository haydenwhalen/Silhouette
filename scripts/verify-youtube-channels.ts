/**
 * verify-youtube-channels.ts — Resolve trusted-channel handles to verified
 * YouTube channel IDs using the YouTube Data API v3.
 *
 * The trusted channel registry (corpus/sources/trusted_youtube_channels.json)
 * ships with all real channel_ids blank and trust_level: "needs_review" — by
 * design, because guessing 24-char channel IDs is a fabrication risk we caught
 * a subagent doing once (see ai/guides/sio_batch_youtube_phase_report.md).
 *
 * This script walks each entry, derives the handle from the channel_url
 * (e.g. "@hubermanlab" from "https://www.youtube.com/@hubermanlab"), and calls
 * channels.list?forHandle=<handle> to resolve the official channel_id. On
 * success, it writes channel_id + trust_level: "high" + provenance notes back
 * to the registry.
 *
 * Run:
 *     YOUTUBE_API_KEY=... npm run verify-youtube-channels
 *
 * Quota: channels.list costs 1 unit per call. Total ≤10 units for the full
 * registry — negligible against the 10,000 unit/day default quota.
 *
 * Exit codes:
 *   0 — script ran (one or more channels may still be unresolved; that's logged
 *       but not a failure since some channels may legitimately not have @handles)
 *   1 — no API key, or registry file unreadable
 *
 * IMPORTANT: this script is the ONLY sanctioned path to set a real channel_id.
 * Hand-editing channel_ids into the registry should be flagged in review.
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { hasYouTubeApiKey } from "./lib/youtube";

const REGISTRY_PATH = join(
  process.cwd(),
  "corpus",
  "sources",
  "trusted_youtube_channels.json"
);

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

interface RegistryEntry {
  _comment?: string;
  name: string;
  channel_id: string;
  channel_url: string;
  source_family: string;
  trust_level: string;
  notes: string;
}

interface ChannelsListItem {
  id?: string;
  snippet?: {
    title?: string;
    customUrl?: string;
    publishedAt?: string;
  };
}

interface ChannelsListResponse {
  items?: ChannelsListItem[];
  error?: { message?: string };
}

// Extracts a @handle (without the @) from a youtube.com/@handle URL.
// Returns null when the URL is not in handle form (e.g. legacy /channel/UC… or
// /c/customname URLs — those need different resolution paths and we skip them
// rather than guess).
function extractHandleFromUrl(url: string): string | null {
  const m = url.match(/youtube\.com\/@([A-Za-z0-9._-]+)/i);
  return m ? m[1] : null;
}

async function resolveHandleToChannelId(
  handle: string,
  apiKey: string
): Promise<{ ok: true; channelId: string; title: string } | { ok: false; reason: string }> {
  const params = new URLSearchParams({
    part: "id,snippet",
    forHandle: `@${handle}`,
    key: apiKey,
  });
  const url = `${YT_API_BASE}/channels?${params.toString()}`;

  let resp: Response;
  try {
    resp = await fetch(url);
  } catch (e) {
    return { ok: false, reason: `network error: ${e instanceof Error ? e.message : String(e)}` };
  }

  let body: ChannelsListResponse;
  try {
    body = (await resp.json()) as ChannelsListResponse;
  } catch {
    return { ok: false, reason: `non-JSON response (status ${resp.status})` };
  }

  if (!resp.ok) {
    const reason =
      body.error?.message ?? `API returned status ${resp.status}`;
    return { ok: false, reason };
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return { ok: false, reason: "no channel found for handle" };
  }
  const item = items[0];
  if (!item.id || typeof item.id !== "string") {
    return { ok: false, reason: "channel item missing id" };
  }
  return {
    ok: true,
    channelId: item.id,
    title: item.snippet?.title ?? handle,
  };
}

function loadRegistry(): RegistryEntry[] {
  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`Registry not found at ${REGISTRY_PATH}`);
  }
  const raw = readFileSync(REGISTRY_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Registry is not a JSON array");
  return parsed as RegistryEntry[];
}

function saveRegistry(entries: RegistryEntry[]): void {
  writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2) + "\n", "utf-8");
}

async function main() {
  if (!hasYouTubeApiKey()) {
    console.error(
      "[verify-youtube-channels] YOUTUBE_API_KEY not set.\n" +
        "Set it in .env or your shell, then re-run. Get a key at:\n" +
        "  https://console.cloud.google.com/apis/library/youtube.googleapis.com"
    );
    process.exit(1);
  }
  const apiKey = process.env.YOUTUBE_API_KEY as string;

  const registry = loadRegistry();
  console.log(`[verify-youtube-channels] loaded ${registry.length} entries from registry.\n`);

  const today = new Date().toISOString().slice(0, 10);
  let resolved = 0;
  let skippedExistingId = 0;
  let skippedNoHandle = 0;
  let skippedTestFixture = 0;
  let failed = 0;

  for (const entry of registry) {
    // The synthetic test-fixture entry exists so the no-key mock-mode test can
    // assert official-channel matching. Never touch it.
    if (entry.source_family === "test-fixture" || /test/i.test(entry.name)) {
      skippedTestFixture += 1;
      console.log(`[skip] "${entry.name}" — test fixture, left as-is.`);
      continue;
    }

    // Already verified — leave it alone (don't burn quota or risk overwriting
    // a hand-verified ID).
    if (entry.channel_id && entry.channel_id.length > 0) {
      skippedExistingId += 1;
      console.log(`[skip] "${entry.name}" — already has channel_id ${entry.channel_id}`);
      continue;
    }

    const handle = extractHandleFromUrl(entry.channel_url);
    if (!handle) {
      skippedNoHandle += 1;
      console.log(
        `[skip] "${entry.name}" — channel_url is not in @handle form: ${entry.channel_url}`
      );
      continue;
    }

    process.stdout.write(`[resolve] "${entry.name}" @${handle} ... `);
    const result = await resolveHandleToChannelId(handle, apiKey);
    if (!result.ok) {
      failed += 1;
      console.log(`FAIL — ${result.reason}`);
      continue;
    }

    entry.channel_id = result.channelId;
    entry.trust_level = "high";
    entry.notes =
      `Verified ${today} via YouTube Data API channels.list?forHandle=@${handle}. ` +
      `Resolved channel title: "${result.title}". ` +
      (entry.notes ? `Prior note: ${entry.notes}` : "");
    resolved += 1;
    console.log(`OK → ${result.channelId} ("${result.title}")`);
  }

  saveRegistry(registry);

  console.log("\n" + "=".repeat(72));
  console.log("Summary");
  console.log("=".repeat(72));
  console.log(`Resolved:                 ${resolved}`);
  console.log(`Skipped (existing id):    ${skippedExistingId}`);
  console.log(`Skipped (no @handle URL): ${skippedNoHandle}`);
  console.log(`Skipped (test fixture):   ${skippedTestFixture}`);
  console.log(`Failed:                   ${failed}`);
  console.log(
    `\nRegistry written → ${REGISTRY_PATH.replace(process.cwd() + "/", "")}\n`
  );
  if (failed > 0) {
    console.log(
      "Some channels failed to resolve. Re-run, or set the channel_id manually\n" +
        "after verifying via the YouTube web UI. NEVER guess a 24-char channel_id.\n"
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[verify-youtube-channels] unexpected error:", err);
  process.exit(1);
});
