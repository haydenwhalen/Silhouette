/**
 * test-media-helpers.ts — Unit tests for src/lib/media.ts
 *
 * Runnable as: npm run test-media-helpers
 * No external dependencies. Exits 0 on all pass, 1 on any fail.
 *
 * Covers:
 *   - allowlist (isAllowedEmbedHost): allowed hosts, rejected hosts, http/file
 *     schemes, malformed URLs
 *   - YouTube URL parsing (extractYouTubeVideoId): watch, youtu.be, embed,
 *     shorts, bare ID, malformed
 *   - YouTube embed URL building: nocookie domain, ?start=, ?end=, no params
 *   - TED slug extraction + embed building
 *   - formatTimestamp: M:SS, H:MM:SS, null/negative/non-finite → null
 *   - normalizeMediaMetadata:
 *       - verified TED SIO → has_verified_embed: true
 *       - declared video-primary without embed → degrades to audio/text
 *       - YouTube SIO with verified embed + timestamp → embed_url carries ?start
 *       - status: needs_review + embed_url → has_verified_embed: false
 *       - host not on allowlist → has_verified_embed: false
 *       - exact_quote_match is preserved in normalized output
 */

import {
  isAllowedEmbedHost,
  extractYouTubeVideoId,
  buildYouTubeEmbed,
  buildYouTubeWatchUrl,
  youtubeThumbnailUrl,
  extractTedSlug,
  buildTedEmbed,
  formatTimestamp,
  normalizeMediaMetadata,
  hasVerifiedEmbed,
  getMediaFallbackUrl,
} from "../src/lib/media";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}
const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${msg ?? "assertion failed"}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(actual: unknown, msg?: string): void {
  if (!actual) throw new Error(msg ?? "expected truthy");
}

function assertFalse(actual: unknown, msg?: string): void {
  if (actual) throw new Error(msg ?? "expected falsy");
}

// ─── Allowlist ────────────────────────────────────────────────────────────

test("isAllowedEmbedHost accepts youtube-nocookie.com (with www)", () => {
  assertTrue(isAllowedEmbedHost("https://www.youtube-nocookie.com/embed/abc"));
});

test("isAllowedEmbedHost accepts youtube-nocookie.com (no www)", () => {
  assertTrue(isAllowedEmbedHost("https://youtube-nocookie.com/embed/abc"));
});

test("isAllowedEmbedHost accepts embed.ted.com", () => {
  assertTrue(isAllowedEmbedHost("https://embed.ted.com/talks/foo"));
});

test("isAllowedEmbedHost accepts player.vimeo.com", () => {
  assertTrue(isAllowedEmbedHost("https://player.vimeo.com/video/123"));
});

test("isAllowedEmbedHost rejects youtube.com (non-nocookie)", () => {
  assertFalse(isAllowedEmbedHost("https://www.youtube.com/embed/abc"));
});

test("isAllowedEmbedHost rejects http scheme even on allowed host", () => {
  assertFalse(isAllowedEmbedHost("http://www.youtube-nocookie.com/embed/abc"));
});

test("isAllowedEmbedHost rejects unknown host", () => {
  assertFalse(isAllowedEmbedHost("https://evil.example.com/embed/abc"));
});

test("isAllowedEmbedHost rejects malformed URL", () => {
  assertFalse(isAllowedEmbedHost("not a url"));
});

test("isAllowedEmbedHost rejects null/undefined", () => {
  assertFalse(isAllowedEmbedHost(null));
  assertFalse(isAllowedEmbedHost(undefined));
});

// ─── YouTube ID extraction ────────────────────────────────────────────────

test("extractYouTubeVideoId parses watch?v=", () => {
  assertEqual(
    extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ"
  );
});

test("extractYouTubeVideoId parses youtu.be/", () => {
  assertEqual(
    extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ"
  );
});

test("extractYouTubeVideoId parses /embed/", () => {
  assertEqual(
    extractYouTubeVideoId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30"),
    "dQw4w9WgXcQ"
  );
});

test("extractYouTubeVideoId parses /shorts/", () => {
  assertEqual(
    extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ"
  );
});

test("extractYouTubeVideoId accepts bare 11-char id", () => {
  assertEqual(extractYouTubeVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("extractYouTubeVideoId returns null for non-matching string", () => {
  assertEqual(extractYouTubeVideoId("https://example.com/foo"), null);
  assertEqual(extractYouTubeVideoId("too short"), null);
  assertEqual(extractYouTubeVideoId(null), null);
});

// ─── YouTube URL builders ─────────────────────────────────────────────────

test("buildYouTubeEmbed uses youtube-nocookie domain", () => {
  assertEqual(
    buildYouTubeEmbed("dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
  );
});

test("buildYouTubeEmbed appends start=", () => {
  assertEqual(
    buildYouTubeEmbed("dQw4w9WgXcQ", 90),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90"
  );
});

test("buildYouTubeEmbed appends start= AND end=", () => {
  assertEqual(
    buildYouTubeEmbed("dQw4w9WgXcQ", 90, 150),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90&end=150"
  );
});

test("buildYouTubeEmbed ignores end when end <= start", () => {
  assertEqual(
    buildYouTubeEmbed("dQw4w9WgXcQ", 90, 90),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90"
  );
});

test("buildYouTubeEmbed ignores end without start", () => {
  // end is meaningless without start — embed builder drops it.
  assertEqual(
    buildYouTubeEmbed("dQw4w9WgXcQ", undefined, 150),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
  );
});

test("buildYouTubeWatchUrl appends &t=Ns", () => {
  assertEqual(
    buildYouTubeWatchUrl("dQw4w9WgXcQ", 90),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s"
  );
});

test("youtubeThumbnailUrl returns deterministic public URL", () => {
  assertEqual(
    youtubeThumbnailUrl("dQw4w9WgXcQ"),
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  );
});

// ─── TED ───────────────────────────────────────────────────────────────────

test("extractTedSlug parses ted.com talk URL", () => {
  assertEqual(
    extractTedSlug("https://www.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness"),
    "dan_gilbert_the_surprising_science_of_happiness"
  );
});

test("extractTedSlug parses embed.ted.com URL", () => {
  assertEqual(
    extractTedSlug("https://embed.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness"),
    "dan_gilbert_the_surprising_science_of_happiness"
  );
});

test("extractTedSlug returns null for non-TED URL", () => {
  assertEqual(extractTedSlug("https://example.com/talks/foo"), null);
});

test("buildTedEmbed returns canonical embed.ted.com URL", () => {
  assertEqual(buildTedEmbed("foo_bar"), "https://embed.ted.com/talks/foo_bar");
});

// ─── formatTimestamp ──────────────────────────────────────────────────────

test("formatTimestamp formats seconds < 60 as 0:SS", () => {
  assertEqual(formatTimestamp(45), "0:45");
});

test("formatTimestamp formats minutes:seconds", () => {
  assertEqual(formatTimestamp(845), "14:05");
});

test("formatTimestamp formats hours:mm:ss", () => {
  assertEqual(formatTimestamp(3845), "1:04:05");
});

test("formatTimestamp returns null for null", () => {
  assertEqual(formatTimestamp(null), null);
  assertEqual(formatTimestamp(undefined), null);
});

test("formatTimestamp returns null for negative", () => {
  assertEqual(formatTimestamp(-1), null);
});

test("formatTimestamp returns null for NaN/Infinity", () => {
  assertEqual(formatTimestamp(NaN), null);
  assertEqual(formatTimestamp(Infinity), null);
});

// ─── normalizeMediaMetadata ───────────────────────────────────────────────

test("normalize: verified TED SIO → has_verified_embed: true", () => {
  const m = normalizeMediaMetadata({
    video_provider: "ted",
    embed_url:
      "https://embed.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness",
    source_url:
      "https://www.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness",
    display_mode: "video-primary",
    media_verification_status: "verified",
    speaker: "Dan Gilbert",
    episode_or_content_title: "The surprising science of happiness",
  });
  assertEqual(m.has_verified_embed, true, "should be verified");
  assertEqual(m.display_mode, "video-primary");
  assertEqual(m.provider, "ted");
  assertEqual(
    m.embed_url,
    "https://embed.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness"
  );
  assertEqual(m.ted_slug, "dan_gilbert_the_surprising_science_of_happiness");
  assertEqual(m.fallback_label, "Watch");
  assertTrue(hasVerifiedEmbed(m));
});

test("normalize: declared video-primary without embed → degrades to audio-primary", () => {
  const m = normalizeMediaMetadata({
    video_provider: "youtube",
    embed_url: "",
    source_url: "https://example.com/episode",
    display_mode: "video-primary",
    media_verification_status: "needs_review",
  });
  assertEqual(m.display_mode, "audio-primary");
  assertEqual(m.has_verified_embed, false);
  assertEqual(m.fallback_label, "Listen");
});

test("normalize: declared video-primary, no embed, no source → text-only", () => {
  const m = normalizeMediaMetadata({
    video_provider: "youtube",
    embed_url: "",
    source_url: "",
    display_mode: "video-primary",
    media_verification_status: "needs_review",
  });
  assertEqual(m.display_mode, "text-only");
  assertEqual(m.fallback_label, "Read");
});

test("normalize: YouTube verified with timestamp → embed_url carries ?start=", () => {
  const m = normalizeMediaMetadata({
    video_provider: "youtube",
    video_id: "dQw4w9WgXcQ",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    source_url: "https://example.com/ep",
    display_mode: "video-primary",
    media_verification_status: "verified",
    timestamp_start_seconds: 845,
    timestamp_end_seconds: 905,
    speaker: "Test Speaker",
    episode_or_content_title: "Test Episode",
  });
  assertEqual(m.has_verified_embed, true);
  assertEqual(
    m.embed_url,
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=845&end=905"
  );
  assertEqual(m.video_id, "dQw4w9WgXcQ");
  assertEqual(m.timestamp_label, "14:05");
  // Watch URL should also carry &t=
  assertEqual(
    m.watch_url,
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=845s"
  );
  // Thumbnail is deterministic
  assertEqual(
    m.thumbnail_url,
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  );
});

test("normalize: status needs_review with embed → has_verified_embed: false", () => {
  const m = normalizeMediaMetadata({
    video_provider: "youtube",
    video_id: "dQw4w9WgXcQ",
    embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    source_url: "https://example.com/ep",
    display_mode: "video-primary",
    media_verification_status: "needs_review",
  });
  assertEqual(m.has_verified_embed, false);
  // embed_url present but no verified status → degrade UI display_mode to audio.
  assertEqual(m.display_mode, "video-primary"); // still declared video, but…
  assertFalse(hasVerifiedEmbed(m), "hasVerifiedEmbed must be false");
});

test("normalize: embed_url on non-allowlisted host → has_verified_embed: false", () => {
  const m = normalizeMediaMetadata({
    video_provider: "youtube",
    embed_url: "https://evil.example.com/embed/whatever",
    source_url: "https://example.com/ep",
    display_mode: "video-primary",
    media_verification_status: "verified",
  });
  // hostile embed should be rejected at normalization time
  assertEqual(m.has_verified_embed, false);
  assertEqual(m.embed_url, null);
});

test("normalize: clip_match_type round-trips through normalizer", () => {
  const m = normalizeMediaMetadata({
    video_provider: "ted",
    embed_url:
      "https://embed.ted.com/talks/dan_gilbert_the_surprising_science_of_happiness",
    media_verification_status: "verified",
    display_mode: "video-primary",
    clip_match_type: "exact_quote_match",
  });
  assertEqual(m.clip_match_type, "exact_quote_match");
});

test("normalize: unknown clip_match_type value is dropped (returns null)", () => {
  const m = normalizeMediaMetadata({
    clip_match_type: "made_up_value",
  });
  assertEqual(m.clip_match_type, null);
});

test("normalize: rights_notes prefers media_rights_notes over rights_or_usage_notes", () => {
  const m = normalizeMediaMetadata({
    media_rights_notes: "Specific media rights",
    rights_or_usage_notes: "General usage",
  });
  assertEqual(m.rights_notes, "Specific media rights");
});

test("normalize: rights_notes falls back to rights_or_usage_notes", () => {
  const m = normalizeMediaMetadata({
    rights_or_usage_notes: "Only general usage",
  });
  assertEqual(m.rights_notes, "Only general usage");
});

test("getMediaFallbackUrl returns the fallback_url", () => {
  const m = normalizeMediaMetadata({
    video_provider: "ted",
    embed_url:
      "https://embed.ted.com/talks/foo_bar",
    source_url: "https://www.ted.com/talks/foo_bar",
    display_mode: "video-primary",
    media_verification_status: "verified",
  });
  assertEqual(getMediaFallbackUrl(m), "https://www.ted.com/talks/foo_bar");
});

// ─── Run + report ─────────────────────────────────────────────────────────

(function run() {
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.passed) {
      passed += 1;
      console.log(`✓ ${r.name}`);
    } else {
      failed += 1;
      console.log(`✗ ${r.name}\n   ${r.error?.replace(/\n/g, "\n   ")}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed (${results.length} total)`);
  process.exit(failed === 0 ? 0 : 1);
})();
