/**
 * youtube.ts — YouTube Data API v3 helper for the SIO Discovery Agent.
 *
 * SECURITY INVARIANTS (non-negotiable):
 *   - The API key is NEVER printed, logged, or echoed. It is read only via
 *     process.env.YOUTUBE_API_KEY.
 *   - channel_ids are matched only against the trusted registry; channel titles
 *     alone are NOT sufficient for an isOfficialChannelMatch = true result.
 *   - transcript_verified is NEVER set to true from API results alone; the
 *     YouTube Data API does not return transcript text.
 *   - This module never throws raw errors; all async calls return YouTubeApiResult.
 *
 * QUOTA NOTE:
 *   The YouTube Data API v3 has a default quota of 10,000 units/day.
 *   search.list costs 100 units per call. videos.list costs 1 unit per call.
 *   Cache aggressively in callers to stay within quota.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ── Public interfaces ──────────────────────────────────────────────────────────

export interface TrustedChannel {
  name: string;
  channel_id: string;
  channel_url: string;
  source_family: string;
  trust_level: "high" | "medium" | "needs_review";
  notes: string;
}

export interface YouTubeVideo {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  publishedAt: string;
  watchUrl: string;
  embedUrl: string;
  isOfficialChannelMatch: boolean;
  matchedTrustedChannel: string | null;
  confidence: "high" | "medium" | "low";
}

/** reason values:
 *  "no_api_key"      — YOUTUBE_API_KEY env var is absent or empty
 *  "quota_exceeded"  — API returned 403 with quotaExceeded or rateLimitExceeded
 *  "api_error"       — any other non-2xx response or network failure
 *  "not_found"       — 404 or empty items array for a specific video/channel lookup
 */
export interface YouTubeApiResult<T> {
  ok: boolean;
  data?: T;
  reason?: "no_api_key" | "quota_exceeded" | "api_error" | "not_found";
}

// ── Internal paths ─────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const TRUSTED_CHANNELS_PATH = join(ROOT, "corpus", "sources", "trusted_youtube_channels.json");
const FIXTURE_SEARCH_PATH = join(ROOT, "scripts", "fixtures", "youtube-search-sample.json");
const FIXTURE_DETAILS_PATH = join(ROOT, "scripts", "fixtures", "youtube-video-details-sample.json");

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

// ── Pure helpers ───────────────────────────────────────────────────────────────

/** Returns true iff process.env.YOUTUBE_API_KEY is non-empty. */
export function hasYouTubeApiKey(): boolean {
  const key = process.env.YOUTUBE_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Extracts an 11-character YouTube video ID from a variety of URL forms:
 *   - https://www.youtube.com/watch?v=<id>
 *   - https://youtu.be/<id>
 *   - https://www.youtube.com/embed/<id>
 *   - https://www.youtube.com/shorts/<id>
 *   - bare 11-char IDs are also accepted
 *
 * Returns the 11-char id string or null if the input doesn't match.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();

  // Pattern: watch?v=<id>
  const watchMatch = s.match(/[?&]v=([A-Za-z0-9_-]{11})(?:[&?#]|$)/);
  if (watchMatch) return watchMatch[1];

  // Pattern: youtu.be/<id>
  const shortMatch = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#]|$)/);
  if (shortMatch) return shortMatch[1];

  // Pattern: /embed/<id>
  const embedMatch = s.match(/\/embed\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/);
  if (embedMatch) return embedMatch[1];

  // Pattern: /shorts/<id>
  const shortsMatch = s.match(/\/shorts\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/);
  if (shortsMatch) return shortsMatch[1];

  // Bare 11-char ID (only alphanumeric, underscore, hyphen)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

  return null;
}

/**
 * Normalizes any YouTube URL (or bare video ID) to the canonical form:
 *   https://www.youtube.com/watch?v=<id>
 * Returns null if no video ID can be extracted.
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const id = extractYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Builds a YouTube watch URL, optionally with a start timestamp.
 *   https://www.youtube.com/watch?v=<id>           (no start)
 *   https://www.youtube.com/watch?v=<id>&t=<s>s    (with start)
 */
export function buildYouTubeWatchUrl(videoId: string, startSeconds?: number): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  if (startSeconds !== undefined && startSeconds >= 0) {
    return `${base}&t=${Math.floor(startSeconds)}s`;
  }
  return base;
}

/**
 * Builds a privacy-enhanced embed URL using youtube-nocookie.com.
 *   https://www.youtube-nocookie.com/embed/<id>
 *   ?start=<s>  appended only when startSeconds is provided and >= 0
 *   &end=<e>    appended only when endSeconds is provided and > startSeconds
 *
 * Using youtube-nocookie.com prevents YouTube from setting tracking cookies
 * until the user clicks play.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  startSeconds?: number,
  endSeconds?: number
): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  const params: string[] = [];

  const hasStart = startSeconds !== undefined && startSeconds >= 0;
  const hasEnd = endSeconds !== undefined && hasStart && endSeconds > startSeconds!;

  if (hasStart) params.push(`start=${Math.floor(startSeconds!)}`);
  if (hasEnd) params.push(`end=${Math.floor(endSeconds!)}`);

  return params.length > 0 ? `${base}?${params.join("&")}` : base;
}

/**
 * Loads the trusted channel registry from corpus/sources/trusted_youtube_channels.json.
 * Returns [] if the file is missing, unreadable, or unparseable.
 * Filters out any entries with a _comment key (top-level comment objects).
 */
export function loadTrustedChannels(): TrustedChannel[] {
  if (!existsSync(TRUSTED_CHANNELS_PATH)) return [];
  try {
    const raw = readFileSync(TRUSTED_CHANNELS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is TrustedChannel =>
        entry &&
        typeof entry === "object" &&
        !("_comment" in entry) &&
        typeof entry.name === "string" &&
        typeof entry.channel_id === "string" &&
        typeof entry.channel_url === "string" &&
        typeof entry.source_family === "string" &&
        typeof entry.trust_level === "string" &&
        typeof entry.notes === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Checks whether a given channelId matches an entry in the trusted registry.
 * Matching is EXACT on channel_id, and only considers entries with a non-empty
 * channel_id (blank channel_ids are not matched — they are unverified).
 *
 * Channel titles are NOT used for matching; only verified channel_ids count.
 *
 * @param channelId  The channelId from a YouTube API result or candidate record.
 * @param trusted    Optional pre-loaded registry (defaults to loadTrustedChannels()).
 */
export function isLikelyOfficialChannel(
  channelId: string,
  trusted?: TrustedChannel[]
): { match: boolean; trustLevel: string | null; channelName: string | null } {
  if (!channelId) return { match: false, trustLevel: null, channelName: null };
  const registry = trusted ?? loadTrustedChannels();
  const found = registry.find(
    (ch) => ch.channel_id && ch.channel_id === channelId
  );
  if (!found) return { match: false, trustLevel: null, channelName: null };
  return {
    match: true,
    trustLevel: found.trust_level,
    channelName: found.name,
  };
}

// ── Internal: confidence from trust level ──────────────────────────────────────

function confidenceFromTrustLevel(
  trustLevel: string | null
): "high" | "medium" | "low" {
  if (trustLevel === "high") return "high";
  if (trustLevel === "medium") return "medium";
  return "low";
}

// ── Internal: map a raw search item snippet to YouTubeVideo ───────────────────

interface RawSearchItem {
  id?: { videoId?: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
  };
}

function mapSearchItem(
  item: RawSearchItem,
  trusted: TrustedChannel[]
): YouTubeVideo | null {
  const videoId = item.id?.videoId;
  const snippet = item.snippet;
  if (!videoId || !snippet) return null;

  const channelId = snippet.channelId ?? "";
  const channelTitle = snippet.channelTitle ?? "";
  const title = snippet.title ?? "";
  const description = snippet.description ?? "";
  const publishedAt = snippet.publishedAt ?? "";

  const official = isLikelyOfficialChannel(channelId, trusted);
  const confidence = official.match
    ? confidenceFromTrustLevel(official.trustLevel)
    : "low";

  return {
    videoId,
    channelId,
    channelTitle,
    title,
    description,
    publishedAt,
    watchUrl: buildYouTubeWatchUrl(videoId),
    embedUrl: buildYouTubeEmbedUrl(videoId),
    isOfficialChannelMatch: official.match,
    matchedTrustedChannel: official.channelName,
    confidence,
  };
}

// ── Internal: map a raw videos.list item to YouTubeVideo ──────────────────────

interface RawVideoItem {
  id?: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
  };
}

function mapVideoItem(
  item: RawVideoItem,
  trusted: TrustedChannel[]
): YouTubeVideo | null {
  const videoId = typeof item.id === "string" ? item.id : "";
  const snippet = item.snippet;
  if (!videoId || !snippet) return null;

  const channelId = snippet.channelId ?? "";
  const channelTitle = snippet.channelTitle ?? "";
  const title = snippet.title ?? "";
  const description = snippet.description ?? "";
  const publishedAt = snippet.publishedAt ?? "";

  const official = isLikelyOfficialChannel(channelId, trusted);
  const confidence = official.match
    ? confidenceFromTrustLevel(official.trustLevel)
    : "low";

  return {
    videoId,
    channelId,
    channelTitle,
    title,
    description,
    publishedAt,
    watchUrl: buildYouTubeWatchUrl(videoId),
    embedUrl: buildYouTubeEmbedUrl(videoId),
    isOfficialChannelMatch: official.match,
    matchedTrustedChannel: official.channelName,
    confidence,
  };
}

// ── Internal: quota error detection ──────────────────────────────────────────

function isQuotaError(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const err = (body as Record<string, unknown>).error;
  if (!err || typeof err !== "object") return false;
  const errors = (err as Record<string, unknown>).errors;
  if (!Array.isArray(errors)) return false;
  return errors.some(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      (e as Record<string, unknown>).reason === "quotaExceeded" ||
      (e as Record<string, unknown>).reason === "rateLimitExceeded"
  );
}

// ── Internal: build API URL without logging the key ──────────────────────────

function apiUrl(path: string, params: Record<string, string>): string {
  const key = process.env.YOUTUBE_API_KEY ?? "";
  const qs = new URLSearchParams({ ...params, key }).toString();
  return `${YT_API_BASE}/${path}?${qs}`;
}

// ── Async API functions ────────────────────────────────────────────────────────

/**
 * Searches YouTube for videos matching `query`.
 *
 * opts.useMock  — if true, reads scripts/fixtures/youtube-search-sample.json
 *                 instead of calling the API. Safe with no API key.
 * opts.maxResults — number of results to request (default 5, max 50 per API limits).
 * opts.channelId  — if provided, restricts results to that channel.
 *
 * Returns { ok: false, reason: "no_api_key" } when no key is set and useMock is falsy.
 * Never throws; network/API errors are returned as { ok: false, reason: "api_error" }.
 */
export async function searchYouTubeVideos(
  query: string,
  opts?: { maxResults?: number; channelId?: string; useMock?: boolean }
): Promise<YouTubeApiResult<YouTubeVideo[]>> {
  const trusted = loadTrustedChannels();

  if (opts?.useMock) {
    try {
      if (!existsSync(FIXTURE_SEARCH_PATH)) {
        return { ok: false, reason: "not_found" };
      }
      const raw = JSON.parse(readFileSync(FIXTURE_SEARCH_PATH, "utf-8"));
      const items: RawSearchItem[] = Array.isArray(raw.items) ? raw.items : [];
      const videos = items
        .map((item) => mapSearchItem(item, trusted))
        .filter((v): v is YouTubeVideo => v !== null);
      return { ok: true, data: videos };
    } catch {
      return { ok: false, reason: "api_error" };
    }
  }

  if (!hasYouTubeApiKey()) {
    return { ok: false, reason: "no_api_key" };
  }

  try {
    const params: Record<string, string> = {
      part: "snippet",
      type: "video",
      q: query,
      maxResults: String(opts?.maxResults ?? 5),
    };
    if (opts?.channelId) params.channelId = opts.channelId;

    const url = apiUrl("search", params);
    const resp = await fetch(url);
    const body = await resp.json();

    if (resp.status === 403 && isQuotaError(body)) {
      return { ok: false, reason: "quota_exceeded" };
    }
    if (!resp.ok) {
      return { ok: false, reason: "api_error" };
    }

    const items: RawSearchItem[] = Array.isArray(body.items) ? body.items : [];
    const videos = items
      .map((item) => mapSearchItem(item, trusted))
      .filter((v): v is YouTubeVideo => v !== null);
    return { ok: true, data: videos };
  } catch {
    return { ok: false, reason: "api_error" };
  }
}

/**
 * Searches within a specific channel's videos.
 * Equivalent to searchYouTubeVideos with channelId pre-set.
 *
 * Useful for finding official uploads from a trusted channel (e.g., Huberman Lab)
 * once the channelId has been verified in the registry.
 */
export async function searchOfficialChannel(
  channelId: string,
  query: string,
  opts?: { maxResults?: number; useMock?: boolean }
): Promise<YouTubeApiResult<YouTubeVideo[]>> {
  return searchYouTubeVideos(query, {
    maxResults: opts?.maxResults,
    channelId,
    useMock: opts?.useMock,
  });
}

/**
 * Fetches full metadata for a single YouTube video by its 11-char videoId.
 *
 * opts.useMock — if true, reads scripts/fixtures/youtube-video-details-sample.json.
 *
 * Returns { ok: false, reason: "not_found" } when the video doesn't exist.
 * Never throws.
 */
export async function getVideoDetails(
  videoId: string,
  opts?: { useMock?: boolean }
): Promise<YouTubeApiResult<YouTubeVideo>> {
  const trusted = loadTrustedChannels();

  if (opts?.useMock) {
    try {
      if (!existsSync(FIXTURE_DETAILS_PATH)) {
        return { ok: false, reason: "not_found" };
      }
      const raw = JSON.parse(readFileSync(FIXTURE_DETAILS_PATH, "utf-8"));
      const items: RawVideoItem[] = Array.isArray(raw.items) ? raw.items : [];
      if (items.length === 0) return { ok: false, reason: "not_found" };
      const video = mapVideoItem(items[0], trusted);
      if (!video) return { ok: false, reason: "not_found" };
      return { ok: true, data: video };
    } catch {
      return { ok: false, reason: "api_error" };
    }
  }

  if (!hasYouTubeApiKey()) {
    return { ok: false, reason: "no_api_key" };
  }

  try {
    const url = apiUrl("videos", {
      part: "snippet,contentDetails,statistics",
      id: videoId,
    });
    const resp = await fetch(url);
    const body = await resp.json();

    if (resp.status === 403 && isQuotaError(body)) {
      return { ok: false, reason: "quota_exceeded" };
    }
    if (!resp.ok) {
      return { ok: false, reason: "api_error" };
    }

    const items: RawVideoItem[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return { ok: false, reason: "not_found" };

    const video = mapVideoItem(items[0], trusted);
    if (!video) return { ok: false, reason: "not_found" };
    return { ok: true, data: video };
  } catch {
    return { ok: false, reason: "api_error" };
  }
}
