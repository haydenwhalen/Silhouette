/**
 * promote-candidate-to-sio.ts — Human-gated promotion of a REVIEWED candidate to a served SIO.
 *
 * This is the explicit, reviewer-operated promotion step (Phase 8 of the Six-State Buildout).
 * It is distinct from draft-sio-from-candidate.ts (which writes verbose prototype drafts to
 * corpus/drafts/). This tool writes a CLEAN, corpus-format SIO to corpus/sios/ + a source object
 * to corpus/sources/, matching the existing reconstruction SIOs (e.g. direction_collapse_manson.md).
 *
 * It is run by a human reviewer ONLY on candidates they have personally reviewed and judged to
 * pass every gate (HRS, anti-generic, novelty, source integrity, state-fit, magnet). Nothing here
 * is automatic: it requires --confirm, and it refuses any candidate not explicitly listed.
 *
 * HONESTY INVARIANTS (hard-coded — cannot be overridden by any flag):
 *   - transcript_verified is ALWAYS false unless the candidate genuinely has
 *     quote_type=verbatim AND transcript_verification_status=verified (then it may be true).
 *   - human_review_status is ALWAYS "prototype_only" (NEVER "approved" — that stays a separate,
 *     evidence-backed human decision).
 *   - video_id / embed_url are NEVER fabricated — only copied if the candidate already carries a
 *     verified one (none of the reconstruction candidates do).
 *   - The body carries an explicit ⚠️ RECONSTRUCTION NOTE whenever the quote is not verified verbatim.
 *
 * Usage:
 *   npx tsx scripts/promote-candidate-to-sio.ts corpus/candidates/<file>.yaml --confirm
 *   npx tsx scripts/promote-candidate-to-sio.ts --all-pp --confirm   (helpers below)
 */

import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import {
  SIOS_DIR,
  SOURCES_DIR,
  CANDIDATES_DIR,
  loadCandidateFromPath,
  saveCandidate,
  ensureDir,
  slugify,
  str,
  nowIso,
  type Candidate,
} from "./lib/discovery";

function inferSourceType(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("ted")) return "ted talk";
  if (p.includes("youtube")) return "youtube native";
  if (p.includes("podcast") || p.includes("ferriss") || p.includes("huberman") || p.includes("rich roll") || p.includes("robbins") || p.includes("greatness")) return "long-form interview podcast";
  if (p.includes("book")) return "book";
  return "long-form interview podcast";
}
function inferSourceMediaType(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("ted")) return "ted-talk";
  if (p.includes("book")) return "book";
  if (p.includes("youtube")) return "youtube-video";
  return "podcast";
}
function inferCredibilityTier(notes: string): string {
  const n = notes.toLowerCase();
  if (n.includes("tier-1")) return "tier-1";
  if (n.includes("tier-3")) return "tier-3";
  if (n.includes("tier-2")) return "tier-2";
  return "tier-2";
}
function yearFrom(c: Candidate): string {
  return (
    str(c.source_url).match(/\b(19|20)\d{2}\b/)?.[0] ??
    str(c.source_title).match(/\b(19|20)\d{2}\b/)?.[0] ??
    str(c.candidate_moment_summary).match(/\b(19|20)\d{2}\b/)?.[0] ??
    "2020"
  );
}
function buildInsightId(c: Candidate): string {
  const topic = str(c.candidate_id).replace(/^cand-(pp|it|mg)-[a-z]+-/, "").replace(/^cand-(pp|it|mg)-/, "");
  const speaker = slugify(str(c.speaker));
  return `sio-${slugify(speaker + "-" + topic)}-${yearFrom(c)}`;
}
function buildSourceId(c: Candidate): string {
  return `src-${slugify(str(c.speaker) + "-" + str(c.source_title))}-${yearFrom(c)}`;
}
function attribution(c: Candidate): string {
  const y = yearFrom(c);
  const sp = str(c.speaker), pl = str(c.source_platform), ti = str(c.source_title);
  if (pl && ti) return `${sp}, ${pl}, "${ti}" (${y})`;
  if (ti) return `${sp}, "${ti}" (${y})`;
  return `${sp} (${y})`;
}

function buildSioMarkdown(c: Candidate, insightId: string, sourceId: string): string {
  const platform = str(c.source_platform);
  const sourceType = inferSourceType(platform);
  const mediaType = inferSourceMediaType(platform);
  const tier = inferCredibilityTier(str(c.source_credibility_notes));
  const year = yearFrom(c);
  const isBook = mediaType === "book";
  const verbatimVerified =
    str(c.quote_type) === "verbatim" && str(c.transcript_verification_status) === "verified";
  const mvs = str(c.media_verification_status) || (isBook ? "not_applicable" : "needs_review");
  const keyClaim = str(c.key_claim);
  const summary = str(c.candidate_moment_summary);
  const subState = str((c as Record<string, unknown>).sub_state);

  const reconNote = verbatimVerified
    ? ""
    : `⚠️ RECONSTRUCTION NOTE: The text below paraphrases ${str(c.speaker)}'s documented argument from ` +
      `"${str(c.source_title)}" (${year}) in their published/spoken register. It is NOT a verified verbatim ` +
      `quote. Replace with a verbatim excerpt confirmed against the official source before marking approved.\n\n`;

  const body = reconNote + keyClaim;

  const L: string[] = [];
  L.push("---");
  L.push(`insight_id: ${insightId}`);
  L.push(`source_id: ${sourceId}`);
  L.push(``);
  L.push(`source_type: ${sourceType}`);
  L.push(`speaker: ${JSON.stringify(str(c.speaker))}`);
  L.push(`show_or_platform: ${JSON.stringify(platform)}`);
  L.push(`episode_or_content_title: ${JSON.stringify(str(c.source_title))}`);
  L.push(`episode_or_content_date: ${JSON.stringify(year + "-01-01")}`);
  L.push(`# NOTE: Date is APPROXIMATE (best-effort year; day/month placeholder). Human must verify exact YYYY-MM-DD.`);
  L.push(`timestamp_range: ""`);
  L.push(`source_url: ${JSON.stringify(str(c.source_url))}`);
  L.push(`transcript_verified: ${verbatimVerified ? "true" : "false"}`);
  if (!verbatimVerified) {
    L.push(`# Reconstruction (prototype_only): paraphrase of the speaker's documented idea in their register.`);
    L.push(`# Replace with a verified verbatim excerpt before marking approved.`);
  }
  L.push(``);
  L.push(`# ── MEDIA (PRESENTATION LAYER ONLY) ───────────────────────────────`);
  L.push(`source_media_type: ${mediaType}`);
  L.push(`video_provider: none`);
  L.push(`video_id: ""`);
  L.push(`video_url: ""`);
  L.push(`embed_url: ""`);
  L.push(`# NOTE: No verified official video embed. Never fabricate a video_id/embed_url.`);
  L.push(`official_channel: ""`);
  L.push(`official_channel_url: ${JSON.stringify(str(c.official_channel_url))}`);
  L.push(`timestamp_start_seconds: null`);
  L.push(`timestamp_end_seconds: null`);
  L.push(`display_mode: text-only`);
  L.push(`media_available: ${isBook ? "true" : "null"}`);
  L.push(`media_verification_status: ${mvs}`);
  L.push(`media_verification_notes: ${JSON.stringify(
    isBook
      ? "Published book/text source — no embeddable video. Source-link only to the canonical page. Not_applicable for video."
      : "Reconstruction (prototype_only). Official video embed not verified. Human must confirm an official artifact before any video-primary display."
  )}`);
  L.push(`media_rights_notes: ${JSON.stringify(
    "Source-link to the canonical official page. Do not reproduce extended passages or re-host audio/video."
  )}`);
  L.push(``);
  L.push(`primary_state_tag: ${str(c.target_state)}`);
  L.push(`secondary_state_tags: []`);
  L.push(`direction_collapse_variant: ""`);
  if (subState) L.push(`momentum_gap_sub_state: ${subState}`);
  L.push(``);
  L.push(`insight_type: ${str(c.proposed_insight_type)}`);
  L.push(`voice_register: ${JSON.stringify(str(c.proposed_voice_register))}`);
  L.push(`credibility_tier: ${tier}`);
  L.push(`intensity_level: ${str(c.proposed_intensity_level)}`);
  L.push(``);
  L.push(`key_claim: ${JSON.stringify(keyClaim)}`);
  L.push(``);
  L.push(`content_summary: ${JSON.stringify(summary)}`);
  L.push(``);
  L.push(`attribution_text: ${JSON.stringify(attribution(c))}`);
  L.push(``);
  L.push(`tagger_confidence: moderate`);
  L.push(`# NOTE: prototype_only reconstruction. Human to re-assess after verbatim verification.`);
  L.push(`human_review_status: prototype_only`);
  L.push(`ingestion_date: ${JSON.stringify(nowIso().slice(0, 10))}`);
  L.push(`rights_or_usage_notes: ${JSON.stringify(
    "Paraphrase of the speaker's documented idea. Replace with a verified verbatim quote before production use."
  )}`);
  L.push(``);
  L.push(`topic_keywords: ${JSON.stringify(
    [
      ...str(c.target_state).split("-"),
      str(c.proposed_insight_type),
      ...keyClaim.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 5).slice(0, 5),
    ].filter(Boolean).slice(0, 8)
  )}`);
  L.push(``);
  L.push(`user_problem_match_notes: ${JSON.stringify(str(c.user_problem_match_notes))}`);
  L.push(``);
  L.push(`resonance_match_notes: ${JSON.stringify(str(c.resonance_match_notes))}`);
  L.push(`---`);
  L.push(``);
  L.push(body);
  L.push(``);
  return L.join("\n");
}

function buildSourceJson(c: Candidate, sourceId: string): string {
  const platform = str(c.source_platform);
  const isBook = inferSourceMediaType(platform) === "book";
  const verbatimVerified =
    str(c.quote_type) === "verbatim" && str(c.transcript_verification_status) === "verified";
  const obj = {
    source_id: sourceId,
    source_type: inferSourceType(platform),
    speaker: str(c.speaker),
    show_or_platform: platform,
    episode_or_content_title: str(c.source_title),
    episode_or_content_date: yearFrom(c) + "-01-01",
    source_url: str(c.source_url),
    official_channel_url: str(c.official_channel_url) || undefined,
    transcript_url: str(c.transcript_url) || undefined,
    transcript_available: !!str(c.transcript_url),
    transcript_source: isBook ? "book text" : "official page (not fetched)",
    transcript_verified: verbatimVerified,
    video_provider: "none",
    video_id: "",
    video_url: "",
    embed_url: "",
    media_available: isBook ? true : null,
    media_verification_status: str(c.media_verification_status) || (isBook ? "not_applicable" : "needs_review"),
    source_confidence: "moderate",
    source_score: null,
    verification_notes:
      "Created 2026-05-26 via the Six-State Buildout (Phase 8 human-gated promotion). " +
      "prototype_only reconstruction — paraphrase of the speaker's documented idea; NOT a verified verbatim excerpt. " +
      str(c.source_credibility_notes),
    rights_or_usage_notes:
      "Source-link to the canonical official page. Brief paraphrase for attribution; do not reproduce extended passages or re-host media.",
    sios: [buildInsightId(c)],
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

function promote(candidatePath: string, confirm: boolean): void {
  if (!existsSync(candidatePath)) {
    console.error(`Not found: ${candidatePath}`);
    process.exitCode = 1;
    return;
  }
  const c = loadCandidateFromPath(candidatePath);
  const insightId = buildInsightId(c);
  const sourceId = buildSourceId(c);
  const state = str(c.target_state).replace(/-/g, "_");
  const slug = str(c.candidate_id).replace(/^cand-(pp|it|mg)-/, "").replace(/-/g, "_");
  const sioPath = join(SIOS_DIR, `${state}_${slug}.md`);
  const sourcePath = join(SOURCES_DIR, `${sourceId}.json`);

  console.log(`\n• ${c.candidate_id}`);
  console.log(`  → SIO:    ${sioPath.replace(process.cwd() + "/", "")}  (insight_id: ${insightId})`);
  console.log(`  → source: ${sourcePath.replace(process.cwd() + "/", "")}`);
  if (!confirm) {
    console.log(`  (dry-run — pass --confirm to write)`);
    return;
  }
  if (!sioPath.startsWith(SIOS_DIR)) {
    console.error("  SAFETY: refusing to write outside corpus/sios/");
    process.exitCode = 1;
    return;
  }
  ensureDir(SIOS_DIR);
  ensureDir(SOURCES_DIR);
  writeFileSync(sioPath, buildSioMarkdown(c, insightId, sourceId), "utf-8");
  if (!existsSync(sourcePath)) writeFileSync(sourcePath, buildSourceJson(c, sourceId), "utf-8");
  c.candidate_status = "drafted";
  c.human_review_notes =
    "Promoted to corpus/sios/ as prototype_only (Six-State Buildout Phase 8). transcript_verified=false; " +
    "human_review_status=prototype_only. Verbatim verification + approved upgrade remain a separate human step.";
  saveCandidate(candidatePath, c);
  console.log(`  ✓ written (prototype_only).`);
}

function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const paths = args.filter((a) => !a.startsWith("--"));
  if (paths.length === 0) {
    console.error("Usage: npx tsx scripts/promote-candidate-to-sio.ts <candidate.yaml> [...] --confirm");
    process.exit(1);
  }
  console.log("Promote candidates → corpus/sios/ (prototype_only). HONESTY: never approved, never fabricated verbatim.");
  for (const p of paths) promote(p, confirm);
  console.log(`\nDone. ${confirm ? "Files written." : "Dry-run (no --confirm)."}`);
}

main();
