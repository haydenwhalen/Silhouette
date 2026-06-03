/**
 * validate-media-metadata.ts — Media metadata validator (Stage C)
 *
 * Checks each SIO's media metadata for format correctness, internal consistency, and
 * honesty (no false "verified official video" claims). Run: npm run validate-media.
 *
 * Exit codes:
 *   0 — no HARD violations (honest needs_review/unverified gaps are warnings, not failures)
 *   1 — at least one HARD violation (format error, false verified claim, etc.)
 *
 * HARD violations (fail the build):
 *   - embed_url present but malformed for its provider
 *   - video_id present but not a valid 11-char YouTube id (when provider youtube)
 *   - media_verification_status: verified with NO usable embed/url for a video provider
 *   - display_mode: video-primary with embed_url but status BELOW verified (false claim)
 *   - timestamp_start/end not number-or-null
 *   - transcript_verified: true with no verification notes
 *   - media_verification_status not in the controlled vocabulary
 *   - youtube embed_url not matching youtube-nocookie /embed/<id> pattern
 *   - youtube watch_url (if present) not matching youtube.com/watch?v=<id>
 *   - youtube video_id not matching ^[A-Za-z0-9_-]{11}$ (already had this; kept)
 *   - media_verification_status: verified + video_provider: youtube + no embed AND no evidence of
 *     official channel match (channel_id field present and valid starting with "UC")
 *
 * WARNINGS (do not fail):
 *   - missing media (no embed and no source_url)
 *   - incomplete media (needs_review / unverified gaps, blank video_id by design)
 *   - channel_id field present but does not look like a YouTube channel ID (UC + ~22 chars)
 *
 * NOTE: validate-media-metadata runs with NO key. Only pure (non-async) helpers from
 * ./lib/youtube are used here (extractYouTubeVideoId, buildYouTubeEmbedUrl).
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
} from "./lib/youtube";
import { isAllowedEmbedHost, formatTimestamp } from "../src/lib/media";

const SIOS_DIR = join(process.cwd(), "corpus", "sios");

type Fm = Record<string, unknown>;

const STATUS_VOCAB = new Set([
  "verified",
  "needs_review",
  "unverified",
  "unofficial",
  "not_applicable",
]);

const VIDEO_PROVIDERS = new Set(["ted", "youtube", "vimeo", "spotify"]);

// clip_match_type values describe HOW closely the SIO excerpt matches the
// source moment, in descending strictness:
//   - exact_quote_match  : verbatim from a verified transcript
//   - close_paraphrase   : speaker's documented argument, faithful paraphrase
//   - talking_point      : the broader idea, attributable but not the exact moment
// New field — most SIOs won't have it set yet; that's a warn, not a fail.
const CLIP_MATCH_VOCAB = new Set([
  "exact_quote_match",
  "close_paraphrase",
  "talking_point",
]);

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const TED_EMBED_RE = /^https:\/\/embed\.ted\.com\/talks\/[a-z0-9_]+(\?.*)?$/;
const YT_EMBED_RE =
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}(\?.*)?$/;
const YT_WATCH_RE = /^https:\/\/(www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}/;
// YouTube channel ID: starts with "UC" followed by ~22 base64url chars (~24 total)
const YT_CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function readFrontmatter(raw: string): Fm {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = raw.slice(3, end).trim();
  const parsed = parseYaml(yaml);
  return parsed && typeof parsed === "object" ? (parsed as Fm) : {};
}

interface Result {
  insight_id: string;
  file: string;
  hard: string[];
  warn: string[];
  status: string;
  hasUsableMedia: boolean;
  readyForVideo: boolean;
}

function isNumberOrNull(v: unknown): boolean {
  return v === null || v === undefined || typeof v === "number";
}

function validateOne(fm: Fm, file: string): Result {
  const id = str(fm.insight_id) || file;
  const hard: string[] = [];
  const warn: string[] = [];

  const provider = str(fm.video_provider);
  const embed = str(fm.embed_url);
  const videoId = str(fm.video_id);
  const sourceUrl = str(fm.source_url);
  const displayMode = str(fm.display_mode);
  const status = str(fm.media_verification_status);
  const transcriptVerified = fm.transcript_verified === true;
  const transcriptNotes =
    str(fm.media_verification_notes) || str(fm.rights_or_usage_notes);

  // 1. status vocabulary
  if (status && !STATUS_VOCAB.has(status)) {
    hard.push(
      `media_verification_status "${status}" not in vocabulary {${[...STATUS_VOCAB].join(", ")}}`
    );
  }
  if (!status) {
    warn.push("media_verification_status is unset");
  }

  // 2. embed_url format vs provider
  if (embed) {
    if (provider === "ted") {
      if (!TED_EMBED_RE.test(embed)) {
        hard.push(`embed_url is not a valid embed.ted.com/talks/<slug> URL: ${embed}`);
      }
    } else if (provider === "youtube") {
      if (!YT_EMBED_RE.test(embed)) {
        hard.push(
          `embed_url is not a valid youtube-nocookie.com/embed/<11-char-id> URL: ${embed}`
        );
      }
    } else if (provider === "vimeo") {
      if (!/^https:\/\/player\.vimeo\.com\/video\/\d+/.test(embed)) {
        hard.push(`embed_url present for vimeo but not a player.vimeo.com URL: ${embed}`);
      }
    } else {
      hard.push(
        `embed_url present but video_provider is "${provider || "(none)"}" — embeds require a video provider`
      );
    }
    // 2b. Render-side allowlist (defense in depth — the renderer will refuse
    // to mount any iframe whose host is not on this list).
    if (!isAllowedEmbedHost(embed)) {
      hard.push(
        `embed_url host is not on the render-time allowlist (youtube-nocookie.com, embed.ted.com, player.vimeo.com): ${embed}`
      );
    }
  }

  // 3. youtube video_id format (only meaningful for youtube provider)
  if (videoId) {
    if (provider === "youtube" && !YT_ID_RE.test(videoId)) {
      hard.push(`video_id "${videoId}" is not a valid 11-char YouTube id`);
    }
    if (provider === "ted") {
      warn.push("video_id set on a TED source — TED uses a slug, not a video_id");
    }
  }

  // 4. media_available: true implies a usable URL/embed exists
  const usable = !!(embed || sourceUrl);
  if (fm.media_available === true && !usable) {
    hard.push("media_available: true but no embed_url or source_url is present");
  }

  // 5. display_mode consistency
  if (displayMode === "video-primary") {
    if (!embed) {
      warn.push(
        "display_mode: video-primary but no embed_url (presentation will fall back gracefully)"
      );
    }
  } else if (displayMode === "audio-primary") {
    if (!sourceUrl) {
      warn.push("display_mode: audio-primary but no source_url to link");
    }
  } else if (displayMode && displayMode !== "text-only") {
    hard.push(`display_mode "${displayMode}" is not one of video-primary|audio-primary|text-only`);
  }

  // 6. timestamps number-or-null
  if (!isNumberOrNull(fm.timestamp_start_seconds)) {
    hard.push("timestamp_start_seconds must be a number or null");
  }
  if (!isNumberOrNull(fm.timestamp_end_seconds)) {
    hard.push("timestamp_end_seconds must be a number or null");
  }
  if (
    typeof fm.timestamp_start_seconds === "number" &&
    typeof fm.timestamp_end_seconds === "number" &&
    fm.timestamp_end_seconds <= fm.timestamp_start_seconds
  ) {
    hard.push("timestamp_end_seconds must be greater than timestamp_start_seconds");
  }
  // 6a. negative timestamps are never valid
  if (
    typeof fm.timestamp_start_seconds === "number" &&
    fm.timestamp_start_seconds < 0
  ) {
    hard.push(
      `timestamp_start_seconds is negative (${fm.timestamp_start_seconds}) — invalid`
    );
  }
  // 6b. sanity bound — almost no podcast/talk clip lives past 6 hours.
  // Warn (not fail) because we can't prove the source duration.
  if (
    typeof fm.timestamp_start_seconds === "number" &&
    fm.timestamp_start_seconds > 21600
  ) {
    warn.push(
      `timestamp_start_seconds is ${fm.timestamp_start_seconds}s (~${Math.floor(
        fm.timestamp_start_seconds / 3600
      )}h) — confirm this is correct for the source duration`
    );
  }
  // 6c. timestamp_label, if both label and seconds are set, must agree with
  // formatTimestamp(seconds) — within a 1s tolerance for label-only edits.
  // The agreement is human-friendly (M:SS or H:MM:SS), not arbitrary text.
  if (
    typeof fm.timestamp_start_seconds === "number" &&
    typeof fm.timestamp_label === "string" &&
    fm.timestamp_label.trim()
  ) {
    const expected = formatTimestamp(fm.timestamp_start_seconds);
    const got = fm.timestamp_label.trim();
    if (expected && expected !== got) {
      // Soft mismatch — warn so the canonical label can be regenerated.
      warn.push(
        `timestamp_label "${got}" does not match formatTimestamp(${fm.timestamp_start_seconds}) = "${expected}" — labels are derived from seconds at render time`
      );
    }
  }
  // 6d. TED + per-moment timestamp: TED's embed.ted.com player does not honor
  // ?start= or any per-moment param. Setting timestamp_start_seconds on a TED
  // source mis-implies the embed will start there.
  if (
    provider === "ted" &&
    typeof fm.timestamp_start_seconds === "number" &&
    fm.timestamp_start_seconds > 0
  ) {
    warn.push(
      "timestamp_start_seconds is set on a TED source — TED embeds do not honor per-moment timestamps and will play from the start"
    );
  }

  // 7. transcript_verified: true requires notes
  if (transcriptVerified && !transcriptNotes) {
    hard.push("transcript_verified: true but no verification/usage notes present");
  }

  // 8. NO false "verified official video" claim.
  // If status is verified AND it's a video provider, an embed must exist.
  if (status === "verified" && VIDEO_PROVIDERS.has(provider)) {
    if (!embed) {
      hard.push(
        `media_verification_status: verified for video_provider "${provider}" but no embed_url present`
      );
    }
  }
  // The inverse false claim: presenting a video as official while status is below verified.
  if (
    displayMode === "video-primary" &&
    embed &&
    status &&
    status !== "verified"
  ) {
    hard.push(
      `display_mode: video-primary with an embed_url but media_verification_status is "${status}" ` +
        `(< verified) — would present an unverified video as official`
    );
  }
  // A blank-but-claimed video: youtube provider + verified + no embed already caught above;
  // also catch a written youtube video_id while status is needs_review/unverified.
  if (
    provider === "youtube" &&
    videoId &&
    (status === "needs_review" || status === "unverified")
  ) {
    hard.push(
      `youtube video_id written while media_verification_status is "${status}" — ` +
        `do not record an unverified official video_id`
    );
  }

  // 9. YouTube-specific additional format checks (pure helpers, no network)
  if (provider === "youtube") {
    // 9a. embed_url must match youtube-nocookie /embed/<id> pattern (already checked in 2,
    //     but also verify the extracted video id is 11 chars via the helper)
    if (embed && YT_EMBED_RE.test(embed)) {
      const extractedId = extractYouTubeVideoId(embed);
      if (!extractedId || !YT_ID_RE.test(extractedId)) {
        hard.push(
          `embed_url matched nocookie pattern but extractYouTubeVideoId could not extract a valid 11-char id: ${embed}`
        );
      }
      // Confirm the embed URL is in canonical form using buildYouTubeEmbedUrl
      if (extractedId) {
        const canonicalEmbed = buildYouTubeEmbedUrl(extractedId);
        const embedBase = embed.split("?")[0]; // strip query params for comparison
        if (!embed.startsWith(canonicalEmbed.split("?")[0])) {
          warn.push(
            `embed_url base "${embedBase}" differs from canonical nocookie form "${canonicalEmbed.split("?")[0]}" — consider normalizing`
          );
        }
      }
    }

    // 9b. watch_url (if the field exists) must be a valid youtube.com/watch?v= URL
    const watchUrl = str(fm.watch_url);
    if (watchUrl) {
      if (!YT_WATCH_RE.test(watchUrl)) {
        hard.push(
          `watch_url "${watchUrl}" is not a valid youtube.com/watch?v=<11-char-id> URL`
        );
      } else {
        // Cross-check: video_id extracted from watch_url must match video_id field if both present
        const idFromWatch = extractYouTubeVideoId(watchUrl);
        if (videoId && idFromWatch && videoId !== idFromWatch) {
          hard.push(
            `video_id "${videoId}" does not match id extracted from watch_url "${idFromWatch}"`
          );
        }
      }
    }

    // 9c. channel_id format check (warn if present but wrong format)
    const channelId = str(fm.channel_id);
    if (channelId) {
      if (!YT_CHANNEL_ID_RE.test(channelId)) {
        warn.push(
          `channel_id "${channelId}" does not look like a YouTube channel ID (expected: starts with "UC", ~24 chars)`
        );
      }
    }

    // 9d. HARD: verified + youtube + no embed AND no evidence of official channel match
    // An SIO claiming verified status for a YouTube source must have either:
    //   (a) an embed_url (already caught in check 8), OR
    //   (b) if no embed, a channel_id field indicating official-channel provenance
    // This is a belt-and-suspenders check — verifying no false claims slip through.
    if (status === "verified" && !embed) {
      // Check 8 already fires a hard violation for this; add additional context for YouTube
      const channelIdPresent = !!str(fm.channel_id);
      if (!channelIdPresent) {
        hard.push(
          `media_verification_status: verified for youtube provider but no embed_url AND no channel_id — ` +
            `no evidence of an official channel match; this claim cannot be verified`
        );
      }
    }
  }

  // 10. clip_match_type vocabulary + transcript-verification gate.
  // The strict rule: claiming exact_quote_match requires transcript_verified: true,
  // because saying "verbatim from the source" without a verified transcript is
  // a misattribution risk (we already had one demonstrated case — see
  // ai/guides/retrieval_video_phase_report.md). close_paraphrase and
  // talking_point have no such requirement — they admit the looser match.
  const clipMatch = str(fm.clip_match_type);
  const hasStartTs = typeof fm.timestamp_start_seconds === "number";
  if (clipMatch) {
    if (!CLIP_MATCH_VOCAB.has(clipMatch)) {
      hard.push(
        `clip_match_type "${clipMatch}" not in vocabulary {${[...CLIP_MATCH_VOCAB].join(", ")}}`
      );
    }
    if (clipMatch === "exact_quote_match" && !transcriptVerified) {
      hard.push(
        `clip_match_type: exact_quote_match requires transcript_verified: true — ` +
          `claiming a verbatim moment without a verified transcript is a misattribution risk`
      );
    }
    // 10a. close_paraphrase + a real timestamp should be backed by notes
    // describing what the human listened for / verified. Warn (not fail) so
    // SoG-style prototype SIOs don't break, but flag for the human.
    if (clipMatch === "close_paraphrase" && hasStartTs && !transcriptNotes) {
      warn.push(
        `clip_match_type: close_paraphrase with a timestamp but no media_verification_notes — ` +
          `add evidence of what was confirmed at this moment`
      );
    }
    // 10b. talking_point + a real timestamp is fine but the UI will use
    // "Watch near this moment" rather than "Watch the moment". Note in case
    // the author intended close_paraphrase.
    if (clipMatch === "talking_point" && hasStartTs && transcriptVerified) {
      warn.push(
        `clip_match_type: talking_point with transcript_verified: true — ` +
          `if the moment is verbatim, consider clip_match_type: close_paraphrase or exact_quote_match`
      );
    }
  } else if (provider === "youtube" || provider === "ted") {
    // Soft nudge — once an SIO has a verified embed, it should declare HOW closely
    // the excerpt matches that moment. Not a HARD failure during MVP.
    warn.push(
      "clip_match_type unset (recommend exact_quote_match | close_paraphrase | talking_point)"
    );
  }

  // ---- soft "missing / incomplete media" classification ----
  if (!usable) {
    warn.push("no embed_url and no source_url — nothing for presentation to link");
  }
  const isTextSource =
    str(fm.source_type) === "book" || str(fm.source_type) === "article";
  if (
    !isTextSource &&
    status !== "verified" &&
    status !== "not_applicable" &&
    !embed
  ) {
    warn.push("incomplete media: no verified embed yet (needs_review/unverified)");
  }

  const readyForVideo = status === "verified" && !!embed && VIDEO_PROVIDERS.has(provider);

  return {
    insight_id: id,
    file,
    hard,
    warn,
    status,
    hasUsableMedia: usable,
    readyForVideo,
  };
}

function main() {
  const files = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const results: Result[] = [];
  for (const file of files) {
    const raw = readFileSync(join(SIOS_DIR, file), "utf-8");
    const fm = readFrontmatter(raw);
    if (!str(fm.insight_id)) {
      results.push({
        insight_id: file,
        file,
        hard: ["could not parse frontmatter / missing insight_id"],
        warn: [],
        status: "",
        hasUsableMedia: false,
        readyForVideo: false,
      });
      continue;
    }
    results.push(validateOne(fm, file));
  }

  let hardCount = 0;
  let warnCount = 0;

  console.log("=".repeat(72));
  console.log("Media metadata validation");
  console.log("=".repeat(72));

  for (const r of results) {
    const verdict = r.hard.length ? "FAIL" : r.warn.length ? "warn" : "PASS";
    console.log(`\n[${verdict}] ${r.insight_id}  (status: ${r.status || "unset"})`);
    for (const h of r.hard) {
      console.log(`   ✗ HARD: ${h}`);
      hardCount++;
    }
    for (const w of r.warn) {
      console.log(`   • warn: ${w}`);
      warnCount++;
    }
  }

  const missingMedia = results.filter((r) => !r.hasUsableMedia).map((r) => r.insight_id);
  const incomplete = results
    .filter(
      (r) =>
        r.hasUsableMedia &&
        !r.readyForVideo &&
        r.status !== "not_applicable"
    )
    .map((r) => r.insight_id);
  const readyForVideo = results.filter((r) => r.readyForVideo).map((r) => r.insight_id);

  console.log("\n" + "=".repeat(72));
  console.log("Summary");
  console.log("=".repeat(72));
  console.log(`Total SIOs:                 ${results.length}`);
  console.log(`Hard violations:            ${hardCount}`);
  console.log(`Warnings:                   ${warnCount}`);
  console.log(`\nReady for video presentation (${readyForVideo.length}):`);
  for (const id of readyForVideo) console.log(`   ✓ ${id}`);
  console.log(`\nIncomplete media (have a link, no verified video) (${incomplete.length}):`);
  for (const id of incomplete) console.log(`   • ${id}`);
  console.log(`\nMissing media (no embed and no source_url) (${missingMedia.length}):`);
  if (missingMedia.length === 0) console.log("   (none)");
  for (const id of missingMedia) console.log(`   ! ${id}`);

  console.log("\n" + "=".repeat(72));
  if (hardCount > 0) {
    console.log(`RESULT: FAIL — ${hardCount} hard violation(s).`);
    process.exit(1);
  }
  console.log(
    `RESULT: PASS — no hard violations (${warnCount} honest warning(s), allowed).`
  );
  process.exit(0);
}

main();
