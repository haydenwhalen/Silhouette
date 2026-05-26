/**
 * verify-candidate-source.ts — SIO Discovery Agent: Source/Media/Transcript Verification Helper.
 *
 * DETERMINISTIC. No LLM, no network. Honesty checks only.
 *
 * Usage: npx tsx scripts/verify-candidate-source.ts <candidate-path> [--write]
 *
 * Checks (report pass/warn/fail per check; never throws):
 *   - source_url present & looks canonical (not obviously a re-upload/compilation)
 *   - embed_url format valid when present (TED or YouTube formats)
 *   - video_url present if video is claimed
 *   - official_channel_url present if a channel is claimed
 *   - transcript_url present if transcript_verification_status is anything but unverified/not_applicable
 *   - timestamp_start/end are number-or-blank and end > start
 *   - quote_type honesty: excerpt present but not verbatim → warn; verbatim without verified transcript → FAIL
 *   - media_verification_status / transcript_verification_status are in VERIFICATION_STATUSES
 *   - YouTube-specific: video_id / video_url / embed_url format validation via pure helpers;
 *     if candidate has a channelId AND YOUTUBE_API_KEY is configured, isLikelyOfficialChannel
 *     is used to report whether it's a known official channel (does NOT auto-set "verified").
 *
 * HONESTY INVARIANT:
 *   - This script NEVER upgrades any status to "verified".
 *   - It may DOWNGRADE candidate_status to needs_source_verification or
 *     needs_transcript_verification when --write is passed and evidence is missing.
 *   - "Verified" requires human confirmation — always.
 *
 * Run: npx tsx scripts/verify-candidate-source.ts corpus/candidates/my-candidate.yaml [--write]
 */

import { existsSync } from "fs";
import {
  loadCandidateFromPath,
  saveCandidate,
  VERIFICATION_STATUSES,
  type Candidate,
  type VerificationStatus,
} from "./lib/discovery";
import {
  hasYouTubeApiKey,
  extractYouTubeVideoId,
  normalizeYouTubeUrl,
  isLikelyOfficialChannel,
} from "./lib/youtube";

// ── Regex patterns for embed URL validation ───────────────────────────────────
const TED_EMBED_RE   = /^https:\/\/embed\.ted\.com\/talks\/[a-z0-9_]+$/;
const YT_EMBED_RE    = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}/;
const YT_ID_RE       = /^[A-Za-z0-9_-]{11}$/;
const YT_WATCH_RE    = /^https:\/\/(www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}/;

// Strings that suggest a re-upload / non-official source
const REUPLOAD_SIGNALS = [
  "compilation",
  "reupload",
  "re-upload",
  "unofficial",
  "best of",
  "top clips",
  "shorts compilation",
];

// ── Check result type ─────────────────────────────────────────────────────────
type CheckStatus = "PASS" | "WARN" | "FAIL" | "INFO";

interface CheckResult {
  status: CheckStatus;
  field: string;
  message: string;
}

// ── Helper functions ──────────────────────────────────────────────────────────
function pass(field: string, message: string): CheckResult {
  return { status: "PASS", field, message };
}
function warn(field: string, message: string): CheckResult {
  return { status: "WARN", field, message };
}
function fail(field: string, message: string): CheckResult {
  return { status: "FAIL", field, message };
}
function info(field: string, message: string): CheckResult {
  return { status: "INFO", field, message };
}

function isValidVerificationStatus(v: unknown): v is VerificationStatus {
  if (typeof v !== "string") return false;
  return (VERIFICATION_STATUSES as readonly string[]).includes(v);
}

function hasReuploadSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return REUPLOAD_SIGNALS.some((s) => lower.includes(s));
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

// ── All checks ────────────────────────────────────────────────────────────────
function runChecks(c: Candidate): CheckResult[] {
  const results: CheckResult[] = [];

  // ── 1. source_url present & looks canonical ──────────────────────
  const sourceUrl = typeof c.source_url === "string" ? c.source_url.trim() : "";
  if (!sourceUrl) {
    results.push(fail("source_url", "source_url is missing. Cannot verify official origin."));
  } else {
    // Check for reupload signals in source_url or source_platform
    const platformText = String(c.source_platform ?? "");
    const combinedText = `${sourceUrl} ${platformText} ${String(c.source_credibility_notes ?? "")}`;
    if (hasReuploadSignal(combinedText)) {
      results.push(
        fail(
          "source_url",
          `source_url or platform notes contain re-upload/compilation signals ("${REUPLOAD_SIGNALS.find((s) => combinedText.toLowerCase().includes(s))}"). This source is not eligible as an official SIO source.`
        )
      );
    } else {
      results.push(pass("source_url", `Present: ${sourceUrl}`));
    }
  }

  // Derive isVideoPlatform early — used by checks 2, 3, 4, 6, 7
  const sourcePlatform = String(c.source_platform ?? "").toLowerCase();
  const isVideoPlatform = ["youtube", "ted", "vimeo", "podcast-video", "ted talk"].some((p) =>
    sourcePlatform.includes(p)
  );

  // ── 2. embed_url format check (if present) ───────────────────────
  const embedUrl = typeof c.embed_url === "string" ? c.embed_url.trim() : "";
  if (embedUrl) {
    if (TED_EMBED_RE.test(embedUrl)) {
      results.push(pass("embed_url", `Valid TED embed format: ${embedUrl}`));
    } else if (YT_EMBED_RE.test(embedUrl)) {
      results.push(pass("embed_url", `Valid YouTube (nocookie) embed format: ${embedUrl}`));
    } else {
      results.push(
        fail(
          "embed_url",
          `embed_url does not match either valid format.\n  Expected TED: https://embed.ted.com/talks/<slug> (lowercase)\n  Expected YT:  https://www.youtube-nocookie.com/embed/<11-char-id>[...]\n  Got: ${embedUrl}`
        )
      );
    }
  } else if (isVideoPlatform) {
    // For video-type sources, a missing embed_url is a WARN (blocks video-primary presentation)
    results.push(
      warn(
        "embed_url",
        `embed_url is blank for a video-type source ("${c.source_platform}"). Required for video-primary display. Human must supply canonical embed URL once the official artifact is confirmed.`
      )
    );
  } else {
    results.push(info("embed_url", "embed_url is blank (non-video source — not required)."));
  }

  // ── 3. video_url present if a video is claimed ───────────────────
  const videoUrl = typeof c.video_url === "string" ? c.video_url.trim() : "";
  if (isVideoPlatform && !videoUrl) {
    results.push(
      warn(
        "video_url",
        `source_platform suggests video content ("${c.source_platform}") but video_url is blank. Human must supply the canonical watch URL.`
      )
    );
  } else if (videoUrl) {
    results.push(pass("video_url", `Present: ${videoUrl}`));
  } else {
    results.push(info("video_url", "video_url is blank (non-video source or not yet found)."));
  }

  // ── 4. official_channel_url present if channel is claimed ────────
  const officialChannelUrl = typeof c.official_channel_url === "string" ? c.official_channel_url.trim() : "";
  // If source is video-type and channel URL is missing, warn
  if (isVideoPlatform && !officialChannelUrl) {
    results.push(
      warn(
        "official_channel_url",
        "Video-type source but official_channel_url is blank. Cannot confirm official-channel provenance without this."
      )
    );
  } else if (officialChannelUrl) {
    results.push(pass("official_channel_url", `Present: ${officialChannelUrl}`));
  } else {
    results.push(info("official_channel_url", "official_channel_url not set (non-video or non-channel source)."));
  }

  // ── 5. transcript_url present if transcript_verification_status requires it ──
  const tvs = typeof c.transcript_verification_status === "string"
    ? c.transcript_verification_status.trim()
    : "";
  const transcriptUrl = typeof c.transcript_url === "string" ? c.transcript_url.trim() : "";
  const tvsNeedsUrl = tvs !== "" && tvs !== "unverified" && tvs !== "not_applicable";
  if (tvsNeedsUrl && !transcriptUrl) {
    results.push(
      warn(
        "transcript_url",
        `transcript_verification_status is "${tvs}" (not unverified/not_applicable) but transcript_url is blank. Evidence of transcript source is required.`
      )
    );
  } else if (transcriptUrl) {
    results.push(pass("transcript_url", `Present: ${transcriptUrl}`));
  } else {
    results.push(
      info("transcript_url", `transcript_url is blank (transcript_verification_status: "${tvs || "(unset)"}")`)
    );
  }

  // ── 6. timestamp_start / timestamp_end ──────────────────────────
  const startRaw = c.timestamp_start_seconds;
  const endRaw   = c.timestamp_end_seconds;
  // Use unknown intermediary to handle YAML-parsed values that may be string-typed at runtime
  const startNum = toNum(startRaw as unknown);
  const endNum   = toNum(endRaw as unknown);
  const startRawU = startRaw as unknown;
  const endRawU   = endRaw as unknown;

  if (startRawU !== null && startRawU !== undefined && startRawU !== "" && startNum === null) {
    results.push(fail("timestamp_start_seconds", `Not a valid number: "${startRawU}"`));
  } else if (startNum !== null) {
    results.push(pass("timestamp_start_seconds", `Valid number: ${startNum}s`));
  } else if (isVideoPlatform) {
    results.push(
      warn(
        "timestamp_start_seconds",
        "Blank/null for a video-type source. timestamp_start_seconds is required for a timestamped video embed. Human must verify against the official transcript/video."
      )
    );
  } else {
    results.push(info("timestamp_start_seconds", "Blank/null — human must verify against transcript."));
  }

  if (endRawU !== null && endRawU !== undefined && endRawU !== "" && endNum === null) {
    results.push(fail("timestamp_end_seconds", `Not a valid number: "${endRawU}"`));
  } else if (endNum !== null) {
    if (startNum !== null && endNum <= startNum) {
      results.push(
        fail("timestamp_end_seconds", `end (${endNum}s) must be > start (${startNum}s). Check timestamp data.`)
      );
    } else {
      results.push(pass("timestamp_end_seconds", `Valid number: ${endNum}s${startNum !== null ? ` (range: ${endNum - startNum}s)` : ""}`));
    }
  } else if (isVideoPlatform) {
    results.push(
      warn(
        "timestamp_end_seconds",
        "Blank/null for a video-type source. timestamp_end_seconds is required for a bounded video embed. Human must verify against the official transcript/video."
      )
    );
  } else {
    results.push(info("timestamp_end_seconds", "Blank/null — human must verify against transcript."));
  }

  // ── 7. quote_type honesty ────────────────────────────────────────
  const transcript = typeof c.transcript_excerpt === "string" ? c.transcript_excerpt.trim() : "";
  const quoteType  = String(c.quote_type ?? "").trim();
  const tvStatus   = tvs; // alias

  if (transcript && quoteType !== "verbatim") {
    results.push(
      warn(
        "quote_type",
        `transcript_excerpt is non-empty but quote_type is "${quoteType}" (not "verbatim"). If this excerpt is verbatim, update quote_type. If it is a paraphrase, that is acceptable but mark clearly.`
      )
    );
  } else if (transcript && quoteType === "verbatim") {
    results.push(pass("quote_type", "quote_type is verbatim and an excerpt is present."));
  } else if (!transcript && isVideoPlatform) {
    // For video sources, missing verbatim excerpt is a WARN (required for SIO body)
    results.push(
      warn(
        "quote_type/transcript_excerpt",
        `No transcript_excerpt captured yet (quote_type: "${quoteType}"). A verbatim excerpt from the official transcript is required before this candidate can advance to SIO draft.`
      )
    );
  } else if (!transcript) {
    results.push(info("quote_type", `No transcript_excerpt (quote_type: "${quoteType}"). Excerpt must be captured before SIO drafting.`));
  }

  // quote_type = verbatim BUT transcript NOT verified → FAIL
  if (quoteType === "verbatim" && tvStatus !== "verified") {
    results.push(
      fail(
        "quote_type/transcript_verification_status",
        `HONESTY VIOLATION: quote_type is "verbatim" but transcript_verification_status is "${tvStatus || "(unset)"}" (not "verified"). A verbatim claim requires a verified transcript. Downgrade quote_type to "paraphrase" or upgrade evidence.`
      )
    );
  }

  // ── 8. media_verification_status in VERIFICATION_STATUSES ───────
  const mvs = typeof c.media_verification_status === "string" ? c.media_verification_status.trim() : "";
  if (!mvs) {
    results.push(warn("media_verification_status", "media_verification_status is blank — set to 'needs_review' or 'unverified'."));
  } else if (!isValidVerificationStatus(mvs)) {
    results.push(
      fail(
        "media_verification_status",
        `"${mvs}" is not a valid verification status. Must be one of: ${VERIFICATION_STATUSES.join(", ")}`
      )
    );
  } else {
    results.push(pass("media_verification_status", `Valid status: "${mvs}"`));
  }

  // ── 9. transcript_verification_status in VERIFICATION_STATUSES ──
  if (!tvs) {
    results.push(warn("transcript_verification_status", "transcript_verification_status is blank — set to 'needs_review' or 'unverified'."));
  } else if (!isValidVerificationStatus(tvs)) {
    results.push(
      fail(
        "transcript_verification_status",
        `"${tvs}" is not a valid verification status. Must be one of: ${VERIFICATION_STATUSES.join(", ")}`
      )
    );
  } else {
    results.push(pass("transcript_verification_status", `Valid status: "${tvs}"`));
  }

  // ── 10. YouTube-specific format checks (pure, no network) ────────
  // Only run when source_platform suggests YouTube.
  if (sourcePlatform.includes("youtube")) {
    // 10a. video_id format
    const rawVideoId = String(c.video_id ?? "").trim();
    if (rawVideoId) {
      if (YT_ID_RE.test(rawVideoId)) {
        results.push(pass("video_id", `Valid 11-char YouTube video_id: ${rawVideoId}`));
      } else {
        results.push(
          fail(
            "video_id",
            `video_id "${rawVideoId}" is not a valid 11-char YouTube ID (must match [A-Za-z0-9_-]{11}).`
          )
        );
      }
    } else {
      results.push(
        info("video_id", "video_id is blank (expected — leave blank until human verifies on official channel).")
      );
    }

    // 10b. video_url format + normalize via helper
    if (videoUrl) {
      const normalizedWatchUrl = normalizeYouTubeUrl(videoUrl);
      if (YT_WATCH_RE.test(videoUrl)) {
        results.push(pass("video_url", `Valid YouTube watch URL: ${videoUrl}`));
        if (normalizedWatchUrl && normalizedWatchUrl !== videoUrl) {
          results.push(
            info("video_url", `Normalized URL (canonical form): ${normalizedWatchUrl}`)
          );
        }
      } else if (normalizedWatchUrl) {
        results.push(
          warn(
            "video_url",
            `video_url does not match expected youtube.com/watch?v=<id> pattern. Normalized: ${normalizedWatchUrl}. Consider updating to the canonical watch URL.`
          )
        );
      } else {
        results.push(
          fail(
            "video_url",
            `video_url "${videoUrl}" does not appear to be a valid YouTube watch URL (expected https://www.youtube.com/watch?v=<11-char-id>).`
          )
        );
      }
    }

    // 10c. embed_url: extract video_id via helper and cross-check 11-char id
    if (embedUrl && YT_EMBED_RE.test(embedUrl)) {
      const idFromEmbed = extractYouTubeVideoId(embedUrl);
      if (idFromEmbed && YT_ID_RE.test(idFromEmbed)) {
        results.push(
          pass("embed_url/video_id_cross_check", `embed_url contains valid 11-char video id: ${idFromEmbed}`)
        );
        // Cross-check: if video_id is also set, they must match
        if (rawVideoId && rawVideoId !== idFromEmbed) {
          results.push(
            fail(
              "video_id/embed_url_mismatch",
              `video_id "${rawVideoId}" does not match the video_id extracted from embed_url "${idFromEmbed}". Resolve before advancing.`
            )
          );
        }
      } else {
        results.push(
          warn("embed_url/video_id_cross_check", `Could not extract a valid 11-char video id from embed_url: ${embedUrl}`)
        );
      }
    }

    // 10d. Official-channel match via isLikelyOfficialChannel (requires API key)
    // This is informational only — NEVER auto-sets "verified".
    const candidateChannelId = String(c.channel_id ?? "").trim();
    if (candidateChannelId) {
      if (hasYouTubeApiKey()) {
        try {
          const channelCheck = isLikelyOfficialChannel(candidateChannelId);
          if (channelCheck.match) {
            results.push(
              info(
                "channel_id",
                `channel_id "${candidateChannelId}" matches trusted channel: ${channelCheck.channelName ?? "unknown"} (trustLevel: ${channelCheck.trustLevel ?? "unknown"}). ` +
                  `HIGH-CONFIDENCE CANDIDATE — but human must still confirm the specific video before setting status to verified.`
              )
            );
          } else {
            results.push(
              warn(
                "channel_id",
                `channel_id "${candidateChannelId}" is NOT in the trusted channel registry. ` +
                  `Cannot confirm official channel match. Human must verify provenance before advancing.`
              )
            );
          }
        } catch (err) {
          results.push(
            info("channel_id", `channel_id format check: "${candidateChannelId}" (could not query trusted registry: ${String(err)})`)
          );
        }
      } else {
        // No API key — do a basic format check only (pure, no network)
        const looksLikeChannelId = /^UC[A-Za-z0-9_-]{22}$/.test(candidateChannelId);
        if (looksLikeChannelId) {
          results.push(
            info(
              "channel_id",
              `channel_id "${candidateChannelId}" has valid YouTube channel ID format (starts with "UC", ~24 chars). ` +
                `YouTube API not configured — cannot check official-channel registry; use isLikelyOfficialChannel once key is set.`
            )
          );
        } else {
          results.push(
            warn(
              "channel_id",
              `channel_id "${candidateChannelId}" does not look like a YouTube channel ID (expected: starts with "UC", ~24 chars). Verify manually.`
            )
          );
        }
      }
    }
  }

  return results;
}

// ── Derive summary verdict ────────────────────────────────────────────────────
function summarize(results: CheckResult[]): {
  overall: "pass" | "warn" | "fail";
  failCount: number;
  warnCount: number;
  passCount: number;
  missingEvidence: string[];
  safeToCopy: string[];
  requiresReview: string[];
  recommendedAction: string;
} {
  const fails = results.filter((r) => r.status === "FAIL");
  const warns = results.filter((r) => r.status === "WARN");
  const passes = results.filter((r) => r.status === "PASS");

  const overall: "pass" | "warn" | "fail" =
    fails.length > 0 ? "fail" : warns.length > 0 ? "warn" : "pass";

  const missingEvidence: string[] = [
    ...fails.map((r) => `[FAIL] ${r.field}: ${r.message}`),
    ...warns.map((r) => `[WARN] ${r.field}: ${r.message}`),
  ];

  // Fields safe to copy: those with PASS status (source, platform, speaker, key_claim, etc.)
  const safeToCopy = [
    "candidate_id", "target_state", "target_gap",
    "proposed_insight_type", "proposed_voice_register", "proposed_intensity_level",
    "source_title", "speaker", "guest_if_applicable",
    "candidate_moment_summary", "key_claim",
    "why_it_might_land", "user_problem_match_notes", "resonance_match_notes",
    "source_credibility_notes",
    // Only safe if their checks passed
    ...passes.map((r) => r.field),
  ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

  const requiresReview = [
    "embed_url (if blank — human must verify canonical URL)",
    "video_id (never auto-populate — human must confirm on official channel)",
    "timestamp_start_seconds / timestamp_end_seconds (human must verify against transcript)",
    "transcript_excerpt (human must capture verbatim from official transcript)",
    "quote_type (set to verbatim only after transcript is confirmed)",
    "transcript_verification_status (human must confirm verbatim — never set to verified by script)",
    "media_verification_status (human must confirm official channel — never set to verified by script)",
    "credibility_tier (human editorial judgment required)",
    "official_channel_url (confirm this is the actual official channel, not a mirror)",
  ];

  let recommendedAction = "";
  if (fails.length > 0) {
    recommendedAction = "BLOCKED from drafting. Resolve all FAIL items before advancing to SIO draft. This candidate needs source and/or transcript verification work.";
  } else if (warns.length > 0) {
    recommendedAction = "NEEDS WORK. Resolve WARN items before advancing. Key gaps: missing timestamps, embed URL, or transcript evidence. Candidate can be proposed but not drafted yet.";
  } else {
    recommendedAction = "FORMAT CLEAN. No format violations detected. NOTE: Human must still verify official channel, transcript accuracy, and embed URL before setting status to verified or ready_for_sio_draft.";
  }

  return {
    overall,
    failCount: fails.length,
    warnCount: warns.length,
    passCount: passes.length,
    missingEvidence,
    safeToCopy,
    requiresReview,
    recommendedAction,
  };
}

// ── Render console report ─────────────────────────────────────────────────────
function printReport(candidatePath: string, c: Candidate, results: CheckResult[]): void {
  const summary = summarize(results);

  const statusIcon: Record<CheckStatus, string> = {
    PASS: "✓",
    WARN: "⚠",
    FAIL: "✗",
    INFO: "·",
  };

  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  SILHOUETTE — Candidate Source Verification Report               ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");
  console.log(`Candidate:  ${c.candidate_id ?? "(unset)"}`);
  console.log(`File:       ${candidatePath}`);
  console.log(`Status:     ${c.candidate_status ?? "(unset)"}`);
  console.log(`Target:     ${c.target_state ?? "(unset)"} / ${c.target_gap ?? "(unset)"}`);
  console.log(`Speaker:    ${c.speaker ?? "(unset)"}`);
  console.log(`Source:     ${c.source_title ?? "(unset)"} [${c.source_platform ?? ""}]`);
  console.log();

  const overallLabel = summary.overall === "fail" ? "FAIL" : summary.overall === "warn" ? "WARN" : "PASS";
  console.log(`Overall verification status: ${overallLabel}  (${summary.failCount} fail, ${summary.warnCount} warn, ${summary.passCount} pass)`);
  console.log();

  console.log("── Check Results ──────────────────────────────────────────────────");
  for (const r of results) {
    console.log(`  ${statusIcon[r.status]} [${r.status}] ${r.field}`);
    if (r.status !== "PASS") {
      // Indent multi-line messages
      const lines = r.message.split("\n");
      for (const line of lines) {
        console.log(`       ${line}`);
      }
    }
  }

  console.log();
  console.log("── Recommended Next Action ────────────────────────────────────────");
  console.log(`  ${summary.recommendedAction}`);
  console.log();

  if (summary.missingEvidence.length > 0) {
    console.log("── Missing Evidence ───────────────────────────────────────────────");
    for (const m of summary.missingEvidence) {
      console.log(`  ${m}`);
    }
    console.log();
  }

  console.log("── Fields SAFE to copy into a finished SIO ───────────────────────");
  console.log(`  ${summary.safeToCopy.slice(0, 12).join(", ")}  [+ editorial fields]`);
  console.log();

  console.log("── Fields that MUST remain blank / needs_review until human verifies ──");
  for (const f of summary.requiresReview) {
    console.log(`  · ${f}`);
  }
  console.log();

  console.log("HONESTY INVARIANT: This script NEVER upgrades any field to 'verified'.");
  console.log("  Only a human reviewer with direct access to the official source may do that.");
  console.log();
}

// ── Optional write-back of conservative status downgrades ────────────────────
function maybeWriteBack(candidatePath: string, c: Candidate, results: CheckResult[]): void {
  const fails = results.filter((r) => r.status === "FAIL");
  const warns = results.filter((r) => r.status === "WARN");
  let changed = false;

  // Downgrade candidate_status if source evidence is missing
  const sourceIssues = [...fails, ...warns].filter(
    (r) => r.field === "source_url" || r.field === "official_channel_url"
  );
  if (sourceIssues.length > 0) {
    if (c.candidate_status !== "needs_source_verification" && c.candidate_status !== "rejected") {
      console.log(`[--write] Downgrading candidate_status → needs_source_verification (source evidence missing)`);
      c.candidate_status = "needs_source_verification";
      changed = true;
    }
  }

  // Downgrade candidate_status if transcript evidence is missing
  const transcriptIssues = [...fails, ...warns].filter(
    (r) =>
      r.field === "transcript_url" ||
      r.field === "transcript_verification_status" ||
      r.field === "quote_type/transcript_verification_status"
  );
  if (transcriptIssues.length > 0) {
    if (
      c.candidate_status !== "needs_transcript_verification" &&
      c.candidate_status !== "needs_source_verification" &&
      c.candidate_status !== "rejected"
    ) {
      console.log(`[--write] Downgrading candidate_status → needs_transcript_verification (transcript evidence missing)`);
      c.candidate_status = "needs_transcript_verification";
      changed = true;
    }
  }

  if (changed) {
    saveCandidate(candidatePath, c);
    console.log(`[--write] Saved updated candidate to ${candidatePath}`);
    console.log(`[--write] NOTE: Only downgrade(s) applied. No field was set to 'verified'.`);
  } else {
    console.log(`[--write] No downgrades needed — candidate_status unchanged: "${c.candidate_status}"`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const args = process.argv.slice(2);
  const candidatePath = args.find((a) => !a.startsWith("--"));
  const writeBack = args.includes("--write");

  if (!candidatePath) {
    console.error("Usage: npx tsx scripts/verify-candidate-source.ts <candidate-path> [--write]");
    console.error("Example: npx tsx scripts/verify-candidate-source.ts corpus/candidates/cand-susan-david-emotional-courage.yaml");
    process.exit(1);
  }

  if (!existsSync(candidatePath)) {
    console.error(`Error: File not found: ${candidatePath}`);
    process.exit(1);
  }

  let c: Candidate;
  try {
    c = loadCandidateFromPath(candidatePath);
  } catch (e) {
    console.error(`Error: Failed to parse candidate YAML at ${candidatePath}: ${e}`);
    process.exit(1);
  }

  const results = runChecks(c);
  printReport(candidatePath, c, results);

  if (writeBack) {
    console.log("── Write-back mode (--write) ──────────────────────────────────────");
    maybeWriteBack(candidatePath, c, results);
  } else {
    console.log("(Run with --write to apply conservative status downgrades.)");
  }

  // Exit with non-zero if any FAIL
  const hasFail = results.some((r) => r.status === "FAIL");
  if (hasFail) process.exit(2);
}

main();
