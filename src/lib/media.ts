/**
 * media.ts — shared media metadata layer (server + client).
 *
 * One source of truth for:
 *   - the InsightMedia shape that flows from SIO frontmatter → presentation → UI
 *   - the embed-domain allowlist enforced at render time (defense in depth)
 *   - pure helpers for embed URL construction, timestamp formatting, normalization
 *
 * HONESTY INVARIANTS (do not relax without explicit review):
 *   - has_verified_embed === true ONLY when media_verification_status === "verified"
 *     AND embed_url is set AND embed_url's host is in ALLOWED_EMBED_HOSTS.
 *   - normalizeMediaMetadata never invents an embed_url, video_id, timestamp,
 *     thumbnail, or attribution. Missing → null.
 *   - clip_match_type "exact_quote_match" is only accepted when transcript_verified
 *     is true at write-time (enforced by scripts/validate-media-metadata.ts).
 *   - The renderer must call isAllowedEmbedHost(embedUrl) before mounting any iframe.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type DisplayMode =
  | "video-primary"
  | "audio-primary"
  | "text-only"
  | "unknown";

export type VideoProvider = "youtube" | "ted" | "vimeo" | "none";

export type VerificationStatus =
  | "verified"
  | "needs_review"
  | "unverified"
  | "unofficial"
  | "not_applicable";

export type ClipMatchType =
  | "exact_quote_match"
  | "close_paraphrase"
  | "talking_point";

/**
 * Structured media object consumed by both the API response and the UI card.
 *
 * Field semantics:
 *   has_verified_embed  — true iff the renderer should mount an iframe. Computed
 *                         from verification_status + embed_url + allowlist host.
 *   display_mode        — resolved display mode after honesty fallback (a declared
 *                         video-primary without a usable embed degrades).
 *   provider            — the chosen provider for embed/playback, or null.
 *   embed_url           — final URL to mount in an iframe (already at start ts for
 *                         YouTube). Null when no verified embed exists.
 *   watch_url           — canonical public watch page (e.g. youtube.com/watch?v=…).
 *   source_url          — canonical source page (episode page, talk page, article).
 *   timestamp_*         — verified moment within the video. null when not verified.
 *   timestamp_label     — pre-formatted human-readable "M:SS" or "H:MM:SS".
 *   clip_match_type     — "exact_quote_match" requires transcript verification.
 *   fallback_url        — best non-iframe URL the UI can link to as a fallback.
 *   fallback_label      — verb the UI should use ("Watch", "Listen", "Read").
 */
export interface InsightMedia {
  has_verified_embed: boolean;
  display_mode: DisplayMode;
  provider: VideoProvider | null;
  embed_url: string | null;
  watch_url: string | null;
  source_url: string | null;
  video_id: string | null;
  ted_slug: string | null;
  thumbnail_url: string | null;
  speaker: string | null;
  source_title: string | null;
  show_or_platform: string | null;
  timestamp_start_seconds: number | null;
  timestamp_end_seconds: number | null;
  timestamp_label: string | null;
  clip_match_type: ClipMatchType | null;
  verification_status: VerificationStatus | null;
  rights_notes: string | null;
  fallback_label: "Watch" | "Listen" | "Read";
  fallback_url: string | null;
}

// ── Allowlist ─────────────────────────────────────────────────────────────────

/**
 * The ONLY hosts the UI is permitted to mount as an iframe. This is enforced
 * server-side at write time (validate-media-metadata) AND at render time
 * (InsightMediaCard) — defense in depth against a future SIO carrying a
 * malicious embed_url.
 *
 * Add a provider here only after:
 *   1. it is actually used by an SIO,
 *   2. its embed surface is reviewed for tracking + content-security implications.
 */
export const ALLOWED_EMBED_HOSTS: ReadonlySet<string> = new Set([
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "embed.ted.com",
  "player.vimeo.com",
]);

export function isAllowedEmbedHost(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_EMBED_HOSTS.has(u.host.toLowerCase());
  } catch {
    return false;
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts an 11-char YouTube video ID from any common URL form, or returns
 * null. Client-safe (no Node-only deps).
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  const watchMatch = s.match(/[?&]v=([A-Za-z0-9_-]{11})(?:[&?#]|$)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#]|$)/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = s.match(/\/embed\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/);
  if (embedMatch) return embedMatch[1];
  const shortsMatch = s.match(/\/shorts\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/);
  if (shortsMatch) return shortsMatch[1];
  if (YT_ID_RE.test(s)) return s;
  return null;
}

/**
 * Builds the privacy-enhanced YouTube embed URL, optionally with start/end
 * timestamps. Always returns a youtube-nocookie.com URL — never youtube.com.
 */
export function buildYouTubeEmbed(
  videoId: string,
  startSeconds?: number | null,
  endSeconds?: number | null
): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  const params: string[] = [];
  const hasStart = typeof startSeconds === "number" && startSeconds >= 0;
  const hasEnd =
    hasStart &&
    typeof endSeconds === "number" &&
    endSeconds > (startSeconds as number);
  if (hasStart) params.push(`start=${Math.floor(startSeconds as number)}`);
  if (hasEnd) params.push(`end=${Math.floor(endSeconds as number)}`);
  return params.length > 0 ? `${base}?${params.join("&")}` : base;
}

export function buildYouTubeWatchUrl(
  videoId: string,
  startSeconds?: number | null
): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  if (typeof startSeconds === "number" && startSeconds >= 0) {
    return `${base}&t=${Math.floor(startSeconds)}s`;
  }
  return base;
}

/**
 * The YouTube thumbnail URL is a deterministic path that does not require an
 * API key. hqdefault is a 480x360 still — good enough for a click-to-play card
 * placeholder. We never persist this; we derive it.
 */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

const TED_SLUG_RE = /^[a-z0-9_]+$/;

/** Extracts a TED talk slug from a ted.com talk URL or an embed.ted.com URL. */
export function extractTedSlug(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  const m =
    s.match(/embed\.ted\.com\/talks\/([a-z0-9_]+)/i) ||
    s.match(/ted\.com\/talks\/([a-z0-9_]+)/i);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  return TED_SLUG_RE.test(slug) ? slug : null;
}

export function buildTedEmbed(slug: string): string {
  return `https://embed.ted.com/talks/${slug}`;
}

/**
 * Formats a non-negative number of seconds as H:MM:SS (≥1 hour) or M:SS.
 * Returns null for null/negative/non-finite input rather than fabricating "0:00".
 */
export function formatTimestamp(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Normalization from SIO frontmatter ────────────────────────────────────────

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t.length > 0 ? t : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function pickDisplayMode(raw: string | null): DisplayMode {
  if (raw === "video-primary" || raw === "audio-primary" || raw === "text-only") {
    return raw;
  }
  return "unknown";
}

function pickProvider(raw: string | null): VideoProvider | null {
  if (raw === "youtube" || raw === "ted" || raw === "vimeo" || raw === "none") {
    return raw;
  }
  return null;
}

function pickStatus(raw: string | null): VerificationStatus | null {
  if (
    raw === "verified" ||
    raw === "needs_review" ||
    raw === "unverified" ||
    raw === "unofficial" ||
    raw === "not_applicable"
  ) {
    return raw;
  }
  return null;
}

function pickClipMatch(raw: string | null): ClipMatchType | null {
  if (
    raw === "exact_quote_match" ||
    raw === "close_paraphrase" ||
    raw === "talking_point"
  ) {
    return raw;
  }
  return null;
}

/**
 * Normalizes raw SIO frontmatter (a Record<string, unknown>) into the
 * InsightMedia object the API + UI consume.
 *
 * Resolution rules (preserve existing presentation behavior):
 *   - declared video-primary without a usable embed degrades to audio-primary
 *     or text-only depending on whether a source_url exists.
 *   - declared audio-primary without a source_url degrades to text-only.
 *   - unknown defaults to audio-primary if a source_url exists, else text-only.
 *
 * Verification gating (the honest "should we render an iframe?" check):
 *   - has_verified_embed = true ONLY when
 *       verification_status === "verified"
 *       AND embed_url is set
 *       AND isAllowedEmbedHost(embed_url) === true.
 *   - A "video-primary"-declared SIO with an embed URL on an unknown host (e.g.
 *     someone hand-edits an embed pointing to a non-allowlisted domain) will
 *     resolve display_mode = "video-primary" but has_verified_embed = false —
 *     the UI then renders the link fallback instead of an iframe.
 *
 * For YouTube specifically: the embed_url returned here ALWAYS carries the
 * verified start timestamp (?start=…) when timestamp_start_seconds is set, so
 * the click-to-play UI never has to construct it.
 */
export function normalizeMediaMetadata(
  fm: Record<string, unknown>
): InsightMedia {
  const declared = pickDisplayMode(str(fm.display_mode as unknown));
  const provider = pickProvider(str(fm.video_provider as unknown));
  const status = pickStatus(str(fm.media_verification_status as unknown));
  const clipMatch = pickClipMatch(str(fm.clip_match_type as unknown));

  const rawEmbed = str(fm.embed_url as unknown);
  const rawVideoUrl = str(fm.video_url as unknown);
  const rawSourceUrl = str(fm.source_url as unknown);
  const rawVideoId = str(fm.video_id as unknown);

  const speaker = str(fm.speaker as unknown);
  const sourceTitle = str(fm.episode_or_content_title as unknown);
  const showOrPlatform = str(fm.show_or_platform as unknown);
  const rightsNotes =
    str(fm.media_rights_notes as unknown) ??
    str(fm.rights_or_usage_notes as unknown);

  const tsStart = num(fm.timestamp_start_seconds as unknown);
  const tsEnd = num(fm.timestamp_end_seconds as unknown);
  const tsLabel = formatTimestamp(tsStart);

  // Resolve provider-specific identifiers honestly:
  //   - YouTube: prefer an explicit video_id; otherwise try to extract from
  //     embed_url / video_url. Never fabricate.
  //   - TED: derive a slug from the embed_url or video_url; this is the only
  //     identifier we need (TED has no per-moment timestamp).
  let videoId: string | null = null;
  let tedSlug: string | null = null;
  if (provider === "youtube") {
    videoId =
      rawVideoId ?? extractYouTubeVideoId(rawEmbed) ?? extractYouTubeVideoId(rawVideoUrl);
    if (videoId && !YT_ID_RE.test(videoId)) videoId = null;
  } else if (provider === "ted") {
    tedSlug = extractTedSlug(rawEmbed) ?? extractTedSlug(rawVideoUrl);
  }

  // Build the canonical embed URL we'd actually mount. For YouTube we always
  // build the nocookie URL with the verified start timestamp. For TED we use
  // the canonical embed.ted.com slug URL (no per-moment ts supported). For
  // anything else, we trust the field as-is and let the allowlist decide.
  let canonicalEmbed: string | null = null;
  if (provider === "youtube" && videoId) {
    canonicalEmbed = buildYouTubeEmbed(videoId, tsStart, tsEnd);
  } else if (provider === "ted" && tedSlug) {
    canonicalEmbed = buildTedEmbed(tedSlug);
  } else if (rawEmbed) {
    canonicalEmbed = rawEmbed;
  }

  const embedAllowlisted = isAllowedEmbedHost(canonicalEmbed);
  const hasUsableEmbed = !!(canonicalEmbed && embedAllowlisted);
  const isVerified = status === "verified";
  const hasVerifiedEmbedValue = hasUsableEmbed && isVerified;

  // Display mode resolution — keep the existing honesty fallback intent:
  //   declared video-primary without a usable embed degrades.
  let display: DisplayMode = declared;
  if (declared === "video-primary" && !hasUsableEmbed) {
    display = rawSourceUrl ? "audio-primary" : "text-only";
  } else if (declared === "audio-primary" && !rawSourceUrl) {
    display = "text-only";
  } else if (declared === "unknown") {
    display = rawSourceUrl ? "audio-primary" : "text-only";
  }

  // Watch / source URL: a canonical click-target the UI can use as a fallback.
  // YouTube: prefer the canonical watch URL (with start ts if known).
  // TED: prefer the ted.com talk page.
  let watchUrl: string | null = null;
  if (provider === "youtube" && videoId) {
    watchUrl = buildYouTubeWatchUrl(videoId, tsStart);
  } else if (provider === "ted" && tedSlug) {
    watchUrl = `https://www.ted.com/talks/${tedSlug}`;
  } else if (rawVideoUrl) {
    watchUrl = rawVideoUrl;
  }

  // Thumbnail: only YouTube exposes a deterministic public thumbnail URL.
  // TED does not — we never fabricate one; the UI renders a styled placeholder.
  const thumbnailUrl =
    provider === "youtube" && videoId ? youtubeThumbnailUrl(videoId) : null;

  const fallbackUrl =
    display === "video-primary"
      ? watchUrl ?? rawSourceUrl
      : rawSourceUrl ?? watchUrl;

  const fallbackLabel: InsightMedia["fallback_label"] =
    display === "video-primary"
      ? "Watch"
      : display === "audio-primary"
      ? "Listen"
      : "Read";

  return {
    has_verified_embed: hasVerifiedEmbedValue,
    display_mode: display,
    provider,
    embed_url: hasUsableEmbed ? canonicalEmbed : null,
    watch_url: watchUrl,
    source_url: rawSourceUrl,
    video_id: videoId,
    ted_slug: tedSlug,
    thumbnail_url: thumbnailUrl,
    speaker,
    source_title: sourceTitle,
    show_or_platform: showOrPlatform,
    timestamp_start_seconds: tsStart,
    timestamp_end_seconds: tsEnd,
    timestamp_label: tsLabel,
    clip_match_type: clipMatch,
    verification_status: status,
    rights_notes: rightsNotes,
    fallback_label: fallbackLabel,
    fallback_url: fallbackUrl,
  };
}

export function hasVerifiedEmbed(m: InsightMedia): boolean {
  return m.has_verified_embed && isAllowedEmbedHost(m.embed_url);
}

export function getMediaFallbackUrl(m: InsightMedia): string | null {
  return m.fallback_url;
}
