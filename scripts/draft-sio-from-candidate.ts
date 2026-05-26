/**
 * draft-sio-from-candidate.ts — SIO Discovery Agent: Candidate → DRAFT SIO.
 *
 * DETERMINISTIC. No LLM, no network.
 *
 * HONESTY INVARIANTS (hard-coded, cannot be overridden):
 *   - Drafts go to corpus/drafts/<slug>.md ONLY. NEVER corpus/sios/.
 *   - transcript_verified is ALWAYS false.
 *   - human_review_status is ALWAYS prototype_only.
 *   - This script NEVER sets these to true/approved, even with --force.
 *   - Verbatim excerpt is used in the body ONLY if quote_type==="verbatim" AND
 *     transcript_verification_status==="verified". Otherwise a ⚠️ RECONSTRUCTION NOTE is used.
 *
 * Usage: npx tsx scripts/draft-sio-from-candidate.ts <candidate-path> [--force]
 *
 * STRICT GATE: only proceeds if recommendation==="ready_for_sio_draft" OR
 *              candidate_status==="ready_for_sio_draft". --force bypasses the status
 *              check but all honesty rules still apply.
 *
 * After writing the draft, updates the candidate's candidate_status to "drafted"
 * via saveCandidate().
 *
 * Run: npx tsx scripts/draft-sio-from-candidate.ts corpus/candidates/my-candidate.yaml [--force]
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  DRAFTS_DIR,
  SIOS_DIR,
  loadCandidateFromPath,
  saveCandidate,
  ensureDir,
  slugify,
  str,
  nowIso,
  type Candidate,
} from "./lib/discovery";

// ── Gate check ────────────────────────────────────────────────────────────────
function isReadyForDraft(c: Candidate): boolean {
  return c.recommendation === "ready_for_sio_draft" || c.candidate_status === "ready_for_sio_draft";
}

// ── Map candidate fields to SIO frontmatter fields ────────────────────────────

/** Best-guess display_mode based on source_platform and embed_url. */
function inferDisplayMode(c: Candidate): string {
  const platform = str(c.source_platform).toLowerCase();
  const embedUrl = str(c.embed_url);
  if (embedUrl) {
    // Has an embed_url — use video-primary if a video platform, else text-only
    if (platform.includes("youtube") || platform.includes("ted") || platform.includes("podcast")) {
      return "video-primary";
    }
    return "video-primary";
  }
  if (platform.includes("youtube") || platform.includes("ted")) {
    return "video-primary"; // intent is video; embed_url to be filled
  }
  if (platform.includes("podcast")) {
    return "audio-primary";
  }
  // Books, articles, unknown
  return "text-only";
}

/** Best-guess source_type from source_platform. */
function inferSourceType(c: Candidate): string {
  const platform = str(c.source_platform).toLowerCase();
  if (platform.includes("ted")) return "ted talk";
  if (platform.includes("youtube")) return "youtube native";
  if (platform.includes("podcast")) return "long-form interview podcast";
  if (platform.includes("book")) return "book";
  if (platform.includes("article")) return "article";
  return "long-form interview podcast";
}

/** Best-guess source_media_type from source_platform. */
function inferSourceMediaType(c: Candidate): string {
  const platform = str(c.source_platform).toLowerCase();
  if (platform.includes("ted")) return "ted-talk";
  if (platform.includes("youtube")) return "youtube-video";
  if (platform.includes("podcast")) return "podcast-video";
  if (platform.includes("book")) return "book";
  if (platform.includes("article")) return "article";
  return "podcast-video";
}

/** Best-guess video_provider from source_platform and embed_url. */
function inferVideoProvider(c: Candidate): string {
  const platform = str(c.source_platform).toLowerCase();
  const embedUrl = str(c.embed_url);
  if (platform.includes("ted") || embedUrl.includes("embed.ted.com")) return "ted";
  if (platform.includes("youtube") || embedUrl.includes("youtube-nocookie.com")) return "youtube";
  if (platform.includes("vimeo")) return "vimeo";
  return "none";
}

/** Best-guess credibility_tier from source_credibility_notes. */
function inferCredibilityTier(c: Candidate): string {
  const notes = str(c.source_credibility_notes).toLowerCase();
  if (notes.includes("tier-1")) return "tier-1";
  if (notes.includes("tier-2")) return "tier-2";
  if (notes.includes("tier-3")) return "tier-3";
  // Fallback: if they mention "research" or "phd" or "professor" → tier-3 or tier-2
  if (notes.includes("research") || notes.includes("study") || notes.includes("neuroscience")) return "tier-3";
  if (notes.includes("psychologist") || notes.includes("coach") || notes.includes("strategist")) return "tier-2";
  return "tier-2"; // safe default; human must review
}

/** Build a clean attribution_text from candidate fields. */
function buildAttributionText(c: Candidate): string {
  const speaker  = str(c.speaker);
  const platform = str(c.source_platform);
  const title    = str(c.source_title);

  // Try to extract year from source_url or title or candidate timestamps
  let year = "";
  const urlYear  = str(c.source_url).match(/\b(20\d{2})\b/)?.[1] ?? "";
  const titleYear = title.match(/\b(20\d{2})\b/)?.[1] ?? "";
  const createdYear = str(c.created_at).match(/^(20\d{2})/)?.[1] ?? "";
  year = urlYear || titleYear || createdYear || "";

  const yearStr = year ? ` (${year})` : "";

  // Format: "Speaker, appearing on Platform, 'Episode Title'(Year)"
  if (platform && title) {
    return `${speaker}, ${platform}, "${title}"${yearStr}`;
  }
  if (platform) {
    return `${speaker}, ${platform}${yearStr}`;
  }
  if (title) {
    return `${speaker}, "${title}"${yearStr}`;
  }
  return `${speaker}${yearStr}`;
}

/** Format a numeric timestamp (seconds) to a readable string. */
function fmtSeconds(s: number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const hours = Math.floor(s / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = Math.floor(s % 60);
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Build insight_id slug from speaker + topic hint + year. */
function buildInsightId(c: Candidate): string {
  const speaker = str(c.speaker);
  // Try to extract a 2-4 word topic slug from the key_claim or source_title
  const rawTopic = str(c.key_claim || c.source_title || c.target_gap).split(/\s+/).slice(0, 4).join(" ");
  const year = str(c.source_url).match(/\b(20\d{2})\b/)?.[1] ??
               str(c.created_at).match(/^(20\d{2})/)?.[1] ?? "";
  const slug = slugify(`${speaker} ${rawTopic} ${year}`);
  return `sio-${slug}`;
}

/** Build source_id (best-guess — human must confirm matches a sources/ file). */
function buildSourceId(c: Candidate): string {
  const speaker = str(c.speaker);
  const title   = str(c.source_title);
  const year    = str(c.source_url).match(/\b(20\d{2})\b/)?.[1] ??
                  str(c.created_at).match(/^(20\d{2})/)?.[1] ?? "";
  return `src-${slugify(`${speaker} ${title} ${year}`)}`;
}

// ── Build the full SIO markdown ───────────────────────────────────────────────
function buildDraftMarkdown(c: Candidate, candidatePath: string): string {
  const L: string[] = [];

  // ── Gather all values ──
  const insightId      = buildInsightId(c);
  const sourceId       = buildSourceId(c);
  const sourceType     = inferSourceType(c);
  const sourceMediaType = inferSourceMediaType(c);
  const displayMode    = inferDisplayMode(c);
  const videoProvider  = inferVideoProvider(c);
  const credTier       = inferCredibilityTier(c);
  const attribution    = buildAttributionText(c);

  const embedUrl       = str(c.embed_url);
  const videoUrl       = str(c.video_url);
  const officialChanUrl = str(c.official_channel_url);
  const transcriptUrl  = str(c.transcript_url);

  const startSec       = typeof c.timestamp_start_seconds === "number" ? c.timestamp_start_seconds : null;
  const endSec         = typeof c.timestamp_end_seconds   === "number" ? c.timestamp_end_seconds   : null;
  const tRange         = (startSec !== null && endSec !== null)
    ? `${fmtSeconds(startSec)}–${fmtSeconds(endSec)} (approx)`
    : "";

  const quoteType      = str(c.quote_type);
  const tvStatus       = str(c.transcript_verification_status);
  const mvStatus       = str(c.media_verification_status) || "needs_review";

  const keyClaim       = str(c.key_claim);
  const contentSummary = str(c.candidate_moment_summary);
  const userMatchNotes = str(c.user_problem_match_notes);
  const resonanceNotes = str(c.resonance_match_notes);
  const transcriptExcerpt = str(c.transcript_excerpt);

  // Date: extract from created_at or "YYYY-MM-DD" from source URL
  const ingestDate = nowIso().slice(0, 10);
  const sourceDate = str(c.source_url).match(/\b(20\d{2})\b/)?.[1]
    ? `${str(c.source_url).match(/\b(20\d{2})\b/)?.[1]}-01-01`
    : "";

  // topic_keywords: derive from target_state, proposed types, and key claim words
  const keywordSet = new Set<string>();
  [
    str(c.target_state).replace(/-/g, " "),
    str(c.proposed_insight_type),
    str(c.proposed_voice_register).replace(/\//g, " "),
    str(c.proposed_intensity_level),
  ].forEach((kw) => kw.split(/[\s,/]+/).filter(Boolean).forEach((w) => keywordSet.add(w)));
  // Add 3-4 words from the key claim
  keyClaim.split(/\s+/).slice(0, 8).filter((w) => w.length > 4).forEach((w) =>
    keywordSet.add(w.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );
  const topicKeywords = [...keywordSet].filter(Boolean).slice(0, 8);

  // ── HONESTY INVARIANTS (locked) ──
  const transcriptVerified  = false;         // ALWAYS false — never change
  const humanReviewStatus   = "prototype_only"; // ALWAYS prototype_only — never change

  // ── Body: verbatim excerpt ONLY if quote_type===verbatim AND tvs===verified ──
  const isVerbatimVerified = quoteType === "verbatim" && tvStatus === "verified";
  let bodyText = "";
  if (isVerbatimVerified && transcriptExcerpt) {
    bodyText = transcriptExcerpt;
  } else {
    // ⚠️ RECONSTRUCTION NOTE (honest)
    const excerptSection = transcriptExcerpt
      ? `\n${transcriptExcerpt}\n\n_(Marked as \`${quoteType}\` with transcript_verification_status: ${tvStatus || "(unset)"}. Replace with verified verbatim text before approval.)_`
      : `_(No transcript excerpt captured yet. A human must locate and paste the verbatim excerpt before approval.)_`;

    bodyText = [
      `⚠️ RECONSTRUCTION NOTE: The following is derived from the candidate_moment_summary`,
      `(quote_type: ${quoteType || "(unset)"}, transcript_verification_status: ${tvStatus || "(unset)"}).`,
      `It is NOT a verified verbatim transcript. Replace with a verbatim excerpt confirmed against`,
      `the official transcript before setting human_review_status: approved.`,
      ``,
      `Candidate moment summary:`,
      contentSummary || "(candidate_moment_summary was blank)",
      excerptSection,
    ].join("\n");
  }

  // ── Frontmatter ──────────────────────────────────────────────────
  L.push("---");
  L.push(`# ⚠️ DRAFT — prototype_only. DO NOT move to corpus/sios/ without human review.`);
  L.push(`# Generated by draft-sio-from-candidate.ts from: ${candidatePath}`);
  L.push(`# candidate_id: ${str(c.candidate_id)}`);
  L.push(`# FIELDS REQUIRING HUMAN REVIEW BEFORE APPROVAL — see bottom of file.`);
  L.push(``);
  L.push(`insight_id: "${insightId}"`);
  L.push(`# NOTE: Auto-generated slug. Human must verify uniqueness + correct format.`);
  L.push(``);
  L.push(`source_id: "${sourceId}"`);
  L.push(`# NOTE: Auto-generated. Must match an actual file in corpus/sources/.`);
  L.push(`#       If no source file exists yet, create one before approving this draft.`);
  L.push(``);
  L.push(`# ── SOURCE ──────────────────────────────────────────────────────────`);
  L.push(`source_type: "${sourceType}"`);
  L.push(`speaker: "${str(c.speaker)}"`);
  L.push(`show_or_platform: "${str(c.source_platform)}"`);
  L.push(`episode_or_content_title: "${str(c.source_title)}"`);
  L.push(`episode_or_content_date: "${sourceDate}"`);
  L.push(`# NOTE: Human must fill/verify the exact YYYY-MM-DD date.`);
  L.push(`timestamp_range: "${tRange}"`);
  L.push(`# NOTE: Human must verify timestamp against official transcript.`);
  L.push(`source_url: "${str(c.source_url)}"`);
  L.push(``);
  L.push(`transcript_verified: false`);
  L.push(`# LOCKED: Always false in drafts. Only a human reviewer may set true after`);
  L.push(`#         confirming verbatim text against the official transcript.`);
  L.push(``);
  L.push(`# ── MEDIA (PRESENTATION LAYER ONLY) ─────────────────────────────────`);
  L.push(`source_media_type: "${sourceMediaType}"`);
  L.push(`video_provider: "${videoProvider}"`);
  L.push(`video_id: ""`);
  L.push(`# NOTE: NEVER auto-populate video_id. Human must confirm on the official channel.`);
  if (videoUrl) {
    L.push(`video_url: "${videoUrl}"`);
  } else {
    L.push(`video_url: ""`);
    L.push(`# NOTE: Human must supply the canonical watch URL.`);
  }
  if (embedUrl) {
    L.push(`embed_url: "${embedUrl}"`);
    L.push(`# NOTE: Copied from candidate — human must verify this is the official/canonical embed.`);
  } else {
    L.push(`embed_url: ""`);
    L.push(`# NOTE: Human must fill once video_id or TED slug is confirmed.`);
  }
  L.push(`official_channel: ""`);
  L.push(`# NOTE: Human must fill with the official channel name.`);
  if (officialChanUrl) {
    L.push(`official_channel_url: "${officialChanUrl}"`);
  } else {
    L.push(`official_channel_url: ""`);
    L.push(`# NOTE: Human must fill with the official channel URL.`);
  }
  L.push(`timestamp_start_seconds: ${startSec !== null ? startSec : "null"}`);
  L.push(`timestamp_end_seconds: ${endSec !== null ? endSec : "null"}`);
  L.push(`# NOTE: Human must verify timestamps against transcript.`);
  L.push(`display_mode: "${displayMode}"`);
  L.push(`media_available: null`);
  L.push(`# NOTE: Human must confirm after verifying official channel.`);
  L.push(`media_verification_status: "${mvStatus}"`);
  L.push(`# NOTE: This script NEVER sets media_verification_status to "verified".`);
  L.push(`#       Human must confirm the official artifact before upgrading.`);
  L.push(`media_verification_notes: "Draft — not verified. Copied candidate media_verification_status: ${mvStatus}. Human must confirm official channel + embed URL before upgrading."`);
  L.push(`media_rights_notes: ""`);
  L.push(`# NOTE: Human must fill in applicable rights/usage notes.`);
  L.push(``);
  L.push(`# ── RETRIEVAL TAGS ───────────────────────────────────────────────────`);
  L.push(`primary_state_tag: "${str(c.target_state)}"`);
  L.push(`secondary_state_tags: []`);
  L.push(`direction_collapse_variant: ""`);
  L.push(`# NOTE: Fill if primary_state_tag is direction-collapse and variant is clear.`);
  L.push(``);
  L.push(`insight_type: "${str(c.proposed_insight_type)}"`);
  L.push(`voice_register: "${str(c.proposed_voice_register)}"`);
  L.push(`credibility_tier: "${credTier}"`);
  L.push(`# NOTE: Auto-inferred from credibility notes. Human must verify.`);
  L.push(`intensity_level: "${str(c.proposed_intensity_level)}"`);
  L.push(``);
  L.push(`# ── KEY CONTENT ──────────────────────────────────────────────────────`);
  L.push(`key_claim: "${keyClaim.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
  L.push(``);
  L.push(`content_summary: "${contentSummary.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
  L.push(``);
  L.push(`attribution_text: "${attribution.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
  L.push(`# NOTE: Human must verify completeness — check speaker name, show, episode title, date.`);
  L.push(``);
  L.push(`# ── QUALITY AND REVIEW ───────────────────────────────────────────────`);
  L.push(`tagger_confidence: "low"`);
  L.push(`# NOTE: Draft defaults to low — human must re-assess after reviewing all fields.`);
  L.push(``);
  L.push(`human_review_status: "${humanReviewStatus}"`);
  L.push(`# LOCKED: Always prototype_only in drafts generated by this script.`);
  L.push(`#         Set to approved ONLY after all required fields are verified by a human.`);
  L.push(`#         NEVER change to "approved" in this file without completing human review checklist.`);
  L.push(``);
  L.push(`ingestion_date: "${ingestDate}"`);
  L.push(`rights_or_usage_notes: "Draft — human must fill in applicable rights/usage notes."`);
  L.push(``);
  L.push(`topic_keywords: [${topicKeywords.map((k) => JSON.stringify(k)).join(", ")}]`);
  L.push(``);
  L.push(`# ── MATCH NOTES ──────────────────────────────────────────────────────`);
  L.push(`user_problem_match_notes: "${userMatchNotes.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
  L.push(``);
  L.push(`resonance_match_notes: "${resonanceNotes.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
  L.push(`---`);

  // ── Body ──────────────────────────────────────────────────────────
  L.push("");
  L.push(bodyText);
  L.push("");

  // ── Human review checklist ────────────────────────────────────────
  L.push("<!-- ══════════════════════════════════════════════════════════════");
  L.push("FIELDS REQUIRING HUMAN REVIEW BEFORE APPROVAL");
  L.push("");
  L.push("1. transcript_excerpt — Replace ⚠️ RECONSTRUCTION NOTE with verbatim text");
  L.push("   confirmed against the official transcript. Set transcript_verified: true");
  L.push("   and update quote_type to 'verbatim'.");
  L.push("");
  L.push("2. timestamp_start_seconds / timestamp_end_seconds — Verify exact timestamps");
  L.push("   against the official transcript or video. Update timestamp_range accordingly.");
  L.push("");
  L.push("3. video_id / embed_url — Confirm the official channel video_id (YouTube) or");
  L.push("   canonical slug (TED) by playing the video on the official channel.");
  L.push("   Set media_verification_status: verified ONLY after this step.");
  L.push("   Update embed_url and official_channel_url.");
  L.push("");
  L.push("4. credibility_tier — Verify the correct tier (1/2/3) based on the excerpt's");
  L.push("   framing, not the speaker's biography.");
  L.push("");
  L.push("5. source_id — Confirm a matching file exists in corpus/sources/.");
  L.push("   Create it if not present (follow the source schema).");
  L.push("");
  L.push("6. attribution_text — Verify completeness: speaker, show/platform, episode title,");
  L.push("   and date. This is presented verbatim to users.");
  L.push("");
  L.push("7. episode_or_content_date — Verify exact YYYY-MM-DD against the official source.");
  L.push("");
  L.push("8. human_review_status — Set to 'approved' ONLY after all above are confirmed.");
  L.push("   Then manually move this file from corpus/drafts/ to corpus/sios/.");
  L.push("   NEVER set approved in this draft file without completing this checklist.");
  L.push("");
  L.push("9. Reminder: corpus/drafts/ is NOT indexed. corpus/sios/ is indexed.");
  L.push("   DO NOT move to corpus/sios/ until approved by a human reviewer.");
  L.push("═══════════════════════════════════════════════════════════════ -->");

  return L.join("\n") + "\n";
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const args = process.argv.slice(2);
  const candidatePath = args.find((a) => !a.startsWith("--"));
  const forceMode = args.includes("--force");

  if (!candidatePath) {
    console.error("Usage: npx tsx scripts/draft-sio-from-candidate.ts <candidate-path> [--force]");
    console.error("Example: npx tsx scripts/draft-sio-from-candidate.ts corpus/candidates/cand-susan-david-emotional-courage.yaml");
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

  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  SILHOUETTE — Draft SIO from Candidate                           ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");
  console.log(`Candidate:  ${str(c.candidate_id) || "(unset)"}`);
  console.log(`File:       ${candidatePath}`);
  console.log(`Status:     ${str(c.candidate_status)}`);
  console.log(`Recommend:  ${str(c.recommendation)}`);
  console.log();

  // ── STRICT GATE ──────────────────────────────────────────────────
  const ready = isReadyForDraft(c);
  if (!ready && !forceMode) {
    console.error("BLOCKED: This candidate is not ready for SIO drafting.");
    console.error("");
    console.error(`  candidate_status: "${str(c.candidate_status)}"`);
    console.error(`  recommendation:   "${str(c.recommendation)}"`);
    console.error("");
    console.error("  Required: recommendation === 'ready_for_sio_draft'");
    console.error("         OR candidate_status === 'ready_for_sio_draft'");
    console.error("");
    const blockers: string[] = [];
    if (!str(c.overall_candidate_score)) blockers.push("No overall_candidate_score — run evaluate script");
    if (str(c.novelty_rating) === "duplicate") blockers.push("novelty_rating=duplicate");
    if (str(c.transcript_verification_status) === "needs_review")
      blockers.push("transcript_verification_status=needs_review — transcript must be verified");
    if (!str(c.source_url)) blockers.push("source_url is blank");
    if (str(c.recommendation) === "reject") blockers.push("recommendation=reject");
    if (str(c.recommendation) === "promising") blockers.push("recommendation=promising — score not high enough yet");
    if (str(c.candidate_status) === "proposed") blockers.push("candidate_status=proposed — needs evaluation and verification first");
    if (blockers.length > 0) {
      console.error("  Blockers preventing draft:");
      for (const b of blockers) {
        console.error(`    · ${b}`);
      }
    }
    console.error("");
    console.error("  Run with --force to bypass the status check (honesty rules still apply).");
    process.exit(2);
  }

  if (forceMode && !ready) {
    console.warn("⚠️  --force mode: bypassing status gate. All honesty invariants still apply.");
    console.warn("   transcript_verified will be false; human_review_status will be prototype_only.");
    console.warn();
  }

  // ── Safety: never write to corpus/sios/ ──────────────────────────
  // (This is enforced structurally — we only ever write to DRAFTS_DIR)
  ensureDir(DRAFTS_DIR);

  // ── Build draft filename ──────────────────────────────────────────
  const candidateId = str(c.candidate_id) || slugify(`${str(c.speaker)} ${str(c.source_title)}`);
  // Strip "cand-" prefix to get a cleaner draft name
  const draftSlug = candidateId.replace(/^cand-/, "draft-");
  const draftPath = join(DRAFTS_DIR, `${draftSlug}.md`);

  // ── Safety check: NEVER write to SIOS_DIR ───────────────────────
  if (draftPath.startsWith(SIOS_DIR)) {
    console.error("CRITICAL SAFETY ERROR: Attempted to write draft to corpus/sios/. Aborting.");
    process.exit(3);
  }

  // ── Build and write draft ─────────────────────────────────────────
  console.log(`Building draft → ${draftPath}`);
  const draftContent = buildDraftMarkdown(c, candidatePath);

  const { writeFileSync } = await_import_writeFileSync();
  writeFileSync(draftPath, draftContent, "utf-8");

  // ── Update candidate status to "drafted" ──────────────────────────
  c.candidate_status = "drafted";
  saveCandidate(candidatePath, c);

  // ── Output: draft path + human review checklist summary ───────────
  console.log();
  console.log(`Draft written to: ${draftPath}`);
  console.log();
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  FIELDS REQUIRING HUMAN REVIEW BEFORE APPROVAL                  ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("  1. transcript_excerpt — Replace ⚠️ RECONSTRUCTION NOTE with verified verbatim text.");
  console.log("     Set transcript_verified: true after confirming against the official transcript.");
  console.log();
  console.log("  2. timestamp_start_seconds / timestamp_end_seconds — Verify against transcript/video.");
  console.log("     Update timestamp_range accordingly.");
  console.log();
  console.log("  3. video_id / embed_url — Confirm official channel video_id (YouTube) or TED slug.");
  console.log("     Set media_verification_status: verified ONLY after playing on the official channel.");
  console.log();
  console.log("  4. credibility_tier — Verify tier (1/2/3) based on the excerpt's framing.");
  console.log();
  console.log("  5. source_id — Confirm a matching corpus/sources/ file exists (or create it).");
  console.log();
  console.log("  6. attribution_text — Verify speaker, show, episode title, and date are complete.");
  console.log();
  console.log("  7. episode_or_content_date — Verify exact YYYY-MM-DD.");
  console.log();
  console.log("  8. human_review_status — Set to 'approved' ONLY after all above are confirmed.");
  console.log("     Then MANUALLY move from corpus/drafts/ → corpus/sios/.");
  console.log("     DO NOT move to corpus/sios/ without a completed human review.");
  console.log();
  console.log("HONESTY REMINDER:");
  console.log("  · transcript_verified is FALSE in this draft (locked by this script).");
  console.log("  · human_review_status is 'prototype_only' (locked by this script).");
  console.log("  · This draft is in corpus/drafts/ — it is NOT indexed or served to users.");
  console.log();
  console.log(`Candidate ${candidateId} status updated to "drafted" in: ${candidatePath}`);
}

// Synchronous writeFileSync already imported from discovery.ts indirectly via fs —
// we need it directly here. Use a thin wrapper to keep the top-level import clean.
function await_import_writeFileSync() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  return fs;
}

main();
